import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createNewVault, unlockExistingVault, clearError } from '../../store'

export default function LockScreen() {
  const dispatch = useDispatch()
  const { vaultExists, isLoading, error } = useSelector(state => state.auth)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState(vaultExists ? 'unlock' : 'create')

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())

    if (mode === 'create') {
      if (password.length < 8) {
        return
      }
      if (password !== confirmPassword) {
        return
      }
      dispatch(createNewVault(password))
    } else {
      dispatch(unlockExistingVault(password))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vault-900 via-vault-800 to-gray-900 p-4">
      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-vault-600/20 border border-vault-200/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="6" y="12" width="20" height="16" rx="3" stroke="#5DCAA5" strokeWidth="2" />
              <path d="M10 12V9a6 6 0 0112 0v3" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="20" r="2" fill="#5DCAA5" />
              <path d="M16 22v3" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Medi<span className="text-vault-200">Vault</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Patient-Controlled Health Records
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-white/80 mb-4">
            {mode === 'create' ? 'Create your encrypted vault' : 'Unlock your vault'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">
                Master Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-vault-200/50 transition-colors"
                placeholder="Enter your master password"
                required
                minLength={mode === 'create' ? 8 : 1}
                autoFocus
              />
            </div>

            {mode === 'create' && (
              <div>
                <label className="block text-xs text-white/40 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-vault-200/50 transition-colors"
                  placeholder="Confirm your master password"
                  required
                  minLength={8}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (mode === 'create' && (password.length < 8 || password !== confirmPassword))}
              className="w-full py-2.5 bg-vault-600 hover:bg-vault-600/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" />
                    <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
                  </svg>
                  {mode === 'create' ? 'Create Vault' : 'Unlock'}
                </>
              )}
            </button>
          </form>

          {vaultExists && mode === 'create' && (
            <button
              onClick={() => { setMode('unlock'); dispatch(clearError()) }}
              className="w-full mt-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Already have a vault? Unlock instead
            </button>
          )}
          {!vaultExists && mode === 'unlock' && (
            <button
              onClick={() => { setMode('create'); dispatch(clearError()) }}
              className="w-full mt-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              No vault yet? Create one
            </button>
          )}
          {vaultExists && mode === 'unlock' && (
            <button
              onClick={() => { setMode('create'); dispatch(clearError()) }}
              className="w-full mt-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Create a new vault instead
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-white/25">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
          </svg>
          End-to-end encrypted · AES-256-GCM · PBKDF2 key derivation
        </div>
      </div>
    </div>
  )
}
