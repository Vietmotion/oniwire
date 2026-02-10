window.createOniwireGradientNodeDef = function createOniwireGradientNodeDef({ normalizeRampStops }){
  return {
    inputs: ["ramp"],
    outputs: ["layer"],
    defaults: { a: "#0ea5e9", b: "#22c55e", angle: 45, type: "linear", cx: 50, cy: 50 },
    icon: "🌈",
    run: (node, inputs) => {
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.inset = "0";
      const type = node.params.type || "linear";
      const rampStops = inputs.ramp?.stops ? normalizeRampStops(inputs.ramp.stops) : [];

      const stops = rampStops.length >= 2
        ? rampStops
        : [
            { pos: 0, color: node.params.a || "#000000" },
            { pos: 100, color: node.params.b || "#ffffff" }
          ];

      const stopList = stops.map(s => `${s.color} ${s.pos}%`).join(", ");

      el.dataset.gradType = type;
      el.dataset.gradAngle = String(node.params.angle ?? 0);
      el.dataset.gradCx = String(node.params.cx ?? 50);
      el.dataset.gradCy = String(node.params.cy ?? 50);
      el.dataset.gradStops = JSON.stringify(stops);

      if(type === "radial"){
        const cx = Number(node.params.cx ?? 50);
        const cy = Number(node.params.cy ?? 50);
        el.style.background = `radial-gradient(circle at ${cx}% ${cy}%, ${stopList})`;
      }else{
        el.style.background = `linear-gradient(${Number(node.params.angle) || 0}deg, ${stopList})`;
      }
      return { el };
    },
    inspector: () => ([
      { k: "type", type: "select", label: "Type", options: ["linear", "radial"] },
      { k: "a", type: "color", label: "Color A" },
      { k: "b", type: "color", label: "Color B" },
      { k: "angle", type: "knob", label: "Angle", min: 0, max: 360, step: 1, showIf: { k: "type", equals: "linear" } },
      { k: "cx", type: "range", label: "Center X %", min: 0, max: 100, step: 1, showIf: { k: "type", equals: "radial" } },
      { k: "cy", type: "range", label: "Center Y %", min: 0, max: 100, step: 1, showIf: { k: "type", equals: "radial" } }
    ])
  };
};
