// Renders the diamond grid for any step.
// divisions: { AL: [{name, teams:[id,...]}, ...], NL: [{name, teams:[id,...]}, ...] }
// options: { draggable, teamSize, leagueColors, onDragEnd, exportMode }

const AL_HEADER_COLOR = "#D0021B";
const NL_HEADER_COLOR = "#0039A6";
const AL_DIV_HEADER_BG = "rgba(208,2,27,0.50)";
const NL_DIV_HEADER_BG = "rgba(0,57,166,0.50)";

// 4 shades per league for step 2
const AL_DIV_COLORS = ["#c0392b","#e74c3c","#e95d4c","#f07066"];
const NL_DIV_COLORS = ["#1a5276","#2980b9","#3498db","#5dade2"];

const DARK_LOGO_TEAMS = new Set(['atl','ath','cin','cle','col','det','hou','kc','lad','min','nyy','phi','stl','tb','tex','wsh']);

function getLocalLogoUrl(teamId, dark = false) {
  const id = teamId.toLowerCase();
  return dark && DARK_LOGO_TEAMS.has(id) ? `img/${id}-dark.png` : `img/${id}.png`;
}

function adjustHexColor(hex, amount) {
  if (!hex || hex.length < 7) return hex || '#888';
  const adj = (ch) => {
    const v = amount > 0
      ? Math.round(ch + (255 - ch) * amount)
      : Math.round(ch + ch * amount);
    return Math.min(255, Math.max(0, v));
  };
  let r = adj(parseInt(hex.slice(1, 3), 16));
  let g = adj(parseInt(hex.slice(3, 5), 16));
  let b = adj(parseInt(hex.slice(5, 7), 16));

  // Boost saturation slightly via HSL
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  if (max > min) {
    const l = (max + min) / 2;
    const s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    const newS = Math.min(1, s * 1.2);
    let h;
    if (max === rn)      h = ((gn - bn) / (max - min) + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / (max - min) + 2) / 6;
    else                 h = ((rn - gn) / (max - min) + 4) / 6;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + newS) : l + newS - l * newS;
    const p2 = 2 * l - q;
    r = Math.round(hue2rgb(p2, q, h + 1/3) * 255);
    g = Math.round(hue2rgb(p2, q, h) * 255);
    b = Math.round(hue2rgb(p2, q, h - 1/3) * 255);
  }

  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function renderGrid(container, divisions, options = {}) {
  const { draggable = false, teamSize = 56, exportMode = false, onDragEnd = null } = options;
  container.innerHTML = '';
  container.className = 'grid-layout';

  const makeLeagueCol = (league, divs) => {
    const isAL = league === 'AL';
    const col = document.createElement('div');
    col.className = `league-col ${league.toLowerCase()}`;

    if (!exportMode) {
      const leagueHeader = document.createElement('div');
      leagueHeader.className = 'league-header';
      leagueHeader.style.background = isAL ? AL_HEADER_COLOR : NL_HEADER_COLOR;
      leagueHeader.textContent = isAL ? 'AMERICAN LEAGUE' : 'NATIONAL LEAGUE';
      col.appendChild(leagueHeader);
    }

    const divHeaderColor = exportMode
      ? (isAL ? 'rgba(180,0,15,0.75)' : 'rgba(0, 40, 165, 0.75)')
      : (isAL ? AL_DIV_HEADER_BG : NL_DIV_HEADER_BG);
    divs.forEach((div, idx) => {
      const block = document.createElement('div');
      block.className = 'division-block';
      block.dataset.league = league;
      block.dataset.divName = div.name;
      block.dataset.divIdx = idx;

      const header = document.createElement('div');
      header.className = 'division-header';
      header.style.background = divHeaderColor;
      header.style.mixBlendMode = 'multiply';
      if (exportMode) {
        header.style.fontWeight = '800';
        header.style.fontSize = '1.3em';
        header.style.lineHeight = '1em';
        header.style.letterSpacing = '1.25px';
        header.style.padding = '10px';
      }
      header.dataset.divName = div.name;

      if (draggable && !exportMode) {
        header.contentEditable = 'true';
        header.spellcheck = false;
        header.title = 'Click to rename';
        header.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); header.blur(); } });
        header.addEventListener('blur', () => {
          const newName = header.textContent.trim() || div.name;
          block.dataset.divName = newName;
          // Persist directly to state so renames survive re-renders and tab switches
          if (APP.step2State && APP.step2State.divisions) {
            const league = block.dataset.league;
            const idx = parseInt(block.dataset.divIdx);
            const arr = APP.step2State.divisions[league];
            if (arr && arr[idx]) arr[idx].name = newName;
          }
          APP._renderNav();
          APP.saveToStorage();
          if (onDragEnd) onDragEnd();
        });
      }
      header.textContent = div.name;
      block.appendChild(header);

      const teamsRow = document.createElement('div');
      teamsRow.className = 'teams-row';

      div.teams.forEach(teamId => {
        const slot = makeDiamondSlot(teamId, teamSize, draggable);
        teamsRow.appendChild(slot);
      });

      block.appendChild(teamsRow);
      col.appendChild(block);

      if (draggable) {
        Sortable.create(teamsRow, {
          group: { name: 'teams', pull: true, put: true },
          forceFallback: true,
          fallbackOnBody: true,
          delay: 0,
          animation: 150,
          ghostClass: 'drag-ghost',
          dragClass: 'drag-active',
          onStart() { setGridDragging(true); },
          onEnd() {
            setGridDragging(false);
            syncDivisionsFromDOM();
            if (onDragEnd) onDragEnd();
            APP._renderNav();
          },
        });
      }
    });

    return col;
  };

  container.appendChild(makeLeagueCol('AL', divisions.AL));
  container.appendChild(makeLeagueCol('NL', divisions.NL));
}

