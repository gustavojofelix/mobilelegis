import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18N_PIPES } from '../core/pipes';
import { BoardCard, BoardColumn } from './bo.models';
import { BoService } from './bo.service';
import { RadarService } from './radar.service';

interface Card extends BoardCard { live?: boolean; }

@Component({
  selector: 'bo-dashboard',
  imports: [RouterLink, ...I18N_PIPES],
  template: `
    <div class="bo-page-head">
      <div>
        <h1>{{ 'bo.dash.title' | t }}</h1>
        <p class="muted">{{ 'bo.dash.subtitle' | t }}</p>
      </div>
      <button type="button" class="btn btn-yellow" (click)="newOpen.set(true)"><i class="fa fa-plus"></i> {{ 'bo.dash.new' | t }}</button>
    </div>

    <div class="bo-kpis">
      <div class="bo-kpi"><i class="fa fa-folder-open"></i><div><b>{{ kpi().open }}</b><span>{{ 'bo.dash.kpiOpen' | t }}</span></div></div>
      <div class="bo-kpi"><i class="fa fa-gavel"></i><div><b>{{ kpi().reviewer }}</b><span>{{ 'bo.dash.kpiReviewer' | t }}</span></div></div>
      <div class="bo-kpi"><i class="fa fa-check-circle"></i><div><b>{{ kpi().published }}</b><span>{{ 'bo.dash.kpiPublished' | t }}</span></div></div>
      <div class="bo-kpi ai"><i class="fa fa-bolt"></i><div><b>{{ kpi().pages }}</b><span>{{ 'bo.dash.kpiPages' | t }}</span></div></div>
    </div>

    <a class="bo-radar-banner" routerLink="/backoffice/radar">
      <i class="fa fa-rss"></i>
      <span><b>{{ 'bo.nav.radar' | t }}</b> — @if (radar.pending()) { {{ 'bo.radar.bannerNew' | t: { n: radar.pending() } }} } @else { {{ 'bo.radar.bannerNone' | t: { d: (radar.lastSync() | dt: true) } }} }</span>
      <i class="fa fa-angle-right"></i>
    </a>

    <div class="bo-board">
      @for (col of columns; track col.id) {
        <section class="bo-col">
          <header><span class="bo-col-dot" [attr.data-col]="col.id"></span> {{ col.label | t }} <span class="bo-col-count">{{ cards(col.id).length }}</span></header>
          @for (c of cards(col.id); track c.code) {
            @if (c.live) {
              <a class="bo-card live" routerLink="/backoffice/dossier/laci047">
                <div class="bo-card-top"><span class="bo-code">{{ c.code }}</span><span class="bo-live"><i class="fa fa-bolt"></i> {{ 'bo.dash.demo' | t }}</span></div>
                <h3>{{ c.title }}</h3>
                <p class="small muted">{{ c.note }}</p>
                <div class="bo-bar"><span [style.width.%]="c.progress"></span></div>
                <div class="bo-card-foot"><span><i class="fa fa-file-pdf-o"></i> {{ c.docs }}</span><span>{{ 'bo.dash.open' | t }} <i class="fa fa-angle-right"></i></span></div>
              </a>
            } @else {
              <div class="bo-card" [title]="'bo.dash.static' | t">
                <div class="bo-card-top"><span class="bo-code">{{ c.code }}</span><span class="small muted">{{ c.due | dt }}</span></div>
                <h3>{{ c.title }}</h3>
                <p class="small muted">{{ c.note }}</p>
                <div class="bo-bar"><span [style.width.%]="c.progress"></span></div>
                <div class="bo-card-foot"><span><i class="fa fa-file-pdf-o"></i> {{ c.docs }}</span><span class="muted">{{ c.assignee }}</span></div>
              </div>
            }
          } @empty {
            <p class="bo-col-empty">—</p>
          }
        </section>
      }
    </div>

    @if (newOpen()) {
      <div class="modal-backdrop" (click)="newOpen.set(false)">
        <div class="modal bo-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="modal-head"><h2>{{ 'bo.dash.new' | t }}</h2>
            <button type="button" class="icon-link" (click)="newOpen.set(false)" [attr.aria-label]="'common.close' | t"><i class="fa fa-times"></i></button></div>
          <div class="bo-new-ico"><i class="fa fa-magic"></i></div>
          <p>{{ 'bo.dash.newText' | t }}</p>
          <p class="small muted">{{ 'bo.dash.newNote' | t }}</p>
          <div class="dip-row-actions">
            <button type="button" class="btn btn-light" (click)="newOpen.set(false)">{{ 'common.cancel' | t }}</button>
            <button type="button" class="btn btn-yellow" (click)="startDemo()"><i class="fa fa-play"></i> {{ 'bo.dash.startDemo' | t }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BoDashboard {
  protected bo = inject(BoService);
  protected radar = inject(RadarService);
  private router = inject(Router);
  protected newOpen = signal(false);

  protected columns: { id: BoardColumn; label: string }[] = [
    { id: 'read', label: 'bo.col.read' }, { id: 'review', label: 'bo.col.review' },
    { id: 'reviewer', label: 'bo.col.reviewer' }, { id: 'published', label: 'bo.col.published' },
  ];

  private live = computed<Card>(() => {
    const s = this.bo.state(), k = this.bo.case();
    return {
      code: k?.code ?? 'LACI047', title: 'Decreto n.º 38 088 — ' + (k?.title ?? ''), live: true,
      note: !s.attached.length ? '—' : `${s.attached.length} PDF · ${this.bo.counts()?.ops.approved ?? 0}/${k?.ops.length ?? 0} op.`,
      column: this.bo.column(), assignee: this.bo.admin()?.name ?? '', due: '', progress: this.bo.progress(), docs: s.attached.length,
    };
  });

  private all = computed<Card[]>(() => [this.live(), ...this.radar.cards(), ...(this.bo.board()?.dossiers ?? [])]);
  cards(col: BoardColumn) { return this.all().filter(c => c.column === col); }

  protected kpi = computed(() => {
    const all = this.all(), s = this.bo.state();
    const pages = (this.bo.board()?.stats.pagesRead ?? 0) + (s.readDone ? this.bo.attachedDocs().reduce((n, d) => n + d.pages, 0) : 0);
    return {
      open: all.filter(c => c.column !== 'published').length,
      reviewer: all.filter(c => c.column === 'reviewer').length,
      published: all.filter(c => c.column === 'published').length,
      pages: pages.toLocaleString('pt-PT'),
    };
  });

  startDemo() {
    this.bo.start();
    this.newOpen.set(false);
    this.router.navigateByUrl('/backoffice/dossier/laci047');
  }
}
