window.createOniwireImageNodeDef = function createOniwireImageNodeDef(){
  return {
    inputs: [],
    outputs: ["layer"],
    defaults: {
      src: "",
      fileName: "",
      mimeType: "",
      x: 40,
      y: 40,
      width: 320,
      height: 180,
      fit: "contain",
      opacity: 100
    },
    icon: "🖼️",
    run: (node) => {
      const src = String(node.params?.src || "").trim();
      if(!src) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";

      const img = document.createElement("img");
      img.src = src;
      img.alt = String(node.params?.fileName || node.name || "Image");
      img.draggable = false;
      img.dataset.boundId = node.id;
      img.style.position = "absolute";
      img.style.left = (Number(node.params?.x) || 0) + "px";
      img.style.top = (Number(node.params?.y) || 0) + "px";
      img.style.width = Math.max(1, Number(node.params?.width) || 320) + "px";
      img.style.height = Math.max(1, Number(node.params?.height) || 180) + "px";
      img.style.objectFit = String(node.params?.fit || "contain");
      img.style.opacity = String(Math.max(0, Math.min(1, (Number(node.params?.opacity) || 100) / 100)));
      img.style.pointerEvents = "none";
      img.style.userSelect = "none";
      img.style.webkitUserDrag = "none";

      wrap.appendChild(img);
      return { el: wrap };
    },
    inspector: () => ([
      { k: "src", type: "imageUpload", label: "Image", accept: "image/*" },
      {
        k: "fit",
        type: "options",
        label: "Fit",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" },
          { label: "Stretch", value: "fill" }
        ]
      },
      { k: "width", type: "range", label: "Width", min: 10, max: 2000, step: 1 },
      { k: "height", type: "range", label: "Height", min: 10, max: 2000, step: 1 },
      { k: "opacity", type: "range", label: "Opacity", min: 0, max: 100, step: 1 },
      { k: "x", type: "range", label: "X", min: 0, max: 1200, step: 1 },
      { k: "y", type: "range", label: "Y", min: 0, max: 1200, step: 1 }
    ])
  };
};