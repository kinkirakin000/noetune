function setEl(id, tx) {
  var e = document.getElementById(id);
  if (e) e.textContent = tx;
}

function setElIfText(id, tx) {
  if (tx === undefined || tx === null || tx === '') return false;
  setEl(id, tx);
  return true;
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function getByPath(obj, path) {
  return path.split('.').reduce(function(acc, key) {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

function interpolateLocaleText(value, vars) {
  var s = value;
  if (vars) {
    s = s.split('{theme}').join(vars.theme || '');
    s = s.split('{issue}').join(vars.issue || '');
    s = s.split('{ideal}').join(vars.ideal || '');
    s = s.split('{pos}').join(vars.pos || '');
    s = s.split('{neg}').join(vars.neg || '');
    s = s.split('{used}').join(vars.used != null ? String(vars.used) : '');
    s = s.split('{remaining}').join(vars.remaining != null ? String(vars.remaining) : '');
  }
  return s;
}

function createResultClientRef() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  } catch(e) {}
  return 'result-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
}

window.setEl = setEl;
window.setElIfText = setElIfText;
window.clearChildren = clearChildren;
window.getByPath = getByPath;
window.interpolateLocaleText = interpolateLocaleText;
window.createResultClientRef = createResultClientRef;
