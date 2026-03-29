window.createOniwirePenNodeDef = function createOniwirePenNodeDef(){
  function clamp(n, min, max){
    return Math.max(min, Math.min(max, n));
  }

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
    inputs: [],
    outputs: ["layer"],
    defaults: {
      paths: [defaultPath(1)],
      activePath: 0,
      x: 0,
      y: 0,
      scale: 1
    },
    icon: "✏️",
    run: (node) => {
      migrateLegacy(node.params);
      const paths = normalizePaths(node.params?.paths);
      node.params.paths = paths;
      const activeIdx = clamp(Number(node.params?.activePath) || 0, 0, Math.max(0, paths.length - 1));
      node.params.activePath = activeIdx;
      const scale = Number(node.params?.scale) || 1;
      const bounds = getPathBounds(paths);
      const maskPaths = serializeMaskPaths(paths);

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.overflow = "visible";
      wrap.dataset.maskShape = "path";
      wrap.dataset.maskPathData = JSON.stringify(maskPaths);
      wrap.dataset.maskX = String(Number(node.params?.x) || 0);
      wrap.dataset.maskY = String(Number(node.params?.y) || 0);
      wrap.dataset.maskScale = String(scale);
      wrap.dataset.maskCx = String(bounds.cx);
      wrap.dataset.maskCy = String(bounds.cy);

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.position = "absolute";
      svg.style.left = (Number(node.params?.x) || 0) + "px";
      svg.style.top = (Number(node.params?.y) || 0) + "px";
      svg.style.pointerEvents = "none";
      svg.style.userSelect = "none";
      svg.style.overflow = "visible";
      svg.setAttribute("viewBox", "0 0 1280 720");
      svg.setAttribute("width", "1280");
      svg.setAttribute("height", "720");

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      if(scale !== 1){
        g.setAttribute("transform", `translate(${bounds.cx} ${bounds.cy}) scale(${scale}) translate(${-bounds.cx} ${-bounds.cy})`);
      }

      for(const path of paths){
        if(!path.visible) continue;
        const d = buildPathD(path.points, path.closed);
        if(!d) continue;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
        el.setAttribute("d", d);
        el.setAttribute("fill", path.closed ? path.fillColor : "none");
        el.setAttribute("fill-opacity", String(path.fillOpacity));
        el.setAttribute("stroke", path.strokeColor);
        el.setAttribute("stroke-width", String(path.strokeWidth));
        el.setAttribute("stroke-opacity", String(path.strokeOpacity));
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        g.appendChild(el);
      }

      g.dataset.boundId = node.id;
      svg.appendChild(g);
      wrap.appendChild(svg);

      return { el: wrap };
    },
    inspector: () => ([
      { k: "paths", type: "shapeManager", label: "Shapes" },
      { k: "scale", type: "range", label: "Scale", min: 0.1, max: 3, step: 0.1 },
      { k: "x", type: "range", label: "X", min: -640, max: 1280, step: 1 },
      { k: "y", type: "range", label: "Y", min: -360, max: 720, step: 1 }
    ])
  };
};
