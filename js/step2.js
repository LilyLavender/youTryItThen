let _step2MapInited = false;
let _step2MapState = null;
let _poolSortable = null;

function step2ResetState() {
  _step2MapInited = false;
  _step2MapState = null;
  if (_poolSortable) { _poolSortable.destroy(); _poolSortable = null; }
  const wrapper = document.getElementById('step2-map-wrapper');
  if (wrapper) wrapper.innerHTML = '';
  const builder = document.getElementById('step2-builder');
  if (builder) builder.style.display = 'none';
  const headerActions = document.getElementById('step2-header-actions');
  if (headerActions) headerActions.style.display = 'none';
  const noBuilder = document.getElementById('step2-no-builder');
  if (noBuilder) noBuilder.style.display = '';
}

function step2Show() {
  renderCitySelector();
  if (APP.step2State.confirmed) {
    showBuilder();
  } else {
    document.getElementById('step2-builder').style.display = 'none';
    const headerActions = document.getElementById('step2-header-actions');
    if (headerActions) headerActions.style.display = 'none';
  }
}

// ── City Selector ────────────────────────────────────────────────────────────

let _cityPickerOpen = false;
let _citySearchQuery = '';
let _moreCitiesExpanded = false;

function cityPillLabel(city) {
  return city.state ? `${city.city}, ${city.state}` : city.city;
}

// Lets searches match a full state/province or country name, not just the
// abbreviation stored on each city (e.g. "texas", "alberta", "mexico").
const STATE_NAMES = {
  AB: 'Alberta', AK: 'Alaska', AL: 'Alabama', BC: 'British Columbia', CA: 'California',
  DR: 'Dominican Republic', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IN: 'Indiana', KY: 'Kentucky', LA: 'Louisiana', MB: 'Manitoba', MX: 'Mexico',
  NC: 'North Carolina', NE: 'Nebraska', NM: 'New Mexico', NS: 'Nova Scotia', NY: 'New York',
  OH: 'Ohio', OK: 'Oklahoma', ON: 'Ontario', OR: 'Oregon', PR: 'Puerto Rico', QC: 'Quebec',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VA: 'Virginia', WI: 'Wisconsin',
};
const COUNTRY_NAMES = { CA: 'Canada', DO: 'Dominican Republic', MX: 'Mexico', PR: 'Puerto Rico', US: 'United States' };

