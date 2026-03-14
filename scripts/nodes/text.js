window.createOniwireTextNodeDef = function createOniwireTextNodeDef(){
  return {
    inputs: ["fill"],
    outputs: ["layer"],
    defaults: {
      text: "Hello 👋",
      size: 44,
      color: "#ffffff",
      x: 40,
      y: 60,
      weight: 700,
      font: "Inter",
      align: "left",
      wrapMode: "manual",
      boxWidth: 560
    },
    icon: "🔤",
    run: (node, inputs) => {
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

      const alignRaw = String(node.params.align || "left").toLowerCase();
      const align = (alignRaw === "center" || alignRaw === "right") ? alignRaw : "left";
      t.style.textAlign = align;
      t.style.transform = align === "center"
        ? "translateX(-50%)"
        : (align === "right" ? "translateX(-100%)" : "none");
      t.style.transformOrigin = align === "left"
        ? "left top"
        : (align === "center" ? "center top" : "right top");

      const fillLayer = inputs?.fill?.el || null;
      if(fillLayer){
        const cs = window.getComputedStyle(fillLayer);
        const inlineBg = String(fillLayer.style.background || "");
        const inlineBgImg = String(fillLayer.style.backgroundImage || "");
        const computedBgImg = String(cs.backgroundImage || "");
        const computedBgColor = String(cs.backgroundColor || "");

        const inlineHasGradient = inlineBg.includes("gradient(") || inlineBgImg.includes("gradient(");
        const gradientValue = inlineHasGradient
          ? (inlineBg.includes("gradient(") ? inlineBg : inlineBgImg)
          : (computedBgImg !== "none" ? computedBgImg : "");

        if(gradientValue){
          t.style.background = gradientValue;
          t.style.backgroundClip = "text";
          t.style.webkitBackgroundClip = "text";
          t.style.color = "transparent";
          t.style.webkitTextFillColor = "transparent";
        }else{
          const colorValue = inlineBg && !inlineBg.includes("gradient(")
            ? inlineBg
            : ((computedBgColor && computedBgColor !== "rgba(0, 0, 0, 0)" && computedBgColor !== "transparent")
                ? computedBgColor
                : String(node.params.color || "#ffffff"));
          t.style.background = "none";
          t.style.backgroundClip = "border-box";
          t.style.webkitBackgroundClip = "border-box";
          t.style.webkitTextFillColor = "initial";
          t.style.color = colorValue;
        }
      }

      const wrapMode = String(node.params.wrapMode || "manual");
      if(wrapMode === "box"){
        const boxWidth = Math.max(80, Number(node.params.boxWidth) || 560);
        t.style.whiteSpace = "pre-wrap";
        t.style.overflowWrap = "break-word";
        t.style.wordBreak = "normal";
        t.style.width = boxWidth + "px";
        t.style.maxWidth = boxWidth + "px";
      }else{
        // Manual mode: only explicit newlines break the text.
        t.style.whiteSpace = "pre";
        t.style.overflowWrap = "normal";
        t.style.wordBreak = "normal";
        t.style.width = "auto";
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
      {
        k: "align",
        type: "options",
        label: "Align",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" }
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
