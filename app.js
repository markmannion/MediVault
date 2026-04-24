import Hyperswarm from 'hyperswarm';
import Hypercore from 'hypercore';
import crypto from 'crypto';
import b4a from 'b4a';
import readline from 'readline/promises';

// 1. Setup the Terminal UI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function bootApp() {
    console.clear();
    console.log('=============================================');
    console.log('🍐 UNSTOPPABLE P2P NOTES - HACKUPC 2026 🍐');
    console.log('=============================================\n');

    // 2. Ask the user for a Notebook ID (This acts as our Swarm Topic)
    const notebookName = await rl.question('Enter a Notebook ID to join/create: ');

    // Hash the notebook name to create a secure 32-byte topic for the DHT
    const topic = crypto.createHash('sha256').update(notebookName).digest();

    // 3. Initialize the Distributed Ledger (Hypercore)
    // We save the local notes to a folder based on the notebook name
    const core = new Hypercore(`./data/notes-${notebookName}`, { valueEncoding: 'json' });
    await core.ready();
    console.log(`\n[+] Local Ledger ready. You have ${core.length} previous notes saved locally.`);

    // 4. Initialize the DHT Swarm
    const swarm = new Hyperswarm();
    const peers = new Set();

    // 5. Handle incoming P2P Connections
    swarm.on('connection', (conn, info) => {
        peers.add(conn);
        console.log('\n[🤝] A new peer joined the notebook swarm!');

        // Listen for new notes from this peer
        let peerBuffer = '';
        conn.on('data', async (data) => {
            peerBuffer += data.toString();
            const lines = peerBuffer.split('\n');
            peerBuffer = lines.pop(); // Keep the last incomplete line

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const message = JSON.parse(line);
                    console.log(`\n[P2P Note from Peer]: ${message.text}`);

                    // Persist the peer's note to our local Hypercore ledger
                    await core.append({
                        source: 'peer',
                        text: message.text,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    // Ignore malformed data
                }
            }
        });

        conn.on('close', () => {
            peers.delete(conn);
            console.log('\n[🚪] A peer left the swarm.');
        });
    });

    // 6. Join the Swarm
    console.log(`[*] Searching the DHT for peers on topic: "${notebookName}"...`);
    swarm.join(topic);
    await swarm.flush(); // Wait until the swarm discovers the network

    console.log('[+] Swarm active! You can start typing your notes.');
    console.log('---------------------------------------------\n');

    // 7. Input Loop: Read user input and broadcast to peers
    while (true) {
        const input = await rl.question('');
        if (input.trim() === '') continue;

        const noteData = {
            source: 'me',
            text: input,
            timestamp: Date.now()
        };

        // Append to our local immutable ledger
        await core.append(noteData);

        // Broadcast directly to all connected peers
        const buffer = b4a.from(JSON.stringify(noteData) + '\n');
        for (const peer of peers) {
            peer.write(buffer);
        }
    }
}

bootApp().catch(err => {
    console.error('Fatal App Error:', err);
    process.exit(1);
});