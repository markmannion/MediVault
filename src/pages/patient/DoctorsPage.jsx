import React, { useState } from 'react'
import { useDoctors, useShares } from '../../hooks'
import { getInitials, formatRelativeTime } from '../../utils/constants'

export default function DoctorsPage() {
  const { doctors, addDoctor, removeDoctor } = useDoctors()
  const { shares } = useShares()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [institution, setInstitution] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setAdding(true)
    try {
      await addDoctor({ name, specialty, institution, email })
      setShowAdd(false)
      setName('')
      setSpecialty('')
      setInstitution('')
      setEmail('')
    } catch (err) {
      alert('Error adding doctor: ' + err)
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('Remove this doctor? Active shares will remain but no new shares can be created.')) return
    await removeDoctor(id)
  }

  const getDoctorShares = (doctorId) => {
    return shares.filter(s => s.doctorId === doctorId && s.status === 'active')
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">My Doctors</h1>
          <p className="text-xs text-gray-500">{doctors.length} authorized providers</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-vault-600 hover:bg-vault-800 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Add Doctor'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Add doctor form */}
        {showAdd && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 fade-in">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Add a new doctor</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Doctor's name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Dr. Clara Chen"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Specialty</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={e => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiologist"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="e.g. Hospital Clínic"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={adding || !name.trim()}
                className="px-4 py-2 bg-vault-600 hover:bg-vault-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {adding ? 'Adding...' : 'Add Doctor'}
              </button>
            </form>
          </div>
        )}

        {/* Doctors list */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Authorized healthcare providers</h3>

          {doctors.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-vault-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="#0F6E56" strokeWidth="1.2">
                  <circle cx="8" cy="5" r="3" />
                  <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No doctors added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your healthcare providers to share records with them</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {doctors.map(doctor => {
                const doctorShares = getDoctorShares(doctor.id)
                return (
                  <div key={doctor.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-vault-50 text-vault-800 text-sm font-medium flex items-center justify-center flex-shrink-0">
                        {getInitials(doctor.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{doctor.name}</p>
                        <p className="text-xs text-gray-500">
                          {doctor.specialty}
                          {doctor.institution && ` · ${doctor.institution}`}
                        </p>
                        {doctor.email && (
                          <p className="text-xs text-gray-400 mt-0.5">{doctor.email}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-gray-400">
                            {doctorShares.length} record{doctorShares.length !== 1 ? 's' : ''} shared
                          </span>
                          {doctorShares.length > 0 && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-gray-400">
                                Last access {formatRelativeTime(doctorShares[0]?.lastAccessedAt || doctorShares[0]?.createdAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {/* Navigate to sharing page with this doctor selected */}}
                          className="px-2.5 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => handleRemove(doctor.id)}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs font-medium text-amber-700 mb-1">Doctor invitations</p>
          <p className="text-[11px] text-amber-600 leading-relaxed">
            To invite a doctor to MediVault, generate a share link in the Sharing page.
            The doctor will receive a secure, encrypted link to view only the records
            you explicitly grant access to. They do not need a MediVault account to view
            shared records.
          </p>
        </div>
      </div>
    </div>
  )
}
