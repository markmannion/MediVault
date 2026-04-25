import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import Hypercore from 'hypercore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import fs from 'fs'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow
let core
let swarm
let currentIdentity = null
let patientSentUpTo = 0

// AES-256-GCM Encryption Helpers
const ALGORITHM = 'aes-256-gcm'

function encryptPayload(dataObj, secretPin) {
    const text = JSON.stringify(dataObj)
    const key = crypto.scryptSync(secretPin, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return { iv: iv.toString('hex'), encrypted, authTag }
}

function decryptPayload(encObj, secretPin) {
    try {
        const key = crypto.scryptSync(secretPin, 'salt', 32)
        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(encObj.iv, 'hex'))
        decipher.setAuthTag(Buffer.from(encObj.authTag, 'hex'))
        let decrypted = decipher.update(encObj.encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return JSON.parse(decrypted)
    } catch (err) {
        return null // Decryption failed (wrong pin)
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })
    mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

// --- AUTHENTICATION & IDENTITY ---

ipcMain.on('register-identity', async (event, { role, name }) => {
    try {
        // Create a temporary core just to let Hypercore generate a valid Ed25519 keypair safely
        const tempPath = `./temp-data-${Date.now()}`
        const tempCore = new Hypercore(tempPath)
        await tempCore.ready()
        
        const keypair = {
            role,
            name: name.trim(),
            publicKey: b4a.toString(tempCore.key, 'hex'),
            secretKey: b4a.toString(tempCore.keyPair.secretKey, 'hex')
        }
        
        await tempCore.close()
        fs.rmSync(tempPath, { recursive: true, force: true }) // Clean up temp files

        const savePath = await dialog.showSaveDialog({
            title: `Save ${role} Identity`,
            defaultPath: `medivault-${role}-${name.replace(/\s+/g, '')}.medivault`,
            filters: [{ name: 'MediVault Identity', extensions: ['medivault'] }]
        })

        if (savePath.canceled) return

        fs.writeFileSync(savePath.filePath, JSON.stringify(keypair, null, 2))
        mainWindow.webContents.send('identity-established', keypair)
    } catch (err) {
        console.error('Registration failed:', err)
        mainWindow.webContents.send('p2p-status', 'Error generating identity.')
    }
})

ipcMain.on('login-identity', async () => {
    try {
        const openPath = await dialog.showOpenDialog({
            title: 'Import MediVault Identity',
            filters: [{ name: 'MediVault Identity', extensions: ['medivault'] }],
            properties: ['openFile']
        })

        if (openPath.canceled || !openPath.filePaths.length) return

        const keypair = JSON.parse(fs.readFileSync(openPath.filePaths[0], 'utf8'))
        mainWindow.webContents.send('identity-established', keypair)
    } catch (err) {
        console.error('Login failed:', err)
        mainWindow.webContents.send('p2p-status', 'Error: Invalid keypair file.')
    }
})

// --- P2P NETWORK ---

ipcMain.on('init-p2p', async (event, data) => {
    const { identity, doctorPublicKey, patientPin } = data
    currentIdentity = identity
    const isDoctor = identity.role === 'doctor'

    const hypercoreKeyPair = {
        publicKey: b4a.from(identity.publicKey, 'hex'),
        secretKey: b4a.from(identity.secretKey, 'hex')
    }

    if (isDoctor) {
        // Doctor hosts their own core
        core = new Hypercore(`./data-doctor-${identity.publicKey.slice(0, 8)}`, hypercoreKeyPair, { valueEncoding: 'json' })
        await core.ready()

        mainWindow.webContents.send('p2p-status', 'Ledger active. Waiting for patients to connect...')

        // Load historical records for the doctor (requires them to have the PINs, or we just show subjects)
        core.on('append', async () => {
            const block = await core.get(core.length - 1)
            // Doctor sees subjects natively. Payloads remain encrypted unless decrypted manually.
            mainWindow.webContents.send('p2p-record', { 
                timestamp: block.timestamp, 
                doctor: block.doctor, 
                patientId: block.patientId,
                subject: block.subject, 
                note: '[Encrypted Payload]', 
                image: null 
            })
        })
    } else {
        // Patient connects to the DOCTOR'S core to read
        if (!doctorPublicKey || !patientPin) {
            mainWindow.webContents.send('p2p-status', 'Error: Doctor Public Key and PIN required.')
            return
        }

        core = new Hypercore(`./data-patient-${identity.publicKey.slice(0, 8)}`, b4a.from(doctorPublicKey, 'hex'), { valueEncoding: 'json' })
        await core.ready()

        mainWindow.webContents.send('p2p-status', 'Connecting to Doctor\'s swarm...')

        core.on('append', async () => {
            const length = core.length
            for (let i = patientSentUpTo; i < length; i++) {
                const block = await core.get(i)
                
                // We still check ID so we don't waste CPU decrypting others' blocks,
                // but if bypassed, the cryptography protects the data.
                if (block.patientId === identity.publicKey) {
                    const decryptedData = decryptPayload({ iv: block.iv, encrypted: block.encrypted, authTag: block.authTag }, patientPin)
                    
                    if (decryptedData) {
                        mainWindow.webContents.send('p2p-record', { 
                            timestamp: block.timestamp, 
                            doctor: block.doctor, 
                            subject: block.subject, 
                            note: decryptedData.note, 
                            image: decryptedData.image 
                        })
                    } else {
                        console.error('Decryption failed for block', i)
                    }
                }
            }
            patientSentUpTo = length
        })
    }

    swarm = new Hyperswarm()
    swarm.on('connection', (conn) => {
        mainWindow.webContents.send('p2p-status', '🟢 Secure P2P Connection Established!')
        core.replicate(conn)
    })
    swarm.join(core.discoveryKey)
})

ipcMain.on('add-note', async (event, data) => {
    if (!core || !currentIdentity) return

    const { patientId, patientPin, subject, text, image } = data
    
    // Encrypt the sensitive payload
    const encData = encryptPayload({ note: text, image: image }, patientPin)

    const record = {
        timestamp: new Date().toLocaleTimeString(),
        doctor: currentIdentity.name,
        patientId: patientId.trim(),
        subject: subject || 'Medical Note', // Subject left plaintext for ledger visibility
        iv: encData.iv,
        encrypted: encData.encrypted,
        authTag: encData.authTag
    }

    await core.append(record)
})