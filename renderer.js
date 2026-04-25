const roleSelect = document.getElementById('role-select');
const patientKeyInput = document.getElementById('patient-key-input');
const connectBtn = document.getElementById('connect-btn');
const statusDiv = document.getElementById('status');
const recordsDiv = document.getElementById('records');
const doctorControls = document.getElementById('doctor-controls');
const noteInput = document.getElementById('note-input');
const sendNoteBtn = document.getElementById('send-note-btn');
const attachBtn = document.getElementById('attach-btn');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const removeImgBtn = document.getElementById('remove-img-btn');

let currentRole = 'doctor';
let selectedImage = null;

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

// Image Selection
if (attachBtn) {
  attachBtn.addEventListener('click', () => {
    imageInput.click();
  });
}

if (imageInput) {
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedImage = e.target.result;
        previewImg.src = selectedImage;
        imagePreview.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    }
  });
}

if (removeImgBtn) {
  removeImgBtn.addEventListener('click', () => {
    selectedImage = null;
    imageInput.value = '';
    imagePreview.style.display = 'none';
  });
}

// Send Note (Doctor only)
sendNoteBtn.addEventListener('click', () => {
  const text = noteInput.value.trim();
  if (text !== '' || selectedImage) {
    window.p2pAPI.addNote({ text: text, image: selectedImage });
    noteInput.value = '';
    selectedImage = null;
    if (imageInput) imageInput.value = '';
    if (imagePreview) imagePreview.style.display = 'none';
  }
});

// Listen for Main Process Events
window.p2pAPI.onStatus((msg) => {
  statusDiv.textContent = msg;
});

window.p2pAPI.onRecord((record) => {
  const recordEl = document.createElement('div');
  recordEl.className = 'record-entry';
  let imgHtml = '';
  if (record.image) {
    imgHtml = `<img src="${record.image}" style="max-width: 100%; max-height: 200px; border-radius: 4px; margin-top: 8px;">`;
  }
  recordEl.innerHTML = `
    <div class="timestamp">${record.timestamp}</div>
    <div><strong>${record.doctor}:</strong> ${record.note}</div>
    ${imgHtml}
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