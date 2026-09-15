// D3 map renderer. Call initMap(svgEl, width, height) to set up.
// Call renderMapTeams(teamsData) to draw markers.
// Call updateMapDivisions(divisions) to recolor division blobs.

const MAP_BLOB_ALPHA = 0.45;

function getMapLogoUrl(teamId) {
  return `img/logos/${teamId.toLowerCase()}.png`;
}

let _mapState = null;
let _mapInstanceCounter = 0;

// The three source geo files never change across steps/renders, so fetch them
// once and reuse the same promise everywhere initMap is called.
let _geoDataPromise = null;
function _loadGeoData() {
  if (!_geoDataPromise) {
    _geoDataPromise = Promise.all([
      d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
      d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json"),
      d3.json("https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_lakes.geojson").catch(() => null),
    ]);
  }
  return _geoDataPromise;
}

// Default framing: contiguous US with a little room above the 49th parallel.
// extraPoints (expansion-city {lat,lng} picks) push these corners outward only
// when a pick actually falls outside them, so a Charlotte/Austin-only roster
// looks exactly like it always has.
const NEAR_BOUNDS = { north: 50, south: 22, west: -125, east: -66.5 };
const FAR_MARGIN = 3; // degrees of breathing room around any far-flung pick

// Alaska/Hawaii aren't broken out as separate features in the land-50m source
// (it's one merged world landmass), so we classify each polygon piece by the
// rough location of its centroid instead. Good enough to separate two specific,
// far-apart regions from everything else.
// lng > -168 excludes the Aleutian chain (which stretches on past -180) —
// just the mainland body (plus Kodiak and other near-shore islands) is shown.
function _isAlaskaLngLat(lng, lat) { return lat > 50 && lng < -130 && lng > -168; }
function _isHawaiiLngLat(lng, lat) { return lat > 18 && lat < 23 && lng < -154 && lng > -161; }

// Splits a MultiPolygon/Polygon land feature into {matched, rest} by a
// (lng, lat) -> boolean predicate tested against each polygon's centroid.
function _splitLandByPredicate(land, predicate) {
  const geom = land && land.geometry;
  let polygons;
  if (!geom) polygons = [];
  else if (geom.type === 'MultiPolygon') polygons = geom.coordinates;
  else if (geom.type === 'Polygon') polygons = [geom.coordinates];
  else polygons = [];

  const matched = [], rest = [];
  polygons.forEach(polyCoords => {
    const feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: polyCoords } };
    const [lng, lat] = d3.geoCentroid(feature);
    (predicate(lng, lat) ? matched : rest).push(polyCoords);
  });
  return {
    matched: { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: matched } },
    rest: { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: rest } },
  };
}

// Anchorage/Honolulu are drawn at a "moved" position near the WA/CA coasts
// instead of their true, far-off location. Rather than an independent small
// projection (which renders in isolation from the main map's zoom/pan and
// never integrates with it), the whole classified landmass is translated in
// (lng, lat) space so it lands on this anchor, then drawn through the SAME
// main projection as everything else — so it scales, pans, and expands the
// map's fitted bounds exactly like any other far-off expansion city (e.g.
// San Juan). The approximate distortion this introduces (Albers isn't
// optimized for these regions) is expected and fine for a stylized inset.
// Both anchors push the map's fitted bounds out by exactly this much,
// regardless of where each one actually renders (its own lat/lng/scale below)
// — so the zoom level is identical whether Alaska, Hawaii, or both are
// selected, instead of each independently (and differently) widening the view.
const SHARED_FAR_BOUNDS_POINT = { lat: 34, lng: -128, margin: 0.5 };

