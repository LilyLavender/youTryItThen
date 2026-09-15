window.APP = {
  currentStep: 1,
  expansionTeamMap: new Map(),

  step2State: {
    expansionCities: [],    // up to 2 chosen city objects from EXPANSION_CITIES
    confirmed: false,
    divisions: null,        // set on confirm
  },

  getStep2Divisions() {
    return this.step2State.divisions;
  },

  setExpansionCities(cities) {
    this.step2State.expansionCities = cities;
  },

  // Expansion team ids are keyed by city id (not index) so adding/removing
  // cities out of order never shifts or collides with another city's id.
  confirmExpansionCities() {
    const cities = this.step2State.expansionCities;
    if (!this.step2State.confirmed && cities.length < 2) return;

    const newMap = new Map();
    cities.forEach(city => {
      const id = `EXP-${city.id}`;
      newMap.set(id, {
        id,
        name: `${city.city} Team`,
        city: city.city,
        lat: city.lat,
        lng: city.lng,
        league: null,
        division: null,
        mlbId: null,
        primaryColor: "#888888",
        secondaryColor: "#cccccc",
        isExpansion: true,
        expansionCityId: city.id,
        mapAbbr: city.mapAbbr,
      });
    });
    this.expansionTeamMap = newMap;

    // Only reset divisions on the very first confirmation.
    // Changing cities later just updates expansion team info; division layout is preserved.
    if (!this.step2State.confirmed) {
      this.step2State.divisions = {
        leagueMode: "split",
        leagues: [
          { key: "AL", label: "American League", divisions: [
            { name: "AL 1", teams: [] },
            { name: "AL 2", teams: [] },
            { name: "AL 3", teams: [] },
            { name: "AL 4", teams: [] },
          ] },
          { key: "NL", label: "National League", divisions: [
            { name: "NL 1", teams: [] },
            { name: "NL 2", teams: [] },
            { name: "NL 3", teams: [] },
            { name: "NL 4", teams: [] },
          ] },
        ],
      };
    } else if (this.step2State.divisions) {
      // A city may have just been removed via the "+" picker. Strip any now-stale expansion team ids out of whatever division they were sitting in.
      const validIds = new Set(newMap.keys());
      this.step2State.divisions.leagues.forEach(lg => {
        lg.divisions.forEach(div => {
          div.teams = div.teams.filter(id => !id.startsWith("EXP-") || validIds.has(id));
        });
      });
    }

    this.step2State.confirmed = true;
    this.saveToStorage();
  },

  // Split -> single: flattens both leagues' divisions into one list, keeping teams/names as-is (colors are always derived at render time, never stored).
  // Single -> split: divisions alternate back into AL/NL, but team assignments are dumped back to the pool since there's no way to tell which league each division "belongs" to.
  toggleLeagueMode() {
    const divs = this.step2State.divisions;
    if (!divs) return;

    if (divs.leagueMode === "split") {
      const flat = divs.leagues.flatMap(lg => lg.divisions.map(d => ({ name: d.name, teams: [...d.teams], color: d.color || null })));
      if (!flat.length) flat.push({ name: "New Division", teams: [] });
      this.step2State.divisions = {
        leagueMode: "single",
        leagues: [{ key: "ALL", label: null, divisions: flat }],
      };
    } else {
      const src = divs.leagues[0].divisions;
      const splitAt = Math.ceil(src.length / 2);
      const al = src.slice(0, splitAt).map(d => ({ name: d.name, teams: [], color: d.color || null }));
      const nl = src.slice(splitAt).map(d => ({ name: d.name, teams: [], color: d.color || null }));
      if (!al.length) al.push({ name: "New Division", teams: [] });
      if (!nl.length) nl.push({ name: "New Division", teams: [] });
      this.step2State.divisions = {
        leagueMode: "split",
        leagues: [
          { key: "AL", label: "American League", divisions: al },
          { key: "NL", label: "National League", divisions: nl },
        ],
      };
    }
    this.saveToStorage();
  },

  addDivision(leagueKey) {
    const divs = this.step2State.divisions;
    const lg = divs && divs.leagues.find(l => l.key === leagueKey);
    if (!lg) return;
    lg.divisions.push({ name: "New Division", teams: [] });
    this.saveToStorage();
  },

  // Returns false (and leaves state untouched) if this is the league's last division or if the user declines the confirm prompt for a non-empty one.
  removeDivision(leagueKey, idx) {
    const divs = this.step2State.divisions;
    const lg = divs && divs.leagues.find(l => l.key === leagueKey);
    if (!lg || lg.divisions.length <= 1) return false;
    const div = lg.divisions[idx];
    if (!div) return false;
    if (div.teams.length > 0) {
      const msg = `Remove "${div.name}"? Its ${div.teams.length} team(s) will go back to the unassigned pool.`;
      if (!confirm(msg)) return false;
    }
    lg.divisions.splice(idx, 1);
    this.saveToStorage();
    return true;
  },

  saveToStorage() {
    try {
      localStorage.setItem('ytit', JSON.stringify({
        step2State: this.step2State,
        expansionTeams: [...this.expansionTeamMap.entries()],
      }));
    } catch(e) {}
  },

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('ytit');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.step2State) this.step2State = saved.step2State;
      if (saved.expansionTeams) this.expansionTeamMap = new Map(saved.expansionTeams);
      this._migrateDivisionsShape();
    } catch(e) {
      localStorage.removeItem('ytit');
    }
  },

  // Older saves stored divisions as {AL:[...], NL:[...]} directly.
  // Convert those into the current {leagueMode, leagues:[...]} shape transparently.
  _migrateDivisionsShape() {
    const divs = this.step2State.divisions;
    if (!divs || divs.leagues) return;
    if (!divs.AL && !divs.NL) return;
    this.step2State.divisions = {
      leagueMode: "split",
      leagues: [
        { key: "AL", label: "American League", divisions: divs.AL || [] },
        { key: "NL", label: "National League", divisions: divs.NL || [] },
      ],
    };
  },

  clearStorage() {
    localStorage.removeItem('ytit');
    location.reload();
  },

  resetApp() {
    if (!confirm('Reset your realignment? All progress will be lost.')) return;
    localStorage.removeItem('ytit');
    this.step2State = { expansionCities: [], confirmed: false, divisions: null };
    this.expansionTeamMap = new Map();
    if (typeof step2ResetState === 'function') step2ResetState();
    this.goToStep(2);
  },

  goToStep(n) {
    if (n < 1 || n > 3) return;
    if (n === 3 && !this.isStep3Unlocked()) return;

    const dir = n > this.currentStep ? 'fwd' : 'back';
    this.currentStep = n;
    this._renderNav();
    this._showStep(n, dir);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  isStep3Unlocked() {
    if (!this.step2State.confirmed) return false;
    const divs = this.step2State.divisions;
    if (!divs) return false;
    const allDivs = divs.leagues.flatMap(l => l.divisions);
    return !allDivs.some(d => d.teams.length < 2);
  },

  _renderNav() {
    const steps = [
      { n: 1, label: "Current MLB" },
      { n: 2, label: "Build" },
      { n: 3, label: "Share" },
    ];
    const nav = document.getElementById('step-nav');
    if (!nav) return;
    nav.innerHTML = steps.map(s => {
      const active = s.n === this.currentStep ? 'active' : '';
      const locked = s.n === 3 && !this.isStep3Unlocked() && s.n !== this.currentStep ? 'locked' : '';
      return `<button class="nav-step ${active} ${locked}" onclick="APP.goToStep(${s.n})" ${locked ? 'disabled' : ''}>
        <span class="nav-num">${s.n}</span>
        <span class="nav-label">${s.label}</span>
      </button>`;
    }).join('<span class="nav-arrow">›</span>');
  },

  _showStep(n, dir = 'fwd') {
    document.querySelectorAll('.step-section').forEach(el => {
      el.classList.remove('anim-fwd', 'anim-back');
      const active = el.dataset.step == n;
      el.style.display = active ? 'block' : 'none';
      if (active) {
        void el.offsetWidth;
        el.classList.add(`anim-${dir}`);
        el.addEventListener('animationend', () => el.classList.remove('anim-fwd', 'anim-back'), { once: true });
      }
    });
    if (n === 1) step1Show();
    if (n === 2) step2Show();
    if (n === 3) step3Show();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  APP.loadFromStorage();
  APP._renderNav();
  APP._showStep(1);
});
