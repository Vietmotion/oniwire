window.createOniwireRampNodeDef = function createOniwireRampNodeDef({ normalizeRampStops }){
  return {
    inputs: [],
    outputs: ["ramp"],
    defaults: {
      stops: [
        { pos: 0, color: "#0ea5e9" },
        { pos: 100, color: "#22c55e" }
      ]
    },
    icon: "🎚️",
    run: (node) => ({ stops: normalizeRampStops(node.params.stops) }),
    inspector: () => ([
      { k: "stops", type: "ramp", label: "Stops" }
    ])
  };
};
