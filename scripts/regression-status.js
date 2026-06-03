const fs = require("fs");
const path = require("path");

const root = process.cwd();
const packPath = path.join(root, "tests", "scenes", "scene-pack.json");
const baselineRoot = path.join(root, "tests", "snapshots-baseline");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sceneExpectedFiles(sceneId) {
  return [
    "preview.png",
    "export.png",
    "export.jpg",
    "mp4_f000.png",
    "mp4_fmid.png",
    "mp4_fend.png",
    "embed_f000.png",
    "embed_fmid.png",
    "embed_fend.png"
  ].map((name) => path.join(baselineRoot, sceneId, name));
}

function main() {
  if (!exists(packPath)) {
    console.error("Missing scene pack:", packPath);
    process.exit(1);
  }

  const pack = readJson(packPath);
  const scenes = Array.isArray(pack.scenes) ? pack.scenes : [];

  if (!scenes.length) {
    console.error("No scenes found in scene-pack.json");
    process.exit(1);
  }

  let missingTotal = 0;
  let seededCount = 0;

  console.log("Regression baseline status");
  console.log("Scene pack version:", pack.version || "unknown");
  console.log("Created at:", pack.createdAt || "unknown");
  console.log("");

  for (const scene of scenes) {
    const sceneId = String(scene.id || "").trim();
    if (!sceneId) continue;

    const seeded = scene.status === "seeded";
    if (seeded) seededCount += 1;

    const expected = sceneExpectedFiles(sceneId);
    const missing = expected.filter((filePath) => !exists(filePath));
    missingTotal += missing.length;

    const doneCount = expected.length - missing.length;
    console.log(`- ${sceneId}: ${doneCount}/${expected.length} snapshots`);

    if (missing.length > 0) {
      for (const m of missing) {
        console.log(`  MISSING ${path.relative(root, m)}`);
      }
    }
  }

  console.log("");
  console.log("Seeded scenes:", seededCount);
  console.log("Total missing snapshots:", missingTotal);

  if (missingTotal > 0) {
    process.exitCode = 2;
  }
}

main();
