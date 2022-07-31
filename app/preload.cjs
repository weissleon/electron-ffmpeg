const { contextBridge, ipcRenderer } = require("electron");
const config = require("../config.json");
contextBridge.exposeInMainWorld("electron", {
  config: config,
  openFile: () => ipcRenderer.invoke("file:open"),
  render: (data) => ipcRenderer.send("video:render", data),
  saveImage: (buffer) => ipcRenderer.send("image:save", buffer),
  importSubtitles: () => ipcRenderer.invoke("sub:import"),
  exportSubtitles: (data) => ipcRenderer.send("sub:export", data),
  saveSettings: (data) => ipcRenderer.send("settings:save", data),
});
