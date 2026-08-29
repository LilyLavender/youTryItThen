let _step1MapInited = false;
let _step1Divisions = null;
let _step1MapState = null;

function step1Show() {
  if (!_step1Divisions) {
    _step1Divisions = buildStep1Divisions();
  }
  renderStep1Grid();
  renderStep1Map();
}

function renderStep1Grid() {
  const container = document.getElementById('step1-grid');
  if (!container) return;
  renderGrid(container, _step1Divisions, { draggable: false, teamSize: 56 });
}

async function renderStep1Map() {
  const wrapper = document.getElementById('step1-map-wrapper');
  if (!wrapper) return;

  if (!_step1MapInited) {
    wrapper.innerHTML = '<div class="map-loading">Loading map…</div>';
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const isMobile = window.innerWidth < 768;
    const w = wrapper.clientWidth || 800;
    const h = Math.round(w * (isMobile ? 0.65 : 0.5));
    svgEl.setAttribute('width', w);
    svgEl.setAttribute('height', h);
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';
    wrapper.innerHTML = '';
    wrapper.appendChild(svgEl);
    _mapState = null;
    _step1MapState = await initMap(svgEl, w, h, isMobile ? 1.07 : 1.0);
    _step1MapInited = true;
  } else {
    _mapState = _step1MapState;
  }

  const teams1 = buildTeamsForMap(null).map(t => {
    if (t.id === 'ATH') {
      const coords = getAthleticsCoords(false);
      return { ...t, lat: coords.lat, lng: coords.lng, city: coords.city };
    }
    return t;
  });
  renderMapTeams(teams1, _step1Divisions);
}
