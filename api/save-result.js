// POST /api/save-result
// Saves one authenticated user's Noetune result.
// The dedicated saved_results table is preferred. Until its migration is
// applied, the latest result is stored in Supabase Auth user metadata so the
// feature remains available during rollout.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

function text(value, max) {
  if (value == null) return null;
  return String(value).slice(0, max);
}

function jsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ saved: false, error: 'Storage unavailable' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ saved: false, error: 'Authentication required' });
  }

  try {
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ saved: false, error: 'Authentication required' });
    }

    const body = jsonObject(req.body);
    const userAnswers = jsonObject(body.userAnswers);
    const resultCardData = jsonObject(body.resultCardData);
    const serializedSize = JSON.stringify({ userAnswers, resultCardData }).length;
    if (serializedSize > 50000) {
      return res.status(413).json({ saved: false, error: 'Result is too large' });
    }

    const row = {
      user_id: user.id,
      client_ref: text(body.clientRef, 80),
      selected_theme_key: text(body.selectedThemeKey, 160),
      wish_group_key: text(body.wishGroupKey, 120),
      wish_key: text(body.wishKey, 120),
      wish_theme_key: text(body.wishThemeKey, 160),
      theme_label: text(body.themeLabel, 500),
      user_answers: userAnswers,
      before_score: text(body.beforeScore, 30),
      after_score: text(body.afterScore, 30),
      result_summary: text(body.resultSummary, 10000),
      result_card_data: resultCardData,
      language: text(body.language, 20) || 'en',
    };

    if (!row.client_ref) {
      return res.status(400).json({ saved: false, error: 'Missing result reference' });
    }

    const { data, error } = await supabaseAdmin
      .from('saved_results')
      .upsert(row, { onConflict: 'user_id,client_ref' })
      .select('id, created_at')
      .single();

    if (!error && data) {
      return res.status(200).json({ saved: true, result: { id: data.id, createdAt: data.created_at } });
    }

    // PostgreSQL 42P01: saved_results migration has not reached this project.
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      const createdAt = new Date().toISOString();
      const metadata = Object.assign({}, user.user_metadata || {}, {
        noetune_saved_result: Object.assign({}, row, { created_at: createdAt }),
      });
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: metadata,
      });
      if (!metadataError) {
        return res.status(200).json({ saved: true, result: { id: row.client_ref, createdAt }, fallback: true });
      }
    }

    console.error('[save-result]', error && error.message ? error.message : 'unknown storage error');
    return res.status(500).json({ saved: false, error: 'Could not save result' });
  } catch (e) {
    console.error('[save-result]', e.message);
    return res.status(500).json({ saved: false, error: 'Could not save result' });
  }
};
