import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { I18N_PIPES } from '../../core/pipes';
import { DiplomaMeta } from '../bo.models';
import { BoService } from '../bo.service';

@Component({
  selector: 'bo-step-publish',
  imports: [FormsModule, RouterLink, ...I18N_PIPES],
  template: `
    @if (bo.state().publishedAt) {
      <section class="card bo-success">
        <div class="bo-confetti" aria-hidden="true">@for (c of confetti; track $index) { <i [style.left.%]="c.x" [style.animation-delay.s]="c.d" [style.background]="c.c"></i> }</div>
        <div class="bo-success-ico"><i class="fa fa-check"></i></div>
        <h2>{{ 'bo.pub.done' | t }}</h2>
        <p class="muted">{{ 'bo.pub.doneText' | t }}</p>
        <div class="bo-drop-actions">
          <a class="btn btn-yellow" [routerLink]="['/diploma', meta().id]"><i class="fa fa-external-link"></i> {{ 'bo.pub.view' | t }}</a>
          <a class="btn btn-light" [routerLink]="['/area', meta().areaId]">{{ 'bo.pub.viewArea' | t }}</a>
          <a class="btn btn-light" routerLink="/consultor"><i class="fa fa-comments"></i> {{ 'bo.pub.askAi' | t }}</a>
        </div>
      </section>
    }

    <div class="bo-pub">
      <div class="bo-pub-main">
        <section class="card">
          <h3 class="bo-h3"><i class="fa fa-list-ul"></i> {{ 'bo.pub.checklist' | t }}</h3>
          <ul class="bo-checklist">
            @for (c of checks(); track c.key) {
              <li [class.ok]="c.ok"><i class="fa" [class.fa-check-circle]="c.ok" [class.fa-circle-o]="!c.ok"></i> {{ ('bo.pub.' + c.key) | t }} <span class="small muted">{{ c.info }}</span></li>
            }
          </ul>
        </section>

        <section class="card">
          <h3 class="bo-h3"><i class="fa fa-tags"></i> {{ 'bo.pub.meta' | t }}</h3>
          <div class="form-grid">
            <label class="field"><span>{{ 'search.titleField' | t }}</span><input class="form-control" [ngModel]="meta().title" (ngModelChange)="set('title', $event)" [disabled]="locked()" /></label>
            <label class="field"><span>{{ 'search.type' | t }}</span><input class="form-control" [ngModel]="meta().type" (ngModelChange)="set('type', $event)" [disabled]="locked()" /></label>
            <label class="field"><span>{{ 'search.number' | t }}</span><input class="form-control" [ngModel]="meta().number" (ngModelChange)="set('number', $event)" [disabled]="locked()" /></label>
            <label class="field"><span>{{ 'personal.date' | t }}</span><input class="form-control" type="date" [ngModel]="meta().date" (ngModelChange)="set('date', $event)" [disabled]="locked()" /></label>
            <label class="field bo-span2"><span>{{ 'bo.pub.heading' | t }}</span><input class="form-control" [ngModel]="meta().heading" (ngModelChange)="set('heading', $event)" [disabled]="locked()" /></label>
            <label class="field"><span>{{ 'search.area' | t }}</span>
              <select class="form-control" [ngModel]="meta().areaId" (ngModelChange)="setArea($event)" [disabled]="locked()">
                @for (a of data.areas(); track a.id) { <option [value]="a.id">{{ a.number }}. {{ a.name | loc }}</option> }
              </select></label>
            <label class="field"><span>{{ 'bo.pub.category' | t }}</span>
              <select class="form-control" [ngModel]="catSub()" (ngModelChange)="setCat($event)" [disabled]="locked()">
                @for (c of area()?.categories ?? []; track c.id) {
                  @for (s of c.subcategories; track s.id) { <option [value]="c.id + '|' + s.id">{{ c.name | loc }} › {{ s.name | loc }}</option> }
                }
              </select></label>
            <label class="field"><span>{{ 'common.price' | t }} (MZN)</span><input class="form-control" type="number" min="0" [ngModel]="meta().price" (ngModelChange)="set('price', +$event)" [disabled]="locked()" /></label>
          </div>
          <p class="bo-label">{{ 'bo.pub.preview' | t }}</p>
          <div class="dip-row bo-preview">
            <div class="dip-row-head"><span class="dip-row-title">{{ meta().title }} <span class="tag tag-alterado">{{ 'status.alterado' | t }}</span></span>
              <span class="dip-row-icons"><i class="fa fa-shopping-cart"></i> <i class="fa fa-star-o"></i></span></div>
            <p class="small muted">{{ meta().heading }}</p>
          </div>
        </section>
      </div>

      <div class="bo-pub-side">
        <section class="card">
          <h3 class="bo-h3"><i class="fa fa-users"></i> {{ 'bo.pub.approvals' | t }}</h3>
          <div class="bo-approval" [class.ok]="bo.state().submitted">
            <span class="bo-avatar">1</span>
            <div><b>{{ 'bo.pub.preparer' | t }}</b>
              <p class="small muted">{{ bo.state().submitted ? (bo.state().submitted!.by + ' · ' + (bo.state().submitted!.at | dt: true)) : bo.admin()?.name }}</p></div>
            @if (!bo.state().submitted) { <button type="button" class="btn btn-yellow btn-sm" [disabled]="!ready()" (click)="bo.submit()">{{ 'bo.pub.submit' | t }}</button> }
            @else { <i class="fa fa-check-circle ok"></i> }
          </div>
          <div class="bo-approval" [class.ok]="bo.state().reviewed">
            <span class="bo-avatar">2</span>
            <div><b>{{ 'bo.pub.reviewer' | t }}</b>
              <p class="small muted">{{ bo.state().reviewed ? (bo.state().reviewed!.by + ' · ' + (bo.state().reviewed!.at | dt: true)) : bo.board()?.reviewer?.name }}</p></div>
            @if (!bo.state().reviewed) { <button type="button" class="btn btn-light btn-sm" [disabled]="!bo.state().submitted" (click)="bo.review()">{{ 'bo.pub.approveDemo' | t }}</button> }
            @else { <i class="fa fa-check-circle ok"></i> }
          </div>
          @if (!bo.state().publishedAt) {
            <button type="button" class="btn btn-yellow btn-block bo-publish-btn" [disabled]="!bo.state().reviewed" (click)="bo.publish()"><i class="fa fa-paper-plane"></i> {{ 'bo.pub.publish' | t }}</button>
          }
        </section>

        <section class="card">
          <h3 class="bo-h3"><i class="fa fa-clock-o"></i> {{ 'bo.pub.log' | t }}</h3>
          <ul class="bo-log">
            @for (l of bo.state().log.slice(0, 14); track $index) {
              <li><span class="small muted">{{ l.at | dt: true }} · {{ l.who }}</span>{{ l.key | t: l.params }}</li>
            } @empty { <li class="muted">—</li> }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class StepPublish {
  protected bo = inject(BoService);
  protected data = inject(DataService);
  protected meta = computed(() => this.bo.meta()!);
  protected area = computed(() => this.data.area(this.meta().areaId));
  protected catSub = computed(() => this.meta().categoryId + '|' + this.meta().subcategoryId);
  protected locked = computed(() => !!this.bo.state().submitted);

  protected checks = computed(() => {
    const c = this.bo.counts()!, s = this.bo.state(), m = this.meta();
    return [
      { key: 'ckRead', ok: c.doubts.done === c.doubts.total && c.issues.done === c.issues.total, info: `${c.doubts.done + c.issues.done}/${c.doubts.total + c.issues.total}` },
      { key: 'ckOps', ok: c.ops.done === c.ops.total, info: `${c.ops.approved} ✓ · ${c.ops.done - c.ops.approved} ✕` },
      { key: 'ckWarnings', ok: c.warnings.done === c.warnings.total, info: `${c.warnings.done}/${c.warnings.total}` },
      { key: 'ckNumbering', ok: s.issues['i1'] === 'fix', info: '' },
      { key: 'ckRefs', ok: !!s.warnings['w6'], info: '' },
      { key: 'ckMeta', ok: !!(m.title && m.heading && m.date && m.areaId && m.subcategoryId), info: '' },
    ];
  });
  protected ready = computed(() => this.checks().every(c => c.ok));

  protected confetti = Array.from({ length: 36 }, (_, i) => ({
    x: (i * 37) % 100, d: (i % 9) * 0.12, c: ['#ffd800', '#12483d', '#8fd6c3', '#fce100', '#1e7d4f'][i % 5],
  }));

  set<K extends keyof DiplomaMeta>(key: K, value: DiplomaMeta[K]) {
    const m = { ...this.meta(), [key]: value };
    if (key === 'date') m.year = Number(String(value).slice(0, 4)) || m.year;
    this.bo.updateMeta(m);
  }
  setArea(id: string) {
    const a = this.data.area(id), c = a?.categories[0], s = c?.subcategories[0];
    this.bo.updateMeta({ ...this.meta(), areaId: id, categoryId: c?.id ?? '', subcategoryId: s?.id ?? '' });
  }
  setCat(v: string) {
    const [categoryId, subcategoryId] = v.split('|');
    this.bo.updateMeta({ ...this.meta(), categoryId, subcategoryId });
  }
}