const DISPLAY_ANCHORS = {
  // scale shrinks the landmass around its real reference point before the
  // shift is applied, so the reference point itself doesn't move. Real
  // mainland Alaska is roughly a fifth of the entire US by area, so drawn at
  // true (equal-area) scale next to CONUS it dominates the map and clips off
  // the edges — 0.55 keeps it recognizable but appropriately small. Hawaii's
  // real size already reads fine at true scale, so it's left at 1.
  ANC: { lat: 48, lng: -140, scale: 0.55, bounds: SHARED_FAR_BOUNDS_POINT },  // off the Washington coast
  HON: { lat: 34, lng: -128, scale: 1, bounds: SHARED_FAR_BOUNDS_POINT },     // off the California coast
};
function getDisplayAnchor(cityId) {
  return DISPLAY_ANCHORS[cityId] || null;
}
// The extraPoints entry to feed into _computeFitBounds for a given expansion
// city — its display anchor's shared bounds point if it has one, its real
// coordinates otherwise.
function cityDisplayPoint(city) {
  const anchor = getDisplayAnchor(city.id);
  if (!anchor) return { lat: city.lat, lng: city.lng };
  return anchor.bounds || null;
}

// Shrinks `feature` toward (refLng, refLat) by `scale`, then translates by
// (dLng, dLat) — a point exactly at (refLng, refLat) always lands at
// (refLng + dLng, refLat + dLat) regardless of scale, so the reference city's
// own marker position is unaffected by how much its landmass is shrunk.
function _shiftAndScaleGeometry(feature, refLng, refLat, dLng, dLat, scale = 1) {
  const transform = ([lng, lat]) => [refLng + (lng - refLng) * scale + dLng, refLat + (lat - refLat) * scale + dLat];
  const shiftRing = ring => ring.map(transform);
  const geom = feature.geometry;
  let coordinates;
  if (geom.type === 'MultiPolygon') coordinates = geom.coordinates.map(poly => poly.map(shiftRing));
  else if (geom.type === 'Polygon') coordinates = geom.coordinates.map(shiftRing);
  else coordinates = geom.coordinates;
  return { type: 'Feature', geometry: { type: geom.type, coordinates } };
}


function _computeFitBounds(extraPoints = []) {
  let { north, south, west, east } = NEAR_BOUNDS;
  extraPoints.forEach(p => {
    if (p == null || p.lat == null || p.lng == null) return;
    const margin = p.margin != null ? p.margin : FAR_MARGIN;
    north = Math.max(north, p.lat + margin);
    south = Math.min(south, p.lat - margin);
    west  = Math.min(west,  p.lng - margin);
    east  = Math.max(east,  p.lng + margin);
  });
  const expanded = north > NEAR_BOUNDS.north || south < NEAR_BOUNDS.south ||
                   west < NEAR_BOUNDS.west || east > NEAR_BOUNDS.east;
  return { north, south, west, east, expanded };
}

