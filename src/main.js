import * as d3 from "d3";
import { collapseNode, normalizeNodeDepths, toggle } from "./tree-utils.js";

let width,
  height,
  i = 0,
  duration = 750,
  root;

const tree = d3.tree();
const svg = d3.select("#body").append("svg");
const g = svg.append("g");
const tooltip = d3.select("#tooltip");

// Zoom setup
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 3])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);

function updateSize() {
  width = window.innerWidth;
  height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
}

window.addEventListener("resize", () => {
  updateSize();
  if (root) update(root);
});

updateSize();

d3.json("/arf.json").then((data) => {
  root = d3.hierarchy(data);
  root.x0 = height / 2;
  root.y0 = 0;

  if (root.children) {
    root.children.forEach(collapseNode);
  }

  update(root);
});

function update(source) {
  const nodes = tree(root).descendants().reverse();
  const links = tree(root).links();

  normalizeNodeDepths(nodes, 180);

  // Nodes
  const node = g.selectAll("g.node").data(nodes, (d) => d.id || (d.id = ++i));

  const nodeEnter = node
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
    .on("click", (event, d) => {
      toggle(d);
      update(d);
    });

  nodeEnter
    .append("circle")
    .attr("r", 1e-6)
    .style("fill", (d) => (d._children ? "black" : "var(--color-yellow)"));

  nodeEnter
    .append("a")
    .attr("target", "_blank")
    .attr("href", (d) => d.data.url || null)
    .append("text")
    .attr("x", (d) => (d.children || d._children ? -10 : 10))
    .attr("dy", ".35em")
    .attr("text-anchor", (d) => (d.children || d._children ? "end" : "start"))
    .text((d) => d.data.name)
    .style("fill-opacity", 1e-6);

  // Tooltip logic
  nodeEnter
    .on("mouseover", (event, d) => {
      if (d.data.description) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(d.data.description)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      }
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  const nodeUpdate = node
    .merge(nodeEnter)
    .transition()
    .duration(duration)
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  nodeUpdate
    .select("circle")
    .attr("r", 6)
    .style("fill", (d) => (d._children ? "black" : "var(--color-yellow)"));

  nodeUpdate.select("text").style("fill-opacity", 1);

  const nodeExit = node
    .exit()
    .transition()
    .duration(duration)
    .attr("transform", (d) => `translate(${source.y},${source.x})`)
    .remove();

  nodeExit.select("circle").attr("r", 1e-6);
  nodeExit.select("text").style("fill-opacity", 1e-6);

  // Links
  const link = g.selectAll("path.link").data(links, (d) => d.target.id);

  const linkEnter = link
    .enter()
    .insert("path", "g")
    .attr("class", "link")
    .attr("d", (d) => {
      const o = { x: source.x0, y: source.y0 };
      return d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)({ source: o, target: o });
    });

  link
    .merge(linkEnter)
    .transition()
    .duration(duration)
    .attr(
      "d",
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x),
    );

  link
    .exit()
    .transition()
    .duration(duration)
    .attr("d", (d) => {
      const o = { x: source.x, y: source.y };
      return d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)({ source: o, target: o });
    })
    .remove();

  nodes.forEach((d) => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Search Functionality
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

function performSearch() {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) return;

  // Reset highlights
  g.selectAll(".node").classed("node--highlighted", false);

  let matchFound = false;

  // Expand tree to find matches
  root.descendants().forEach((d) => {
    if (d.data.name && d.data.name.toLowerCase().includes(query)) {
      // Expand all parents
      let parent = d.parent;
      while (parent) {
        if (parent._children) {
          parent.children = parent._children;
          parent._children = null;
        }
        parent = parent.parent;
      }
      matchFound = true;
    }
  });

  if (matchFound) {
    update(root);
    // Highlight nodes
    setTimeout(() => {
      const matches = g
        .selectAll(".node")
        .filter(
          (d) => d.data.name && d.data.name.toLowerCase().includes(query),
        );
      matches.classed("node--highlighted", true);

      // Zoom to first match
      const firstMatch = matches.datum();
      if (firstMatch) {
        const transform = d3.zoomIdentity
          .translate(width / 2 - firstMatch.y, height / 2 - firstMatch.x)
          .scale(1.2);
        svg.transition().duration(750).call(zoom.transform, transform);
      }
    }, duration);
  }
}

searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});
