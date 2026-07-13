async function selectInterfaceLanguage(code) {
  if (interfaceLanguagePending) return;
  interfaceLanguagePending = true;
  try {
    await setLandingLang(code);
    try {
      if (isV17SupportedLocale && isV17SupportedLocale(lang)) {
        localStorage.setItem('ntn_lang', lang);
        localStorage.setItem('ntn_lang_source', 'manual');
      }
    } catch(e) {}
    updateLanguageControl();
    closeLanguageMenu();
    trackEvent('language_selected', { lang: lang });
  } finally {
    interfaceLanguagePending = false;
  }
}

function T(key, vars) {
  var isV17Locale = currentLocale && currentLocale.meta && currentLocale.meta.appVersion === 'v17';
  return t('ui.' + key, isV17Locale ? '' : key, vars);
}

function getLandingCopyText(v15Path, v17Path) {
  var isV17Locale = currentLocale && currentLocale.meta && currentLocale.meta.appVersion === 'v17';
  if (isV17Locale && typeof getV17LocaleRoot === 'function' && typeof getV17Path === 'function') {
    var v17Root = getV17LocaleRoot();
    if (v17Root) {
      var v17Value = getV17Path(v17Root, v17Path || v15Path);
      if (v17Value !== undefined && v17Value !== null && v17Value !== '') return v17Value;
    }
  }
  var legacyValue = getText(v15Path, '');
  return legacyValue !== undefined && legacyValue !== null ? legacyValue : '';
}

