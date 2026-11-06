import { Component, DestroyRef, HostListener, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18N_PIPES } from '../../core/pipes';
import { BoDoc, Doubt, Issue } from '../bo.models';
import { BoService } from '../bo.service';
import { QualityMeter } from './quality-meter';

type Tab = 'lupa' | 'structure' | 'pages';

@Component({
  selector: 'bo-step-read',
  imports: [FormsModule, QualityMeter, ...I18N_PIPES],
  template: `
    @if (!bo.state().readDone) {
      <!-- Leitura em curso -->
      <section class="card bo-reading">
        <div class="bo-reading-head">
          <div class="bo-ai-orb"><i class="fa fa-bolt"></i></div>
          <div>
            <h2>{{ 'bo.read.running' | t }}</h2>
            <p class="muted">{{ phases[phase()] | t }}</p>
          </div>
          <b class="bo-reading-pct">{{ pct() }}%</b>
        </div>
        <div class="bo-bar big"><span [style.width.%]="pct()"></span></div>
        <div class="bo-reading-docs">
          @for (d of docs(); track d.id; let i = $index) {
            <div class="bo-reading-doc" [class.done]="docPct(i) >= 100" [class.active]="docPct(i) > 0 && docPct(i) < 100">
              <div class="bo-paper-thumb"><span class="scanline"></span>
                @for (l of [1, 2, 3, 4, 5, 6, 7]; track l) { <i></i> }</div>
              <div>
                <b>{{ d.title }}</b>
                <p class="small muted">{{ d.pages }} {{ 'bo.upload.pages' | t }} · <bo-quality [quality]="d.quality" [score]="d.score" /></p>
                <div class="bo-bar"><span [style.width.%]="docPct(i)"></span></div>
              </div>
            </div>
          }
        </div>
      </section>
    } @else {
      <!-- Resumo -->
      <div class="bo-summary">
        <div><b>{{ totalPages() }}</b><span>{{ 'bo.read.pagesRead' | t }}</span></div>
        <div><b>{{ k().doubts.length }}</b><span>{{ 'bo.read.doubts' | t }}</span></div>
        <div><b>{{ manualIssues().length }}</b><span>{{ 'bo.read.structure' | t }}</span></div>
        <div><b>{{ autoIssues().length }}</b><span>{{ 'bo.read.autoFixed' | t }}</span></div>
        <div><b>§ / n.º</b><span>{{ 'bo.read.paragraphs' | t }}</span></div>
      </div>

      <div class="tabs bo-tabs" role="tablist">
        <button type="button" class="tab" [class.active]="tab() === 'lupa'" (click)="tab.set('lupa')"><i class="fa fa-search-plus"></i> {{ 'bo.read.lupa' | t }} <span class="bo-count">{{ c().doubts.done }}/{{ c().doubts.total }}</span></button>
        <button type="button" class="tab" [class.active]="tab() === 'structure'" (click)="tab.set('structure')"><i class="fa fa-sitemap"></i> {{ 'bo.read.structureTab' | t }} <span class="bo-count">{{ c().issues.done }}/{{ c().issues.total }}</span></button>
        <button type="button" class="tab" [class.active]="tab() === 'pages'" (click)="tab.set('pages')"><i class="fa fa-th"></i> {{ 'bo.read.pagesTab' | t }}</button>
      </div>

      @switch (tab()) {
        @case ('lupa') {
          @if (current(); as d) {
            <section class="card bo-lupa">
              <div class="row-between bo-lupa-head">
                <span><b>{{ 'bo.read.doubt' | t }} {{ index() + 1 }}</b> <span class="muted">/ {{ k().doubts.length }}</span>
                  · {{ 'diploma.article' | t }} {{ d.art }} · {{ 'bo.read.page' | t }} {{ d.page }}</span>
                <span class="bo-conf" [class.low]="d.conf < 60"><i class="fa fa-tachometer"></i> {{ d.conf }}%</span>
              </div>

              <p class="bo-label">{{ 'bo.read.onImage' | t }}</p>
              <div class="bo-scan">{{ d.before }} <mark>{{ d.right }}</mark> {{ d.after }}</div>
              <p class="bo-label">{{ 'bo.read.readAs' | t }}</p>
              <div class="bo-ocr">{{ d.before }} <mark class="wrong">{{ d.wrong }}</mark> {{ d.after }}</div>
              <p class="small muted bo-why"><i class="fa fa-lightbulb-o"></i> {{ d.why }}</p>

              @if (editing()) {
                <div class="bo-edit-row">
                  <input class="form-control" [(ngModel)]="custom" (keydown.enter)="saveCustom(d); $event.stopPropagation()" autofocus />
                  <button type="button" class="btn btn-yellow btn-sm" (click)="saveCustom(d)">{{ 'common.save' | t }}</button>
                  <button type="button" class="btn btn-light btn-sm" (click)="editing.set(false)">{{ 'common.cancel' | t }}</button>
                </div>
              } @else {
                <div class="bo-lupa-actions">
                  <button type="button" class="btn btn-yellow" [class.chosen]="dec(d.id) === 'accept'" (click)="decide(d, 'accept')"><i class="fa fa-check"></i> «{{ d.right }}» <kbd>Enter</kbd></button>
                  <button type="button" class="btn btn-light" [class.chosen]="dec(d.id) === 'keep'" (click)="decide(d, 'keep')">{{ 'bo.read.keep' | t }} <kbd>K</kbd></button>
                  <button type="button" class="btn btn-light" [class.chosen]="dec(d.id) === 'custom'" (click)="startEdit(d)"><i class="fa fa-pencil"></i> {{ 'bo.read.write' | t }} <kbd>E</kbd></button>
                </div>
              }
              <div class="row-between bo-lupa-nav">
                <button type="button" class="link-btn" (click)="move(-1)" [disabled]="index() === 0"><i class="fa fa-angle-left"></i> {{ 'diploma.prev' | t }}</button>
                <button type="button" class="link-btn small" (click)="bo.acceptAllSuggestions()"><i class="fa fa-check-square-o"></i> {{ 'bo.read.acceptAll' | t }}</button>
                <button type="button" class="link-btn" (click)="move(1)" [disabled]="index() === k().doubts.length - 1">{{ 'diploma.next' | t }} <i class="fa fa-angle-right"></i></button>
              </div>
            </section>

            <div class="bo-chips">
              @for (x of k().doubts; track x.id; let i = $index) {
                <button type="button" class="bo-chip" [class.active]="i === index()" [attr.data-dec]="dec(x.id)" (click)="index.set(i)" [title]="x.wrong + ' → ' + x.right">{{ x.art.split(',')[0] }}</button>
              }
            </div>
          }
        }

        @case ('structure') {
          <section class="bo-issues">
            @for (i of k().issues; track i.id) {
              <article class="card bo-issue" [attr.data-sev]="i.severity" [class.resolved]="bo.state().issues[i.id]">
                <div class="bo-issue-head">
                  <span class="bo-sev" [attr.data-sev]="i.severity">{{ ('bo.sev.' + i.severity) | t }}</span>
                  <b>{{ i.title }}</b>
                  <span class="small muted">{{ docTitle(i.doc) }} · {{ i.art }}</span>
                  @if (i.auto) { <span class="bo-pill pill-ai"><i class="fa fa-bolt"></i> {{ 'bo.read.byAi' | t }}</span> }
                </div>
                <p class="small">{{ i.detail }}</p>
                <div class="bo-choices">
                  @for (ch of i.choices; track ch.id) {
                    <button type="button" class="btn btn-sm" [class.btn-yellow]="bo.state().issues[i.id] === ch.id" [class.btn-light]="bo.state().issues[i.id] !== ch.id" (click)="bo.decideIssue(i.id, ch.id)">
                      @if (bo.state().issues[i.id] === ch.id) { <i class="fa fa-check"></i> } {{ ch.label }}</button>
                  }
                </div>
              </article>
            }
          </section>
        }

        @case ('pages') {
          <section class="card">
            <p class="small muted">{{ 'bo.read.pagesHint' | t }}</p>
            @for (d of docs(); track d.id) {
              <div class="bo-heat-row">
                <div class="bo-heat-title"><b>{{ d.title }}</b> <bo-quality [quality]="d.quality" [score]="d.score" /></div>
                <div class="bo-heat">
                  @for (p of heat(d); track $index) { <span [attr.data-h]="p" [title]="('bo.read.page' | t) + ' ' + ($index + 1)"></span> }
                </div>
              </div>
            }
            <div class="bo-legend small"><span data-h="ok"></span> {{ 'bo.read.hOk' | t }} <span data-h="warn"></span> {{ 'bo.read.hWarn' | t }} <span data-h="bad"></span> {{ 'bo.read.hBad' | t }}</div>
          </section>
        }
      }

      <div class="bo-step-foot">
        <span class="small muted">{{ remaining() ? (('bo.read.remaining' | t: { n: remaining() })) : ('bo.read.allDone' | t) }}</span>
        <button type="button" class="btn btn-yellow" [disabled]="remaining() > 0" (click)="next.emit()">{{ 'bo.read.next' | t }} <i class="fa fa-angle-right"></i></button>
      </div>
    }
  `,
})
export class StepRead {
  protected bo = inject(BoService);
  readonly next = output<void>();
  protected k = computed(() => this.bo.case()!);
  protected c = computed(() => this.bo.counts()!);
  protected docs = computed(() => this.bo.attachedDocs().filter(d => d.role !== 'manual').sort((a, b) => a.date.localeCompare(b.date)));
  protected totalPages = computed(() => this.docs().reduce((n, d) => n + d.pages, 0));
  protected manualIssues = computed(() => this.k().issues.filter(i => !i.auto));
  protected autoIssues = computed(() => this.k().issues.filter(i => i.auto));
  protected remaining = computed(() => (this.c().doubts.total - this.c().doubts.done) + (this.c().issues.total - this.c().issues.done));

