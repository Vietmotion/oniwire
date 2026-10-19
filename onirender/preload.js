const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("oniRenderApi", {
  pickFolder: () => ipcRenderer.invoke("onirender:pick-folder"),
  pickOutput: (defaultName) => ipcRenderer.invoke("onirender:pick-output", defaultName),
  render: (payload) => ipcRenderer.invoke("onirender:render", payload),
  cancel: () => ipcRenderer.invoke("onirender:cancel"),
  onProgress: (cb) => {
    const handler = (_event, payload) => cb(payload);
    ipcRenderer.on("onirender:progress", handler);
    return () => ipcRenderer.removeListener("onirender:progress", handler);
  }
});
