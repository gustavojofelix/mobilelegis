import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18N_PIPES } from '../core/pipes';
import { AuthLayout } from '../shared/auth-layout';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthLayout, ...I18N_PIPES],
  template: `
    <app-auth-layout>
      <form (ngSubmit)="submit()" class="auth-form">
        <label class="pill-input">
          <input type="email" name="email" [(ngModel)]="email" [placeholder]="'login.email' | t" autocomplete="username" required />
          <img src="images/icon_mail.png" alt="" />
        </label>
        <label class="pill-input">
          <input [type]="show() ? 'text' : 'password'" name="password" [(ngModel)]="password" [placeholder]="'login.password' | t" autocomplete="current-password" required />
          <button type="button" class="eye" (click)="show.set(!show())" [attr.aria-label]="'login.showPassword' | t">
            <i class="fa" [class.fa-eye-slash]="!show()" [class.fa-eye]="show()"></i>
          </button>
        </label>
        @if (error()) { <p class="form-error">{{ 'login.error' | t }}</p> }
        <button class="btn btn-yellow btn-pill" type="submit">{{ 'login.submit' | t }}</button>
        <a routerLink="/recuperar" class="auth-link">{{ 'login.trouble' | t }}</a>
      </form>
      <p class="auth-foot">{{ 'login.noAccount' | t }} <a routerLink="/registo">{{ 'login.register' | t }}</a></p>
    </app-auth-layout>`,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private demo = inject(DataService).seedUsers()[0];
  // Conta de demonstração pré-preenchida
  protected email = this.demo?.email ?? '';
  protected password = this.demo?.password ?? '';
  protected show = signal(false);
  protected error = signal(false);

  submit() {
    if (this.auth.login(this.email, this.password)) this.router.navigateByUrl('/');
    else this.error.set(true);
  }
}
