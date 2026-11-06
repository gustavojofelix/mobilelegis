import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import { Localized } from './models';

/** {{ 'nav.home' | t }}  ·  {{ 'trial.active' | t: { n: 5 } }} */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(key: string, params?: Record<string, unknown>): string { return this.i18n.t(key, params); }
}

/** Escolhe o texto na língua activa: {{ area.name | loc }} */
@Pipe({ name: 'loc', pure: false })
export class LocPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(v: Localized | undefined): string { return this.i18n.loc(v); }
}

@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(v: number): string { return this.i18n.money(v); }
}

@Pipe({ name: 'dt', pure: false })
export class DtPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(v: string | Date, withTime = false): string { return this.i18n.date(v, withTime); }
}

export const I18N_PIPES = [TPipe, LocPipe, MoneyPipe, DtPipe] as const;
