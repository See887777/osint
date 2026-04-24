# UI Refresh — Design

**Date:** 2026-04-24
**Scope:** `src/main.js`, `src/tree-utils.js`, `src/style.css`, `index.html`, `test/arf.test.js`

## Goal

The current UI is unusable: the d3 tree layout is never given a size, so all nodes end up stacked at x ∈ [0, 1] ("smushed together"). Additionally, the search bar is unwanted and the view never auto-fits to the expanded subtree. Fix layout, remove the search bar, add auto-fit zoom, and apply a visual refresh (still dark / coding-theme, softer palette).

## Out of scope

- Content/data changes to `public/arf.json`.
- Deploy pipeline, link-check workflow, CI tooling.
- Browser automation / e2e tests.
- Responsive / mobile-specific layout, light-mode, side-panel detail view. (Candidates for a future pass.)

## Section 1 — Scope & mechanical changes

### 1.1 Remove search UI

- `index.html` — delete the `#search-container` block (input + button).
- `src/style.css` — delete `#search-container`, `#search-input`, `#search-btn`, `#search-btn:hover`, and `.node--highlighted` rules.
- `src/main.js` — delete the search block (currently the last ~50 lines: `searchInput`, `searchBtn`, `performSearch`, listeners).

### 1.2 Fix tree layout (root cause of "smushed")

Replace `const tree = d3.tree();` with:

```js
const tree = d3.tree().nodeSize([ROW_GAP, COL_GAP]);
// starting values: ROW_GAP = 24, COL_GAP = 220
```

`nodeSize([y, x])` gives each node a fixed per-row pixel slot (`y`) and fixed horizontal step per depth level (`x`). This replaces the broken default + the manual `normalizeNodeDepths` step.

### 1.3 Remove redundant helper

- `src/tree-utils.js` — delete `normalizeNodeDepths` (superseded by `nodeSize`).
- `src/main.js` — remove the `normalizeNodeDepths` import and its call in `update()`.
- `test/arf.test.js` — remove the two `normalizeNodeDepths` tests and the import.

`collapseNode`, `toggle`, `initializeRoot` are kept and continue to be exported and tested.

## Section 2 — Auto-fit zoom

### 2.1 Behaviour

- Initial load, every expand/collapse, and window resize → compute bbox of visible nodes and fit it to the viewport with ~40px padding on all sides. Scale clamped by the existing `scaleExtent([0.1, 3])`.
- Transitions are animated (~400ms, d3 default easing) so the view flows rather than snaps.
- User wheel-zoom or drag-pan → enter **manual mode**. While in manual mode, expand/collapse does NOT re-fit; the user keeps control.
- Clicking a node (expand or collapse) → **exits manual mode** and re-fits. Rationale: the click is a deliberate "show me this" signal.
- Window resize → always re-fits (overrides manual mode). Rationale: a resize invalidates the previous fit, no sensible default is to leave a stale view.

### 2.2 Implementation sketch

```js
let manualMode = false;

function fitToView(animate = true) {
  const bbox = g.node().getBBox();
  if (!bbox.width || !bbox.height) return; // nothing visible yet
  const padding = 40;
  const k = Math.min(
    (width - padding * 2) / bbox.width,
    (height - padding * 2) / bbox.height,
  );
  const tx = width / 2 - (bbox.x + bbox.width / 2) * k;
  const ty = height / 2 - (bbox.y + bbox.height / 2) * k;
  const target = d3.zoomIdentity.translate(tx, ty).scale(k);
  const sel = animate ? svg.transition().duration(400) : svg;
  sel.call(zoom.transform, target);
}
```

Integration points:

- `zoom.on("zoom", (event) => { if (event.sourceEvent) manualMode = true; g.attr("transform", event.transform); });`
- End of `update()`: `if (!manualMode) fitToView();`
  - The fit runs **after** the node transitions so `getBBox()` measures the final layout. Simplest approach: wrap the fit in a `setTimeout(fitToView, duration)` — `duration` is the existing 750ms node transition. (Could also chain off a `transition.end()` promise; either is fine. `setTimeout` is less code.)
- Node click: `manualMode = false; toggle(d); update(d);` (reset before update so the fit fires inside `update`).
- Window resize: `manualMode = false; updateSize(); if (root) update(root);`.

### 2.3 Edge cases

- Initial render with only the root visible: bbox collapses to a point until the tree layout runs. Guard by returning early when `bbox.width === 0 || bbox.height === 0`; the first meaningful update (after initial `collapseNode` pass) will produce a valid box.
- Very deep expansion: horizontal extent could exceed the screen and force a tiny scale. `scaleExtent` floor of 0.1 keeps it bounded; users can always pan manually.

