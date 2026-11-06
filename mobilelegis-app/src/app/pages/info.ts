import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { I18N_PIPES } from '../core/pipes';
import { PageTitle } from '../shared/page-title';

const PAGES: Record<string, { title: string; icon: string }> = {
  sobre: { title: 'nav.about', icon: 'map-marker' },
  contactos: { title: 'nav.contacts', icon: 'envelope' },
  faqs: { title: 'nav.faqs', icon: 'question-circle' },
  privacidade: { title: 'nav.privacy', icon: 'shield' },
  termos: { title: 'nav.terms', icon: 'file-text-o' },
};

/** Páginas informativas (conteúdo de demonstração nos ficheiros de tradução). */
@Component({
  selector: 'app-info',
  imports: [PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="meta().title | t" [icon]="meta().icon" />
    <div class="container narrow info-page">
      @if (page() === 'faqs') {
        @for (f of faqs(); track $index) {
          <details class="faq"><summary>{{ f.q }}</summary><p>{{ f.a }}</p></details>
        }
      } @else if (page() === 'contactos') {
        <ul class="contact-list">
          <li><i class="fa fa-envelope"></i> info&#64;mobilelegis.com</li>
          <li><i class="fa fa-phone"></i> +258 21 000 000</li>
          <li><i class="fa fa-map-marker"></i> Maputo, Moçambique</li>
        </ul>
        <p class="muted small">{{ 'info.contactsNote' | t }}</p>
      } @else {
        @for (p of paragraphs(); track $index) { <p>{{ p }}</p> }
      }
    </div>
  `,
})
export class Info {
  private i18n = inject(I18nService);
  readonly page = input.required<string>();
  protected meta = computed(() => PAGES[this.page()] ?? PAGES['sobre']);
  protected paragraphs = computed(() => { this.i18n.lang(); return this.i18n.list<string>('info.' + this.page()); });
  protected faqs = computed(() => { this.i18n.lang(); return this.i18n.list<{ q: string; a: string }>('info.faqs'); });
}
