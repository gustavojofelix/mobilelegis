import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { CaseLaw } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { findAll, highlight, normalize } from '../core/text';
import { PageTitle } from '../shared/page-title';

/** Lista de jurisprudência: pesquisa por palavras, tribunal, tipo, sentido da decisão, ano, área e norma aplicada. */
@Component({
  selector: 'app-jurisprudence',
  imports: [FormsModule, RouterLink, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'case.title' | t" icon="gavel" />
    <div class="container narrow">
      <p class="notice demo-note"><i class="fa fa-info-circle"></i> {{ 'case.demoNote' | t }}</p>
      <div class="form-grid filters">
        <label class="field span-2"><span>{{ 'search.keywords' | t }}</span>
          <input type="search" class="form-control" [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="'case.searchPh' | t" />
        </label>
        <label class="field"><span>{{ 'case.court' | t }}</span>
          <select class="form-control" [ngModel]="court()" (ngModelChange)="court.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (c of courts(); track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </label>
        <label class="field"><span>{{ 'case.kind' | t }}</span>
          <select class="form-control" [ngModel]="kind()" (ngModelChange)="kind.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (c of kinds(); track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </label>
        <label class="field"><span>{{ 'case.decision' | t }}</span>
          <select class="form-control" [ngModel]="decision()" (ngModelChange)="decision.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (c of decisions; track c) { <option [value]="c">{{ ('case.dec.' + c) | t }}</option> }
          </select>
        </label>
        <label class="field"><span>{{ 'search.year' | t }}</span>
          <select class="form-control" [ngModel]="year()" (ngModelChange)="year.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (y of years(); track y) { <option [value]="y">{{ y }}</option> }
          </select>
        </label>
        <label class="field span-2"><span>{{ 'search.area' | t }}</span>
          <select class="form-control" [ngModel]="areaId()" (ngModelChange)="areaId.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (a of data.areas(); track a.id) { <option [value]="a.id">{{ a.name | loc }}</option> }
          </select>
        </label>
      </div>
      @if (norm(); as n) {
        <p class="filter-chip-row"><span class="dinfo-chip active">{{ 'case.appliesNorm' | t }}: {{ normText() }}
          <button type="button" class="linklike" (click)="norm.set('')" [attr.aria-label]="'common.close' | t"><i class="fa fa-times"></i></button></span></p>
      }
      <div class="row-between"><span class="muted">{{ 'search.results' | t: { n: list().length } }}</span>
        <button type="button" class="btn btn-light btn-sm" (click)="clear()">{{ 'search.clear' | t }}</button></div>

      <div class="case-list">
        @for (c of list(); track c.id) {
          <a class="case-card" [routerLink]="['/jurisprudencia', c.id]">
            <span class="case-top"><b>{{ c.court }}</b> · {{ c.chamber }}</span>
            <span class="case-title">{{ c.kind }} n.º {{ c.number }} <span class="muted">· {{ c.date | dt }}</span>
              <span class="tag" [class]="'tag-dec-' + c.decision">{{ ('case.dec.' + c.decision) | t }}</span></span>
            <span class="case-sum" [innerHTML]="hl(c.summary)"></span>
            <span class="dinfo-chips">@for (k of c.keywords; track k) { <span class="dinfo-chip">{{ k }}</span> }</span>
          </a>
        } @empty { <p class="empty">{{ 'common.noRecords' | t }}</p> }
      </div>
    </div>
  `,
})
export class Jurisprudence {
  protected data = inject(DataService);
  readonly normaParam = input<string | undefined>(undefined, { alias: 'norma' });
  readonly qParam = input<string | undefined>(undefined, { alias: 'q' });
  protected readonly decisions = ['procedente', 'parcial', 'improcedente', 'negado'];
  protected q = signal(''); protected court = signal(''); protected kind = signal(''); protected decision = signal('');
  protected year = signal(''); protected areaId = signal(''); protected norm = signal('');

  protected courts = computed(() => [...new Set(this.data.cases().map(c => c.court))].sort());
  protected kinds = computed(() => [...new Set(this.data.cases().map(c => c.kind))].sort());
  protected years = computed(() => [...new Set(this.data.cases().map(c => c.date.slice(0, 4)))].sort().reverse());
  protected normText = computed(() => {
    const [diplomaId, articleId] = this.norm().split('#');
    return articleId ? this.data.normLabel({ diplomaId, articleId }) : this.data.diploma(diplomaId)?.heading ?? diplomaId;
  });

  constructor() {
    effect(() => this.norm.set(this.normaParam() ?? ''));
    effect(() => this.q.set(this.qParam() ?? ''));
  }

  protected list = computed<CaseLaw[]>(() => {
    const words = normalize(this.q()).split(/\s+/).filter(w => w.length > 1);
    const [nd, na] = this.norm().split('#');
    return this.data.cases().filter(c => {
      if (this.court() && c.court !== this.court()) return false;
      if (this.kind() && c.kind !== this.kind()) return false;
      if (this.decision() && c.decision !== this.decision()) return false;
      if (this.year() && !c.date.startsWith(this.year())) return false;
      if (this.areaId() && c.areaId !== this.areaId()) return false;
      if (nd && !c.norms.some(n => n.diplomaId === nd && (!na || n.articleId === na))) return false;
      if (words.length) {
        const hay = normalize([c.court, c.chamber, c.kind, c.number, c.process, c.summary, ...c.keywords, ...c.text].join(' '));
        if (!words.every(w => hay.includes(w))) return false;
      }
      return true;
    });
  });

  hl(text: string) {
    const w = normalize(this.q()).split(/\s+/).find(x => x.length > 1 && findAll(text, x).length);
    return highlight(text, w ?? '');
  }
  clear() { [this.q, this.court, this.kind, this.decision, this.year, this.areaId, this.norm].forEach(s => s.set('')); }
}

/** Detalhe de uma decisão, com as normas aplicadas ligadas aos artigos da plataforma. */
@Component({
  selector: 'app-case-view',
  imports: [RouterLink, ...I18N_PIPES],
  template: `
    @if (c(); as c) {
      <div class="container narrow viewer">
        <div class="viewer-top"><a routerLink="/jurisprudencia" class="back-btn"><i class="fa fa-arrow-left"></i> {{ 'case.title' | t }}</a></div>
        <p class="notice demo-note"><i class="fa fa-info-circle"></i> {{ 'case.demoNote' | t }}</p>
        <header class="case-head">
          <p class="case-top"><b>{{ c.court }}</b> · {{ c.chamber }}</p>
          <h1>{{ c.kind }} n.º {{ c.number }}</h1>
          <p class="muted">{{ c.process }} · {{ c.date | dt }}
            <span class="tag" [class]="'tag-dec-' + c.decision">{{ ('case.dec.' + c.decision) | t }}</span></p>
          <p class="dinfo-chips">@for (k of c.keywords; track k) { <a class="dinfo-chip" [routerLink]="['/jurisprudencia']" [queryParams]="{ q: k }">{{ k }}</a> }</p>
        </header>
        <section class="case-summary"><p class="panel-title">{{ 'case.summary' | t }}</p><p>{{ c.summary }}</p></section>
        <section class="legal-text case-text">
          @for (p of c.text; track $index) { <p class="lt-p">{{ p }}</p> }
        </section>
        <section class="panel">
          <p class="panel-title"><i class="fa fa-book"></i> {{ 'case.norms' | t }}</p>
          <ul class="dinfo-rel tight">
            @for (n of c.norms; track $index) {
              <li>@if (data.diploma(n.diplomaId)) { <a [routerLink]="['/diploma', n.diplomaId]" [fragment]="n.articleId">{{ data.normLabel(n) }}</a> } @else { {{ data.normLabel(n) }} }</li>
            }
          </ul>
        </section>
        @if (related().length) {
          <section class="panel">
            <p class="panel-title"><i class="fa fa-link"></i> {{ 'case.related' | t }}</p>
            <ul class="dinfo-rel tight">
              @for (r of related(); track r.id) { <li><a [routerLink]="['/jurisprudencia', r.id]">{{ r.kind }} n.º {{ r.number }} — {{ r.court }}</a> <span class="small muted d-block">{{ r.summary }}</span></li> }
            </ul>
          </section>
        }
      </div>
    } @else { <div class="container narrow"><p class="empty">{{ 'common.noRecords' | t }}</p></div> }
  `,
})
export class CaseView {
  protected data = inject(DataService);
  readonly id = input.required<string>();
  protected c = computed(() => this.data.caseLaw(this.id()));
  protected related = computed(() => {
    const c = this.c();
    if (!c) return [];
    const ds = new Set(c.norms.map(n => n.diplomaId));
    return this.data.cases().filter(x => x.id !== c.id && x.norms.some(n => ds.has(n.diplomaId))).slice(0, 4);
  });
}
