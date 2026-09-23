export type HrIconName = 'overview' | 'skills' | 'support' | 'learning' | 'arrow' | 'refresh' | 'search' | 'people' | 'target' | 'check' | 'logout' | 'close' | 'calendar'

const paths: Record<HrIconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  skills: 'M5 20V10 M12 20V4 M19 20v-7 M3 20h18',
  support: 'M8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a6 6 0 0 1 12 0v3 M19 8v6 M19 18h.01',
  learning: 'm2 8 10-5 10 5-10 5z M6 10v7c4 3 8 3 12 0v-7 M22 8v8',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  refresh: 'M20 7a9 9 0 1 0 1 8 M20 2v6h-6',
  search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M17 4a4 4 0 0 1 0 7 M19 15a5 5 0 0 1 3 4v2',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 11v2',
  check: 'm5 12 4 4L19 6',
  logout: 'M10 3H4v18h6 M9 12h13 M17 7l5 5-5 5',
  close: 'm6 6 12 12 M6 18 18 6',
  calendar: 'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4',
}

export function HrIcon({ name, className = '' }: { name: HrIconName; className?: string }) {
  return <svg className={`hr-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
