const TEAMS = [
  // AL East
  { id: "NYY", name: "New York Yankees",      lat: 41.73, lng: -75.13, league: "AL", division: "East",    mlbId: 147, primaryColor: "#132448", secondaryColor: "#C4CED4" },
  { id: "BOS", name: "Boston Red Sox",        lat: 42.35, lng: -71.10, league: "AL", division: "East",    mlbId: 111, primaryColor: "#0C2340", secondaryColor: "#BD3039" },
  { id: "TOR", name: "Toronto Blue Jays",     lat: 43.64, lng: -79.39, league: "AL", division: "East",    mlbId: 141, primaryColor: "#134A8E", secondaryColor: "#ffffff" },
  { id: "TB", name: "Tampa Bay Rays",         lat: 27.77, lng: -82.65, league: "AL", division: "East",    mlbId: 139, primaryColor: "#092C5C", secondaryColor: "#ffffff" },
  { id: "BAL", name: "Baltimore Orioles",     lat: 39.58, lng: -77.02, league: "AL", division: "East",    mlbId: 110, primaryColor: "#000000", secondaryColor: "#DF4601" },
  // AL Central
  { id: "CWS", name: "Chicago White Sox",     lat: 41.83, lng: -87.13, league: "AL", division: "Central", mlbId: 145, primaryColor: "#27251F", secondaryColor: "#C4CED4" },
  { id: "MIN", name: "Minnesota Twins",       lat: 44.98, lng: -93.28, league: "AL", division: "Central", mlbId: 142, primaryColor: "#002B5C", secondaryColor: "#D31145" },
  { id: "DET", name: "Detroit Tigers",        lat: 42.34, lng: -83.05, league: "AL", division: "Central", mlbId: 116, primaryColor: "#0C2340", secondaryColor: "#FA4616" },
  { id: "CLE", name: "Cleveland Guardians",   lat: 41.50, lng: -81.70, league: "AL", division: "Central", mlbId: 114, primaryColor: "#00385D", secondaryColor: "#E31937" },
  { id: "KC",  name: "Kansas City Royals",    lat: 39.05, lng: -94.48, league: "AL", division: "Central", mlbId: 118, primaryColor: "#004687", secondaryColor: "#ffffff" },
  // AL West
  { id: "HOU", name: "Houston Astros",        lat: 29.76, lng: -95.36, league: "AL", division: "West",    mlbId: 117, primaryColor: "#002D62", secondaryColor: "#EB6E1F" },
  { id: "OAK", name: "Athletics",             lat: null,  lng: null,   league: "AL", division: "West",    mlbId: 133, primaryColor: "#003831", secondaryColor: "#EFB21E" },
  { id: "LAA", name: "Los Angeles Angels",    lat: 34.35, lng: -116.88,league: "AL", division: "West",    mlbId: 108, primaryColor: "#BA0021", secondaryColor: "#ffffff" },
  { id: "SEA", name: "Seattle Mariners",      lat: 47.59, lng: -122.33,league: "AL", division: "West",    mlbId: 136, primaryColor: "#0C2C56", secondaryColor: "#005C5C" },
  { id: "TEX", name: "Texas Rangers",         lat: 32.75, lng: -97.08, league: "AL", division: "West",    mlbId: 140, primaryColor: "#003278", secondaryColor: "#C0111F" },
  // NL East
  { id: "ATL", name: "Atlanta Braves",        lat: 33.89, lng: -84.47, league: "NL", division: "East",    mlbId: 144, primaryColor: "#13274F", secondaryColor: "#CE1141" },
  { id: "NYM", name: "New York Mets",         lat: 40.61, lng: -73.35, league: "NL", division: "East",    mlbId: 121, primaryColor: "#002D72", secondaryColor: "#FF5910" },
  { id: "PHI", name: "Philadelphia Phillies", lat: 39.91, lng: -75.17, league: "NL", division: "East",    mlbId: 143, primaryColor: "#E81828", secondaryColor: "#ffffff" },
  { id: "WSH", name: "Washington Nationals",  lat: 38.27, lng: -76.21, league: "NL", division: "East",    mlbId: 120, primaryColor: "#AB0003", secondaryColor: "#ffffff" },
  { id: "MIA", name: "Miami Marlins",         lat: 25.78, lng: -80.22, league: "NL", division: "East",    mlbId: 146, primaryColor: "#00A3E0", secondaryColor: "#EF3340" },
  // NL Central
  { id: "CHC", name: "Chicago Cubs",          lat: 41.95, lng: -89.16, league: "NL", division: "Central", mlbId: 112, primaryColor: "#0E3386", secondaryColor: "#CC3433" },
  { id: "STL", name: "St. Louis Cardinals",   lat: 38.62, lng: -90.19, league: "NL", division: "Central", mlbId: 138, primaryColor: "#C41E3A", secondaryColor: "#ffffff" },
  { id: "MIL", name: "Milwaukee Brewers",     lat: 43.43, lng: -87.97, league: "NL", division: "Central", mlbId: 158, primaryColor: "#12284B", secondaryColor: "#FFC52F" },
  { id: "CIN", name: "Cincinnati Reds",       lat: 39.10, lng: -84.51, league: "NL", division: "Central", mlbId: 113, primaryColor: "#C6011F", secondaryColor: "#ffffff" },
  { id: "PIT", name: "Pittsburgh Pirates",    lat: 40.45, lng: -80.01, league: "NL", division: "Central", mlbId: 134, primaryColor: "#000000", secondaryColor: "#FDB827" },
  // NL West
  { id: "LAD", name: "Los Angeles Dodgers",   lat: 34.37, lng: -118.64,league: "NL", division: "West",    mlbId: 119, primaryColor: "#005A9C", secondaryColor: "#ffffff" },
  { id: "SF",  name: "San Francisco Giants",  lat:37.28,  lng: -122.39,league: "NL", division: "West",    mlbId: 137, primaryColor: "#27251F", secondaryColor: "#FD5A1E" },
  { id: "SD",  name: "San Diego Padres",      lat: 32.36, lng: -116.96,league: "NL", division: "West",    mlbId: 135, primaryColor: "#2F241D", secondaryColor: "#FFC425" },
  { id: "COL", name: "Colorado Rockies",      lat: 39.76, lng: -104.99,league: "NL", division: "West",    mlbId: 115, primaryColor: "#33006F", secondaryColor: "#C4CED4" },
  { id: "ARI", name: "Arizona Diamondbacks",  lat: 33.45, lng: -112.07,league: "NL", division: "West",    mlbId: 109, primaryColor: "#000000", secondaryColor: "#A71930" },
];