## Section 3 — Visual refresh

### 3.1 Palette

Replace the `:root` vars in `src/style.css`:

```css
--bg: #0d1117;
--bg-raised: #161b22;
--border: #30363d;
--fg: #c9d1d9;
--fg-dim: #8b949e;
--accent: #7ee787;
--accent-2: #f0b76d;
--link-visited: #a5d6ff;
```

Old variables (`--color-green`, `--color-yellow`, `--color-red`, `--color-darkgrey`, `--color-midgrey`, `--color-darkmode`, `--color-lightgrey`, `--color-wash`) are removed. Any reference outside `style.css` (Font Awesome colors in `index.html`) is re-pointed to the new names.

### 3.2 Typography

- Keep the JetBrains Mono Google Fonts import.
- Drop the Hack CDN import (redundant — JetBrains Mono is already loaded).
- Body font stack: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`.
- Node label text: 13px (was 12px), normal letter-spacing.

### 3.3 Element styling

- **Legend** — bottom-left card: `var(--bg-raised)` bg, 1px `var(--border)`, 12px padding, 8px radius, subtle shadow `0 4px 12px rgba(0,0,0,0.4)`. Icons stay; icon color `var(--accent-2)`.
- **Footer** — removed. Delete the `<div class="footer">` block from `index.html` and the `.footer` / `.gh` rules from `style.css`.
- **Tooltip** — `var(--bg-raised)` bg, `var(--border)`, `var(--fg)` text, 6px radius, shadow `0 4px 12px rgba(0,0,0,0.4)`, max-width 320px.
- **Node circle** — 6px radius (unchanged). Leaf nodes: filled `var(--accent)`. Expandable nodes: filled `var(--bg)`, stroked `var(--accent)` (the "has hidden children" visual). Hover: stroke `var(--accent-2)`, 1px extra radius via CSS transition.
- **Node text** — fill `var(--fg)`, hover `var(--accent)`.
- **Tree links (paths)** — stroke `var(--border)`, 1.5px width.
- **Anchors (text wrapped in `<a>`)** — `a { color: var(--accent-2); }`, `a:visited { color: var(--link-visited); }`, `a:hover { color: var(--accent); }`.
- **html / body** — remove the `color: lime` on `html, body` (it leaks into random spots); set body `color: var(--fg)`.

## Section 4 — Testing

- `pnpm test` (node's `node:test`) continues to run on `test/**`.
- Tests kept: `collapseNode` × 2, `toggle` × 2, `initializeRoot` × 2.
- Tests removed: `normalizeNodeDepths` × 2 (helper is gone).
- No new unit tests for `fitToView`, zoom transform math, or manual-mode tracking — these touch d3/DOM and are out of scope for this repo's test approach (no jsdom, no browser runner).
- Manual smoke test before merging (run locally with `pnpm dev`):
  1. Page loads, root sits centered and fits.
  2. Click a branch → smooth animated fit of the now-expanded tree.
  3. Expand several siblings at the same level → rows do not overlap.
  4. Drag-pan → view stays where you left it after the drag.
  5. Click to expand again → view snaps back to fit.
  6. Wheel-zoom → zoom works, subsequent expand does not override until a click.
  7. Resize browser → view re-fits.
  8. Hover a node with a description → tooltip appears with new styling.

## File change summary

| File                | Change                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`        | Remove `#search-container` block and `.footer` block. Keep the Font Awesome `<link>` — the legend still uses its icons.                                 |
| `src/style.css`     | Replace palette vars, restyle legend/tooltip/nodes/links/anchors per Section 3, remove search/footer/.gh/.node--highlighted rules, drop Hack `@import`. |
| `src/main.js`       | Use `d3.tree().nodeSize([24, 220])`, remove `normalizeNodeDepths` import/call, add `fitToView()` + `manualMode` logic, remove all search code.          |
| `src/tree-utils.js` | Remove `normalizeNodeDepths` export.                                                                                                                    |
| `test/arf.test.js`  | Remove `normalizeNodeDepths` import + 2 tests.                                                                                                          |

## Risks / open questions

- **Timing of `getBBox`** inside `update()`: tested shape is to call fit via `setTimeout(_, duration)` after the node transition. If animation tuning in the future shortens `duration`, the fit call matches it automatically because it reads the same constant.
- **Manual-mode UX**: one-way door until a click. If users report "I panned and now I'm lost and don't want to click anything," a future add is a "fit" keyboard shortcut (`f`). Not in scope now.
- **Starting values** `ROW_GAP = 24`, `COL_GAP = 220` are educated guesses; may need one tuning pass during the manual smoke test.
