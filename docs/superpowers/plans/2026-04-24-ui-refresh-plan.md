# UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken "smushed" d3 tree UI with a navigable, animated auto-fitting view; remove the search bar and footer; apply a softer dark visual refresh.

**Architecture:** Keep the static Vite single-page app with the same entry points (`index.html` → `src/main.js`). Fix the core layout bug by giving `d3.tree()` a `nodeSize`, add a `fitToView()` helper driven off SVG `getBBox()` plus a `manualMode` flag tracked in the zoom handler, and update styles inline in `src/style.css`. No new dependencies. No new tests (DOM/d3 logic is covered by the spec's manual smoke test; existing `node:test` suite stays green throughout).

**Tech Stack:** Vite 8, d3 v7, vanilla ES modules, pnpm, `node:test`, Trunk (format / lint).

**Spec:** `docs/superpowers/specs/2026-04-24-ui-refresh-design.md`

---

## File Map

| File                | Role after refresh                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `index.html`        | Page shell — no search UI, no footer, keeps Font Awesome link + legend + tree container + tooltip div.                |
| `src/main.js`       | Entry module — d3 setup, `update()`, `fitToView()`, `manualMode` tracking, zoom/resize/click wiring. No search logic. |
| `src/tree-utils.js` | Pure helpers — `collapseNode`, `toggle`, `initializeRoot` only. (`normalizeNodeDepths` removed.)                      |
| `src/style.css`     | New palette vars, updated element styling, no search/footer rules, no Hack `@import`.                                 |
| `test/arf.test.js`  | Six unit tests — `collapseNode` × 2, `toggle` × 2, `initializeRoot` × 2.                                              |

---

## Task 1: Remove `normalizeNodeDepths` helper

Delete the helper that will be replaced by d3's `nodeSize`. Do this first so later layout edits don't trip over a leftover call site.

**Files:**

- Modify: `test/arf.test.js`
- Modify: `src/tree-utils.js`
- Modify: `src/main.js`

- [ ] **Step 1.1: Delete the `normalizeNodeDepths` tests**

Remove the import of `normalizeNodeDepths` from `test/arf.test.js` and delete the two tests that reference it (`"normalizeNodeDepths applies spacing to each node depth"` and any other). The final import should be:

```js
import { collapseNode, initializeRoot, toggle } from "../src/tree-utils.js";
```

and the file should contain exactly six `test(...)` blocks covering `collapseNode` (×2), `toggle` (×2), `initializeRoot` (×2).

- [ ] **Step 1.2: Run the test suite — it must still pass**

```bash
pnpm test
```

Expected: 6 tests pass, 0 fail. (Running `pnpm test` with the old helper still in `tree-utils.js` — just fewer tests importing it — is intentionally safe: nothing is broken yet.)

- [ ] **Step 1.3: Delete the helper from `src/tree-utils.js`**

Remove the `normalizeNodeDepths` export. Final file content:

```js
export function collapseNode(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapseNode);
    d.children = null;
  }
}

export function initializeRoot(rootNode, canvasHeight) {
  rootNode.x0 = canvasHeight / 2;
  rootNode.y0 = 0;
}

export function toggle(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}
```

- [ ] **Step 1.4: Remove the import and call from `src/main.js`**

In `src/main.js`, change the import block near the top:

```js
import { collapseNode, toggle } from "./tree-utils.js";
```

and delete the line inside `update()` that calls the helper:

```js
normalizeNodeDepths(nodes, 180); // <-- delete this line
```

- [ ] **Step 1.5: Run the test suite again**

```bash
pnpm test
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 1.6: Commit**

```bash
git add src/tree-utils.js src/main.js test/arf.test.js
git commit -m "refactor: drop normalizeNodeDepths helper (replaced by d3 nodeSize)"
```

---

## Task 2: Remove the search UI

Pure deletion across three files. No behaviour depends on it.

**Files:**

- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.js`

- [ ] **Step 2.1: Remove the search block from `index.html`**

Delete the following block (currently the first child of `<body>`):

```html
<div id="search-container">
  <input type="text" id="search-input" placeholder="Search for tools..." />
  <button id="search-btn"><i class="fas fa-search"></i></button>
</div>
```

- [ ] **Step 2.2: Remove search CSS rules from `src/style.css`**

Delete these rule blocks in their entirety: `#search-container`, `#search-input`, `#search-btn`, `#search-btn:hover`, and `.node--highlighted circle`.

- [ ] **Step 2.3: Remove search logic from `src/main.js`**

Delete the entire trailing section under `// Search Functionality`:

```js
// Search Functionality
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

function performSearch() {
  /* ... */
}

searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});
```

The file should end at the closing brace of the `update` function plus no trailing dead code.

- [ ] **Step 2.4: Confirm the dev server still loads**

```bash
pnpm dev
```

Open the printed URL in a browser. Expected: page renders (tree will still be "smushed" — that's Task 3). No console errors about `null`/undefined `searchBtn`/`searchInput`. Stop the dev server (Ctrl+C).

- [ ] **Step 2.5: Run tests**

```bash
pnpm test
```

Expected: 6 tests pass.

- [ ] **Step 2.6: Commit**

```bash
git add index.html src/style.css src/main.js
git commit -m "feat: remove search UI"
```

---

## Task 3: Fix tree layout with `nodeSize`

The single most important functional fix — stops nodes stacking on a single pixel.

**Files:**

- Modify: `src/main.js`

- [ ] **Step 3.1: Give the tree a per-node pixel size**

Find in `src/main.js`:

```js
const tree = d3.tree();
```

Replace with:

```js
const tree = d3.tree().nodeSize([24, 220]);
```

(`nodeSize([rowGap, colGap])`: 24px between sibling rows, 220px between depth levels. These are starting values; Task 8 tunes if needed.)

- [ ] **Step 3.2: Verify visually**

```bash
pnpm dev
```

Open the printed URL. Expected:

- Root node is visible (probably top-left-ish since no auto-fit yet).
- Clicking the root expands the first level and children are now separated vertically instead of stacked on one pixel.
- Expanding a deeper branch shows readable labels with no overlap between siblings.

The tree will run off-screen in some directions — that is Task 4's job. Stop the dev server.

- [ ] **Step 3.3: Run tests**

```bash
pnpm test
```

Expected: 6 tests pass.

- [ ] **Step 3.4: Commit**

```bash
git add src/main.js
git commit -m "fix: give d3 tree a nodeSize so nodes no longer stack on a single pixel"
```

---

## Task 4: Add auto-fit zoom + manual-mode tracking

Make the view auto-fit on expand/collapse/resize, and pause auto-fit when the user manually pans/zooms until their next click.

**Files:**

- Modify: `src/main.js`

- [ ] **Step 4.1: Add `manualMode` state and tweak the zoom handler**

Near the top of `src/main.js`, just after the `let width, height, i = 0, duration = 750, root;` line, add:

```js
let manualMode = false;
```

Then replace the existing zoom setup block:

```js
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 3])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });
```

with:

```js
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 3])
  .on("zoom", (event) => {
    if (event.sourceEvent) manualMode = true;
    g.attr("transform", event.transform);
  });
```

`event.sourceEvent` is non-null only when a real DOM event drove the zoom (wheel, drag). Programmatic `zoom.transform` calls (our auto-fit below) leave `sourceEvent` null, so they do not set `manualMode`.

- [ ] **Step 4.2: Add the `fitToView` helper**

Add this function above `function update(source) {` in `src/main.js`:

```js
function fitToView(animate = true) {
  const bbox = g.node().getBBox();
  if (!bbox.width || !bbox.height) return;
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

- [ ] **Step 4.3: Hook auto-fit into the end of `update()`**

At the very bottom of `function update(source) { ... }`, just after the existing `nodes.forEach((d) => { d.x0 = d.x; d.y0 = d.y; });`, add:

```js
if (!manualMode) {
  setTimeout(() => fitToView(true), duration);
}
```

This waits for the d3 node transitions to finish (they use the same `duration = 750ms` constant) so `getBBox()` reads the final layout.

- [ ] **Step 4.4: Reset `manualMode` on node click**

Find the node click handler inside `update()`:

```js
.on("click", (event, d) => {
  toggle(d);
  update(d);
});
```

Replace with:

```js
.on("click", (event, d) => {
  manualMode = false;
  toggle(d);
  update(d);
});
```

- [ ] **Step 4.5: Reset `manualMode` on window resize**

Find near the top of `src/main.js`:

```js
window.addEventListener("resize", () => {
  updateSize();
  if (root) update(root);
});
```

Replace with:

```js
window.addEventListener("resize", () => {
  manualMode = false;
  updateSize();
  if (root) update(root);
});
```

- [ ] **Step 4.6: Verify visually**

```bash
pnpm dev
```

Run through these checks in the browser:

1. Reload — after the initial expand/collapse pass the tree fits to the viewport (smooth fade/move after ~750ms delay).
2. Click a branch — animated fit re-centers on the now-expanded tree.
3. Drag-pan with mouse — view stays where you left it; next expand click re-fits.
4. Wheel-zoom — zoom works; subsequent expand does NOT snap back until a click.
5. Resize window — re-fits immediately.

Stop the dev server.

- [ ] **Step 4.7: Run tests**

```bash
pnpm test
```

Expected: 6 tests pass.

- [ ] **Step 4.8: Commit**

```bash
git add src/main.js
git commit -m "feat: auto-fit zoom with manual-pan pause"
```

---

## Task 5: Remove the footer

**Files:**

- Modify: `index.html`
- Modify: `src/style.css`

- [ ] **Step 5.1: Remove the footer block from `index.html`**

Delete:

```html
<div class="footer" align="middle">
  <p align="center">
    <a class="gh" href="https://github.com/ss-o">ss-o</a>
  </p>
</div>
```

- [ ] **Step 5.2: Remove footer CSS rules from `src/style.css`**

Delete the `.footer { ... }` rule block and the `.gh { ... }` rule block.

- [ ] **Step 5.3: Run tests and smoke-check**

```bash
pnpm test
```

Expected: 6 tests pass.

```bash
pnpm dev
```

Expected: page renders, no footer at bottom, no layout shift. Stop the server.

- [ ] **Step 5.4: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: remove footer"
```

---

## Task 6: Visual refresh — palette & typography

Swap the color palette vars and drop the Hack `@import`. Update Font Awesome icon colors in `index.html` to point at the new vars.

**Files:**

- Modify: `src/style.css`
- Modify: `index.html`

- [ ] **Step 6.1: Replace the palette vars in `src/style.css`**

Find the existing `:root { ... }` block and replace its contents with:

```css
:root {
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --bg: #0d1117;
  --bg-raised: #161b22;
  --border: #30363d;
  --fg: #c9d1d9;
  --fg-dim: #8b949e;
  --accent: #7ee787;
  --accent-2: #f0b76d;
  --link-visited: #a5d6ff;
}
```

(The old `--font-sans-serif` and `--font-serif` vars are unused anywhere in the codebase and go away with the old palette vars.)

- [ ] **Step 6.2: Drop the Hack CDN import**

At the top of `src/style.css`, remove:

```css
@import url("https://cdn.jsdelivr.net/gh/ss-o/fonts@main/Hack/v3.003/web/hack.css");
```

Keep the JetBrains Mono import.

- [ ] **Step 6.3: Update the base `html, body` and `body` rules**

Replace the existing `html, body { ... }` block with:

```css
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: var(--font-mono);
  font-weight: 400;
  color: var(--fg);
  background-color: var(--bg);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Delete the trailing `body { font-family: Hack, monospace; }` rule entirely (the `html, body` rule above now covers it).

- [ ] **Step 6.4: Re-point Font Awesome icon colors in `index.html`**

In the legend block inside `index.html`, every occurrence of `style="color: var(--color-yellow);"` becomes `style="color: var(--accent-2);"`. There are four such inline styles (Google, users, link, tools icons). Use a find/replace across the file. After the change, `grep color: var(--color-yellow) index.html` should return nothing.

- [ ] **Step 6.5: Re-point node circle fills in `src/main.js`**

`src/main.js` currently sets inline circle fills that reference the removed `--color-yellow` var. Find the two occurrences (one on `nodeEnter.append("circle")` and one on `nodeUpdate.select("circle")`):

```js
.style("fill", (d) => (d._children ? "black" : "var(--color-yellow)"));
```

Replace both with:

```js
.style("fill", (d) => (d._children ? "var(--bg)" : "var(--accent)"));
```

This matches the spec's rule: expandable nodes filled with the background color (so the stroke-only ring is visible), leaves filled with the accent green.

After the change, `grep -n "color-yellow" src/main.js` should return nothing.

- [ ] **Step 6.6: Run tests and smoke-check**

```bash
pnpm test
```

Expected: 6 tests pass.

```bash
pnpm dev
```

Expected: page background is GitHub-dark near-black (#0d1117), text is off-white (#c9d1d9), legend icons are warm gold, node circles fill correctly (leaves in soft green, expandable branches as hollow rings). Tree link/text/tooltip styling may still look old — Task 7 handles those. Stop the server.

- [ ] **Step 6.7: Commit**

```bash
git add src/style.css src/main.js index.html
git commit -m "style: swap to softer dark palette and JetBrains Mono"
```

---

## Task 7: Visual refresh — element styling

Restyle legend, tooltip, nodes, tree links, and anchors with the new palette.

**Files:**

- Modify: `src/style.css`

- [ ] **Step 7.1: Restyle the legend**

Replace the existing `.legend { ... }` block with:

```css
.legend {
  font-size: 11px;
  line-height: 1.4;
  font-weight: 500;
  color: var(--fg-dim);
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  padding: 12px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
```

- [ ] **Step 7.2: Restyle the node circles and text**

Replace the existing `.node circle { ... }` and `.node text { ... }` blocks with:

```css
.node {
  cursor: pointer;
}

.node circle {
  fill: var(--accent);
  stroke: var(--accent);
  stroke-width: 1.5px;
  transition:
    r 120ms ease,
    stroke 120ms ease;
}

.node:hover circle {
  stroke: var(--accent-2);
}

.node text {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--fg);
  stroke: none;
}

.node:hover text {
  fill: var(--accent);
}
```

Note: Task 6 already updated the inline `fill` in `src/main.js` — expandable branches use `var(--bg)` (hollow ring), leaves use `var(--accent)` (filled dot). The CSS `.node:hover circle` rule applies its stroke color change on top of the inline fill without fighting it.

- [ ] **Step 7.3: Restyle the tree links (edges)**

Replace the existing `path.link { ... }` block with:

```css
path.link {
  fill: none;
  stroke: var(--border);
  stroke-width: 1.5px;
}
```

- [ ] **Step 7.4: Restyle the tooltip**

Replace the existing `.tooltip { ... }` block with:

```css
.tooltip {
  position: absolute;
  text-align: left;
  padding: 10px 12px;
  font: 12px var(--font-mono);
  background: var(--bg-raised);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  pointer-events: none;
  z-index: 20;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  max-width: 320px;
  word-wrap: break-word;
}
```

- [ ] **Step 7.5: Restyle anchors**

Replace the existing `a:link { ... }`, `a:visited { ... }`, `a:hover { ... }` blocks with:

```css
a {
  color: var(--accent-2);
  text-decoration: none;
}

a:visited {
  color: var(--link-visited);
}

a:hover {
  color: var(--accent);
}
```

- [ ] **Step 7.6: Run tests and smoke-check**

```bash
pnpm test
```

Expected: 6 tests pass.

```bash
pnpm dev
```

Expected:

- Nodes: softer green filled circles for leaves, black-filled + green-stroke for expandable branches, gold stroke on hover.
- Tree links: muted grey, recede behind text.
- Text: off-white, highlights green on hover.
- Anchors: gold (unvisited) / cool blue (visited) / green (hover).
- Tooltip: raised-card style, readable.

Stop the server.

- [ ] **Step 7.7: Commit**

```bash
git add src/style.css
git commit -m "style: refresh node, link, tooltip, legend, and anchor styling"
```

---

## Task 8: Manual smoke test and tuning

No code changes expected unless something in the walkthrough below looks wrong.

**Files:**

- (Possibly modify) `src/main.js` — `ROW_GAP` / `COL_GAP` if tuning is needed.

- [ ] **Step 8.1: Full manual walkthrough**

```bash
pnpm dev
```

Open the URL and verify all 8 points from the spec's Section 4:

1. Page loads, root sits centered and fits.
2. Click a branch → smooth animated fit of the now-expanded tree.
3. Expand several siblings at the same level → rows do not overlap.
4. Drag-pan → view stays where you left it after the drag.
5. Click to expand again → view snaps back to fit.
6. Wheel-zoom → zoom works, subsequent expand does not override until a click.
7. Resize browser → view re-fits.
8. Hover a node with a description → tooltip appears with new styling.

- [ ] **Step 8.2: Tune spacing if needed**

If row 3 shows overlap at dense levels, bump `ROW_GAP` (first value) in `src/main.js`:

```js
const tree = d3.tree().nodeSize([24, 220]);
```

Try `[28, 220]` or `[32, 240]`. Stop/start the dev server to see the change. When it looks right, commit:

```bash
git add src/main.js
git commit -m "tune: adjust tree spacing after smoke test"
```

If no tuning is needed, skip this step.

- [ ] **Step 8.3: Final `pnpm check` and `pnpm test`**

```bash
pnpm check
pnpm test
```

Expected: `trunk check` passes (or only pre-existing warnings unrelated to this change), `pnpm test` reports 6 tests pass.

- [ ] **Step 8.4: Done**

No further commits. The branch now contains:

- removed `normalizeNodeDepths`
- removed search UI
- fixed layout
- auto-fit zoom
- removed footer
- new palette + typography
- restyled elements
- (optional) tuned spacing

---

## Execution notes

- **Test strategy:** No new unit tests are added for the visual/zoom pieces — the spec explicitly puts those out of scope (no DOM test harness in this repo). After every code-changing task, run `pnpm test` to confirm the six unit tests still pass, plus a manual `pnpm dev` check.
- **Commit cadence:** every task ends with a commit. If a task's smoke check fails, fix inside the task — do not move on with a broken build.
- **Dependencies:** none added.
- **Don't skip pre-commit hooks.** Trunk is wired to `trunk-fmt-pre-commit` and `trunk-check-pre-push`. If a hook fails, fix the underlying issue.
