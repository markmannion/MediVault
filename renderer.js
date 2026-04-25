// Auth Elements
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const authRole = document.getElementById('auth-role');
const authName = document.getElementById('auth-name');
const btnRegister = document.getElementById('btn-register');
const btnLogin = document.getElementById('btn-login');

// App Elements
const profileName = document.getElementById('profile-name');
const myPublicKey = document.getElementById('my-public-key');
const doctorSetup = document.getElementById('doctor-setup');
const patientSetup = document.getElementById('patient-setup');
const doctorControls = document.getElementById('doctor-controls');
const statusDiv = document.getElementById('status');
const recordsDiv = document.getElementById('records');

// State
let myIdentity = null;
let selectedImage = null;

// --- AUTHENTICATION FLOW ---

btnRegister.addEventListener('click', () => {
    if (!authName.value.trim()) return alert('Please enter your name.');
    window.p2pAPI.register({ role: authRole.value, name: authName.value });
});

btnLogin.addEventListener('click', () => {
    window.p2pAPI.login();
});

window.p2pAPI.onIdentity((identity) => {
    myIdentity = identity;
    
    // Switch Views
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    
    // Populate Profile
    profileName.textContent = `${identity.role.toUpperCase()}: ${identity.name}`;
    myPublicKey.value = identity.publicKey;

    // Show appropriate controls
    if (identity.role === 'doctor') {
        doctorSetup.classList.remove('hidden');
    } else {
        patientSetup.classList.remove('hidden');
    }
});

// --- P2P CONNECTION FLOW ---

// Doctor Starts Ledger
document.getElementById('btn-start-ledger').addEventListener('click', (e) => {
    e.target.disabled = true;
    doctorControls.classList.remove('hidden');
    window.p2pAPI.init({ identity: myIdentity });
});

// Patient Connects to Ledger
document.getElementById('btn-connect-patient').addEventListener('click', (e) => {
    const docKey = document.getElementById('connect-doc-key').value.trim();
    const pin = document.getElementById('connect-pin').value.trim();
    
    if (!docKey || !pin) return alert('Doctor Key and PIN are required.');
    
    e.target.disabled = true;
    window.p2pAPI.init({ 
        identity: myIdentity, 
        doctorPublicKey: docKey,
        patientPin: pin
    });
});

// --- ADDING NOTES (DOCTOR) ---

const imageInput = document.getElementById('image-input');
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => { selectedImage = ev.target.result; };
        reader.readAsDataURL(file);
    }
});

document.getElementById('btn-send-note').addEventListener('click', () => {
    const patientId = document.getElementById('add-note-patient-id').value.trim();
    const pin = document.getElementById('add-note-patient-pin').value.trim();
    const subject = document.getElementById('add-note-subject').value.trim();
    const text = document.getElementById('note-input').value.trim();

    if (!patientId || !pin) return alert('Patient Public Key and PIN are required for encryption.');

    window.p2pAPI.addNote({
        patientId: patientId,
        patientPin: pin,
        subject: subject,
        text: text,
        image: selectedImage
    });

    // Clear form
    document.getElementById('add-note-subject').value = '';
    document.getElementById('note-input').value = '';
    imageInput.value = '';
    selectedImage = null;
    alert('Encrypted note added to ledger.');
});

// --- RENDERING RECORDS ---

window.p2pAPI.onStatus((msg) => {
    statusDiv.textContent = msg;
});

window.p2pAPI.onRecord((record) => {
    // Clear "No records" message on first entry
    if (recordsDiv.children[0].textContent.includes('No records')) {
        recordsDiv.innerHTML = '';
    }

    const recordEl = document.createElement('div');
    recordEl.className = 'record-entry';

    let imgHtml = record.image ? `<img src="${record.image}" style="max-width: 100%; max-height: 200px; margin-top: 10px; border-radius: 4px;">` : '';

    recordEl.innerHTML = `
        <div style="border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 700; color: #22577A; margin-bottom: 4px;">Subject: ${record.subject}</div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #666;">
                <div><strong>Dr. ${record.doctor}</strong></div>
                <div class="timestamp">${record.timestamp}</div>
            </div>
        </div>
        <div style="white-space: pre-wrap; font-size: 14px;">${record.note}</div>
        ${imgHtml}
    `;
    recordsDiv.appendChild(recordEl);
    recordsDiv.scrollTop = recordsDiv.scrollHeight;
});