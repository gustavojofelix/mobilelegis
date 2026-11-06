import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataService } from '../core/data.service';
import { Article, Diploma, Section } from '../core/models';
import {
  ArticleView, Attached, BoDoc, BoardData, CaseData, CodeArticle, DiplomaMeta, DossierState, Effect, LogEntry, UnitView,
} from './bo.models';

const STATE_KEY = 'ml.bo.laci047.v1';
const SESSION_KEY = 'ml.bo.session';


function read<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const now = () => new Date().toISOString();

function emptyState(): DossierState {
  return { started: false, reached: 0, attached: [], readDone: false, doubts: {}, issues: {}, ops: {}, warnings: {}, meta: null, log: [] };
}

/** Data por extenso em português, ex.: "12 de Dezembro de 1950". */
export function longDatePt(iso: string): string {
  if (!iso) return '';
  const s = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00'));
  return s.replace(/ de ([a-zç]+) de /, (_, m: string) => ` de ${m[0].toUpperCase()}${m.slice(1)} de `);
}

/** Conta páginas de um PDF procurando os objectos /Type /Page (sem bibliotecas externas). */
async function pdfPages(file: File): Promise<number | undefined> {
  try {
    const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
    const n = (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
    return n || undefined;
  } catch { return undefined; }
}

/**
 * Back office simulado: sessão de administrador, dossier de demonstração LACI047
 * (Código das Execuções Fiscais) e motor de consolidação.
 * A "IA" está simulada: os resultados da leitura e da detecção de alterações vêm de
 * public/data/backoffice/laci047.json, preparados a partir dos PDFs reais.
 */
@Injectable({ providedIn: 'root' })
export class BoService {
  private http = inject(HttpClient);
  private data = inject(DataService);

  readonly board = signal<BoardData | null>(null);
  readonly case = signal<CaseData | null>(null);
  readonly state = signal<DossierState>(read<DossierState>(STATE_KEY) ?? emptyState());
  readonly adminEmail = signal<string | null>(read<string>(SESSION_KEY));
  /** URLs locais dos PDFs carregados nesta sessão (não persistem após recarregar). */
  readonly fileUrls = signal<Record<string, string>>({});

  readonly admin = computed(() => this.board()?.admins.find(a => a.email === this.adminEmail()) ?? null);

  private loading?: Promise<void>;

  constructor() {
    effect(() => write(STATE_KEY, this.state()));
  }

  init(): Promise<void> {
    this.loading ??= (async () => {
      const [board, kase] = await Promise.all([
        firstValueFrom(this.http.get<BoardData>('data/backoffice/board.json')),
        firstValueFrom(this.http.get<CaseData>('data/backoffice/laci047.json')),
      ]);
      this.board.set(board);
      this.case.set(kase);
    })();
    return this.loading;
  }

  // ---------- Sessão ----------
  login(email: string, password: string): boolean {
    const a = this.board()?.admins.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!a) return false;
    this.adminEmail.set(a.email);
    write(SESSION_KEY, a.email);
    return true;
  }
  logout() {
    this.adminEmail.set(null);
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }

  // ---------- Estado ----------
  private patch(fn: (s: DossierState) => void, log?: Omit<LogEntry, 'at' | 'who'> & { who?: string }) {
    this.state.update(s => {
      const next = clone(s);
      fn(next);
      if (log) next.log.unshift({ at: now(), who: log.who ?? this.admin()?.name ?? '—', key: log.key, params: log.params });
      return next;
    });
  }

  doc(id: string): BoDoc | undefined { return this.case()?.docs.find(d => d.id === id); }

  readonly docs = computed(() => this.case()?.docs ?? []);
  readonly attachedDocs = computed(() => {
    const ids = new Set(this.state().attached.map(a => a.docId));
    return this.docs().filter(d => ids.has(d.id));
  });
  readonly coreDocsReady = computed(() => {
    const ids = new Set(this.state().attached.map(a => a.docId));
    return ['orig', 'a1951', 'a1966', 'a2013'].every(id => ids.has(id));
  });
  readonly hasManual = computed(() => this.state().attached.some(a => a.docId === 'manual'));

  /** Etapa sugerida para o quadro de trabalho. */
  readonly column = computed(() => {
    const s = this.state();
    if (s.publishedAt) return 'published';
    if (s.submitted) return 'reviewer';
    if (s.reached >= 2) return 'review';
    return 'read';
  });

  readonly progress = computed(() => {
    const s = this.state();
    if (s.publishedAt) return 100;
    const k = this.case(); if (!k) return 0;
    const done = Object.keys(s.doubts).length + Object.keys(s.issues).length + Object.keys(s.ops).length + Object.keys(s.warnings).length + (s.attached.length ? 4 : 0);
    const total = k.doubts.length + k.issues.length + k.ops.length + k.warnings.length + 4;
    return Math.round(done / total * 95);
  });

  start() {
    this.patch(s => { Object.assign(s, emptyState(), { started: true }); }, { key: 'bo.log.started' });
    this.data.removeDiploma(this.case()?.meta.id ?? '');
    this.revokeUrls();
  }

  reset() {
    this.revokeUrls();
    this.data.removeDiploma(this.case()?.meta.id ?? '');
    this.state.set(emptyState());
  }

  private revokeUrls() {
    Object.values(this.fileUrls()).forEach(u => URL.revokeObjectURL(u));
    this.fileUrls.set({});
  }

  reach(step: number) { if (step > this.state().reached) this.patch(s => { s.reached = step; }); }

  // ---------- Passo 1: carregar ----------
  /** Identifica cada ficheiro pelo nome; devolve os nomes não reconhecidos. */
  async attach(files: File[]): Promise<string[]> {
    const unknown: string[] = [];
    const found: Attached[] = [];
    const urls: Record<string, string> = {};
    for (const f of files) {
      const name = f.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const doc = this.docs().find(d => d.match.some(m => name.includes(m.normalize('NFD').replace(/[̀-ͯ]/g, ''))));
      if (!doc || !/\.pdf$/.test(name)) { unknown.push(f.name); continue; }
      found.push({ docId: doc.id, fileName: f.name, size: f.size, pages: await pdfPages(f), example: false });
      urls[doc.id] = URL.createObjectURL(f);
    }
    if (found.length) {
      this.fileUrls.update(u => ({ ...u, ...urls }));
      this.patch(s => {
        s.started = true;
        for (const a of found) s.attached = [...s.attached.filter(x => x.docId !== a.docId), a];
      }, { key: 'bo.log.attached', params: { n: found.length } });
    }
    return unknown;
  }

  useExample() {
    this.patch(s => {
      s.started = true;
      s.attached = this.docs().map(d => ({ docId: d.id, fileName: d.file, size: 0, pages: d.pages, example: true }));
    }, { key: 'bo.log.example' });
  }

  detach(docId: string) {
    const url = this.fileUrls()[docId];
    if (url) { URL.revokeObjectURL(url); this.fileUrls.update(u => { const c = { ...u }; delete c[docId]; return c; }); }
    this.patch(s => { s.attached = s.attached.filter(a => a.docId !== docId); s.readDone = false; });
  }

  // ---------- Passo 2: ler ----------
  finishReading() {
    const k = this.case()!;
    this.patch(s => {
      s.readDone = true;
      for (const i of k.issues) if (i.auto && !s.issues[i.id]) s.issues[i.id] = 'ok';
    }, { key: 'bo.log.read', params: { pages: this.attachedDocs().filter(d => d.role !== 'manual').reduce((n, d) => n + d.pages, 0), doubts: k.doubts.length } });
  }

  decideDoubt(id: string, choice: 'accept' | 'keep' | 'custom', value?: string) {
    this.patch(s => { s.doubts[id] = { choice, value }; });
  }
  decideIssue(id: string, choice: string) {
    const issue = this.case()?.issues.find(i => i.id === id);
    this.patch(s => { s.issues[id] = choice; }, { key: 'bo.log.issue', params: { t: issue?.title ?? id } });
  }
  acceptAllSuggestions() {
    const k = this.case()!;
    this.patch(s => { for (const d of k.doubts) if (!s.doubts[d.id]) s.doubts[d.id] = { choice: 'accept' }; }, { key: 'bo.log.acceptAll' });
  }

  // ---------- Passo 3: alterações ----------
  decideOp(id: string, status: 'approved' | 'rejected') {
    const op = this.case()?.ops.find(o => o.id === id);
    this.patch(s => { s.ops[id] = status; }, { key: status === 'approved' ? 'bo.log.opApproved' : 'bo.log.opRejected', params: { t: op?.summary ?? id } });
  }
  decideWarning(id: string, choice: string) {
    const w = this.case()?.warnings.find(x => x.id === id);
    this.patch(s => { s.warnings[id] = choice; }, { key: 'bo.log.warning', params: { t: w?.title ?? id } });
  }

  // ---------- Contadores ----------
  readonly counts = computed(() => {
    const k = this.case(), s = this.state();
    if (!k) return null;
    const manualIssues = k.issues.filter(i => !i.auto);
    return {
      doubts: { done: k.doubts.filter(d => s.doubts[d.id]).length, total: k.doubts.length },
      issues: { done: manualIssues.filter(i => s.issues[i.id]).length, total: manualIssues.length },
      ops: { done: k.ops.filter(o => s.ops[o.id]).length, total: k.ops.length, approved: k.ops.filter(o => s.ops[o.id] === 'approved').length },
      warnings: { done: k.warnings.filter(w => s.warnings[w.id]).length, total: k.warnings.length },
    };
  });

  // ---------- Consolidação ----------
  /** Artigos depois de aplicar as correcções de leitura e de estrutura. */
  readonly fixedArticles = computed<CodeArticle[]>(() => {
    const k = this.case(), s = this.state();
    if (!k) return [];
    const arts = clone(k.articles);
    const unit = (id: string) => arts.flatMap(a => a.units).find(u => u.id === id);
    for (const d of k.doubts) {
      const dec = s.doubts[d.id];
      const u = d.unit ? unit(d.unit) : undefined;
      if (!u || !dec || dec.choice === 'keep') continue;
      u.text = u.text.replace(d.wrong, dec.choice === 'custom' ? (dec.value ?? d.wrong) : d.right);
    }
    for (const i of k.issues) {
      const effect = i.choices.find(c => c.id === s.issues[i.id])?.effect;
      if (effect) this.applyEffect(arts, effect);
    }
    return arts;
  });

  private applyEffect(arts: CodeArticle[], e: Effect) {
    const unit = (id: string) => arts.flatMap(a => a.units).find(u => u.id === id);
    if (e.type === 'renumber') for (const a of arts) { if (e.map[a.k]) a.n = e.map[a.k]; }
    if (e.type === 'append') { const u = unit(e.unit); if (u && !u.text.endsWith(e.text)) u.text += e.text; }
    if (e.type === 'replace') { const u = unit(e.unit); if (u) u.text = u.text.replace(e.from, e.to); }
  }

  /** Datas das alterações aprovadas, por ordem cronológica. */
  readonly timeline = computed(() => this.docs().filter(d => d.role !== 'manual').sort((a, b) => a.date.localeCompare(b.date)));

  /** Texto consolidado à data `upTo` (inclusive). Só aplica as operações aprovadas. */
  consolidate(upTo = '9999-12-31'): ArticleView[] {
    const k = this.case(), s = this.state();
    if (!k) return [];
    const views: ArticleView[] = this.fixedArticles().map(a => ({
      k: a.k, n: a.n, section: a.section, notes: [], changed: false,
      units: a.units.map(u => ({ ...u, state: 'kept' as const })),
    }));
    const byK = (key: string) => views.find(v => v.k === key);
    const date = (docId: string) => this.doc(docId)?.date ?? '';
    const ops = k.ops.filter(o => s.ops[o.id] === 'approved' && date(o.doc) <= upTo).sort((a, b) => date(a.doc).localeCompare(date(b.doc)));
    for (const op of ops) {
      const v = byK(op.target.art);
      if (!v) continue;
      v.changed = true;
      if (op.kind === 'substitute' && op.newUnits) {
        v.previous = v.units.map(u => ({ ...u }));
        v.units = op.newUnits.map(u => ({ ...u, state: 'new' as const }));
        v.notes.push(op.note);
      } else if (op.kind === 'revoke' && op.target.unit) {
        const u = v.units.find(x => x.id === op.target.unit);
        if (u) { u.state = 'revoked'; u.note = op.note; }
      } else if (op.kind === 'revoke') {
        v.revoked = op.note;
        v.units.forEach(u => u.state = 'revoked');
      }
    }
    for (const w of k.warnings) {
      const effect = w.choices.find(c => c.id === s.warnings[w.id])?.effect;
      if (effect?.type === 'note' && date(w.doc) <= upTo) for (const a of effect.arts) byK(a)?.notes.push(effect.text);
    }
    return views;
  }

  // ---------- Publicação ----------
  readonly meta = computed<DiplomaMeta | null>(() => this.state().meta ?? this.case()?.meta ?? null);

  updateMeta(m: DiplomaMeta) { this.patch(s => { s.meta = m; }); }

  submit() { this.patch(s => { s.submitted = { by: this.admin()?.name ?? '—', at: now() }; }, { key: 'bo.log.submitted' }); }

  review() {
    const who = this.board()?.reviewer.name ?? '—';
    this.patch(s => { s.reviewed = { by: who, at: now() }; }, { key: 'bo.log.reviewed', who });
  }

  publish(): Diploma {
    const d = this.buildDiploma();
    this.data.upsertDiploma(d);
    this.patch(s => { s.publishedAt = now(); s.reached = 4; }, { key: 'bo.log.published' });
    return d;
  }

  buildDiploma(): Diploma {
    const k = this.case()!, m = this.meta()!, s = this.state();
    const views = this.consolidate();
    const sections: Section[] = [];
    for (const v of views) {
      let sec = sections[sections.length - 1];
      if (!sec || sec.heading !== v.section) { sec = { heading: v.section, articles: [] }; sections.push(sec); }
      const line = (u: UnitView) => u.state === 'revoked' && !v.revoked ? `${u.label} (Revogado.)`.trim() : `${u.label} ${u.text}`.trim();
      const art: Article = {
        id: 'art-' + v.n, number: v.n + '.º', heading: '',
        paragraphs: v.revoked ? ['(Revogado.)'] : v.units.map(line),
        note: [v.revoked, ...v.units.filter(u => u.state === 'revoked' && u.note && !v.revoked).map(u => `${u.label} ${u.note}`), ...v.notes].filter(Boolean).join(' · ') || undefined,
      };
      if (v.previous) {
        const src = k.ops.find(o => o.target.art === v.k && o.kind === 'substitute');
        art.history = [{ text: v.previous.map(u => `${u.label} ${u.text}`.trim()), validUntil: src ? this.doc(src.doc)?.date ?? '' : '', source: 'Redacção original do Decreto n.º 38 088' }];
      }
      sec.articles.push(art);
    }
    const amendments = this.timeline().filter(d => d.role === 'amendment').map(d => ({
      diploma: `${d.title}, de ${longDatePt(d.date)}`, date: d.date, brPdf: BR_PDF[d.id],
      summary: k.ops.filter(o => o.doc === d.id && s.ops[o.id] === 'approved').map(o => o.summary).join('; ') || '—',
    }));
    return {
      id: m.id, type: m.type, number: m.number, year: m.year, date: m.date, title: m.title, heading: m.heading,
      preamble: m.preamble, areaId: m.areaId, categoryId: m.categoryId, subcategoryId: m.subcategoryId,
      status: 'alterado', price: m.price, amendments,
      annexes: s.issues['i4'] === 'annex' ? ['Tabela de custas (art. 256.º)', 'Modelos n.º 1 a 21 e A a G'] : ['Modelos n.º 1 a 21 e A a G'],
      sections,
      issuer: 'Ministério das Colónias',
      br: { gazette: 'Boletim Oficial de Moçambique', number: '—', series: 'I', page: 1, date: m.date },
      brPdf: 'br/dec-38088.pdf',
      inForce: m.date, inForceRule: 'Nos termos do próprio decreto (extensão às províncias ultramarinas)',
      descriptors: ['Execuções fiscais', 'Cobrança coerciva', 'Dívidas ao Estado'],
      relations: [{ kind: 'ver_tambem', id: 'lei-32-2007' }],
    };
  }
}

/** PDFs reais dos diplomas de alteração do caso LACI047 (public/br). */
const BR_PDF: Record<string, string> = { a1951: 'br/dec-38295.pdf', a1966: 'br/dec-46849.pdf', a2013: 'br/dl-1-2013.pdf' };
