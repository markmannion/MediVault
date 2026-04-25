import React, { useState, useMemo } from 'react'
import { useRecords, useShares, useDoctors } from '../../hooks'
import { CATEGORY_CONFIG, formatDate, daysUntil, getInitials } from '../../utils/constants'

export default function SharingPage() {
  const { records } = useRecords()
  const { shares, createShare, revokeShare, revokeForDoctor, refetch } = useShares()
  const { doctors } = useDoctors()
  const [showNewShare, setShowNewShare] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [expiry, setExpiry] = useState('7')
  const [allowDownload, setAllowDownload] = useState(false)
  const [generatedLink, setGeneratedLink] = useState(null)
  const [creating, setCreating] = useState(false)

  const activeShares = shares.filter(s => s.status === 'active')

  // Group shares by doctor
  const sharesByDoctor = useMemo(() => {
    const grouped = {}
    activeShares.forEach(s => {
      if (!grouped[s.doctorId]) {
        grouped[s.doctorId] = {
          doctorId: s.doctorId,
          doctorName: s.doctorName,
          shares: []
        }
      }
      grouped[s.doctorId].shares.push(s)
    })
    return Object.values(grouped)
  }, [activeShares])

  const toggleRecord = (id) => {
    setSelectedRecords(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const handleCreateShare = async () => {
    if (!selectedDoctor || selectedRecords.length === 0) return
    setCreating(true)

    const doctor = doctors.find(d => d.id === selectedDoctor)
    const expiresAt = expiry === 'never'
      ? null
      : new Date(Date.now() + parseInt(expiry) * 86400000).toISOString()

    try {
      let lastLink = null
      for (const recordId of selectedRecords) {
        const record = records.find(r => r.id === recordId)
        const result = await createShare({
          recordId,
          recordTitle: record?.title || 'Untitled',
          doctorId: selectedDoctor,
          doctorName: doctor?.name || 'Unknown',
          expiresAt,
          allowDownload
        })
        lastLink = result.link
      }
      setGeneratedLink(lastLink)
      refetch()
    } catch (err) {
      alert('Error creating share: ' + err)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (shareId) => {
    if (!confirm('Revoke access? The doctor will no longer be able to view this record.')) return
    await revokeShare(shareId)
    refetch()
  }

  const handleRevokeAll = async (doctorId) => {
    if (!confirm('Revoke all access for this doctor?')) return
    await revokeForDoctor(doctorId)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Sharing Controls</h1>
          <p className="text-xs text-gray-500">Manage who sees what and when</p>
        </div>
        <button
          onClick={() => { setShowNewShare(!showNewShare); setGeneratedLink(null) }}
          className="px-3 py-1.5 bg-vault-600 hover:bg-vault-800 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {showNewShare ? 'Cancel' : '+ New Share'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* New Share Panel */}
        {showNewShare && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 fade-in">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Create a new share</h3>

            {generatedLink ? (
              <div className="space-y-3">
                <div className="p-4 bg-vault-50 rounded-lg border border-vault-100">
                  <p className="text-xs font-medium text-vault-600 mb-2">Encrypted share link generated</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-vault-200 rounded-lg font-mono"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedLink); }}
                      className="px-3 py-2 bg-vault-600 text-white text-xs rounded-lg hover:bg-vault-800 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[10px] text-vault-600 mt-2">
                    Send this link to your doctor. They can only view the records you selected.
                    {expiry !== 'never' && ` Link expires in ${expiry} days.`}
                  </p>
                </div>
                <button
                  onClick={() => { setShowNewShare(false); setGeneratedLink(null); setSelectedRecords([]) }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Doctor selection */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Share with doctor</label>
                  {doctors.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      No doctors added yet. Add a doctor first in "My Doctors".
                    </p>
                  ) : (
                    <select
                      value={selectedDoctor}
                      onChange={e => setSelectedDoctor(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="">Select a doctor...</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Record selection */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Select records to share ({selectedRecords.length} selected)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {records.length === 0 ? (
                      <p className="p-3 text-xs text-gray-400">No records to share</p>
                    ) : records.map(record => {
                      const cat = CATEGORY_CONFIG[record.category] || CATEGORY_CONFIG.general
                      const isProtected = record.category === 'mental_health'
                      return (
                        <label
                          key={record.id}
                          className={`flex items-center gap-3 px-3 py-2 text-sm ${
                            isProtected ? 'opacity-60' : 'cursor-pointer hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes(record.id)}
                            onChange={() => !isProtected && toggleRecord(record.id)}
                            disabled={isProtected}
                            className="rounded"
                          />
                          <span>{cat.icon}</span>
                          <span className="flex-1 truncate text-xs">{record.title}</span>
                          {isProtected && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full">
                              Protected
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Expiry + download */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1.5">Expires after</label>
                    <select
                      value={expiry}
                      onChange={e => setExpiry(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="never">No expiration</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1.5">Allow download</label>
                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={e => setAllowDownload(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-600">Doctor can download files</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleCreateShare}
                  disabled={creating || !selectedDoctor || selectedRecords.length === 0}
                  className="px-4 py-2 bg-vault-600 hover:bg-vault-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {creating ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="7" width="10" height="7" rx="1.5" />
                      <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
                    </svg>
                  )}
                  Generate Encrypted Link
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active shares grouped by doctor */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Active access grants</h3>

          {sharesByDoctor.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No active shares</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sharesByDoctor.map(group => (
                <div key={group.doctorId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-vault-50 text-vault-800 text-xs font-medium flex items-center justify-center">
                        {getInitials(group.doctorName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{group.doctorName}</p>
                        <p className="text-[10px] text-gray-400">{group.shares.length} records shared</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeAll(group.doctorId)}
                      className="px-2 py-1 text-[10px] border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Revoke All
                    </button>
                  </div>
                  <div className="ml-10 space-y-1">
                    {group.shares.map(share => {
                      const remaining = daysUntil(share.expiresAt)
                      return (
                        <div key={share.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 truncate flex-1">{share.recordTitle}</span>
                          {remaining !== null && (
                            <span className={`ml-2 ${remaining <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {remaining <= 0 ? 'Expired' : `${remaining}d left`}
                            </span>
                          )}
                          <button
                            onClick={() => handleRevoke(share.id)}
                            className="ml-2 text-red-400 hover:text-red-600 transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
