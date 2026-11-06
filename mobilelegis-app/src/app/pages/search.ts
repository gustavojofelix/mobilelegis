import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { Diploma } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { findAll, normalize, snippet } from '../core/text';
import { DiplomaRow } from '../shared/diploma-row';
import { PageTitle } from '../shared/page-title';

interface Result { d: Diploma; hits: number; snippet: string; }

/** Pesquisa: palavras-chave no texto completo de todos os diplomas + título, ano, tipo, número e área. */
@Component({
  selector: 'app-search',
  imports: [FormsModule, DiplomaRow, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'search.title' | t" icon="search" />
    <div class="container narrow">
      <div class="form-grid filters">
        <label class="field span-2"><span>{{ 'search.keywords' | t }}</span>
          <input type="search" class="form-control" [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="'search.keywordsPh' | t" />
        </label>
        <label class="field"><span>{{ 'search.titleField' | t }}</span>
          <input class="form-control" [ngModel]="title()" (ngModelChange)="title.set($event)" />
        </label>
        <label class="field"><span>{{ 'search.number' | t }}</span>
          <input class="form-control" [ngModel]="number()" (ngModelChange)="number.set($event)" placeholder="1/2018" />
        </label>
        <label class="field"><span>{{ 'search.year' | t }}</span>
          <select class="form-control" [ngModel]="year()" (ngModelChange)="year.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (y of years(); track y) { <option [value]="y">{{ y }}</option> }
          </select>
        </label>
        <label class="field"><span>{{ 'search.type' | t }}</span>
          <select class="form-control" [ngModel]="type()" (ngModelChange)="type.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (t of types(); track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </label>
        <label class="field span-2"><span>{{ 'search.area' | t }}</span>
          <select class="form-control" [ngModel]="areaId()" (ngModelChange)="areaId.set($event)">
            <option value="">{{ 'common.all' | t }}</option>
            @for (a of data.areas(); track a.id) { <option [value]="a.id">{{ a.name | loc }}</option> }
          </select>
        </label>
      </div>
      <div class="row-between">
        <span class="muted">{{ 'search.results' | t: { n: results().length } }}</span>
        <button type="button" class="btn btn-light btn-sm" (click)="clear()">{{ 'search.clear' | t }}</button>
      </div>

      <div class="dip-list">
        @for (r of results(); track r.d.id) {
          <app-diploma-row [d]="r.d" [query]="q()" [hint]="r.hits ? ('search.hits' | t: { n: r.hits }) + ' — ' + r.snippet : ''" />
        } @empty {
          <p class="empty">{{ 'common.noRecords' | t }}</p>
        }
      </div>
    </div>
  `,
})
export class Search {
  protected data = inject(DataService);
  private i18n = inject(I18nService);
  readonly qParam = input<string | undefined>(undefined, { alias: 'q' });
  protected q = signal(''); protected title = signal(''); protected year = signal('');
  protected type = signal(''); protected number = signal(''); protected areaId = signal('');

  protected years = computed(() => [...new Set(this.data.diplomas().map(d => d.year))].sort((a, b) => b - a));
  protected types = computed(() => [...new Set(this.data.diplomas().map(d => d.type))].sort());

  constructor() { effect(() => this.q.set(this.qParam() ?? '')); }

  protected results = computed<Result[]>(() => {
    const q = this.q().trim(), title = normalize(this.title()), num = this.number().trim();
    const out: Result[] = [];
    for (const d of this.data.diplomas()) {
      if (title && !normalize(d.title).includes(title)) continue;
      if (this.year() && d.year !== +this.year()) continue;
      if (this.type() && d.type !== this.type()) continue;
      if (num && !d.number.includes(num)) continue;
      if (this.areaId() && d.areaId !== this.areaId()) continue;
      let hits = 0, snip = '';
      if (q) {
        // Pesquisa no texto completo de TODOS os artigos de cada diploma
        const texts = [d.title, d.preamble, ...this.data.articles(d).flatMap(a => [a.heading, ...a.paragraphs])];
        for (const t of texts) {
          const n = findAll(t, q).length;
          if (n && !snip) snip = snippet(t, q, 50);
          hits += n;
        }
        if (!hits) continue;
      }
      out.push({ d, hits, snippet: snip });
    }
    return out.sort((a, b) => b.hits - a.hits);
  });

  clear() { [this.q, this.title, this.year, this.type, this.number, this.areaId].forEach(s => s.set('')); }
}
