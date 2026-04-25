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
const subjectInput = document.getElementById('subject-input');

let currentRole = 'doctor';
let selectedImage = null;

// Toggle UI based on role
roleSelect.addEventListener('change', (e) => {
  currentRole = e.target.value;
  const patientKeyInput = document.getElementById('patient-key-input');
  const doctorNameInput = document.getElementById('doctor-name-input');
  
  if (currentRole === 'patient') {
    if (patientKeyInput) patientKeyInput.style.display = 'block';
    if (doctorNameInput) doctorNameInput.style.display = 'none';
  } else {
    if (patientKeyInput) patientKeyInput.style.display = 'none';
    if (doctorNameInput) doctorNameInput.style.display = 'block';
  }
});

// Initialize P2P
connectBtn.addEventListener('click', () => {
  const doctorNameField = document.getElementById('doctor-name');
  const doctorName = doctorNameField ? doctorNameField.value.trim() : '';
  const keyString = document.getElementById('connection-key').value;
  
  console.log('Renderer - Doctor Name:', doctorName);
  console.log('Renderer - Current Role:', currentRole);
  
  // Validate doctor name if role is doctor
  if (currentRole === 'doctor' && !doctorName) {
    alert('Please enter your name to initialize the connection');
    return;
  }
  
  window.p2pAPI.init({ role: currentRole, keyString, doctorName });

  connectBtn.disabled = true;
  currentRole = 'doctor';
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
  const subject = subjectInput ? subjectInput.value.trim() : '';
  const text = noteInput.value.trim();
  if (text !== '' || subject !== '' || selectedImage) {
    window.p2pAPI.addNote({ subject: subject, text: text, image: selectedImage });
    if (subjectInput) subjectInput.value = '';
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
  // Clear empty state on first record
  const emptyState = recordsDiv.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  const recordEl = document.createElement('div');
  recordEl.className = 'record-entry';
  
  let imgHtml = '';
  if (record.image) {
    imgHtml = `<img src="${record.image}" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 4px; margin-top: 12px; cursor: zoom-in; border: 1px solid var(--neutral-border-gray);" onclick="document.getElementById('modal-img').src=this.src; document.getElementById('image-modal').style.display='flex';">`;
  }
  
  const subjectText = record.subject ? record.subject : 'Medical Note';
  const doctorName = record.doctor && !record.doctor.toLowerCase().startsWith('dr.') ? `Dr. ${record.doctor}` : (record.doctor || 'Unknown Doctor');
  
  recordEl.innerHTML = `
    <div style="border-bottom: 1px solid var(--neutral-border-gray); padding-bottom: 8px; margin-bottom: 12px;">
      <div style="font-size: 16px; font-weight: 700; color: var(--primary-dark-blue); margin-bottom: 4px;">Subject: ${subjectText}</div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; color: #666;">
        <div><strong>From:</strong> <span style="color: var(--accent-teal); font-weight: 500;">${doctorName}</span></div>
        <div class="timestamp">${record.timestamp}</div>
      </div>
    </div>
    <div style="color: var(--primary-dark-blue); line-height: 1.5; white-space: pre-wrap; font-size: 14px;">${record.note}</div>
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