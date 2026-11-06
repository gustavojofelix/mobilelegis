import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataService } from '../core/data.service';
import { BrRef, Diploma, Relation } from '../core/models';
import { BoardCard } from './bo.models';

export type RadarStatus = 'new' | 'published' | 'ignored' | 'consolidation';
export interface RadarItem {
  id: string; wave: number; status: RadarStatus; demo?: boolean;
  detectedAt?: string; publishedAt?: string;
  br: BrRef; type: string; number: string; date: string; heading: string; shortTitle: string;
  issuer: string; summary: string; inForce: string; inForceRule: string; approvedAt?: string;
  descriptors: string[]; relations: Relation[];
  suggest: { areaId: string; categoryId: string; subcategoryId: string; confidence: number; newArea?: string };
  ocr: number; pages: number; textReady: boolean;
  articles?: { number: string; heading: string; paragraphs: string[] }[];
}
interface RadarData { source: string; schedule: string; lastSync: string; syncAt: string; items: RadarItem[]; }
interface Placement { areaId: string; categoryId: string; subcategoryId: string; }
interface RadarState { synced: boolean; status: Record<string, RadarStatus>; at: Record<string, string>; place: Record<string, Placement>; }

const KEY = 'ml.bo.radar.v1';
const empty = (): RadarState => ({ synced: false, status: {}, at: {}, place: {} });

/**
 * Radar BR: recolha automática dos Boletins da República publicados pela INM (simulada).
 * Cada diploma detectado é lido, classificado pela IA e ligado à legislação já existente;
 * o jurista só confirma: publicar a ficha, abrir uma consolidação ou ignorar.
 */
@Injectable({ providedIn: 'root' })
export class RadarService {
  private http = inject(HttpClient);
  private data = inject(DataService);
  readonly raw = signal<RadarData | null>(null);
  readonly state = signal<RadarState>(this.read());

  async init() {
    if (!this.raw()) this.raw.set(await firstValueFrom(this.http.get<RadarData>('data/backoffice/radar.json')));
  }

  readonly items = computed(() => (this.raw()?.items ?? [])
    .filter(i => i.wave === 0 || this.state().synced)
    .map(i => ({ ...i, status: this.state().status[i.id] ?? i.status, publishedAt: this.state().at[i.id] ?? i.publishedAt }))
    .sort((a, b) => b.br.date.localeCompare(a.br.date) || a.br.page - b.br.page));
  readonly pending = computed(() => this.items().filter(i => i.status === 'new').length);
  readonly lastSync = computed(() => (this.state().synced ? this.raw()?.syncAt : this.raw()?.lastSync) ?? '');

  /** Dossiers de consolidação abertos a partir do Radar (aparecem no quadro do painel). */
  readonly cards = computed<BoardCard[]>(() => this.items().filter(i => i.status === 'consolidation').map(i => {
    const target = i.relations.find(r => r.kind === 'altera' && r.id);
    const t = target?.id ? this.data.diploma(target.id) : undefined;
    return {
      code: 'RAD-' + i.number.replace('/', '-'), title: `${t?.heading ?? '—'} ← ${i.heading.replace(' (exemplo fictício)', '')}`,
      note: 'Aberto pelo Radar BR · 2 PDF já anexados', column: 'read', assignee: 'Radar BR (IA)',
      due: '2026-11-13', progress: 12, docs: 2,
    };
  }));

  placement(i: RadarItem): Placement {
    return this.state().place[i.id] ?? { areaId: i.suggest.areaId, categoryId: i.suggest.categoryId, subcategoryId: i.suggest.subcategoryId };
  }
  setPlacement(id: string, p: Placement) { this.patch(s => { s.place[id] = p; }); }

  sync() { this.patch(s => { s.synced = true; }); }

  publish(id: string) {
    const i = this.items().find(x => x.id === id);
    if (!i) return;
    this.data.upsertDiploma(this.toDiploma(i));
    this.patch(s => { s.status[id] = 'published'; s.at[id] = new Date().toISOString(); });
  }

  /** Publica a ficha do diploma de alteração e abre o dossier de consolidação do diploma alterado. */
  consolidate(id: string) {
    const i = this.items().find(x => x.id === id);
    if (!i) return;
    this.data.upsertDiploma(this.toDiploma(i));
    this.patch(s => { s.status[id] = 'consolidation'; s.at[id] = new Date().toISOString(); });
  }

  ignore(id: string) { this.patch(s => { s.status[id] = 'ignored'; }); }
  undo(id: string) {
    this.data.removeDiploma(this.diplomaId(id));
    this.patch(s => { delete s.status[id]; delete s.at[id]; });
  }

  /** Repõe a demonstração (antes da recolha das 06:00). */
  reset() {
    (this.raw()?.items ?? []).filter(i => i.wave > 0).forEach(i => this.data.removeDiploma(this.diplomaId(i.id)));
    this.state.set(empty()); this.save();
  }

  diplomaId(radarId: string) { return radarId.replace(/^r-/, ''); }

  private toDiploma(i: RadarItem): Diploma {
    const p = this.placement(i);
    return {
      id: this.diplomaId(i.id), type: i.type, number: i.number, year: +i.date.slice(0, 4), date: i.date,
      title: `${i.shortTitle} - ${i.heading}`, heading: i.heading, preamble: i.summary,
      areaId: p.areaId, categoryId: p.categoryId, subcategoryId: p.subcategoryId,
      status: 'em_vigor', price: 150, amendments: [], annexes: [],
      sections: i.textReady && i.articles ? [{ heading: 'Articulado', articles: i.articles.map(a => ({ id: 'art-' + a.number, ...a })) }] : [],
      textPending: !i.textReady,
      issuer: i.issuer, br: i.br, inForce: i.inForce, inForceRule: i.inForceRule, descriptors: i.descriptors, relations: i.relations,
    };
  }

  private patch(fn: (s: RadarState) => void) {
    const s = structuredClone(this.state()); fn(s); this.state.set(s); this.save();
  }
  private save() { try { localStorage.setItem(KEY, JSON.stringify(this.state())); } catch { /* ignore */ } }
  private read(): RadarState { try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? 'null') }; } catch { return empty(); } }
}
