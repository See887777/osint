export function collapseNode(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapseNode);
    d.children = null;
  }
}

export function normalizeNodeDepths(nodes, spacing) {
  nodes.forEach(function (d) {
    d.y = d.depth * spacing;
  });
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
