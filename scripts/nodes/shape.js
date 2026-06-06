window.createOniwireShapeNodeDef = function createOniwireShapeNodeDef(){
  function clamp(value, min, max){
    const n = Number(value);
    if(!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function shapeClipPath(shapeType, x, y, width, height){
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    const cx = x;
    const cy = y;

    switch(shapeType){
      case "circle": {
        const r = Math.max(1, Math.min(width, height) / 2);
        return `circle(${r}px at ${cx}px ${cy}px)`;
      }
      case "rectangle":
        return `polygon(${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px)`;
      case "triangle":
      case "diamond":
      case "hexagon":
      case "star": {
        const localPts = getPolygonPoints(shapeType, width, height) || [];
        if(!localPts.length){
          return `polygon(${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px)`;
        }
        const absPts = localPts.map((p) => `${left + p.x}px ${top + p.y}px`);
        return `polygon(${absPts.join(", ")})`;
      }
      default:
        return `polygon(${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px)`;
    }
  }

  function applyBasicShapeStyle(shape, shapeType){
    shape.style.borderLeft = "none";
    shape.style.borderRight = "none";
    shape.style.borderBottom = "none";
    shape.style.clipPath = "none";
    shape.style.webkitClipPath = "none";
    shape.style.transform = "none";
    shape.style.transformOrigin = "center";

    switch(shapeType){
      case "circle":
        shape.style.borderRadius = "50%";
        break;
      case "rectangle":
        shape.style.borderRadius = "0";
        break;
      case "triangle":
        shape.style.borderRadius = "0";
        shape.style.clipPath = "polygon(50% 0%, 100% 100%, 0% 100%)";
        shape.style.webkitClipPath = "polygon(50% 0%, 100% 100%, 0% 100%)";
        break;
      case "diamond":
        shape.style.borderRadius = "0";
        shape.style.clipPath = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
        shape.style.webkitClipPath = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
        break;
      case "hexagon":
        shape.style.borderRadius = "0";
        shape.style.clipPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
        shape.style.webkitClipPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
        break;
      case "star":
        shape.style.borderRadius = "0";
        shape.style.clipPath = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
        shape.style.webkitClipPath = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
        break;
    }
  }

  function getLocalShapeClipPath(shapeType){
    switch(shapeType){
      case "circle":
        return "circle(50% at 50% 50%)";
      case "triangle":
        return "polygon(50% 0%, 100% 100%, 0% 100%)";
      case "diamond":
        return "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
      case "hexagon":
        return "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
      case "star":
        return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
      default:
        return "";
    }
  }

  function getPolygonPoints(shapeType, width, height){
    const w = Math.max(1, Number(width) || 1);
    const h = Math.max(1, Number(height) || 1);
    const presets = {
      triangle: [
        [0.5, 0],
        [1, 1],
        [0, 1]
      ],
      diamond: [
        [0.5, 0],
        [1, 0.5],
        [0.5, 1],
        [0, 0.5]
      ],
      hexagon: [
        [0.5, 0],
        [1, 0.25],
        [1, 0.75],
        [0.5, 1],
        [0, 0.75],
        [0, 0.25]
      ],
      star: [
        [0.5, 0],
        [0.61, 0.35],
        [0.98, 0.35],
        [0.68, 0.57],
        [0.79, 0.91],
        [0.5, 0.7],
        [0.21, 0.91],
        [0.32, 0.57],
        [0.02, 0.35],
        [0.39, 0.35]
      ]
    };
    const src = presets[shapeType];
    if(!src) return null;
    return src.map(([nx, ny]) => ({ x: nx * w, y: ny * h }));
  }

  function offsetPolygonPointsOutward(points, cx, cy, offsetPx){
    if(!Array.isArray(points) || !points.length || !(offsetPx > 0)) return points;
    return points.map((pt) => {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const len = Math.hypot(dx, dy);
      if(len < 1e-6) return { x: pt.x, y: pt.y };
      return {
        x: pt.x + ((dx / len) * offsetPx),
        y: pt.y + ((dy / len) * offsetPx)
      };
    });
  }

  function buildStrokeSvg(shapeType, width, height, strokeColor, strokeWidth, strokeOpacity){
    const sw = Math.max(0, Number(strokeWidth) || 0);
    const so = clamp(strokeOpacity, 0, 1);
    if(sw <= 0 || so <= 0) return null;

    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "none";
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const half = sw / 2;
    const iw = Math.max(1, width + sw);
    const ih = Math.max(1, height + sw);
    const left = -half;
    const right = width + half;
    const top = -half;
    const bottom = height + half;
    const cx = width / 2;
    const cy = height / 2;

    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", String(strokeColor || "#ffffff"));
    path.setAttribute("stroke-width", String(sw));
    path.setAttribute("stroke-opacity", String(so));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    if(shapeType === "circle"){
      const ellipse = document.createElementNS(svgNs, "ellipse");
      ellipse.setAttribute("cx", String(cx));
      ellipse.setAttribute("cy", String(cy));
      ellipse.setAttribute("rx", String(Math.max(0.5, (width / 2) + half)));
      ellipse.setAttribute("ry", String(Math.max(0.5, (height / 2) + half)));
      ellipse.setAttribute("fill", "none");
      ellipse.setAttribute("stroke", String(strokeColor || "#ffffff"));
      ellipse.setAttribute("stroke-width", String(sw));
      ellipse.setAttribute("stroke-opacity", String(so));
      ellipse.setAttribute("stroke-linecap", "round");
      ellipse.setAttribute("stroke-linejoin", "round");
      svg.appendChild(ellipse);
      return svg;
    }

    let d = "";
    switch(shapeType){
      case "rectangle":
        d = `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
        break;
      case "triangle":
      case "diamond":
      case "hexagon":
      case "star": {
        const base = getPolygonPoints(shapeType, width, height);
        const outwardOffset = shapeType === "star" ? 0 : half;
        const pts = offsetPolygonPointsOutward(base, width / 2, height / 2, outwardOffset) || base;
        d = `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
        break;
      }
      default:
        d = `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
        break;
    }

    path.setAttribute("d", d);
    svg.appendChild(path);
    return svg;
  }

  return {
    inputs: ["fill"],
    outputs: ["layer"],
    defaults: {
      shape: "circle",
      width: 120,
      height: 120,
      color: "#3b82f6",
      strokeColor: "#ffffff",
      strokeWidth: 0,
      strokeOpacity: 1,
      x: 100,
      y: 100,
      uniform: false
    },
    icon: "🔷",
    run: (node, inputs) => {
      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";

      const shape = document.createElement("div");
      shape.style.position = "absolute";
      shape.dataset.boundId = node.id;

      const width = Number(node.params.width) || 100;
      const height = Number(node.params.height) || 100;
      const x = Number(node.params.x) || 0;
      const y = Number(node.params.y) || 0;
      const fallbackColor = String(node.params.color || "#3b82f6");
      const strokeColor = String(node.params.strokeColor || "#ffffff");
      const strokeWidth = Math.max(0, Number(node.params.strokeWidth) || 0);
      const strokeOpacity = clamp(node.params.strokeOpacity, 0, 1);
      const shapeType = node.params.shape || "circle";

      let fillValue = fallbackColor;
      const fillLayer = inputs?.fill?.el || null;
      if(fillLayer){
        const cs = window.getComputedStyle(fillLayer);
        const inlineBg = String(fillLayer.style.background || "");
        const inlineBgImg = String(fillLayer.style.backgroundImage || "");
        const computedBgImg = String(cs.backgroundImage || "");
        const computedBgColor = String(cs.backgroundColor || "");

        const inlineHasGradient = inlineBg.includes("gradient(") || inlineBgImg.includes("gradient(");
        const gradientValue = inlineHasGradient
          ? (inlineBg.includes("gradient(") ? inlineBg : inlineBgImg)
          : (computedBgImg !== "none" ? computedBgImg : "");

        if(gradientValue){
          fillValue = gradientValue;
        }else{
          fillValue = inlineBg && !inlineBg.includes("gradient(")
            ? inlineBg
            : ((computedBgColor && computedBgColor !== "rgba(0, 0, 0, 0)" && computedBgColor !== "transparent")
                ? computedBgColor
                : fallbackColor);
        }
      }

      wrap.dataset.maskShape = shapeType;
      wrap.dataset.maskWidth = String(width);
      wrap.dataset.maskHeight = String(height);
      wrap.dataset.maskX = String(x);
      wrap.dataset.maskY = String(y);
      wrap.dataset.maskColor = fallbackColor;
      wrap.dataset.maskStrokeWidth = String(strokeWidth);
      wrap.dataset.maskStrokeOpacity = String(strokeOpacity);

      shape.style.left = (x - width / 2) + "px";
      shape.style.top = (y - height / 2) + "px";
      shape.style.width = width + "px";
      shape.style.height = height + "px";
      shape.style.background = fillValue;
      shape.style.backgroundColor = fallbackColor;
      applyBasicShapeStyle(shape, shapeType);

      const strokeOverlay = buildStrokeSvg(shapeType, width, height, strokeColor, strokeWidth, strokeOpacity);
      if(strokeOverlay){
        strokeOverlay.style.left = (x - width / 2) + "px";
        strokeOverlay.style.top = (y - height / 2) + "px";
      }

      if(fillLayer){
        const shapeLeft = x - (width / 2);
        const shapeTop = y - (height / 2);
        const sourceRect = fillLayer.getBoundingClientRect();
        const measuredWidth = Math.round(sourceRect.width || 0);
        const measuredHeight = Math.round(sourceRect.height || 0);
        const hasMeasuredSize = measuredWidth > 2 && measuredHeight > 2;

        // Keep the plain shape as a guaranteed visual fallback.
        shape.style.pointerEvents = "none";
        wrap.appendChild(shape);

        const texturedFrame = document.createElement("div");
        texturedFrame.style.position = "absolute";
        texturedFrame.style.left = shapeLeft + "px";
        texturedFrame.style.top = shapeTop + "px";
        texturedFrame.style.width = width + "px";
        texturedFrame.style.height = height + "px";
        texturedFrame.style.overflow = "hidden";
        texturedFrame.style.pointerEvents = "none";

        const localClip = getLocalShapeClipPath(shapeType);
        if(localClip){
          texturedFrame.style.clipPath = localClip;
          texturedFrame.style.webkitClipPath = localClip;
        }

        const textured = fillLayer.cloneNode(true);
        textured.style.position = "absolute";
        if(hasMeasuredSize){
          textured.style.left = (-shapeLeft) + "px";
          textured.style.top = (-shapeTop) + "px";
          textured.style.width = measuredWidth + "px";
          textured.style.height = measuredHeight + "px";
          textured.style.inset = "auto";
        }else{
          textured.style.left = "0";
          textured.style.top = "0";
          textured.style.right = "0";
          textured.style.bottom = "0";
          textured.style.inset = "0";
          textured.style.width = "auto";
          textured.style.height = "auto";
        }
        textured.style.pointerEvents = "none";
        texturedFrame.appendChild(textured);
        wrap.appendChild(texturedFrame);

        const bounds = document.createElement("div");
        bounds.dataset.boundId = node.id;
        bounds.style.position = "absolute";
        bounds.style.left = shapeLeft + "px";
        bounds.style.top = shapeTop + "px";
        bounds.style.width = width + "px";
        bounds.style.height = height + "px";
        bounds.style.visibility = "hidden";
        bounds.style.pointerEvents = "none";
        wrap.appendChild(bounds);
        if(strokeOverlay) wrap.appendChild(strokeOverlay);
      }else{
        wrap.appendChild(shape);
        if(strokeOverlay) wrap.appendChild(strokeOverlay);
      }

      return { el: wrap };
    },
    inspector: () => ([
      { k: "shape", type: "select", label: "Shape", options: ["circle", "rectangle", "triangle", "diamond", "hexagon", "star"] },
      { k: "width", type: "range", label: "Width", min: 10, max: 1500, step: 1 },
      { k: "height", type: "range", label: "Height", min: 10, max: 1500, step: 1 },
      { k: "uniform", type: "checkbox", label: "Uniform" },
      { k: "color", type: "color", label: "Color" },
      { k: "strokeColor", type: "color", label: "Stroke" },
      { k: "strokeWidth", type: "range", label: "Stroke Width", min: 0, max: 200, step: 1 },
      { k: "strokeOpacity", type: "range", label: "Stroke Opacity", min: 0, max: 1, step: 0.01 },
      { k: "x", type: "range", label: "X", min: 0, max: 1200, step: 1 },
      { k: "y", type: "range", label: "Y", min: 0, max: 1200, step: 1 }
    ])
  };
};
