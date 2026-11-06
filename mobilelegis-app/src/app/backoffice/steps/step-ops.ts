import { Component, HostListener, computed, inject, output, signal } from '@angular/core';
import { I18N_PIPES } from '../../core/pipes';
import { escapeHtml } from '../../core/text';
import { CodeArticle, Operation, Warning } from '../bo.models';
import { BoService } from '../bo.service';

type Sel = { type: 'op'; id: string } | { type: 'warn'; id: string };

@Component({
  selector: 'bo-step-ops',
  imports: [...I18N_PIPES],
  template: `
    <div class="bo-ops">
      <!-- Lista de alterações -->
      <aside class="card bo-ops-list">
        <h3 class="bo-h3">{{ 'bo.ops.detected' | t }}</h3>
        @for (g of groups(); track g.doc.id) {
          <div class="bo-ops-group">
            <div class="bo-ops-doc"><span class="bo-tl-mini">{{ g.doc.date.slice(0, 4) }}</span><b>{{ g.doc.title }}</b></div>
            @for (o of g.ops; track o.id) {
              <button type="button" class="bo-ops-item" [class.active]="isSel('op', o.id)" (click)="sel.set({ type: 'op', id: o.id })">
                <i class="fa" [class.fa-circle-o]="!status(o.id)" [class.fa-check-circle]="status(o.id) === 'approved'" [class.fa-times-circle]="status(o.id) === 'rejected'" [attr.data-st]="status(o.id)"></i>
                <span><b>{{ (o.kind === 'substitute' ? 'bo.ops.substitute' : 'bo.ops.revoke') | t }}</b> {{ o.targetLabel }}</span>
              </button>
            }
            @for (w of g.warnings; track w.id) {
              <button type="button" class="bo-ops-item warn" [class.active]="isSel('warn', w.id)" (click)="sel.set({ type: 'warn', id: w.id })">
                <i class="fa" [class.fa-exclamation-triangle]="!bo.state().warnings[w.id]" [class.fa-check]="bo.state().warnings[w.id]" [attr.data-sev]="w.severity"></i>
                <span>{{ w.title }}</span>
              </button>
            }
          </div>
        }
      </aside>

      <!-- Detalhe -->
      <section class="card bo-ops-detail">
        @if (op(); as o) {
          <div class="row-between">
            <span class="small muted">{{ docOf(o.doc)?.title }} · {{ o.ref }} · {{ 'bo.read.page' | t }} {{ o.page }}</span>
            @if (bo.fileUrls()[o.doc]; as url) { <a class="link-btn small" [href]="url + '#page=' + o.page" target="_blank" rel="noopener"><i class="fa fa-file-pdf-o"></i> {{ 'bo.ops.openPdf' | t }}</a> }
          </div>
          <div class="bo-paper">
            <p class="bo-paper-ctx">{{ o.before }}</p>
            <p class="bo-paper-quote" [innerHTML]="quote(o)"></p>
            <p class="bo-paper-ctx">{{ o.after }}</p>
          </div>

          <div class="bo-op-struct">
            <div><span class="bo-label">{{ 'bo.ops.action' | t }}</span>
              <span class="bo-pill" [class.pill-red]="o.kind === 'revoke'" [class.pill-green]="o.kind === 'substitute'">{{ (o.kind === 'substitute' ? 'bo.ops.substitute' : 'bo.ops.revoke') | t }}</span></div>
            <div><span class="bo-label">{{ 'bo.ops.target' | t }}</span><b>{{ o.targetLabel }}</b></div>
            <div><span class="bo-label">{{ 'bo.ops.confidence' | t }}</span>
              <span class="bo-confbar"><span [style.width.%]="o.conf"></span></span> <b>{{ o.conf }}%</b></div>
          </div>
          @if (o.hint) { <div class="notice"><i class="fa fa-info-circle"></i> {{ o.hint }}</div> }
          @if (o.newUnits) {
            <p class="bo-label">{{ 'bo.ops.newText' | t }}</p>
            <div class="bo-newtext">@for (u of o.newUnits; track u.id) { <p><b>{{ u.label }}</b> {{ u.text }}</p> }</div>
          }
          <div class="bo-lupa-actions">
            <button type="button" class="btn btn-yellow" [class.chosen]="status(o.id) === 'approved'" (click)="decide(o, 'approved')"><i class="fa fa-check"></i> {{ 'bo.ops.approve' | t }} <kbd>A</kbd></button>
            <button type="button" class="btn btn-light" [class.chosen]="status(o.id) === 'rejected'" (click)="decide(o, 'rejected')"><i class="fa fa-times"></i> {{ 'bo.ops.reject' | t }} <kbd>R</kbd></button>
          </div>
        } @else if (warn(); as w) {
          <div class="bo-issue-head">
            <span class="bo-sev" [attr.data-sev]="w.severity">{{ ('bo.sev.' + w.severity) | t }}</span>
            <b>{{ w.title }}</b><span class="small muted">{{ docOf(w.doc)?.title }}</span>
          </div>
          <p>{{ w.detail }}</p>
          <div class="bo-choices">
            @for (ch of w.choices; track ch.id) {
              <button type="button" class="btn btn-sm" [class.btn-yellow]="bo.state().warnings[w.id] === ch.id" [class.btn-light]="bo.state().warnings[w.id] !== ch.id" (click)="decideWarning(w, ch.id)">
                @if (bo.state().warnings[w.id] === ch.id) { <i class="fa fa-check"></i> } {{ ch.label }}</button>
            }
          </div>
        }
      </section>

      <!-- Artigo alvo -->
      <aside class="card bo-ops-target">
        <h3 class="bo-h3">{{ 'bo.ops.inCode' | t }}</h3>
        @if (targetArticle(); as a) {
          <p class="art-num">{{ 'diploma.article' | t }} {{ a.n }}.º</p>
          @for (u of a.units; track u.id) {
            <p class="bo-unit" [class.bo-target]="isTarget(u.id)"><b>{{ u.label }}</b> {{ u.text }}</p>
          }
        } @else {
          <p class="small muted">{{ 'bo.ops.affected' | t }}</p>
          <ul class="bo-affected">
            @for (o of docOps(); track o.id) { <li>{{ o.targetLabel }}</li> } @empty { <li class="muted">—</li> }
          </ul>
        }
      </aside>
    </div>

    <div class="bo-step-foot">
      <span class="small muted">{{ remaining() ? ('bo.ops.remaining' | t: { n: remaining() }) : ('bo.read.allDone' | t) }}</span>
      <button type="button" class="btn btn-yellow" [disabled]="remaining() > 0" (click)="next.emit()">{{ 'bo.ops.next' | t }} <i class="fa fa-angle-right"></i></button>
    </div>
  `,
})
export class StepOps {
  protected bo = inject(BoService);
  readonly next = output<void>();
  private k = computed(() => this.bo.case()!);