async function initMap(svgEl, width, height, zoomMult = 1.07, extraPoints = [], regionFlags = {}) {
  const maskId = `land-mask-${++_mapInstanceCounter}`;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const [topo, landTopo, lakesGeo] = await _loadGeoData();
  const countries = topojson.feature(topo, topo.objects.countries);
  const northAmerica = {
    type: "FeatureCollection",
    features: countries.features.filter(f => [840, 124, 484].includes(+f.id))
  };
  // land-50m's "land" object is a GeometryCollection (one big MultiPolygon
  // geometry inside), so topojson.feature() hands back a FeatureCollection —
  // unwrap to the single Feature so .geometry reads correctly below.
  const worldLand = topojson.feature(landTopo, landTopo.objects.land).features[0];
  // Hawaii is pulled out of the base landmass so it never shows at its true
  // (off-canvas) position; it's drawn as a separate inset below, only when
  // Honolulu is selected.
  const { matched: hawaiiLand, rest: land } = _splitLandByPredicate(worldLand, _isHawaiiLngLat);
  // Alaska can't be split out of `land` the same way: land-50m has no border
  // between Alaska and Yukon/BC, so mainland Alaska is fused into the same
  // polygon as the rest of the continent and a centroid-based split only ever
  // catches disconnected islands (Kodiak etc.), not the mainland body. Pull it
  // from the country-level USA polygon instead, which — being cut at the
  // Canada border — already isolates a correctly-shaped mainland Alaska.
  const usaFeature = countries.features.find(f => +f.id === 840);
  const { matched: alaskaLand } = _splitLandByPredicate(usaFeature, _isAlaskaLngLat);

  const projection = d3.geoAlbers()
    .rotate([96, 0])
    .parallels([29.5, 45.5]);

  // Fit to the four corners of the near (CONUS) box, expanded outward if any
  // expansion pick (Mexico, the Caribbean, or western/northern Canada) falls
  // outside it. Using MultiPoint lets d3 handle the Albers distortion correctly.
  const bounds = _computeFitBounds(extraPoints);
  const fitBounds = {
    type: "Feature",
    geometry: {
      type: "MultiPoint",
      coordinates: [
        [bounds.west, bounds.south], [bounds.east, bounds.south],
        [bounds.west, bounds.north], [bounds.east, bounds.north],
      ]
    }
  };
  projection.fitSize([width, height], fitBounds);
  // Scale up after the initial fit; shift up proportionally so Miami stays in frame.
  // Skip the extra crop once bounds already had to expand, or a far pick would
  // just get cropped straight back out.
  const effectiveZoomMult = bounds.expanded ? Math.min(zoomMult, 1.0) : zoomMult;
  projection.scale(projection.scale() * effectiveZoomMult);
  if (effectiveZoomMult > 1) {
    const [tx, ty] = projection.translate();
    projection.translate([tx, ty - Math.round(height * 0.04 * (effectiveZoomMult / 1.07))]);
  }

  const pathGen = d3.geoPath().projection(projection);

  const defs = svg.append("defs");

  // Mask: white = show land, black over lake areas = transparent holes.
  const GREAT_LAKES_NAMES = new Set(['Lake Superior', 'Lake Michigan', 'Lake Huron', 'Lake Erie', 'Lake Ontario']);
  let greatLakesGeo = null;
  if (lakesGeo) {
    greatLakesGeo = {
      type: 'FeatureCollection',
      features: lakesGeo.features.filter(f => f.properties && GREAT_LAKES_NAMES.has(f.properties.name)),
    };
  }

  const mask = defs.append("mask").attr("id", maskId);
  mask.append("rect")
    .attr("x", 0).attr("y", 0).attr("width", width).attr("height", height)
    .attr("fill", "white");
  if (greatLakesGeo) {
    mask.append("path").datum(greatLakesGeo).attr("d", pathGen).attr("fill", "black");
  }

  const mapGroup = svg.append("g").attr("class", "map-base");

  // Very faint water tint
  mapGroup.append("rect")
    .attr("x", 0).attr("y", 0).attr("width", width).attr("height", height)
    .attr("fill", "#ffffff").attr("fill-opacity", 0.0);

  // Land fill, masked to cut out Great Lakes (transparent SVG → page background shows through).
  mapGroup.append("path")
    .datum(land)
    .attr("d", pathGen)
    .attr("fill", "#e8e8e4")
    .attr("stroke", "none")
    .attr("mask", `url(#${maskId})`);

  // Interior borders only (shared edges between countries = US/Canada, US/Mexico land borders).
  // topojson.mesh with (a,b) => a !== b filters out coastlines entirely.
  const borderMesh = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
  mapGroup.append("path")
    .datum(borderMesh)
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "#b0b0b0")
    .attr("stroke-width", 0.8)
    .attr("mask", `url(#${maskId})`);

  // Alaska / Hawaii — drawn only when the matching expansion city is selected,
  // translated (and, for Alaska, shrunk) to a "moved" position off the WA/CA
  // coasts and rendered through the same main projection/pathGen as the rest
  // of the map (see _shiftAndScaleGeometry/DISPLAY_ANCHORS above). displayShift
  // lets renderMapTeams apply the same translation to the expansion marker
  // itself (markers aren't shrunk — scale is 0 at the reference point).
  const displayShift = {};
  if (regionFlags.showAlaska) {
    const real = EXPANSION_CITIES.find(c => c.id === 'ANC');
    const anchor = DISPLAY_ANCHORS.ANC;
    const dLng = anchor.lng - real.lng, dLat = anchor.lat - real.lat;
    mapGroup.append("path").datum(_shiftAndScaleGeometry(alaskaLand, real.lng, real.lat, dLng, dLat, anchor.scale))
      .attr("d", pathGen)
      .attr("fill", "#e8e8e4").attr("stroke", "#b0b0b0").attr("stroke-width", 0.8);
    displayShift.ANC = { dLng, dLat };
  }
  if (regionFlags.showHawaii) {
    const real = EXPANSION_CITIES.find(c => c.id === 'HON');
    const anchor = DISPLAY_ANCHORS.HON;
    const dLng = anchor.lng - real.lng, dLat = anchor.lat - real.lat;
    mapGroup.append("path").datum(_shiftAndScaleGeometry(hawaiiLand, real.lng, real.lat, dLng, dLat, anchor.scale))
      .attr("d", pathGen)
      .attr("fill", "#e8e8e4").attr("stroke", "#b0b0b0").attr("stroke-width", 0.8);
    displayShift.HON = { dLng, dLat };
  }

  const lakesGroup  = svg.append("g").attr("class", "lakes-layer");
  const blobGroup   = svg.append("g").attr("class", "blob-layer");
  const markerGroup = svg.append("g").attr("class", "marker-layer");
  const labelGroup  = svg.append("g").attr("class", "label-layer");

  // Render Great Lakes on top of division blobs using the wrapper's glass background
  // color so they look identical to the ocean (transparent/water) on all steps.
  // The land fill layer already masks out the lakes via #maskId; this covers the blobs.
  if (greatLakesGeo) {
    lakesGroup.append("path").datum(greatLakesGeo)
      .attr("d", pathGen)
      .attr("fill", "rgba(255,255,255,0.75)")
      .attr("stroke", "none");
  }

  const state = { svg, projection, pathGen, blobGroup, labelGroup, markerGroup, defs, width, height, displayShift };
  _mapState = state;
  return state;
}

