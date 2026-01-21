// Shared constants that can be imported by client components
// (separated from db.ts which uses better-sqlite3)

export const TenseType = {
  Past: 'past',
  Present: 'present',
  Subjunctive: 'subjunctive',
  Jussive: 'jussive',
  Imperative: 'imperative',
} as const;

// Person display order and Arabic pronouns
export const PersonInfo: Record<string, { arabic: string; english: string; order: number }> = {
  ana: { arabic: 'أنا', english: 'I', order: 1 },
  nahnu: { arabic: 'نحن', english: 'We', order: 2 },
  anta: { arabic: 'أنتَ', english: 'You (m.s.)', order: 3 },
  anti: { arabic: 'أنتِ', english: 'You (f.s.)', order: 4 },
  antuma: { arabic: 'أنتما', english: 'You (dual)', order: 5 },
  antum: { arabic: 'أنتم', english: 'You (m.pl.)', order: 6 },
  antunna: { arabic: 'أنتن', english: 'You (f.pl.)', order: 7 },
  huwa: { arabic: 'هو', english: 'He', order: 8 },
  hiya: { arabic: 'هي', english: 'She', order: 9 },
  huma_m: { arabic: 'هما', english: 'They (dual m.)', order: 10 },
  huma_f: { arabic: 'هما', english: 'They (dual f.)', order: 11 },
  hum: { arabic: 'هم', english: 'They (m.pl.)', order: 12 },
  hunna: { arabic: 'هن', english: 'They (f.pl.)', order: 13 },
};
