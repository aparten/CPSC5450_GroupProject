import type { QueueStatus, Severity, TriageLabel } from './types'

export function severityColor(severity: Severity): string {
  if (severity === 'critical') return 'red'
  if (severity === 'high') return 'orange'
  if (severity === 'medium') return 'yellow'
  return 'gray'
}

export function statusColor(status: QueueStatus): string {
  if (status === 'approved') return 'green'
  if (status === 'rejected') return 'gray'
  return 'blue'
}

export function labelColor(label: TriageLabel): string {
  if (label === 'phishing') return 'red'
  if (label === 'suspicious') return 'yellow'
  if (label === 'benign') return 'green'
  return 'gray'
}
