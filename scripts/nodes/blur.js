window.createOniwireBlurNodeDef = function createOniwireBlurNodeDef({ propagateMotionFlag, clamp }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { radius: 12 },
    icon: "🌫️",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.overflow = "visible";
      propagateMotionFlag(wrap, src.el);

      const clone = src.el.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.inset = "0";

      const radius = clamp(Number(node.params.radius) || 0, 0, 200);
      clone.style.filter = radius > 0 ? `blur(${radius}px)` : "none";

      wrap.appendChild(clone);
      return { el: wrap };
    },
    inspector: () => ([
      { k: "radius", type: "range", label: "Radius", min: 0, max: 120, step: 1 }
    ])
  };
};
