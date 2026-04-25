const roleSelect = document.getElementById('role-select');
const patientKeyInput = document.getElementById('patient-key-input');
const connectBtn = document.getElementById('connect-btn');
const statusDiv = document.getElementById('status');
const recordsDiv = document.getElementById('records');
const doctorControls = document.getElementById('doctor-controls');
const noteInput = document.getElementById('note-input');
const sendNoteBtn = document.getElementById('send-note-btn');

let currentRole = 'doctor';

// Toggle UI based on role
roleSelect.addEventListener('change', (e) => {
  currentRole = e.target.value;
  patientKeyInput.style.display = currentRole === 'patient' ? 'block' : 'none';
});

// Initialize P2P
connectBtn.addEventListener('click', () => {
  const keyString = document.getElementById('connection-key').value;
  window.p2pAPI.init({ role: currentRole, keyString });

  connectBtn.disabled = true;
  roleSelect.disabled = true;
  statusDiv.textContent = 'Initializing secure connection...';
});

// Send Note (Doctor only)
sendNoteBtn.addEventListener('click', () => {
  if (noteInput.value.trim() !== '') {
    window.p2pAPI.addNote(noteInput.value);
    noteInput.value = '';
  }
});

// Listen for Main Process Events
window.p2pAPI.onStatus((msg) => {
  statusDiv.textContent = msg;
});

window.p2pAPI.onRecord((record) => {
  const recordEl = document.createElement('div');
  recordEl.className = 'record-entry';
  recordEl.innerHTML = `
    <div class="timestamp">${record.timestamp}</div>
    <div><strong>${record.doctor}:</strong> ${record.note}</div>
  `;
  recordsDiv.appendChild(recordEl);
  recordsDiv.scrollTop = recordsDiv.scrollHeight;
});

// Handle P2P key (for doctor role)
window.p2pAPI.onKey((key) => {
  if (currentRole === 'doctor') {
    statusDiv.textContent = `Ledger created. Share this key with patients: ${key}`;
    doctorControls.style.display = 'block';
  }
});