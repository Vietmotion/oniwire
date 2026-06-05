window.createOniwirePenNodeDef = function createOniwirePenNodeDef(){
  const NS = "http://www.w3.org/2000/svg";

  function clamp(n, min, max){
    return Math.max(min, Math.min(max, n));
  }

  // Extract a hex color string from a connected node output element.
  // Returns either a CSS color string or an SVG paint server id after injecting defs.
  function extractSvgPaint(inputResult, paintId, svgDefs){
    if(!inputResult || !inputResult.el) return null;
    const el = inputResult.el;
    const bg = (el.style.background || "").trim();
    if(!bg) return null;

    // Gradient via dataset metadata
    const rawStops = el.dataset?.gradStops;
    if(rawStops){
      let stops;
      try{ stops = JSON.parse(rawStops); } catch{ stops = null; }
      if(Array.isArray(stops) && stops.length){
        const type = el.dataset.gradType || "linear";
        const gradEl = document.createElementNS(NS, type === "radial" ? "radialGradient" : "linearGradient");
        gradEl.id = paintId;
        if(type === "radial"){
          const cx = (Number(el.dataset.gradCx) || 50) / 100;
          const cy = (Number(el.dataset.gradCy) || 50) / 100;
          gradEl.setAttribute("cx", cx);
          gradEl.setAttribute("cy", cy);
          gradEl.setAttribute("r", "0.65");
          gradEl.setAttribute("gradientUnits", "objectBoundingBox");
        }else{
          const angle = Number(el.dataset.gradAngle) || 0;
          const rad = (angle - 90) * Math.PI / 180;
          gradEl.setAttribute("x1", String(0.5 - 0.5 * Math.cos(rad)));
          gradEl.setAttribute("y1", String(0.5 - 0.5 * Math.sin(rad)));
          gradEl.setAttribute("x2", String(0.5 + 0.5 * Math.cos(rad)));
          gradEl.setAttribute("y2", String(0.5 + 0.5 * Math.sin(rad)));
          gradEl.setAttribute("gradientUnits", "objectBoundingBox");
        }
        for(const s of stops){
          const stop = document.createElementNS(NS, "stop");
          stop.setAttribute("offset", s.pos + "%");
          stop.setAttribute("stop-color", s.color);
          gradEl.appendChild(stop);
        }
        svgDefs.appendChild(gradEl);
        return `url(#${paintId})`;
      }
    }

    // Solid color — the background is just the color value
    if(!bg.includes("gradient")){
      return bg;
    }
    return null;
  }

  // Build taper defs (SVG mask with linear opacity gradient) and return mask id.
  function buildTaperDefs(maskId, bounds, taperMode, svgDefs){
    const { minX, minY, maxX, maxY } = bounds;
    const w = maxX - minX, h = maxY - minY;
    const useX = w >= h;
    const gradId = maskId + "-g";

    const grad = document.createElementNS(NS, "linearGradient");
    grad.id = gradId;
    grad.setAttribute("gradientUnits", "userSpaceOnUse");
    if(useX){
      grad.setAttribute("x1", minX); grad.setAttribute("y1", 0);
      grad.setAttribute("x2", maxX); grad.setAttribute("y2", 0);
    }else{
      grad.setAttribute("x1", 0); grad.setAttribute("y1", minY);
      grad.setAttribute("x2", 0); grad.setAttribute("y2", maxY);
    }

    const stops = taperMode === "start"
      ? [{o: 0, p: "0%"}, {o: 1, p: "22%"}, {o: 1, p: "100%"}]
      : taperMode === "end"
        ? [{o: 1, p: "0%"}, {o: 1, p: "78%"}, {o: 0, p: "100%"}]
        : [{o: 0, p: "0%"}, {o: 1, p: "20%"}, {o: 1, p: "80%"}, {o: 0, p: "100%"}];

    for(const s of stops){
      const stop = document.createElementNS(NS, "stop");
      stop.setAttribute("offset", s.p);
      stop.setAttribute("stop-color", "white");
      stop.setAttribute("stop-opacity", s.o);
      grad.appendChild(stop);
    }

    const mask = document.createElementNS(NS, "mask");
    mask.id = maskId;
    const rect = document.createElementNS(NS, "rect");
    const pad = 20;
    rect.setAttribute("x", minX - pad); rect.setAttribute("y", minY - pad);
    rect.setAttribute("width", w + pad * 2); rect.setAttribute("height", h + pad * 2);
    rect.setAttribute("fill", `url(#${gradId})`);
    mask.appendChild(rect);

    svgDefs.appendChild(grad);
    svgDefs.appendChild(mask);
    return maskId;
  }

  // Returns {minX, minY, maxX, maxY} for all control points of a path.
  function getPathBoundsRaw(path){
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for(const pt of (path.points || [])){
      for(const [x, y] of [[pt.x, pt.y], [pt.inX, pt.inY], [pt.outX, pt.outY]]){
        if(!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if(x < minX) minX = x; if(x > maxX) maxX = x;
        if(y < minY) minY = y; if(y > maxY) maxY = y;
      }
    }
    if(!Number.isFinite(minX)){ minX = 0; minY = 0; maxX = 100; maxY = 100; }
    return { minX, minY, maxX, maxY };
  }

  // Auto-smooth: recompute bezier handles using Catmull-Rom tangents.
  function smoothPathPoints(points, closed, strength = 50){
    const n = points.length;
    if(n < 2) return points;
    const pts = points.map(p => ({ ...p }));

    const tNorm = clamp(Number(strength), 0, 100) / 100;
    const tension = 0.05 + (0.7 * tNorm);
    for(let i = 0; i < n; i++){
      const prev = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
      const next = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
      const curr = pts[i];
      const tx = (next.x - prev.x) * tension;
      const ty = (next.y - prev.y) * tension;
      const lenIn  = Math.hypot(curr.x - prev.x, curr.y - prev.y) / 3;
      const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y) / 3;
      const len = Math.hypot(tx, ty) || 1;
      const nx = tx / len, ny = ty / len;
      curr.inX  = curr.x - nx * lenIn;
      curr.inY  = curr.y - ny * lenIn;
      curr.outX = curr.x + nx * lenOut;
      curr.outY = curr.y + ny * lenOut;
    }
    return pts;
  }

  // Expose smooth function for inspector button
  window.oniwirePenSmoothPath = smoothPathPoints;

  function normalizePoints(raw){
    const src = Array.isArray(raw) ? raw : [];
    return src
      .filter(p => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
      .map(p => {
        const x = Number(p.x), y = Number(p.y);
        return {
          x, y,
          inX: Number.isFinite(Number(p.inX)) ? Number(p.inX) : x - 44,
          inY: Number.isFinite(Number(p.inY)) ? Number(p.inY) : y,
          outX: Number.isFinite(Number(p.outX)) ? Number(p.outX) : x + 44,
          outY: Number.isFinite(Number(p.outY)) ? Number(p.outY) : y
        };
      });
  }

  function defaultPath(nameIndex){
    return {
      name: "Path " + String(nameIndex).padStart(2, "0"),
      points: [
        { x: 220, y: 160, inX: 180, inY: 130, outX: 260, outY: 130 },
        { x: 330, y: 260, inX: 300, inY: 220, outX: 360, outY: 300 },
        { x: 180, y: 320, inX: 150, inY: 300, outX: 220, outY: 340 }
      ],
      closed: true,
      fillColor: "#ffffff",
      fillOpacity: 0.8,
      strokeColor: "#ffffff",
      strokeWidth: 2,
      strokeOpacity: 1,
      strokeLinecap: "round",
      strokeTaper: "none",
      taperStartStrength: 70,
      taperEndStrength: 70,
      smoothStrength: 50,
      visible: true
    };
  }

  function normalizePaths(raw){
    const src = Array.isArray(raw) ? raw : [];
    const out = src.map((path, i) => ({
      name: String(path.name || ("Path " + String(i + 1).padStart(2, "0"))),
      points: normalizePoints(path.points),
      closed: Boolean(path.closed),
      fillColor: String(path.fillColor || "#ffffff"),
      fillOpacity: clamp(Number.isFinite(Number(path.fillOpacity)) ? Number(path.fillOpacity) : 0.8, 0, 1),
      strokeColor: String(path.strokeColor || "#ffffff"),
      strokeWidth: Math.max(0.1, Number(path.strokeWidth) || 2),
      strokeOpacity: clamp(Number.isFinite(Number(path.strokeOpacity)) ? Number(path.strokeOpacity) : 1, 0, 1),
      strokeLinecap: ["round", "butt", "square"].includes(path.strokeLinecap) ? path.strokeLinecap : "round",
      strokeTaper: ["none", "start", "end", "both"].includes(path.strokeTaper) ? path.strokeTaper : "none",
      taperStartStrength: clamp(Number.isFinite(Number(path.taperStartStrength)) ? Number(path.taperStartStrength) : Number(path.taperStartLen), 0, 100),
      taperEndStrength: clamp(Number.isFinite(Number(path.taperEndStrength)) ? Number(path.taperEndStrength) : Number(path.taperEndLen), 0, 100),
      smoothStrength: clamp(Number(path.smoothStrength), 0, 100) || 50,
      visible: path.visible !== false
    }));
    return out.length ? out : [defaultPath(1)];
  }

  function migrateLegacy(params){
    if(params && Array.isArray(params.points) && !Array.isArray(params.paths)){
      params.paths = [{
        name: "Path 01",
        points: params.points,
        closed: Boolean(params.closed),
        fillColor: String(params.fillColor || "#ffffff"),
        fillOpacity: clamp(Number.isFinite(Number(params.fillOpacity)) ? Number(params.fillOpacity) : 0.8, 0, 1),
        strokeColor: String(params.strokeColor || "#ffffff"),
        strokeWidth: Math.max(0.1, Number(params.strokeWidth) || 2),
        strokeOpacity: clamp(Number.isFinite(Number(params.strokeOpacity)) ? Number(params.strokeOpacity) : 1, 0, 1),
        strokeLinecap: "round",
        strokeTaper: "none",
        taperStartStrength: 70,
        taperEndStrength: 70,
        smoothStrength: 50,
        visible: true
      }];
      params.activePath = 0;
      delete params.points;
      delete params.closed;
      delete params.fillColor;
      delete params.fillOpacity;
      delete params.strokeColor;
      delete params.strokeWidth;
      delete params.strokeOpacity;
    }
  }

  function buildPathD(points, closed){
    if(!points || !points.length) return "";
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for(let i = 1; i < points.length; i++){
      const prev = points[i - 1], curr = points[i];
      d += ` C ${prev.outX.toFixed(2)} ${prev.outY.toFixed(2)}, ${curr.inX.toFixed(2)} ${curr.inY.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
    }
    if(closed && points.length > 1){
      const last = points[points.length - 1], first = points[0];
      d += ` C ${last.outX.toFixed(2)} ${last.outY.toFixed(2)}, ${first.inX.toFixed(2)} ${first.inY.toFixed(2)}, ${first.x.toFixed(2)} ${first.y.toFixed(2)} Z`;
    }
    return d;
  }

  function cubicAt(p0, p1, p2, p3, t){
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  function cubicTangent(p0, p1, p2, p3, t){
    const u = 1 - t;
    return {
      x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
      y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
    };
  }

  function samplePath(points, closed, stepsPerSeg = 16){
    const pts = Array.isArray(points) ? points : [];
    if(pts.length < 2) return [];

    const segments = [];
    for(let i = 1; i < pts.length; i++) segments.push([pts[i - 1], pts[i]]);
    if(closed && pts.length > 1) segments.push([pts[pts.length - 1], pts[0]]);

    const out = [];
    for(let si = 0; si < segments.length; si++){
      const [a, b] = segments[si];
      const p0 = { x: a.x, y: a.y };
      const p1 = { x: a.outX, y: a.outY };
      const p2 = { x: b.inX, y: b.inY };
      const p3 = { x: b.x, y: b.y };
      for(let step = 0; step <= stepsPerSeg; step++){
        if(si > 0 && step === 0) continue;
        const t = step / stepsPerSeg;
        const p = cubicAt(p0, p1, p2, p3, t);
        const tg = cubicTangent(p0, p1, p2, p3, t);
        out.push({ x: p.x, y: p.y, tx: tg.x, ty: tg.y });
      }
    }

    const n = out.length;
    if(n < 2) return out;
    for(let i = 0; i < n; i++) out[i].u = i / (n - 1);
    return out;
  }

  function smoothstep01(v){
    const t = clamp(v, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function taperFactor(u, startStrength, endStrength){
    const startBlend = clamp(Number(startStrength), 0, 100) / 100;
    const endBlend = clamp(Number(endStrength), 0, 100) / 100;
    // Span grows with strength: at 100% it covers 55% of the path
    const startSpan = 0.08 + (startBlend * 0.47);
    const endSpan   = 0.08 + (endBlend   * 0.47);
    // Use a sharper power curve so the end truly narrows to near-zero
    const startRaw   = clamp(u / startSpan, 0, 1);
    const endRaw     = clamp((1 - u) / endSpan, 0, 1);
    const startShape = startRaw * startRaw * (3 - 2 * startRaw);
    const endShape   = endRaw   * endRaw   * (3 - 2 * endRaw);
    const startF = (1 - startBlend) + (startBlend * startShape);
    const endF   = (1 - endBlend)   + (endBlend   * endShape);
    return startF * endF;
  }

  function buildTaperRibbonPath(points, closed, width, startStrength, endStrength){
    if(closed) return null;
    const samples = samplePath(points, false, 18);
    if(samples.length < 2) return null;

    const left = [];
    const right = [];
    let fallbackNx = 0;
    let fallbackNy = 1;

    for(const s of samples){
      let tx = Number(s.tx) || 0;
      let ty = Number(s.ty) || 0;
      let len = Math.hypot(tx, ty);
      if(len < 1e-5){
        tx = 1;
        ty = 0;
        len = 1;
      }
      tx /= len;
      ty /= len;
      let nx = -ty;
      let ny = tx;
      const nLen = Math.hypot(nx, ny);
      if(nLen < 1e-5){
        nx = fallbackNx;
        ny = fallbackNy;
      }else{
        nx /= nLen;
        ny /= nLen;
        fallbackNx = nx;
        fallbackNy = ny;
      }

      const f = Math.max(0.001, taperFactor(Number(s.u) || 0, startStrength, endStrength));
      const half = Math.max(0.001, (Math.max(0.1, Number(width) || 2) * f) / 2);
      left.push({ x: s.x + nx * half, y: s.y + ny * half });
      right.push({ x: s.x - nx * half, y: s.y - ny * half });
    }

    const all = left.concat([...right].reverse());
    if(all.length < 3) return null;
    let d = `M ${all[0].x.toFixed(2)} ${all[0].y.toFixed(2)}`;
    for(let i = 1; i < all.length; i++) d += ` L ${all[i].x.toFixed(2)} ${all[i].y.toFixed(2)}`;
    d += " Z";
    return d;
  }

  function serializeMaskPaths(paths){
    return (Array.isArray(paths) ? paths : [])
      .filter(path => path && path.visible !== false)
      .map(path => ({
        d: buildPathD(path.points, path.closed),
        closed: Boolean(path.closed),
        strokeWidth: Math.max(0.1, Number(path.strokeWidth) || 2),
        fillOpacity: clamp(Number.isFinite(Number(path.fillOpacity)) ? Number(path.fillOpacity) : 0.8, 0, 1),
        strokeOpacity: clamp(Number.isFinite(Number(path.strokeOpacity)) ? Number(path.strokeOpacity) : 1, 0, 1)
      }))
      .filter(path => path.d);
  }

  function getPathBounds(paths){
    const allPaths = Array.isArray(paths) ? paths : [];
    const candidates = allPaths.filter(path => path && path.visible !== false && Array.isArray(path.points) && path.points.length);
    const source = candidates.length ? candidates : allPaths.filter(path => path && Array.isArray(path.points) && path.points.length);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for(const path of source){
      for(const point of path.points){
        const coords = [
          [point.x, point.y],
          [point.inX, point.inY],
          [point.outX, point.outY]
        ];
        for(const [x, y] of coords){
          if(!Number.isFinite(x) || !Number.isFinite(y)) continue;
          if(x < minX) minX = x;
          if(y < minY) minY = y;
          if(x > maxX) maxX = x;
          if(y > maxY) maxY = y;
        }
      }
    }

    if(!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)){
      return { cx: 0, cy: 0 };
    }

    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2
    };
  }

  return {
    inputs: ["fill", "stroke"],
    outputs: ["layer"],
    defaults: {
      paths: [defaultPath(1)],
      activePath: 0
    },
    icon: "✏️",
    run: (node, inputs) => {
      migrateLegacy(node.params);
      const paths = normalizePaths(node.params?.paths);
      node.params.paths = paths;
      const activeIdx = clamp(Number(node.params?.activePath) || 0, 0, Math.max(0, paths.length - 1));
      node.params.activePath = activeIdx;
      const bounds = getPathBounds(paths);
      const maskPaths = serializeMaskPaths(paths);

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.overflow = "visible";
      wrap.dataset.maskShape = "path";
      wrap.dataset.maskPathData = JSON.stringify(maskPaths);
      wrap.dataset.maskX = "0";
      wrap.dataset.maskY = "0";
      wrap.dataset.maskScale = "1";
      wrap.dataset.maskCx = String(bounds.cx);
      wrap.dataset.maskCy = String(bounds.cy);

      const svg = document.createElementNS(NS, "svg");
      svg.style.position = "absolute";
      svg.style.left = "0px";
      svg.style.top = "0px";
      svg.style.pointerEvents = "none";
      svg.style.userSelect = "none";
      svg.style.overflow = "visible";
      svg.setAttribute("viewBox", "0 0 1280 720");
      svg.setAttribute("width", "1280");
      svg.setAttribute("height", "720");

      // Shared defs for gradients and taper masks
      const defs = document.createElementNS(NS, "defs");
      svg.appendChild(defs);

      // Resolve fill and stroke paints from connected nodes
      const fillPaint = extractSvgPaint(inputs?.fill, `pen-fill-${node.id}`, defs);
      const strokePaint = extractSvgPaint(inputs?.stroke, `pen-stroke-${node.id}`, defs);

      const g = document.createElementNS(NS, "g");

      paths.forEach((path, pathIdx) => {
        if(!path.visible) return;
        const d = buildPathD(path.points, path.closed);
        if(!d) return;

        const usedFill = fillPaint || (path.closed ? path.fillColor : "none");
        const usedStroke = strokePaint || path.strokeColor;
        const linecap = ["round", "butt", "square"].includes(path.strokeLinecap) ? path.strokeLinecap : "round";
        const taperStartStrength = clamp(Number(path.taperStartStrength), 0, 100);
        const taperEndStrength = clamp(Number(path.taperEndStrength), 0, 100);
        const hasTaper = (taperStartStrength > 0 || taperEndStrength > 0);

        const pathGroup = document.createElementNS(NS, "g");

        // True taper: build a variable-width ribbon instead of opacity-fading the stroke.
        if(hasTaper && !path.closed){
          const ribbonD = buildTaperRibbonPath(path.points, false, path.strokeWidth, taperStartStrength, taperEndStrength);
          if(ribbonD){
            const tapered = document.createElementNS(NS, "path");
            tapered.setAttribute("d", ribbonD);
            tapered.setAttribute("fill", usedStroke);
            tapered.setAttribute("fill-opacity", String(path.strokeOpacity));
            tapered.setAttribute("stroke", "none");
            pathGroup.appendChild(tapered);
            g.appendChild(pathGroup);
            return;
          }
        }

        const el = document.createElementNS(NS, "path");
        el.setAttribute("d", d);
        el.setAttribute("fill", path.closed ? usedFill : "none");
        el.setAttribute("fill-opacity", String(path.fillOpacity));
        el.setAttribute("stroke", usedStroke);
        el.setAttribute("stroke-width", String(path.strokeWidth));
        el.setAttribute("stroke-opacity", String(path.strokeOpacity));
        el.setAttribute("stroke-linecap", linecap);
        el.setAttribute("stroke-linejoin", "round");
        pathGroup.appendChild(el);
        g.appendChild(pathGroup);
      });

      g.dataset.boundId = node.id;
      svg.appendChild(g);
      wrap.appendChild(svg);

      return { el: wrap };
    },
    inspector: () => ([
      { k: "paths", type: "shapeManager", label: "Shapes" }
    ])
  };
};
