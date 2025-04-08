const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  listFiles: (dirPath) => ipcRenderer.invoke("list-files", dirPath),
  openDirectory: (dirName) => ipcRenderer.invoke("open-directory", dirName),
  navigateUp: () => ipcRenderer.invoke("navigate-up"),
  openMenu: (params) => ipcRenderer.invoke("open-menu", params),
  renameFile: (file) => ipcRenderer.invoke("rename-file", file),
  deleteFile: (file) => ipcRenderer.invoke("delete-file", file),
  onDeleteRequest: (callback) =>
    ipcRenderer.on("delete-request", (event, file) => callback(file)),
  onNavigateToDirectory: (callback) =>
    ipcRenderer.on("navigate-to-directory", (event, dir) => callback(dir)),
});
