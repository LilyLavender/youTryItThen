function step3Show() {
  renderStep3Grid();
  renderStep3Map();
  renderStep3Metrics();
}

function renderStep3Grid() {
  const container = document.getElementById('step3-grid-preview');
  if (!container || !APP.step2State.divisions) return;
  renderGrid(container, APP.step2State.divisions, {
    draggable: false,
    teamSize: 56,
    exportMode: true,
  });
}

async function renderStep3Map() {
  const wrapper = document.getElementById('step3-map-wrapper');
  if (!wrapper || !APP.step2State.confirmed) return;
  wrapper.innerHTML = '<div class="map-loading">Rendering map…</div>';

  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const w = wrapper.clientWidth || 700;
  const h = Math.round(w * 0.6);
  svgEl.setAttribute('width', w);
  svgEl.setAttribute('height', h);
  svgEl.style.width = '100%';
  svgEl.style.height = 'auto';
  wrapper.innerHTML = '';
  wrapper.appendChild(svgEl);

  _mapState = null;
  const s3State = await initMap(svgEl, w, h);
  _mapState = s3State;
  updateMapDivisions(APP.step2State.divisions);
}

function renderStep3Metrics() {
  const divs = APP.step2State.divisions;
  const inDivision = countInDivisionRivalries(divs);
  const total = TOTAL_RIVALRIES;
  const switches = countLeagueSwitches(divs);

  const el = document.getElementById('step3-metrics-text');
  if (el) el.textContent = `${inDivision}/${total} rivalries in-division · ${switches} league switches`;
}

// ── Export ───────────────────────────────────────────────────────────────────

async function exportGridPNG() {
  if (!APP.step2State.divisions) return;

  // Render into an off-screen container at a fixed desktop width so the export
  // always produces a 2-column layout regardless of the current viewport size.
  const offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:720px;background:transparent;';
  document.body.appendChild(offscreen);

  renderGrid(offscreen, APP.step2State.divisions, {
    draggable: false,
    teamSize: 56,
    exportMode: true,
  });
  // renderGrid sets container.className = 'grid-layout'; force 2-col via inline
  // style to override any mobile media-query that collapses to 1 column.
  offscreen.style.gridTemplateColumns = '1fr 1fr';

  const imgs = [...offscreen.querySelectorAll('img')];
  const origAttrs = imgs.map(img => img.getAttribute('src'));
  await Promise.all(imgs.map(async (img) => {
    try { img.src = await _imgToDataURL(img.src); } catch (_) {}
  }));

  try {
    const SCALE = 2;
    const PAD = 20;
    const padPx = PAD * SCALE;

    const gridCanvas = await html2canvas(offscreen, {
      scale: SCALE,
      backgroundColor: null,
      ignoreElements: (node) => node.tagName === 'IMG' && !node.src.startsWith('data:'),
    });

    const final = document.createElement('canvas');
    final.width  = gridCanvas.width  + padPx * 2;
    final.height = gridCanvas.height + padPx * 2;
    const ctx = final.getContext('2d');

    if (window._bgDraw) {
      ctx.save();
      ctx.scale(SCALE, SCALE);
      window._bgDraw(ctx, final.width / SCALE, final.height / SCALE, -PAD, -PAD);
      ctx.restore();
    }

    ctx.drawImage(gridCanvas, padPx, padPx);
    downloadCanvas(final, 'YouTryItThen-grid.png');
  } catch (err) {
    console.error('Grid export failed:', err);
  } finally {
    imgs.forEach((img, i) => { if (origAttrs[i] != null) img.setAttribute('src', origAttrs[i]); });
    document.body.removeChild(offscreen);
  }
}

async function exportMapPNG() {
  if (!APP.step2State.confirmed) return;
  const wrapper = document.getElementById('step3-map-wrapper');
  if (!wrapper) return;

  // Re-render at a fixed desktop width so saved element sizes always match
  // desktop quality, regardless of the viewport. We render into the actual
  // wrapper (not off-screen) so D3 getBBox calls work reliably, then restore.
  const EXPORT_W = 700;
  const EXPORT_H = Math.round(EXPORT_W * 0.6);

  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgEl.setAttribute('width', EXPORT_W);
  svgEl.setAttribute('height', EXPORT_H);
  wrapper.innerHTML = '';
  wrapper.appendChild(svgEl);

  _mapState = null;
  await initMap(svgEl, EXPORT_W, EXPORT_H);
  updateMapDivisions(APP.step2State.divisions);

  // Clone synchronously while the SVG is fully rendered and in the DOM
  const clone = svgEl.cloneNode(true);

  try {
    await Promise.all([...clone.querySelectorAll('image')].map(async imgEl => {
      const href = imgEl.getAttribute('href');
      if (!href || href.startsWith('data:')) return;
      try { imgEl.setAttribute('href', await _imgToDataURL(href)); } catch (_) {}
    }));

    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_W * 2;
      canvas.height = EXPORT_H * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
      ctx.drawImage(img, 0, 0, EXPORT_W, EXPORT_H);
      URL.revokeObjectURL(url);
      downloadCanvas(canvas, 'YouTryItThen-map.png');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  } catch (err) {
    console.error('Map export failed:', err);
  } finally {
    renderStep3Map();
  }
}

function _imgToDataURL(src) {
  // XHR+FileReader avoids both issues:
  //   - fetch() fails on file:// with "CORS request not http"
  //   - Image+canvas taints on file:// and throws SecurityError on toDataURL()
  // Firefox (and browsers serving via HTTP) allow XHR to same-origin resources.
  // status===0 is a successful file:// read in Firefox.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', src);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      } else {
        reject(new Error('HTTP ' + xhr.status));
      }
    };
    xhr.onerror = reject;
    xhr.send();
  });
}

function downloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function shareOnTwitter() {
  const divs = APP.step2State.divisions;
  const inDivision = countInDivisionRivalries(divs);
  const total = TOTAL_RIVALRIES;
  const switches = countLeagueSwitches(divs);
  const tweetText = `I re-designed the MLB for 2030!
${inDivision}/${total} rivalries in-division & ${switches} league switches.

Think you can do better? bit.ly/youTryItThen`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const el = document.getElementById('step3-grid-preview');
  let blob = null;
  if (el) {
    try {
      const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: '#ffffff' });
      blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    } catch (_) {}
  }

  const file = blob ? new File([blob], 'YouTryItThen.png', { type: 'image/png' }) : null;

  // Web Share API: native share sheet on mobile — supports attaching the image directly.
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ text: tweetText, files: [file] });
      return;
    } catch (_) {}
  }

  // Fallback: download the image then open Twitter so it's ready to attach.
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'YouTryItThen.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.open(twitterUrl, '_blank', 'noopener');
}
