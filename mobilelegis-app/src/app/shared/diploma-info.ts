import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { Diploma, Relation, RelationKind } from '../core/models';
import { I18N_PIPES } from '../core/pipes';

type Tab = 'card' | 'related' | 'timeline';
interface Group { kind: RelationKind; items: { r: Relation; d?: Diploma }[]; }
interface Event { date: string; kind: 'pub' | 'force' | 'amend' | 'revoke'; label: string; id?: string; pdf?: string; }

const ORDER: RelationKind[] = ['revogado_por', 'alterado_por', 'altera', 'revoga', 'regulamenta', 'regulamentado_por', 'ver_tambem'];

/**
 * Ficha do diploma (visível mesmo sem acesso ao texto): publicação no BR, entidade emitente,
 * entrada em vigor, descritores, PDF do BR original, citação, legislação associada e linha do tempo.
 */
@Component({
  selector: 'app-diploma-info',
  imports: [RouterLink, ...I18N_PIPES],
  template: `
    @let x = d();
    <section class="dinfo">
      <div class="dinfo-tabs" role="tablist">
        <button type="button" role="tab" [class.active]="tab() === 'card'" [attr.aria-selected]="tab() === 'card'" (click)="tab.set('card')">
          <i class="fa fa-id-card-o"></i> {{ 'dinfo.card' | t }}</button>
        <button type="button" role="tab" [class.active]="tab() === 'related'" [attr.aria-selected]="tab() === 'related'" (click)="tab.set('related')">
          <i class="fa fa-sitemap"></i> {{ 'dinfo.related' | t }} <span class="dinfo-count">{{ relCount() }}</span></button>
        <button type="button" role="tab" [class.active]="tab() === 'timeline'" [attr.aria-selected]="tab() === 'timeline'" (click)="tab.set('timeline')">
          <i class="fa fa-history"></i> {{ 'dinfo.timeline' | t }}</button>
      </div>

      @switch (tab()) {
        @case ('card') {
          <dl class="dinfo-grid">
            <div><dt>{{ 'dinfo.type' | t }}</dt><dd>{{ x.type }}@if (x.number && x.number !== '—') { · n.º {{ x.number }} }</dd></div>
            <div><dt>{{ 'dinfo.issuer' | t }}</dt><dd>{{ x.issuer || '—' }}</dd></div>
            <div><dt>{{ 'dinfo.published' | t }}</dt><dd>
              @if (x.br; as br) { {{ br.gazette }} n.º {{ br.number }}, {{ br.series }} {{ 'dinfo.series' | t }}, {{ br.date | dt }} · {{ 'dinfo.page' | t }} {{ br.page }} }
              @else { {{ x.date | dt }} }</dd></div>
            <div><dt>{{ 'dinfo.inForce' | t }}</dt><dd>
              @if (x.inForce) { {{ x.inForce | dt }} } @else { — }
              @if (x.inForceRule) { <span class="small muted d-block">{{ x.inForceRule }}</span> }</dd></div>
            <div><dt>{{ 'dinfo.state' | t }}</dt><dd>
              <span class="tag" [class.tag-alterado]="x.status === 'alterado'" [class.tag-revogado]="x.status === 'revogado'" [class.tag-ok]="x.status === 'em_vigor'">{{ ('status.' + x.status) | t }}</span>
              @if (x.textPending) { <span class="tag tag-alterado">{{ 'dinfo.textPending' | t }}</span> }</dd></div>
            <div><dt>{{ 'dinfo.area' | t }}</dt><dd>{{ data.area(x.areaId)?.name | loc }}</dd></div>
            @if (x.descriptors?.length) {
              <div class="wide"><dt>{{ 'dinfo.descriptors' | t }}</dt><dd class="dinfo-chips">
                @for (k of x.descriptors; track k) { <a [routerLink]="['/pesquisa']" [queryParams]="{ q: k }" class="dinfo-chip">{{ k }}</a> }</dd></div>
            }
          </dl>
          <div class="dinfo-actions">
            @if (x.brPdf) {
              <a class="btn btn-yellow btn-sm" [href]="x.brPdf" target="_blank" rel="noopener"><i class="fa fa-file-pdf-o"></i> {{ 'dinfo.brPdf' | t }}</a>
            }
            <button type="button" class="btn btn-light btn-sm" (click)="cite()"><i class="fa" [class.fa-check]="cited()" [class.fa-quote-right]="!cited()"></i>
              {{ (cited() ? 'dinfo.cited' : 'dinfo.cite') | t }}</button>
          </div>
          @if (x.brPdf && !isReal()) { <p class="small muted dinfo-foot">{{ 'dinfo.facsimile' | t }}</p> }
        }
        @case ('related') {
          @for (g of groups(); track g.kind) {
            <p class="dinfo-group"><i class="fa" [class]="icon(g.kind)"></i> {{ ('dinfo.rel.' + g.kind) | t }}</p>
            <ul class="dinfo-rel">
              @for (it of g.items; track $index) {
                <li>
                  @if (it.d) {
                    <a [routerLink]="['/diploma', it.d.id]"><strong>{{ it.d.heading }}</strong></a>
                    <span class="muted"> — {{ it.d.title.split(' - ')[0] }}</span>
                  } @else { <strong>{{ it.r.label }}</strong> }
                  @if (it.r.note && it.r.note !== '—') { <span class="small muted d-block">{{ it.r.note }}</span> }
                  @if (it.r.pdf) { <a class="small" [href]="it.r.pdf" target="_blank" rel="noopener"><i class="fa fa-file-pdf-o"></i> {{ 'dinfo.brPdf' | t }}</a> }
                </li>
              }
            </ul>
          } @empty { <p class="muted">{{ 'dinfo.noRelated' | t }}</p> }
        }
        @case ('timeline') {
          <ol class="dinfo-tl">
            @for (e of events(); track $index) {
              <li [class]="'tl-' + e.kind">
                <span class="tl-date">{{ e.date | dt }}</span>
                <span class="tl-label">
                  @if (e.id) { <a [routerLink]="['/diploma', e.id]">{{ e.label }}</a> } @else { {{ e.label }} }
                  @if (e.pdf) { <a class="small" [href]="e.pdf" target="_blank" rel="noopener"> <i class="fa fa-file-pdf-o"></i></a> }
                </span>
              </li>
            }
          </ol>
        }
      }
    </section>
  `,
})
export class DiplomaInfo {
  protected data = inject(DataService);
  private i18n = inject(I18nService);
  readonly d = input.required<Diploma>();
  protected tab = signal<Tab>('card');
  protected cited = signal(false);

