const { contextBridge, ipcRenderer } = require('electron')

// Register all IPC listeners once, up front, at preload time.
// Storing callbacks as mutable refs means the bridge functions just update
// the ref — no risk of missing events due to listener-registration timing.
let onStatusCb = null
let onKeyCb = null
let onRecordCb = null
let onKeypairImportedCb = null

ipcRenderer.on('p2p-status', (_event, msg) => {
    if (onStatusCb) onStatusCb(msg)
})

ipcRenderer.on('p2p-key', (_event, key) => {
    if (onKeyCb) onKeyCb(key)
})

ipcRenderer.on('p2p-record', (_event, record) => {
    console.log('Preload received p2p-record:', record && record.subject)
    if (onRecordCb) onRecordCb(record)
})

ipcRenderer.on('keypair-imported', (_event, keypair) => {
    if (onKeypairImportedCb) onKeypairImportedCb(keypair)
})

contextBridge.exposeInMainWorld('p2pAPI', {
    init: (data) => ipcRenderer.send('init-p2p', data),
    addNote: (note) => ipcRenderer.send('add-note', note),
    downloadPDF: () => ipcRenderer.send('download-pdf'),
    exportKeypair: () => ipcRenderer.send('export-keypair'),
    importKeypair: () => ipcRenderer.send('import-keypair'),
    onStatus: (callback) => { onStatusCb = callback },
    onKey: (callback) => { onKeyCb = callback },
    onRecord: (callback) => { onRecordCb = callback },
    onKeypairImported: (callback) => { onKeypairImportedCb = callback }
})