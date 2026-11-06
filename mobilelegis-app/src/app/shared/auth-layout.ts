import { Component } from '@angular/core';
import { LangSwitch } from './lang-switch';
import { ThemeToggle } from './theme-toggle';

/** Moldura das páginas de entrada (login, registo, recuperação), igual ao site Mobilelegis. */
@Component({
  selector: 'app-auth-layout',
  imports: [LangSwitch, ThemeToggle],
  template: `
    <div class="auth-page">
      <div class="auth-prefs"><app-lang-switch /><app-theme-toggle /></div>
      <p class="dev-by">Developed by <strong>LAW TECHNOLOGY SOLUTIONS LDA (LTS)</strong></p>
      <div class="logo-plate">
        <img class="logo-lts" src="images/logo_blue.png" alt="Law Technology Solutions" />
        <img class="logo-ml" src="images/logo.png" alt="Mobilelegis" />
      </div>
      <div class="auth-body"><ng-content /></div>
    </div>`,
})
export class AuthLayout {}
