import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useVault, useInactivityLock } from './hooks'
import Layout from './components/layout/Layout'
import LockScreen from './pages/patient/LockScreen'
import VaultDashboard from './pages/patient/VaultDashboard'
import UploadRecord from './pages/patient/UploadRecord'
import SharingPage from './pages/patient/SharingPage'
import AuditLogPage from './pages/patient/AuditLogPage'
import DoctorsPage from './pages/patient/DoctorsPage'
import RecordDetail from './pages/patient/RecordDetail'
import DoctorPortal from './pages/doctor/DoctorPortal'

export default function App() {
  const { isUnlocked, checking } = useVault()
  useInactivityLock(10 * 60 * 1000) // 10 min auto-lock

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-vault-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading MediVault...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Doctor portal (public route) */}
      <Route path="/doctor/view/:token" element={<DoctorPortal />} />

      {/* Patient routes */}
      {!isUnlocked ? (
        <Route path="*" element={<LockScreen />} />
      ) : (
        <Route element={<Layout />}>
          <Route index element={<VaultDashboard />} />
          <Route path="upload" element={<UploadRecord />} />
          <Route path="sharing" element={<SharingPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="record/:id" element={<RecordDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  )
}
