window.createOniwireColorNodeDef = function createOniwireColorNodeDef(){
  return {
    inputs: [],
    outputs: ["layer"],
    defaults: { color: "#1e293b" },
    icon: "🟦",
    run: (node) => {
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.inset = "0";
      el.style.background = node.params.color;
      return { el };
    },
    inspector: () => ([
      { k: "color", type: "color", label: "Color" }
    ])
  };
};
