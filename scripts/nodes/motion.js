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
    const outputDuration = resolveDuration();
    const actDelaySec = clamp(Number(upstreamTimeline.intro) || 0, 0, Math.max(0, outputDuration - 0.05));
    const useDelayedAct = actDelaySec > 0;

    // Always use CSS animations (start when element enters DOM; reliable; clone-safe).
    // When upstream intro exists, bake a per-cycle hold so Motion-In can finish first.
    if(mode === "breath"){
      const minScale = Math.max(0.01, 1 - amount);
      const maxScale = 1 + amount;
      motionLayer.style.setProperty("--breath-min", String(minScale));
      motionLayer.style.setProperty("--breath-max", String(maxScale));
      if(!useDelayedAct){
        motionLayer.style.animation = `oniwire-breath ${cycleSeconds}s ease-in-out infinite`;
      }else{
        const cycleDur = Math.max(outputDuration, actDelaySec + 0.05);
        const holdPct = (actDelaySec / cycleDur) * 100;
        const activeDur = Math.max(0.05, cycleDur - actDelaySec);
        const steps = 24;
        let frames = `0%{transform:scale(1)}${holdPct.toFixed(2)}%{transform:scale(1)}`;
        for(let i = 0; i <= steps; i++){
          const localSec = (i / steps) * activeDur;
          const wave = (1 - Math.cos((2 * Math.PI * localSec) / cycleSeconds)) / 2;
          const scale = minScale + (maxScale - minScale) * wave;
          const pct = holdPct + ((100 - holdPct) * (i / steps));
          frames += `${pct.toFixed(2)}%{transform:scale(${scale.toFixed(5)})}`;
        }
        const kfName = injectKeyframes(node.id, "act", `@keyframes oniwire-motion-act-${node.id}{${frames}}`);
        motionLayer.style.animation = `${kfName} ${cycleDur}s linear infinite`;
      }
    }else if(mode === "circle"){
      const aDir = direction === "counter-clockwise" ? "reverse" : "normal";
      if(!useDelayedAct){
        motionLayer.style.animation = `oniwire-circle ${cycleSeconds}s linear infinite`;
        motionLayer.style.animationDirection = aDir;
      }else{
        const cycleDur = Math.max(outputDuration, actDelaySec + 0.05);
        const holdPct = (actDelaySec / cycleDur) * 100;
        const activeDur = Math.max(0.05, cycleDur - actDelaySec);
        const dirSign = aDir === "reverse" ? -1 : 1;
        const steps = 24;
        let frames = `0%{transform:rotate(0deg)}${holdPct.toFixed(2)}%{transform:rotate(0deg)}`;
        for(let i = 0; i <= steps; i++){
          const localSec = (i / steps) * activeDur;
          const turns = localSec / cycleSeconds;
          const deg = dirSign * turns * 360;
          const pct = holdPct + ((100 - holdPct) * (i / steps));
          frames += `${pct.toFixed(2)}%{transform:rotate(${deg.toFixed(3)}deg)}`;
        }
        const kfName = injectKeyframes(node.id, "act", `@keyframes oniwire-motion-act-${node.id}{${frames}}`);
        motionLayer.style.animation = `${kfName} ${cycleDur}s linear infinite`;
      }
    }else if(mode === "wiggle"){
      const baseSize = bounds ? Math.max(1, Math.min(bounds.width, bounds.height)) : 100;
      const radius = Math.max(0, baseSize * amount);
      const jitter = radius * random;
      if(!useDelayedAct){
        motionLayer.style.setProperty("--circle-radius", `${radius}px`);
        // Generate unique wiggle keyframes per node so different nodes have independent jitter.
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
      }else{
        const cycleDur = Math.max(outputDuration, actDelaySec + 0.05);
        const holdPct = (actDelaySec / cycleDur) * 100;
        const activeDur = Math.max(0.05, cycleDur - actDelaySec);
        const steps = 24;
        let frames = `0%{transform:translate(0px,0px)}${holdPct.toFixed(2)}%{transform:translate(0px,0px)}`;
        for(let i = 0; i <= steps; i++){
          const localSec = (i / steps) * activeDur;
          const phase = (localSec / cycleSeconds) * Math.PI * 2;
          const noiseX = Math.sin(localSec * 11.73) * jitter;
          const noiseY = Math.cos(localSec * 7.31) * jitter;
          const x = (Math.cos(phase) * radius) + noiseX;
          const y = (Math.sin(phase) * radius) + noiseY;
          const pct = holdPct + ((100 - holdPct) * (i / steps));
          frames += `${pct.toFixed(2)}%{transform:translate(${x.toFixed(2)}px,${y.toFixed(2)}px)}`;
        }
        const kfName = injectKeyframes(node.id, "act", `@keyframes oniwire-motion-act-${node.id}{${frames}}`);
        motionLayer.style.animation = `${kfName} ${cycleDur}s linear infinite`;
      }
    }

    setTimelineMeta(wrap, upstreamTimeline.intro, upstreamTimeline.outro);
    return { el: wrap };
  }

  function runMotionIn(node, inputs){
    const src = inputs.in;
    if(!src?.el) return null;

    const { wrap, motionLayer } = createMotionWrap(src.el);
    const bounds = applyTransformOrigin(motionLayer, src.el);
    const upstreamTimeline = getTimelineMeta(src.el);
    const introDuration = clamp(Number(node.params.duration) || 0.6, 0.05, 5);
    const mode = String(node.params.mode || "pop");
    const flyDirection = String(node.params.direction || "top-down").toLowerCase();
    const amount = clamp(Number(node.params.amount) || 0.18, 0, 0.8);
    const overrideAct = Boolean(node.params.overrideAct);

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
    }else if(mode === "fly"){
      const frameW = src.el.parentElement?.clientWidth || 1280;
      const frameH = src.el.parentElement?.clientHeight || 720;
      const minX = bounds?.x ?? (frameW * 0.4);
      const minY = bounds?.y ?? (frameH * 0.4);
      const maxX = bounds ? (bounds.x + bounds.width) : (frameW * 0.6);
      const maxY = bounds ? (bounds.y + bounds.height) : (frameH * 0.6);
      const pad = 24;

      let startX = 0;
      let startY = 0;
      if(flyDirection === "bottom-up"){
        startY = Math.max(0, (frameH - minY) + pad);
      }else if(flyDirection === "left"){
        startX = -Math.max(0, maxX + pad);
      }else if(flyDirection === "right"){
        startX = Math.max(0, (frameW - minX) + pad);
      }else{
        // top-down
        startY = -Math.max(0, maxY + pad);
      }

      kfName = injectKeyframes(node.id, "in",
        `@keyframes oniwire-motion-in-${node.id}{` +
        `0%{transform:translate(${startX.toFixed(2)}px,${startY.toFixed(2)}px);opacity:1}` +
        `${pS}%{transform:translate(${startX.toFixed(2)}px,${startY.toFixed(2)}px);opacity:1;animation-timing-function:cubic-bezier(0.18,0.84,0.24,1)}` +
        `${pE}%{transform:translate(0px,0px);opacity:1}` +
        `100%{transform:translate(0px,0px);opacity:1}}`
      );
      motionLayer.style.transform = `translate(${startX.toFixed(2)}px, ${startY.toFixed(2)}px)`;
    }else{
      kfName = null;
    }

    if(kfName){
      // CSS animation starts the moment the element is inserted into the DOM.
      // style.animation IS cloned by cloneNode(true), so downstream nodes that
      // clone this element will also run the pop animation—correct layering.
      motionLayer.style.animation = `${kfName} ${cycleDur}s linear infinite`;
    }

    setTimelineMeta(wrap, upstreamTimeline.intro + (overrideAct ? introDuration : 0), upstreamTimeline.outro);
    return { el: wrap };
  }

  function runMotionOut(node, inputs){
    const src = inputs.in;
    if(!src?.el) return null;

    const { wrap, motionLayer } = createMotionWrap(src.el);
    const bounds = applyTransformOrigin(motionLayer, src.el);
    const upstreamTimeline = getTimelineMeta(src.el);
    const mode = String(node.params.mode || "fade").toLowerCase();
    const rawDirection = String(node.params.direction || "top-up").toLowerCase();
    const direction = rawDirection === "top-down"
      ? "top-up"
      : (rawDirection === "bottom-up" ? "bottom-down" : rawDirection);
    const outDuration = clamp(Number(node.params.duration) || 0.6, 0.05, 5);
    const amount = clamp(Number(node.params.amount) || 0.18, 0, 0.8);
    const useStartTime = Boolean(node.params.useStartTime);
    const requestedStartTime = Math.max(0, Number(node.params.startTime) || 0);
    const endScale = Math.max(0.01, 1 - amount);

    const outputDuration = resolveDuration();
    const autoOutEndSec = outputDuration - upstreamTimeline.outro;
    const autoOutStartSec = Math.max(0, autoOutEndSec - outDuration);
    const outStartSec = useStartTime
      ? clamp(requestedStartTime, upstreamTimeline.intro, Math.max(upstreamTimeline.intro, outputDuration - 0.001))
      : autoOutStartSec;
    const outEndSec = Math.min(outputDuration, outStartSec + outDuration);
    const cycleDur    = outputDuration;

    const pS = (outStartSec / cycleDur * 100).toFixed(2);
    const pE = Math.min(99.9, outEndSec / cycleDur * 100).toFixed(2);

    const kfName = mode === "pop"
      ? injectKeyframes(node.id, "out",
        `@keyframes oniwire-motion-out-${node.id}{` +
        `0%{transform:scale(1);opacity:1}` +
        `${pS}%{transform:scale(1);opacity:1;animation-timing-function:cubic-bezier(0.4,0,0.8,0.2)}` +
        `${pE}%{transform:scale(${endScale});opacity:0}` +
        `100%{transform:scale(${endScale});opacity:0}}`
      )
      : mode === "fly"
      ? (() => {
          const frameW = src.el.parentElement?.clientWidth || 1280;
          const frameH = src.el.parentElement?.clientHeight || 720;
          const minX = bounds?.x ?? (frameW * 0.4);
          const minY = bounds?.y ?? (frameH * 0.4);
          const maxX = bounds ? (bounds.x + bounds.width) : (frameW * 0.6);
          const maxY = bounds ? (bounds.y + bounds.height) : (frameH * 0.6);
          const pad = 24;

          let endX = 0;
          let endY = 0;
          if(direction === "bottom-down"){
            endY = Math.max(0, (frameH - minY) + pad);
          }else if(direction === "left"){
            endX = -Math.max(0, maxX + pad);
          }else if(direction === "right"){
            endX = Math.max(0, (frameW - minX) + pad);
          }else{
            // top-down
            endY = -Math.max(0, maxY + pad);
          }

          return injectKeyframes(node.id, "out",
            `@keyframes oniwire-motion-out-${node.id}{` +
            `0%{transform:translate(0px,0px);opacity:1}` +
            `${pS}%{transform:translate(0px,0px);opacity:1;animation-timing-function:cubic-bezier(0.4,0,0.8,0.2)}` +
            `${pE}%{transform:translate(${endX.toFixed(2)}px,${endY.toFixed(2)}px);opacity:0}` +
            `100%{transform:translate(${endX.toFixed(2)}px,${endY.toFixed(2)}px);opacity:0}}`
          );
        })()
      : injectKeyframes(node.id, "out",
        `@keyframes oniwire-motion-out-${node.id}{` +
        `0%{opacity:1}` +
        `${pS}%{opacity:1;animation-timing-function:ease-in}` +
        `${pE}%{opacity:0}` +
        `100%{opacity:0}}`
      );
    motionLayer.style.animation = `${kfName} ${cycleDur}s linear infinite`;

    const nextOutro = useStartTime
      ? Math.max(upstreamTimeline.outro, Math.max(0, outputDuration - outStartSec))
      : (upstreamTimeline.outro + outDuration);
    setTimelineMeta(wrap, upstreamTimeline.intro, nextOutro);
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
    defaults: { mode: "pop", direction: "top-down", overrideAct: false, duration: 0.6, amount: 0.18 },
    icon: "↗",
    run: runMotionIn,
    inspector: () => ([
      { k: "mode", type: "select", label: "Mode", options: ["pop", "fade", { value: "fly", label: "fly in" }] },
      { k: "direction", type: "select", label: "Direction", options: ["top-down", "bottom-up", "left", "right"], showIf: { k: "mode", equals: "fly" } },
      { k: "overrideAct", type: "checkbox", label: "Override Act" },
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
    defaults: { mode: "fade", direction: "top-up", duration: 0.6, amount: 0.18, useStartTime: false, startTime: 4 },
    icon: "↘",
    run: runMotionOut,
    inspector: () => ([
      { k: "mode", type: "select", label: "Mode", options: [{ value: "fade", label: "Fade" }, { value: "pop", label: "Pop Out" }, { value: "fly", label: "Fly Out" }] },
      { k: "direction", type: "select", label: "Direction", options: ["top-up", "bottom-down", "left", "right"], showIf: { k: "mode", equals: "fly" } },
      { k: "useStartTime", type: "checkbox", label: "Use Start Time" },
      { k: "startTime", type: "range", label: "Start Time (s)", min: 0, max: 30, step: 0.05, showIf: { k: "useStartTime", equals: true } },
      { k: "duration", type: "range", label: "Duration (s)", min: 0.05, max: 5, step: 0.05 },
      { k: "amount", type: "range", label: "Exit Amount", min: 0, max: 0.8, step: 0.01, showIf: { k: "mode", equals: "pop" } }
    ])
  };
};
