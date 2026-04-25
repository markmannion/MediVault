import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import Hypercore from 'hypercore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow
let core
let swarm

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
        }
    })
    Menu.setApplicationMenu(null)
  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

// Handle initialization from the UI
ipcMain.on('init-p2p', async (event, { role, keyString }) => {
  const isDoctor = role === 'doctor'
  
  // Initialize Hypercore
  core = new Hypercore(
    isDoctor ? './doctor-data' : './patient-data', 
    keyString ? b4a.from(keyString, 'hex') : null, 
    { valueEncoding: 'json' }
  )

  await core.ready()

  if (isDoctor) {
    const doctorKey = b4a.toString(core.key, 'hex')
    mainWindow.webContents.send('p2p-status', `Doctor Core Created. Share this key:\n${doctorKey}`)
    mainWindow.webContents.send('p2p-key', doctorKey)
  } else {
    mainWindow.webContents.send('p2p-status', 'Connecting to DHT and searching for Doctor...')
    // Read existing history
    for (let i = 0; i < core.length; i++) {
      const block = await core.get(i)
      mainWindow.webContents.send('p2p-record', block)
    }
  }

  // Listen for real-time updates
  core.on('append', async () => {
    const latestRecord = await core.get(core.length - 1)
    mainWindow.webContents.send('p2p-record', latestRecord)
  })

  // Initialize Hyperswarm
  swarm = new Hyperswarm()
  swarm.on('connection', (conn) => {
    mainWindow.webContents.send('p2p-status', '🟢 Secure P2P Connection Established!')
    core.replicate(conn)
  })

  swarm.join(core.discoveryKey)
})

// Handle new notes from the Doctor's UI
ipcMain.on('add-note', async (event, noteData) => {
  if (core) {
    const isString = typeof noteData === 'string'
    const record = {
      timestamp: new Date().toLocaleTimeString(),
      doctor: 'Dr. Smith',
      note: isString ? noteData : noteData.text,
      image: isString ? null : noteData.image
    }
    await core.append(record)
  }
})