function makeDiamondSlot(teamId, size = 56, draggable = false) {
  const team = getTeamById(teamId);
  const wrapper = document.createElement('div');
  wrapper.className = 'team-slot';
  wrapper.dataset.teamId = teamId;

  const diamond = document.createElement('div');
  diamond.className = 'diamond';
  diamond.style.width = size + 'px';
  diamond.style.height = size + 'px';

  const primary = team ? team.primaryColor : '#888';
  const secondary = team ? (team.secondaryColor || 'rgba(255,255,255,0.35)') : 'rgba(255,255,255,0.35)';
  const lighter = adjustHexColor(primary, 0.30);
  const darker  = adjustHexColor(primary, -0.30);
  diamond.style.background = `linear-gradient(135deg, ${lighter}, ${darker})`;
  diamond.style.borderColor = 'transparent';

  if (team && !team.isExpansion && team.mlbId) {
    const img = document.createElement('img');
    img.src = getLocalLogoUrl(team.id, true);
    img.alt = team.id;
    img.setAttribute('draggable', 'false');
    img.onerror = () => {
      img.onerror = () => { img.style.display = 'none'; diamond.appendChild(makeInitialsFallback(team, size)); };
      img.src = getLocalLogoUrl(team.id, false);
    };
    const tweak = (typeof LOGO_TWEAKS !== 'undefined' && LOGO_TWEAKS[team.id]) || {};
    const dx = tweak.dx || 0;
    const dy = tweak.dy || 0;
    const sc = tweak.scale || 1;
    img.style.transform = `translateX(${dx}px) translateY(${dy}px) rotate(-45deg) scale(${0.75 * sc})`;
    diamond.appendChild(img);
  }

  const outline = document.createElement('div');
  outline.className = 'diamond-outline';
  outline.style.cssText = `position:absolute;inset:0;border:2.5px solid ${secondary}C0;pointer-events:none;`;
  diamond.appendChild(outline);

  wrapper.appendChild(diamond);

  // Drawn as a sibling of .diamond, not a child, so the label is never itself
  // rotated — avoids the double-rotation text blur from the old rotate/counter-rotate approach.
  if (team && (team.isExpansion || !team.mlbId)) {
    wrapper.appendChild(makeExpansionPlaceholder(team, size));
  }

  if (draggable) wrapper.dataset.dynamicRivals = '1';
  wrapper.addEventListener('mouseenter', () => showRivalTooltip(wrapper, teamId));
  wrapper.addEventListener('mouseleave', () => hideRivalTooltip());
  wrapper.addEventListener('click', () => {
    if (window.innerWidth < 768) toggleMobileRivals(wrapper, teamId);
  });

  return wrapper;
}

