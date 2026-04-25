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

    const { role, keyString, secretKey, doctorName: name, patientId: id } = data
    const isDoctor = role === 'doctor'

    console.log('Backend - Parsed values:', { role, name, id, isDoctor, hasSecretKey: !!secretKey })

    if (isDoctor) {
        if (!name || !name.trim()) {
            mainWindow.webContents.send('p2p-status', 'Error: Doctor name is required')
            return
        }
        doctorName = name.trim()
        patientId = null
    } else {
        if (!id || !id.trim()) {
            mainWindow.webContents.send('p2p-status', 'Error: Patient ID is required')
            return
        }
        patientId = id.trim()
    }

    // When a doctor imports their keypair from another machine, both the public
    // key and secret key are provided — Hypercore needs the full keypair to sign
    // new blocks. Patients only ever provide the public key (keyString).
    let hypercoreKey = null
    let hypercoreKeyPair = null
    if (isDoctor && keyString && secretKey) {
        hypercoreKeyPair = {
            publicKey: b4a.from(keyString, 'hex'),
            secretKey: b4a.from(secretKey, 'hex')
        }
    } else if (keyString) {
        hypercoreKey = b4a.from(keyString, 'hex')
    }

    core = new Hypercore(
        isDoctor ? './doctor-data' : './patient-data',
        hypercoreKeyPair ?? hypercoreKey,
        { valueEncoding: 'json' }
    )

    await core.ready()

    if (isDoctor) {
        const doctorKey = b4a.toString(core.key, 'hex')
        mainWindow.webContents.send('p2p-status', `Doctor Core Created (${doctorName}). Share this key:\n${doctorKey}`)
        mainWindow.webContents.send('p2p-key', doctorKey)

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

// Export keypair: saves the core's public key + secret key to a .medivault file
ipcMain.on('export-keypair', async () => {
    if (!core) return

    try {
        const savePath = await dialog.showSaveDialog({
            title: 'Export Doctor Keypair',
            defaultPath: `medivault-keypair-${doctorName || 'doctor'}.medivault`,
            filters: [{ name: 'MediVault Keypair', extensions: ['medivault'] }]
        })

        if (savePath.canceled) return

        const keypair = {
            publicKey: b4a.toString(core.key, 'hex'),
            secretKey: b4a.toString(core.keyPair.secretKey, 'hex'),
            doctorName: doctorName
        }

        fs.writeFileSync(savePath.filePath, JSON.stringify(keypair, null, 2))
        mainWindow.webContents.send('p2p-status', `Keypair exported to ${path.basename(savePath.filePath)}. Keep this file safe — it is your identity.`)
    } catch (err) {
        console.error('Export failed:', err)
        mainWindow.webContents.send('p2p-status', 'Error: Failed to export keypair.')
    }
})

// Import keypair: reads a .medivault file and sends the keys back to the renderer
// so it can pre-fill the connection form and initialise with the existing identity
ipcMain.on('import-keypair', async () => {
    try {
        const openPath = await dialog.showOpenDialog({
            title: 'Import Doctor Keypair',
            filters: [{ name: 'MediVault Keypair', extensions: ['medivault'] }],
            properties: ['openFile']
        })

        if (openPath.canceled || !openPath.filePaths.length) return

        const raw = fs.readFileSync(openPath.filePaths[0], 'utf8')
        const keypair = JSON.parse(raw)

        if (!keypair.publicKey || !keypair.secretKey) {
            mainWindow.webContents.send('p2p-status', 'Error: Invalid keypair file.')
            return
        }

        mainWindow.webContents.send('keypair-imported', {
            publicKey: keypair.publicKey,
            secretKey: keypair.secretKey,
            doctorName: keypair.doctorName || ''
        })
    } catch (err) {
        console.error('Import failed:', err)
        mainWindow.webContents.send('p2p-status', 'Error: Could not read keypair file.')
    }
})

// Handle PDF download
ipcMain.on('download-pdf', async () => {
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