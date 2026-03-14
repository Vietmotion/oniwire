window.createOniwireCloneNodeDef = function createOniwireCloneNodeDef({ propagateMotionFlag }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: {
      mode: "x",
      radialMode: "simple",
      countX: 5,
      countY: 5,
      stepX: 40,
      stepY: 40,
      radialCount: 8,
      radius: 140,
      angleStart: 0,
      angleStep: 45,
      centerX: 0,
      centerY: 0
    },
    icon: "🌀",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      propagateMotionFlag(wrap, src.el);

      const mode = node.params.mode || "x";
      const countX = Math.max(1, Number(node.params.countX) || 1);
      const countY = Math.max(1, Number(node.params.countY) || 1);
      const stepX = Number(node.params.stepX) || 0;
      const stepY = Number(node.params.stepY) || 0;
      const radialCount = Math.max(1, Number(node.params.radialCount) || 1);
      const radius = Number(node.params.radius) || 0;
      const radialMode = String(node.params.radialMode || "simple");
      const angleStart = Number(node.params.angleStart) || 0;
      const angleStep = Number(node.params.angleStep) || 0;
      const centerX = Number(node.params.centerX) || 0;
      const centerY = Number(node.params.centerY) || 0;

      const addClone = (dx, dy) => {
        const c = src.el.cloneNode(true);
        c.style.position = "absolute";
        c.style.inset = "0";
        c.style.transform = `translate(${dx}px, ${dy}px)`;
        c.style.transformOrigin = "0 0";
        wrap.appendChild(c);
      };

      if(mode === "radial"){
        if(radialMode === "advanced"){
          for(let i = 0; i < radialCount; i++){
            const ang = (angleStart - 90 + angleStep * i) * Math.PI / 180;
            const dx = centerX + Math.cos(ang) * radius;
            const dy = centerY + Math.sin(ang) * radius;
            addClone(dx, dy);
          }
        }else{
          const evenStep = 360 / radialCount;
          for(let i = 0; i < radialCount; i++){
            const ang = (-90 + evenStep * i) * Math.PI / 180;
            const dx = Math.cos(ang) * radius;
            const dy = Math.sin(ang) * radius;
            addClone(dx, dy);
          }
        }
      }else if(mode === "xy"){
        for(let y = 0; y < countY; y++){
          for(let x = 0; x < countX; x++){
            addClone(x * stepX, y * stepY);
          }
        }
      }else if(mode === "y"){
        for(let y = 0; y < countY; y++){
          addClone(0, y * stepY);
        }
      }else{
        for(let x = 0; x < countX; x++){
          addClone(x * stepX, 0);
        }
      }

      return { el: wrap };
    },
    inspector: () => ([
      {k:"mode", type:"select", label:"Mode", options:["x","y","xy","radial"]},
      {k:"countX", type:"range", label:"Count X", min:1, max:50, step:1, showIf:{ k:"mode", equals:"x" }},
      {k:"countY", type:"range", label:"Count Y", min:1, max:50, step:1, showIf:{ k:"mode", equals:"y" }},
      {k:"countX", type:"range", label:"Count X", min:1, max:50, step:1, showIf:{ k:"mode", equals:"xy" }},
      {k:"countY", type:"range", label:"Count Y", min:1, max:50, step:1, showIf:{ k:"mode", equals:"xy" }},
      {k:"stepX", type:"range", label:"Step X", min:-400, max:400, step:1, showIf:{ k:"mode", equals:"x" }},
      {k:"stepY", type:"range", label:"Step Y", min:-400, max:400, step:1, showIf:{ k:"mode", equals:"y" }},
      {k:"stepX", type:"range", label:"Step X", min:-400, max:400, step:1, showIf:{ k:"mode", equals:"xy" }},
      {k:"stepY", type:"range", label:"Step Y", min:-400, max:400, step:1, showIf:{ k:"mode", equals:"xy" }},
      {
        k:"radialMode",
        type:"options",
        label:"Radial",
        options:[
          { label:"Simple", value:"simple" },
          { label:"Advanced", value:"advanced" }
        ],
        showIf:{ k:"mode", equals:"radial" }
      },
      {k:"radialCount", type:"range", label:"Count", min:1, max:60, step:1, showIf:{ k:"mode", equals:"radial" }},
      {k:"radius", type:"range", label:"Radius", min:0, max:800, step:1, showIf:{ k:"mode", equals:"radial" }},
      {k:"angleStart", type:"range", label:"Angle Start", min:-180, max:180, step:1, showIf:(node) => node.params?.mode === "radial" && String(node.params?.radialMode || "simple") === "advanced"},
      {k:"angleStep", type:"range", label:"Angle Step", min:-180, max:180, step:1, showIf:(node) => node.params?.mode === "radial" && String(node.params?.radialMode || "simple") === "advanced"},
      {k:"centerX", type:"range", label:"Center X", min:-600, max:600, step:1, showIf:(node) => node.params?.mode === "radial" && String(node.params?.radialMode || "simple") === "advanced"},
      {k:"centerY", type:"range", label:"Center Y", min:-600, max:600, step:1, showIf:(node) => node.params?.mode === "radial" && String(node.params?.radialMode || "simple") === "advanced"}
    ])
  };
};
