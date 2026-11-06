import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { I18N_PIPES } from '../core/pipes';
import { LangSwitch } from '../shared/lang-switch';
import { ThemeToggle } from '../shared/theme-toggle';
import { BoService } from './bo.service';

@Component({
  selector: 'bo-login',
  imports: [FormsModule, RouterLink, LangSwitch, ThemeToggle, ...I18N_PIPES],
  template: `
    <div class="bo-login">
      <div class="bo-login-art">
        <div class="bo-login-quote">
          <img src="images/logo_blue.png" alt="" class="bo-login-logo" />
          <h2>{{ 'bo.login.tagline' | t }}</h2>
          <p>{{ 'bo.login.taglineText' | t }}</p>
          <ol class="bo-login-steps">
            <li><i class="fa fa-cloud-upload"></i> {{ 'bo.steps.upload' | t }}</li>
            <li><i class="fa fa-eye"></i> {{ 'bo.steps.read' | t }}</li>
            <li><i class="fa fa-code-fork"></i> {{ 'bo.steps.ops' | t }}</li>
            <li><i class="fa fa-history"></i> {{ 'bo.steps.consolidate' | t }}</li>
            <li><i class="fa fa-check-circle"></i> {{ 'bo.steps.publish' | t }}</li>
          </ol>
        </div>
      </div>
      <div class="bo-login-form">
        <div class="bo-login-prefs"><app-lang-switch /><app-theme-toggle /></div>
        <form (ngSubmit)="submit()" class="bo-login-box">
          <img src="images/logo_blue.png" alt="Mobilelegis" class="bo-login-brand" />
          <h1>{{ 'bo.login.title' | t }}</h1>
          <p class="muted">{{ 'bo.login.subtitle' | t }}</p>
          <label class="field"><span>{{ 'login.email' | t }}</span>
            <input class="form-control" type="email" name="email" [(ngModel)]="email" autocomplete="username" required /></label>
          <label class="field"><span>{{ 'login.password' | t }}</span>
            <input class="form-control" type="password" name="password" [(ngModel)]="password" autocomplete="current-password" required /></label>
          @if (error()) { <p class="form-error"><i class="fa fa-exclamation-circle"></i> {{ 'login.error' | t }}</p> }
          <button class="btn btn-yellow btn-block" type="submit">{{ 'login.submit' | t }}</button>
          <p class="small muted bo-demo-cred"><i class="fa fa-info-circle"></i> {{ 'bo.login.demo' | t }}: admin&#64;mobilelegis.co.mz / admin</p>
          <a routerLink="/login" class="small bo-back-app"><i class="fa fa-angle-left"></i> {{ 'bo.login.backToApp' | t }}</a>
        </form>
      </div>
    </div>
  `,
})
export class BoLogin {
  private bo = inject(BoService);
  private router = inject(Router);
  protected email = 'admin@mobilelegis.co.mz';
  protected password = 'admin';
  protected error = signal(false);

  submit() {
    if (this.bo.login(this.email, this.password)) this.router.navigateByUrl('/backoffice');
    else this.error.set(true);
  }
}
