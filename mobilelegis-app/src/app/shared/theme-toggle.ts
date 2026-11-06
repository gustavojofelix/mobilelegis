import { Component, inject, input } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { I18N_PIPES } from '../core/pipes';

@Component({
  selector: 'app-theme-toggle',
  imports: [...I18N_PIPES],
  template: `
    <button type="button" class="icon-link theme-toggle" (click)="theme.toggle()"
            [attr.aria-label]="(theme.theme() === 'dark' ? 'theme.light' : 'theme.dark') | t"
            [title]="(theme.theme() === 'dark' ? 'theme.light' : 'theme.dark') | t">
      <i class="fa" [class.fa-sun-o]="theme.theme() === 'dark'" [class.fa-moon-o]="theme.theme() !== 'dark'"></i>
      @if (label()) { <span>{{ (theme.theme() === 'dark' ? 'theme.light' : 'theme.dark') | t }}</span> }
    </button>`,
})
export class ThemeToggle {
  protected theme = inject(ThemeService);
  readonly label = input(false);
}
