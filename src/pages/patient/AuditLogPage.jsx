import React from 'react'
import { useAuditLog } from '../../hooks'
import { AUDIT_ACTION_CONFIG, formatRelativeTime } from '../../utils/constants'

export default function AuditLogPage() {
  const { entries, isLoading } = useAuditLog()

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Audit Log</h1>
          <p className="text-xs text-gray-500">{entries.length} events recorded</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export Log
        </button>
      </div>

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Access history</h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-5 h-5 border-2 border-vault-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No events yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, idx) => {
                const config = AUDIT_ACTION_CONFIG[entry.action] || {
                  label: entry.action,
                  dot: 'bg-gray-400'
                }

                return (
                  <div
                    key={entry.id || idx}
                    className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {entry.doctorName && <strong>{entry.doctorName}</strong>}
                        {entry.action === 'record_viewed' && ` viewed ${entry.recordTitle || 'a record'}`}
                        {entry.action === 'record_created' && `You created ${entry.recordTitle || 'a record'}`}
                        {entry.action === 'record_deleted' && `You deleted a record`}
                        {entry.action === 'share_created' && (
                          <>You shared <strong>{entry.recordTitle}</strong> with {entry.doctorName}</>
                        )}
                        {entry.action === 'share_revoked' && (
                          <>You revoked access to <strong>{entry.recordTitle}</strong> for {entry.doctorName}</>
                        )}
                        {entry.action === 'all_shares_revoked_for_doctor' && (
                          <>You revoked all access for {entry.doctorName || 'a doctor'}</>
                        )}
                        {entry.action === 'doctor_added' && `You added ${entry.doctorName}`}
                        {entry.action === 'doctor_removed' && `You removed a doctor`}
                        {entry.action === 'record_downloaded' && ` downloaded ${entry.recordTitle || 'a file'}`}
                      </p>
                      {entry.expiresAt && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Expires {formatRelativeTime(entry.expiresAt)}
                        </p>
                      )}
                    </div>
                    <time className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                      {formatRelativeTime(entry.timestamp)}
                    </time>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs font-medium text-blue-700 mb-1">Immutable audit trail</p>
          <p className="text-[11px] text-blue-600 leading-relaxed">
            All access events are cryptographically signed and stored in an append-only
            log. This ensures full transparency and accountability for who accessed your
            medical data and when. Audit entries cannot be deleted or modified.
          </p>
        </div>
      </div>
    </div>
  )
}
