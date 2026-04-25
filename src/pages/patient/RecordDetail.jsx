import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getRecord, downloadRecordFile, deleteRecord } from '../../vault'
import { CATEGORY_CONFIG, formatDate } from '../../utils/constants'

export default function RecordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vaultKey = useSelector(state => state.auth.vaultKey)
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!vaultKey) return
    getRecord(id, vaultKey)
      .then(setRecord)
      .catch(err => alert('Error loading record: ' + err.message))
      .finally(() => setLoading(false))
  }, [id, vaultKey])

  const handleDownload = async () => {
    if (!record?.hasFile) return
    setDownloading(true)
    try {
      const file = await downloadRecordFile(id, vaultKey)
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error downloading file: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this record permanently? This action cannot be undone.')) return
    try {
      await deleteRecord(id)
      navigate('/')
    } catch (err) {
      alert('Error deleting record: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-vault-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500">Record not found</p>
      </div>
    )
  }

  const cat = CATEGORY_CONFIG[record.category] || CATEGORY_CONFIG.general

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{record.title}</h1>
            <p className="text-xs text-gray-500">{cat.label}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {record.hasFile && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              {downloading ? (
                <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 2v8M8 10l3-3M8 10L5 7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 13h12" strokeLinecap="round" />
                </svg>
              )}
              Download
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        {/* Metadata card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">{cat.icon}</div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">{record.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                {cat.label} · {formatDate(record.date || record.createdAt)}
              </p>
            </div>
          </div>

          {record.description && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 mb-1.5">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{record.description}</p>
            </div>
          )}

          {record.tags && record.tags.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 mb-1.5">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {record.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
            <div>
              <span className="text-gray-500">Created</span>
              <p className="text-gray-900 mt-0.5">{formatDate(record.createdAt)}</p>
            </div>
            <div>
              <span className="text-gray-500">Last updated</span>
              <p className="text-gray-900 mt-0.5">{formatDate(record.updatedAt)}</p>
            </div>
            <div>
              <span className="text-gray-500">Shared</span>
              <p className="text-gray-900 mt-0.5">
                {record.isShared ? `${record.shareCount} time${record.shareCount !== 1 ? 's' : ''}` : 'Not shared'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Encrypted</span>
              <p className="text-gray-900 mt-0.5 flex items-center gap-1">
                <svg width="10" height="11" viewBox="0 0 8 9" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="1" y="3.5" width="6" height="5" rx="0.75" />
                  <path d="M2.5 3.5V2.5a1.5 1.5 0 013 0v1" strokeLinecap="round" />
                </svg>
                AES-256-GCM
              </p>
            </div>
          </div>
        </div>

        {/* File info */}
        {record.hasFile && record.file && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Encrypted file</h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-vault-100 rounded-lg flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#0F6E56" strokeWidth="1.2">
                  <rect x="3" y="1" width="10" height="14" rx="1.5" />
                  <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {record.file.metadata?.name || 'Unknown file'}
                </p>
                <p className="text-xs text-gray-500">
                  {record.file.metadata?.type || 'unknown type'}
                  {record.file.metadata?.size && ` · ${(record.file.metadata.size / 1024).toFixed(1)} KB`}
                </p>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-3 py-1.5 bg-vault-600 hover:bg-vault-800 text-white text-xs rounded-lg transition-colors"
              >
                {downloading ? 'Downloading...' : 'Download'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Encrypted on {formatDate(record.file.metadata?.encryptedAt || record.createdAt)}
            </p>
          </div>
        )}

        {/* FHIR resource */}
        {record.fhirResource && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-3">FHIR Resource</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
              {JSON.stringify(record.fhirResource, null, 2)}
            </pre>
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notes</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {record.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
