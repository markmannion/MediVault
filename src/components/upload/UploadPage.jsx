import React, { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { addRecord } from '../../store/slices/recordsSlice.js'
import toast from 'react-hot-toast'
import { formatBytes } from '../../lib/vault/index.js'
import styles from './UploadPage.module.css'

const CATEGORIES = [
  { value: 'lab', label: 'Lab Results', desc: 'Blood tests, urine analysis, cultures' },
  { value: 'imaging', label: 'Imaging', desc: 'X-ray, MRI, CT scan, ultrasound' },
  { value: 'cardiology', label: 'Cardiology', desc: 'ECG, echocardiogram, stress test' },
  { value: 'mental_health', label: 'Mental Health', desc: 'Therapy notes, psychiatric evaluations' },
  { value: 'vaccination', label: 'Vaccination', desc: 'Immunization records, vaccine certificates' },
  { value: 'prescription', label: 'Prescription', desc: 'Medication prescriptions, pharmacy records' },
  { value: 'other', label: 'Other', desc: 'Any other medical document' },
]

const FORMATS = ['PDF', 'JPEG', 'PNG', 'DICOM', 'HL7', 'FHIR', 'TIFF', 'Other']

export default function UploadPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isUploading } = useSelector(s => s.records)
  const [files, setFiles] = useState([])
  const [category, setCategory] = useState('lab')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [dateOfRecord, setDateOfRecord] = useState('')
  const [fileFormat, setFileFormat] = useState('PDF')
  const [isProtected, setIsProtected] = useState(false)

  const onDrop = useCallback(accepted => {
    setFiles(prev => [...prev, ...accepted])
    if (accepted.length > 0 && !name) {
      const n = accepted[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setName(n.charAt(0).toUpperCase() + n.slice(1))
    }
  }, [name])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.tiff'],
      'application/dicom': ['.dcm'],
      'text/xml': ['.xml'],
      'application/hl7-v2': ['.hl7'],
      'application/fhir+json': ['.json'],
    },
    maxSize: 50 * 1024 * 1024,
  })

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Please enter a record name')
    if (files.length === 0) return toast.error('Please attach at least one file')

    const recordData = {
      name: name.trim(),
      category,
      notes,
      dateOfRecord: dateOfRecord || new Date().toISOString().split('T')[0],
      fileFormat,
      isProtected: isProtected || category === 'mental_health',
      sizeBytes: files.reduce((sum, f) => sum + f.size, 0),
    }

    const result = await dispatch(addRecord({ recordData, files }))
    if (addRecord.fulfilled.match(result)) {
      toast.success(`"${name}" encrypted and stored`)
      navigate('/')
    } else {
      toast.error(result.payload || 'Upload failed')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Upload a Record</h1>
          <p className={styles.sub}>Files are encrypted on this device before being stored</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.leftCol}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Record Details</h2>

              <div className={styles.field}>
                <label className={styles.label}>Record name *</label>
                <input
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Full Blood Panel Q1 2025"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Category *</label>
                <div className={styles.catGrid}>
                  {CATEGORIES.map(c => (
                    <label key={c.value} className={`${styles.catOption} ${category === c.value ? styles.catSelected : ''}`}>
                      <input type="radio" name="category" value={c.value} checked={category === c.value} onChange={() => setCategory(c.value)} />
                      <span className={styles.catLabel}>{c.label}</span>
                      <span className={styles.catDesc}>{c.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Date of record</label>
                  <input className={styles.input} type="date" value={dateOfRecord} onChange={e => setDateOfRecord(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>File format</label>
                  <select className={styles.input} value={fileFormat} onChange={e => setFileFormat(e.target.value)}>
                    {FORMATS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Notes (optional)</label>
                <textarea
                  className={styles.textarea}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes about this record…"
                  rows={3}
                />
              </div>

              <label className={styles.protectedToggle}>
                <input type="checkbox" checked={isProtected || category === 'mental_health'} onChange={e => setIsProtected(e.target.checked)} disabled={category === 'mental_health'} />
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Extra protection</span>
                  <span className={styles.toggleDesc}>Prevents accidental sharing. Sharing requires explicit confirmation.</span>
                </div>
              </label>
            </section>
          </div>

          <div className={styles.rightCol}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Attach Files</h2>

              <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}>
                <input {...getInputProps()} />
                <div className={styles.dropzoneIcon}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M14 18V7M14 7l-5 5M14 7l5 5" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 20v3a1 1 0 001 1h18a1 1 0 001-1v-3" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className={styles.dropzoneText}>
                  {isDragActive ? 'Drop files here…' : 'Drag files here, or click to browse'}
                </div>
                <div className={styles.dropzoneSub}>PDF, DICOM, JPG, PNG, HL7, FHIR · up to 50MB each</div>
              </div>

              {files.length > 0 && (
                <div className={styles.fileList}>
                  {files.map((f, i) => (
                    <div key={i} className={styles.fileItem}>
                      <div className={styles.fileIcon}>
                        {f.type.includes('image') ? '🖼' : f.name.endsWith('.dcm') ? '🩻' : '📄'}
                      </div>
                      <div className={styles.fileInfo}>
                        <div className={styles.fileName}>{f.name}</div>
                        <div className={styles.fileSize}>{formatBytes(f.size)}</div>
                      </div>
                      <button type="button" className={styles.removeFile} onClick={() => removeFile(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className={styles.encryptNote}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="5" width="12" height="9" rx="1.5" stroke="#0F6E56" strokeWidth="1"/>
                <path d="M4 5V3.5a3 3 0 016 0V5" stroke="#0F6E56" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <div>
                <strong>How encryption works</strong>
                <p>Your file is encrypted on-device using AES-256-XSalsa20 (via TweetNaCl, the same library as PearPass). A unique key is generated for this record and wrapped with your vault master key. No server ever sees plaintext data.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className={styles.submitBtn} disabled={isUploading}>
            {isUploading ? 'Encrypting & Storing…' : 'Encrypt & Store Record'}
          </button>
        </div>
      </form>
    </div>
  )
}
