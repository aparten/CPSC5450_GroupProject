import type { QueueItem, Severity, TriageLabel } from './types'

type ParseEmailResponse = {
  event_id: string
  parsed: QueueItem['parsed']
}

function deriveSeverity(parsed: QueueItem['parsed']): Severity {
  const flags = parsed.derived_flags
  const urls = parsed.indicators.urls.length
  const ips = parsed.indicators.ip_addresses.length
  const strongSignals =
    Number(flags.display_name_mismatch) +
    Number(flags.sender_domain_mismatch) +
    Number(flags.unicode_trick_detected) +
    Number(urls >= 3) +
    Number(ips >= 1)

  if (strongSignals >= 4 || parsed.label === 'phishing') return 'critical'
  if (strongSignals >= 3) return 'high'
  if (strongSignals >= 1 || parsed.label === 'suspicious') return 'medium'
  return 'low'
}

function deriveConfidence(label: TriageLabel): number {
  if (label === 'phishing') return 0.9
  if (label === 'suspicious') return 0.65
  if (label === 'benign') return 0.8
  return 0.5
}

function deriveRationale(parsed: QueueItem['parsed']): string {
  const signals: string[] = []
  if (parsed.derived_flags.display_name_mismatch) signals.push('display-name mismatch')
  if (parsed.derived_flags.sender_domain_mismatch) signals.push('sender-domain mismatch')
  if (parsed.derived_flags.unicode_trick_detected) signals.push('unicode trick signal')
  if (parsed.indicators.urls.length > 0) signals.push(`${parsed.indicators.urls.length} URL indicators`)
  if (parsed.indicators.ip_addresses.length > 0) signals.push(`${parsed.indicators.ip_addresses.length} IP indicators`)

  if (signals.length === 0) return 'Low-risk indicator profile with no major mismatch signals.'
  return signals.join(', ')
}

export function fromParseResponse(response: ParseEmailResponse): QueueItem {
  return {
    event_id: response.event_id,
    parsed: response.parsed,
    ui: {
      status: 'needs review',
      severity: deriveSeverity(response.parsed),
      confidence: deriveConfidence(response.parsed.label),
      rationale: deriveRationale(response.parsed),
    },
  }
}
