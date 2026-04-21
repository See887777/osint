const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collapseNode,
  normalizeNodeDepths,
  initializeRoot,
  toggle,
} = require("../public/js/arf");

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

  assert.equal(tree.children, null);
  assert.equal(Array.isArray(tree._children), true);
  assert.equal(tree._children[0].children, null);
  assert.equal(Array.isArray(tree._children[0]._children), true);
  assert.equal(tree._children[0]._children[0].children, null);
  assert.equal(Array.isArray(tree._children[0]._children[0]._children), true);
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

  assert.equal(root.x0, 400);
  assert.equal(root.y0, 0);
});

test("toggle collapses node with children", () => {
  const node = {
    children: [{ name: "child" }],
  };

  toggle(node);

  assert.equal(node.children, null);
  assert.deepEqual(node._children, [{ name: "child" }]);
});

test("toggle expands node with hidden children", () => {
  const node = {
    _children: [{ name: "child" }],
  };

  toggle(node);

  assert.deepEqual(node.children, [{ name: "child" }]);
  assert.equal(node._children, null);
});