function renderStaticTexts() {
  document.documentElement.lang = lang;
  applyThemeMode();
  updateLanguageControl();
  setEl('account-chip-label', T('account'));
  setEl('account-login', T('login'));
  setEl('account-signup', T('signup'));
  setEl('account-professional', T('professional'));
  setEl('account-manage', T('manageSubscription'));
  setEl('account-logout', T('logout'));
  updateAccountActions();
  setEl('t-entry-method-title', T('entryMethodTitle'));
  setEl('btn-entry-method-theme', T('entryMethodThemeTitle'));
  setEl('t-entry-method-theme-desc', T('entryMethodThemeDesc'));
  setEl('btn-entry-method-free', T('entryMethodFreeTitle'));
  setEl('t-entry-method-free-desc', T('entryMethodFreeDesc'));
  setEl('t-free-type-title', T('freeTypeTitle'));
  setEl('btn-free-type-ideal', T('freeTypeIdealTitle'));
  setEl('t-free-type-ideal-desc', T('freeTypeIdealDesc'));
  setEl('t-free-type-ideal-example', T('freeTypeIdealExample'));
  setEl('btn-free-type-topic', T('freeTypeTopicTitle'));
  setEl('t-free-type-topic-desc', T('freeTypeTopicDesc'));
  setEl('t-free-type-topic-example', T('freeTypeTopicExample'));
  setEl('t-free-ideal-input-title', T('freeIdealInputTitle'));
  setEl('t-free-topic-input-title', T('freeTopicInputTitle'));
  setEl('btn-free-ideal-start', T('freeInputStartButton'));
  setEl('btn-free-topic-start', T('freeInputStartButton'));
  setEl('btn-free-ideal-skip', T('freeInputSkip'));
  setEl('btn-free-topic-skip', T('freeInputSkip'));
  setEl('t-v13-nonideal-question', T('v13NonIdealQuestion'));
  setEl('t-v13-ideal-question', T('v13IdealQuestion'));
  setEl('btn-v13-nonideal-next', T('next_button'));
  setEl('btn-v13-ideal-next', T('next_button'));
  setEl('btn-v13-nonideal-skip', T('no_answer_button'));
  setEl('btn-v13-ideal-skip', T('no_answer_button'));
  setEl('t-v13-end-title', T('v13EndTitle'));
  setEl('btn-v13-finish', T('v13FinishButton'));
  renderProgressSaveUI();
  renderResumeProgressUI();
  var v13NonIdealInput = document.getElementById('in-v13-nonideal');
  if (v13NonIdealInput) v13NonIdealInput.setAttribute('placeholder', t('ui.v13NonIdealPlaceholder'));
  var v13IdealInput = document.getElementById('in-v13-ideal');
  if (v13IdealInput) v13IdealInput.setAttribute('placeholder', t('ui.v13IdealPlaceholder'));
  var freeIdealInput = document.getElementById('in-free-ideal');
  if (freeIdealInput) freeIdealInput.placeholder = T('freeIdealInputPlaceholder');
  var freeTopicInput = document.getElementById('in-free-topic');
  if (freeTopicInput) freeTopicInput.placeholder = T('freeTopicInputPlaceholder');
  setEl('btn-see-more',    T('see_more_themes'));
  setEl('btn-theme-cta',  T('theme_cta_button'));
  setEl('t-about-title',  getText('about.title'));
  setEl('t-about-p1',     getText('about.p1'));
  setEl('t-about-p2',     getText('about.p2'));
  setEl('t-about-p3',     getText('about.p3'));
  setEl('t-about-p4',     getText('about.p4'));
  setEl('t-about-safety', getText('about.safety'));
  setEl('t-professional-plan-title', t('ui.professionalPlanTitle'));
  setEl('t-professional-plan-trial', t('ui.professionalPlanTrialUsed'));
  setEl('t-professional-plan-access', t('ui.professionalPlanAccess'));
  setEl('btn-pricing-cta', t('ui.professionalPlanCta'));
  setEl('t-guest-records-note', T('guest_records_note'));
  setEl('t-pricing-soon',   T('pricing_soon'));
  setEl('t-lock-title',     T('lock_title'));
  setEl('t-lock-body',      T('lock_body'));
  setEl('btn-lock-cta',     T('lock_cta'));
  setEl('t-lock-note',      T('lock_note'));
  setEl('btn-issue-skip',      T('issue_skip'));
  setEl('btn-ideal-skip',      T('ideal_skip'));
  setEl('btn-ideal-inline-next', T('next_button'));
  setEl('ideal-top-copy',      T('ideal_top_copy'));
  setEl('btn-see-more-ideals', T('see_more_ideals'));
  setEl('btn-ideal-cta',       T('ideal_cta_button'));
  setEl('lbl-session-header',  T('session_result_header'));
  setEl('t-result-poem',       T('result_poem'));
  setEl('lbl-result-from',     T('result_label_from'));
  setEl('lbl-result-toward',   T('result_label_toward'));
  setEl('lbl-shift-section',   T('result_shift_section'));
  setEl('lbl-breath-ease',     T('result_label_breath_ease'));
  setEl('lbl-be-helper',       T('result_be_helper'));
  setEl('btn-save-image',        T('save_image_button'));
  renderResultSaveUI();
  setEl('t-save-preview-note',   T('save_image_preview_note'));
  setEl('t-shift-note-title',    T('shift_note_title'));
  setEl('btn-shift-note',        T('shift_note_button'));
  setEl('btn-skip-shift-note',   T('shift_note_skip'));
  setEl('lbl-shift-note-label',  T('result_shift_note_label'));
  setEl('btn-repeat-theme',    T('resultNewThemeButton'));
  var resultFeatures = document.getElementById('result-professional-features');
  if (resultFeatures) resultFeatures.style.display = '';
  renderResultProfessionalFeatures();
  ['br1','br2','br3','br4','br5'].forEach(function(k){
    setEl('lbl-feel-' + k, T('feel_prompt'));
    setEl('hint-' + k, T('breathe_start_hint'));
  });
  /* Door screen */
  setEl('t-door-title', T('door_title'));
  setEl('btn-door-next', T('door_next_button'));
  setEl('btn-no-answer',     T('no_answer_button'));
  setEl('t-congrats-title',  T('congrats_title'));
  setEl('t-congrats-body',   T('congrats_body'));
  setEl('btn-congrats-new',  T('congrats_choose_new_theme'));
  setEl('btn-congrats-start',T('congrats_back_to_start'));
  var sharedInp = document.getElementById('door-answer-input');
  if (sharedInp) sharedInp.placeholder = T('door_answer_placeholder');
  setEl('lbl-br2-main', T('breath_2_text'));
  setEl('lbl-br3-main', T('breath_3_text'));
  setEl('lbl-br4-main', T('breath_4_text'));
  ['b1','b2','a1','a2'].forEach(function(k){
    setEl('nm-'   + k, T('not_measurable_button'));
    setEl('next-' + k, T('next_button'));
  });
  setEl('skip-b2', T('skip_measurement'));
  setEl('skip-a2', T('skip_measurement'));
  setEl('btn-issue', T('next_button'));
  setEl('btn-nega-ideal-next', T('next_button'));
  setEl('btn-ideal', T('next_button'));
  var pi = document.getElementById('in-issue');        if (pi) pi.placeholder = T('issue_placeholder');
  var ii = document.getElementById('in-ideal');        if (ii) ii.placeholder = T('ideal_placeholder');
  var ci = document.getElementById('in-custom-theme'); if (ci) ci.placeholder = T('custom_input_placeholder');
  var si = document.getElementById('in-shift-note');   if (si) si.setAttribute('placeholder', t('ui.shift_note_placeholder'));
  var bb = document.getElementById('btn-back');        if (bb) bb.setAttribute('aria-label', T('back_button'));
  var ac = document.getElementById('btn-auth-close');  if (ac) ac.setAttribute('aria-label', t('ui.authClose'));
  setEl('auth-submit-btn', t('ui.authEmailButton'));
  renderThemeScreen();
  renderIdealScreen();
  updatePortalButton();
  updateLoginButton();
  if (currentLocale) applyLocale();
}

