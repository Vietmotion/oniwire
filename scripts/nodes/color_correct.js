window.createOniwireColorCorrectNodeDef = function createOniwireColorCorrectNodeDef({ propagateMotionFlag, clamp }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { brightness: 100, contrast: 100, saturation: 100, hue: 0, temperature: 0 },
    icon: "🎨",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.isolation = "isolate";
      propagateMotionFlag(wrap, src.el);

      const clone = src.el.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.inset = "0";

      const brightness  = clamp(Number(node.params.brightness)  ?? 100, 0, 400);
      const contrast    = clamp(Number(node.params.contrast)    ?? 100, 0, 400);
      const saturation  = clamp(Number(node.params.saturation)  ?? 100, 0, 400);
      const hue         = Number(node.params.hue)         || 0;
      const temp        = clamp(Number(node.params.temperature) ?? 0, -100, 100);

      // Temperature: warm (>0) adds sepia + slight red shift; cool (<0) shifts toward blue
      const sepiaAmount  = temp > 0 ? (temp / 100) * 40 : 0;
      const hueFromTemp  = temp > 0 ? -(temp / 100) * 10 : (Math.abs(temp) / 100) * 25;

      const filters = [
        `brightness(${brightness}%)`,
        `contrast(${contrast}%)`,
        `saturate(${saturation}%)`,
        `hue-rotate(${hue + hueFromTemp}deg)`,
      ];
      if(sepiaAmount > 0) filters.push(`sepia(${sepiaAmount}%)`);

      clone.style.filter = filters.join(" ");
      wrap.appendChild(clone);
      return { el: wrap };
    },
    inspector: () => ([
      { k: "brightness",   type: "range", label: "Brightness",   min: 0,    max: 200, step: 1 },
      { k: "contrast",     type: "range", label: "Contrast",     min: 0,    max: 200, step: 1 },
      { k: "saturation",   type: "range", label: "Saturation",   min: 0,    max: 200, step: 1 },
      { k: "hue",          type: "range", label: "Hue Rotate",   min: -180, max: 180, step: 1 },
      { k: "temperature",  type: "range", label: "Temperature",  min: -100, max: 100, step: 1 }
    ])
  };
};
