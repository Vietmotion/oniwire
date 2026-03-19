window.createOniwireMotionNodeDef = function createOniwireMotionNodeDef({ ensureMotionStyles, measureLayerBounds, clamp }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { mode: "breath", amount: 0.08, speed: 1, random: 0, direction: "clockwise" },
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
        const cx = bounds.x + (bounds.width / 2);
        const cy = bounds.y + (bounds.height / 2);
        motionLayer.style.transformOrigin = `${cx}px ${cy}px`;
      }else{
        motionLayer.style.inset = "0";
        motionLayer.style.transformOrigin = "50% 50%";
      }

      const mode = node.params.mode || "breath";
      const amount = clamp(Number(node.params.amount) || 0, 0, 0.5);
      const speed = clamp(Number(node.params.speed) || 1, 0.1, 10);
      const cycleSeconds = 1 / speed;
      const random = clamp(Number(node.params.random) || 0, 0, 1);
      const direction = String(node.params.direction || "clockwise").toLowerCase() === "counter-clockwise"
        ? "counter-clockwise"
        : "clockwise";

      if(mode === "breath"){
        const minScale = Math.max(0.01, 1 - amount);
        const maxScale = 1 + amount;
        motionLayer.style.setProperty("--breath-min", String(minScale));
        motionLayer.style.setProperty("--breath-max", String(maxScale));
        motionLayer.style.animation = `oniwire-breath ${cycleSeconds}s ease-in-out infinite`;
      }else if(mode === "circle"){
        motionLayer.style.animation = `oniwire-circle ${cycleSeconds}s linear infinite`;
        motionLayer.style.animationDirection = direction === "counter-clockwise" ? "reverse" : "normal";
      }else if(mode === "wiggle"){
        const baseSize = bounds
          ? Math.max(1, Math.min(bounds.width, bounds.height))
          : 100;
        const radius = Math.max(0, baseSize * amount);
        const jitter = radius * random;
        if(motionLayer.animate){
          const steps = 16;
          const keyframes = [];
          for(let i = 0; i <= steps; i++){
            const t = (i / steps) * (Math.PI * 2);
            const x = (Math.cos(t) * radius) + ((Math.random() * 2 - 1) * jitter);
            const y = (Math.sin(t) * radius) + ((Math.random() * 2 - 1) * jitter);
            keyframes.push({ transform: `translate(${x}px, ${y}px)` });
          }
          motionLayer.animate(keyframes, {
            duration: cycleSeconds * 1000,
            iterations: Infinity,
            easing: "linear"
          });
        }else{
          motionLayer.style.setProperty("--circle-radius", `${radius}px`);
          motionLayer.style.animation = `oniwire-wiggle-fallback ${cycleSeconds}s linear infinite`;
        }
      }

      motionLayer.appendChild(clone);
      wrap.appendChild(motionLayer);
      return { el: wrap };
    },
    inspector: () => ([
      { k: "mode", type: "select", label: "Mode", options: ["breath", "circle", "wiggle"] },
      { k: "direction", type: "select", label: "Direction", options: ["clockwise", "counter-clockwise"], showIf: { k: "mode", equals: "circle" } },
      { k: "amount", type: "range", label: "Amount", min: 0, max: 0.5, step: 0.01, showIf: node => (node.params?.mode || "breath") !== "circle" },
      { k: "random", type: "range", label: "Random", min: 0, max: 1, step: 0.01, showIf: { k: "mode", equals: "wiggle" } },
      { k: "speed", type: "range", label: "Speed", min: 0.1, max: 10, step: 0.1 }
    ])
  };
};
