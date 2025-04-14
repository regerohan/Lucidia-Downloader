// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadQobuz: (data) => ipcRenderer.invoke('download-qobuz', data)
});
