window.createOniwireShapeNodeDef = function createOniwireShapeNodeDef(){
  return {
    inputs: [],
    outputs: ["layer"],
    defaults: { shape: "circle", size: 120, color: "#3b82f6", x: 100, y: 100 },
    icon: "🔷",
    run: (node) => {
      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";

      const shape = document.createElement("div");
      shape.style.position = "absolute";
      shape.dataset.boundId = node.id;

      const size = Number(node.params.size) || 100;
      const x = Number(node.params.x) || 0;
      const y = Number(node.params.y) || 0;
      const color = node.params.color || "#3b82f6";
      const shapeType = node.params.shape || "circle";

      wrap.dataset.maskShape = shapeType;
      wrap.dataset.maskSize = String(size);
      wrap.dataset.maskX = String(x);
      wrap.dataset.maskY = String(y);
      wrap.dataset.maskColor = color;

      shape.style.left = (x - size / 2) + "px";
      shape.style.top = (y - size / 2) + "px";
      shape.style.width = size + "px";
      shape.style.height = size + "px";
      shape.style.backgroundColor = color;

      switch(shapeType){
        case "circle":
          shape.style.borderRadius = "50%";
          break;
        case "square":
          shape.style.borderRadius = "0";
          break;
        case "triangle":
          shape.style.width = "0";
          shape.style.height = "0";
          shape.style.backgroundColor = "transparent";
          shape.style.borderLeft = (size / 2) + "px solid transparent";
          shape.style.borderRight = (size / 2) + "px solid transparent";
          shape.style.borderBottom = size + "px solid " + color;
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
      { k: "shape", type: "select", label: "Shape", options: ["circle", "square", "triangle", "diamond", "hexagon", "star"] },
      { k: "size", type: "range", label: "Size", min: 10, max: 400, step: 1 },
      { k: "color", type: "color", label: "Color" },
      { k: "x", type: "range", label: "X", min: 0, max: 1200, step: 1 },
      { k: "y", type: "range", label: "Y", min: 0, max: 1200, step: 1 }
    ])
  };
};
