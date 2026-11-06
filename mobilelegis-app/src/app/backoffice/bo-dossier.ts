import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_PIPES } from '../core/pipes';
import { I18nService } from '../core/i18n.service';
import { BoService } from './bo.service';
import { StepUpload } from './steps/step-upload';
import { StepRead } from './steps/step-read';
import { StepOps } from './steps/step-ops';
import { StepConsolidate } from './steps/step-consolidate';
import { StepPublish } from './steps/step-publish';

/** Mesa de Consolidação: um dossier com 5 passos. */
@Component({
  selector: 'bo-dossier',
  imports: [RouterLink, StepUpload, StepRead, StepOps, StepConsolidate, StepPublish, ...I18N_PIPES],
  template: `
    <div class="bo-page-head">
      <div>
        <a routerLink="/backoffice" class="small muted bo-crumb"><i class="fa fa-angle-left"></i> {{ 'bo.nav.dashboard' | t }}</a>
        <h1><span class="bo-code">{{ bo.case()?.code }}</span> Decreto n.º 38 088 — {{ bo.case()?.title }}</h1>
        <p class="muted small"><i class="fa fa-bolt"></i> {{ 'bo.dossier.simulated' | t }}</p>
      </div>
      <button type="button" class="btn btn-light btn-sm" (click)="reset()"><i class="fa fa-refresh"></i> {{ 'bo.dossier.reset' | t }}</button>
    </div>

    <nav class="bo-stepper" aria-label="Passos">
      @for (s of steps(); track s.key; let i = $index) {
        <button type="button" class="bo-step" [class.active]="step() === i" [class.done]="s.done" [disabled]="i > bo.state().reached"
                (click)="go(i)" [attr.aria-current]="step() === i ? 'step' : null">
          <span class="bo-step-dot">@if (s.done) { <i class="fa fa-check"></i> } @else { {{ i + 1 }} }</span>
          <span class="bo-step-text"><b>{{ ('bo.steps.' + s.key) | t }}</b><small>{{ s.info }}</small></span>
        </button>
      }
    </nav>

    <div class="bo-step-body">
      @switch (step()) {
        @case (0) { <bo-step-upload (next)="go(1)" /> }
        @case (1) { <bo-step-read (next)="go(2)" /> }
        @case (2) { <bo-step-ops (next)="go(3)" /> }
        @case (3) { <bo-step-consolidate (next)="go(4)" /> }
        @case (4) { <bo-step-publish /> }
      }
    </div>
  `,
})
export class BoDossier {
  protected bo = inject(BoService);
  private i18n = inject(I18nService);
  protected step = signal(Math.min(this.bo.state().reached, 4));

  protected steps = computed(() => {
    const s = this.bo.state(), c = this.bo.counts();
    const pdfs = s.attached.length;
    return [
      { key: 'upload', done: this.bo.coreDocsReady(), info: pdfs ? `${pdfs} PDF` : '—' },
      { key: 'read', done: s.readDone && !!c && c.doubts.done === c.doubts.total && c.issues.done === c.issues.total,
        info: s.readDone && c ? `${c.doubts.done + c.issues.done}/${c.doubts.total + c.issues.total}` : '—' },
      { key: 'ops', done: !!c && c.ops.done === c.ops.total && c.warnings.done === c.warnings.total,
        info: c && s.reached >= 2 ? `${c.ops.done + c.warnings.done}/${c.ops.total + c.warnings.total}` : '—' },
      { key: 'consolidate', done: s.reached >= 4, info: s.reached >= 3 ? '1950 → 2013' : '—' },
      { key: 'publish', done: !!s.publishedAt, info: s.publishedAt ? '✓' : s.reviewed ? '2/2' : s.submitted ? '1/2' : '—' },
    ];
  });

  go(i: number) {
    this.bo.reach(i);
    this.step.set(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() {
    if (!confirm(this.i18n.t('bo.dossier.resetConfirm'))) return;
    this.bo.start();
    this.step.set(0);
  }
}
