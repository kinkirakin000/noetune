// GET /api/bookmarks
// POST /api/bookmarks
// DELETE /api/bookmarks
//
// Bookmark MVP API:
// - auth token required
// - bookmark is tied to a stable_theme_key
// - Free users may keep one bookmark; Pro users may keep multiple
// - Bookmarks are theme references only and do not restore session text

const { getSupabaseAdmin } = require('../lib/supabase-admin');

var ALLOWED_PREFIXES = ['hcq:', 'theme:', 'spiritual:', 'free:'];
var SNAPSHOT_FIELD_LIMITS = {
  questionId: 160,
  themeId: 160,
  questionTextAtTime: 2000,
  localeAtTime: 32,
  freeInputTheme: 2000,
  themeSource: 64,
  themeCategoryId: 160,
  themeCategoryLabelAtTime: 500,
  themeTrackId: 160,
  themeMeaning: 2000
};

function parseBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function text(value, max) {
  if (value == null) return null;
  return String(value).slice(0, max);
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getBearerToken(req) {
  var authHeader = req.headers['authorization'] || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function validateStableThemeKey(value) {
  if (typeof value !== 'string') return null;
  var trimmed = value.trim();
  if (!trimmed || trimmed.length > 512) return null;
  for (var i = 0; i < ALLOWED_PREFIXES.length; i += 1) {
    if (trimmed.indexOf(ALLOWED_PREFIXES[i]) === 0) return trimmed;
  }
  return null;
}

function sanitizeThemeSnapshot(snapshot) {
  var result = {};
  if (!isPlainObject(snapshot)) return null;
  Object.keys(SNAPSHOT_FIELD_LIMITS).forEach(function(key) {
    var value = snapshot[key];
    result[key] = value == null ? null : text(value, SNAPSHOT_FIELD_LIMITS[key]);
  });
  return result;
}

function bookmarkToResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    stableThemeKey: row.stable_theme_key,
    themeSnapshot: isPlainObject(row.theme_snapshot) ? row.theme_snapshot : {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function sendMethodNotAllowed(res) {
  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

function sendUnauthorized(res) {
  return res.status(401).json({ ok: false, error: 'unauthorized' });
}

function sendInvalidRequest(res) {
  return res.status(400).json({ ok: false, error: 'invalid_request' });
}

function sendInternalError(res) {
  return res.status(500).json({ ok: false, error: 'internal_error' });
}

async function getAuthedUser(admin, req) {
  var token = getBearerToken(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

async function getPlanStatus(admin, userId) {
  const { data, error } = await admin
    .from('profiles')
    .select('plan_status')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data && data.plan_status === 'plus' ? 'plus' : 'free';
}

async function listBookmarks(admin, userId) {
  const { data, error } = await admin
    .from('bookmarks')
    .select('id, stable_theme_key')
    .eq('user_id', userId);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendMethodNotAllowed(res);
  }

  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return sendMethodNotAllowed(res);
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return sendInternalError(res);
  }

  try {
    const user = await getAuthedUser(supabaseAdmin, req);
    if (!user) {
      return sendUnauthorized(res);
    }

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('bookmarks')
        .select('id, stable_theme_key, theme_snapshot, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bookmarks: Array.isArray(data) ? data.map(bookmarkToResponse) : []
      });
    }

    var body = parseBody(req);
    if (!body) {
      return sendInvalidRequest(res);
    }

    if (req.method === 'POST') {
      var stableThemeKey = validateStableThemeKey(body.stableThemeKey);
      var themeSnapshot = sanitizeThemeSnapshot(body.themeSnapshot);
      if (!stableThemeKey || !themeSnapshot) {
        return sendInvalidRequest(res);
      }

      var existingBookmarks = await listBookmarks(supabaseAdmin, user.id);
      var alreadyHasTheme = existingBookmarks.some(function(row) {
        return row && row.stable_theme_key === stableThemeKey;
      });
      var planStatus = await getPlanStatus(supabaseAdmin, user.id);
      if (planStatus !== 'plus' && !alreadyHasTheme && existingBookmarks.length >= 1) {
        return res.status(403).json({ ok: false, error: 'bookmark_limit_reached', limit: 1 });
      }

      var upsertRow = {
        user_id: user.id,
        stable_theme_key: stableThemeKey,
        theme_snapshot: themeSnapshot
      };

      const { data, error } = await supabaseAdmin
        .from('bookmarks')
        .upsert(upsertRow, { onConflict: 'user_id,stable_theme_key' })
        .select('id, stable_theme_key, theme_snapshot, created_at, updated_at')
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bookmark: bookmarkToResponse(data)
      });
    }

    if (req.method === 'DELETE') {
      var deleteKey = validateStableThemeKey(body.stableThemeKey || (req.query && req.query.stableThemeKey));
      var deleteId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : null;
      if (!deleteKey && !deleteId) {
        return sendInvalidRequest(res);
      }

      var query = supabaseAdmin.from('bookmarks').delete().eq('user_id', user.id);
      if (deleteKey) query = query.eq('stable_theme_key', deleteKey);
      if (deleteId) query = query.eq('id', deleteId);
      const { error } = await query;
      if (error) throw error;

      return res.status(200).json({ ok: true, deleted: true });
    }

    return sendMethodNotAllowed(res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error && error.message ? error.message : String(error)
    });
  }
};
