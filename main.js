import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import Hypercore from 'hypercore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow
let core
let swarm
let doctorName = null
let patientId = null

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
ipcMain.on('init-p2p', async (event, data) => {
  console.log('Backend - Received data:', JSON.stringify(data))
  
  const { role, keyString, doctorName: name, patientId: id } = data
  const isDoctor = role === 'doctor'
  
  console.log('Backend - Parsed values:', { role, name, id, isDoctor })
  
  // For doctors, name is mandatory
  if (isDoctor) {
    if (!name || !name.trim()) {
      console.log('Backend - Name validation failed. Name:', name, 'Type:', typeof name)
      mainWindow.webContents.send('p2p-status', 'Error: Doctor name is required')
      return
    }
    doctorName = name.trim()
    patientId = null
    console.log('Backend - Doctor name set to:', doctorName)
  } else {
    // For patients, patient ID is mandatory
    if (!id || !id.trim()) {
      console.log('Backend - Patient ID validation failed. ID:', id, 'Type:', typeof id)
      mainWindow.webContents.send('p2p-status', 'Error: Patient ID is required')
      return
    }
    patientId = id.trim()
    console.log('Backend - Patient ID set to:', patientId)
  }
  
  // Initialize Hypercore
  core = new Hypercore(
    isDoctor ? './doctor-data' : './patient-data', 
    keyString ? b4a.from(keyString, 'hex') : null, 
    { valueEncoding: 'json' }
  )

  await core.ready()

  if (isDoctor) {
    const doctorKey = b4a.toString(core.key, 'hex')
    mainWindow.webContents.send('p2p-status', `Doctor Core Created (${doctorName}). Share this key:\n${doctorKey}`)
    mainWindow.webContents.send('p2p-key', doctorKey)

    // Doctors see every record appended locally
    core.on('append', async () => {
      const latestRecord = await core.get(core.length - 1)
      mainWindow.webContents.send('p2p-record', latestRecord)
    })
  } else {
    mainWindow.webContents.send('p2p-status', 'Connecting to DHT and searching for Doctor...')

    // Track which blocks have already been sent to avoid duplicates
    let sentUpTo = 0

    // Called whenever new blocks are available (downloaded via replication)
    const sendNewBlocks = async () => {
      const length = core.length
      for (let i = sentUpTo; i < length; i++) {
        const block = await core.get(i)
        if (block.patientId === patientId) {
          mainWindow.webContents.send('p2p-record', block)
        }
      }
      sentUpTo = length
    }

    // 'append' fires for both local writes and blocks received over replication
    core.on('append', sendNewBlocks)
  }

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
  if (core && doctorName && noteData.patientId) {
    const isString = typeof noteData === 'string'
    const record = {
      timestamp: new Date().toLocaleTimeString(),
      doctor: doctorName,
      patientId: noteData.patientId,
      subject: isString ? '' : (noteData.subject || ''),
      note: isString ? noteData : noteData.text,
      image: isString ? null : noteData.image
    }
    await core.append(record)
  }
})

// Handle PDF download
ipcMain.on('download-pdf', async (event) => {
  try {
    const pdfPath = await dialog.showSaveDialog({
      title: 'Save Medical Records Ledger',
      defaultPath: 'Medical_Records_Ledger.pdf',
      filters: [{ name: 'PDFs', extensions: ['pdf'] }]
    })
    
    if (pdfPath.canceled) return
    
    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'printableArea' }
    })
    
    fs.writeFileSync(pdfPath.filePath, data)
  } catch (error) {
    console.error('Failed to generate PDF:', error)
  }
})