window.createOniwireParticleNodeDef = function createOniwireParticleNodeDef({ getCanvasSize }){
  const clamp = (v, min, max) => {
    const n = Number(v);
    if(!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const lerp = (a, b, t) => a + ((b - a) * t);

  const parseHexColor = (hex) => {
    const raw = String(hex || "").trim();
    if(/^#[0-9a-fA-F]{3}$/.test(raw)){
      const r = parseInt(raw[1] + raw[1], 16);
      const g = parseInt(raw[2] + raw[2], 16);
      const b = parseInt(raw[3] + raw[3], 16);
      return { r, g, b };
    }
    if(/^#[0-9a-fA-F]{6}$/.test(raw)){
      const r = parseInt(raw.slice(1, 3), 16);
      const g = parseInt(raw.slice(3, 5), 16);
      const b = parseInt(raw.slice(5, 7), 16);
      return { r, g, b };
    }
    return { r: 255, g: 255, b: 255 };
  };

  const hashString = (text) => {
    let h = 2166136261;
    for(let i = 0; i < text.length; i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const createRng = (seed) => {
    let t = (seed >>> 0) || 1;
    return () => {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), t | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  };

  const ensureParticleAnimStyles = () => {
    if(typeof document === "undefined") return;
    if(document.getElementById("oniwireParticleAnimStyles")) return;
    const style = document.createElement("style");
    style.id = "oniwireParticleAnimStyles";
    style.textContent = `
@keyframes oniwireParticleFloat {
  0% { transform: translate(-50%, -50%) translate(0px, 0px); }
  50% { transform: translate(-50%, -50%) translate(var(--mv-x, 8px), var(--mv-y, -8px)); }
  100% { transform: translate(-50%, -50%) translate(0px, 0px); }
}
@keyframes oniwireParticleBlast {
  0% { transform: translate(-50%, -50%) translate(0px, 0px); }
  100% { transform: translate(-50%, -50%) translate(var(--mv-x, 40px), var(--mv-y, -40px)); }
}
@keyframes oniwireParticleFall {
  0% { transform: translate(-50%, -50%) translate(var(--mv-x, 0px), calc(-1 * var(--mv-drop, 40px))); }
  100% { transform: translate(-50%, -50%) translate(var(--mv-x, 0px), var(--mv-drop, 40px)); }
}
@keyframes oniwireParticleTwirl {
  0% { transform: translate(-50%, -50%) rotate(0deg) translateX(var(--mv-r, 14px)) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg) translateX(var(--mv-r, 14px)) rotate(-360deg); }
}`;
    document.head.appendChild(style);
  };

  const parseCssRgb = (value) => {
    const raw = String(value || "").trim();
    if(/^#[0-9a-fA-F]{3,6}$/.test(raw)) return parseHexColor(raw);
    const m = raw.match(/^rgba?\(([^)]+)\)$/i);
    if(!m) return null;
    const parts = m[1].split(",").map(s => Number(s.trim()));
    if(parts.length < 3) return null;
    if(!Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) || !Number.isFinite(parts[2])) return null;
    return {
      r: clamp(parts[0], 0, 255),
      g: clamp(parts[1], 0, 255),
      b: clamp(parts[2], 0, 255)
    };
  };

  const resolveColorInputRgb = (inputLayerEl) => {
    if(!(inputLayerEl instanceof HTMLElement)) return null;
    const cs = window.getComputedStyle(inputLayerEl);
    const bg = parseCssRgb(inputLayerEl.style.backgroundColor || "")
      || parseCssRgb(cs.backgroundColor || "");
    if(bg) return bg;
    const fg = parseCssRgb(inputLayerEl.style.color || "")
      || parseCssRgb(cs.color || "");
    return fg || null;
  };

  const localClipFromShapeType = (shapeType) => {
    switch(String(shapeType || "").toLowerCase()){
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
  };

  const resolveParticleShapeType = (shapeInputEl, fallbackShape) => {
    const linked = String(shapeInputEl?.dataset?.maskShape || "").trim().toLowerCase();
    if(linked === "rect") return "rectangle";
    if(linked === "square") return "rectangle";
    if(linked === "start") return "star";
    if(["circle", "rectangle", "triangle", "diamond", "hexagon", "star"].includes(linked)) return linked;
    const fb = String(fallbackShape || "circle").trim().toLowerCase();
    return fb === "square" ? "rectangle" : (fb || "circle");
  };

  return {
    inputs: ["color", "shape"],
    outputs: ["layer"],
    defaults: {
      count: 140,
      shape: "circle",
      x: 640,
      y: 360,
      areaWidth: 1100,
      areaHeight: 560,
      sizeMin: 2,
      sizeMax: 10,
      opacity: 85,
      opacityRandom: 0,
      color: "#60a5fa",
      colorVariant: 18,
      blur: 0,
      movement: "floating",
      movementAmount: 40,
      movementSpeed: 100,
      seed: 1
    },
    icon: "✨",
    run: (node, inputs) => {
      ensureParticleAnimStyles();

      const canvasSize = (typeof getCanvasSize === "function") ? getCanvasSize() : { width: 1280, height: 720 };
      let cx = clamp(Number(node.params?.x ?? canvasSize.width / 2), -3000, 3000);
      let cy = clamp(Number(node.params?.y ?? canvasSize.height / 2), -3000, 3000);
      let areaW = Math.max(1, Number(node.params?.areaWidth) || canvasSize.width);
      let areaH = Math.max(1, Number(node.params?.areaHeight) || canvasSize.height);

      const shapeInputEl = inputs?.shape?.el || null;
      const particleShapeType = resolveParticleShapeType(shapeInputEl, node.params?.shape);

      const sizeMin = Math.max(0.2, Number(node.params?.sizeMin) || 1);
      const sizeMax = Math.max(sizeMin, Number(node.params?.sizeMax) || sizeMin);
      const count = Math.max(0, Math.min(500, Math.round(Number(node.params?.count) || 0)));
      const opacityBase = clamp(Number(node.params?.opacity) || 100, 0, 100) / 100;
      const opacityRandom = clamp(Number(node.params?.opacityRandom) || 0, 0, 100) / 100;
      const blurPx = Math.max(0, Number(node.params?.blur) || 0);
      const movement = String(node.params?.movement || "floating").toLowerCase();
      const movementAmount = clamp(Number(node.params?.movementAmount) || 0, 0, 100) / 100;
      const movementSpeed = clamp(Number(node.params?.movementSpeed) || 100, 1, 300) / 100;
      const shape = particleShapeType;

      const inputRgb = resolveColorInputRgb(inputs?.color?.el || null);
      const baseColor = inputRgb || parseHexColor(String(node.params?.color || "#ffffff"));
      const colorVariant = clamp(Number(node.params?.colorVariant) || 0, 0, 100) / 100;

      const rngSeed = hashString(`${node.id}:${Number(node.params?.seed) || 0}`);
      const rnd = createRng(rngSeed);

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.pointerEvents = "none";
      wrap.style.overflow = "hidden";

      const layer = document.createElement("div");
      layer.dataset.boundId = node.id;
      layer.style.position = "absolute";
      layer.style.left = `${cx - (areaW / 2)}px`;
      layer.style.top = `${cy - (areaH / 2)}px`;
      layer.style.width = `${areaW}px`;
      layer.style.height = `${areaH}px`;
      layer.style.pointerEvents = "none";
      layer.style.overflow = "visible";
      wrap.appendChild(layer);

      const baseMotionPx = clamp((Math.min(areaW, areaH) * 0.075), 10, 140) * movementAmount;
      const canMove = movementAmount > 0.001;
      const moveAnimName = movement === "blast"
        ? "oniwireParticleBlast"
        : (movement === "falling"
          ? "oniwireParticleFall"
          : (movement === "twirling" ? "oniwireParticleTwirl" : "oniwireParticleFloat"));

      for(let i = 0; i < count; i++){
        const p = document.createElement("div");
        const rx = rnd();
        const ry = rnd();
        const ro = rnd();
        const rs = rnd();

        const size = lerp(sizeMin, sizeMax, rs);
        const shade = lerp(1 - colorVariant, 1 + colorVariant, rnd());
        const c = {
          r: Math.round(clamp(baseColor.r * shade, 0, 255)),
          g: Math.round(clamp(baseColor.g * shade, 0, 255)),
          b: Math.round(clamp(baseColor.b * shade, 0, 255))
        };
        const alpha = clamp(opacityBase * lerp(1 - opacityRandom, 1, ro), 0, 1);

        p.style.position = "absolute";
        p.style.left = `${rx * areaW}px`;
        p.style.top = `${ry * areaH}px`;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.transform = "translate(-50%, -50%)";
        p.style.borderRadius = shape === "circle" ? "999px" : "0";
        const shapeClip = localClipFromShapeType(shape);
        if(shapeClip){
          p.style.clipPath = shapeClip;
          p.style.webkitClipPath = shapeClip;
        }
        p.style.background = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha.toFixed(3)})`;
        if(blurPx > 0) p.style.filter = `blur(${blurPx}px)`;

        if(canMove){
          if(movement === "twirling"){
            p.style.setProperty("--mv-r", `${Math.max(2, lerp(baseMotionPx * 0.2, baseMotionPx, rnd())).toFixed(2)}px`);
          }else if(movement === "falling"){
            p.style.setProperty("--mv-x", `${lerp(-baseMotionPx * 0.35, baseMotionPx * 0.35, rnd()).toFixed(2)}px`);
            p.style.setProperty("--mv-drop", `${Math.max(10, lerp(baseMotionPx * 0.6, baseMotionPx * 1.4, rnd())).toFixed(2)}px`);
          }else{
            const ang = rnd() * Math.PI * 2;
            const dist = Math.max(6, lerp(baseMotionPx * 0.35, baseMotionPx, rnd()));
            p.style.setProperty("--mv-x", `${(Math.cos(ang) * dist).toFixed(2)}px`);
            p.style.setProperty("--mv-y", `${(Math.sin(ang) * dist).toFixed(2)}px`);
          }

          const baseDur = movement === "blast" ? 1.25 : (movement === "falling" ? 2.6 : (movement === "twirling" ? 2.1 : 2.4));
          const dur = lerp(baseDur * 0.75, baseDur * 1.35, rnd()) / movementSpeed;
          const delay = -lerp(0, dur, rnd());
          const timing = movement === "blast" ? "cubic-bezier(.18,.72,.22,1)" : "ease-in-out";
          const direction = movement === "blast" ? "alternate" : "alternate";
          p.style.animation = `${moveAnimName} ${dur.toFixed(2)}s ${timing} ${delay.toFixed(2)}s infinite ${direction}`;
        }

        layer.appendChild(p);
      }

      return { el: wrap };
    },
    inspector: () => ([
      { k: "count", type: "range", label: "Count", min: 0, max: 500, step: 1 },
      { k: "shape", type: "options", label: "Shape", options: ["circle", "square"], disabledIfConnected: "shape", disabledTitle: "Controlled by connected Shape input." },
      { k: "color", type: "color", label: "Color", disabledIfConnected: "color", disabledTitle: "Controlled by connected Color input." },
      { k: "colorVariant", type: "range", label: "Color Variant", min: 0, max: 100, step: 1 },
      { k: "opacity", type: "range", label: "Opacity", min: 0, max: 100, step: 1 },
      { k: "opacityRandom", type: "range", label: "Opacity Random", min: 0, max: 100, step: 1 },
      { k: "blur", type: "range", label: "Blur", min: 0, max: 12, step: 0.1 },
      { k: "sizeMin", type: "range", label: "Size Min", min: 0.2, max: 80, step: 0.1 },
      { k: "sizeMax", type: "range", label: "Size Max", min: 0.2, max: 120, step: 0.1 },
      { k: "areaWidth", type: "range", label: "Area Width", min: 1, max: 2400, step: 1 },
      { k: "areaHeight", type: "range", label: "Area Height", min: 1, max: 1600, step: 1 },
      { type: "compactScrub2d", label: "Position", kx: "x", ky: "y", lx: "X", ly: "Y", minX: -1200, maxX: 2400, minY: -1200, maxY: 1600, step: 1 },
      { k: "movement", type: "select", label: "Movement", options: ["floating", "blast", "falling", "twirling"] },
      { k: "movementAmount", type: "range", label: "Move Amount", min: 0, max: 100, step: 1 },
      { k: "movementSpeed", type: "range", label: "Move Speed", min: 1, max: 300, step: 1 },
      { k: "seed", type: "number", label: "Seed", min: 0, max: 999999, step: 1 }
    ])
  };
};
