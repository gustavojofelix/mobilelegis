import { Component, computed, input } from '@angular/core';
import { I18N_PIPES } from '../../core/pipes';
import { Quality } from '../bo.models';

/** Medidor de qualidade de leitura (5 barras). */
@Component({
  selector: 'bo-quality',
  imports: [...I18N_PIPES],
  template: `
    <span class="bo-quality" [attr.data-q]="quality()" [title]="score() + '%'">
      <span class="bars">@for (b of [1, 2, 3, 4, 5]; track b) { <i [class.on]="b <= level()"></i> }</span>
      <span class="small">{{ ('bo.quality.' + quality()) | t }}</span>
    </span>
  `,
})
export class QualityMeter {
  readonly quality = input.required<Quality>();
  readonly score = input(0);
  protected level = computed(() => Math.max(1, Math.round(this.score() / 20)));
}