function makeInitialsFallback(team, size) {
  const span = document.createElement('span');
  span.className = 'initials-fallback';
  span.textContent = team.id.slice(0, 3);
  span.style.fontSize = Math.round(size * 0.28) + 'px';
  span.style.color = '#fff';
  return span;
}

// Per-city nudges on top of the default city-name font size, from visual review
// of every expansion candidate in temp-diamonds.html. Each step is +/-7% size.
// Cities not listed (including ones still pending review) use the default, step 0.
const EXP_CITY_FONT_STEPS = {
  'Montreal': -1,
  'Edmonton': -1,
  'Monterrey': -1,
  'Oklahoma City': -1,
  'Savannah': -1,
  'Birmingham': -2,
  'Indianapolis': -3,
  'Jacksonville': -3,
  'Charlotte': -2,
  'Sacramento': -2,
  'Vancouver': -1,
  'Quebec City': 1,
  'Austin': 2,
  'Buffalo': 2,
  'Raleigh': 2,
  'Halifax': 2,
  'Omaha': 2,
  'El Paso': 2,
};
const EXP_CITY_FONT_STEP_RATIO = 0.07;

// Cities dialed to an exact px size (at the temp-diamonds.html reference size
// of 90px) instead of a step off the default — kept as a ratio so it still
// scales with whatever diamond size the app actually renders at.
const EXP_CITY_FONT_RATIO_OVERRIDES = {
  'New Orleans': 11 / 90,
  'San Antonio': 12 / 90,
  'San Juan': 15 / 90,
  'Dominican Republic': 11 / 90,
};

// Diamond-only display label swaps — the underlying city name (used by the
// city picker, map, and tooltip) is untouched.
const EXP_CITY_DIAMOND_LABEL_OVERRIDES = {
  'Santo Domingo': 'Dominican Republic',
};

// These are forced onto a single line even if that means overflowing the
// diamond's usual text padding slightly — at their dialed-in font size, wrapping
// looked worse than the overflow.
const EXP_CITY_FORCE_ONE_LINE = new Set(['New Orleans', 'San Juan']);

function makeExpansionPlaceholder(team, size) {
  const wrap = document.createElement('div');
  wrap.className = 'expansion-placeholder';
  const plus = document.createElement('i');
  plus.className = 'exp-plus fa-solid fa-plus';
  plus.style.fontSize = Math.round(size * 0.4) + 'px';
  const cityEl = document.createElement('span');
  cityEl.className = 'exp-city';
  const displayLabel = EXP_CITY_DIAMOND_LABEL_OVERRIDES[team.city] || team.city;
  cityEl.textContent = displayLabel;
  const cityRatio = EXP_CITY_FONT_RATIO_OVERRIDES[displayLabel]
    || 0.16 * (1 + (EXP_CITY_FONT_STEPS[displayLabel] || 0) * EXP_CITY_FONT_STEP_RATIO);
  cityEl.style.fontSize = Math.round(size * cityRatio) + 'px';
  if (EXP_CITY_FORCE_ONE_LINE.has(displayLabel)) cityEl.style.whiteSpace = 'nowrap';
  wrap.appendChild(plus);
  wrap.appendChild(cityEl);
  return wrap;
}

function makeLogoOnly(teamId, size = 36) {
  const team = getTeamById(teamId);
  const wrap = document.createElement('div');
  wrap.style.cssText = `width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
  if (team && team.mlbId && !team.isExpansion) {
    const img = document.createElement('img');
    img.src = getLocalLogoUrl(team.id, false);
    img.alt = team.id;
    img.setAttribute('draggable', 'false');
    img.style.cssText = `width:${size}px;height:${size}px;object-fit:contain;`;
    wrap.appendChild(img);
  } else if (team) {
    const span = document.createElement('span');
    span.textContent = team.city ? team.city.slice(0, 3).toUpperCase() : team.id;
    span.style.cssText = `font-size:${Math.round(size * 0.28)}px;font-weight:700;color:#333;`;
    wrap.appendChild(span);
  }
  return wrap;
}

// Rival tooltip (desktop hover)
let _tooltipEl = null;
let _tooltipTimeout = null;
let _gridDragging = false;

function setGridDragging(v) {
  _gridDragging = v;
  if (v) hideRivalTooltip();
}

