import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth.service';
import { I18N_PIPES } from './core/pipes';
import { LangSwitch } from './shared/lang-switch';
import { ThemeToggle } from './shared/theme-toggle';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, LangSwitch, ThemeToggle, ...I18N_PIPES],
  template: `
    <header class="topbar">
      <div class="container topbar-inner">
        <div class="topbar-left">
          <a routerLink="/" class="brand" [attr.aria-label]="'nav.areaSelection' | t">
            <img src="images/logo_backoffice.png" alt="Mobilelegis" />
          </a>
          @if (!isHome()) {
            <span class="brand-title">{{ 'nav.legislation' | t }}</span>
            <a routerLink="/" class="back-area"><i class="fa fa-chevron-left"></i> <span>{{ 'nav.areaSelection' | t }}</span></a>
          }
        </div>
        <nav class="topbar-right" aria-label="Menu">
          <a routerLink="/pesquisa" class="icon-link" [attr.aria-label]="'nav.search' | t" [title]="'nav.search' | t"><i class="fa fa-search fa-lg"></i></a>
          <a routerLink="/carrinho" class="icon-link cart" [attr.aria-label]="'nav.cart' | t" [title]="'nav.cart' | t">
            <i class="fa fa-shopping-cart fa-lg"></i><span class="cart-badge">{{ auth.cartCount() }}</span>
          </a>
          <span class="hide-sm"><app-lang-switch /></span>
          <span class="hide-sm"><app-theme-toggle /></span>
          <button type="button" class="icon-link" (click)="auth.logout()" [attr.aria-label]="'nav.logout' | t" [title]="'nav.logout' | t"><i class="fa fa-power-off"></i></button>
          <button type="button" class="icon-link" (click)="menuOpen.set(true)" [attr.aria-label]="'nav.menu' | t"><i class="fa fa-bars fa-lg"></i></button>
        </nav>
      </div>
    </header>

    @if (auth.blocked()) {
      <div class="status-bar blocked">
        <div class="container status-inner">
          <span><i class="fa fa-lock"></i> {{ 'trial.expired' | t }}</span>
          <a routerLink="/subscricoes" class="btn btn-yellow btn-sm">{{ 'trial.subscribe' | t }}</a>
        </div>
      </div>
    } @else if (!auth.subscriptionActive()) {
      <div class="status-bar">
        <div class="container status-inner">
          <span><i class="fa fa-clock-o"></i> {{ 'trial.active' | t: { n: auth.trialDaysLeft() } }}</span>
          <a routerLink="/subscricoes" class="link-strong">{{ 'trial.subscribe' | t }} <i class="fa fa-angle-right"></i></a>
        </div>
      </div>
    }

    <main class="main"><router-outlet /></main>

    <footer class="footer">
      <div class="container">
        <span>Developed by LAW TECHNOLOGY SOLUTIONS LDA (LTS)</span>
        <span class="muted">{{ 'app.demo' | t }}</span>
      </div>
    </footer>

    @if (menuOpen()) {
      <div class="menu-overlay" role="dialog" aria-modal="true" [attr.aria-label]="'nav.menu' | t">
        <div class="container menu-head">
          <span class="menu-title">{{ 'nav.menu' | t }}</span>
          <button type="button" class="icon-link" (click)="menuOpen.set(false)" [attr.aria-label]="'common.close' | t"><i class="fa fa-times fa-lg"></i></button>
        </div>
        <div class="menu-body" (click)="onMenuClick($event)">
          <section>
            <i class="fa fa-user menu-ico"></i>
            <a routerLink="/dados-acesso">{{ 'nav.accessData' | t }}</a>
            <a routerLink="/dados-pessoais">{{ 'nav.personalData' | t }}</a>
            <a routerLink="/subscricoes">{{ 'nav.subscriptions' | t }}</a>
            <a routerLink="/carrinho">{{ 'nav.cart' | t }}</a>
          </section>
          <section>
            <i class="fa fa-cog menu-ico"></i>
            <a routerLink="/favoritos">{{ 'nav.favorites' | t }}</a>
          </section>
          <section class="menu-prefs">
            <i class="fa fa-sliders menu-ico"></i>
            <app-lang-switch />
            <app-theme-toggle [label]="true" />
          </section>
          <section>
            <i class="fa fa-map-marker menu-ico"></i>
            <a routerLink="/info/sobre">{{ 'nav.about' | t }}</a>
            <a routerLink="/info/contactos">{{ 'nav.contacts' | t }}</a>
            <a routerLink="/info/faqs">{{ 'nav.faqs' | t }}</a>
            <a routerLink="/info/privacidade">{{ 'nav.privacy' | t }}</a>
            <a routerLink="/info/termos">{{ 'nav.terms' | t }}</a>
          </section>
          <section>
            <i class="fa fa-power-off menu-ico"></i>
            <button type="button" class="linklike" (click)="auth.logout()">{{ 'nav.logout' | t }}</button>
          </section>
        </div>
      </div>
    }
  `,
})
export class Shell {
  protected auth = inject(AuthService);
  private router = inject(Router);
  protected menuOpen = signal(false);
  protected isHome = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url.split(/[?#]/)[0] === '/')),
    { initialValue: this.router.url.split(/[?#]/)[0] === '/' },
  );

  /** Fecha o menu ao escolher uma ligação. */
  onMenuClick(ev: Event) {
    if ((ev.target as HTMLElement).closest('a')) this.menuOpen.set(false);
  }
}
