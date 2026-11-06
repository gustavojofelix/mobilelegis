import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Area, Article, Diploma, Plan, Relation, RelationKind, User, Voucher } from './models';

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

  async init(): Promise<void> {
    const get = <T>(f: string) => firstValueFrom(this.http.get<T>(`data/${f}.json`));
    const [areas, diplomas, plans, users] = await Promise.all([
      get<Area[]>('areas'), get<Diploma[]>('diplomas'), get<PlansData>('plans'), get<User[]>('users'),
    ]);
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

  diplomasIn(areaId: string, categoryId: string, subcategoryId: string) {
    return this.diplomas().filter(d => d.areaId === areaId && d.categoryId === categoryId && d.subcategoryId === subcategoryId);
  }
}
