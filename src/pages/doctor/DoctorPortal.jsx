import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { base64Decode } from '../../crypto'

/**
 * Doctor Portal
 * 
 * Public route for doctors to view shared medical records.
 * Accessed via encrypted share link: /doctor/view/:token
 * 
 * In production, this would:
 *   1. Decode the token to extract shareId
 *   2. Fetch share metadata from server (or P2P network in PearPass style)
 *   3. Retrieve the encrypted record key (encrypted for doctor's public key)
 *   4. Doctor provides their private key to decrypt the record key
 *   5. Use record key to decrypt the medical record
 *   6. Log access event to patient's audit log
 * 
 * For this prototype, we simulate the flow with mock data.
 */
export default function DoctorPortal() {
  const { token } = useParams()
  const [share, setShare] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [decrypted, setDecrypted] = useState(false)

  useEffect(() => {
    try {
      // Decode token to get shareId
      const decoded = JSON.parse(new TextDecoder().decode(base64Decode(token)))
      
      // In production: fetch share from server/network using shareId
      // For prototype: simulate with mock data
      setTimeout(() => {
        setShare({
          id: decoded.shareId,
          recordTitle: 'Full Blood Panel',
          recordCategory: 'lab_results',
          patientName: 'Patient',
          doctorName: 'Dr. Viewer',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          allowDownload: false,
          status: 'active',
          // Mock encrypted record data
          encryptedRecordData: {
            title: 'Full Blood Panel',
            category: 'lab_results',
            date: '2025-01-03',
            description: 'Annual routine blood work',
            fhirResource: {
              resourceType: 'DiagnosticReport',
              status: 'final',
              code: { text: 'Complete Blood Count' },
              effectiveDateTime: '2025-01-03',
              result: [
                { display: 'Hemoglobin: 14.2 g/dL (normal)' },
                { display: 'White Blood Cell Count: 7.5 K/uL (normal)' },
                { display: 'Platelets: 250 K/uL (normal)' }
              ]
            }
          }
        })
        setLoading(false)
      }, 1000)
    } catch (err) {
      setError('Invalid share link')
      setLoading(false)
    }
  }, [token])

  const handleViewRecord = () => {
    // In production: doctor would provide their private key here
    // For prototype: just toggle view
    setDecrypted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-vault-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading shared record...</p>
        </div>
      </div>
    )
  }

  if (error || !share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Invalid or expired link</p>
          <p className="text-xs text-gray-500 mt-1">
            {error || 'This share link is no longer valid.'}
          </p>
        </div>
      </div>
    )
  }

  const isExpired = new Date(share.expiresAt) < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Access expired</p>
          <p className="text-xs text-gray-500 mt-1">
            This share link expired on {new Date(share.expiresAt).toLocaleDateString()}.
            Please request a new link from the patient.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-vault-600 rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="3" y="7" width="10" height="7" rx="1.5" />
                <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">MediVault Secure Viewer</h1>
              <p className="text-xs text-gray-500">End-to-end encrypted medical record sharing</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 bg-vault-50 text-vault-600 rounded-full">
            Read-Only Access
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {!decrypted ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-vault-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Shared Medical Record
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{share.patientName}</strong> has shared a medical record with you
            </p>
            <div className="inline-flex flex-col items-start bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-2 text-sm mb-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#6B7280" strokeWidth="1.2">
                  <rect x="1" y="3" width="14" height="11" rx="1.5" />
                  <path d="M5 7h6M5 10h4" strokeLinecap="round" />
                </svg>
                <span className="font-medium text-gray-700">{share.recordTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M8 1v4l2.5 2.5" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="6.5" />
                </svg>
                Expires {new Date(share.expiresAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={handleViewRecord}
              className="px-6 py-3 bg-vault-600 hover:bg-vault-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              View Record
            </button>
            <p className="text-xs text-gray-400 mt-4">
              This record is end-to-end encrypted. Only you and the patient can decrypt it.
            </p>
          </div>
        ) : (
          <div className="space-y-6 fade-in">
            {/* Access info banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-900">Viewing shared medical record</p>
                <p className="text-xs text-blue-700 mt-1">
                  This access is logged in the patient's audit trail. 
                  {!share.allowDownload && ' Downloading is not permitted.'}
                </p>
              </div>
            </div>

            {/* Record content */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {share.encryptedRecordData.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {share.encryptedRecordData.category.replace('_', ' ')} · {share.encryptedRecordData.date}
                  </p>
                </div>
              </div>

              {share.encryptedRecordData.description && (
                <div className="mb-6">
                  <h3 className="text-xs font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-sm text-gray-700">{share.encryptedRecordData.description}</p>
                </div>
              )}

              {share.encryptedRecordData.fhirResource && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-3">FHIR Diagnostic Report</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs text-gray-500">Resource Type:</span>
                      <p className="text-sm font-medium text-gray-900">
                        {share.encryptedRecordData.fhirResource.resourceType}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Test:</span>
                      <p className="text-sm font-medium text-gray-900">
                        {share.encryptedRecordData.fhirResource.code.text}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Results:</span>
                      <ul className="mt-2 space-y-1">
                        {share.encryptedRecordData.fhirResource.result.map((r, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-gray-400" />
                            {r.display}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="text-center text-xs text-gray-400">
              <p>Secured by MediVault · Patient-controlled health data sharing</p>
              <p className="mt-1">Powered by PearPass end-to-end encryption architecture</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
