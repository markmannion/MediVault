/**
 * MediVault Crypto Module
 *
 * Adapted from PearPass's secureChannel.js and crypto constants.
 * Uses Web Crypto API for AES-256-GCM encryption and PBKDF2 key derivation.
 * Uses @noble/curves for X25519 key exchange (sharing) and Ed25519 signatures (audit).
 *
 * Architecture mirrors PearPass:
 *   - Master password → PBKDF2 → vault encryption key
 *   - Each record encrypted independently with AES-256-GCM
 *   - Sharing uses X25519 ephemeral key exchange (per PearPass handshake pattern)
 *   - Audit entries signed with Ed25519 (per PearPass transcript verification)
 */

import { x25519, ed25519 } from '@noble/curves/ed25519'
import { xchacha20poly1305 } from '@noble/ciphers/chacha'

// ─── Constants (mirrors PearPass src/shared/constants/crypto.js) ───

export const CRYPTO_ALGORITHMS = Object.freeze({
  SHA_256: 'SHA-256',
  PBKDF2: 'PBKDF2',
  AES_GCM: 'AES-GCM'
})

const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 32
const IV_BYTES = 12
const KEY_BYTES = 32

// ─── Helpers (mirrors PearPass src/shared/utils/base64.js + secureZero.js) ───

