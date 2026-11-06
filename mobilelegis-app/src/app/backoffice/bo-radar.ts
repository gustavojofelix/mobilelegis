import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { I18N_PIPES } from '../core/pipes';
import { RadarItem, RadarService } from './radar.service';

interface Peer { name: string; ok: boolean; }

@Component({
  selector: 'bo-radar',
  imports: [RouterLink, ...I18N_PIPES],
  template: `
    <div class="bo-page-head">
      <div>
        <h1><i class="fa fa-rss"></i> {{ 'bo.radar.title' | t }}</h1>
        <p class="muted">{{ 'bo.radar.subtitle' | t }}</p>
      </div>
      <div class="row-gap">
        <button type="button" class="btn btn-light btn-sm" (click)="radar.reset()" [title]="'bo.radar.resetHint' | t"><i class="fa fa-undo"></i> {{ 'bo.radar.reset' | t }}</button>
        <button type="button" class="btn btn-yellow" (click)="sync()" [disabled]="syncing() || radar.state().synced">
          <i class="fa fa-refresh" [class.fa-spin]="syncing()"></i> {{ 'bo.radar.syncNow' | t }}</button>
      </div>
    </div>

    <div class="bo-kpis">
      <div class="bo-kpi"><i class="fa fa-university"></i><div><b>INM</b><span>{{ raw()?.schedule }}</span></div></div>
      <div class="bo-kpi"><i class="fa fa-clock-o"></i><div><b>{{ radar.lastSync() | dt: true }}</b><span>{{ 'bo.radar.lastSync' | t }}</span></div></div>
      <div class="bo-kpi"><i class="fa fa-inbox"></i><div><b>{{ radar.pending() }}</b><span>{{ 'bo.radar.pending' | t }}</span></div></div>
      <div class="bo-kpi ai"><i class="fa fa-bolt"></i><div><b>&lt; 24 h</b><span>{{ 'bo.radar.sla' | t }}</span></div></div>
    </div>

    @if (syncing()) {
      <section class="card bo-radar-sync" aria-live="polite">
        @for (s of steps(); track $index) {
          <p [class.done]="$index < stepAt()" [class.now]="$index === stepAt()">
            <i class="fa" [class.fa-check-circle]="$index < stepAt()" [class.fa-circle-o-notch]="$index === stepAt()" [class.fa-spin]="$index === stepAt()" [class.fa-circle-thin]="$index > stepAt()"></i> {{ s }}</p>
        }
      </section>
    }

    <section class="card bo-radar-bench">
      <p class="bo-radar-bench-title"><i class="fa fa-flag-checkered"></i> {{ 'bo.radar.benchTitle' | t }}</p>
      <p class="small muted">{{ 'bo.radar.benchText' | t }}</p>
      <div class="bo-radar-peers">
        @for (p of peers; track p.name) {
          <span class="bo-peer" [class.ok]="p.ok"><i class="fa" [class.fa-check]="p.ok" [class.fa-times]="!p.ok"></i> {{ p.name }}</span>
        }
        <span class="bo-peer me" [class.ok]="resPublished()"><i class="fa" [class.fa-check]="resPublished()" [class.fa-hourglass-half]="!resPublished()"></i> Mobilelegis
          <small>{{ (resPublished() ? 'bo.radar.benchOk' : 'bo.radar.benchWait') | t }}</small></span>
      </div>
    </section>

    @for (i of radar.items(); track i.id) {
      <article class="card bo-radar-item" [class.done]="i.status !== 'new'" [class.ignored]="i.status === 'ignored'">
        <div class="bo-radar-top">
          <span class="bo-pill"><i class="fa fa-newspaper-o"></i> BR n.º {{ i.br.number }} · {{ i.br.series }} {{ 'dinfo.series' | t }} · {{ i.br.date | dt }} · {{ 'dinfo.page' | t }} {{ i.br.page }}</span>
          <span class="bo-pill" [class.pill-ai]="i.status === 'new'" [class.pill-ok]="i.status === 'published' || i.status === 'consolidation'">{{ ('bo.radar.st.' + i.status) | t }}</span>
          @if (i.demo) { <span class="bo-pill pill-warn">{{ 'bo.radar.demoItem' | t }}</span> }
        </div>
        <h3>{{ i.heading }}</h3>
        <p class="bo-radar-sum">{{ i.summary }}</p>
        <dl class="dinfo-grid compact">
          <div><dt>{{ 'dinfo.issuer' | t }}</dt><dd>{{ i.issuer }}</dd></div>
          <div><dt>{{ 'dinfo.inForce' | t }}</dt><dd>{{ i.inForce | dt }} <span class="small muted d-block">{{ i.inForceRule }}</span></dd></div>
          @if (i.approvedAt) { <div><dt>{{ 'bo.radar.approved' | t }}</dt><dd>{{ i.approvedAt | dt }}</dd></div> }
          <div><dt>{{ 'dinfo.descriptors' | t }}</dt><dd class="dinfo-chips">@for (k of i.descriptors; track k) { <span class="dinfo-chip">{{ k }}</span> }</dd></div>
        </dl>

        <ol class="bo-radar-pipe">
          <li class="ok"><i class="fa fa-download"></i> {{ 'bo.radar.p.fetched' | t }}</li>
          <li class="ok"><i class="fa fa-file-text-o"></i> {{ 'bo.radar.p.text' | t: { n: i.pages, q: i.ocr } }}</li>
          <li class="ok"><i class="fa fa-bolt"></i> {{ 'bo.radar.p.classified' | t: { n: i.suggest.confidence } }}</li>
          <li class="ok"><i class="fa fa-sitemap"></i> {{ 'bo.radar.p.relations' | t: { n: i.relations.length } }}</li>
          <li [class.ok]="i.status !== 'new'"><i class="fa fa-user"></i> {{ 'bo.radar.p.review' | t }}</li>
          <li [class.ok]="i.status === 'published' || i.status === 'consolidation'"><i class="fa fa-globe"></i> {{ 'bo.radar.p.published' | t }}</li>
        </ol>

        <div class="bo-radar-ai">
          <div class="bo-radar-ai-col">
            <p class="bo-radar-h"><i class="fa fa-bolt"></i> {{ 'bo.radar.classify' | t }}</p>
            <select class="form-control form-control-sm" (change)="setPlace(i, $any($event.target).value)" [disabled]="i.status !== 'new'" [attr.aria-label]="'dinfo.area' | t">
              @for (o of places(); track o.key) { <option [value]="o.key" [selected]="o.key === placeKey(i)">{{ o.label }}</option> }
            </select>
            <div class="bo-conf"><span [style.width.%]="i.suggest.confidence" [class.low]="i.suggest.confidence < 70"></span></div>
            <p class="small muted">{{ 'bo.radar.confidence' | t: { n: i.suggest.confidence } }}
              @if (i.suggest.newArea) { · <b>{{ 'bo.radar.newArea' | t: { name: i.suggest.newArea } }}</b> }</p>
          </div>
          <div class="bo-radar-ai-col">
            <p class="bo-radar-h"><i class="fa fa-sitemap"></i> {{ 'bo.radar.relations' | t }}</p>
            <ul class="dinfo-rel tight">
              @for (r of i.relations; track $index) {
                <li><span class="bo-pill" [class.pill-warn]="r.kind === 'altera'">{{ ('dinfo.rel.' + r.kind) | t }}</span>
                  @if (r.id && data.diploma(r.id); as t) { <a [routerLink]="['/diploma', t.id]" target="_blank"><b>{{ t.heading }}</b></a> — {{ t.title.split(' - ')[0] }} }
                  @else { {{ r.label }} }
                  @if (r.note) { <span class="small muted d-block">{{ r.note }}</span> }
                </li>
              }
            </ul>
            @if (alters(i) && i.status === 'new') { <p class="small bo-radar-tip"><i class="fa fa-lightbulb-o"></i> {{ 'bo.radar.altersTip' | t }}</p> }
          </div>
        </div>

        <div class="bo-radar-actions">
          @switch (i.status) {
            @case ('new') {
              @if (alters(i)) {
                <button type="button" class="btn btn-yellow btn-sm" (click)="radar.consolidate(i.id)"><i class="fa fa-magic"></i> {{ 'bo.radar.consolidate' | t }}</button>
                <button type="button" class="btn btn-light btn-sm" (click)="radar.publish(i.id)"><i class="fa fa-check"></i> {{ 'bo.radar.publishOnly' | t }}</button>
              } @else {
                <button type="button" class="btn btn-yellow btn-sm" (click)="radar.publish(i.id)"><i class="fa fa-check"></i> {{ 'bo.radar.publish' | t }}</button>
              }
              <button type="button" class="btn btn-light btn-sm" (click)="radar.ignore(i.id)"><i class="fa fa-eye-slash"></i> {{ 'bo.radar.ignore' | t }}</button>
            }
            @case ('ignored') {
              <span class="muted small">{{ 'bo.radar.ignoredText' | t }}</span>
              <button type="button" class="link-btn" (click)="radar.undo(i.id)">{{ 'bo.radar.undo' | t }}</button>
            }
            @default {
              <span class="small"><i class="fa fa-check-circle text-ok"></i> {{ 'bo.radar.publishedAt' | t: { d: (i.publishedAt ?? '' | dt: true) } }}</span>
              <a class="btn btn-light btn-sm" [routerLink]="['/diploma', radar.diplomaId(i.id)]" target="_blank"><i class="fa fa-external-link"></i> {{ 'bo.radar.view' | t }}</a>
              @if (i.status === 'consolidation') { <a class="btn btn-light btn-sm" routerLink="/backoffice"><i class="fa fa-th-large"></i> {{ 'bo.radar.viewBoard' | t }}</a> }
              @if (i.wave > 0) { <button type="button" class="link-btn" (click)="radar.undo(i.id)">{{ 'bo.radar.undo' | t }}</button> }
            }
          }
        </div>
      </article>
    }
    <p class="small muted bo-radar-note"><i class="fa fa-info-circle"></i> {{ 'bo.radar.note' | t }}</p>
  `,
})
export class BoRadar {
  protected radar = inject(RadarService);
  protected data = inject(DataService);
  private i18n = inject(I18nService);
  protected raw = this.radar.raw;
  protected syncing = signal(false);
  protected stepAt = signal(0);

