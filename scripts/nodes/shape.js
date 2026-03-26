window.createOniwireShapeNodeDef = function createOniwireShapeNodeDef(){
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
        return `polygon(${cx}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px)`;
      case "diamond":
        return `polygon(${cx}px ${top}px, ${right}px ${cy}px, ${cx}px ${bottom}px, ${left}px ${cy}px)`;
      case "hexagon": {
        const rx = width / 2;
        const ry = height / 2;
        const pts = [];
        for(let i = 0; i < 6; i++){
          const a = (Math.PI / 3) * i - Math.PI / 6;
          pts.push(`${cx + rx * Math.cos(a)}px ${cy + ry * Math.sin(a)}px`);
        }
        return `polygon(${pts.join(", ")})`;
      }
      case "star": {
        const outer = Math.max(width, height) / 2;
        const inner = outer * 0.5;
        const pts = [];
        for(let i = 0; i < 10; i++){
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const r = i % 2 === 0 ? outer : inner;
          pts.push(`${cx + r * Math.cos(a)}px ${cy + r * Math.sin(a)}px`);
        }
        return `polygon(${pts.join(", ")})`;
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
        shape.style.transform = "rotate(45deg)";
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

  return {
    inputs: ["fill"],
    outputs: ["layer"],
    defaults: { shape: "circle", width: 120, height: 120, color: "#3b82f6", x: 100, y: 100, uniform: false },
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

      shape.style.left = (x - width / 2) + "px";
      shape.style.top = (y - height / 2) + "px";
      shape.style.width = width + "px";
      shape.style.height = height + "px";
      shape.style.background = fillValue;
      shape.style.backgroundColor = fallbackColor;
      applyBasicShapeStyle(shape, shapeType);

      if(fillLayer){
        const textured = fillLayer.cloneNode(true);
        textured.style.position = "absolute";
        textured.style.inset = "0";
        textured.style.clipPath = shapeClipPath(shapeType, x, y, width, height);
        textured.style.webkitClipPath = textured.style.clipPath;
        wrap.appendChild(textured);

        const bounds = document.createElement("div");
        bounds.dataset.boundId = node.id;
        bounds.style.position = "absolute";
        bounds.style.left = (x - width / 2) + "px";
        bounds.style.top = (y - height / 2) + "px";
        bounds.style.width = width + "px";
        bounds.style.height = height + "px";
        bounds.style.visibility = "hidden";
        bounds.style.pointerEvents = "none";
        wrap.appendChild(bounds);
      }else{
        wrap.appendChild(shape);
      }

      return { el: wrap };
    },
    inspector: () => ([
      { k: "shape", type: "select", label: "Shape", options: ["circle", "rectangle", "triangle", "diamond", "hexagon", "star"] },
      { k: "width", type: "range", label: "Width", min: 10, max: 1500, step: 1 },
      { k: "height", type: "range", label: "Height", min: 10, max: 1500, step: 1 },
      { k: "uniform", type: "checkbox", label: "Uniform" },
      { k: "color", type: "color", label: "Color" },
      { k: "x", type: "range", label: "X", min: 0, max: 1200, step: 1 },
      { k: "y", type: "range", label: "Y", min: 0, max: 1200, step: 1 }
    ])
  };
};