function renderMapTeams(teamsWithDivisions, divisions, opts = {}) {
  if (!_mapState) return;
  const { projection, blobGroup, labelGroup, markerGroup, width, displayShift } = _mapState;

  const divColorMap = buildDivColorMap(divisions);

  let validTeams = teamsWithDivisions.filter(t => t.lat != null && t.lng != null);
  if (opts.hideUnassigned) {
    validTeams = validTeams.filter(t => !!getDivisionName(t.id, divisions));
  }
  const projected = validTeams.map(t => {
    // Anchorage/Honolulu's expansion team plots at its "moved" position (when
    // shown) instead of its real, far-off coordinates — see DISPLAY_ANCHORS.
    const shift = displayShift && t.expansionCityId && displayShift[t.expansionCityId];
    const lng = shift ? t.lng + shift.dLng : t.lng;
    const lat = shift ? t.lat + shift.dLat : t.lat;
    const [x, y] = projection([lng, lat]);
    return { team: t, x, y };
  });

  renderDivisionBlobs(projected, divColorMap, divisions);

  markerGroup.selectAll('*').remove();
  // Scale marker radius and image multiplier with map width.
  // At ~1300px (full page): MARKER_R≈21, imgMul=1.8 → image≈38px
  // At ~360px (right column): MARKER_R≈8, imgMul=1.2 → image≈10px
  const MARKER_R = width < 500
    ? Math.round(width * 0.036)
    : Math.max(20, Math.round(width * 0.016));
  const diamondR = width < 500 ? Math.round(width * 0.032) : MARKER_R;
  const diamondTextSize = Math.min(9, Math.max(5, Math.round(diamondR * 0.55)));
  const imgMul = 1.2 + Math.max(0, Math.min(1, (width - 360) / 940)) * 0.6;
  const imgSize = Math.round(MARKER_R * imgMul);

  // Real teams paint on top of expansion teams by default (hovering still
  // raises whichever marker is under the cursor via .raise() below).
  const paintOrder = [...projected].sort((a, b) => {
    const aReal = a.team.mlbId && !a.team.isExpansion;
    const bReal = b.team.mlbId && !b.team.isExpansion;
    return (aReal === bReal) ? 0 : (aReal ? 1 : -1);
  });

  paintOrder.forEach(({ team, x, y }) => {
    const g = markerGroup.append("g")
      .attr("class", "map-marker")
      .attr("transform", `translate(${x},${y})`)
      .attr("data-team-id", team.id)
      .style("cursor", "pointer");

    const hasCustomLogo = team.isExpansion && team.logo && (team.logo.light || team.logo.dark);
    if (team.mlbId && !team.isExpansion) {
      g.append("image")
        .attr("href", getMapLogoUrl(team.id))
        .attr("x", -imgSize / 2).attr("y", -imgSize / 2)
        .attr("width", imgSize).attr("height", imgSize);
    } else if (hasCustomLogo) {
      const tweak = team.logo.tweak || {};
      const sc = tweak.scale || 1;
      const dx = ((tweak.dx || 0) / 90) * imgSize;
      const dy = ((tweak.dy || 0) / 90) * imgSize;
      const logoSize = imgSize * sc;
      g.append("image")
        .attr("href", team.logo.dark || team.logo.light)
        .attr("x", -logoSize / 2 + dx).attr("y", -logoSize / 2 + dy)
        .attr("width", logoSize).attr("height", logoSize);
    } else {
      // Expansion team: keep diamond placeholder
      g.append("polygon")
        .attr("points", `0,${-diamondR} ${diamondR},0 0,${diamondR} ${-diamondR},0`)
        .attr("fill", team.primaryColor || '#888')
        .attr("stroke", team.secondaryColor || '#fff')
        .attr("stroke-width", 1.5);
      g.append("text")
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("fill", "#fff").attr("font-size", `${diamondTextSize}px`).attr("font-weight", "bold")
        .attr("font-family", "system-ui, -apple-system, sans-serif")
        .attr("transform", "translateY(1px)")
        .text(team.mapAbbr || (team.city ? team.city.slice(0, 3).toUpperCase() : team.id));
    }

    g.on("mouseenter", function(event) {
      d3.select(this).raise();
      showMapTooltip(event, team);
    }).on("mouseleave", hideMapTooltip);
  });
}

