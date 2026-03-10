window.createOniwireTextNodeDef = function createOniwireTextNodeDef(){
  return {
    inputs: [],
    outputs: ["layer"],
    defaults: {
      text: "Hello 👋",
      size: 44,
      color: "#ffffff",
      x: 40,
      y: 60,
      weight: 700,
      font: "Inter",
      wrapMode: "manual",
      boxWidth: 560
    },
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

      const wrapMode = String(node.params.wrapMode || "manual");
      if(wrapMode === "box"){
        const boxWidth = Math.max(80, Number(node.params.boxWidth) || 560);
        t.style.whiteSpace = "pre-wrap";
        t.style.overflowWrap = "break-word";
        t.style.wordBreak = "normal";
        t.style.maxWidth = boxWidth + "px";
      }else{
        // Manual mode: only explicit newlines break the text.
        t.style.whiteSpace = "pre";
        t.style.overflowWrap = "normal";
        t.style.wordBreak = "normal";
        t.style.maxWidth = "none";
      }
      wrap.appendChild(t);

      return { el: wrap };
    },
    inspector: () => ([
      { k: "text", type: "textarea", label: "Text" },
      {
        k: "font",
        type: "select",
        label: "Font",
        options: [
          "Inter",
          "Poppins",
          "Montserrat",
          "Roboto",
          "Arial",
          "Helvetica",
          "Verdana",
          "Tahoma",
          "Trebuchet MS",
          "Georgia",
          "Times New Roman",
          "Courier New"
        ]
      },
      {
        k: "weight",
        type: "select",
        label: "Font family",
        options: [
          { label: "Thin", value: "100" },
          { label: "Extra Light", value: "200" },
          { label: "Light", value: "300" },
          { label: "Normal", value: "400" },
          { label: "Medium", value: "500" },
          { label: "Semi Bold", value: "600" },
          { label: "Bold", value: "700" },
          { label: "Extra Bold", value: "800" },
          { label: "Black", value: "900" }
        ]
      },
      { k: "wrapMode", type: "select", label: "Line Break", options: ["manual", "box"] },
      { k: "boxWidth", type: "range", label: "Box Width", min: 80, max: 1200, step: 1, showIf: { k: "wrapMode", equals: "box" } },
      { k: "size", type: "range", label: "Size", min: 8, max: 300, step: 1 },
      { k: "color", type: "color", label: "Color" },
      { k: "x", type: "range", label: "X", min: 0, max: 1200, step: 1 },
      { k: "y", type: "range", label: "Y", min: 0, max: 1200, step: 1 }
    ])
  };
};
