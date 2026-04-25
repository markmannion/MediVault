import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecords, useShares, useAuditLog } from '../../hooks'
import { CATEGORY_CONFIG, formatDate, daysUntil } from '../../utils/constants'

export default function VaultDashboard() {
  const navigate = useNavigate()
  const { records, isLoading, selectedCategory, selectCategory } = useRecords()
  const { shares } = useShares()
  const { entries: auditEntries } = useAuditLog({ limit: 30 })

  const activeShares = shares.filter(s => s.status === 'active')
  const expiringShares = activeShares.filter(s => {
    const d = daysUntil(s.expiresAt)
    return d !== null && d <= 7 && d >= 0
  })

  const categories = Object.entries(CATEGORY_CONFIG)
  const categoryTotals = {}
  records.forEach(r => {
    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + 1
  })

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">My Health Vault</h1>
          <p className="text-xs text-gray-500">
            {records.length} records · {activeShares.length} active shares
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-vault-50 text-vault-600 text-[10px] font-medium">
            <svg width="8" height="9" viewBox="0 0 8 9" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="1" y="3.5" width="6" height="5" rx="0.75" />
              <path d="M2.5 3.5V2.5a1.5 1.5 0 013 0v1" strokeLinecap="round" />
            </svg>
            E2E Encrypted
          </span>
          <button
            onClick={() => navigate('/upload')}
            className="px-3 py-1.5 bg-vault-600 hover:bg-vault-800 text-white text-xs font-medium rounded-lg transition-colors"
          >
            + Upload Record
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total Records" value={records.length} sub={`${Object.keys(categoryTotals).length} categories`} />
          <StatCard label="Active Shares" value={activeShares.length} sub={`${new Set(activeShares.map(s => s.doctorId)).size} doctors`} />
          <StatCard
            label="Expiring Soon"
            value={expiringShares.length}
            sub={expiringShares.length > 0 ? `within 7 days` : 'none'}
            accent={expiringShares.length > 0 ? 'text-amber-600' : null}
          />
          <StatCard
            label="Access Events"
            value={auditEntries.filter(e => e.action === 'record_viewed').length}
            sub="this month"
          />
        </div>

        {/* Category filter */}
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              onClick={() => selectCategory(null)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                !selectedCategory
                  ? 'bg-vault-600 text-white border-vault-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              All Records
            </button>
            {categories.map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => selectCategory(key === selectedCategory ? null : key)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedCategory === key
                    ? 'bg-vault-600 text-white border-vault-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {cfg.icon} {cfg.label}
                {categoryTotals[key] ? ` (${categoryTotals[key]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Records grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-vault-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-vault-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="#0F6E56" strokeWidth="1.2">
                <rect x="1" y="3" width="14" height="11" rx="1.5" />
                <path d="M5 7h6M5 10h4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">No records yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload your first medical record to get started</p>
            <button
              onClick={() => navigate('/upload')}
              className="mt-4 px-4 py-2 bg-vault-600 text-white text-xs rounded-lg hover:bg-vault-800 transition-colors"
            >
              Upload Record
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {records.map(record => (
              <RecordCard
                key={record.id}
                record={record}
                shares={activeShares.filter(s => s.recordId === record.id)}
                onClick={() => navigate(`/record/${record.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-0.5 ${accent || 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function RecordCard({ record, shares, onClick }) {
  const cat = CATEGORY_CONFIG[record.category] || CATEGORY_CONFIG.general
  const shareStatus = shares.length > 0 ? 'shared' : 'private'
  const expiringSoon = shares.some(s => {
    const d = daysUntil(s.expiresAt)
    return d !== null && d <= 7 && d >= 0
  })

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{cat.icon}</span>
        {expiringSoon ? (
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
            Expiring
          </span>
        ) : shareStatus === 'shared' ? (
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-vault-50 text-vault-600">
            Shared
          </span>
        ) : (
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            Private
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-900 truncate">{record.title || 'Untitled Record'}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {cat.label} · {formatDate(record.date || record.createdAt)}
        {record.hasFile && ' · Has file'}
      </p>
      {shares.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
          {shares.slice(0, 3).map(s => (
            <div key={s.id} className="w-5 h-5 rounded-full bg-vault-50 text-vault-800 text-[8px] font-medium flex items-center justify-center">
              {(s.doctorName || '?')[0]}
            </div>
          ))}
          <span className="text-[10px] text-gray-400">
            {shares.length} doctor{shares.length > 1 ? 's' : ''} have access
          </span>
        </div>
      )}
    </div>
  )
}
