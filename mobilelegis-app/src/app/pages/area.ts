import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DataService } from '../core/data.service';
import { I18N_PIPES } from '../core/pipes';
import { DiplomaRow } from '../shared/diploma-row';

/** Área → separadores de Categoria → lista de Subcategorias (acordeão) → Diplomas. */
@Component({
  selector: 'app-area',
  imports: [DiplomaRow, ...I18N_PIPES],
  template: `
    @if (area(); as a) {
      <div class="page-title">
        <div class="container">
          <p class="area-crumb">{{ a.name | loc }}</p>
          <div class="tabs" role="tablist">
            @for (c of a.categories; track c.id) {
              <button type="button" role="tab" class="tab" [class.active]="catId() === c.id" [attr.aria-selected]="catId() === c.id"
                      (click)="selectCat(c.id)">{{ c.name | loc }}</button>
            }
          </div>
        </div>
      </div>

      <div class="container narrow">
        @if (category(); as c) {
          @for (s of c.subcategories; track s.id) {
            <section class="sub" [class.open]="openSubs().includes(s.id)">
              <button type="button" class="sub-head" (click)="toggleSub(s.id)" [attr.aria-expanded]="openSubs().includes(s.id)">
                <span>{{ s.name | loc }}</span>
                <i class="fa" [class.fa-angle-down]="!openSubs().includes(s.id)" [class.fa-angle-up]="openSubs().includes(s.id)"></i>
              </button>
              @if (openSubs().includes(s.id)) {
                <div class="sub-body">
                  @for (d of data.diplomasIn(a.id, c.id, s.id); track d.id) {
                    <app-diploma-row [d]="d" />
                  } @empty {
                    <p class="empty">{{ 'common.noRecords' | t }}</p>
                  }
                </div>
              }
            </section>
          }
        }
      </div>
    }
  `,
})
export class AreaView {
  protected data = inject(DataService);
  readonly id = input.required<string>();
  protected area = computed(() => this.data.area(this.id()));
  protected catId = signal('');
  protected category = computed(() => this.area()?.categories.find(c => c.id === this.catId()));
  protected openSubs = signal<string[]>([]);

  constructor() {
    // Ao mudar de área: primeiro separador activo e primeira subcategoria aberta
    effect(() => {
      const a = this.area();
      this.catId.set(a?.categories[0]?.id ?? '');
      this.openSubs.set(a?.categories[0]?.subcategories[0] ? [a.categories[0].subcategories[0].id] : []);
    });
  }

  selectCat(id: string) {
    this.catId.set(id);
    const first = this.category()?.subcategories[0];
    this.openSubs.set(first ? [first.id] : []);
  }

  toggleSub(id: string) {
    this.openSubs.update(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }
}