function applyLang() {
  renderStaticTexts();
}

async function setLang(l, nextScreen) {
  await loadLocale(l);
  renderStaticTexts();
  trackEvent('language_selected', { lang: lang });
  fwd(nextScreen || 's-landing');
}

async function loadLocale(localeLang) {
  var targetLang = localeLang || 'ja';
  try {
    if (!fallbackLocale) {
      var fallbackRes = await fetch('./locales/ja.json');
      if (!fallbackRes.ok) throw new Error('Japanese locale not found');
      fallbackLocale = await fallbackRes.json();
      fallbackLocale.wishGroups = normalizeWishGroups(fallbackLocale.wishGroups);
    }
    if (targetLang === 'ja') {
      currentLocale = fallbackLocale;
    } else {
      try {
        var res = await fetch('./locales/' + targetLang + '.json');
        if (!res.ok) throw new Error('locale not found');
        currentLocale = await res.json();
        currentLocale.wishGroups = normalizeWishGroups(currentLocale.wishGroups);
      } catch (e) {
        currentLocale = null;
        currentLang = targetLang;
        lang = targetLang;
        document.documentElement.lang = targetLang;
        console.error('[locale] Failed to load requested locale:', targetLang);
        return null;
      }
    }
    currentLang = currentLocale.lang
      || (currentLocale.meta && currentLocale.meta.locale)
      || 'ja';
    lang = currentLang;
    document.documentElement.lang = currentLang;
    return currentLocale;
  } catch (e) {
    console.error('[locale] Failed to load locale:', e.message);
    return null;
  }
}

function getText(path, fallback) {
  var value = getByPath(currentLocale, path);
  if (value !== undefined && value !== null && value !== '') return value;
  if (currentLocale && currentLocale.meta && currentLocale.meta.appVersion === 'v17') return fallback || '';
  var fallbackValue = getByPath(fallbackLocale, path);
  if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '') return fallbackValue;
  return fallback || '';
}

