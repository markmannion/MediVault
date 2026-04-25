export const CATEGORY_CONFIG = {
  lab_results: { label: 'Lab Results', color: 'emerald', icon: '🧪' },
  imaging: { label: 'Imaging', color: 'blue', icon: '📷' },
  cardiology: { label: 'Cardiology', color: 'red', icon: '❤️' },
  mental_health: { label: 'Mental Health', color: 'amber', icon: '🧠' },
  vaccination: { label: 'Vaccination', color: 'indigo', icon: '💉' },
  prescription: { label: 'Prescription', color: 'purple', icon: '💊' },
  general: { label: 'General', color: 'gray', icon: '📋' },
  dental: { label: 'Dental', color: 'cyan', icon: '🦷' },
  allergy: { label: 'Allergy', color: 'orange', icon: '⚠️' }
}

export const SHARE_STATUS_CONFIG = {
  active: { label: 'Shared', className: 'bg-emerald-50 text-emerald-700' },
  expired: { label: 'Expired', className: 'bg-amber-50 text-amber-700' },
  revoked: { label: 'Revoked', className: 'bg-red-50 text-red-700' }
}

export const AUDIT_ACTION_CONFIG = {
  record_created: { label: 'Record created', dot: 'bg-emerald-500' },
  record_deleted: { label: 'Record deleted', dot: 'bg-red-500' },
  share_created: { label: 'Shared', dot: 'bg-blue-500' },
  share_revoked: { label: 'Access revoked', dot: 'bg-red-500' },
  all_shares_revoked_for_doctor: { label: 'All access revoked', dot: 'bg-red-600' },
  doctor_added: { label: 'Doctor added', dot: 'bg-indigo-500' },
  doctor_removed: { label: 'Doctor removed', dot: 'bg-gray-500' },
  record_viewed: { label: 'Record viewed', dot: 'bg-emerald-400' },
  record_downloaded: { label: 'Record downloaded', dot: 'bg-amber-500' }
}

export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / 86400000)
}

export function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
