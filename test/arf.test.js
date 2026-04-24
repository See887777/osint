import { test } from "node:test";
import assert from "node:assert/strict";

import {
  collapseNode,
  normalizeNodeDepths,
  initializeRoot,
  toggle,
} from "../src/tree-utils.js";

test("collapseNode collapses children recursively", () => {
  const tree = {
    name: "root",
    children: [
      {
        name: "child-1",
        children: [{ name: "grandchild-1", children: [{ name: "leaf" }] }],
      },
      { name: "child-2" },
    ],
  };

  collapseNode(tree);

  assert.strictEqual(tree.children, null);
  assert.ok(Array.isArray(tree._children));
  assert.strictEqual(tree._children[0].children, null);
  assert.ok(Array.isArray(tree._children[0]._children));
  assert.strictEqual(tree._children[0]._children[0].children, null);
  assert.ok(Array.isArray(tree._children[0]._children[0]._children));
});

test("collapseNode leaves nodes without children unchanged", () => {
  const node = { name: "leaf" };

  collapseNode(node);

  assert.deepEqual(node, { name: "leaf" });
});

test("normalizeNodeDepths applies spacing to each node depth", () => {
  const nodes = [{ depth: 0 }, { depth: 1 }, { depth: 3 }];

  normalizeNodeDepths(nodes, 120);

  assert.deepEqual(
    nodes.map((node) => node.y),
    [0, 120, 360],
  );
});

test("initializeRoot sets x0 and y0", () => {
  const root = { name: "root" };

  initializeRoot(root, 800);

  assert.strictEqual(root.x0, 400);
  assert.strictEqual(root.y0, 0);
});

test("initializeRoot computes midpoint for different heights", () => {
  const root = { name: "root" };

  initializeRoot(root, 650);

  assert.strictEqual(root.x0, 325);
  assert.strictEqual(root.y0, 0);
});

test("toggle collapses node with children", () => {
  const node = {
    children: [{ name: "child" }],
  };

  toggle(node);

  assert.strictEqual(node.children, null);
  assert.deepEqual(node._children, [{ name: "child" }]);
});

test("toggle expands node with hidden children", () => {
  const node = {
    _children: [{ name: "child" }],
  };

  toggle(node);

  assert.deepEqual(node.children, [{ name: "child" }]);
  assert.strictEqual(node._children, null);
});
