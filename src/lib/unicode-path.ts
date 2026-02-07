/**
 * Paths that come from DB and paths on disk/CDN can differ only by Unicode normalization
 * (e.g. "ñ" as NFC U+00F1 vs NFD "n" + U+0303). Many storage backends treat these as
 * different byte sequences, so we try multiple forms when resolving media paths.
 */

export type UnicodePreference = 'input' | 'nfc' | 'nfd'

export function unicodePathVariants(path: string, prefer: UnicodePreference = 'input'): string[] {
  const input = path || ''
  const nfc = input.normalize('NFC')
  const nfd = input.normalize('NFD')

  const ordered =
    prefer === 'nfc' ? [nfc, input, nfd] :
    prefer === 'nfd' ? [nfd, input, nfc] :
    [input, nfc, nfd]

  return Array.from(new Set(ordered.filter(Boolean)))
}

