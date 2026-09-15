// Click-toggled hovercard for editing an expansion team's name, logo, and colors.
// Matches the visual/interaction pattern of the existing division color-picker
// popover: anchored under the trigger, applies changes immediately (no
// save/cancel step), closes on outside click or on re-clicking its trigger.

const EXPOS_PRESET_LOGO = 'img/logos/mtl.png';
const EXPOS_PRESET_TWEAK = { dx: -3, dy: -1, scale: 1.2 };
const EXPOS_PRESET_COLORS = { primaryColor: '#e4002b', secondaryColor: '#ffffff' };
const LOGO_MAX_DIM = 300; // cap uploaded logos before base64-encoding into localStorage

let _logoHovercardEl = null;
let _logoHovercardTeamId = null;
let _logoHovercardPreviewEl = null;

function closeLogoHovercard() {
  if (_logoHovercardEl) { _logoHovercardEl.remove(); _logoHovercardEl = null; }
  _logoHovercardTeamId = null;
  _logoHovercardPreviewEl = null;
  document.removeEventListener('mousedown', _onLogoHovercardOutsideClick, true);
}

function _onLogoHovercardOutsideClick(e) {
  if (!_logoHovercardEl || _logoHovercardEl.contains(e.target)) return;
  // Let the pencil trigger's own click handler decide (toggle-close same team,
  // switch teams) instead of auto-closing here first — otherwise this mousedown
  // listener would close the card before that click handler ever sees it open.
  if (e.target.closest && e.target.closest('.logo-edit-btn')) return;
  closeLogoHovercard();
}

// Toggles the hovercard for a given expansion team, anchored under anchorEl
// (the pencil trigger on its diamond).
function openLogoHovercard(teamId, anchorEl) {
  if (_logoHovercardTeamId === teamId) { closeLogoHovercard(); return; }
  closeLogoHovercard();
  closeColorPicker();

  const team = APP.expansionTeamMap.get(teamId);
  if (!team) return;
  if (!team.logo) team.logo = { light: null, dark: null, tweak: { dx: 0, dy: 0, scale: 1 } };
  if (!team.logo.tweak) team.logo.tweak = { dx: 0, dy: 0, scale: 1 };
  if (team.nameCustomized === undefined) team.nameCustomized = false;

  const card = document.createElement('div');
  card.className = 'logo-hovercard';

  const header = document.createElement('div');
  header.className = 'logo-hovercard-header';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'logo-hovercard-name-input';
  nameInput.value = team.name;
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); });
  nameInput.addEventListener('blur', () => {
    const newName = nameInput.value.trim() || team.name;
    if (newName !== team.name) team.nameCustomized = true;
    team.name = newName;
    nameInput.value = team.name;
    _applyLogoChange(team);
  });
  header.appendChild(nameInput);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'logo-hovercard-close';
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  closeBtn.addEventListener('click', closeLogoHovercard);
  header.appendChild(closeBtn);
  card.appendChild(header);

  const previewWrap = document.createElement('div');
  previewWrap.className = 'logo-hovercard-preview';
  card.appendChild(previewWrap);
  _logoHovercardPreviewEl = previewWrap;
  _renderLogoHovercardPreview(team);

  const filesRow = document.createElement('div');
  filesRow.className = 'logo-hovercard-row logo-hovercard-files';
  filesRow.appendChild(_makeFileField('Logo', team, 'light'));
  filesRow.appendChild(_makeFileField('Map variant (optional)', team, 'dark'));
  card.appendChild(filesRow);

  if (team.city === 'Montreal') {
    const presetRow = document.createElement('div');
    presetRow.className = 'logo-hovercard-row';
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'logo-hovercard-toggle-btn';
    // Remembers whatever was in "Logo" before toggling the preset on, so
    // toggling it back off restores it instead of just clearing the logo.
    let preExpos = null;
    const syncToggleBtn = () => {
      const active = team.logo.light === EXPOS_PRESET_LOGO;
      toggleBtn.classList.toggle('active', active);
      toggleBtn.textContent = active ? 'Using Expos logo' : 'Use Expos logo';
    };
    syncToggleBtn();
    toggleBtn.addEventListener('click', () => {
      const wasActive = team.logo.light === EXPOS_PRESET_LOGO;
      if (wasActive) {
        team.logo.light = preExpos ? preExpos.light : null;
        team.logo.tweak = preExpos ? preExpos.tweak : { dx: 0, dy: 0, scale: 1 };
        team.primaryColor = preExpos ? preExpos.primaryColor : team.primaryColor;
        team.secondaryColor = preExpos ? preExpos.secondaryColor : team.secondaryColor;
      } else {
        preExpos = {
          light: team.logo.light,
          tweak: { ...team.logo.tweak },
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
        };
        team.logo.light = EXPOS_PRESET_LOGO;
        team.logo.tweak = { ...EXPOS_PRESET_TWEAK };
        team.primaryColor = EXPOS_PRESET_COLORS.primaryColor;
        team.secondaryColor = EXPOS_PRESET_COLORS.secondaryColor;
      }
      // Follows the name along with the logo, but only while the user hasn't
      // typed a name of their own.
      if (!team.nameCustomized) {
        team.name = wasActive ? 'Montreal Team' : 'Montreal Expos';
        nameInput.value = team.name;
      }
      dxInput.value = team.logo.tweak.dx;
      dyInput.value = team.logo.tweak.dy;
      scaleInput.value = team.logo.tweak.scale;
      primaryInput.value = team.primaryColor;
      secondaryInput.value = team.secondaryColor;
      syncToggleBtn();
      _applyLogoChange(team);
    });
    presetRow.appendChild(toggleBtn);
    card.appendChild(presetRow);
  }

  const sliders = document.createElement('div');
  sliders.className = 'logo-hovercard-row logo-hovercard-sliders';
  const [dxField, dxInput] = _makeSlider('X', team, 'dx', -20, 20, 1);
  const [dyField, dyInput] = _makeSlider('Y', team, 'dy', -20, 20, 1);
  const [scaleField, scaleInput] = _makeSlider('Scale', team, 'scale', 0.5, 1.5, 0.05);
  sliders.appendChild(dxField);
  sliders.appendChild(dyField);
  sliders.appendChild(scaleField);
  card.appendChild(sliders);

  const colorsRow = document.createElement('div');
  colorsRow.className = 'logo-hovercard-row logo-hovercard-colors';
  const [primaryField, primaryInput] = _makeColorField('Primary', team, 'primaryColor');
  const [secondaryField, secondaryInput] = _makeColorField('Secondary', team, 'secondaryColor');
  colorsRow.appendChild(primaryField);
  colorsRow.appendChild(secondaryField);
  card.appendChild(colorsRow);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'logo-hovercard-remove-btn';
  removeBtn.textContent = 'Remove logo';
  removeBtn.addEventListener('click', () => {
    team.logo.light = null;
    team.logo.dark = null;
    _applyLogoChange(team);
  });
  card.appendChild(removeBtn);

  document.body.appendChild(card);
  const rect = anchorEl.getBoundingClientRect();
  card.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - card.offsetWidth - 8) + 'px';
  card.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  const cardRect = card.getBoundingClientRect();
  if (cardRect.left < 4) card.style.left = '4px';
  if (cardRect.bottom > window.innerHeight - 4) card.style.top = (rect.top + window.scrollY - card.offsetHeight - 6) + 'px';

  _logoHovercardEl = card;
  _logoHovercardTeamId = teamId;
  setTimeout(() => document.addEventListener('mousedown', _onLogoHovercardOutsideClick, true), 0);
}

