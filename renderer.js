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
const addNotePatientIdInput = document.getElementById('add-note-patient-id');
const downloadPdfBtn = document.getElementById('download-pdf-btn');

let currentRole = 'doctor';
let selectedImage = null;
let currentPatientId = null;

let allRecords = [];
let currentFilter = 'all';
const knownDoctors = new Set();
const doctorListContainer = document.getElementById('doctor-list');

// Setup default 'all' filter listener
const allDoctorsFilter = document.querySelector('.doctor-filter[data-doctor="all"]');
if (allDoctorsFilter) {
    allDoctorsFilter.addEventListener('click', () => {
        setFilter('all', allDoctorsFilter);
    });
}

function setFilter(doctorName, element) {
    document.querySelectorAll('.doctor-filter').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    currentFilter = doctorName;
    renderRecords();
}

function addDoctorToSidebar(doctorName) {
    const div = document.createElement('div');
    div.className = 'doctor-filter';
    div.dataset.doctor = doctorName;

    // Icon
    const iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-teal);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

    const formattedName = doctorName.toLowerCase().startsWith('dr.') ? doctorName : `Dr. ${doctorName}`;
    div.innerHTML = `${iconSvg} ${formattedName}`;

    div.addEventListener('click', () => {
        setFilter(doctorName, div);
    });

    if (doctorListContainer) {
        doctorListContainer.appendChild(div);
    }
}

function renderRecords() {
    recordsDiv.innerHTML = '';

    const filteredRecords = currentFilter === 'all'
        ? allRecords
        : allRecords.filter(r => r.doctor === currentFilter);

    if (filteredRecords.length === 0) {
        recordsDiv.innerHTML = `
      <div class="record-entry empty-state">
        <div class="timestamp">--</div>
        <div>No records found for this selection.</div>
      </div>
    `;
        return;
    }

    filteredRecords.forEach(record => {
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
    });

    recordsDiv.scrollTop = recordsDiv.scrollHeight;
}

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
    const patientIdField = document.getElementById('patient-id');
    const doctorName = doctorNameField ? doctorNameField.value.trim() : '';
    const patientId = patientIdField ? patientIdField.value.trim() : '';
    const keyString = document.getElementById('connection-key') ? document.getElementById('connection-key').value.trim() : '';

    console.log('Renderer - Doctor Name:', doctorName);
    console.log('Renderer - Patient ID:', patientId);
    console.log('Renderer - Current Role:', currentRole);

    // Validate inputs based on role
    if (currentRole === 'doctor') {
        if (!doctorName) {
            alert('Please enter your name to initialize the connection');
            return;
        }
    } else {
        if (!patientId) {
            alert('Please enter your Patient ID to connect');
            return;
        }
        if (!keyString) {
            alert("Please enter the doctor's public key to connect");
            return;
        }
    }

    currentPatientId = patientId;

    // If a keypair was imported, pass the secret key so main.js can restore
    // the exact same Hypercore identity on this new machine
    const importedSecretKey = connectBtn.dataset.importedSecretKey || null;
    const importedPublicKey = connectBtn.dataset.importedPublicKey || null;

    window.p2pAPI.init({
        role: currentRole,
        keyString: importedPublicKey || keyString,
        secretKey: importedSecretKey,
        doctorName,
        patientId
    });

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
    const subjectInput = document.getElementById('subject-input');
    const subject = subjectInput ? subjectInput.value.trim() : '';
    const text = noteInput.value.trim();
    const patientIdField = document.getElementById('add-note-patient-id');
    const patientIdForNote = patientIdField ? patientIdField.value.trim() : '';

    if (!patientIdForNote) {
        alert('Please enter the patient ID for this note');
        return;
    }

    if (text !== '' || subject !== '' || selectedImage) {
        window.p2pAPI.addNote({ patientId: patientIdForNote, subject: subject, text: text, image: selectedImage });
        if (subjectInput) subjectInput.value = '';
        if (patientIdField) patientIdField.value = '';
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
    allRecords.push(record);

    // Only add doctor to sidebar if the record is visible to this user
    // (For patients, only their own records should be received by the backend)
    if (record.doctor && !knownDoctors.has(record.doctor)) {
        knownDoctors.add(record.doctor);
        addDoctorToSidebar(record.doctor);
    }

    renderRecords();
});

// Handle P2P key (doctor role only — patients never receive this event)
window.p2pAPI.onKey((key) => {
    if (currentRole === 'doctor') {
        statusDiv.textContent = `Ledger created. Share this key with patients: ${key}`;
        doctorControls.style.display = 'block';
    }
});

// When a keypair file is imported, pre-fill the doctor name field and store
// the keys on the button so the init handler can pass them to main.js
window.p2pAPI.onKeypairImported(({ publicKey, secretKey, doctorName: importedName }) => {
    const doctorNameField = document.getElementById('doctor-name');
    if (doctorNameField && importedName) doctorNameField.value = importedName;
    connectBtn.dataset.importedSecretKey = secretKey;
    connectBtn.dataset.importedPublicKey = publicKey;
    statusDiv.textContent = `Keypair loaded for ${importedName || 'doctor'}. Click "Initialize Secure Connection" to continue.`;
});

// Export keypair — visible inside doctor controls after connection is established
const exportKeypairBtn = document.getElementById('export-keypair-btn');
if (exportKeypairBtn) {
    exportKeypairBtn.addEventListener('click', () => {
        window.p2pAPI.exportKeypair();
    });
}

// Import keypair — visible in setup card before connection
const importKeypairBtn = document.getElementById('import-keypair-btn');
if (importKeypairBtn) {
    importKeypairBtn.addEventListener('click', () => {
        window.p2pAPI.importKeypair();
    });
}

if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        window.p2pAPI.downloadPDF();
    });
}