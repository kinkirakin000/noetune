// GET /api/bookmarks
// POST /api/bookmarks
// DELETE /api/bookmarks
//
// Bookmark MVP API:
// - auth token required
// - bookmark is tied to a stable_theme_key
// - Saved data read is allowed for any authenticated profile; writes are gated by entitlement
// - Bookmarks are theme references only and do not restore session text

const { getSupabaseAdmin } = require('../lib/supabase-admin');
const { getV17SavedDataEntitlements } = require('../lib/v17-entitlements');
const { isV17CloudSessionServerEnabled, createV17CloudSessionDisabledResponse } = require('../lib/v17-cloud-session-hard-off');

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

function isMissingProfileError(error) {
  if (!error) return false;
  const message = String(error.message || '');
  return error.code === 'PGRST116' || error.code === 'PGRST117' || /No rows found/i.test(message);
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
    .select('plan_status, stripe_subscription_status, cancel_at_period_end')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    if (isMissingProfileError(error)) return null;
    throw error;
  }
  return data || null;
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

  if (req.method !== 'DELETE' && !isV17CloudSessionServerEnabled()) {
    return createV17CloudSessionDisabledResponse(res);
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

    const profile = await getPlanStatus(supabaseAdmin, user.id);
    if (!profile) {
      return res.status(403).json({ ok: false, error: 'profile_unavailable', billingState: 'unknown' });
    }
    const entitlements = getV17SavedDataEntitlements(profile);

    if (req.method === 'GET') {
      if (!entitlements.canRead) {
        return res.status(403).json({ ok: false, error: 'saved_data_read_not_allowed', billingState: entitlements.billingState });
      }
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
      if (!entitlements.canWrite) {
        return res.status(403).json({
          ok: false,
          error: 'saved_data_write_not_allowed',
          billingState: entitlements.billingState
        });
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

      if (!entitlements.canDelete) {
        return res.status(403).json({
          ok: false,
          error: 'saved_data_delete_not_allowed',
          billingState: entitlements.billingState
        });
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
    console.error('[bookmarks] internal error');
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'internal_error'
    });
  }
};