  protected tab = signal<Tab>('lupa');
  protected index = signal(0);
  protected current = computed<Doubt | undefined>(() => this.k().doubts[this.index()]);
  protected editing = signal(false);
  protected custom = '';

  // Simulação da leitura
  protected pct = signal(0);
  protected phase = signal(0);
  protected phases = ['bo.read.ph1', 'bo.read.ph2', 'bo.read.ph3', 'bo.read.ph4', 'bo.read.ph5', 'bo.read.ph6'];

  constructor() {
    const first = this.k().doubts.findIndex(d => !this.bo.state().doubts[d.id]);
    this.index.set(first < 0 ? 0 : first);
    if (!this.bo.state().readDone) {
      const timer = setInterval(() => {
        this.pct.update(p => Math.min(100, p + 1));
        this.phase.set(Math.min(this.phases.length - 1, Math.floor(this.pct() / (100 / this.phases.length))));
        if (this.pct() >= 100) { clearInterval(timer); setTimeout(() => this.bo.finishReading(), 400); }
      }, 60);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  /** Progresso de cada documento, distribuído pelo total de páginas (o original demora mais). */
  docPct(i: number): number {
    const docs = this.docs(), total = this.totalPages();
    const start = docs.slice(0, i).reduce((n, d) => n + d.pages, 0) / total * 100;
    const size = docs[i].pages / total * 100;
    return Math.max(0, Math.min(100, (this.pct() - start) / size * 100));
  }

  docTitle(id: string) { return this.bo.doc(id)?.title ?? id; }
  dec(id: string) { return this.bo.state().doubts[id]?.choice; }

  decide(d: Doubt, choice: 'accept' | 'keep') {
    this.bo.decideDoubt(d.id, choice);
    this.advance();
  }
  startEdit(d: Doubt) { this.custom = this.bo.state().doubts[d.id]?.value ?? d.right; this.editing.set(true); }
  saveCustom(d: Doubt) {
    this.bo.decideDoubt(d.id, 'custom', this.custom.trim() || d.right);
    this.editing.set(false);
    this.advance();
  }
  move(step: number) { this.index.update(i => Math.max(0, Math.min(this.k().doubts.length - 1, i + step))); }

  /** Vai para a próxima dúvida por decidir. */
  private advance() {
    const list = this.k().doubts, s = this.bo.state().doubts;
    const nextOpen = list.findIndex((d, i) => i > this.index() && !s[d.id]);
    const anyOpen = list.findIndex(d => !s[d.id]);
    const target = nextOpen >= 0 ? nextOpen : anyOpen;
    if (target >= 0) this.index.set(target);
    else if (this.c().issues.done < this.c().issues.total) setTimeout(() => this.tab.set('structure'), 350);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (this.tab() !== 'lupa' || this.editing() || !this.bo.state().readDone) return;
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    const d = this.current(); if (!d) return;
    if (e.key === 'Enter') { e.preventDefault(); this.decide(d, 'accept'); }
    else if (e.key.toLowerCase() === 'k') this.decide(d, 'keep');
    else if (e.key.toLowerCase() === 'e') { e.preventDefault(); this.startEdit(d); }
    else if (e.key === 'ArrowRight') this.move(1);
    else if (e.key === 'ArrowLeft') this.move(-1);
  }

  /** Mapa de confiança por página (determinístico a partir da qualidade e das dúvidas). */
  heat(d: BoDoc): ('ok' | 'warn' | 'bad')[] {
    const doubtPages = new Map<number, number>();
    for (const x of this.k().doubts.filter(x => x.doc === d.id)) doubtPages.set(x.page, Math.min(doubtPages.get(x.page) ?? 100, x.conf));
    return Array.from({ length: d.pages }, (_, i) => {
      const p = i + 1, conf = doubtPages.get(p);
      if (conf !== undefined) return conf < 60 ? 'bad' : 'warn';
      const r = ((p * 9301 + d.score * 49297) % 233280) / 233280;
      return r * 100 > d.score + 35 ? 'warn' : 'ok';
    });
  }
}
