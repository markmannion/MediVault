const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('p2pAPI', {
  init: (data) => ipcRenderer.send('init-p2p', data),
  addNote: (note) => ipcRenderer.send('add-note', note),
  downloadPDF: () => ipcRenderer.send('download-pdf'),
  onStatus: (callback) => ipcRenderer.on('p2p-status', (_event, msg) => callback(msg)),
  onKey: (callback) => ipcRenderer.on('p2p-key', (_event, key) => callback(key)),
  onRecord: (callback) => ipcRenderer.on('p2p-record', (_event, record) => callback(record))
})