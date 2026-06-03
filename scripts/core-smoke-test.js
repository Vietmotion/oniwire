const fs = require("fs");
const path = require("path");
const { evaluateGraphToScene } = require("../src/core");

function main() {
  const sample = path.join(process.cwd(), "tests", "scenes", "fixtures", "scene_basic_shape_motion.json");
  const payload = JSON.parse(fs.readFileSync(sample, "utf8"));

  const project = payload.project || {};
  const metadata = payload.metadata || {};

  const scene = evaluateGraphToScene({
    project,
    timeSec: 0,
    output: {
      fps: metadata.fps || 30,
      width: metadata.width || 1280,
      height: metadata.height || 720,
      ratio: metadata.ratio || "16:9"
    }
  });

  console.log("Core smoke test OK");
  console.log("Frame:", scene.frame.index, "Nodes:", scene.nodes.length);
}

main();
