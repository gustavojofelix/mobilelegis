/** Utilitários de texto: normalização sem acentos e destaque de termos. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ESC[c]);
}

/**
 * Posições [início, fim] de todas as ocorrências de `term` em `text` (ignora acentos e maiúsculas).
 * A normalização NFD+remoção de diacríticos mantém o comprimento de cada carácter base
 * para os textos em português, por isso os índices são válidos no texto original.
 */
export function findAll(text: string, term: string): [number, number][] {
  const t = normalize(term.trim());
  if (t.length < 2) return [];
  const n = foldKeepLength(text);
  const out: [number, number][] = [];
  let i = n.indexOf(t);
  while (i !== -1) { out.push([i, i + t.length]); i = n.indexOf(t, i + t.length); }
  return out;
}

/** Remove acentos carácter a carácter, mantendo o comprimento original. */
function foldKeepLength(s: string): string {
  let out = '';
  for (const ch of s) out += ch.length === 1 ? (normalize(ch)[0] ?? ch) : ch;
  return out;
}

/** HTML seguro com <mark> nas ocorrências; `activeIndex` (relativo a este texto) recebe a classe "active". */
export function highlight(text: string, term: string, activeIndex = -1): string {
  const hits = findAll(text, term);
  if (!hits.length) return escapeHtml(text);
  let html = '', last = 0;
  hits.forEach(([s, e], i) => {
    html += escapeHtml(text.slice(last, s));
    html += `<mark class="${i === activeIndex ? 'active' : ''}">${escapeHtml(text.slice(s, e))}</mark>`;
    last = e;
  });
  return html + escapeHtml(text.slice(last));
}

export function snippet(text: string, term: string, radius = 60): string {
  const hit = findAll(text, term)[0];
  if (!hit) return text.slice(0, radius * 2) + (text.length > radius * 2 ? '…' : '');
  const s = Math.max(0, hit[0] - radius), e = Math.min(text.length, hit[1] + radius);
  return (s > 0 ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '');
}
