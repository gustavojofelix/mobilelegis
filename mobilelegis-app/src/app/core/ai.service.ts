import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { normalize } from './text';

export interface Citation {
  diplomaId: string; articleId: string; diploma: string; article: string; heading: string;
  excerpt: string; locked: boolean; revoked: boolean; note?: string;
}
export interface AiAnswer { found: boolean; citations: Citation[]; terms: string[]; }

const STOP = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para com sem sob ' +
  'que qual quais quem quando como onde porque porquê se e ou mas é são ser ter tem têm há foi está estão isso isto esse essa ' +
  'este esta ao aos à às lei leis artigo artigos diploma diplomas mocambique moçambique segundo sobre qualquer pode podem deve devem ' +
  'meu minha seu sua seus suas lhe lhes mais menos muito já ainda também diz dizer saber quero gostaria').split(' ').map(normalize));

/**
 * "Consultor jurídico" simulado: responde apenas com base nos diplomas da plataforma.
 * Recupera os artigos mais relevantes (pesquisa por termos, com radical simples) e devolve-os como citações.
 * Numa versão real, as citações são enviadas a um modelo de linguagem que redige a resposta (RAG),
 * mantendo a regra de responder só com base nos artigos citados.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private data = inject(DataService);
  private auth = inject(AuthService);

  ask(question: string): AiAnswer {
    const terms = [...new Set(normalize(question).replace(/[^a-z0-9º\s/-]/g, ' ').split(/\s+/)
      .filter(w => (w.length >= 3 || /^\d+$/.test(w)) && !STOP.has(w)))];
    const stems = terms.map(t => /^\d/.test(t) ? t : t.slice(0, Math.max(4, t.length - 2)));
    if (!stems.length) return { found: false, citations: [], terms };

    const scored: { score: number; num: boolean; c: Citation }[] = [];
    for (const d of this.data.diplomas()) {
      const title = normalize(d.heading + ' ' + d.title);
      for (const a of this.data.articles(d)) {
        const head = normalize(a.heading);
        const paras = a.paragraphs.map(normalize);
        const body = paras.join(' ') + ' ' + normalize(a.note ?? '');
        const num = normalize(a.number).replace(/\D/g, '');
        let score = 0, matched = 0, titleOnly = 0, anyNum = false;
        stems.forEach(s => {
          const isNum = /^\d+$/.test(s);
          const inHead = head.includes(s), inBody = !isNum && body.includes(s), inTitle = title.includes(s), numHit = isNum && num === s;
          if (numHit) anyNum = true;
          if (inHead || inBody || numHit) matched++; else if (inTitle) titleOnly++;
          score += (inHead ? 3 : 0) + (inBody ? 2 : 0) + (inTitle ? 1 : 0) + (numHit ? 8 : 0);
        });
        const coverage = (matched + 0.6 * titleOnly) / stems.length;
        if (!matched || coverage < (stems.length > 2 ? 0.4 : 0.99)) continue;
        // parágrafo com mais termos
        let best = 0, bestHits = -1;
        paras.forEach((p, i) => { const h = stems.filter(s => p.includes(s)).length; if (h > bestHits) { best = i; bestHits = h; } });
        const text = a.paragraphs[best] ?? '';
        scored.push({
          score: score * (0.5 + coverage), num: anyNum,
          c: {
            diplomaId: d.id, articleId: a.id, diploma: d.heading, article: a.number, heading: a.heading,
            excerpt: text.length > 360 ? text.slice(0, 357) + '…' : text,
            locked: !this.auth.canRead(d),
            revoked: d.status === 'revogado' || a.paragraphs.every(p => /^\(?revogad/i.test(p.replace(/^[§\d.ºa-z ]+/i, ''))),
            note: a.note,
          },
        });
      }
    }
    scored.sort((x, y) => y.score - x.score);
    // Se a pergunta cita números de artigo, fica-se só com esses artigos
    const pool = scored.some(x => x.num) ? scored.filter(x => x.num) : scored;
    const top = pool.filter(x => x.score >= pool[0]?.score * 0.45).slice(0, 4).map(x => x.c);
    return { found: top.length > 0, citations: top, terms };
  }
}
