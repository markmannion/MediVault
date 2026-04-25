import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
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

// Derive a deterministic 32-byte Hypercore key from a human-readable doctor ID.
// SHA-256 always produces the same key for the same input, so both doctor and
// patient independently arrive at the same key without exchanging a hex string.
function deriveKeyFromDoctorId(doctorId) {
    return crypto.createHash('sha256').update(doctorId.trim().toLowerCase()).digest()
}

// Sanitise a raw Hypercore block into a plain object safe for IPC structured clone
function toPlainRecord(block) {
    return {
        timestamp: block.timestamp ?? '',
        doctor: block.doctor ?? '',
        patientId: block.patientId ?? '',
        subject: block.subject ?? '',
        note: block.note ?? '',
        image: block.image ?? null
    }
}

// Handle initialization from the UI
ipcMain.on('init-p2p', async (event, data) => {
    console.log('Backend - Received data:', JSON.stringify(data))

    const { role, doctorId, doctorName: name, patientId: id } = data
    const isDoctor = role === 'doctor'

    console.log('Backend - Parsed values:', { role, doctorId, name, id, isDoctor })

    if (isDoctor) {
        if (!name || !name.trim()) {
            mainWindow.webContents.send('p2p-status', 'Error: Doctor name is required')
            return
        }
        if (!doctorId || !doctorId.trim()) {
            mainWindow.webContents.send('p2p-status', 'Error: Doctor ID is required')
            return
        }

        doctorName = name.trim()
        patientId = null

        // Warn if a doctor-data store already exists with a different derived key,
        // which means another doctor ID was used on this machine previously.
        const derivedKey = deriveKeyFromDoctorId(doctorId)
        const dataDir = './doctor-data'
        if (fs.existsSync(path.join(dataDir, 'key'))) {
            const storedKey = fs.readFileSync(path.join(dataDir, 'key'))
            if (!storedKey.equals(derivedKey)) {
                mainWindow.webContents.send('p2p-status',
                    'Warning: A different Doctor ID was used on this machine previously. ' +
                    'Delete the doctor-data folder to start fresh with this ID.')
                return
            }
        }

        core = new Hypercore(dataDir, derivedKey, { valueEncoding: 'json' })
    } else {
        if (!id || !id.trim()) {
            mainWindow.webContents.send('p2p-status', 'Error: Patient ID is required')
            return
        }
        if (!doctorId || !doctorId.trim()) {
            mainWindow.webContents.send('p2p-status', 'Error: Doctor ID is required')
            return
        }

        patientId = id.trim()

        // Derive the same key from the doctor ID the patient typed
        const derivedKey = deriveKeyFromDoctorId(doctorId)
        core = new Hypercore('./patient-data', derivedKey, { valueEncoding: 'json' })
    }

    await core.ready()

    if (isDoctor) {
        mainWindow.webContents.send('p2p-status', `Ledger ready. Your Doctor ID is: ${data.doctorId.trim()}`)
        mainWindow.webContents.send('p2p-key', data.doctorId.trim())

        // Doctors see every record appended locally
        core.on('append', async () => {
            const block = await core.get(core.length - 1)
            mainWindow.webContents.send('p2p-record', toPlainRecord(block))
        })
    } else {
        mainWindow.webContents.send('p2p-status', 'Connecting to DHT and searching for Doctor...')

        let sentUpTo = 0

        const sendNewBlocks = async () => {
            const length = core.length
            for (let i = sentUpTo; i < length; i++) {
                try {
                    const block = await core.get(i)
                    console.log(`Patient block ${i} patientId="${block.patientId}" expecting="${patientId}"`)
                    if (block.patientId === patientId) {
                        console.log(`Forwarding block ${i} to renderer`)
                        mainWindow.webContents.send('p2p-record', toPlainRecord(block))
                    }
                } catch (err) {
                    console.error(`Failed to read block ${i}:`, err)
                }
            }
            sentUpTo = length
        }

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