export const base64Encode = (uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export const base64Decode = (base64String) => {
  const binary = atob(base64String)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export const secureZero = (buffer) => {
  if (!buffer?.fill) return
  try { buffer.fill(0) } catch { /* buffer may be detached */ }
}

const concatUint8Arrays = (arrays) => {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

const generateRandomBytes = (length) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

// ─── Master Password & Key Derivation (mirrors PearPass vault pattern) ───

/**
 * Derive an AES-256 encryption key from a master password using PBKDF2.
 * This mirrors PearPass's createMasterPassword → hashPassword flow.
 */
export async function deriveKeyFromPassword(password, salt = null) {
  const passwordSalt = salt || generateRandomBytes(SALT_BYTES)
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    CRYPTO_ALGORITHMS.PBKDF2,
    false,
    ['deriveKey']
  )
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: CRYPTO_ALGORITHMS.PBKDF2,
      salt: passwordSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: CRYPTO_ALGORITHMS.SHA_256
    },
    passwordKey,
    { name: CRYPTO_ALGORITHMS.AES_GCM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  return { key: derivedKey, salt: passwordSalt }
}

/**
 * Export a CryptoKey to raw bytes for storage.
 */
export async function exportKey(cryptoKey) {
  const raw = await crypto.subtle.exportRaw
    ? crypto.subtle.exportKey('raw', cryptoKey)
    : crypto.subtle.exportKey('raw', cryptoKey)
  return new Uint8Array(raw)
}

/**
 * Import raw key bytes as a CryptoKey.
 */
export async function importKey(rawKeyBytes) {
  return crypto.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: CRYPTO_ALGORITHMS.AES_GCM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// ─── AES-256-GCM Encryption/Decryption (mirrors PearPass vault encryption) ───

/**
 * Encrypt data with AES-256-GCM.
 * Returns { iv, ciphertext } both as Uint8Array.
 */
export async function encryptAES(data, cryptoKey) {
  const iv = generateRandomBytes(IV_BYTES)
  const encoder = new TextEncoder()
  const plaintext = typeof data === 'string' ? encoder.encode(data) : data

  const ciphertext = await crypto.subtle.encrypt(
    { name: CRYPTO_ALGORITHMS.AES_GCM, iv },
    cryptoKey,
    plaintext
  )

  return { iv, ciphertext: new Uint8Array(ciphertext) }
}

/**
 * Decrypt AES-256-GCM ciphertext.
 */
export async function decryptAES(ciphertext, iv, cryptoKey) {
  const plaintext = await crypto.subtle.decrypt(
    { name: CRYPTO_ALGORITHMS.AES_GCM, iv },
    cryptoKey,
    ciphertext
  )
  return new Uint8Array(plaintext)
}

// ─── File Encryption (extends PearPass pattern for binary data) ───

/**
 * Encrypt a File/Blob for vault storage.
 * Returns a serializable encrypted blob with metadata.
 */
export async function encryptFile(file, cryptoKey) {
  const arrayBuffer = await file.arrayBuffer()
  const { iv, ciphertext } = await encryptAES(new Uint8Array(arrayBuffer), cryptoKey)

  return {
    iv: base64Encode(iv),
    ciphertext: base64Encode(ciphertext),
    metadata: {
      name: file.name,
      type: file.type,
      size: file.size,
      encryptedAt: new Date().toISOString()
    }
  }
}

/**
 * Decrypt a stored encrypted blob back to a File.
 */
export async function decryptFile(encryptedBlob, cryptoKey) {
  const iv = base64Decode(encryptedBlob.iv)
  const ciphertext = base64Decode(encryptedBlob.ciphertext)
  const plaintext = await decryptAES(ciphertext, iv, cryptoKey)

  return new File(
    [plaintext],
    encryptedBlob.metadata.name,
    { type: encryptedBlob.metadata.type }
  )
}

// ─── Record Encryption (mirrors PearPass record create/update) ───

/**
 * Encrypt a medical record's structured data.
 */
export async function encryptRecord(recordData, cryptoKey) {
  const json = JSON.stringify(recordData)
  const { iv, ciphertext } = await encryptAES(json, cryptoKey)
  return {
    iv: base64Encode(iv),
    ciphertext: base64Encode(ciphertext)
  }
}

/**
 * Decrypt a medical record.
 */
export async function decryptRecord(encryptedRecord, cryptoKey) {
  const iv = base64Decode(encryptedRecord.iv)
  const ciphertext = base64Decode(encryptedRecord.ciphertext)
  const plaintext = await decryptAES(ciphertext, iv, cryptoKey)
  const decoder = new TextDecoder()
  return JSON.parse(decoder.decode(plaintext))
}

// ─── X25519 Key Exchange for Sharing (mirrors PearPass secureChannel handshake) ───

/**
 * Generate an X25519 keypair for secure data sharing.
 * Mirrors PearPass's generateX25519KeyPair in secureChannel.js
 */
export function generateX25519KeyPair() {
  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return { privateKey, publicKey }
}

/**
 * Generate an Ed25519 keypair for signing audit entries.
 * Mirrors PearPass's client identity generation.
 */
export function generateEd25519KeyPair() {
  const privateKey = ed25519.utils.randomPrivateKey()
  const publicKey = ed25519.getPublicKey(privateKey)
  return { privateKey, publicKey }
}

/**
 * Derive a shared secret for data sharing using X25519.
 * This mirrors the PearPass handshake pattern where both parties
 * contribute ephemeral keys to derive a shared session key.
 */
export function deriveSharedSecret(privateKey, recipientPublicKey) {
  return x25519.getSharedSecret(privateKey, recipientPublicKey)
}

/**
 * Encrypt a record key for sharing with a specific recipient.
 * Uses X25519 key exchange + XChaCha20-Poly1305 (PearPass uses XSalsa20-Poly1305).
 */
export function encryptForRecipient(recordKeyBytes, senderPrivateKey, recipientPublicKey) {
  const sharedSecret = deriveSharedSecret(senderPrivateKey, recipientPublicKey)
  const nonce = generateRandomBytes(24)
  const cipher = xchacha20poly1305(sharedSecret, nonce)
  const ciphertext = cipher.encrypt(recordKeyBytes)

  return {
    nonce: base64Encode(nonce),
    ciphertext: base64Encode(ciphertext),
    senderPublicKey: base64Encode(x25519.getPublicKey(senderPrivateKey))
  }
}

/**
 * Decrypt a record key received via sharing.
 */
export function decryptFromSender(encryptedKeyData, recipientPrivateKey) {
  const senderPublicKey = base64Decode(encryptedKeyData.senderPublicKey)
  const sharedSecret = deriveSharedSecret(recipientPrivateKey, senderPublicKey)
  const nonce = base64Decode(encryptedKeyData.nonce)
  const ciphertext = base64Decode(encryptedKeyData.ciphertext)
  const cipher = xchacha20poly1305(sharedSecret, nonce)
  return cipher.decrypt(ciphertext)
}

// ─── Ed25519 Audit Signatures (mirrors PearPass transcript signing) ───

/**
 * Sign an audit log entry with Ed25519.
 * Mirrors PearPass's transcript signing in secureChannel finishHandshake.
 */
export function signAuditEntry(entryData, privateKey) {
  const encoder = new TextEncoder()
  const message = encoder.encode(JSON.stringify(entryData))
  return ed25519.sign(message, privateKey)
}

/**
 * Verify an audit log entry signature.
 */
export function verifyAuditSignature(entryData, signature, publicKey) {
  const encoder = new TextEncoder()
  const message = encoder.encode(JSON.stringify(entryData))
  try {
    return ed25519.verify(signature, message, publicKey)
  } catch {
    return false
  }
}

// ─── Hash Utilities ───

export async function hashData(data) {
  const encoder = new TextEncoder()
  const buffer = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data))
  const hash = await crypto.subtle.digest(CRYPTO_ALGORITHMS.SHA_256, buffer)
  return base64Encode(new Uint8Array(hash))
}
