import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Area, Article, CaseLaw, Diploma, LegalTemplate, Plan, Relation, RelationKind, User, Voucher } from './models';

const PUBLISHED_KEY = 'ml.bo.published';

export interface PlansData { trialDays: number; plans: Plan[]; vouchers: Voucher[]; }

/**
 * Carrega os dados fictícios (public/data/*.json).
 * Numa versão real, estes pedidos são substituídos pelas chamadas à API.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  readonly areas = signal<Area[]>([]);
  readonly diplomas = signal<Diploma[]>([]);
  readonly plansData = signal<PlansData>({ trialDays: 14, plans: [], vouchers: [] });
  readonly seedUsers = signal<User[]>([]);
  readonly cases = signal<CaseLaw[]>([]);
  readonly templates = signal<LegalTemplate[]>([]);

  async init(): Promise<void> {
    const get = <T>(f: string) => firstValueFrom(this.http.get<T>(`data/${f}.json`));
    const [areas, diplomas, plans, users, cases, templates] = await Promise.all([
      get<Area[]>('areas'), get<Diploma[]>('diplomas'), get<PlansData>('plans'), get<User[]>('users'),
      get<CaseLaw[]>('jurisprudence'), get<LegalTemplate[]>('templates'),
    ]);
    this.cases.set(cases.sort((a, b) => b.date.localeCompare(a.date)));
    this.templates.set(templates);
    this.areas.set(areas);
    // Diplomas publicados no back office (guardados no navegador)
    let published: Diploma[] = [];
    try { published = JSON.parse(localStorage.getItem(PUBLISHED_KEY) ?? '[]'); } catch { /* ignore */ }
    this.diplomas.set([...diplomas.filter(d => !published.some(p => p.id === d.id)), ...published]);
    this.plansData.set(plans);
    this.seedUsers.set(users);
  }

  /** Publica (ou substitui) um diploma vindo do back office. */
  upsertDiploma(d: Diploma) {
    d = { ...d, addedAt: d.addedAt ?? new Date().toISOString() };
    this.diplomas.update(list => [...list.filter(x => x.id !== d.id), d]);
    this.savePublished(list => [...list.filter(x => x.id !== d.id), d]);
  }

  removeDiploma(id: string) {
    if (!id) return;
    this.diplomas.update(list => list.filter(x => x.id !== id || !this.isPublished(id)));
    this.savePublished(list => list.filter(x => x.id !== id));
  }

  private isPublished(id: string) {
    try { return (JSON.parse(localStorage.getItem(PUBLISHED_KEY) ?? '[]') as Diploma[]).some(d => d.id === id); } catch { return false; }
  }

  private savePublished(fn: (list: Diploma[]) => Diploma[]) {
    try {
      const list = JSON.parse(localStorage.getItem(PUBLISHED_KEY) ?? '[]') as Diploma[];
      localStorage.setItem(PUBLISHED_KEY, JSON.stringify(fn(list)));
    } catch { /* ignore */ }
  }

  area(id: string) { return this.areas().find(a => a.id === id); }
  diploma(id: string) { return this.diplomas().find(d => d.id === id); }
  articles(d: Diploma): Article[] { return d.sections.flatMap(s => s.articles); }
  /**
   * Legislação associada: relações declaradas + derivadas (alterações, revogação)
   * + inversas (se A altera B, B fica "alterado por A").
   */
  relations(d: Diploma): Relation[] {
    const INV: Record<RelationKind, RelationKind> = {
      altera: 'alterado_por', alterado_por: 'altera', revoga: 'revogado_por', revogado_por: 'revoga',
      regulamenta: 'regulamentado_por', regulamentado_por: 'regulamenta', ver_tambem: 'ver_tambem',
    };
    const out: Relation[] = [...(d.relations ?? [])];
    d.amendments.forEach(a => {
      const id = a.id && this.diploma(a.id) ? a.id : this.diplomas().find(o => o.heading === a.diploma)?.id;
      out.push({ kind: 'alterado_por', id, label: id ? undefined : a.diploma, note: a.summary, pdf: a.brPdf });
    });
    if (d.revokedBy) out.push({ kind: 'revogado_por', id: d.revokedBy });
    for (const o of this.diplomas()) {
      if (o.id === d.id) continue;
      (o.relations ?? []).filter(r => r.id === d.id).forEach(r => out.push({ kind: INV[r.kind], id: o.id, note: r.note }));
      if (o.revokedBy === d.id) out.push({ kind: 'revoga', id: o.id });
    }
    const seen = new Set<string>();
    return out.filter(r => {
      const k = r.kind + '|' + (r.id ?? r.label);
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }

  caseLaw(id: string) { return this.cases().find(c => c.id === id); }
  template(id: string) { return this.templates().find(t => t.id === id); }
  /** Decisões que aplicam um diploma (ou um artigo concreto). */
  casesFor(diplomaId: string, articleId?: string) {
    return this.cases().filter(c => c.norms.some(n => n.diplomaId === diplomaId && (!articleId || n.articleId === articleId)));
  }
  templatesFor(diplomaId: string) { return this.templates().filter(t => t.norms.some(n => n.diplomaId === diplomaId)); }
  /** Rótulo de uma norma: "Lei n.º 13/2023 — art. 130". */
  normLabel(n: { diplomaId: string; articleId: string; label?: string }) {
    const d = this.diploma(n.diplomaId), a = d ? this.articles(d).find(x => x.id === n.articleId) : undefined;
    if (!d) return n.label ?? n.diplomaId;
    return `${d.heading.split(',')[0]} — art. ${a?.number ?? n.articleId.replace('art-', '')}${a?.heading ? ' (' + a.heading + ')' : ''}`;
  }

  diplomasIn(areaId: string, categoryId: string, subcategoryId: string) {
    return this.diplomas().filter(d => d.areaId === areaId && d.categoryId === categoryId && d.subcategoryId === subcategoryId);
  }
}
