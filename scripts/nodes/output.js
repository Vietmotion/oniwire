window.createOniwireOutputNodeDef = function createOniwireOutputNodeDef(){
  return {
    inputs: ["in"],
    outputs: [],
    icon: "🎯",
    defaults: { ratio: "16:9", duration: 5, exportEmbedMode: true, exportLottieMode: false },
    run: (_node, inputs) => inputs.in ?? null,
    inspector: () => ([
      { k: "ratio", type: "select", label: "Aspect Ratio", options: ["1:1", "4:3", "16:9", "21:9", "5:4", "3:2", "2:3", "9:16", "3:4", "4:5"] },
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
            title: "Video/Data",
            hint: "Animation timeline payload",
            buttons: [
              { label: "Embed JS", id: "exportEmbedJS" }
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
