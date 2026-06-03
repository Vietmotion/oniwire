function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function validateTransform(transform, path, issues) {
  if (!isObject(transform)) {
    issues.push(`${path} must be an object`);
    return;
  }

  const keys = ["x", "y", "scaleX", "scaleY", "rotation"];
  for (const key of keys) {
    if (!isFiniteNumber(transform[key])) {
      issues.push(`${path}.${key} must be a finite number`);
    }
  }
}

function validateBounds(bounds, path, issues) {
  if (!isObject(bounds)) {
    issues.push(`${path} must be an object`);
    return;
  }

  const keys = ["x", "y", "width", "height"];
  for (const key of keys) {
    if (!isFiniteNumber(bounds[key])) {
      issues.push(`${path}.${key} must be a finite number`);
    }
  }
}

function validateNode(node, index, issues) {
  const path = `nodes[${index}]`;

  if (!isObject(node)) {
    issues.push(`${path} must be an object`);
    return;
  }

  if (typeof node.id !== "string" || !node.id.trim()) {
    issues.push(`${path}.id must be a non-empty string`);
  }

  if (typeof node.kind !== "string" || !node.kind.trim()) {
    issues.push(`${path}.kind must be a non-empty string`);
  }

  validateTransform(node.transform, `${path}.transform`, issues);
  validateBounds(node.bounds, `${path}.bounds`, issues);

  if (!isFiniteNumber(node.opacity) || node.opacity < 0 || node.opacity > 1) {
    issues.push(`${path}.opacity must be a finite number in [0,1]`);
  }

  if (typeof node.blend !== "string" || !node.blend.trim()) {
    issues.push(`${path}.blend must be a non-empty string`);
  }

  if (!isObject(node.props)) {
    issues.push(`${path}.props must be an object`);
  }
}

function validateScene(scene) {
  const issues = [];

  if (!isObject(scene)) {
    return {
      ok: false,
      issues: ["scene must be an object"]
    };
  }

  if (scene.version !== "0.1") {
    issues.push("scene.version must be '0.1'");
  }

  if (!isObject(scene.frame)) {
    issues.push("scene.frame must be an object");
  } else {
    if (!Number.isInteger(scene.frame.index) || scene.frame.index < 0) {
      issues.push("scene.frame.index must be a non-negative integer");
    }
    if (!isFiniteNumber(scene.frame.timeSec) || scene.frame.timeSec < 0) {
      issues.push("scene.frame.timeSec must be a non-negative number");
    }
    if (!isFiniteNumber(scene.frame.fps) || scene.frame.fps <= 0) {
      issues.push("scene.frame.fps must be a positive number");
    }
  }

  if (!isObject(scene.viewport)) {
    issues.push("scene.viewport must be an object");
  } else {
    if (!Number.isInteger(scene.viewport.width) || scene.viewport.width <= 0) {
      issues.push("scene.viewport.width must be a positive integer");
    }
    if (!Number.isInteger(scene.viewport.height) || scene.viewport.height <= 0) {
      issues.push("scene.viewport.height must be a positive integer");
    }
    if (typeof scene.viewport.ratio !== "string" || !scene.viewport.ratio.trim()) {
      issues.push("scene.viewport.ratio must be a non-empty string");
    }
  }

  if (!Array.isArray(scene.nodes)) {
    issues.push("scene.nodes must be an array");
  } else {
    scene.nodes.forEach((node, index) => validateNode(node, index, issues));
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

module.exports = {
  validateScene
};