const RIVALRIES = [
  // In-Division
  { teams: ["NYY","BOS"],   inDivision: true  },
  { teams: ["NYY","BAL"],   inDivision: true  },
  { teams: ["NYY","TOR"],   inDivision: true  },
  { teams: ["BOS","TOR"],   inDivision: true  },
  { teams: ["BOS","TB"],    inDivision: true  },
  { teams: ["NYY","TB"],    inDivision: true  },
  { teams: ["MIN","CWS"],   inDivision: true  },
  { teams: ["MIN","CLE"],   inDivision: true  },
  { teams: ["DET","CLE"],   inDivision: true  },
  { teams: ["HOU","TEX"],   inDivision: true  },
  { teams: ["SEA","OAK"],   inDivision: true  },
  { teams: ["LAA","OAK"],   inDivision: true  },
  { teams: ["HOU","SEA"],   inDivision: true  },
  { teams: ["ATL","NYM"],   inDivision: true  },
  { teams: ["ATL","PHI"],   inDivision: true  },
  { teams: ["ATL","MIA"],   inDivision: true  },
  { teams: ["NYM","PHI"],   inDivision: true  },
  { teams: ["WSH","PHI"],   inDivision: true  },
  { teams: ["WSH","NYM"],   inDivision: true  },
  { teams: ["CHC","STL"],   inDivision: true  },
  { teams: ["CHC","MIL"],   inDivision: true  },
  { teams: ["STL","MIL"],   inDivision: true  },
  { teams: ["STL","CIN"],   inDivision: true  },
  { teams: ["STL","PIT"],   inDivision: true  },
  { teams: ["CIN","PIT"],   inDivision: true  },
  { teams: ["LAD","SF"],    inDivision: true  },
  { teams: ["LAD","SD"],    inDivision: true  },
  { teams: ["SF","SD"],     inDivision: true  },
  { teams: ["COL","ARI"],   inDivision: true  },
  { teams: ["COL","LAD"],   inDivision: true  },
  { teams: ["DET","CWS"],   inDivision: true  },
  { teams: ["LAA","TEX"],   inDivision: true  },
  { teams: ["ARI","LAD"],   inDivision: true  },
  // Cross-Division / Cross-League
  { teams: ["NYY","NYM"],   inDivision: false },
  { teams: ["CHC","CWS"],   inDivision: false },
  { teams: ["LAD","LAA"],   inDivision: false },
  { teams: ["SF","OAK"],    inDivision: false },
  { teams: ["STL","KC"],    inDivision: false },
  { teams: ["BAL","WSH"],   inDivision: false },
  { teams: ["MIA","TB"],    inDivision: false },
  { teams: ["PHI","PIT"],   inDivision: false },
  { teams: ["MIL","MIN"],   inDivision: false },
  { teams: ["CIN","CLE"],   inDivision: false },
  { teams: ["SD","SEA"],    inDivision: false },
  { teams: ["MIL","CWS"],   inDivision: false },
];

