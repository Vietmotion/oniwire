window.createOniwireTransformNodeDef = function createOniwireTransformNodeDef({ propagateMotionFlag, state }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { x:0, y:0, scale:1, rot:0, originX:0, originY:0 },
    icon: "↔️",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.isolation = "isolate";
      propagateMotionFlag(wrap, src.el);

      const clone = src.el.cloneNode(true);
      wrap.appendChild(clone);

      const x = Number(node.params.x) || 0;
      const y = Number(node.params.y) || 0;
      const s = Number(node.params.scale) || 1;
      const r = Number(node.params.rot) || 0;
      const ox = Number(node.params.originX) ?? 0;
      const oy = Number(node.params.originY) ?? 0;

      const oxPercent = (ox + 100) / 2;
      const oyPercent = (oy + 100) / 2;

      clone.style.transformOrigin = `${oxPercent}% ${oyPercent}%`;
      clone.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;

      if(state.selected === node.id){
        const pivot = document.createElement("div");
        pivot.style.position = "absolute";
        pivot.style.left = `calc(${oxPercent}% + ${x}px)`;
        pivot.style.top = `calc(${oyPercent}% + ${y}px)`;
        pivot.style.width = "32px";
        pivot.style.height = "32px";
        pivot.style.marginLeft = "-16px";
        pivot.style.marginTop = "-16px";
        pivot.style.pointerEvents = "none";
        pivot.style.zIndex = "9999";

        pivot.innerHTML = `
          <svg width="32" height="32" style="display:block;">
            <circle cx="16" cy="16" r="6" fill="none" stroke="rgba(122,167,255,0.8)" stroke-width="1.5"/>
            <line x1="16" y1="0" x2="16" y2="32" stroke="rgba(122,167,255,0.6)" stroke-width="1"/>
            <line x1="0" y1="16" x2="32" y2="16" stroke="rgba(122,167,255,0.6)" stroke-width="1"/>
            <line x1="16" y1="3" x2="16" y2="9" stroke="rgba(255,255,255,0.85)" stroke-width="1.2"/>
            <polyline points="13,6 16,3 19,6" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="23" y1="16" x2="29" y2="16" stroke="rgba(255,255,255,0.85)" stroke-width="1.2"/>
            <polyline points="26,13 29,16 26,19" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        wrap.appendChild(pivot);
      }

      return { el: wrap };
    },
    inspector: () => ([
      {k:"x", type:"range", label:"X", min:-600, max:600, step:1},
      {k:"y", type:"range", label:"Y", min:-600, max:600, step:1},
      {k:"scale", type:"range", label:"Scale", min:0.05, max:5, step:0.01},
      {k:"rot", type:"range", label:"Rotate°", min:-360, max:360, step:1},
      {k:"originX", type:"range", label:"Pivot X", min:-100, max:100, step:0.5},
      {k:"originY", type:"range", label:"Pivot Y", min:-100, max:100, step:0.5}
    ])
  };
};