import Hypercore from 'hypercore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import readline from 'readline'

// 1. Parse command line arguments
const isDoctor = process.argv.includes('--doctor')
const keyIndex = process.argv.indexOf('--key')
const keyString = keyIndex > -1 ? process.argv[keyIndex + 1] : null

// 2. Initialize Hypercore (The Distributed Ledger)
// The doctor creates a new core. The patient joins an existing one using the Doctor's public key.
const core = new Hypercore(isDoctor ? './doctor-data' : './patient-data', keyString ? b4a.from(keyString, 'hex') : null, {
  valueEncoding: 'json' // Automatically parse our medical records as JSON
})

await core.ready()

// 3. Initialize Hyperswarm (The DHT P2P Network)
const swarm = new Hyperswarm()

// When a peer connects, replicate the Hypercore ledger
swarm.on('connection', (conn) => {
  console.log('\n[+] Secure P2P Connection Established!')
  core.replicate(conn)
})

// Join the swarm using the core's discovery key (this does not leak the actual data key)
const discoveryKey = core.discoveryKey
swarm.join(discoveryKey)

// 4. Application Logic
if (isDoctor) {
  console.log('=========================================')
  console.log('🩺 DOCTOR TERMINAL (Multi-writer Leader)')
  console.log('=========================================')
  console.log('Share this secure key with the patient:')
  console.log(`\n${b4a.toString(core.key, 'hex')}\n`)
  console.log('Waiting for patient to connect...')
  console.log('Type a medical note and press Enter to push to the P2P ledger:\n')

  // Setup terminal input for the doctor
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  
  rl.on('line', async (input) => {
    const record = {
      timestamp: new Date().toISOString(),
      doctor: 'Dr. Smith',
      note: input,
      encrypted: true // Simulating the hackathon requirement
    }
    // Append to the distributed ledger
    await core.append(record)
    console.log('[✓] Record securely committed to P2P ledger.')
  })

} else if (keyString) {
  console.log('=========================================')
  console.log('🧑‍⚕️ PATIENT TERMINAL (DHT Swarm Node)')
  console.log('=========================================')
  console.log('Connecting to DHT and searching for Doctor...\n')

  // Read existing data if we are reconnecting
  if (core.length > 0) {
    console.log('--- Previous Medical Records ---')
    for (let i = 0; i < core.length; i++) {
      const block = await core.get(i)
      console.log(`[${block.timestamp}] ${block.doctor}: ${block.note}`)
    }
    console.log('--------------------------------')
  }

  // Listen for new updates pushed by the doctor in real-time
  core.on('append', async () => {
    const latestRecord = await core.get(core.length - 1)
    console.log(`\n[NEW SECURE RECORD] ${latestRecord.doctor} added a note:`)
    console.log(`-> "${latestRecord.note}"`)
  })
} else {
  console.log('Please specify a role: --doctor OR --patient --key <hex_key>')
  process.exit(1)
}