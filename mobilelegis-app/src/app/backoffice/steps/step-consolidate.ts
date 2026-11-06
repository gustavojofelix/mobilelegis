import { Component, computed, inject, output, signal } from '@angular/core';
import { I18N_PIPES } from '../../core/pipes';
import { ArticleView } from '../bo.models';
import { BoService } from '../bo.service';

type Mode = 'final' | 'marks' | 'side';

@Component({
  selector: 'bo-step-consolidate',
  imports: [...I18N_PIPES],
  template: `
    <section class="card bo-machine">
      <div class="row-between">
        <h3 class="bo-h3"><i class="fa fa-history"></i> {{ 'bo.cons.machine' | t }}</h3>
        <span class="small muted">{{ 'bo.cons.machineHint' | t }}</span>
      </div>
      <div class="bo-slider">
        <input type="range" min="0" [max]="stops().length - 1" step="1" [value]="at()" (input)="at.set(+$any($event.target).value)" aria-label="Data" />
        <div class="bo-slider-stops">
          @for (s of stops(); track s.id; let i = $index) {
            <button type="button" [class.on]="i <= at()" [class.current]="i === at()" (click)="at.set(i)">
              <b>{{ s.date.slice(0, 4) }}</b><span>{{ s.title }}</span></button>
          }
        </div>
      </div>
    </section>

    <div class="bo-cons-bar">
      <div class="bo-seg" role="group">
        <button type="button" [class.on]="mode() === 'final'" (click)="mode.set('final')">{{ 'bo.cons.final' | t }}</button>
        <button type="button" [class.on]="mode() === 'marks'" (click)="mode.set('marks')">{{ 'bo.cons.marks' | t }}</button>
        <button type="button" [class.on]="mode() === 'side'" (click)="mode.set('side')">{{ 'bo.cons.side' | t }}</button>
      </div>
      <label class="check"><input type="checkbox" [checked]="onlyChanged()" (change)="onlyChanged.set($any($event.target).checked)" /> {{ 'bo.cons.onlyChanged' | t }}</label>
    </div>

    @if (rejected()) { <div class="notice notice-danger"><i class="fa fa-exclamation-triangle"></i> {{ 'bo.cons.rejected' | t: { n: rejected() } }}</div> }

    <div class="bo-cons" [class.with-audit]="bo.hasManual()">
      <section class="card bo-cons-text">
        <p class="small muted">{{ bo.case()?.excerptNote }}</p>
        <div class="legal-text" [class.bo-side-by-side]="mode() === 'side'">
          @for (v of shown(); track v.k; let i = $index) {
            @if (i === 0 || shown()[i - 1].section !== v.section) { <p class="lt-section">{{ v.section }}</p> }
            @if (mode() === 'side') {
              <div class="bo-side-row">
                <div class="bo-side-col"><span class="bo-side-tag">{{ stops()[0].date.slice(0, 4) }}</span>
                  <p class="art-num">{{ 'diploma.article' | t }} {{ v.n }}.º</p>
                  @for (u of original(v.k); track u.id) { <p class="lt-p"><b>{{ u.label }}</b> {{ u.text }}</p> }
                </div>
                <div class="bo-side-col"><span class="bo-side-tag">{{ stops()[at()].date.slice(0, 4) }}</span>
                  <p class="art-num">{{ 'diploma.article' | t }} {{ v.n }}.º</p>
                  @if (v.revoked) { <p class="lt-p bo-revoked-art">(Revogado.)</p> }
                  @else { @for (u of v.units; track u.id) { <p class="lt-p" [class.bo-new]="u.state === 'new'"><b>{{ u.label }}</b> {{ u.state === 'revoked' ? '(Revogado.)' : u.text }}</p> } }
                  @for (n of notesOf(v); track n) { <p class="art-note">[{{ n }}]</p> }
                </div>
              </div>
            } @else {
              <div class="art bo-art" [class.bo-art-changed]="v.changed">
                <p class="art-num">{{ 'diploma.article' | t }} {{ v.n }}.º</p>
                @if (mode() === 'marks') {
                  @for (u of v.previous ?? []; track u.id) { <p class="lt-p bo-del"><b>{{ u.label }}</b> {{ u.text }}</p> }
                  @for (u of v.units; track u.id) {
                    <p class="lt-p" [class.bo-del]="u.state === 'revoked'" [class.bo-new]="u.state === 'new'"><b>{{ u.label }}</b> {{ u.text }}</p>
                  }
                } @else {
                  @if (v.revoked) { <p class="lt-p">(Revogado.)</p> }
                  @else { @for (u of v.units; track u.id) { <p class="lt-p"><b>{{ u.label }}</b> {{ u.state === 'revoked' ? '(Revogado.)' : u.text }}</p> } }
                }
                @for (n of notesOf(v); track n) { <p class="art-note">[{{ n }}]</p> }
              </div>
            }
          }
        </div>
      </section>

      @if (bo.hasManual()) {
        <aside class="card bo-audit">
          <h3 class="bo-h3"><i class="fa fa-balance-scale"></i> {{ 'bo.cons.audit' | t }}</h3>
          <p class="small muted">{{ 'bo.cons.auditText' | t: { n: bo.case()?.audit?.length ?? 0 } }}</p>
          @for (a of bo.case()?.audit ?? []; track a.title) {
            <div class="bo-audit-item" [attr.data-sev]="a.severity">
              <span class="bo-sev" [attr.data-sev]="a.severity">{{ ('bo.sev.' + a.severity) | t }}</span>
              <b>{{ a.where }} — {{ a.title }}</b>
              <p class="small">{{ a.detail }}</p>
            </div>
          }
        </aside>
      }
    </div>

    <div class="bo-step-foot">
      <span class="small muted">{{ 'bo.cons.footHint' | t }}</span>
      <button type="button" class="btn btn-yellow" (click)="next.emit()">{{ 'bo.cons.next' | t }} <i class="fa fa-angle-right"></i></button>
    </div>
  `,
})
export class StepConsolidate {
  protected bo = inject(BoService);
  readonly next = output<void>();

  protected stops = computed(() => this.bo.timeline());
  protected at = signal(this.bo.timeline().length - 1);
  protected mode = signal<Mode>('final');
  protected onlyChanged = signal(false);

  protected views = computed(() => this.bo.consolidate(this.stops()[this.at()]?.date));
  protected shown = computed(() => this.onlyChanged() ? this.views().filter(v => v.changed || v.notes.length) : this.views());
  protected rejected = computed(() => Object.values(this.bo.state().ops).filter(s => s === 'rejected').length);

  original(k: string) { return this.bo.fixedArticles().find(a => a.k === k)?.units ?? []; }

  notesOf(v: ArticleView): string[] {
    const unitNotes = v.revoked ? [v.revoked] : v.units.filter(u => u.state === 'revoked' && u.note).map(u => `${u.label} ${u.note}`);
    return [...unitNotes, ...v.notes];
  }
}
