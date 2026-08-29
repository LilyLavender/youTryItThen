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

let _moreCitiesExpanded = false;

function cityPillLabel(city) {
  return city.state ? `${city.city}, ${city.state}` : city.city;
}

function renderCitySelector() {
  const container = document.getElementById('city-selector');
  if (!container) return;
  const chosen = APP.step2State.expansionCities.map(c => c.id);
  const card = container.closest('.city-selector-card');

  if (APP.step2State.confirmed && chosen.length === 2) {
    if (card) card.classList.add('city-card-confirmed');
    container.style.marginBottom = '0';
    const pills = EXPANSION_CITIES
      .filter(c => chosen.includes(c.id))
      .map(c => `<button class="city-pill selected" onclick="toggleCity('${c.id}')">${cityPillLabel(c)} <i class="fa-solid fa-xmark"></i></button>`)
      .join('');
    container.innerHTML = `<span class="city-confirm-label">Expansion teams:</span>${pills}`;
    return;
  }

  if (card) card.classList.remove('city-card-confirmed');
  container.style.marginBottom = '16px';

  const likelyPills = EXPANSION_CITIES.filter(c => c.tier === 'likely').map(city => {
    const isChosen = chosen.includes(city.id);
    const isDisabled = !isChosen && chosen.length >= 2;
    return `<button
      class="city-pill ${isChosen ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}"
      data-city-id="${city.id}"
      ${isDisabled ? 'disabled' : ''}
      onclick="toggleCity('${city.id}')"
    >${cityPillLabel(city)}</button>`;
  }).join('');

  const moreCities = EXPANSION_CITIES.filter(c => c.tier === 'more')
    .sort((a, b) => a.city.localeCompare(b.city));
  const toggleLabel = _moreCitiesExpanded ? '− Fewer cities' : `+ More cities (${moreCities.length})`;
  const toggleBtn = `<button type="button" class="city-pill more-cities-toggle" onclick="toggleMoreCities()">${toggleLabel}</button>`;

  let morePanel = '';
  if (_moreCitiesExpanded) {
    const pills = moreCities.map(city => {
      const isChosen = chosen.includes(city.id);
      const isDisabled = !isChosen && chosen.length >= 2;
      return `<button
        class="city-pill ${isChosen ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}"
        data-city-id="${city.id}"
        ${isDisabled ? 'disabled' : ''}
        onclick="toggleCity('${city.id}')"
      >${cityPillLabel(city)}</button>`;
    }).join('');

    morePanel = `<div class="more-cities-panel">
      <div class="more-cities-group-label">Other cities</div>
      <div class="more-cities-group-pills">${pills}</div>
    </div>`;
  }

  container.innerHTML = `<div class="city-pill-row">${likelyPills}${toggleBtn}</div>${morePanel}`;
}

function toggleMoreCities() {
  _moreCitiesExpanded = !_moreCitiesExpanded;
  renderCitySelector();
}

function toggleCity(cityId) {
  const city = EXPANSION_CITIES.find(c => c.id === cityId);
  if (!city) return;
  const current = APP.step2State.expansionCities;
  const idx = current.findIndex(c => c.id === cityId);

  let newCities;
  if (idx >= 0) {
    newCities = current.filter((_, i) => i !== idx);
  } else if (current.length < 2) {
    newCities = [...current, city];
  } else {
    return;
  }

  APP.step2State.expansionCities = newCities;

  if (newCities.length === 2) {
    const firstTime = !APP.step2State.confirmed;
    APP.confirmExpansionCities();  // updates expansion teams; preserves divisions if not first time
    renderCitySelector();          // re-render after confirm so collapsed state shows
    if (firstTime) {
      showBuilder();
    } else {
      // Just refresh grid/pool in place so expansion team name/city updates.
      // Force the map to rebuild too, since the new cities may need different
      // projection bounds (e.g. swapping in/out a Mexico or Caribbean pick).
      renderStep2Grid();
      renderPoolArea();
      _step2MapInited = false;
      renderStep2Map();
    }
  } else {
    // Fewer than 2 cities - expand the selector back, keep builder visible.
    // The grid/division layout is intentionally preserved (per the comment
    // above), but the map and pool both reflect the *current* roster live from
    // expansionTeamMap, so clear them rather than leaving a picked-then-removed
    // city's marker/pool entry on screen until a replacement is confirmed.
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
  renderStep2Map();
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
  if (!APP.step2State.confirmed || APP.step2State.expansionCities.length !== 2) {
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
    [...divs.AL, ...divs.NL].forEach(d => d.teams.forEach(id => assigned.add(id)));
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
    onChange() { refreshPoolLayout(); },
    onEnd() {
      syncDivisionsFromDOM();
      onStep2Change();
    },
  });
}

// Lay out pool items in an offset diamond grid (4-3-4-3 honeycomb pattern).
// Called on initial render and after each drag to keep the layout tidy.
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
  if (!APP.step2State.confirmed || APP.step2State.expansionCities.length !== 2) {
    // Don't leave a previous confirmation's map frozen on screen while the
    // city picker is reopened (0/1 selected) or unconfirmed.
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
    const extraPoints = APP.step2State.expansionCities.map(c => ({ lat: c.lat, lng: c.lng }));
    _step2MapState = await initMap(svgEl, w, h, isMobile ? 1.07 : 1.15, extraPoints);
    _step2MapInited = true;
  } else {
    _mapState = _step2MapState;
  }

  updateMapDivisions(APP.step2State.divisions);
}

// ── Metrics ───────────────────────────────────────────────────────────────────

function countInDivisionRivalries(divisions) {
  if (!divisions) return 0;
  const teamDiv = new Map();
  [...divisions.AL, ...divisions.NL].forEach(div => {
    div.teams.forEach(id => teamDiv.set(id, div.name));
  });
  return RIVALRIES.filter(r =>
    teamDiv.has(r.teams[0]) && teamDiv.has(r.teams[1]) &&
    teamDiv.get(r.teams[0]) === teamDiv.get(r.teams[1])
  ).length;
}

function countLeagueSwitches(divisions) {
  if (!divisions) return 0;
  const alSet = new Set(divisions.AL.flatMap(d => d.teams));
  const nlSet = new Set(divisions.NL.flatMap(d => d.teams));
  let switches = 0;
  TEAMS.forEach(t => {
    if (t.league === 'AL' && nlSet.has(t.id)) switches++;
    if (t.league === 'NL' && alSet.has(t.id)) switches++;
  });
  return switches;
}

function updateMetricsBar() {
  const divs = APP.step2State.divisions;
  const inDivision = countInDivisionRivalries(divs);
  const total = TOTAL_RIVALRIES;
  const switches = countLeagueSwitches(divs);

  const inDivisionEl = document.getElementById('metric-rivalries');
  const switchesEl  = document.getElementById('metric-switches');
  const noteEl      = document.getElementById('metric-rivalries-note');
  if (inDivisionEl) inDivisionEl.textContent = `${inDivision} / ${total}`;
  if (switchesEl)  switchesEl.textContent = switches;
  if (noteEl) noteEl.textContent = `${ORIG_IN_DIVISION_RIVALRIES} were originally in-division`;

  if (inDivisionEl) {
    inDivisionEl.style.color = inDivision >= 25 ? '#27ae60' : inDivision >= 15 ? '#f39c12' : '#e74c3c';
  }

  const unlocked = APP.isStep3Unlocked();
  document.querySelectorAll('.step2-finalize-btn').forEach(nextBtn => {
    nextBtn.disabled = !unlocked;
    nextBtn.classList.toggle('ready', unlocked);
  });
}