function _makeFileField(labelText, team, variant) {
  const wrap = document.createElement('label');
  wrap.className = 'logo-hovercard-file-field';
  const span = document.createElement('span');
  span.textContent = labelText;
  wrap.appendChild(span);
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    _downscaleImageFile(file, LOGO_MAX_DIM).then(dataUrl => {
      team.logo[variant] = dataUrl;
      _applyLogoChange(team);
    });
  });
  wrap.appendChild(input);
  return wrap;
}

// Returns [fieldEl, inputEl] so callers can push new values into the slider
// (e.g. the Expos preset button) without rebuilding the hovercard.
function _makeSlider(labelText, team, key, min, max, step) {
  const wrap = document.createElement('label');
  wrap.className = 'logo-hovercard-slider-field';
  const span = document.createElement('span');
  span.textContent = labelText;
  wrap.appendChild(span);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = team.logo.tweak[key];
  input.addEventListener('input', () => {
    team.logo.tweak[key] = parseFloat(input.value);
    _applyLogoChange(team);
  });
  wrap.appendChild(input);
  return [wrap, input];
}

// Unlike the division color picker (a fixed palette grid, kept as-is for
// divisions), an expansion team's own colors use a native color input so any
// color is available here.
// Returns [fieldEl, inputEl] — same shape as _makeSlider — so callers can
// push new values in (e.g. the Expos preset toggle) without a rebuild.
function _makeColorField(labelText, team, field) {
  const wrap = document.createElement('label');
  wrap.className = 'logo-hovercard-color-field';
  const span = document.createElement('span');
  span.textContent = labelText;
  wrap.appendChild(span);
  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'logo-hovercard-color-swatch';
  input.value = team[field];
  input.addEventListener('input', () => {
    team[field] = input.value;
    _applyLogoChange(team);
  });
  wrap.appendChild(input);
  return [wrap, input];
}

function _renderLogoHovercardPreview(team) {
  if (!_logoHovercardPreviewEl) return;
  _logoHovercardPreviewEl.innerHTML = '';
  _logoHovercardPreviewEl.appendChild(makeDiamondSlot(team, 72, false));
}

// Persists the change, refreshes the hovercard's own preview, and re-renders
// whatever's currently visible so the edit shows up live everywhere.
function _applyLogoChange(team) {
  APP.saveToStorage();
  _renderLogoHovercardPreview(team);
  if (typeof renderStep2Grid === 'function') renderStep2Grid();
  if (typeof renderPoolArea === 'function') renderPoolArea();
  if (typeof renderStep2Map === 'function') renderStep2Map();
}

// Draws the uploaded file onto an offscreen canvas capped at maxDim x maxDim
// (preserving aspect ratio) so localStorage never has to hold full-size uploads.
function _downscaleImageFile(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
