const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  openFile: () => ipcRenderer.invoke("file:open"),
  render: (data) => ipcRenderer.send("video:render", data),
  saveImage: (buffer) => ipcRenderer.send("image:save", buffer),
});
