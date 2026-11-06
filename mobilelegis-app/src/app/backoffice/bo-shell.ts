import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18N_PIPES } from '../core/pipes';
import { LangSwitch } from '../shared/lang-switch';
import { ThemeToggle } from '../shared/theme-toggle';
import { BoService } from './bo.service';

@Component({
  selector: 'bo-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LangSwitch, ThemeToggle, ...I18N_PIPES],
  template: `
    <div class="bo-app" [class.nav-open]="navOpen()">
      <aside class="bo-side" (click)="onNavClick($event)">
        <a routerLink="/backoffice" class="bo-side-brand">
          <img src="images/logo_blue.png" alt="Mobilelegis" />
          <span>Back office</span>
        </a>
        <nav class="bo-nav">
          <a routerLink="/backoffice" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><i class="fa fa-th-large"></i> {{ 'bo.nav.dashboard' | t }}</a>
          <a routerLink="/backoffice/dossier/laci047" routerLinkActive="active"><i class="fa fa-magic"></i> {{ 'bo.nav.consolidation' | t }}
            @if (bo.state().started && !bo.state().publishedAt) { <span class="bo-nav-badge">1</span> }</a>
          <a routerLink="/backoffice/diplomas" routerLinkActive="active"><i class="fa fa-book"></i> {{ 'bo.nav.diplomas' | t }}</a>
          <a routerLink="/backoffice/utilizadores" routerLinkActive="active"><i class="fa fa-users"></i> {{ 'bo.nav.users' | t }}</a>
        </nav>
        <div class="bo-side-foot">
          <span class="bo-ai-chip"><i class="fa fa-bolt"></i> {{ 'bo.nav.aiOn' | t }}</span>
          <a routerLink="/" class="bo-nav-app"><i class="fa fa-external-link"></i> {{ 'bo.nav.openApp' | t }}</a>
        </div>
      </aside>
      <div class="bo-backdrop" (click)="navOpen.set(false)"></div>

      <div class="bo-main">
        <header class="bo-top">
          <button type="button" class="icon-link bo-burger" (click)="navOpen.set(true)" [attr.aria-label]="'nav.menu' | t"><i class="fa fa-bars fa-lg"></i></button>
          <div class="bo-top-right">
            <app-lang-switch />
            <app-theme-toggle />
            <span class="bo-user"><span class="bo-avatar">{{ initials() }}</span><span class="hide-sm">{{ bo.admin()?.name }}</span></span>
            <button type="button" class="icon-link" (click)="logout()" [title]="'nav.logout' | t" [attr.aria-label]="'nav.logout' | t"><i class="fa fa-power-off"></i></button>
          </div>
        </header>
        <main class="bo-content"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class BoShell {
  protected bo = inject(BoService);
  private router = inject(Router);
  protected navOpen = signal(false);

  initials() { return (this.bo.admin()?.name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join(''); }
  onNavClick(ev: Event) { if ((ev.target as HTMLElement).closest('a')) this.navOpen.set(false); }
  logout() { this.bo.logout(); this.router.navigateByUrl('/backoffice/login'); }
}
