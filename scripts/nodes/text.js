window.createOniwireTextNodeDef = function createOniwireTextNodeDef(){
  return {
    inputs: [],
    outputs: ["layer"],
    defaults: { text: "Hello 👋", size: 44, color: "#ffffff", x: 40, y: 60, weight: 700, font: "Inter" },
    icon: "🔤",
    run: (node) => {
      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";

      const t = document.createElement("div");
      t.textContent = node.params.text ?? "";
      t.style.position = "absolute";
      t.dataset.boundId = node.id;
      t.style.left = (Number(node.params.x) || 0) + "px";
      t.style.top = (Number(node.params.y) || 0) + "px";
      t.style.color = node.params.color;
      t.style.fontSize = (Number(node.params.size) || 32) + "px";
      t.style.fontWeight = String(node.params.weight || 700);
      t.style.fontFamily = node.params.font || "Inter";
      t.style.whiteSpace = "pre-wrap";
      t.style.overflowWrap = "break-word";
      t.style.maxWidth = "calc(100% - 40px)";
      wrap.appendChild(t);

      return { el: wrap };
    },
    inspector: () => ([
      { k: "text", type: "textarea", label: "Text" },
      { k: "font", type: "select", label: "Font", options: ["Inter", "Poppins", "Montserrat", "Roboto", "Arial", "Georgia", "Times New Roman", "Courier New"] },
      { k: "size", type: "number", label: "Size" },
      { k: "color", type: "color", label: "Color" },
      { k: "x", type: "range", label: "X", min: 0, max: 1200, step: 1 },
      { k: "y", type: "range", label: "Y", min: 0, max: 1200, step: 1 },
      { k: "weight", type: "number", label: "Weight" }
    ])
  };
};
