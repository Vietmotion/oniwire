window.createOniwireShapeNodeDef = function createOniwireShapeNodeDef(){
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
      shape.style.borderLeft = "none";
      shape.style.borderRight = "none";
      shape.style.borderBottom = "none";
      shape.style.clipPath = "none";
      shape.style.webkitClipPath = "none";

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
          shape.style.transform = "rotate(45deg)";
          shape.style.transformOrigin = "center";
          break;
        case "hexagon":
          shape.style.clipPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
          break;
        case "star":
          shape.style.clipPath = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
          break;
      }

      wrap.appendChild(shape);
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
