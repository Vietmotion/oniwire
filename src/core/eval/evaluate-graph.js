const { validateScene } = require("../scene/schema");

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeNode(node) {
  const params = node && node.params ? node.params : {};

  return {
    id: String(node.id),
    kind: String(node.type || "Unknown"),
    transform: {
      x: toNumber(params.x, 0),
      y: toNumber(params.y, 0),
      scaleX: toNumber(params.scale, 1),
      scaleY: toNumber(params.scale, 1),
      rotation: toNumber(params.rot, 0)
    },
    bounds: {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    },
    opacity: Math.max(0, Math.min(1, toNumber(params.opacity, 100) / 100)),
    blend: String(params.blend || "normal"),
    props: { ...params }
  };
}

function getSortedNodes(project) {
  const nodes = Array.isArray(project.nodes) ? [...project.nodes] : [];

  // Deterministic order for stable frame output and snapshots.
  nodes.sort((a, b) => {
    const ai = Number(a && a.id);
    const bi = Number(b && b.id);

    if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
    return String(a && a.id).localeCompare(String(b && b.id));
  });

  return nodes;
}

function evaluateGraphToScene(options) {
  const project = options && options.project ? options.project : {};
  const output = options && options.output ? options.output : {};

  const timeSec = Math.max(0, toNumber(options && options.timeSec, 0));
  const fps = Math.max(1, toNumber(output.fps, 30));
  const frameIndex = Math.max(0, Math.round(timeSec * fps));

  const viewport = {
    width: Math.max(1, Math.round(toNumber(output.width, 1280))),
    height: Math.max(1, Math.round(toNumber(output.height, 720))),
    ratio: String(output.ratio || "16:9")
  };

  const nodes = getSortedNodes(project).map(normalizeNode);

  const scene = {
    version: "0.1",
    frame: {
      index: frameIndex,
      timeSec,
      fps
    },
    viewport,
    nodes
  };

  const result = validateScene(scene);
  if (!result.ok) {
    const err = new Error("Invalid scene output from evaluateGraphToScene");
    err.issues = result.issues;
    throw err;
  }

  return scene;
}

module.exports = {
  evaluateGraphToScene
};
