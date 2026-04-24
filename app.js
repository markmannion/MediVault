
import Hyperswarm from 'hyperswarm';
import Hypercore from 'hypercore';
import crypto from 'crypto';
import b4a from 'b4a';
import readline from 'readline/promises';
import fs from 'fs';
import path from 'path';

// 1. Setup the Terminal UI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Generate or load a persistent unique device ID
function getDeviceId(notebookName) {
    const idDir = `./data/notes-${notebookName}`;
    const idFile = path.join(idDir, '.device-id');

    if (!fs.existsSync(idDir)) {
        fs.mkdirSync(idDir, { recursive: true });
    }

    if (fs.existsSync(idFile)) {
        return fs.readFileSync(idFile, 'utf8').trim();
    }

    const newId = crypto.randomBytes(8).toString('hex');
    fs.writeFileSync(idFile, newId);
    return newId;
}

async function bootApp() {
    console.clear();
    console.log('=============================================');
    console.log('🍐 UNSTOPPABLE P2P NOTES - HACKUPC 2026 🍐');
    console.log('=============================================\n');

    // 2. Ask the user for a Notebook ID (This acts as our Swarm Topic)
    const notebookName = await rl.question('Enter a Notebook ID to join/create: ');

    // Hash the notebook name to create a secure 32-byte topic for the DHT
    const topic = crypto.createHash('sha256').update(notebookName).digest();

    // FIX 1: Generate or load a stable unique device ID so "source" is
    // unique per machine across sessions instead of always being "me".
    const deviceId = getDeviceId(notebookName);

    // 3. Initialize the Distributed Ledger (Hypercore)
    const core = new Hypercore(`./data/notes-${notebookName}`, { valueEncoding: 'json' });
    await core.ready();
    console.log(`\n[+] Local Ledger ready. Device ID: ${deviceId}`);
    console.log(`[+] You have ${core.length} previous notes saved locally.`);

    // 4. Initialize the DHT Swarm
    const swarm = new Hyperswarm();
    const peers = new Set();

    // FIX 2: Graceful shutdown — close swarm and core cleanly on exit so no
    // error is thrown when the user presses Ctrl+C.
    async function shutdown() {
        console.log('\n[*] Shutting down gracefully...');
        rl.close();
        for (const peer of peers) {
            peer.destroy();
        }
        await swarm.destroy();
        await core.close();
        console.log('[+] Goodbye!');
        process.exit(0);
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // 5. Handle incoming P2P Connections
    swarm.on('connection', async (conn, info) => {
        peers.add(conn);
        console.log('\n[🤝] A new peer joined the notebook swarm!');

        // FIX 3: Sync existing notes to the newly connected peer so they
        // receive the full history, not just notes written after they joined.
        try {
            for (let i = 0; i < core.length; i++) {
                const existingNote = await core.get(i);
                conn.write(b4a.from(JSON.stringify(existingNote) + '\n'));
            }
        } catch (e) {
            console.error('[!] Error sending history to peer:', e.message);
        }

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

                    // FIX 4: Deduplicate — skip notes we already have locally
                    // (avoids double-storing history replayed on reconnect).
                    let alreadyStored = false;
                    for (let i = 0; i < core.length; i++) {
                        const existing = await core.get(i);
                        if (
                            existing.source === message.source &&
                            existing.timestamp === message.timestamp &&
                            existing.text === message.text
                        ) {
                            alreadyStored = true;
                            break;
                        }
                    }

                    if (!alreadyStored) {
                        console.log(`\n[P2P Note from ${message.source}]: ${message.text}`);
                        await core.append({
                            source: message.source,
                            text: message.text,
                            timestamp: message.timestamp
                        });
                    }
                } catch (e) {
                    // Ignore malformed data
                }
            }
        });

        conn.on('close', () => {
            peers.delete(conn);
            console.log('\n[🚪] A peer left the swarm.');
        });

        conn.on('error', (err) => {
            peers.delete(conn);
            console.log(`\n[!] Peer connection error: ${err.message}`);
        });
    });

    // 6. Join the Swarm
    console.log(`[*] Searching the DHT for peers on topic: "${notebookName}"...`);
    swarm.join(topic);

    // flush() resolves once the local join has been announced to the DHT;
    // peer *discovery* happens asynchronously afterward via the 'connection' event.
    swarm.flush().then(() => {
        console.log('[+] Announced on DHT. Waiting for peers...');
    });

    console.log('[+] Swarm active! You can start typing your notes.');
    console.log('---------------------------------------------\n');

    // 7. Input Loop: Read user input and broadcast to peers
    while (true) {
        let input;
        try {
            input = await rl.question('');
        } catch {
            // readline was closed (Ctrl+C during prompt) — shutdown handles it
            break;
        }

        if (input.trim() === '') continue;
        if (input.trim().toLowerCase() === '/quit') {
            await shutdown();
            break;
        }

        const noteData = {
            source: deviceId,   // FIX 1 applied: unique device ID instead of "me"
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
