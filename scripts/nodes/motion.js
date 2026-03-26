function createOniwireMotionHelpers({ ensureMotionStyles, measureLayerBounds, clamp, getOutputDuration }){
  function getTimelineMeta(el){
    return {
      intro: Math.max(0, Number(el?.dataset?.motionIntroSec) || 0),
      outro: Math.max(0, Number(el?.dataset?.motionOutroSec) || 0)
    };
  }

  function setTimelineMeta(el, intro, outro){
    el.dataset.motionIntroSec = String(Math.max(0, Number(intro) || 0));
    el.dataset.motionOutroSec = String(Math.max(0, Number(outro) || 0));
  }

  function getBoundsCenter(bounds){
    if(bounds){
      return {
        x: bounds.x + (bounds.width / 2),
        y: bounds.y + (bounds.height / 2)
      };
    }
    return { x: null, y: null };
  }

  function createMotionWrap(srcEl){
    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.inset = "0";
    wrap.dataset.hasMotion = "true";

    const clone = srcEl.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.inset = "0";

    const motionLayer = document.createElement("div");
    motionLayer.style.position = "absolute";
    motionLayer.style.inset = "0";
    motionLayer.appendChild(clone);
    wrap.appendChild(motionLayer);

    return { wrap, clone, motionLayer };
  }

  function applyTransformOrigin(layer, sourceEl){
    const bounds = measureLayerBounds(sourceEl);
    const center = getBoundsCenter(bounds);
    layer.style.transformOrigin = center.x != null && center.y != null
      ? `${center.x}px ${center.y}px`
      : "50% 50%";
    return bounds;
  }

  // Injects (or updates) a per-node <style> tag with keyframe CSS.
  // Returns the generated keyframe name.
  function injectKeyframes(nodeId, type, css){
    const id = `oniwire-kf-${type}-${nodeId}`;
    let el = document.getElementById(id);
    if(!el){
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = css;
    return `oniwire-motion-${type}-${nodeId}`;
  }

  function buildWiggleFrames(radius, jitter){
    const steps = 16;
    const keyframes = [];
    for(let i = 0; i <= steps; i++){
      const t = (i / steps) * (Math.PI * 2);
      const x = (Math.cos(t) * radius) + ((Math.random() * 2 - 1) * jitter);
      const y = (Math.sin(t) * radius) + ((Math.random() * 2 - 1) * jitter);
      keyframes.push({ transform: `translate(${x}px, ${y}px)` });
    }
    return keyframes;
  }

  function resolveDuration(){
    const seconds = Number(typeof getOutputDuration === "function" ? getOutputDuration() : 5) || 5;
    return Math.max(0.5, seconds);
  }

  function runMotionAct(node, inputs){
    const src = inputs.in;
    if(!src?.el) return null;

    ensureMotionStyles();
    const { wrap, motionLayer } = createMotionWrap(src.el);
    const bounds = applyTransformOrigin(motionLayer, src.el);
    const upstreamTimeline = getTimelineMeta(src.el);

    const mode = node.params.mode || "breath";
    const amount = clamp(Number(node.params.amount) || 0, 0, 0.5);
    const speed = clamp(Number(node.params.speed) || 1, 0.1, 10);
    const cycleSeconds = 1 / speed;
    const random = clamp(Number(node.params.random) || 0, 0, 1);
    const direction = String(node.params.direction || "clockwise").toLowerCase() === "counter-clockwise"
      ? "counter-clockwise"
      : "clockwise";

    // Always use CSS animations (start when element enters DOM; reliable; clone-safe).
    if(mode === "breath"){
      const minScale = Math.max(0.01, 1 - amount);
      const maxScale = 1 + amount;
      motionLayer.style.setProperty("--breath-min", String(minScale));
      motionLayer.style.setProperty("--breath-max", String(maxScale));
      motionLayer.style.animation = `oniwire-breath ${cycleSeconds}s ease-in-out infinite`;
    }else if(mode === "circle"){
      const aDir = direction === "counter-clockwise" ? "reverse" : "normal";
      motionLayer.style.animation = `oniwire-circle ${cycleSeconds}s linear infinite`;
      motionLayer.style.animationDirection = aDir;
    }else if(mode === "wiggle"){
      const baseSize = bounds ? Math.max(1, Math.min(bounds.width, bounds.height)) : 100;
      const radius = Math.max(0, baseSize * amount);
      const jitter = radius * random;
      motionLayer.style.setProperty("--circle-radius", `${radius}px`);
      // Generate unique wiggle keyframes per node so different nodes have independent jitter
      const kfName = injectKeyframes(node.id, "wiggle", (() => {
        const steps = 16;
        let pts = "";
        for(let i = 0; i <= steps; i++){
          const t = (i / steps) * Math.PI * 2;
          const x = (Math.cos(t) * radius + (Math.random() * 2 - 1) * jitter).toFixed(2);
          const y = (Math.sin(t) * radius + (Math.random() * 2 - 1) * jitter).toFixed(2);
          pts += `${((i / steps) * 100).toFixed(1)}%{transform:translate(${x}px,${y}px)}`;
        }
        return `@keyframes oniwire-motion-wiggle-${node.id}{${pts}}`;
      })());
      motionLayer.style.animation = `${kfName} ${cycleSeconds}s linear infinite`;
    }

    setTimelineMeta(wrap, upstreamTimeline.intro, upstreamTimeline.outro);
    return { el: wrap };
  }

  function runMotionIn(node, inputs){
    const src = inputs.in;
    if(!src?.el) return null;

    const { wrap, motionLayer } = createMotionWrap(src.el);
    applyTransformOrigin(motionLayer, src.el);
    const upstreamTimeline = getTimelineMeta(src.el);
    const introDuration = clamp(Number(node.params.duration) || 0.6, 0.05, 5);
    const mode = String(node.params.mode || "pop");
    const amount = clamp(Number(node.params.amount) || 0.18, 0, 0.8);

    const outputDuration = resolveDuration();
    const introStartSec = upstreamTimeline.intro;
    const introEndSec = introStartSec + introDuration;
    const cycleDur = Math.max(introEndSec + 0.05, outputDuration);

    const pS  = (introStartSec / cycleDur * 100).toFixed(2);   // % when pop starts
    const pOv = (introStartSec / cycleDur * 100 + (introDuration / cycleDur * 100) * 0.7).toFixed(2); // 70% through pop
    const pE  = Math.min(98, introEndSec / cycleDur * 100).toFixed(2); // % when pop finishes

    let kfName;
    if(mode === "pop"){
      const s0  = Math.max(0.01, 1 - amount);          // start scale
      const sOv = 1 + (amount * 0.35);                  // overshoot scale
      kfName = injectKeyframes(node.id, "in",
        `@keyframes oniwire-motion-in-${node.id}{` +
        `0%{transform:scale(${s0});opacity:0}` +
        `${pS}%{transform:scale(${s0});opacity:0;animation-timing-function:cubic-bezier(0.2,0.9,0.25,1.2)}` +
        `${pOv}%{transform:scale(${sOv});opacity:1;animation-timing-function:cubic-bezier(0.2,0.9,0.25,1.2)}` +
        `${pE}%{transform:scale(1);opacity:1}` +
        `100%{transform:scale(1);opacity:1}}`
      );
      // Match inline style to keyframe 0% so there's no visible flash on loop reset.
      // This inline style is safe to clone because style.animation is also cloned,
      // so the clone will also run the pop animation and override this inline state.
      motionLayer.style.opacity = "0";
      motionLayer.style.transform = `scale(${s0})`;
    }else if(mode === "fade"){
      kfName = injectKeyframes(node.id, "in",
        `@keyframes oniwire-motion-in-${node.id}{` +
        `0%{opacity:0}` +
        `${pS}%{opacity:0;animation-timing-function:ease-out}` +
        `${pE}%{opacity:1}` +
        `100%{opacity:1}}`
      );
      motionLayer.style.opacity = "0";
    }else{
      kfName = null;
    }

    if(kfName){
      // CSS animation starts the moment the element is inserted into the DOM.
      // style.animation IS cloned by cloneNode(true), so downstream nodes that
      // clone this element will also run the pop animation—correct layering.
      motionLayer.style.animation = `${kfName} ${cycleDur}s linear infinite`;
    }

    setTimelineMeta(wrap, upstreamTimeline.intro + introDuration, upstreamTimeline.outro);
    return { el: wrap };
  }

  function runMotionOut(node, inputs){
    const src = inputs.in;
    if(!src?.el) return null;

    const { wrap, motionLayer } = createMotionWrap(src.el);
    applyTransformOrigin(motionLayer, src.el);
    const upstreamTimeline = getTimelineMeta(src.el);
    const outDuration = clamp(Number(node.params.duration) || 0.6, 0.05, 5);
    const amount = clamp(Number(node.params.amount) || 0.18, 0, 0.8);
    const endScale = Math.max(0.01, 1 - amount);

    const outputDuration = resolveDuration();
    const outEndSec   = outputDuration - upstreamTimeline.outro;
    const outStartSec = Math.max(0, outEndSec - outDuration);
    const cycleDur    = outputDuration;

    const pS = (outStartSec / cycleDur * 100).toFixed(2);
    const pE = Math.min(99.9, outEndSec / cycleDur * 100).toFixed(2);

    const kfName = injectKeyframes(node.id, "out",
      `@keyframes oniwire-motion-out-${node.id}{` +
      `0%{transform:scale(1);opacity:1}` +
      `${pS}%{transform:scale(1);opacity:1;animation-timing-function:cubic-bezier(0.4,0,0.8,0.2)}` +
      `${pE}%{transform:scale(${endScale});opacity:0}` +
      `100%{transform:scale(${endScale});opacity:0}}`
    );
    motionLayer.style.animation = `${kfName} ${cycleDur}s linear infinite`;

    setTimelineMeta(wrap, upstreamTimeline.intro, upstreamTimeline.outro + outDuration);
    return { el: wrap };
  }

  return {
    runMotionAct,
    runMotionIn,
    runMotionOut
  };
}

window.createOniwireMotionNodeDef = function createOniwireMotionNodeDef(deps){
  const { runMotionAct } = createOniwireMotionHelpers(deps);
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { mode: "breath", amount: 0.08, speed: 1, random: 0, direction: "clockwise" },
    icon: "🫁",
    run: runMotionAct,
    inspector: () => ([
      { k: "mode", type: "select", label: "Mode", options: ["breath", "circle", "wiggle"] },
      { k: "direction", type: "select", label: "Direction", options: ["clockwise", "counter-clockwise"], showIf: { k: "mode", equals: "circle" } },
      { k: "amount", type: "range", label: "Amount", min: 0, max: 0.5, step: 0.01, showIf: node => (node.params?.mode || "breath") !== "circle" },
      { k: "random", type: "range", label: "Random", min: 0, max: 1, step: 0.01, showIf: { k: "mode", equals: "wiggle" } },
      { k: "speed", type: "range", label: "Speed", min: 0.1, max: 10, step: 0.1 }
    ])
  };
};

window.createOniwireMotionInNodeDef = function createOniwireMotionInNodeDef(deps){
  const { runMotionIn } = createOniwireMotionHelpers(deps);
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { mode: "pop", duration: 0.6, amount: 0.18 },
    icon: "↗",
    run: runMotionIn,
    inspector: () => ([
      { k: "mode", type: "select", label: "Mode", options: ["pop", "fade"] },
      { k: "duration", type: "range", label: "Duration (s)", min: 0.05, max: 5, step: 0.05 },
      { k: "amount", type: "range", label: "Amount", min: 0, max: 0.8, step: 0.01, showIf: { k: "mode", equals: "pop" } }
    ])
  };
};

window.createOniwireMotionOutNodeDef = function createOniwireMotionOutNodeDef(deps){
  const { runMotionOut } = createOniwireMotionHelpers(deps);
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { duration: 0.6, amount: 0.18 },
    icon: "↘",
    run: runMotionOut,
    inspector: () => ([
      { k: "duration", type: "range", label: "Duration (s)", min: 0.05, max: 5, step: 0.05 },
      { k: "amount", type: "range", label: "Exit Amount", min: 0, max: 0.8, step: 0.01 }
    ])
  };
};
