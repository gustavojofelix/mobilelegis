import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { I18N_PIPES } from '../core/pipes';
import { normalize } from '../core/text';
import { BoService } from './bo.service';

@Component({
  selector: 'bo-diplomas',
  imports: [FormsModule, RouterLink, ...I18N_PIPES],
  template: `
    <div class="bo-page-head">
      <div><h1>{{ 'bo.nav.diplomas' | t }}</h1><p class="muted">{{ 'bo.dip.subtitle' | t: { n: data.diplomas().length } }}</p></div>
      <a routerLink="/backoffice/dossier/laci047" class="btn btn-yellow"><i class="fa fa-magic"></i> {{ 'bo.nav.consolidation' | t }}</a>
    </div>
    <section class="card">
      <input class="form-control bo-filter" [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="'bo.dip.filter' | t" />
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>{{ 'search.titleField' | t }}</th><th>{{ 'search.area' | t }}</th><th>{{ 'personal.state' | t }}</th><th class="num">{{ 'bo.dip.amendments' | t }}</th><th class="num">{{ 'bo.dip.articles' | t }}</th><th></th></tr></thead>
          <tbody>
            @for (d of list(); track d.id) {
              <tr>
                <td><b>{{ d.heading }}</b>@if (d.id === bo.case()?.meta?.id) { <span class="bo-pill pill-ai"><i class="fa fa-bolt"></i> {{ 'bo.dip.fromBo' | t }}</span> }<br /><span class="small muted">{{ d.title }}</span></td>
                <td class="small">{{ data.area(d.areaId)?.name | loc }}</td>
                <td><span class="tag" [class.tag-alterado]="d.status === 'alterado'" [class.tag-revogado]="d.status === 'revogado'" [class.tag-ok]="d.status === 'em_vigor'">{{ ('status.' + d.status) | t }}</span></td>
                <td class="num">{{ d.amendments.length }}</td>
                <td class="num">{{ count(d.id) }}</td>
                <td class="actions"><a [routerLink]="['/diploma', d.id]" [title]="'diploma.open' | t"><i class="fa fa-external-link"></i></a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class BoDiplomas {
  protected data = inject(DataService);
  protected bo = inject(BoService);
  protected q = signal('');
  protected list = computed(() => {
    const q = normalize(this.q().trim());
    return this.data.diplomas().filter(d => !q || normalize(d.heading + ' ' + d.title).includes(q));
  });
  count(id: string) { const d = this.data.diploma(id); return d ? this.data.articles(d).length : 0; }
}
