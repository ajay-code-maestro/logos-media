// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  exportFile: (taskId, suggestedFilename) => import_electron.ipcRenderer.invoke("media:export", taskId, suggestedFilename),
  download: {
    start: (url, options) => import_electron.ipcRenderer.invoke("download:start", url, options),
    pause: (taskId) => import_electron.ipcRenderer.invoke("download:pause", taskId),
    resume: (taskId) => import_electron.ipcRenderer.invoke("download:resume", taskId),
    cancel: (taskId) => import_electron.ipcRenderer.invoke("download:cancel", taskId),
    retry: (taskId) => import_electron.ipcRenderer.invoke("download:retry", taskId),
    getActive: () => import_electron.ipcRenderer.invoke("download:getActive"),
    onProgress: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("download:progress", listener);
      return () => {
        import_electron.ipcRenderer.removeListener("download:progress", listener);
      };
    }
  },
  metadata: {
    extract: (url) => import_electron.ipcRenderer.invoke("metadata:extract", url)
  },
  history: {
    get: () => import_electron.ipcRenderer.invoke("history:get"),
    add: (item) => import_electron.ipcRenderer.invoke("history:add", item),
    remove: (id) => import_electron.ipcRenderer.invoke("history:remove", id),
    clear: () => import_electron.ipcRenderer.invoke("history:clear")
  },
  settings: {
    get: () => import_electron.ipcRenderer.invoke("settings:get"),
    save: (settings) => import_electron.ipcRenderer.invoke("settings:save", settings)
  }
});
