window.createOniwireOutputNodeDef = function createOniwireOutputNodeDef(){
  return {
    inputs: ["in"],
    outputs: [],
    icon: "🎯",
    defaults: { ratioMode: "preset", ratioPreset: "16:9", customWidth: 1920, customHeight: 1080, ratio: "16:9", duration: 5, exportEmbedMode: true, exportLottieMode: false },
    run: (_node, inputs) => inputs.in ?? null,
    inspector: () => ([
      { k: "ratioMode", type: "select", label: "Aspect Ratio", options: [{ value: "preset", label: "Preset" }, { value: "custom", label: "Custom" }] },
      { k: "ratioPreset", type: "select", label: "Preset Ratio", options: ["1:1", "4:3", "16:9", "21:9", "5:4", "3:2", "2:3", "9:16", "3:4", "4:5"], showIf: { k: "ratioMode", equals: "preset" } },
      { type: "size2d", label: "Custom Size (px)", kx: "customWidth", ky: "customHeight", showIf: { k: "ratioMode", equals: "custom" } },
      { k: "duration", type: "range", label: "Duration (s)", min: 1, max: 30, step: 1 },
      {
        type: "buttons",
        label: "Export",
        sections: [
          {
            title: "Still Image",
            hint: "Single frame snapshot",
            buttons: [
              { label: "PNG", id: "exportPNG" },
              { label: "JPG", id: "exportJPG" }
            ]
          },
          {
            title: "Lottie (Beta)",
            hint: "Exports supported nodes only",
            buttons: [
              { label: "Lottie JSON", id: "exportLottieJSON" }
            ]
          },
          {
            title: "MP4 Video",
            hint: "Frame-by-frame render (project fps, default 30)",
            buttons: [
              { label: "Export MP4", id: "exportMp4" }
            ]
          }
        ]
      }
    ])
  };
};
