export interface CountryCode {
  code: string;
  label: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+420', label: 'CZ +420' },
  { code: '+421', label: 'SK +421' },
  { code: '+43', label: 'AT +43' },
  { code: '+48', label: 'PL +48' },
  { code: '+36', label: 'HU +36' },
  { code: '+49', label: 'DE +49' },
  { code: '+44', label: 'UK +44' },
  { code: '+1', label: 'US +1' },
];

export const DEFAULT_COUNTRY_CODE = '+420';

/** Split a stored phone string into a known country prefix + the local part. */
export function splitPhone(value: string): { prefix: string; local: string } {
  if (value.startsWith('+')) {
    // Longest matching code first so e.g. +421 wins over a shorter overlap.
    const match = [...COUNTRY_CODES]
      .sort((a, b) => b.code.length - a.code.length)
      .find((c) => value.startsWith(c.code));
    if (match)
      return { prefix: match.code, local: value.slice(match.code.length) };
    return { prefix: DEFAULT_COUNTRY_CODE, local: value.replace(/^\+/, '') };
  }
  // Legacy / non-prefixed values (e.g. old seed data): keep digits, default prefix.
  return { prefix: DEFAULT_COUNTRY_CODE, local: value.replace(/\D/g, '') };
}

/** Canonical `+<code><digits>` form, used to prefill the edit form. */
export function normalizePhone(value: string | null | undefined): string {
  if (!value) return DEFAULT_COUNTRY_CODE;
  const { prefix, local } = splitPhone(value);
  return `${prefix}${local.replace(/\D/g, '')}`;
}
