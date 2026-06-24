window.createOniwireRerouteNodeDef = function createOniwireRerouteNodeDef(){
  return {
    inputs: ["in"],
    outputs: ["out"],
    defaults: {},
    icon: "•",
    isReroute: true,
    run: (_node, inputs) => {
      // Pure pass-through: return exactly what came in, no cloning.
      const val = inputs.in;
      if(val == null) return null;
      return val;
    },
    inspector: () => ([])
  };
};
