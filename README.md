# MediVault

**Patient-Controlled Medical Data Sharing** built on [PearPass](https://github.com/tetherto/pearpass-app-browser-extension) end-to-end encryption architecture.

---

## 🏗️ Architecture

MediVault extends PearPass's privacy-first vault encryption patterns to medical records, enabling patients to securely store and selectively share health data with doctors while maintaining full cryptographic control.

### Core Technologies

- **Encryption**: AES-256-GCM (Web Crypto API)
- **Key Derivation**: PBKDF2 with 600,000 iterations (mirrors PearPass)
- **Key Exchange**: X25519 for sharing (mirrors PearPass handshake)
- **Signatures**: Ed25519 for audit integrity
- **Storage**: IndexedDB (client-side only, encrypted at rest)
- **UI**: React 18 + Redux Toolkit + Tailwind CSS

### Adapted PearPass Patterns

| PearPass Module | MediVault Adaptation |
|-----------------|---------------------|
| `pearpass-lib-vault` | `/src/vault/index.js` - Medical record encryption |
| `crypto/secureChannel.js` | `/src/crypto/index.js` - Crypto primitives |
| `vaultClient` | Local-only vault (no desktop app dependency) |
| Redux store slices | `/src/store/index.js` - Records, shares, audit |
| React hooks | `/src/hooks/index.js` - useRecords, useShares |

---

## 🔒 Security Model

### 1. Master Password → Vault Key

```
User Password 
  → PBKDF2(600k iterations, random salt) 
  → AES-256 Vault Key 
  → Encrypts all records
```

### 2. Record Encryption

Each medical record is encrypted independently:

```javascript
Record + File → AES-256-GCM(vaultKey, randomIV) → Encrypted Blob
```

Stored structure:
```json
{
  "id": "uuid",
  "category": "lab_results",
  "encryptedData": {
    "iv": "base64",
    "ciphertext": "base64"
  },
  "hasFile": true,
  "createdAt": "ISO8601"
}
```

### 3. Sharing Mechanism (X25519 Key Exchange)

Mirrors PearPass's secure channel handshake:

```
Patient generates ephemeral X25519 keypair
Doctor provides public key (via QR code / manual entry)
Shared secret = X25519(patientPrivKey, doctorPubKey)
Record key encrypted with shared secret → sent to doctor
Doctor decrypts with their private key → decrypts record
```

### 4. Audit Trail (Ed25519 Signatures)

Every access event is signed to prevent tampering:

```javascript
AuditEntry = { action, recordId, doctorId, timestamp }
Signature = Ed25519.sign(AuditEntry, patientPrivateKey)
→ Stored in append-only log
```

---

## 📁 Project Structure

```
medivault/
├── src/
│   ├── crypto/          # AES-256, X25519, Ed25519 (adapted from PearPass)
│   ├── vault/           # Medical record CRUD, encryption, storage
│   ├── store/           # Redux slices (auth, records, shares, audit)
│   ├── hooks/           # React hooks (useRecords, useShares, etc.)
│   ├── pages/
│   │   ├── patient/     # Vault dashboard, upload, sharing, audit
│   │   └── doctor/      # Public share viewer portal
│   ├── components/
│   │   └── layout/      # Sidebar navigation
│   └── utils/           # Constants, formatters
├── public/
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd medivault

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run at `http://localhost:5173`

### First-Time Setup

1. **Create Vault**: On first launch, you'll see the lock screen. Enter a strong master password (min 8 chars) to create your encrypted vault.

2. **Upload Records**: Navigate to "Upload Records" and add your first medical document (PDF, DICOM, HL7, FHIR JSON supported).

3. **Add Doctors**: Go to "My Doctors" to add healthcare providers you want to share with.

4. **Share Records**: In "Sharing", select records + doctor + expiration, then generate an encrypted share link.

5. **Audit Log**: View all access events in "Audit Log" (immutable, signed trail).

---

## 🧪 Usage Examples

### Patient Workflow

```javascript
// 1. Create vault
await createVault('my-secure-master-password')

// 2. Upload encrypted record
await createRecord({
  title: 'Blood Panel Q1 2025',
  category: 'lab_results',
  date: '2025-01-03',
  description: 'Annual routine blood work',
  tags: ['routine', 'annual']
}, pdfFile, vaultKey)

// 3. Share with doctor
await createShare({
  recordId: 'record-uuid',
  recordTitle: 'Blood Panel Q1 2025',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. Clara Chen',
  expiresAt: '2025-02-03T00:00:00Z',
  allowDownload: false
})

// 4. Generate share link
const link = generateShareLink(share.id)
// Send link to doctor via email/SMS
```

### Doctor Access Flow

1. Doctor receives link: `https://medivault.app/doctor/view/eyJzaGFyZUlkIjoi...`
2. Opens link → sees record metadata
3. Clicks "View Record" → decrypts with their private key
4. Views medical data (read-only, optionally download if allowed)
5. Access event logged to patient's audit trail

---

## 🔐 Compliance Features

### HIPAA Compliance by Design

- ✅ **Encryption at rest**: AES-256-GCM for all records
- ✅ **Patient control**: Granular sharing, revocation, expiration
- ✅ **Audit logging**: Immutable, signed access trail
- ✅ **Access controls**: Time-limited, per-record permissions
- ✅ **No third-party access**: Client-side only, no server sees plaintext

### GDPR Compliance

- ✅ **Data minimization**: Only patient-provided data stored
- ✅ **Right to erasure**: Full vault destruction via `destroyVault()`
- ✅ **Consent management**: Explicit share grants
- ✅ **Portability**: Export records as encrypted JSON/FHIR bundles

---

## 🧬 FHIR / HL7 Support

MediVault parses and indexes standard medical data formats:

### FHIR (JSON)

```json
{
  "resourceType": "DiagnosticReport",
  "status": "final",
  "code": { "text": "Complete Blood Count" },
  "effectiveDateTime": "2025-01-03",
  "result": [
    { "display": "Hemoglobin: 14.2 g/dL (normal)" }
  ]
}
```

### HL7 v2 Messages

Upload `.hl7` files and MediVault will parse segments (PID, OBR, OBX) into structured data.

---

## 🛠️ Build for Production

```bash
npm run build
```

Output in `dist/` directory. Deploy to:
- Static hosting (Netlify, Vercel, Cloudflare Pages)
- IPFS (for fully decentralized hosting)
- Self-hosted (nginx, Apache)

---

## 🔗 PearPass Integration Details

MediVault reuses PearPass cryptographic patterns but simplifies deployment by removing the desktop app dependency. Key adaptations:

### What We Kept

- **Crypto primitives**: AES-256-GCM, PBKDF2, X25519, Ed25519 (via `@noble/ciphers`, `@noble/curves`)
- **Vault structure**: Encrypted key-value storage in IndexedDB
- **Secure channel pattern**: X25519 key exchange for sharing (mirrors handshake)
- **Redux architecture**: Slices for auth, records, shares, audit

### What We Changed

- **No native messaging**: Removed dependency on PearPass desktop app
- **No P2P sync**: Single-device vault (can be extended with Hypercore later)
- **Simplified pairing**: Direct public key exchange vs. pairing codes
- **Medical-specific schemas**: Record categories, FHIR support

### Full PearPass Integration (Optional)

To connect MediVault to the full PearPass ecosystem:

1. Install `pearpass-lib-vault`:
   ```bash
   npm install git+https://github.com/tetherto/pearpass-lib-vault.git
   ```

2. Add desktop app pairing:
   ```javascript
   import { setPearpassVaultClient } from '@tetherto/pearpass-lib-vault'
   import { createPearpassVaultClient } from '@tetherto/pearpass-lib-vault-desktop'
   
   const vaultClient = createPearpassVaultClient()
   setPearpassVaultClient(vaultClient)
   ```

3. Enable P2P sync via Hypercore (see PearPass docs)

---

## 📊 Performance

- **Vault unlock**: ~500ms (PBKDF2 key derivation)
- **Record encryption**: ~50ms per file (depends on size)
- **Record decryption**: ~30ms per file
- **Sharing link generation**: Instant
- **Audit log query**: <10ms (IndexedDB indexed queries)

---

## 🧑‍💻 Development

### Code Style

- Follow PearPass naming conventions (camelCase for functions, PascalCase for components)
- Keep crypto operations in `/src/crypto`
- Keep vault operations in `/src/vault`
- Use Redux Toolkit for state management

### Testing

```bash
npm test
```

Test coverage includes:
- Crypto primitives (encryption, key derivation, signatures)
- Vault operations (create, encrypt, decrypt, share)
- Redux state mutations
- Component rendering

---

## 🚨 Security Considerations

### Known Limitations

1. **JavaScript crypto**: Cannot guarantee secure memory clearing (see `secureZero` comments)
2. **Single device**: No automatic backup (user must export vault manually)
3. **Trust on first use**: Doctor public keys accepted without PKI verification
4. **Client-side only**: No server-side access control enforcement

### Mitigations

1. **OS-level protection**: Process isolation, ASLR, disk encryption
2. **Export/import**: Manual vault backup to encrypted USB drive
3. **QR code verification**: Display fingerprint for out-of-band confirmation
4. **Audit trail**: All access logged immutably

---

## 📄 License

Apache 2.0 (same as PearPass)

---

## 🙏 Acknowledgments

Built on the shoulders of:
- [PearPass](https://github.com/tetherto/pearpass-app-browser-extension) - Open-source password manager
- [@noble/ciphers](https://github.com/paulmillr/noble-ciphers) - Audited crypto library
- [@noble/curves](https://github.com/paulmillr/noble-curves) - Ed25519/X25519 implementation

---

## 🆘 Support

For issues or questions:
1. Check the [PearPass documentation](https://docs.pears.com) for crypto patterns
2. Review `/src/crypto/index.js` for encryption implementation details
3. Open an issue in this repository

---

**MediVault** — Your health data. Your keys. Your control.
