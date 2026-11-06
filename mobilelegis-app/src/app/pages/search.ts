import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { Diploma } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { findAll, normalize, snippet } from '../core/text';
import { DiplomaRow } from '../shared/diploma-row';
import { PageTitle } from '../shared/page-title';

interface Result { d: Diploma; hits: number; snippet: string; }
type Scope = 'all' | 'title' | 'text';
type Mode = 'all' | 'phrase' | 'any';
type Sort = 'relevance' | 'newest' | 'oldest';

/**
 * Pesquisa simples + avançada: palavras-chave (todas / frase exacta / qualquer) no título, sumário ou texto integral,
 * e filtros por tipo, número, ano, área, entidade emitente, estado, BR, série, datas, descritor e "em vigor em".
 */
@Component({
  selector: 'app-search',
  imports: [FormsModule, RouterLink, DiplomaRow, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'search.title' | t" icon="search" />
    <div class="container narrow">
      <div class="form-grid filters">
        <label class="field span-2"><span>{{ 'search.keywords' | t }}</span>
          <input type="search" class="form-control" [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="'search.keywordsPh' | t" />
        </label>
        <div class="field span-2 seg-row">
          <div class="seg" role="radiogroup" [attr.aria-label]="'search.scopeLabel' | t">
            @for (s of scopes; track s) {
              <button type="button" role="radio" [class.active]="scope() === s" [attr.aria-checked]="scope() === s" (click)="scope.set(s)">{{ ('search.scope.' + s) | t }}</button>
            }
          </div>
          <div class="seg" role="radiogroup" [attr.aria-label]="'search.modeLabel' | t">
            @for (m of modes; track m) {
              <button type="button" role="radio" [class.active]="mode() === m" [attr.aria-checked]="mode() === m" (click)="mode.set(m)">{{ ('search.mode.' + m) | t }}</button>
            }
          </div>
        </div>
        <label class="field"><span>{{ 'search.type' | t }}</span>
          <select class="form-control" [ngModel]="type()" (ngModelChange)="type.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (t of types(); track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </label>
        <label class="field"><span>{{ 'search.number' | t }}</span>
          <input class="form-control" [ngModel]="number()" (ngModelChange)="number.set($event)" placeholder="13/2023" />
        </label>
        <label class="field"><span>{{ 'search.year' | t }}</span>
          <select class="form-control" [ngModel]="year()" (ngModelChange)="year.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (y of years(); track y) { <option [value]="y">{{ y }}</option> }
          </select>
        </label>
        <label class="field"><span>{{ 'search.area' | t }}</span>
          <select class="form-control" [ngModel]="areaId()" (ngModelChange)="areaId.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (a of data.areas(); track a.id) { <option [value]="a.id">{{ a.name | loc }}</option> }
          </select>
        </label>
      </div>

      <button type="button" class="link-btn adv-toggle" (click)="adv.set(!adv())" [attr.aria-expanded]="adv()">
        <i class="fa" [class.fa-sliders]="!adv()" [class.fa-chevron-up]="adv()"></i> {{ (adv() ? 'search.advHide' : 'search.adv') | t }}
        @if (advCount()) { <span class="dinfo-count">{{ advCount() }}</span> }
      </button>

      @if (adv()) {
        <div class="form-grid filters adv-box">
          <label class="field"><span>{{ 'dinfo.issuer' | t }}</span>
            <select class="form-control" [ngModel]="issuer()" (ngModelChange)="issuer.set($event)">
              <option value="">{{ 'common.all' | t }}</option>
              @for (x of issuers(); track x) { <option [value]="x">{{ x }}</option> }
            </select>
          </label>
          <label class="field"><span>{{ 'dinfo.state' | t }}</span>
            <select class="form-control" [ngModel]="status()" (ngModelChange)="status.set($event)">
              <option value="">{{ 'common.all' | t }}</option>
              @for (s of statuses; track s) { <option [value]="s">{{ ('status.' + s) | t }}</option> }
            </select>
          </label>
          <label class="field"><span>{{ 'search.brNumber' | t }}</span>
            <input class="form-control" [ngModel]="brNumber()" (ngModelChange)="brNumber.set($event)" placeholder="165" />
          </label>
          <label class="field"><span>{{ 'dinfo.seriesLabel' | t }}</span>
            <select class="form-control" [ngModel]="series()" (ngModelChange)="series.set($event)">
              <option value="">{{ 'common.all' | t }}</option>
              <option value="I">I</option><option value="II">II</option><option value="III">III</option>
            </select>
          </label>
          <label class="field"><span>{{ 'search.from' | t }}</span>
            <input type="date" class="form-control" [ngModel]="from()" (ngModelChange)="from.set($event)" />
          </label>
          <label class="field"><span>{{ 'search.to' | t }}</span>
            <input type="date" class="form-control" [ngModel]="to()" (ngModelChange)="to.set($event)" />
          </label>
          <label class="field"><span>{{ 'dinfo.descriptors' | t }}</span>
            <select class="form-control" [ngModel]="descriptor()" (ngModelChange)="descriptor.set($event)">
              <option value="">{{ 'common.all' | t }}</option>
              @for (x of descriptors(); track x) { <option [value]="x">{{ x }}</option> }
            </select>
          </label>
          <label class="field"><span>{{ 'search.inForceOn' | t }}</span>
            <input type="date" class="form-control" [ngModel]="inForceOn()" (ngModelChange)="inForceOn.set($event)" />
            <small class="muted">{{ 'search.inForceOnHint' | t }}</small>
          </label>
        </div>
      }

      @if (facets().length > 1) {
        <div class="facets" [attr.aria-label]="'search.area' | t">
          @for (f of facets(); track f.id) {
            <button type="button" class="dinfo-chip" [class.active]="areaId() === f.id" (click)="areaId.set(areaId() === f.id ? '' : f.id)">
              {{ f.name }} <b>{{ f.n }}</b></button>
          }
        </div>
      }

      <div class="row-between">
        <span class="muted">{{ 'search.results' | t: { n: results().length } }}</span>
        <span class="row-gap">
          <select class="form-control form-control-sm" [ngModel]="sort()" (ngModelChange)="sort.set($event)" [attr.aria-label]="'search.sortLabel' | t">
            @for (s of sorts; track s) { <option [value]="s">{{ ('search.sort.' + s) | t }}</option> }
          </select>
          <button type="button" class="btn btn-light btn-sm" (click)="clear()">{{ 'search.clear' | t }}</button>
        </span>
      </div>

      <div class="dip-list">
        @for (r of results(); track r.d.id) {
          <app-diploma-row [d]="r.d" [query]="mode() === 'phrase' ? q() : words()[0] ?? ''" [hint]="hint(r)" />
        } @empty {
          <p class="empty">{{ 'common.noRecords' | t }}</p>
        }
      </div>
      @if (q().trim()) {
        <p class="ask-ai"><i class="fa fa-comments"></i> {{ 'search.askAi' | t }} <a routerLink="/consultor">{{ 'nav.consultant' | t }}</a></p>
      }
    </div>
  `,
})
export class Search {
  protected data = inject(DataService);
  private i18n = inject(I18nService);
  readonly qParam = input<string | undefined>(undefined, { alias: 'q' });

  protected readonly scopes: Scope[] = ['all', 'title', 'text'];
  protected readonly modes: Mode[] = ['all', 'phrase', 'any'];
  protected readonly sorts: Sort[] = ['relevance', 'newest', 'oldest'];
  protected readonly statuses = ['em_vigor', 'alterado', 'revogado'];

  protected q = signal(''); protected year = signal(''); protected type = signal(''); protected number = signal(''); protected areaId = signal('');
  protected scope = signal<Scope>('all'); protected mode = signal<Mode>('all'); protected sort = signal<Sort>('relevance');
  protected adv = signal(false);
  protected issuer = signal(''); protected status = signal(''); protected brNumber = signal(''); protected series = signal('');
  protected from = signal(''); protected to = signal(''); protected descriptor = signal(''); protected inForceOn = signal('');

  private advSignals = [this.issuer, this.status, this.brNumber, this.series, this.from, this.to, this.descriptor, this.inForceOn];
  protected advCount = computed(() => this.advSignals.filter(s => s()).length);

  protected years = computed(() => [...new Set(this.data.diplomas().map(d => d.year))].sort((a, b) => b - a));
  protected types = computed(() => [...new Set(this.data.diplomas().map(d => d.type))].sort());
  protected issuers = computed(() => [...new Set(this.data.diplomas().map(d => d.issuer).filter((x): x is string => !!x))].sort());
  protected descriptors = computed(() => [...new Set(this.data.diplomas().flatMap(d => d.descriptors ?? []))].sort());
  protected words = computed(() => normalize(this.q()).split(/\s+/).filter(w => w.length > 1));

  constructor() {
    effect(() => {
      const v = this.qParam() ?? '';
      this.q.set(v);
      // um descritor clicado na ficha do diploma chega como ?q=…
      if (v && this.descriptors().includes(v)) { this.q.set(''); this.descriptor.set(v); this.adv.set(true); }
    });
  }

  /** Diplomas que passam todos os filtros excepto a área (para as contagens por área). */
  private matched = computed<Result[]>(() => {
    const num = this.number().trim(), br = this.brNumber().trim(), words = this.words(), q = this.q().trim();
    const on = this.inForceOn();
    const out: Result[] = [];
    for (const d of this.data.diplomas()) {
      if (this.year() && d.year !== +this.year()) continue;
      if (this.type() && d.type !== this.type()) continue;
      if (num && !d.number.includes(num)) continue;
      if (this.issuer() && d.issuer !== this.issuer()) continue;
      if (this.status() && d.status !== this.status()) continue;
      if (br && d.br?.number !== br) continue;
      if (this.series() && d.br?.series !== this.series()) continue;
      const pub = d.br?.date ?? d.date;
      if (this.from() && pub < this.from()) continue;
      if (this.to() && pub > this.to()) continue;
      if (this.descriptor() && !(d.descriptors ?? []).includes(this.descriptor())) continue;
      if (on && !this.inForceAt(d, on)) continue;

      let hits = 0, snip = '';
      if (q) {
        const texts = this.texts(d);
        if (this.mode() === 'phrase') {
          for (const t of texts) { const n = findAll(t, q).length; if (n && !snip) snip = snippet(t, q, 50); hits += n; }
          if (!hits) continue;
        } else {
          const per = words.map(w => {
            let n = 0;
            for (const t of texts) { const k = findAll(t, w).length; if (k && !snip) snip = snippet(t, w, 50); n += k; }
            return n;
          });
          const ok = this.mode() === 'all' ? per.every(n => n > 0) : per.some(n => n > 0);
          if (!ok) continue;
          hits = per.reduce((a, b) => a + b, 0);
        }
      }
      out.push({ d, hits, snippet: snip });
    }
    return out;
  });

  protected facets = computed(() => {
    const counts = new Map<string, number>();
    this.matched().forEach(r => counts.set(r.d.areaId, (counts.get(r.d.areaId) ?? 0) + 1));
    return [...counts].map(([id, n]) => ({ id, n, name: this.i18n.loc(this.data.area(id)?.name) })).sort((a, b) => b.n - a.n);
  });

  protected results = computed<Result[]>(() => {
    const list = this.matched().filter(r => !this.areaId() || r.d.areaId === this.areaId());
    const date = (r: Result) => r.d.br?.date ?? r.d.date;
    switch (this.sort()) {
      case 'newest': return list.sort((a, b) => date(b).localeCompare(date(a)));
      case 'oldest': return list.sort((a, b) => date(a).localeCompare(date(b)));
      default: return list.sort((a, b) => b.hits - a.hits || date(b).localeCompare(date(a)));
    }
  });

  private texts(d: Diploma): string[] {
    const head = [d.title, d.heading, d.preamble, ...(d.descriptors ?? [])];
    const body = this.data.articles(d).flatMap(a => [a.heading, ...a.paragraphs]);
    return this.scope() === 'title' ? head : this.scope() === 'text' ? body : [...head, ...body];
  }

  /** Em vigor numa data: já tinha entrado em vigor e não tinha sido revogado. */
  private inForceAt(d: Diploma, on: string): boolean {
    if ((d.inForce ?? d.date) > on) return false;
    if (d.revokedBy) {
      const r = this.data.diploma(d.revokedBy);
      if (r && (r.inForce ?? r.date) <= on) return false;
    }
    return true;
  }

  hint(r: Result): string {
    const d = r.d, meta = [d.br ? `${d.br.gazette} n.º ${d.br.number}, ${d.br.series} Série` : '', d.issuer ?? ''].filter(Boolean).join(' · ');
    const hits = r.hits ? `${this.i18n.t('search.hits', { n: r.hits })} — ${r.snippet}` : '';
    return [meta, hits].filter(Boolean).join('\n');
  }

  clear() {
    [this.q, this.year, this.type, this.number, this.areaId, ...this.advSignals].forEach(s => s.set(''));
    this.scope.set('all'); this.mode.set('all'); this.sort.set('relevance');
  }
}
