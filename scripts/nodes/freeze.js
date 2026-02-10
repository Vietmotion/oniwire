window.createOniwireFreezeNodeDef = function createOniwireFreezeNodeDef({ hasMotionFlag, renderLayerToDataUrl }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: {},
    icon: "📸",
    run: async (_node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const liveVideo = src.el.querySelector?.("video") || null;
      const isMotion = hasMotionFlag(src.el);
      if(liveVideo){
        const wrap = document.createElement("div");
        wrap.style.position = "absolute";
        wrap.style.inset = "0";
        wrap.dataset.frozenLive = "true";
        wrap.dataset.frozenUrl = "";

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const fps = 15;
        const interval = 1000 / fps;
        let lastTime = 0;

        const tick = (t) => {
          if(!wrap.isConnected) return;
          if(t - lastTime >= interval){
            lastTime = t;
            const w = liveVideo.videoWidth || 1280;
            const h = liveVideo.videoHeight || 720;
            if(w && h && liveVideo.readyState >= 2){
              if(canvas.width !== w || canvas.height !== h){
                canvas.width = w;
                canvas.height = h;
              }
              try{
                ctx.drawImage(liveVideo, 0, 0, w, h);
                const dataUrl = canvas.toDataURL("image/png");
                wrap.dataset.frozenUrl = dataUrl;
                wrap.style.backgroundImage = `url(${dataUrl})`;
                wrap.style.backgroundSize = "contain";
                wrap.style.backgroundPosition = "center";
                wrap.style.backgroundRepeat = "no-repeat";
              }catch(_e){
              }
            }
          }
          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        return { el: wrap, dataUrl: "" };
      }

      if(isMotion){
        const wrap = document.createElement("div");
        wrap.style.position = "absolute";
        wrap.style.inset = "0";
        wrap.dataset.frozenLive = "true";
        wrap.dataset.frozenUrl = "";

        const fps = 12;
        const interval = 1000 / fps;
        let lastTime = 0;
        let rendering = false;

        const tick = async (t) => {
          if(!wrap.isConnected) return;
          if(!rendering && t - lastTime >= interval){
            lastTime = t;
            rendering = true;
            const dataUrl = await renderLayerToDataUrl(src.el);
            if(dataUrl){
              wrap.dataset.frozenUrl = dataUrl;
              wrap.style.backgroundImage = `url(${dataUrl})`;
              wrap.style.backgroundSize = "contain";
              wrap.style.backgroundPosition = "center";
              wrap.style.backgroundRepeat = "no-repeat";
            }
            rendering = false;
          }
          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        return { el: wrap, dataUrl: "" };
      }

      const dataUrl = await renderLayerToDataUrl(src.el);

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";

      if(dataUrl){
        wrap.dataset.frozenUrl = dataUrl;
        wrap.style.backgroundImage = `url(${dataUrl})`;
        wrap.style.backgroundSize = "contain";
        wrap.style.backgroundPosition = "center";
        wrap.style.backgroundRepeat = "no-repeat";
      }else{
        wrap.dataset.frozenUrl = "";
        const fallback = src.el.cloneNode(true);
        fallback.style.position = "absolute";
        fallback.style.inset = "0";
        wrap.appendChild(fallback);
      }

      return { el: wrap, dataUrl: dataUrl || "" };
    },
    inspector: () => []
  };
};