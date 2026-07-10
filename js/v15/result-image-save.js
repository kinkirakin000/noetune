function saveResultCard() {
  var btn = document.getElementById('btn-save-image');
  var card = document.getElementById('result-card');
  if (!card || typeof html2canvas !== 'function') { showSaveError(); return; }
  if (btn) { btn.textContent = T('save_image_creating'); btn.disabled = true; }
  var doCapture = function() {
    var scale = window.devicePixelRatio || 2;
    html2canvas(card, { scale: scale, backgroundColor: '#FAFAF7', useCORS: true, logging: false })
      .then(function(canvas) {
        if (btn) { btn.textContent = T('save_image_button'); btn.disabled = false; }
        canvas.toBlob(function(blob) {
          if (!blob) { tryNewTabFallback(canvas); return; }
          try {
            var url = URL.createObjectURL(blob);
            var file = null;
            try {
              file = new File([blob], 'noetune-session-shift.png', { type: 'image/png' });
            } catch (e) {
              file = null;
            }
            var finish = function() {
              setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
              showSaveFallbackNote();
            };
            var fallbackDownload = function() {
              var a = document.createElement('a');
              a.href = url; a.download = 'noetune-session-shift.png';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              finish();
            };
            if (navigator && typeof navigator.share === 'function' && file && navigator.canShare && navigator.canShare({ files: [file] })) {
              navigator.share({
                files: [file],
                title: document.title || 'Noetune',
                text: T('save_image_button')
              }).then(function() {
                finish();
              }).catch(function(error) {
                if (error && error.name === 'AbortError') return;
                fallbackDownload();
              });
            } else {
              fallbackDownload();
            }
          } catch(e) { tryNewTabFallback(canvas); }
        }, 'image/png');
      })
      .catch(function() {
        if (btn) { btn.textContent = T('save_image_button'); btn.disabled = false; }
        showSaveError();
      });
  };
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(doCapture); }
  else { doCapture(); }
}

function tryNewTabFallback(canvas) {
  try {
    var dataUrl = canvas.toDataURL('image/png');
    var win = window.open('', '_blank');
    if (win) {
      win.document.write('<html><body style="margin:0;background:#FAFAF7;text-align:center"><img src="' + dataUrl + '" style="max-width:100%"><p style="font-family:sans-serif;font-size:12px;color:#999;padding:8px">' + T('save_image_fallback_note') + '</p></body></html>');
      win.document.close();
    } else { showInlinePreview(dataUrl); }
  } catch(e) { showSaveError(); }
}

function showInlinePreview(dataUrl) {
  var wrap = document.getElementById('save-preview-wrap');
  var img  = document.getElementById('save-preview-img');
  var note = document.getElementById('t-save-fallback-note');
  if (wrap && img) {
    img.src = dataUrl;
    wrap.style.display = '';
    if (note) { note.textContent = T('save_image_fallback_note'); note.style.display = ''; }
  } else { showSaveError(); }
}

function showSaveFallbackNote() {
  var el = document.getElementById('t-save-fallback-note');
  if (el) { el.textContent = T('save_image_fallback_note'); el.style.display = ''; }
}

function showSaveError() {
  var btn = document.getElementById('btn-save-image');
  if (btn) { btn.textContent = T('save_image_button'); btn.disabled = false; }
  alert(T('save_image_error'));
}

window.saveResultCard = saveResultCard;