function t(path, fallback) {
  return interpolateLocaleText(getText(path, fallback), arguments[2]);
}

function applyLocale() {
  setEl('t-about-title', getText('about.title'));
  setEl('t-about-p1', getText('about.p1'));
  setEl('t-about-p2', getText('about.p2'));
  setEl('t-about-p3', getText('about.p3'));
  setEl('t-about-p4', getText('about.p4'));
  setEl('t-about-safety', getText('about.safety'));
  setEl('btn-lp-about-link', getText('ui.landingAboutLink', getText('ui.aboutLink')));
  setEl('result-professional-lead', getText('ui.professionalLead'));
  setEl('result-professional-title', getText('ui.professionalTitle'));
  setEl('result-professional-price', getText('ui.professionalPrice'));
  setEl('t-result-pricing', getText('ui.professionalCta'));
  renderResultProfessionalFeatures();
  updateResultRepeatLabel();
  var entryTitle = document.querySelector('#s-entry-choice .entry-title');
  if (entryTitle) entryTitle.textContent = getText('ui.wishEntryTitle', '');
  renderWishAccordion();
}

async function setLandingLang(code) {
  landingLang = code;
  await loadLocale(code);
  landingLang = lang;
  setElIfText('lp-hero-title', getLandingCopyText('ui.landingHero', 'lp.hero.title'));
  setElIfText('lp-hero-sub', getLandingCopyText('ui.landingSub', 'lp.hero.body'));
  var btn = document.getElementById('btn-lp-start');
  if (btn) btn.textContent = getLandingCopyText('ui.landingStart', 'lp.hero.cta');
  setElIfText('lp-section-title', getLandingCopyText('ui.landingSection', 'lp.sectionsTitle'));
  var ul = document.getElementById('lp-item-list');
  if (ul) {
    ul.innerHTML = '';
    var landingItems = getLandingCopyText('ui.landingItems', 'lp.sections');
    if (Array.isArray(landingItems)) {
      landingItems.forEach(function(item) {
        var li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
    }
  }
  var footer1 = getLandingCopyText('ui.landingFooter1', 'lp.finalCta.title');
  var footer2 = getLandingCopyText('ui.landingFooter2', 'lp.finalCta.cta');
  var aboutText = getLandingCopyText('ui.landingAboutLink', 'lp.finalCta.title');
  var pricingText = getLandingCopyText('ui.landingPricingLink', 'lp.finalCta.cta');
  setElIfText('lp-footer-p1', footer1);
  setElIfText('lp-footer-p2', footer2);
  var footerP1 = document.getElementById('lp-footer-p1');
  var footerP2 = document.getElementById('lp-footer-p2');
  var aboutLink = document.getElementById('btn-lp-about-link');
  var pricingLink = document.getElementById('btn-lp-pricing-link');
  if (footerP1) footerP1.style.display = footer1 ? '' : 'none';
  if (footerP2) footerP2.style.display = footer2 ? '' : 'none';
  if (aboutLink) {
    aboutLink.textContent = aboutText;
    aboutLink.style.display = aboutText ? 'block' : 'none';
  }
  if (pricingLink) {
    pricingLink.textContent = pricingText;
    pricingLink.style.display = pricingText ? 'block' : 'none';
  }
  document.querySelectorAll('.lp-lang-btn').forEach(function(b) {
    b.classList.toggle('selected', b.dataset.lp === code);
  });
  updateLanguageControl();
  applyLang();
  updatePortalButton();
}

window.setLandingLang = setLandingLang;
window.setLang = setLang;
window.loadLocale = loadLocale;
window.T = T;
window.t = t;
window.getText = getText;
window.applyLang = applyLang;
window.renderStaticTexts = renderStaticTexts;
window.applyLocale = applyLocale;
window.selectInterfaceLanguage = selectInterfaceLanguage;
