window.createOniwireKaleiNodeDef = function createOniwireKaleiNodeDef({ propagateMotionFlag, getCanvasSize }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: {
      mirrorAxis: "y"
    },
    icon: "✶",
    run: (node, inputs) => {
      try {
        const src = inputs.in;
        if(!src?.el) return null;

        const canvasSize = typeof getCanvasSize === "function" ? (getCanvasSize() || {}) : {};
        const w = Math.max(1, Number(canvasSize.width) || 1280);
        const h = Math.max(1, Number(canvasSize.height) || 720);
        const cx = w / 2;
        const cy = h / 2;

        const wrap = document.createElement("div");
        wrap.style.position = "absolute";
        wrap.style.inset = "0";
        wrap.style.overflow = "hidden";
        wrap.style.isolation = "isolate";
        propagateMotionFlag(wrap, src.el);

        const axis = String(node.params.mirrorAxis || "y").toLowerCase();

        const baseWrap = document.createElement("div");
        baseWrap.style.position = "absolute";
        baseWrap.style.inset = "0";

        const base = src.el.cloneNode(true);
        base.style.position = "absolute";
        base.style.inset = "0";
        baseWrap.appendChild(base);

        const mirrorWrap = document.createElement("div");
        mirrorWrap.style.position = "absolute";
        mirrorWrap.style.inset = "0";

        const mirrored = src.el.cloneNode(true);
        mirrored.style.position = "absolute";
        mirrored.style.inset = "0";
        mirrored.style.transformOrigin = `${cx}px ${cy}px`;
        mirrorWrap.appendChild(mirrored);

        if(axis === "x"){
          baseWrap.style.clipPath = "inset(0 0 50% 0)";
          baseWrap.style.webkitClipPath = "inset(0 0 50% 0)";
          mirrorWrap.style.clipPath = "inset(50% 0 0 0)";
          mirrorWrap.style.webkitClipPath = "inset(50% 0 0 0)";
          mirrored.style.transform = "scaleY(-1)";
        }else{
          baseWrap.style.clipPath = "inset(0 50% 0 0)";
          baseWrap.style.webkitClipPath = "inset(0 50% 0 0)";
          mirrorWrap.style.clipPath = "inset(0 0 0 50%)";
          mirrorWrap.style.webkitClipPath = "inset(0 0 0 50%)";
          mirrored.style.transform = "scaleX(-1)";
        }

        wrap.appendChild(baseWrap);
        wrap.appendChild(mirrorWrap);

        return { el: wrap };
      } catch (err) {
        console.warn("Mirror node fallback:", err);
        return inputs.in || null;
      }
    },
    inspector: () => ([
      { k: "mirrorAxis", type: "select", label: "Mirror Axis", options: ["x", "y"] }
    ])
  };
};
