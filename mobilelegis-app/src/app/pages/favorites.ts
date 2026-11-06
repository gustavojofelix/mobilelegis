import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { Diploma } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { DiplomaRow } from '../shared/diploma-row';
import { PageTitle } from '../shared/page-title';

@Component({
  selector: 'app-favorites',
  imports: [DiplomaRow, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'nav.favorites' | t" icon="star" />
    <div class="container narrow">
      <div class="dip-list">
        @for (d of items(); track d.id) { <app-diploma-row [d]="d" /> }
        @empty { <p class="empty">{{ 'common.noRecords' | t }}</p> }
      </div>
    </div>
  `,
})
export class Favorites {
  private auth = inject(AuthService);
  private data = inject(DataService);
  protected items = computed<Diploma[]>(() => (this.auth.user()?.favorites ?? []).map(id => this.data.diploma(id)).filter((d): d is Diploma => !!d));
}
