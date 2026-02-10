window.createOniwireMotionNodeDef = function createOniwireMotionNodeDef({ ensureMotionStyles, measureLayerBounds, clamp }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { mode: "breath", amount: 0.08, speed: 2 },
    icon: "🫁",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      ensureMotionStyles();

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.dataset.hasMotion = "true";

      const clone = src.el.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.inset = "0";

      const bounds = measureLayerBounds(src.el);
      const motionLayer = document.createElement("div");
      motionLayer.style.position = "absolute";
      motionLayer.style.inset = "0";

      if(bounds){
        motionLayer.style.left = `${bounds.x}px`;
        motionLayer.style.top = `${bounds.y}px`;
        motionLayer.style.width = `${bounds.width}px`;
        motionLayer.style.height = `${bounds.height}px`;
        motionLayer.style.transformOrigin = "50% 50%";
        clone.style.transform = `translate(${-bounds.x}px, ${-bounds.y}px)`;
        clone.style.transformOrigin = "0 0";
      }else{
        motionLayer.style.inset = "0";
        motionLayer.style.transformOrigin = "50% 50%";
      }

      const mode = node.params.mode || "breath";
      const amount = clamp(Number(node.params.amount) || 0, 0, 0.5);
      const speed = Math.max(0.2, Number(node.params.speed) || 2);

      if(mode === "breath"){
        const minScale = Math.max(0.01, 1 - amount);
        const maxScale = 1 + amount;
        motionLayer.style.setProperty("--breath-min", String(minScale));
        motionLayer.style.setProperty("--breath-max", String(maxScale));
        motionLayer.style.animation = `oniwire-breath ${speed}s ease-in-out infinite`;
      }

      motionLayer.appendChild(clone);
      wrap.appendChild(motionLayer);
      return { el: wrap };
    },
    inspector: () => ([
      { k: "mode", type: "select", label: "Mode", options: ["breath"] },
      { k: "amount", type: "range", label: "Amount", min: 0, max: 0.5, step: 0.01 },
      { k: "speed", type: "range", label: "Speed (s)", min: 0.2, max: 6, step: 0.1 }
    ])
  };
};
