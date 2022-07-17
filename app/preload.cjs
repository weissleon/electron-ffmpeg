const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  openFile: () => ipcRenderer.invoke("file:open"),
  render: () => ipcRenderer.send("video:render"),
});
