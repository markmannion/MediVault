import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateRecord } from '../../hooks'
import { CATEGORY_CONFIG } from '../../utils/constants'
import { RECORD_CATEGORIES } from '../../vault'

export default function UploadRecord() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(RECORD_CATEGORIES.LAB_RESULTS)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [success, setSuccess] = useState(false)

  const { createRecord, isLoading } = useCreateRecord({
    onCompleted: () => {
      setSuccess(true)
      setTimeout(() => navigate('/'), 1500)
    },
    onError: (err) => alert('Error: ' + err)
  })

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    await createRecord(
      {
        title: title.trim(),
        category,
        date,
        description: description.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      },
      file
    )
  }

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="w-14 h-14 bg-vault-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Record encrypted & saved</p>
          <p className="text-xs text-gray-500 mt-1">Redirecting to vault...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Upload a Record</h1>
          <p className="text-xs text-gray-500">Encrypted on-device before storage</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 max-w-3xl">
        <div className="grid grid-cols-2 gap-6">
          {/* Left column — metadata */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Record name *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Blood Panel Q1 2025"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-vault-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-vault-400 bg-white"
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Date of record</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-vault-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional notes about this record"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-vault-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. routine, annual checkup"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-vault-400"
              />
            </div>
          </div>

          {/* Right column — file upload */}
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-vault-400 bg-vault-50'
                  : file
                    ? 'border-vault-400 bg-vault-50/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                onChange={e => setFile(e.target.files[0])}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.dicom,.dcm,.hl7,.json,.xml,.doc,.docx"
              />
              {file ? (
                <>
                  <div className="w-10 h-10 bg-vault-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                    <path d="M12 15V4M12 4L8 8M12 4l4 4" />
                    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">Drop file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    PDF, DICOM, JPG, PNG, HL7, FHIR JSON · up to 50MB
                  </p>
                </>
              )}
            </div>

            {/* Encryption info */}
            <div className="p-4 bg-vault-50 rounded-lg border border-vault-100">
              <p className="text-xs font-medium text-vault-600 mb-1">How encryption works</p>
              <p className="text-[11px] text-vault-800 leading-relaxed">
                Your file is encrypted on-device with AES-256-GCM using a key derived from
                your vault master password via PBKDF2 (600,000 iterations). The encrypted
                blob is stored locally in IndexedDB — no server ever sees plaintext data.
                This mirrors the PearPass vault encryption architecture.
              </p>
            </div>

            {/* Supported formats */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-1">FHIR/HL7 Support</p>
              <p className="text-[11px] text-blue-600 leading-relaxed">
                Upload HL7 v2 messages or FHIR JSON bundles and MediVault will
                parse and index them for structured search and sharing.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="px-5 py-2.5 bg-vault-600 hover:bg-vault-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="7" width="10" height="7" rx="1.5" />
                <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
              </svg>
            )}
            Encrypt & Store Record
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