function renderDivisionBlobs(projected, divColorMap, divisions) {
  if (!_mapState) return;
  const { blobGroup, labelGroup, width, height } = _mapState;

  blobGroup.selectAll('*').remove();
  labelGroup.selectAll('*').remove();
  if (!projected.length) return;

  const divLeagueMap = new Map();
  if (divisions) {
    divisions.leagues.forEach(lg => {
      lg.divisions.forEach(d => divLeagueMap.set(d.name, lg.key));
    });
  }

  // Padding in pixels added outward from each convex hull edge
  const PAD = Math.round(width * 0.026);

  // Smooth closed-curve line generator
  const smooth = d3.line()
    .x(d => d[0]).y(d => d[1])
    .curve(d3.curveCatmullRomClosed.alpha(0.5));

  // Group projected points by division
  const divGroups = new Map();
  projected.forEach(pt => {
    const divName = getDivisionName(pt.team.id, divisions);
    if (!divName) return;
    if (!divGroups.has(divName)) divGroups.set(divName, { pts: [], color: null });
    const g = divGroups.get(divName);
    g.pts.push([pt.x, pt.y]);
    if (!g.color) g.color = divColorMap.get(pt.team.id);
  });

  divGroups.forEach(({ pts, color }, divName) => {
    const fill = color || 'rgba(128,128,128,0.2)';
    let pathStr;

    if (pts.length === 1) {
      pathStr = _blobCircle(pts[0][0], pts[0][1], PAD);
    } else {
      // Minkowski sum: convex hull of circles around each team guarantees
      // every team has a smooth circular buffer of radius PAD, no sharp edges.
      // Thinning removes near-collinear hull vertices so CatmullRom can create
      // round connecting curves instead of flat edges between teams.
      const CIRCLE_SAMPLES = 12;
      const circlePoints = [];
      pts.forEach(([px, py]) => {
        for (let i = 0; i < CIRCLE_SAMPLES; i++) {
          const angle = (i / CIRCLE_SAMPLES) * Math.PI * 2;
          circlePoints.push([px + Math.cos(angle) * PAD, py + Math.sin(angle) * PAD]);
        }
      });
      const hull = d3.polygonHull(circlePoints);
      if (hull) {
        pathStr = smooth(_thinHull(hull, 0.2));
      } else {
        pathStr = _blobCircle(pts[0][0], pts[0][1], PAD);
      }
    }

    blobGroup.append("path").attr("d", pathStr).attr("fill", fill).attr("stroke", "none");
  });

  // All team positions for clearance checking
  const allPts = projected.map(p => [p.x, p.y]);
  // Accumulated placed-label bboxes: [cx, cy, w, h] — used to avoid overlap.
  const placedLabels = [];

  divGroups.forEach(({ pts }, divName) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const labelFontSize = width < 500 ? 8 : 11;
    const [lx, ly] = _findBestLabelPos(allPts, cx, cy, width, height, placedLabels, divName, labelFontSize);
    const league = divLeagueMap.get(divName);
    const fill = league === 'AL' ? '#400000' : league === 'NL' ? '#000040' : 'rgba(20,20,20,0.82)';
    const bg = league === 'AL' ? 'rgba(255,220,220,0.7)' : league === 'NL' ? 'rgba(220,230,255,0.7)' : 'rgba(240,240,240,0.7)';
    const g = labelGroup.append("g").attr("transform", `translate(${lx},${ly})`);
    const txt = g.append("text")
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("font-size", `${labelFontSize}px`).attr("font-weight", "700")
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .attr("fill", fill).attr("letter-spacing", "0.3")
      .text(divName);
    // measure text for background pill
    const bbox = txt.node().getBBox();
    const PX = 5, PY = 2;
    g.insert("rect", "text")
      .attr("x", bbox.x - PX).attr("y", bbox.y - PY)
      .attr("width", bbox.width + PX * 2).attr("height", bbox.height + PY * 2)
      .attr("rx", 3).attr("fill", bg);
    placedLabels.push([lx, ly, bbox.width + PX * 2, bbox.height + PY * 2]);
  });
}

