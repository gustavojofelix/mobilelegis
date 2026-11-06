import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { NewsService } from '../core/news.service';
import { I18N_PIPES } from '../core/pipes';

/** "Escolha da legislação" — selecção de área, como no site Mobilelegis. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, ...I18N_PIPES],
  template: `
    <div class="container">
      <section class="intro">
        <h1>{{ 'home.title' | t }}</h1>
        <p>{{ 'home.subtitle1' | t }}<br />{{ 'home.subtitle2' | t }}</p>
      </section>

      <nav class="home-tools" [attr.aria-label]="'home.tools' | t">
        <a routerLink="/consultor" class="home-tool ai"><i class="fa fa-comments"></i><b>{{ 'nav.consultant' | t }}</b><span>{{ 'home.toolAi' | t }}</span></a>
        <a routerLink="/jurisprudencia" class="home-tool"><i class="fa fa-gavel"></i><b>{{ 'case.title' | t }}</b><span>{{ 'home.toolCases' | t: { n: data.cases().length } }}</span></a>
        <a routerLink="/minutas" class="home-tool"><i class="fa fa-file-text-o"></i><b>{{ 'tpl.title' | t }}</b><span>{{ 'home.toolTpl' | t: { n: data.templates().length } }}</span></a>
        <a routerLink="/novidades" class="home-tool"><i class="fa fa-bell"></i><b>{{ 'news.title' | t }}</b>
          <span>@if (news.unread()) { {{ 'home.toolNewsN' | t: { n: news.unread() } }} } @else { {{ 'home.toolNews' | t }} }</span></a>
      </nav>

      <div class="area-grid">
        @for (a of data.areas(); track a.id) {
          <a class="area-card" [routerLink]="['/area', a.id]" [style.background-image]="'url(' + a.image + ')'">
            <span class="area-overlay"></span>
            <span class="area-content">
              <span class="area-icon"><img src="images/logo_backoffice.png" alt="" /><b>{{ a.number }}</b></span>
              <span class="area-title">{{ a.name | loc }}</span>
            </span>
            <span class="area-state">
              @if (auth.hasArea(a.id)) {
                <i class="fa fa-unlock" [title]="'home.unlocked' | t"></i>
              } @else {
                <i class="fa fa-shopping-cart buy" [title]="'home.buyable' | t"></i>
                <i class="fa fa-lock" [title]="'common.locked' | t"></i>
              }
            </span>
          </a>
        }
      </div>
    </div>
  `,
})
export class Home {
  protected data = inject(DataService);
  protected auth = inject(AuthService);
  protected news = inject(NewsService);
}