  private rels = computed(() => this.data.relations(this.d())
    .map(r => ({ r, d: r.id ? this.data.diploma(r.id) : undefined }))
    .filter(x => x.d || x.r.label));
  protected relCount = computed(() => this.rels().length);
  protected groups = computed<Group[]>(() => ORDER
    .map(kind => ({ kind, items: this.rels().filter(x => x.r.kind === kind) }))
    .filter(g => g.items.length));

  protected isReal = computed(() => ['dec-38088'].includes(this.d().id));

  protected events = computed<Event[]>(() => {
    const d = this.d(), t = (k: string) => this.i18n.t(k);
    const out: Event[] = [{ date: d.br?.date ?? d.date, kind: 'pub', label: `${t('dinfo.tl.pub')} — ${d.br ? d.br.gazette + ' n.º ' + d.br.number : d.heading}`, pdf: d.brPdf }];
    if (d.inForce) out.push({ date: d.inForce, kind: 'force', label: t('dinfo.tl.force') });
    for (const r of this.rels()) {
      if (r.r.kind === 'alterado_por') {
        const a = d.amendments.find(x => x.diploma === r.r.label || x.diploma === r.d?.heading);
        const date = r.d?.date ?? a?.date;
        if (date) out.push({ date, kind: 'amend', label: `${t('dinfo.tl.amend')} ${r.d?.heading ?? r.r.label}`, id: r.d?.id, pdf: r.r.pdf });
      }
      if (r.r.kind === 'revogado_por' && r.d) out.push({ date: r.d.inForce ?? r.d.date, kind: 'revoke', label: `${t('dinfo.tl.revoke')} ${r.d.heading}`, id: r.d.id });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  });

  icon(k: RelationKind) {
    return { altera: 'fa-pencil', alterado_por: 'fa-pencil-square-o', revoga: 'fa-ban', revogado_por: 'fa-ban',
      regulamenta: 'fa-cogs', regulamentado_por: 'fa-cogs', ver_tambem: 'fa-link' }[k];
  }

  /** Citação normalizada: "Lei n.º 13/2023, de 25 de Agosto (BR n.º 165, I Série, de 25/08/2023, pág. 37)". */
  cite() {
    const d = this.d(), br = d.br;
    const text = br ? `${d.heading} (${br.gazette} n.º ${br.number}, ${br.series} Série, de ${this.i18n.date(br.date)}, pág. ${br.page})` : d.heading;
    navigator.clipboard?.writeText(text);
    this.cited.set(true);
    setTimeout(() => this.cited.set(false), 1500);
  }
}
