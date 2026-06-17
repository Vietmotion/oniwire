window.createOniwireErodeNodeDef = function createOniwireErodeNodeDef({ propagateMotionFlag, clamp }){
  function ensureMorphologyDefs(){
    if(window.__oniwireMorphologyDefs) return window.__oniwireMorphologyDefs;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.pointerEvents = "none";

    const defs = document.createElementNS(svgNS, "defs");
    svg.appendChild(defs);
    (document.body || document.documentElement).appendChild(svg);

    window.__oniwireMorphologyDefs = defs;
    window.__oniwireMorphologyCache = window.__oniwireMorphologyCache || new Map();
    return defs;
  }

  function getMorphologyFilterId(operator, radius){
    const r = Math.max(0, Number(radius) || 0);
    const rounded = Math.round(r * 10) / 10;
    const key = `${operator}|${rounded}`;

    window.__oniwireMorphologyCache = window.__oniwireMorphologyCache || new Map();
    const cached = window.__oniwireMorphologyCache.get(key);
    if(cached) return cached;

    const defs = ensureMorphologyDefs();
    const svgNS = "http://www.w3.org/2000/svg";

    const filter = document.createElementNS(svgNS, "filter");
    const id = `oniwire-morph-${operator}-${String(rounded).replace(".", "_")}`;
    filter.setAttribute("id", id);
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");
    filter.setAttribute("filterUnits", "objectBoundingBox");

    const morph = document.createElementNS(svgNS, "feMorphology");
    // Morph SourceGraphic directly so positive values truly expand outward.
    morph.setAttribute("in", "SourceGraphic");
    morph.setAttribute("operator", operator);
    morph.setAttribute("radius", String(rounded));

    filter.appendChild(morph);
    defs.appendChild(filter);

    window.__oniwireMorphologyCache.set(key, id);
    return id;
  }

  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { amount: 0 },
    icon: "◧",
    run: (node, inputs) => {
      try {
        const src = inputs.in;
        if(!src?.el) return null;

        const wrap = document.createElement("div");
        wrap.style.position = "absolute";
        wrap.style.inset = "0";
        wrap.style.overflow = "visible";
        propagateMotionFlag(wrap, src.el);

        const clone = src.el.cloneNode(true);
        clone.style.position = "absolute";
        clone.style.inset = "0";

        const amount = clamp(Number(node.params.amount) || 0, -24, 24);
        const radius = Math.abs(Math.round(amount));

        if(radius > 0){
          const operator = amount >= 0 ? "dilate" : "erode";
          const filterId = getMorphologyFilterId(operator, radius);
          clone.style.filter = `url(#${filterId})`;
        }else{
          clone.style.filter = "none";
        }

        wrap.appendChild(clone);
        return { el: wrap };
      } catch (err) {
        console.warn("Erode node fallback:", err);
        return inputs.in || null;
      }
    },
    inspector: () => ([
      { k: "amount", type: "range", label: "Amount", min: -24, max: 24, step: 1 }
    ])
  };
};
