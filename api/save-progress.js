// GET/POST/DELETE /api/save-progress
// Stores one resumable V13 progress record per authenticated user.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

function text(value, max) {
  if (value == null) return null;
  return String(value).slice(0, max);
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value.slice(0, 100) : [];
}

function missingTable(error) {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205');
}

function toProgress(row) {
  if (!row) return null;
  return {
    themeKey: row.theme_key || null,
    wishGroupKey: row.wish_group_key || null,
    wishKey: row.wish_key || null,
    wishThemeKey: row.wish_theme_key || null,
    themeLabel: row.theme_label || '',
    currentStep: row.current_step || 's-v13-nonideal',
    nonidealAnswers: array(row.nonideal_answers),
    idealAnswers: array(row.ideal_answers),
    beforeScore: row.before_score == null ? null : String(row.before_score),
    currentScore: row.current_score == null ? null : String(row.current_score),
    language: row.language || 'en',
    progressData: object(row.progress_data),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function authenticatedUser(admin, req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data ? null : data.user;
}

module.exports = async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) return res.status(503).json({ saved: false, error: 'Storage unavailable' });

  try {
    const user = await authenticatedUser(admin, req);
    if (!user) return res.status(401).json({ saved: false, error: 'Authentication required' });

    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('saved_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && !missingTable(error)) throw error;
      if (data) return res.status(200).json({ progress: toProgress(data) });
      const fallback = object(user.user_metadata).noetune_saved_progress;
      return res.status(200).json({ progress: toProgress(fallback), fallback: !!fallback });
    }

    if (req.method === 'POST') {
      const body = object(req.body);
      const progressData = object(body.progressData);
      const nonidealAnswers = array(body.nonidealAnswers).map(value => text(value, 500));
      const idealAnswers = array(body.idealAnswers).map(value => text(value, 500));
      if (JSON.stringify({ progressData, nonidealAnswers, idealAnswers }).length > 50000) {
        return res.status(413).json({ saved: false, error: 'Progress is too large' });
      }
      const now = new Date().toISOString();
      const row = {
        user_id: user.id,
        theme_key: text(body.themeKey, 160),
        wish_group_key: text(body.wishGroupKey, 120),
        wish_key: text(body.wishKey, 120),
        wish_theme_key: text(body.wishThemeKey, 160),
        theme_label: text(body.themeLabel, 500),
        current_step: text(body.currentStep, 80) || 's-v13-nonideal',
        nonideal_answers: nonidealAnswers,
        ideal_answers: idealAnswers,
        before_score: text(body.beforeScore, 30),
        current_score: text(body.currentScore, 30),
        language: text(body.language, 20) || 'en',
        progress_data: progressData,
        updated_at: now,
      };
      const { data, error } = await admin
        .from('saved_progress')
        .upsert(row, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (!error && data) return res.status(200).json({ saved: true, progress: toProgress(data) });
      if (!missingTable(error)) throw error;

      const existingFallback = object(user.user_metadata).noetune_saved_progress;
      const fallbackRow = Object.assign({}, row, {
        created_at: existingFallback && existingFallback.created_at ? existingFallback.created_at : now,
      });
      const metadata = Object.assign({}, user.user_metadata || {}, {
        noetune_saved_progress: fallbackRow,
      });
      const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: metadata,
      });
      if (metadataError) throw metadataError;
      return res.status(200).json({ saved: true, progress: toProgress(fallbackRow), fallback: true });
    }

    if (req.method === 'DELETE') {
      const { error } = await admin.from('saved_progress').delete().eq('user_id', user.id);
      if (error && !missingTable(error)) throw error;
      const metadata = Object.assign({}, user.user_metadata || {});
      delete metadata.noetune_saved_progress;
      const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: metadata,
      });
      if (metadataError) throw metadataError;
      return res.status(200).json({ cleared: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[save-progress]', error && error.message ? error.message : 'unknown storage error');
    return res.status(500).json({ saved: false, error: 'Could not save progress' });
  }
};
