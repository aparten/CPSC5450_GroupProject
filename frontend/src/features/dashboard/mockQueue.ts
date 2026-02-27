import type { QueueItem } from './types'

export const mockQueue: QueueItem[] = [
  {
    event_id: 'SOC-2401',
    parsed: {
      email_id: 'SOC-2401',
      headers: {
        from_address: 'it-helpdesk@utc-serv1ce.com',
        subject: 'Password reset required within 30 minutes',
        date: '2026-02-22T09:41:00Z',
      },
      indicators: {
        urls: [
          { url_actual: 'https://verify-now-login.com/reset', url_display_text: null, domain: 'verify-now-login.com' },
          { url_actual: 'https://utc-serv1ce.com/account', url_display_text: null, domain: 'utc-serv1ce.com' },
          { url_actual: 'https://verify-now-login.com/otp', url_display_text: null, domain: 'verify-now-login.com' },
        ],
        domains: ['utc-serv1ce.com', 'verify-now-login.com'],
        ip_addresses: ['192.0.2.12'],
      },
      derived_flags: {
        display_name_mismatch: true,
        sender_domain_mismatch: true,
        unicode_trick_detected: false,
      },
      label: 'phishing',
    },
    ui: {
      status: 'needs review',
      severity: 'critical',
      confidence: 0.94,
      rationale:
        'Urgent credential-reset language, mismatched sender domain, and multiple external links increase phishing likelihood.',
    },
  },
  {
    event_id: 'SOC-2402',
    parsed: {
      email_id: 'SOC-2402',
      headers: {
        from_address: 'registrar@utc.edu',
        subject: 'Updated spring enrollment deadlines',
        date: '2026-02-22T10:08:00Z',
      },
      indicators: {
        urls: [{ url_actual: 'https://utc.edu/registrar/deadlines', url_display_text: null, domain: 'utc.edu' }],
        domains: ['utc.edu'],
        ip_addresses: [],
      },
      derived_flags: {
        display_name_mismatch: false,
        sender_domain_mismatch: false,
        unicode_trick_detected: false,
      },
      label: 'benign',
    },
    ui: {
      status: 'approved',
      severity: 'low',
      confidence: 0.81,
      rationale:
        'Sender domain and message context align with expected registrar communication and contains low-risk indicators.',
    },
  },
  {
    event_id: 'SOC-2403',
    parsed: {
      email_id: 'SOC-2403',
      headers: {
        from_address: 'payroll@utc-payroll.com',
        subject: 'Confirm direct deposit to avoid delay',
        date: '2026-02-22T11:13:00Z',
      },
      indicators: {
        urls: [
          { url_actual: 'https://directdeposit-verify.co/login', url_display_text: null, domain: 'directdeposit-verify.co' },
          { url_actual: 'https://utc-payroll.com/auth', url_display_text: null, domain: 'utc-payroll.com' },
        ],
        domains: ['utc-payroll.com', 'directdeposit-verify.co'],
        ip_addresses: [],
      },
      derived_flags: {
        display_name_mismatch: true,
        sender_domain_mismatch: true,
        unicode_trick_detected: false,
      },
      label: 'phishing',
    },
    ui: {
      status: 'needs review',
      severity: 'high',
      confidence: 0.89,
      rationale:
        'Payroll impersonation and financial urgency cues with non-campus domains suggest credential or payment phishing intent.',
    },
  },
  {
    event_id: 'SOC-2404',
    parsed: {
      email_id: 'SOC-2404',
      headers: {
        from_address: 'library-notice@utc.edu',
        subject: 'Library account alert and overdue item',
        date: '2026-02-22T12:02:00Z',
      },
      indicators: {
        urls: [{ url_actual: 'https://utc.edu/library/account', url_display_text: null, domain: 'utc.edu' }],
        domains: ['utc.edu'],
        ip_addresses: [],
      },
      derived_flags: {
        display_name_mismatch: false,
        sender_domain_mismatch: false,
        unicode_trick_detected: false,
      },
      label: 'suspicious',
    },
    ui: {
      status: 'needs review',
      severity: 'medium',
      confidence: 0.67,
      rationale:
        'Message appears mostly normal but requires analyst review due to unusual attachment request wording.',
    },
  },
  {
    event_id: 'SOC-2405',
    parsed: {
      email_id: 'SOC-2405',
      headers: {
        from_address: 'scholarship-office@utc-awards.net',
        subject: 'Scholarship disbursement verification form',
        date: '2026-02-22T13:17:00Z',
      },
      indicators: {
        urls: [
          { url_actual: 'https://grant-verify-now.biz/form', url_display_text: null, domain: 'grant-verify-now.biz' },
          { url_actual: 'https://utc-awards.net/verify', url_display_text: null, domain: 'utc-awards.net' },
          { url_actual: 'https://grant-verify-now.biz/award', url_display_text: null, domain: 'grant-verify-now.biz' },
          { url_actual: 'https://grant-verify-now.biz/id', url_display_text: null, domain: 'grant-verify-now.biz' },
        ],
        domains: ['utc-awards.net', 'grant-verify-now.biz'],
        ip_addresses: ['203.0.113.8', '203.0.113.21'],
      },
      derived_flags: {
        display_name_mismatch: true,
        sender_domain_mismatch: true,
        unicode_trick_detected: true,
      },
      label: 'phishing',
    },
    ui: {
      status: 'rejected',
      severity: 'high',
      confidence: 0.9,
      rationale:
        'Scholarship impersonation with off-domain links, obfuscated characters, and direct form submission request indicates high risk.',
    },
  },
  {
    event_id: 'SOC-2406',
    parsed: {
      email_id: 'SOC-2406',
      headers: {
        from_address: 'events@utc.edu',
        subject: 'Campus keynote RSVP reminder',
        date: '2026-02-22T14:55:00Z',
      },
      indicators: {
        urls: [{ url_actual: 'https://utc.edu/events/keynote', url_display_text: null, domain: 'utc.edu' }],
        domains: ['utc.edu'],
        ip_addresses: [],
      },
      derived_flags: {
        display_name_mismatch: false,
        sender_domain_mismatch: false,
        unicode_trick_detected: false,
      },
      label: 'benign',
    },
    ui: {
      status: 'approved',
      severity: 'low',
      confidence: 0.77,
      rationale:
        'Routine campus event reminder with expected sender domain and minimal suspicious indicators.',
    },
  },
  {
    event_id: 'SOC-2407',
    parsed: {
      email_id: 'SOC-2407',
      headers: {
        from_address: 'accounts@utc-security.org',
        subject: 'Unusual sign-in detected from new device',
        date: '2026-02-22T16:06:00Z',
      },
      indicators: {
        urls: [
          { url_actual: 'https://secure-device-check.info/verify', url_display_text: null, domain: 'secure-device-check.info' },
          { url_actual: 'https://utc-security.org/device', url_display_text: null, domain: 'utc-security.org' },
          { url_actual: 'https://secure-device-check.info/code', url_display_text: null, domain: 'secure-device-check.info' },
        ],
        domains: ['utc-security.org', 'secure-device-check.info'],
        ip_addresses: ['198.51.100.45'],
      },
      derived_flags: {
        display_name_mismatch: true,
        sender_domain_mismatch: true,
        unicode_trick_detected: false,
      },
      label: 'phishing',
    },
    ui: {
      status: 'needs review',
      severity: 'critical',
      confidence: 0.92,
      rationale:
        'Security alert impersonation with external verification links and sender mismatch indicates high-confidence phishing.',
    },
  },
  {
    event_id: 'SOC-2408',
    parsed: {
      email_id: 'SOC-2408',
      headers: {
        from_address: 'hr-updates@utc.edu',
        subject: 'Benefits portal maintenance notice',
        date: '2026-02-22T17:20:00Z',
      },
      indicators: {
        urls: [
          { url_actual: 'https://utc.edu/hr/benefits', url_display_text: null, domain: 'utc.edu' },
          { url_actual: 'https://utc.edu/hr/status', url_display_text: null, domain: 'utc.edu' },
        ],
        domains: ['utc.edu'],
        ip_addresses: [],
      },
      derived_flags: {
        display_name_mismatch: false,
        sender_domain_mismatch: false,
        unicode_trick_detected: false,
      },
      label: 'suspicious',
    },
    ui: {
      status: 'needs review',
      severity: 'medium',
      confidence: 0.61,
      rationale:
        'Looks legitimate but includes slightly unusual call-to-action phrasing, so analyst validation is recommended.',
    },
  },
]
