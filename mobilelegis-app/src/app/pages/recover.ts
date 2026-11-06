import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { I18N_PIPES } from '../core/pipes';
import { AuthLayout } from '../shared/auth-layout';

/** Recuperação de palavra-passe (simulação: nenhum e-mail é enviado). */
@Component({
  selector: 'app-recover',
  imports: [FormsModule, RouterLink, AuthLayout, ...I18N_PIPES],
  template: `
    <app-auth-layout>
      <form (ngSubmit)="sent.set(true)" class="auth-form">
        <p class="auth-text">{{ 'recover.text' | t }}</p>
        <label class="pill-input">
          <input type="email" name="email" [(ngModel)]="email" [placeholder]="'login.email' | t" required />
          <img src="images/icon_mail.png" alt="" />
        </label>
        @if (sent()) { <p class="form-ok">{{ 'recover.sent' | t }}</p> }
        <button class="btn btn-yellow btn-pill" type="submit" [disabled]="!email">{{ 'recover.submit' | t }}</button>
        <a routerLink="/login" class="auth-link">{{ 'common.back' | t }}</a>
      </form>
    </app-auth-layout>`,
})
export class Recover {
  protected email = '';
  protected sent = signal(false);
}
