const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getArls: () => ipcRenderer.invoke('get-arls'),
  downloadQobuz: (data) => ipcRenderer.invoke('download-qobuz', data),
});
