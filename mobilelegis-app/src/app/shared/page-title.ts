import { Component, input } from '@angular/core';

/** Título de página no estilo Mobilelegis: texto em maiúsculas sublinhado a amarelo e ícone à direita. */
@Component({
  selector: 'app-page-title',
  template: `
    <div class="page-title">
      <div class="container page-title-inner">
        <h1>{{ title() }}</h1>
        @if (icon()) { <i class="fa fa-{{ icon() }} page-title-icon" aria-hidden="true"></i> }
      </div>
    </div>`,
})
export class PageTitle {
  readonly title = input.required<string>();
  readonly icon = input<string>('');
}