  protected groups = computed(() => this.bo.timeline().filter(d => d.role === 'amendment').map(doc => ({
    doc, ops: this.k().ops.filter(o => o.doc === doc.id), warnings: this.k().warnings.filter(w => w.doc === doc.id),
  })));

  /** Ordem de navegação: operações e avisos de cada diploma. */
  private order = computed<Sel[]>(() => this.groups().flatMap(g => [
    ...g.ops.map(o => ({ type: 'op' as const, id: o.id })), ...g.warnings.map(w => ({ type: 'warn' as const, id: w.id })),
  ]));

  protected sel = signal<Sel>({ type: 'op', id: 'op1' });
  protected op = computed<Operation | undefined>(() => { const s = this.sel(); return s.type === 'op' ? this.k().ops.find(o => o.id === s.id) : undefined; });
  protected warn = computed<Warning | undefined>(() => { const s = this.sel(); return s.type === 'warn' ? this.k().warnings.find(w => w.id === s.id) : undefined; });
  protected selDoc = computed(() => this.op()?.doc ?? this.warn()?.doc);
  protected docOps = computed(() => this.k().ops.filter(o => o.doc === this.selDoc()));

  protected targetArticle = computed<CodeArticle | undefined>(() => {
    const o = this.op();
    return o ? this.bo.fixedArticles().find(a => a.k === o.target.art) : undefined;
  });

  protected remaining = computed(() => {
    const c = this.bo.counts()!;
    return (c.ops.total - c.ops.done) + (c.warnings.total - c.warnings.done);
  });

  constructor() {
    const s = this.bo.state();
    const first = this.order().find(x => x.type === 'op' ? !s.ops[x.id] : !s.warnings[x.id]);
    if (first) this.sel.set(first);
  }

  isSel(type: Sel['type'], id: string) { const s = this.sel(); return s.type === type && s.id === id; }
  status(id: string) { return this.bo.state().ops[id]; }
  docOf(id: string) { return this.bo.doc(id); }
  isTarget(unitId: string) { const o = this.op(); return !!o && (!o.target.unit || o.target.unit === unitId); }

  quote(o: Operation): string {
    const q = escapeHtml(o.quote), h = escapeHtml(o.hl);
    return q.replace(h, `<mark>${h}</mark>`);
  }

  decide(o: Operation, st: 'approved' | 'rejected') { this.bo.decideOp(o.id, st); this.advance(); }
  decideWarning(w: Warning, choice: string) { this.bo.decideWarning(w.id, choice); this.advance(); }

  private advance() {
    const s = this.bo.state(), list = this.order();
    const cur = list.findIndex(x => this.isSel(x.type, x.id));
    const open = (x: Sel) => x.type === 'op' ? !s.ops[x.id] : !s.warnings[x.id];
    const nxt = list.slice(cur + 1).find(open) ?? list.find(open);
    if (nxt) setTimeout(() => this.sel.set(nxt), 250);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    const o = this.op();
    if (o && e.key.toLowerCase() === 'a') this.decide(o, 'approved');
    else if (o && e.key.toLowerCase() === 'r') this.decide(o, 'rejected');
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = this.order(), cur = list.findIndex(x => this.isSel(x.type, x.id));
      const n = list[Math.max(0, Math.min(list.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (n) this.sel.set(n);
    }
  }
}
