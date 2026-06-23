function fwd(id) {
  var c = document.getElementById(cur);
  var n = document.getElementById(id);
  if (!c || !n || cur === id) return;
  navHistory.push(cur);
  c.classList.remove('active'); c.classList.add('exit');
  setTimeout(function(){ c.classList.remove('exit'); }, 500);
  setTimeout(function(){ n.classList.add('active'); cur = id; updateBackBtn(); updateProgress(); updateThemeCTA(); updateIdealCTA(); updateDoorCTA(); updateNegaCTA(); if (id === 's-pricing') trackEvent('pricing_viewed', { source: navHistory[navHistory.length - 1] || '' }); }, 130);
}

function goBack() {
  if (v12Mode === 'situation' && cur === 's-theme' && handleSituationBack()) return;
  if (!navHistory.length) return;
  breathing = false; breathCount = 0;
  ['br1','br2','br3','br4','br5'].forEach(function(k){
    var c = document.getElementById('circle-' + k);
    if (c) { c.textContent = ''; c.className = 'breath-circle pulse'; }
    var h = document.getElementById('hint-' + k); if (h) h.style.display = '';
  });
  var prev = navHistory.pop();
  var c = document.getElementById(cur), n = document.getElementById(prev);
  if (!c || !n || cur === prev) { updateBackBtn(); return; }
  c.classList.remove('active'); c.classList.add('exit');
  setTimeout(function(){ c.classList.remove('exit'); }, 500);
  setTimeout(function(){ n.classList.add('active'); cur = prev; updateBackBtn(); updateProgress(); updateThemeCTA(); updateIdealCTA(); updateDoorCTA(); updateNegaCTA(); }, 130);
}

function updateBackBtn() {
  var b = document.getElementById('btn-back');
  if (b) b.classList.toggle('visible', cur !== 's-lang' && navHistory.length > 0);
}

function updateProgress() {
  var p = document.getElementById('progress');
  if (!p) return;
  var i = SCREEN_ORDER.indexOf(cur);
  p.style.width = (i < 0 ? 0 : (i / (SCREEN_ORDER.length - 1)) * 100) + '%';
}

function showScreenDirect(id) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
    s.classList.remove('exit');
  });
  var next = document.getElementById(id);
  if (next) next.classList.add('active');
  cur = id;
  navHistory = [];
  updateBackBtn();
  updateProgress();
  updateThemeCTA();
  updateIdealCTA();
}

function backToStart() {
  _savedProgressResumeActive = false;
  _trialConsumedThisSession = false;
  D = { theme:'', themeKey:null, themePositive:'', themeNegative:'', issue:'', ideal:'', shiftNote:'',
        reactionAnswer:'', idealAnswer:'',
        entryMode:null, doorKey:null, doorSentence:'',
        breathEaseBefore:null, breathEaseAfter:null, breathMode:null };
  navHistory = []; themeChosen = false; breathing = false; breathCount = 0;
  themeVisibleCount = 3;
  ['b1','b2','a1','a2'].forEach(resetSlider);
  renderThemeScreen();
  showScreenDirect('s-landing');
}

window.fwd = fwd;
window.goBack = goBack;
window.showScreenDirect = showScreenDirect;
window.backToStart = backToStart;
window.updateBackBtn = updateBackBtn;
window.updateProgress = updateProgress;