// Place label as close to (cx,cy) as possible without overlapping team logos
// or already-placed labels. Candidates are sorted closest-first; first clear
// position wins. Falls back to centroid if nothing clears.
function _findBestLabelPos(allPts, cx, cy, width, height, placedLabels = [], divName = '', fontSize = 11) {
  const SEARCH_R = Math.max(35, Math.round(width * 0.07));
  const candidates = [[cx, cy]];
  const DIRS = 16;
  for (let i = 0; i < DIRS; i++) {
    const angle = (i / DIRS) * Math.PI * 2;
    [0.3, 0.5, 0.7, 0.9, 1.1, 1.3].forEach(frac => {
      candidates.push([cx + Math.cos(angle) * SEARCH_R * frac, cy + Math.sin(angle) * SEARCH_R * frac]);
    });
  }
  const MARGIN = 18;
  const valid = candidates.filter(([x, y]) =>
    x >= MARGIN && x <= width - MARGIN && y >= MARGIN && y <= height - MARGIN
  );
  if (!valid.length) return [cx, cy];

  // Closest to centroid first
  valid.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));

  const estW = fontSize * 0.62 * divName.length + 14;
  const estH = fontSize * 1.6;
  const LOGO_CLEAR = Math.max(22, Math.round(width * 0.05));

  const clearOfAll = (x, y) => {
    if (allPts.some(([px, py]) => Math.hypot(x - px, y - py) < LOGO_CLEAR)) return false;
    return placedLabels.every(([lx, ly, lw, lh]) =>
      Math.abs(x - lx) >= (estW / 2 + lw / 2 + 3) ||
      Math.abs(y - ly) >= (estH / 2 + lh / 2 + 3)
    );
  };

  for (const [x, y] of valid) {
    if (clearOfAll(x, y)) return [x, y];
  }
  return [cx, cy];
}

function _blobCircle(cx, cy, r) {
  return `M${cx - r},${cy}A${r},${r},0,1,0,${cx + r},${cy}A${r},${r},0,1,0,${cx - r},${cy}Z`;
}

function _blobCapsule([x1, y1], [x2, y2], r) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = (-dy / len) * r, py = (dx / len) * r;
  return [[x1 + px, y1 + py], [x2 + px, y2 + py], [x2 - px, y2 - py], [x1 - px, y1 - py]];
}

