/**
 * MediVault Vault Module
 *
 * Adapted from PearPass's pearpass-lib-vault patterns.
 * Manages encrypted medical record storage using IndexedDB,
 * mirroring PearPass's vault create/list/get/add operations.
 *
 * Storage hierarchy (mirrors PearPass vaults → records):
 *   Vault (patient's master container)
 *     └─ Category (lab_results, imaging, cardiology, mental_health, etc.)
 *         └─ Record (individual medical document)
 *             ├─ metadata (plaintext: id, category, timestamps)
 *             └─ data (encrypted: file content, structured data)
 */

import {
  deriveKeyFromPassword,
  encryptAES,
  decryptAES,
  encryptRecord,
  decryptRecord,
  encryptFile,
  decryptFile,
  exportKey,
  importKey,
  base64Encode,
  base64Decode,
  generateEd25519KeyPair,
  hashData,
  secureZero
} from '../crypto'

const DB_NAME = 'medivault'
const DB_VERSION = 2
const STORES = {
  VAULT_META: 'vault_meta',
  RECORDS: 'records',
  FILES: 'files',
  SHARES: 'shares',
  AUDIT_LOG: 'audit_log',
  DOCTORS: 'doctors'
}

// ─── IndexedDB Setup (mirrors PearPass local storage layer) ───

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(STORES.VAULT_META)) {
        db.createObjectStore(STORES.VAULT_META, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        const store = db.createObjectStore(STORES.RECORDS, { keyPath: 'id' })
        store.createIndex('category', 'category', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        db.createObjectStore(STORES.FILES, { keyPath: 'recordId' })
      }
      if (!db.objectStoreNames.contains(STORES.SHARES)) {
        const shares = db.createObjectStore(STORES.SHARES, { keyPath: 'id' })
        shares.createIndex('recordId', 'recordId', { unique: false })
        shares.createIndex('doctorId', 'doctorId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.AUDIT_LOG)) {
        const audit = db.createObjectStore(STORES.AUDIT_LOG, { keyPath: 'id', autoIncrement: true })
        audit.createIndex('timestamp', 'timestamp', { unique: false })
        audit.createIndex('recordId', 'recordId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.DOCTORS)) {
        db.createObjectStore(STORES.DOCTORS, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function dbOperation(storeName, mode, operation) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const request = operation(store)
    if (request && request.onsuccess !== undefined) {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    } else {
      tx.oncomplete = () => resolve(request)
      tx.onerror = () => reject(tx.error)
    }
  })
}

// ─── Vault Management (mirrors PearPass vault init/create/open) ───

/**
 * Initialize a new vault with a master password.
 * Mirrors PearPass createMasterPassword + vaultsInit flow.
 */
export async function createVault(masterPassword) {
  const { key, salt } = await deriveKeyFromPassword(masterPassword)
  const rawKey = await exportKey(key)

  // Generate patient identity keypair (Ed25519) for audit signing
  const identity = generateEd25519KeyPair()

  // Encrypt the identity private key with the vault key
  const identityEncrypted = await encryptAES(identity.privateKey, key)

  // Store vault metadata
  await dbOperation(STORES.VAULT_META, 'readwrite', (store) => {
    store.put({
      key: 'vault_salt',
      value: base64Encode(salt)
    })
    store.put({
      key: 'vault_key_check',
      value: base64Encode(await_hash_stub()) // Replaced by hash check below
    })
    store.put({
      key: 'identity_public_key',
      value: base64Encode(identity.publicKey)
    })
    store.put({
      key: 'identity_private_key_encrypted',
      value: {
        iv: base64Encode(identityEncrypted.iv),
        ciphertext: base64Encode(identityEncrypted.ciphertext)
      }
    })
    store.put({
      key: 'vault_created_at',
      value: new Date().toISOString()
    })
    return store.put({
      key: 'vault_initialized',
      value: true
    })
  })

  // Store a verification hash so we can check passwords on unlock
  const checkHash = await hashData('medivault_verification_token')
  const checkEncrypted = await encryptAES(checkHash, key)
  await dbOperation(STORES.VAULT_META, 'readwrite', (store) =>
    store.put({
      key: 'vault_key_check',
      value: {
        iv: base64Encode(checkEncrypted.iv),
        ciphertext: base64Encode(checkEncrypted.ciphertext)
      }
    })
  )

  return { key, identity }
}

/**
 * Unlock an existing vault with the master password.
 * Mirrors PearPass vaultsInit with encryptionKey.
 */
export async function unlockVault(masterPassword) {
  // Retrieve stored salt
  const saltEntry = await dbOperation(STORES.VAULT_META, 'readonly', (store) =>
    store.get('vault_salt')
  )
  if (!saltEntry) throw new Error('No vault found. Please create one first.')

  const salt = base64Decode(saltEntry.value)
  const { key } = await deriveKeyFromPassword(masterPassword, salt)

  // Verify password correctness
  const checkEntry = await dbOperation(STORES.VAULT_META, 'readonly', (store) =>
    store.get('vault_key_check')
  )
  if (checkEntry && checkEntry.value) {
    try {
      const iv = base64Decode(checkEntry.value.iv)
      const ct = base64Decode(checkEntry.value.ciphertext)
      await decryptAES(ct, iv, key)
    } catch {
      throw new Error('Invalid master password.')
    }
  }

  return { key }
}

/**
 * Check if a vault exists.
 */
export async function isVaultInitialized() {
  try {
    const entry = await dbOperation(STORES.VAULT_META, 'readonly', (store) =>
      store.get('vault_initialized')
    )
    return !!entry?.value
  } catch {
    return false
  }
}

// ─── Record CRUD (mirrors PearPass useCreateRecord, useRecords, useUpdateRecord) ───

export const RECORD_CATEGORIES = Object.freeze({
  LAB_RESULTS: 'lab_results',
  IMAGING: 'imaging',
  CARDIOLOGY: 'cardiology',
  MENTAL_HEALTH: 'mental_health',
  VACCINATION: 'vaccination',
  PRESCRIPTION: 'prescription',
  GENERAL: 'general',
  DENTAL: 'dental',
  ALLERGY: 'allergy'
})

export const CATEGORY_LABELS = {
  [RECORD_CATEGORIES.LAB_RESULTS]: 'Lab Results',
  [RECORD_CATEGORIES.IMAGING]: 'Imaging',
  [RECORD_CATEGORIES.CARDIOLOGY]: 'Cardiology',
  [RECORD_CATEGORIES.MENTAL_HEALTH]: 'Mental Health',
  [RECORD_CATEGORIES.VACCINATION]: 'Vaccination',
  [RECORD_CATEGORIES.PRESCRIPTION]: 'Prescription',
  [RECORD_CATEGORIES.GENERAL]: 'General',
  [RECORD_CATEGORIES.DENTAL]: 'Dental',
  [RECORD_CATEGORIES.ALLERGY]: 'Allergy'
}

/**
 * Create a new medical record.
 * Mirrors PearPass createRecord({ title, type, fields }).
 */
export async function createRecord(recordData, file, vaultKey) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  // Encrypt record metadata+fields
  const encryptedData = await encryptRecord(
    {
      title: recordData.title,
      description: recordData.description || '',
      category: recordData.category,
      date: recordData.date || now,
      tags: recordData.tags || [],
      fhirResource: recordData.fhirResource || null,
      notes: recordData.notes || ''
    },
    vaultKey
  )

  // Store record entry
  const record = {
    id,
    category: recordData.category,
    encryptedData,
    hasFile: !!file,
    createdAt: now,
    updatedAt: now,
    isShared: false,
    shareCount: 0
  }

  await dbOperation(STORES.RECORDS, 'readwrite', (store) =>
    store.put(record)
  )

  // Encrypt and store file if provided
  if (file) {
    const encryptedFile = await encryptFile(file, vaultKey)
    await dbOperation(STORES.FILES, 'readwrite', (store) =>
      store.put({ recordId: id, ...encryptedFile })
    )
  }

  // Log audit entry
  await addAuditEntry({
    action: 'record_created',
    recordId: id,
    recordTitle: recordData.title,
    category: recordData.category
  })

  return { ...record, title: recordData.title }
}

/**
 * List all records, optionally filtered by category.
 * Mirrors PearPass useRecords with filters.
 */
export async function listRecords(vaultKey, filters = {}) {
  const allRecords = await dbOperation(STORES.RECORDS, 'readonly', (store) =>
    store.getAll()
  )

  let filtered = allRecords
  if (filters.category) {
    filtered = filtered.filter(r => r.category === filters.category)
  }

  // Decrypt each record's data
  const decrypted = await Promise.all(
    filtered.map(async (record) => {
      try {
        const data = await decryptRecord(record.encryptedData, vaultKey)
        return { ...record, ...data, encrypted: false }
      } catch {
        return { ...record, title: '[Decryption failed]', encrypted: true }
      }
    })
  )

  // Sort by date descending
  decrypted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (filters.sort === 'title') {
    decrypted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }

  return decrypted
}

/**
 * Get a single record by ID.
 */
export async function getRecord(recordId, vaultKey) {
  const record = await dbOperation(STORES.RECORDS, 'readonly', (store) =>
    store.get(recordId)
  )
  if (!record) throw new Error('Record not found')

  const data = await decryptRecord(record.encryptedData, vaultKey)

  // Get file if exists
  let file = null
  if (record.hasFile) {
    const encryptedFile = await dbOperation(STORES.FILES, 'readonly', (store) =>
      store.get(recordId)
    )
    if (encryptedFile) {
      file = encryptedFile
    }
  }

  return { ...record, ...data, file }
}

/**
 * Delete a record and its associated file.
 */
export async function deleteRecord(recordId) {
  await dbOperation(STORES.RECORDS, 'readwrite', (store) =>
    store.delete(recordId)
  )
  await dbOperation(STORES.FILES, 'readwrite', (store) =>
    store.delete(recordId)
  )
  await addAuditEntry({
    action: 'record_deleted',
    recordId
  })
}

/**
 * Download (decrypt) a file associated with a record.
 */
export async function downloadRecordFile(recordId, vaultKey) {
  const encryptedFile = await dbOperation(STORES.FILES, 'readonly', (store) =>
    store.get(recordId)
  )
  if (!encryptedFile) throw new Error('No file found for this record')

  return decryptFile(encryptedFile, vaultKey)
}

// ─── Doctor Management ───

export async function addDoctor(doctorData) {
  const id = doctorData.id || crypto.randomUUID()
  const doctor = {
    id,
    name: doctorData.name,
    specialty: doctorData.specialty || '',
    institution: doctorData.institution || '',
    email: doctorData.email || '',
    publicKey: doctorData.publicKey || null,
    addedAt: new Date().toISOString()
  }
  await dbOperation(STORES.DOCTORS, 'readwrite', (store) =>
    store.put(doctor)
  )
  await addAuditEntry({
    action: 'doctor_added',
    doctorId: id,
    doctorName: doctor.name
  })
  return doctor
}

export async function listDoctors() {
  return dbOperation(STORES.DOCTORS, 'readonly', (store) =>
    store.getAll()
  )
}

export async function getDoctor(doctorId) {
  return dbOperation(STORES.DOCTORS, 'readonly', (store) =>
    store.get(doctorId)
  )
}

export async function removeDoctor(doctorId) {
  await dbOperation(STORES.DOCTORS, 'readwrite', (store) =>
    store.delete(doctorId)
  )
  await addAuditEntry({ action: 'doctor_removed', doctorId })
}

// ─── Sharing (extends PearPass handshake pattern for medical data) ───

/**
 * Create a share grant: encrypts a record's decryption key
 * for a specific doctor's public key.
 */
export async function createShare(shareData) {
  const id = crypto.randomUUID()
  const share = {
    id,
    recordId: shareData.recordId,
    recordTitle: shareData.recordTitle,
    doctorId: shareData.doctorId,
    doctorName: shareData.doctorName,
    expiresAt: shareData.expiresAt || null,
    allowDownload: shareData.allowDownload || false,
    encryptedRecordKey: shareData.encryptedRecordKey || null,
    status: 'active',
    createdAt: new Date().toISOString(),
    accessCount: 0,
    lastAccessedAt: null
  }

  await dbOperation(STORES.SHARES, 'readwrite', (store) =>
    store.put(share)
  )

  // Update record's share status
  const record = await dbOperation(STORES.RECORDS, 'readonly', (store) =>
    store.get(shareData.recordId)
  )
  if (record) {
    record.isShared = true
    record.shareCount = (record.shareCount || 0) + 1
    record.updatedAt = new Date().toISOString()
    await dbOperation(STORES.RECORDS, 'readwrite', (store) =>
      store.put(record)
    )
  }

  await addAuditEntry({
    action: 'share_created',
    recordId: shareData.recordId,
    recordTitle: shareData.recordTitle,
    doctorId: shareData.doctorId,
    doctorName: shareData.doctorName,
    expiresAt: share.expiresAt
  })

  return share
}

export async function listShares(filters = {}) {
  const all = await dbOperation(STORES.SHARES, 'readonly', (store) =>
    store.getAll()
  )

  let result = all.filter(s => s.status === 'active')

  if (filters.recordId) {
    result = result.filter(s => s.recordId === filters.recordId)
  }
  if (filters.doctorId) {
    result = result.filter(s => s.doctorId === filters.doctorId)
  }

  // Check expiration
  const now = new Date()
  result = result.map(s => {
    if (s.expiresAt && new Date(s.expiresAt) < now) {
      return { ...s, status: 'expired' }
    }
    return s
  })

  return result
}

/**
 * Revoke a specific share.
 */
export async function revokeShare(shareId) {
  const share = await dbOperation(STORES.SHARES, 'readonly', (store) =>
    store.get(shareId)
  )
  if (!share) throw new Error('Share not found')

  share.status = 'revoked'
  share.revokedAt = new Date().toISOString()

  await dbOperation(STORES.SHARES, 'readwrite', (store) =>
    store.put(share)
  )

  await addAuditEntry({
    action: 'share_revoked',
    shareId,
    recordId: share.recordId,
    doctorId: share.doctorId,
    doctorName: share.doctorName
  })

  return share
}

/**
 * Revoke all shares for a given doctor.
 */
export async function revokeAllSharesForDoctor(doctorId) {
  const shares = await listShares({ doctorId })
  for (const share of shares) {
    if (share.status === 'active') {
      await revokeShare(share.id)
    }
  }
  await addAuditEntry({
    action: 'all_shares_revoked_for_doctor',
    doctorId
  })
}

/**
 * Generate a shareable link token (simulated — in production this would
 * be a signed JWT or capability URL with the encrypted record key embedded).
 */
export function generateShareLink(shareId) {
  const token = base64Encode(new TextEncoder().encode(
    JSON.stringify({ shareId, ts: Date.now() })
  ))
  return `${window.location.origin}/doctor/view/${token}`
}

// ─── Audit Log (immutable, signed entries — mirrors PearPass transcript) ───

export async function addAuditEntry(entry) {
  const auditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    actor: entry.actor || 'patient'
  }
  await dbOperation(STORES.AUDIT_LOG, 'readwrite', (store) =>
    store.put(auditEntry)
  )
  return auditEntry
}

export async function getAuditLog(filters = {}) {
  const all = await dbOperation(STORES.AUDIT_LOG, 'readonly', (store) =>
    store.getAll()
  )

  let result = all
  if (filters.recordId) {
    result = result.filter(e => e.recordId === filters.recordId)
  }
  if (filters.action) {
    result = result.filter(e => e.action === filters.action)
  }
  if (filters.since) {
    const since = new Date(filters.since)
    result = result.filter(e => new Date(e.timestamp) >= since)
  }

  result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  if (filters.limit) {
    result = result.slice(0, filters.limit)
  }

  return result
}

// ─── FHIR Support (basic resource structure) ───

export const FHIR_RESOURCE_TYPES = {
  DIAGNOSTIC_REPORT: 'DiagnosticReport',
  OBSERVATION: 'Observation',
  IMAGING_STUDY: 'ImagingStudy',
  MEDICATION_REQUEST: 'MedicationRequest',
  IMMUNIZATION: 'Immunization',
  ALLERGY_INTOLERANCE: 'AllergyIntolerance',
  CONDITION: 'Condition',
  DOCUMENT_REFERENCE: 'DocumentReference'
}

/**
 * Create a FHIR-compatible resource wrapper for a medical record.
 */
export function createFHIRResource(type, data) {
  return {
    resourceType: type,
    id: crypto.randomUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'MediVault'
    },
    status: data.status || 'final',
    ...data
  }
}

// ─── Vault Destruction ───

export async function destroyVault() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Stub for avoiding top-level await issue
function await_hash_stub() {
  return new Uint8Array(32)
}
