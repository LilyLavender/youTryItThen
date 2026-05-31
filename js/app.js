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

  confirmExpansionCities() {
    const cities = this.step2State.expansionCities;
    if (cities.length !== 2) return;

    this.expansionTeamMap.clear();
    cities.forEach((city, i) => {
      const expTeam = {
        id: `EXP${i + 1}`,
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
      };
      this.expansionTeamMap.set(expTeam.id, expTeam);
    });

    // Only reset divisions on the very first confirmation.
    // Changing cities later just updates expansion team info; division layout is preserved.
    if (!this.step2State.confirmed) {
      this.step2State.divisions = {
        AL: [
          { name: "AL 1", teams: [] },
          { name: "AL 2", teams: [] },
          { name: "AL 3", teams: [] },
          { name: "AL 4", teams: [] },
        ],
        NL: [
          { name: "NL 1", teams: [] },
          { name: "NL 2", teams: [] },
          { name: "NL 3", teams: [] },
          { name: "NL 4", teams: [] },
        ],
      };
    }

    this.step2State.confirmed = true;
    this.saveToStorage();
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
    } catch(e) {
      localStorage.removeItem('ytit');
    }
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
    const allDivs = [...divs.AL, ...divs.NL];
    return allDivs.every(d => d.teams.length === 4);
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
