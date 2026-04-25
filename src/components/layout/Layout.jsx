import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useVault } from '../../hooks'

const navItems = [
  { to: '/', label: 'My Vault', icon: VaultIcon },
  { to: '/upload', label: 'Upload Records', icon: UploadIcon },
  { to: '/sharing', label: 'Sharing', icon: ShareIcon },
  { to: '/doctors', label: 'My Doctors', icon: DoctorIcon },
  { to: '/audit', label: 'Audit Log', icon: AuditIcon }
]

export default function Layout() {
  const { lock } = useVault()
  const navigate = useNavigate()

  const handleLock = () => {
    lock()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — mirrors PearPass shared/containers/Sidebar */}
      <aside className="w-56 bg-vault-900 flex flex-col text-white">
        <div className="px-4 py-5 border-b border-white/10">
          <h1 className="text-lg font-semibold tracking-tight">
            Medi<span className="text-vault-200">Vault</span>
          </h1>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
            Patient-Controlled Records
          </p>
        </div>

        <nav className="flex-1 py-3">
          <div className="px-4 pb-2">
            <span className="text-[9px] text-white/30 uppercase tracking-widest">
              My Health
            </span>
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-vault-200/15 text-vault-100 border-r-2 border-vault-200'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }`
              }
            >
              <item.icon className="w-4 h-4 opacity-70" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLock}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-white/60 hover:text-white/80"
          >
            <LockIcon className="w-3.5 h-3.5" />
            Lock Vault
          </button>
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-vault-200/10 border border-vault-200/20">
            <div className="w-1.5 h-1.5 rounded-full bg-vault-200" />
            <div className="text-[10px] text-white/50">
              <span className="text-vault-100 font-medium block">E2E Encrypted</span>
              AES-256-GCM · Keys on device
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

// ─── Inline SVG Icons (mirrors PearPass shared/icons/) ───

function VaultIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="1" y="3" width="14" height="11" rx="1.5" />
      <path d="M5 7h6M5 10h4" strokeLinecap="round" />
      <path d="M4 3V2a1 1 0 011-1h6a1 1 0 011 1v1" />
    </svg>
  )
}

function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M8 10V3M8 3L5.5 5.5M8 3l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" strokeLinecap="round" />
    </svg>
  )
}

function ShareIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="13" cy="3" r="2" />
      <circle cx="13" cy="13" r="2" />
      <circle cx="3" cy="8" r="2" />
      <path d="M5 8h5M10.8 4.4L5 7M10.8 11.6L5 9" strokeLinecap="round" />
    </svg>
  )
}

function DoctorIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" strokeLinecap="round" />
    </svg>
  )
}

function AuditIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M8 1v4l2.5 2.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="6.5" />
    </svg>
  )
}

function LockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
    </svg>
  )
}
