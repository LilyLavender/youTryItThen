# #YouTryItThen

A static single-page app for redesigning MLB divisions. Pick 2 expansion cities, drag all 32 teams into 8 new divisions, and export your result.

\> **[Live demo](https://lilylavender.github.io/youTryItThen/)** \<

## How it works

1. **Step 1** - Browse the current 30-team MLB layout on a grid and map
2. **Step 2** - Choose 2 expansion cities, then drag teams into 8 new divisions; live metrics track rivalry preservation and league switches
3. **Step 3** - Export and share your realignment

## Tech

Vanilla HTML/CSS/JS. No backend.

- [D3 v7](https://d3js.org/) + [TopoJSON](https://github.com/topojson/topojson) for the US map and Voronoi division coloring
- [SortableJS](https://sortablejs.github.io/Sortable/) for drag-and-drop
- [html2canvas](https://html2canvas.hertogen.es/) for PNG export