// Remove hull vertices whose turn angle is below minAngle (radians) so that
// CatmullRom has fewer points on flat edge sections and produces rounder curves.
// Arc-peak vertices (≈30° turns for 12 circle samples) are always kept.
function _thinHull(hull, minAngle = 0.2) {
  if (hull.length <= 3) return hull;
  const n = hull.length;
  const result = [];
  for (let i = 0; i < n; i++) {
    const [px, py] = hull[(i - 1 + n) % n];
    const [cx, cy] = hull[i];
    const [nx, ny] = hull[(i + 1) % n];
    const d1x = cx - px, d1y = cy - py;
    const d2x = nx - cx, d2y = ny - cy;
    const len1 = Math.hypot(d1x, d1y) || 1;
    const len2 = Math.hypot(d2x, d2y) || 1;
    const dot = (d1x * d2x + d1y * d2y) / (len1 * len2);
    if (Math.acos(Math.min(1, Math.max(-1, dot))) > minAngle) result.push([cx, cy]);
  }
  return result.length >= 3 ? result : hull;
}

// Anchorage/Honolulu are the only expansion cities that unlock a map inset
// (their real locations, AK and HI, are otherwise hidden — see initMap).
function getRegionFlags(expansionCities) {
  return {
    showAlaska: expansionCities.some(c => c.id === 'ANC'),
    showHawaii: expansionCities.some(c => c.id === 'HON'),
  };
}

function updateMapDivisions(divisions, opts = {}) {
  if (!_mapState) return;
  const allTeams = buildTeamsForMap(divisions);
  renderMapTeams(allTeams, divisions, opts);
}

function buildTeamsForMap(divisions) {
  const result = [];
  const athCoords = getAthleticsCoords(!!divisions);
  TEAMS.forEach(t => {
    if (t.id === 'ATH') {
      result.push({ ...t, lat: athCoords.lat, lng: athCoords.lng, city: athCoords.city });
    } else {
      result.push(t);
    }
  });
  // divisions=null means step 1 - never show expansion teams there.
  // divisions provided means step 2 - always show all expansion teams.
  if (APP.expansionTeamMap && divisions) {
    APP.expansionTeamMap.forEach(exp => result.push(exp));
  }

  return result;
}

function buildDivColorMap(divisions) {
  const map = new Map();
  if (!divisions) return map;
  divisions.leagues.forEach(lg => {
    const shades = generateDivisionShades(lg.key, lg.divisions.length);
    lg.divisions.forEach((div, idx) => {
      const color = hexToRgba(getDivisionColor(div, shades, idx), MAP_BLOB_ALPHA);
      div.teams.forEach(id => map.set(id, color));
    });
  });
  return map;
}

function getDivisionName(teamId, divisions) {
  if (!divisions) return null;
  for (const lg of divisions.leagues) {
    for (const div of lg.divisions) {
      if (div.teams.includes(teamId)) return div.name;
    }
  }
  return null;
}

let _mapTip = null;
function showMapTooltip(event, team) {
  hideMapTooltip();
  const tip = document.createElement('div');
  tip.className = 'map-tooltip';
  tip.textContent = team.name || team.city;
  document.body.appendChild(tip);
  _mapTip = tip;

  const margin = 10;
  const tipWidth = tip.offsetWidth;
  let left = event.pageX + margin;
  if (left + tipWidth > window.scrollX + document.documentElement.clientWidth - margin) {
    left = event.pageX - margin - tipWidth;
  }
  tip.style.left = left + 'px';
  tip.style.top  = (event.pageY - 30) + 'px';
}
function hideMapTooltip() {
  if (_mapTip) { _mapTip.remove(); _mapTip = null; }
}

// Build step-1 divisions object from TEAMS static data
function buildStep1Divisions() {
  const order = ['East', 'Central', 'West'];
  const leagues = ['AL', 'NL'].map(league => ({
    key: league,
    label: league === 'AL' ? 'American League' : 'National League',
    divisions: order.map(divName => ({
      name: `${league} ${divName}`,
      teams: TEAMS.filter(t => t.league === league && t.division === divName).map(t => t.id),
    })),
  }));
  return { leagueMode: 'split', leagues };
}