function cityMatchesSearch(city, query) {
  const haystack = [
    city.city, city.state, STATE_NAMES[city.state], city.country, COUNTRY_NAMES[city.country],
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function onCitySearchInput(value) {
  _citySearchQuery = value;
  renderCitySelector();
}

function _escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderCitySelector() {
  const container = document.getElementById('city-selector');
  if (!container) return;
  const chosen = APP.step2State.expansionCities.map(c => c.id);
  const card = container.closest('.city-selector-card');
  const searchWasFocused = document.activeElement && document.activeElement.id === 'city-search-input';

  if (APP.step2State.confirmed && chosen.length >= 2 && !_cityPickerOpen) {
    if (card) card.classList.add('city-card-confirmed');
    container.style.marginBottom = '0';
    const pills = EXPANSION_CITIES
      .filter(c => chosen.includes(c.id))
      .map(c => `<button class="city-pill selected" onclick="toggleCity('${c.id}')">${cityPillLabel(c)} <i class="fa-solid fa-xmark"></i></button>`)
      .join('');
    const addBtn = `<button type="button" class="city-pill city-add-btn" title="Add another expansion city" onclick="toggleCityPicker()"><i class="fa-solid fa-plus"></i></button>`;
    container.innerHTML = `<span class="city-confirm-label">Expansion teams:</span>${pills}${addBtn}`;
    return;
  }

  if (card) card.classList.remove('city-card-confirmed');
  container.style.marginBottom = '16px';

  // No cap once the first 2 cities are confirmed
  const capReached = !APP.step2State.confirmed && chosen.length >= 2;

  const closeBtn = APP.step2State.confirmed
    ? `<button type="button" class="city-pill city-picker-close" onclick="toggleCityPicker()"><i class="fa-solid fa-check"></i> Done</button>`
    : '';

  const pillFor = (city) => {
    const isChosen = chosen.includes(city.id);
    const isDisabled = !isChosen && capReached;
    return `<button
      class="city-pill ${isChosen ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}"
      data-city-id="${city.id}"
      ${isDisabled ? 'disabled' : ''}
      onclick="toggleCity('${city.id}')"
    >${cityPillLabel(city)}</button>`;
  };

  // One alphabetized list (no separate "Other cities" section) — "more
  // cities" just adds/removes the extra tier from that same list rather than
  // opening a second panel. Search only makes sense once the full list is
  // showing, so it's hidden in the "fewer" (likely-only) view.
  const visibleCities = EXPANSION_CITIES.filter(c => c.tier === 'likely' || _moreCitiesExpanded)
    .sort((a, b) => a.city.localeCompare(b.city));
  const trimmedQuery = _moreCitiesExpanded ? _citySearchQuery.trim().toLowerCase() : '';
  const filtered = trimmedQuery ? visibleCities.filter(c => cityMatchesSearch(c, trimmedQuery)) : visibleCities;
  const pills = filtered.length
    ? filtered.map(pillFor).join('')
    : `<span class="city-search-empty">No cities match "${_escapeAttr(_citySearchQuery)}"</span>`;

  const moreCount = EXPANSION_CITIES.filter(c => c.tier !== 'likely').length;
  const toggleLabel = _moreCitiesExpanded ? '− Fewer cities' : `+ More cities (${moreCount})`;
  const toggleBtn = `<button type="button" class="city-pill more-cities-toggle" onclick="toggleMoreCities()">${toggleLabel}</button>`;

  const searchRow = _moreCitiesExpanded ? `<div class="city-search-row">
    <i class="fa-solid fa-magnifying-glass city-search-icon"></i>
    <input type="text" id="city-search-input" class="city-search-input" placeholder="Search cities…"
      value="${_escapeAttr(_citySearchQuery)}" oninput="onCitySearchInput(this.value)" />
  </div>` : '';

  const footer = closeBtn ? `<div class="city-picker-footer">${closeBtn}</div>` : '';

  container.innerHTML = `${searchRow}<div class="city-pill-row">${pills}${toggleBtn}</div>${footer}`;

  if (searchWasFocused) {
    const input = document.getElementById('city-search-input');
    if (input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }
}

function toggleMoreCities() {
  _moreCitiesExpanded = !_moreCitiesExpanded;
  if (!_moreCitiesExpanded) _citySearchQuery = '';
  renderCitySelector();
}

function toggleCityPicker() {
  _cityPickerOpen = !_cityPickerOpen;
  if (!_cityPickerOpen) _citySearchQuery = '';
  renderCitySelector();
}

function toggleCity(cityId) {
  const city = EXPANSION_CITIES.find(c => c.id === cityId);
  if (!city) return;
  const current = APP.step2State.expansionCities;
  const idx = current.findIndex(c => c.id === cityId);
  const wasConfirmed = APP.step2State.confirmed;

  let newCities;
  if (idx >= 0) {
    newCities = current.filter((_, i) => i !== idx);
  } else if (wasConfirmed || current.length < 2) {
    newCities = [...current, city];
  } else {
    return;
  }

  APP.step2State.expansionCities = newCities;

  if (wasConfirmed) {
    APP.confirmExpansionCities();
    renderCitySelector();
    renderStep2Grid();
    renderPoolArea();
    _step2MapInited = false;
    renderStep2Map();
    return;
  }

  if (newCities.length === 2) {
    APP.confirmExpansionCities();
    _citySearchQuery = '';
    renderCitySelector();
    showBuilder();
  } else {
    // Fewer than 2 cities and never confirmed, keep the selector open.
    renderCitySelector();
    renderPoolArea();
    renderStep2Map();
  }
}

// ── Builder ───────────────────────────────────────────────────────────────────

function showBuilder() {
  const builder = document.getElementById('step2-builder');
  if (!builder) return;
  builder.style.display = 'block';
  const headerActions = document.getElementById('step2-header-actions');
  if (headerActions) headerActions.style.display = 'flex';
  const noBuilder = document.getElementById('step2-no-builder');
  if (noBuilder) noBuilder.style.display = 'none';
  renderStep2Grid();
  renderPoolArea();
  updateMetricsBar();
  renderLeagueModeControl();
  renderStep2Map();
}

function renderLeagueModeControl() {
  const label = document.getElementById('league-mode-label');
  const btn = document.getElementById('league-mode-toggle');
  if (!label || !btn) return;
  const isSplit = APP.step2State.divisions && APP.step2State.divisions.leagueMode === 'split';
  label.textContent = isSplit ? 'League mode: AL / NL' : 'League mode: single league';
  btn.textContent = isSplit ? 'Switch to single league' : 'Switch to AL / NL';
}

function renderStep2Grid() {
  const container = document.getElementById('step2-grid');
  if (!container || !APP.step2State.divisions) return;
  renderGrid(container, APP.step2State.divisions, {
    draggable: true,
    teamSize: 56,
    onDragEnd: onStep2Change,
  });
}

function renderPoolArea() {
  const poolArea = document.getElementById('step2-pool-area');
  if (!poolArea) return;
  if (!APP.step2State.confirmed || APP.step2State.expansionCities.length < 2) {
    // Don't leave a previous confirmation's pool on screen once unconfirmed.
    if (_poolSortable) { _poolSortable.destroy(); _poolSortable = null; }
    poolArea.innerHTML = '';
    return;
  }
  poolArea.innerHTML = '';

  // Collect already-assigned teams
  const divs = APP.step2State.divisions;
  const assigned = new Set();
  if (divs) {
    divs.leagues.forEach(lg => lg.divisions.forEach(d => d.teams.forEach(id => assigned.add(id))));
  }

  const unassigned = [
    ...TEAMS
      .filter(t => !assigned.has(t.id))
      .sort((a, b) => (a.city || a.id).localeCompare(b.city || b.id))
      .map(t => t.id),
    ...(APP.expansionTeamMap
      ? [...APP.expansionTeamMap.values()].filter(t => !assigned.has(t.id)).map(t => t.id)
      : []),
  ];

  const poolCol = document.createElement('div');
  poolCol.className = 'league-col pool-col';

  const header = document.createElement('div');
  header.className = 'league-header unassigned';
  header.style.background = '#4a4a4a';
  header.textContent = 'Unassigned';
  poolCol.appendChild(header);

  const poolEl = document.createElement('div');
  poolEl.id = 'step2-pool';
  poolEl.style.margin = '24px 14px 24px 14px';
  poolCol.appendChild(poolEl);

  poolArea.appendChild(poolCol);

  _applyPoolGrid(poolEl, unassigned);

  if (_poolSortable) { _poolSortable.destroy(); _poolSortable = null; }
  _poolSortable = Sortable.create(poolEl, {
    group: { name: 'teams', pull: true, put: true },
    forceFallback: true,
    fallbackOnBody: true,
    delay: 0,
    animation: 150,
    ghostClass: 'drag-ghost',
    dragClass: 'drag-active',
    onStart() { setGridDragging(true); },
    onChange() { refreshPoolLayout(); },
    onEnd() {
      setGridDragging(false);
      syncDivisionsFromDOM();
      onStep2Change();
    },
  });
}

// Lay out pool items in an offset diamond grid (4-3-4-3 honeycomb pattern).
// Called on initial render and after each drag to keep the layout clean.
function _applyPoolGrid(poolEl, teamIds) {
  const isMobile = window.innerWidth < 720;
  const EVEN_COLS = isMobile ? 4 : 8, ODD_COLS = isMobile ? 3 : 7;
  const SIZE = 56;
  const HALF = SIZE / 2;        // 28px per half-column
  const ROW_H = Math.round(SIZE * 0.72); // 40px rows overlap slightly for tight packing

  // Build a (EVEN_COLS*2 + 1)-column grid where even rows start at col 1 and odd at col 2
  poolEl.style.display = 'grid';
  poolEl.style.gridTemplateColumns = `repeat(${EVEN_COLS * 2 + 1}, ${HALF}px)`;
  poolEl.style.gridAutoRows = `${ROW_H}px`;
  poolEl.style.gap = '2px 13px';

  let r = 0, c = 0;
  teamIds.forEach(teamId => {
    const slot = makeDiamondSlot(teamId, SIZE, true);
    const startCol = (r % 2 === 0 ? 1 : 2) + c * 2;
    slot.style.gridColumn = `${startCol} / span 2`;
    slot.style.gridRow    = String(r + 1);
    slot.style.zIndex     = String(r + 1);
    poolEl.appendChild(slot);
    const maxCols = (r % 2 === 0) ? EVEN_COLS : ODD_COLS;
    if (++c >= maxCols) { c = 0; r++; }
  });
}

function refreshPoolLayout() {
  const poolEl = document.getElementById('step2-pool');
  if (!poolEl) return;
  const items = [...poolEl.querySelectorAll(':scope > .team-slot')];
  const isMobile = window.innerWidth < 720;
  const EVEN_COLS = isMobile ? 4 : 8, ODD_COLS = isMobile ? 3 : 7;
  const SIZE = 56;
  const HALF = SIZE / 2;
  const ROW_H = Math.round(SIZE * 0.72);

  poolEl.style.gridTemplateColumns = `repeat(${EVEN_COLS * 2 + 1}, ${HALF}px)`;
  poolEl.style.gridAutoRows = `${ROW_H}px`;

  let r = 0, c = 0;
  items.forEach(slot => {
    const startCol = (r % 2 === 0 ? 1 : 2) + c * 2;
    slot.style.gridColumn = `${startCol} / span 2`;
    slot.style.gridRow    = String(r + 1);
    slot.style.zIndex     = String(r + 1);
    const maxCols = (r % 2 === 0) ? EVEN_COLS : ODD_COLS;
    if (++c >= maxCols) { c = 0; r++; }
  });
}

function onStep2Change() {
  refreshPoolLayout();
  updateMetricsBar();
  APP._renderNav();
  APP.saveToStorage();
  renderStep2Map();
}


async function renderStep2Map() {
  const wrapper = document.getElementById('step2-map-wrapper');
  if (!wrapper) return;
  if (!APP.step2State.confirmed || APP.step2State.expansionCities.length < 2) {
    // Don't leave a previous confirmation's map frozen on screen while the city picker is reopened (0/1 selected) or unconfirmed.
    wrapper.innerHTML = '';
    _step2MapInited = false;
    _step2MapState = null;
    return;
  }

  if (!_step2MapInited) {
    wrapper.innerHTML = '<div class="map-loading">Loading map…</div>';
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const isMobile = window.innerWidth < 768;
    const w = wrapper.clientWidth || 800;
    const h = Math.round(w * 0.65);
    svgEl.setAttribute('width', w);
    svgEl.setAttribute('height', h);
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';
    wrapper.innerHTML = '';
    wrapper.appendChild(svgEl);
    _mapState = null;
    // Anchorage/Honolulu contribute their "moved" display position (not their
    // real, far-off coordinates) so the map's bounds expand to fit them
    // exactly like any other far expansion city — see cityDisplayPoint/initMap.
    const extraPoints = APP.step2State.expansionCities.map(cityDisplayPoint);
    const regionFlags = getRegionFlags(APP.step2State.expansionCities);
    _step2MapState = await initMap(svgEl, w, h, isMobile ? 1.07 : 1.15, extraPoints, regionFlags);
    _step2MapInited = true;
  } else {
    _mapState = _step2MapState;
  }

  updateMapDivisions(APP.step2State.divisions);
}

// ── Metrics ───────────────────────────────────────────────────────────────────

// Maps each placed team id to a division key unique across leagues
function getCurrentTeamDivisionMap() {
  const divisions = APP.step2State.divisions;
  const teamDiv = new Map();
  if (!divisions) return teamDiv;
  divisions.leagues.forEach(lg => {
    lg.divisions.forEach((div, idx) => {
      div.teams.forEach(id => teamDiv.set(id, `${lg.key}:${idx}`));
    });
  });
  return teamDiv;
}

function countInDivisionRivalries(divisions) {
  if (!divisions) return 0;
  const teamDiv = new Map();
  divisions.leagues.forEach(lg => {
    lg.divisions.forEach((div, idx) => {
      div.teams.forEach(id => teamDiv.set(id, `${lg.key}:${idx}`));
    });
  });
  return RIVALRIES.filter(r =>
    teamDiv.has(r.teams[0]) && teamDiv.has(r.teams[1]) &&
    teamDiv.get(r.teams[0]) === teamDiv.get(r.teams[1])
  ).length;
}

// Only count in split mode
function countLeagueSwitches(divisions) {
  if (!divisions || divisions.leagueMode !== 'split') return 0;
  const al = divisions.leagues.find(l => l.key === 'AL');
  const nl = divisions.leagues.find(l => l.key === 'NL');
  const alSet = new Set((al ? al.divisions : []).flatMap(d => d.teams));
  const nlSet = new Set((nl ? nl.divisions : []).flatMap(d => d.teams));
  let switches = 0;
  TEAMS.forEach(t => {
    if (t.league === 'AL' && nlSet.has(t.id)) switches++;
    if (t.league === 'NL' && alSet.has(t.id)) switches++;
  });
  return switches;
}

function toggleLeagueModeUI() {
  const isSplit = APP.step2State.divisions && APP.step2State.divisions.leagueMode === 'split';
  if (!isSplit) {
    // Going single -> split can't preserve which league each division belongs to,
    // so every assigned team gets sent back to the pool.
    const msg = 'Switching to AL / NL will send every currently-assigned team back to the unassigned pool. Continue?';
    if (!confirm(msg)) return;
  }
  APP.toggleLeagueMode();
  renderStep2Grid();
  renderPoolArea();
  updateMetricsBar();
  renderLeagueModeControl();
  APP._renderNav();
  _step2MapInited = false;
  renderStep2Map();
}

// Non-blocking warning when division sizes vary a lot.
function renderDivisionSizeWarning(divisions) {
  const el = document.getElementById('step2-size-warning');
  if (!el) return;
  if (!divisions) { el.style.display = 'none'; return; }
  const sizes = divisions.leagues.flatMap(lg => lg.divisions.map(d => d.teams.length)).filter(n => n > 0);
  if (sizes.length < 2) { el.style.display = 'none'; return; }
  const min = Math.min(...sizes), max = Math.max(...sizes);
  if (max - min > 1) {
    el.textContent = `Division sizes vary a lot (${min}-${max} teams). That's allowed, but even divisions are preferred.`;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

function updateMetricsBar() {
  const divs = APP.step2State.divisions;
  const inDivision = countInDivisionRivalries(divs);
  const total = TOTAL_RIVALRIES;
  const isSplit = !!divs && divs.leagueMode === 'split';
  const switches = isSplit ? countLeagueSwitches(divs) : 0;

  const inDivisionEl = document.getElementById('metric-rivalries');
  const switchesEl  = document.getElementById('metric-switches');
  const switchesItem = document.getElementById('metric-switches-item');
  const noteEl      = document.getElementById('metric-rivalries-note');
  if (inDivisionEl) inDivisionEl.textContent = `${inDivision} / ${total}`;
  if (switchesEl)  switchesEl.textContent = switches;
  if (switchesItem) switchesItem.style.display = isSplit ? '' : 'none';
  if (noteEl) noteEl.textContent = `${ORIG_IN_DIVISION_RIVALRIES} were originally in-division`;

  if (inDivisionEl) {
    inDivisionEl.style.color = inDivision >= 25 ? '#27ae60' : inDivision >= 15 ? '#f39c12' : '#e74c3c';
  }

  renderDivisionSizeWarning(divs);

  const unlocked = APP.isStep3Unlocked();
  document.querySelectorAll('.step2-finalize-btn').forEach(nextBtn => {
    nextBtn.disabled = !unlocked;
    nextBtn.classList.toggle('ready', unlocked);
  });
}
