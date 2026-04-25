const { contextBridge, ipcRenderer } = require('electron')

let onStatusCb = null
let onRecordCb = null
let onIdentityCb = null

ipcRenderer.on('p2p-status', (_event, msg) => { if (onStatusCb) onStatusCb(msg) })
ipcRenderer.on('p2p-record', (_event, record) => { if (onRecordCb) onRecordCb(record) })
ipcRenderer.on('identity-established', (_event, identity) => { if (onIdentityCb) onIdentityCb(identity) })

contextBridge.exposeInMainWorld('p2pAPI', {
    register: (data) => ipcRenderer.send('register-identity', data),
    login: () => ipcRenderer.send('login-identity'),
    init: (data) => ipcRenderer.send('init-p2p', data),
    addNote: (note) => ipcRenderer.send('add-note', note),
    onStatus: (callback) => { onStatusCb = callback },
    onRecord: (callback) => { onRecordCb = callback },
    onIdentity: (callback) => { onIdentityCb = callback }
})