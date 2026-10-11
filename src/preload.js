const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  generate: (payload) => ipcRenderer.invoke('qr:generate', payload),
  save: (payload) => ipcRenderer.invoke('qr:save', payload),
  pickLogo: () => ipcRenderer.invoke('logo:pick'),
  pickSavePath: (name) => ipcRenderer.invoke('dialog:save', name),
  winMin: () => ipcRenderer.invoke('win:min'),
  winMax: () => ipcRenderer.invoke('win:max'),
  winClose: () => ipcRenderer.invoke('win:close')
});