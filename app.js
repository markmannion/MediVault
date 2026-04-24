// ... [Keep your imports and getDeviceId function the same] ...

async function bootApp() {
    // ... [Keep terminal UI, notebookName, deviceId setup the same] ...

    const core = new Hypercore(`./data/notes-${notebookName}`, { valueEncoding: 'json' });
    await core.ready();
    console.log(`\n[+] Local Ledger ready. Device ID: ${deviceId}`);
    console.log(`[+] You have ${core.length} previous notes saved locally.`);

    // FIX 1: Create an in-memory cache of note signatures for O(1) lightning-fast lookups
    const knownNotes = new Set();
    for (let i = 0; i < core.length; i++) {
        const note = await core.get(i);
        knownNotes.add(`${note.source}-${note.timestamp}`);
    }

    const swarm = new Hyperswarm();
    const peers = new Set();

    // ... [Keep shutdown logic the same] ...

    swarm.on('connection', async (conn, info) => {
        peers.add(conn);
        console.log('\n[🤝] A new peer joined the notebook swarm!');

        // Send history to the new peer
        try {
            for (let i = 0; i < core.length; i++) {
                const existingNote = await core.get(i);
                conn.write(b4a.from(JSON.stringify(existingNote) + '\n'));
            }
        } catch (e) {
            console.error('[!] Error sending history:', e.message);
        }

        let peerBuffer = '';
        conn.on('data', async (data) => {
            peerBuffer += b4a.toString(data); // Safer than data.toString()
            const lines = peerBuffer.split('\n');
            peerBuffer = lines.pop(); 

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const message = JSON.parse(line);
                    
                    // The unique signature of this note
                    const noteId = `${message.source}-${message.timestamp}`;

                    // FIX 2: Instant O(1) lookup. No more death loop!
                    if (!knownNotes.has(noteId)) {
                        knownNotes.add(noteId); // Add to memory cache immediately

                        console.log(`\n[P2P Note from ${message.source}]: ${message.text}`);
                        
                        await core.append({
                            source: message.source,
                            text: message.text,
                            timestamp: message.timestamp
                        });

                        // FIX 3: Gossip Protocol! 
                        // Forward this new note to all OTHER peers we are connected to.
                        // This ensures the whole swarm gets it, even if they aren't directly connected to the sender.
                        const forwardBuffer = b4a.from(line + '\n');
                        for (const peer of peers) {
                            if (peer !== conn) { // Don't send it back to the person who just sent it to us
                                peer.write(forwardBuffer);
                            }
                        }
                    }
                } catch (e) {
                    // Ignore malformed data
                }
            }
        });

        // ... [Keep conn.on('close') and conn.on('error') the same] ...
    });

    // ... [Keep Swarm Join and Input Loop exactly the same] ...
}