const EXPANSION_CITIES = [
  { id: "AUS", city: "Austin",          state: "TX", lat: 30.27, lng: -97.74  },
  { id: "BUF", city: "Buffalo",         state: "NY", lat: 42.59, lng: -78.49  },
  { id: "CHA", city: "Charlotte",       state: "NC", lat: 35.23, lng: -80.84  },
  { id: "MTL", city: "Montreal",        state: "QC", lat: 45.51, lng: -73.56  },
  { id: "NSH", city: "Nashville",       state: "TN", lat: 36.17, lng: -86.78  },
  { id: "ORL", city: "Orlando",         state: "FL", lat: 28.84, lng: -80.98  },
  { id: "POR", city: "Portland",        state: "OR", lat: 45.52, lng: -122.68 },
  { id: "RAL", city: "Raleigh",         state: "NC", lat: 35.78, lng: -78.64  },
  { id: "SAC", city: "Sacramento",      state: "CA", lat: 38.73, lng: -121.30 },
  { id: "UTA", city: "Salt Lake City",  state: "UT", lat: 40.76, lng: -111.89 },
  { id: "VAN", city: "Vancouver",       state: "BC", lat: 49.28, lng: -121.62 },
];

// Per-logo nudges inside the diamond. Keys are team IDs (uppercase).
// dx/dy = pixels to shift (positive = right/down), scale = multiplier on top of base 0.75.
// Only add entries for teams that need adjusting; omit the rest.
const LOGO_TWEAKS = {
  NYY: { dx: -1, dy: -1, scale: 1.0 },
  BOS: { dx: -1, dy: -2, scale: 1.0 },
  TOR: { dx: -1, dy: 3, scale: 1.2 },
  TB:  { dx: 0, dy: 0, scale: 0.9 },
  CWS:  { dx: -1, dy: 0, scale: 1.0 },
  MIN:  { dx: 0, dy: 2, scale: 1.0 },
  DET:  { dx: 0, dy: -1, scale: 1.1 },
  CLE:  { dx: 0, dy: 1, scale: 1.1 },
  KC:   { dx: 0, dy: 0, scale: 0.9 },
  HOU:  { dx: -3, dy: -3, scale: 1.2 },
  OAK:  { dx: -2, dy: -3, scale: 1.1 },
  LAA:  { dx: -3, dy: -3, scale: 1.1 },
  SEA:  { dx: -1, dy: -1, scale: 1.1 },
  TEX:  { dx: 2, dy: 2, scale: 1.0 },
  ATL:  { dx: -5, dy: -1, scale: 1.0 },
  NYM:  { dx: 1, dy: 1, scale: 1.1 },
  WSH:  { dx: -1, dy: 1, scale: 1.0 },
  MIA:  { dx: -2, dy: -2, scale: 1.1 },
  CHC:  { dx: 0, dy: 0, scale: 1.05 },
  STL:  { dx: -1, dy: -2, scale: 1.0 },
  MIL:  { dx: -1, dy: 1, scale: 1.05 },
  CIN:  { dx: -2, dy: 0, scale: 1.1 },
  PIT:  { dx: 1, dy: -1, scale: 1.0 },
  LAD:  { dx: 0, dy: -1, scale: 1.0 },
  SF:   { dx: 0, dy: -1, scale: 1.05 },
  SD:   { dx: -0.5, dy: -1, scale: 1.0 },
  COL:  { dx: -1, dy: 0, scale: 1.0 },
  ARI:  { dx: -4, dy: -1, scale: 1.0 },
};

const TOTAL_RIVALRIES = RIVALRIES.length;
const ORIG_IN_DIVISION_RIVALRIES = RIVALRIES.filter(r => r.inDivision).length;

function getAthleticsCoords(forStep2 = false) {
  if (forStep2 || new Date().getFullYear() >= 2028) {
    return { city: "Las Vegas", lat: 36.32, lng: -114.64 };
  }
  return { city: "Sacramento", lat: 38.73, lng: -121.00 };
}

function getTeamById(id) {
  return TEAMS.find(t => t.id === id) || (window.APP && window.APP.expansionTeamMap && window.APP.expansionTeamMap.get(id));
}

function getTeamRivals(teamId) {
  return RIVALRIES
    .filter(r => r.teams.includes(teamId))
    .map(r => ({ rivalry: r, rivalId: r.teams.find(id => id !== teamId) }))
    .filter(r => getTeamById(r.rivalId));
}