  /** Teste feito pela equipa em 06.11.2026 com a Resolução n.º 89/2026 (BR n.º 211, de 05.11.2026). */
  protected peers: Peer[] = [
    { name: 'MozLex', ok: true }, { name: 'LexLink', ok: true }, { name: 'Inbr1mz', ok: true },
    { name: 'Legis-PALOP+TL', ok: false }, { name: 'LexIndicia', ok: false }, { name: 'Gazettes Africa', ok: false },
  ];
  protected resPublished = computed(() => {
    const s = this.radar.items().find(i => i.id === 'r-res-89-2026')?.status;
    return s === 'published' || s === 'consolidation';
  });

  protected steps = computed(() => ['s1', 's2', 's3', 's4', 's5', 's6'].map(k => this.i18n.t('bo.radar.sync.' + k)));

  protected places = computed(() => this.data.areas().flatMap(a => a.categories.flatMap(c => c.subcategories.map(s => ({
    key: `${a.id}|${c.id}|${s.id}`,
    label: `${this.i18n.loc(a.name).replace(/^Legislação (sobre |de |do |da )?/, '')} › ${this.i18n.loc(c.name)} › ${this.i18n.loc(s.name)}`,
  })))));

  placeKey(i: RadarItem) { const p = this.radar.placement(i); return `${p.areaId}|${p.categoryId}|${p.subcategoryId}`; }
  setPlace(i: RadarItem, key: string) {
    const [areaId, categoryId, subcategoryId] = key.split('|');
    this.radar.setPlacement(i.id, { areaId, categoryId, subcategoryId });
  }
  alters(i: RadarItem) { return i.relations.some(r => r.kind === 'altera' && r.id && this.data.diploma(r.id)); }

  async sync() {
    this.syncing.set(true); this.stepAt.set(0);
    for (let k = 0; k < this.steps().length; k++) { this.stepAt.set(k); await new Promise(r => setTimeout(r, 650)); }
    this.stepAt.set(this.steps().length);
    this.radar.sync();
    await new Promise(r => setTimeout(r, 400));
    this.syncing.set(false);
  }
}
