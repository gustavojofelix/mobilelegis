import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';

/** Selector de língua em dropdown — as opções vêm de public/i18n/languages.json. */
@Component({
  selector: 'app-lang-switch',
  template: `
    <label class="lang-select">
      <i class="fa fa-globe" aria-hidden="true"></i>
      <select [value]="i18n.lang()" (change)="i18n.use($any($event.target).value)" aria-label="Language / Língua">
        @for (l of i18n.languages(); track l.code) {
          <option [value]="l.code" [selected]="l.code === i18n.lang()">{{ l.label }}</option>
        }
      </select>
      <i class="fa fa-caret-down caret" aria-hidden="true"></i>
    </label>`,
})
export class LangSwitch {
  protected i18n = inject(I18nService);
}
