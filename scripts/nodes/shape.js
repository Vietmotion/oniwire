window.createOniwireShapeNodeDef = function createOniwireShapeNodeDef(){
  let shapeStrokeGradientIdCounter = 0;

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

  function applyBasicShapeStyle(shape, shapeType, borderRadiusPx){
    const radius = Math.max(0, Number(borderRadiusPx) || 0);
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
        shape.style.borderRadius = `${radius}px`;
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

  function buildStrokeSvg(shapeType, width, height, borderRadius, strokePaint, strokeWidth, strokeOpacity){
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

    let strokeValue = String(strokePaint?.color || strokePaint || "#ffffff");
    if(strokePaint && strokePaint.kind === "gradient" && Array.isArray(strokePaint.stops) && strokePaint.stops.length){
      const gradId = `shapeStrokeGrad_${(++shapeStrokeGradientIdCounter)}`;
      const defs = document.createElementNS(svgNs, "defs");
      const gradType = String(strokePaint.type || "linear");
      let grad = null;

      if(gradType === "radial"){
        grad = document.createElementNS(svgNs, "radialGradient");
        const cx = (clamp(Number(strokePaint.cx), 0, 100) / 100) * width;
        const cy = (clamp(Number(strokePaint.cy), 0, 100) / 100) * height;
        const r = Math.hypot(width, height) / 2;
        grad.setAttribute("gradientUnits", "userSpaceOnUse");
        grad.setAttribute("cx", String(cx));
        grad.setAttribute("cy", String(cy));
        grad.setAttribute("r", String(r));
      }else{
        grad = document.createElementNS(svgNs, "linearGradient");
        const angle = Number(strokePaint.angle) || 0;
        const rad = (angle - 90) * Math.PI / 180;
        const cx = width / 2;
        const cy = height / 2;
        const len = Math.hypot(width, height);
        const dx = Math.cos(rad) * (len / 2);
        const dy = Math.sin(rad) * (len / 2);
        grad.setAttribute("gradientUnits", "userSpaceOnUse");
        grad.setAttribute("x1", String(cx - dx));
        grad.setAttribute("y1", String(cy - dy));
        grad.setAttribute("x2", String(cx + dx));
        grad.setAttribute("y2", String(cy + dy));
      }

      grad.setAttribute("id", gradId);
      for(const stopMeta of strokePaint.stops){
        const stop = document.createElementNS(svgNs, "stop");
        stop.setAttribute("offset", `${clamp(Number(stopMeta?.pos), 0, 100)}%`);
        stop.setAttribute("stop-color", String(stopMeta?.color || "#ffffff"));
        grad.appendChild(stop);
      }
      defs.appendChild(grad);
      svg.appendChild(defs);
      strokeValue = `url(#${gradId})`;
    }

    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", strokeValue);
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
      ellipse.setAttribute("stroke", strokeValue);
      ellipse.setAttribute("stroke-width", String(sw));
      ellipse.setAttribute("stroke-opacity", String(so));
      ellipse.setAttribute("stroke-linecap", "round");
      ellipse.setAttribute("stroke-linejoin", "round");
      svg.appendChild(ellipse);
      return svg;
    }

    if(shapeType === "rectangle"){
      const rect = document.createElementNS(svgNs, "rect");
      const safeRadius = Math.max(0, Math.min(Number(borderRadius) || 0, Math.min(width, height) / 2));
      rect.setAttribute("x", String(left));
      rect.setAttribute("y", String(top));
      rect.setAttribute("width", String(iw));
      rect.setAttribute("height", String(ih));
      rect.setAttribute("rx", String(Math.max(0, Math.min(safeRadius + half, Math.min(iw, ih) / 2))));
      rect.setAttribute("ry", String(Math.max(0, Math.min(safeRadius + half, Math.min(iw, ih) / 2))));
      rect.setAttribute("fill", "none");
      rect.setAttribute("stroke", strokeValue);
      rect.setAttribute("stroke-width", String(sw));
      rect.setAttribute("stroke-opacity", String(so));
      rect.setAttribute("stroke-linecap", "round");
      rect.setAttribute("stroke-linejoin", "round");
      svg.appendChild(rect);
      return svg;
    }

    let d = "";
    switch(shapeType){
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

  function extractFirstGradientColor(str){
    const s = String(str || "");
    const m = s.match(/#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\)/);
    return m ? m[0] : "";
  }

  function parseColorToRgba(color){
    const raw = String(color || "").trim();
    if(!raw) return null;

    const hex = raw.match(/^#([0-9a-fA-F]{3,8})$/);
    if(hex){
      const h = hex[1];
      if(h.length === 3){
        return {
          r: parseInt(h[0] + h[0], 16),
          g: parseInt(h[1] + h[1], 16),
          b: parseInt(h[2] + h[2], 16),
          a: 1
        };
      }
      if(h.length === 6 || h.length === 8){
        return {
          r: parseInt(h.slice(0, 2), 16),
          g: parseInt(h.slice(2, 4), 16),
          b: parseInt(h.slice(4, 6), 16),
          a: h.length === 8 ? (parseInt(h.slice(6, 8), 16) / 255) : 1
        };
      }
    }

    const rgb = raw.match(/^rgba?\(([^\)]+)\)$/i);
    if(rgb){
      const parts = rgb[1].split(",").map(v => v.trim());
      if(parts.length >= 3){
        return {
          r: clamp(Number(parts[0]), 0, 255),
          g: clamp(Number(parts[1]), 0, 255),
          b: clamp(Number(parts[2]), 0, 255),
          a: parts.length >= 4 ? clamp(Number(parts[3]), 0, 1) : 1
        };
      }
    }

    return null;
  }

  function rgbaToCss(rgba){
    if(!rgba) return "";
    const r = Math.round(clamp(rgba.r, 0, 255));
    const g = Math.round(clamp(rgba.g, 0, 255));
    const b = Math.round(clamp(rgba.b, 0, 255));
    const a = clamp(rgba.a, 0, 1);
    if(a >= 0.999) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }

  function sampleGradientStopsColor(stops, posPct = 50){
    if(!Array.isArray(stops) || !stops.length) return "";
    const sorted = stops
      .map(s => ({
        pos: clamp(Number(s?.pos), 0, 100),
        color: String(s?.color || "")
      }))
      .filter(s => s.color)
      .sort((a, b) => a.pos - b.pos);
    if(!sorted.length) return "";

    const t = clamp(Number(posPct), 0, 100);
    let left = sorted[0];
    let right = sorted[sorted.length - 1];

    for(let i = 0; i < sorted.length; i++){
      if(sorted[i].pos <= t) left = sorted[i];
      if(sorted[i].pos >= t){
        right = sorted[i];
        break;
      }
    }

    const lc = parseColorToRgba(left.color);
    const rc = parseColorToRgba(right.color);
    if(!lc || !rc) return left.color || right.color || "";
    if(right.pos <= left.pos) return rgbaToCss(lc);

    const f = clamp((t - left.pos) / (right.pos - left.pos), 0, 1);
    return rgbaToCss({
      r: lc.r + (rc.r - lc.r) * f,
      g: lc.g + (rc.g - lc.g) * f,
      b: lc.b + (rc.b - lc.b) * f,
      a: lc.a + (rc.a - lc.a) * f
    });
  }

  function resolveSolidColorFromLayer(layerEl, fallbackColor){
    if(!layerEl) return String(fallbackColor || "#ffffff");

    const cs = window.getComputedStyle(layerEl);
    const inlineBg = String(layerEl.style.background || "");
    const inlineBgImg = String(layerEl.style.backgroundImage || "");
    const inlineColor = String(layerEl.style.color || "");
    const computedBgImg = String(cs.backgroundImage || "");
    const computedBgColor = String(cs.backgroundColor || "");
    const computedColor = String(cs.color || "");

    // Gradient/Color nodes expose stops metadata; use first stop as a stable representative stroke color.
    const gradStopsRaw = String(layerEl.dataset?.gradStops || "").trim();
    if(gradStopsRaw){
      try{
        const parsed = JSON.parse(gradStopsRaw);
        if(Array.isArray(parsed) && parsed.length){
          const sampled = sampleGradientStopsColor(parsed, 50);
          if(sampled) return sampled;
          if(parsed[0]?.color) return String(parsed[0].color);
        }
      }catch(_){
        // Fall through to style-based extraction.
      }
    }

    const gradientStr = [inlineBg, inlineBgImg, computedBgImg].find(v => String(v || "").includes("gradient(")) || "";
    if(gradientStr){
      const picked = extractFirstGradientColor(gradientStr);
      if(picked) return picked;
    }

    if(inlineBg && !inlineBg.includes("gradient(")) return inlineBg;
    if(inlineColor && inlineColor !== "transparent") return inlineColor;
    if(computedBgColor && computedBgColor !== "rgba(0, 0, 0, 0)" && computedBgColor !== "transparent") return computedBgColor;
    if(computedColor && computedColor !== "rgba(0, 0, 0, 0)" && computedColor !== "transparent") return computedColor;

    return String(fallbackColor || "#ffffff");
  }

  function resolveStrokePaintFromLayer(layerEl, fallbackColor){
    if(!layerEl){
      return { kind: "color", color: String(fallbackColor || "#ffffff") };
    }

    const gradStopsRaw = String(layerEl.dataset?.gradStops || "").trim();
    if(gradStopsRaw){
      try{
        const parsed = JSON.parse(gradStopsRaw);
        if(Array.isArray(parsed) && parsed.length){
          return {
            kind: "gradient",
            type: String(layerEl.dataset?.gradType || "linear"),
            angle: Number(layerEl.dataset?.gradAngle ?? 0),
            cx: Number(layerEl.dataset?.gradCx ?? 50),
            cy: Number(layerEl.dataset?.gradCy ?? 50),
            stops: parsed
              .map(s => ({
                pos: clamp(Number(s?.pos), 0, 100),
                color: String(s?.color || "#ffffff")
              }))
              .sort((a, b) => a.pos - b.pos)
          };
        }
      }catch(_){
        // Fall through to solid color.
      }
    }

    return {
      kind: "color",
      color: resolveSolidColorFromLayer(layerEl, fallbackColor)
    };
  }

  return {
    inputs: ["fill color", "stroke color"],
    outputs: ["layer"],
    defaults: {
      shape: "circle",
      width: 120,
      height: 120,
      color: "#3b82f6",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWidth: 0,
      strokeOpacity: 1,
      borderRadius: 0,
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
      const fallbackStrokeColor = String(node.params.strokeColor || "#ffffff");
      const strokeWidth = Math.max(0, Number(node.params.strokeWidth) || 0);
      const strokeOpacity = clamp(node.params.strokeOpacity, 0, 1);
      const borderRadius = Math.max(0, Number(node.params.borderRadius) || 0);
      const safeBorderRadius = Math.min(borderRadius, Math.min(width, height) / 2);
      const fillOpacity = clamp(node.params.fillOpacity, 0, 1);
      const shapeType = node.params.shape || "circle";

      let fillValue = fallbackColor;
      const fillLayer = inputs?.["fill color"]?.el || inputs?.fill?.el || null;
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

      let strokePaint = { kind: "color", color: fallbackStrokeColor };
      const strokeLayer = inputs?.["stroke color"]?.el || null;
      if(strokeLayer) strokePaint = resolveStrokePaintFromLayer(strokeLayer, fallbackStrokeColor);

      // UI uses these ephemeral flags to disable manual color pickers while inputs drive color.
      node._shapeFillInputConnected = Boolean(fillLayer);
      node._shapeStrokeInputConnected = Boolean(strokeLayer);

      wrap.dataset.maskShape = shapeType;
      wrap.dataset.maskWidth = String(width);
      wrap.dataset.maskHeight = String(height);
      wrap.dataset.maskX = String(x);
      wrap.dataset.maskY = String(y);
      wrap.dataset.maskColor = fallbackColor;
      wrap.dataset.maskStrokeWidth = String(strokeWidth);
      wrap.dataset.maskStrokeOpacity = String(strokeOpacity);
      wrap.dataset.maskBorderRadius = String(safeBorderRadius);

      shape.style.left = (x - width / 2) + "px";
      shape.style.top = (y - height / 2) + "px";
      shape.style.width = width + "px";
      shape.style.height = height + "px";
      shape.style.background = fillValue;
      shape.style.backgroundColor = fallbackColor;
      shape.style.opacity = String(fillOpacity);
      applyBasicShapeStyle(shape, shapeType, safeBorderRadius);

      const strokeOverlay = buildStrokeSvg(shapeType, width, height, safeBorderRadius, strokePaint, strokeWidth, strokeOpacity);
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
        texturedFrame.style.opacity = String(fillOpacity);

        const localClip = getLocalShapeClipPath(shapeType);
        if(localClip){
          texturedFrame.style.clipPath = localClip;
          texturedFrame.style.webkitClipPath = localClip;
        }else if(shapeType === "rectangle"){
          texturedFrame.style.borderRadius = `${safeBorderRadius}px`;
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
    inspector: (node) => ([
      { k: "shape", type: "select", label: "Shape", options: ["circle", "rectangle", "triangle", "diamond", "hexagon", "star"] },
      { k: "width", type: "range", label: "Width", min: 10, max: 1500, step: 1 },
      { k: "height", type: "range", label: "Height", min: 10, max: 1500, step: 1 },
      { k: "uniform", type: "checkbox", label: "Uniform" },
      {
        k: "color",
        type: "color",
        label: "Fill Color",
        disabledIf: (n) => Boolean(n?._shapeFillInputConnected),
        disabledTitle: "Driven by Fill Color input"
      },
      { k: "fillOpacity", type: "range", label: "Fill Opacity", min: 0, max: 1, step: 0.01 },
      { k: "borderRadius", type: "range", label: "Border Radius", min: 0, max: 750, step: 1 },
      {
        k: "strokeColor",
        type: "color",
        label: "Stroke Color",
        disabledIf: (n) => Boolean(n?._shapeStrokeInputConnected),
        disabledTitle: "Driven by Stroke Color input"
      },
      { k: "strokeWidth", type: "range", label: "Stroke Width", min: 0, max: 200, step: 1 },
      { k: "strokeOpacity", type: "range", label: "Stroke Opacity", min: 0, max: 1, step: 0.01 },
      { k: "x", type: "range", label: "X", min: 0, max: 1200, step: 1 },
      { k: "y", type: "range", label: "Y", min: 0, max: 1200, step: 1 }
    ])
  };
};
