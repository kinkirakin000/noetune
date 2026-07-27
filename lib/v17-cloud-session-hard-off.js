'use strict';

// Server-side safety boundary. This value is intentionally not configurable
// from requests, client state, or environment variables.
const V17_CLOUD_SESSION_SERVER_ENABLED = false;

function isV17CloudSessionServerEnabled() {
  return V17_CLOUD_SESSION_SERVER_ENABLED === true;
}

function createV17CloudSessionDisabledResponse(res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({
    ok: false,
    error: 'CLOUD_SESSION_FEATURE_DISABLED',
    code: 'CLOUD_SESSION_FEATURE_DISABLED',
  });
}

module.exports = {
  V17_CLOUD_SESSION_SERVER_ENABLED,
  isV17CloudSessionServerEnabled,
  createV17CloudSessionDisabledResponse,
};
