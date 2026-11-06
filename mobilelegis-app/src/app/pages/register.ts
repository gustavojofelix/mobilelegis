import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18N_PIPES } from '../core/pipes';
import { AuthLayout } from '../shared/auth-layout';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AuthLayout, ...I18N_PIPES],
  template: `
    <app-auth-layout>
      <form (ngSubmit)="submit()" class="auth-form wide">
        <label class="pill-input"><input name="name" [(ngModel)]="f.name" [placeholder]="'personal.name' | t" required /></label>
        <label class="pill-input"><input type="email" name="email" [(ngModel)]="f.email" [placeholder]="'login.email' | t" required /></label>
        <label class="pill-input"><input name="phone" inputmode="tel" [(ngModel)]="f.phone" [placeholder]="'personal.phone' | t" /></label>
        <label class="pill-input"><input name="profession" [(ngModel)]="f.profession" [placeholder]="'personal.profession' | t" /></label>
        <label class="pill-input"><input type="password" name="password" [(ngModel)]="f.password" [placeholder]="'login.password' | t" required /></label>

        <fieldset class="area-checks">
          <legend>{{ 'register.areas' | t }}</legend>
          @for (a of data.areas(); track a.id) {
            <label class="check"><input type="checkbox" [checked]="areas().includes(a.id)" (change)="toggle(a.id)" /> {{ a.name | loc }}</label>
          }
        </fieldset>
        <p class="info-note">{{ 'register.trialInfo' | t: { n: data.plansData().trialDays } }}</p>

        @if (error()) { <p class="form-error">{{ error() | t }}</p> }
        <button class="btn btn-yellow btn-pill" type="submit">{{ 'register.submit' | t }}</button>
      </form>
      <p class="auth-foot">{{ 'register.haveAccount' | t }} <a routerLink="/login">{{ 'login.signIn' | t }}</a></p>
    </app-auth-layout>`,
})
export class Register {
  protected data = inject(DataService);
  private auth = inject(AuthService);
  private router = inject(Router);
  protected f = { name: '', email: '', phone: '', profession: '', password: '' };
  protected areas = signal<string[]>([]);
  protected error = signal('');

  toggle(id: string) { this.areas.update(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]); }

  submit() {
    if (!this.f.name || !this.f.email || !this.f.password || !this.areas().length) { this.error.set('register.required'); return; }
    if (!this.auth.register({ ...this.f, trialAreas: this.areas() })) { this.error.set('register.exists'); return; }
    this.router.navigateByUrl('/');
  }
}
