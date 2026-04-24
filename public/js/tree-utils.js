(function (globalScope) {
  function collapseNode(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapseNode);
      d.children = null;
    }
  }

  function normalizeNodeDepths(nodes, spacing) {
    nodes.forEach(function (d) {
      d.y = d.depth * spacing;
    });
  }

  function initializeRoot(rootNode, canvasHeight) {
    rootNode.x0 = canvasHeight / 2;
    rootNode.y0 = 0;
  }

  function toggle(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
  }

  var api = {
    collapseNode: collapseNode,
    normalizeNodeDepths: normalizeNodeDepths,
    initializeRoot: initializeRoot,
    toggle: toggle,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    globalScope.arfTreeUtils = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