function showRivalTooltip(slotEl, teamId) {
  if (_gridDragging) return;
  clearTimeout(_tooltipTimeout);
  hideRivalTooltip(true);

  const rivals = getTeamRivals(teamId);
  if (!rivals.length) return;
  const team = getTeamById(teamId);
  if (!team) return;

  // In the draggable step 2 grid, flag each rival as still sharing a division
  // (preserved) or not (broken) based on the user's current layout, rather
  // than the static original-MLB `inDivision` field on the rivalry data.
  const divisionMap = slotEl.dataset.dynamicRivals && typeof getCurrentTeamDivisionMap === 'function'
    ? getCurrentTeamDivisionMap()
    : null;

  const tip = document.createElement('div');
  tip.className = 'rival-tooltip';
  tip.innerHTML = `<div class="tooltip-name">${team.name}</div><div class="tooltip-rivals-label">Rivalries:</div><div class="tooltip-rivals">`;

  const rivRow = tip.querySelector('.tooltip-rivals');
  rivals.forEach(({ rivalId }) => {
    const rival = getTeamById(rivalId);
    if (!rival) return;
    const s = makeLogoOnly(rivalId, 28);
    s.title = rival.name;
    s.style.cursor = 'pointer';
    if (divisionMap && divisionMap.has(teamId) && divisionMap.has(rivalId)) {
      const sameDivision = divisionMap.get(teamId) === divisionMap.get(rivalId);
      s.classList.add(sameDivision ? 'rival-preserved' : 'rival-broken');
    }
    s.addEventListener('click', () => {
      const target = document.querySelector(`.team-slot[data-team-id="${rivalId}"]`);
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); highlightTeam(rivalId); }
    });
    rivRow.appendChild(s);
  });

  tip.appendChild(rivRow);
  document.body.appendChild(tip);
  _tooltipEl = tip;

  const rect = slotEl.getBoundingClientRect();
  tip.style.left = (rect.left + rect.width / 2 - tip.offsetWidth / 2 + window.scrollX) + 'px';
  tip.style.top = (rect.top - tip.offsetHeight - 8 + window.scrollY) + 'px';

  const tipRect = tip.getBoundingClientRect();
  if (tipRect.left < 4) tip.style.left = '4px';
  if (tipRect.right > window.innerWidth - 4) tip.style.left = (window.innerWidth - tip.offsetWidth - 4) + 'px';
}

function hideRivalTooltip() {
  if (_tooltipEl) {
    _tooltipEl.remove();
    _tooltipEl = null;
  }
}

function highlightTeam(teamId) {
  document.querySelectorAll('.team-slot').forEach(el => el.classList.remove('highlighted'));
  const targets = document.querySelectorAll(`.team-slot[data-team-id="${teamId}"]`);
  targets.forEach(el => {
    el.classList.add('highlighted');
    setTimeout(() => el.classList.remove('highlighted'), 2000);
  });
}

let _mobileRivalsEl = null;

function toggleMobileRivals(slotEl, teamId) {
  if (_mobileRivalsEl) { _mobileRivalsEl.remove(); _mobileRivalsEl = null; }
  const rivals = getTeamRivals(teamId);
  if (!rivals.length) return;

  const row = document.createElement('div');
  row.className = 'mobile-rivals-row';
  rivals.forEach(({ rivalId }) => {
    const s = makeDiamondSlot(rivalId, 36, false);
    row.appendChild(s);
  });

  const teamsRow = slotEl.closest('.teams-row');
  if (teamsRow) { teamsRow.insertAdjacentElement('afterend', row); _mobileRivalsEl = row; }
}

// Only syncs division blocks within step2-grid to avoid polluting state from step3 preview
function syncDivisionsFromDOM() {
  const gridEl = document.getElementById('step2-grid');
  if (!gridEl) return;
  const divs = { AL: [], NL: [] };
  gridEl.querySelectorAll('.division-block[data-league]').forEach(block => {
    const league = block.dataset.league;
    const name = block.querySelector('.division-header').textContent.trim();
    const teams = [...block.querySelectorAll('.team-slot[data-team-id]')].map(el => el.dataset.teamId);
    divs[league].push({ name, teams });
  });
  if (APP.step2State.divisions) {
    APP.step2State.divisions = divs;
  }
}
