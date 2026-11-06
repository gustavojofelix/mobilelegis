import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { I18N_PIPES } from '../core/pipes';
import { PageTitle } from '../shared/page-title';

const COUNTRIES = ['Moçambique', 'Angola', 'Brasil', 'Cabo Verde', 'Guiné-Bissau', 'Portugal', 'São Tomé e Príncipe', 'Timor-Leste', 'África do Sul', 'Outro'];

@Component({
  selector: 'app-personal-data',
  imports: [FormsModule, RouterLink, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'personal.title' | t" icon="user" />
    @if (auth.user(); as u) {
      <div class="container narrow">
        <form class="form-grid" (ngSubmit)="save()">
          <label class="field span-2"><span>{{ 'personal.name' | t }}</span><input class="form-control" name="name" [(ngModel)]="f.name" /></label>
          <label class="field"><span>{{ 'personal.profession' | t }}</span><input class="form-control" name="profession" [(ngModel)]="f.profession" /></label>
          <label class="field"><span>{{ 'personal.qualifications' | t }}</span><input class="form-control" name="qualifications" [(ngModel)]="f.qualifications" /></label>
          <label class="field"><span>{{ 'personal.company' | t }}</span><input class="form-control" name="company" [(ngModel)]="f.company" /></label>
          <label class="field"><span>{{ 'personal.birthDate' | t }}</span><input class="form-control" type="date" name="birthDate" [(ngModel)]="f.birthDate" /></label>
          <div class="span-2 form-grid three">
            <label class="field"><span>{{ 'personal.country' | t }}</span>
              <select class="form-control" name="country" [(ngModel)]="f.country">
                @for (c of countries; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </label>
            <label class="field"><span>{{ 'personal.city' | t }}</span><input class="form-control" name="city" [(ngModel)]="f.city" /></label>
            <label class="field"><span>{{ 'personal.address' | t }}</span><input class="form-control" name="address" [(ngModel)]="f.address" /></label>
          </div>
          <label class="field"><span>{{ 'personal.postalCode' | t }}</span><input class="form-control" name="postalCode" [(ngModel)]="f.postalCode" /></label>
          <span class="hide-sm"></span>
          <label class="field"><span>{{ 'personal.phone' | t }}</span><input class="form-control" name="phone" inputmode="tel" [(ngModel)]="f.phone" /></label>
          <span class="hide-sm"></span>
          <label class="field"><span>NUIT</span><input class="form-control" name="nuit" inputmode="numeric" [(ngModel)]="f.nuit" /></label>
          <label class="field"><span>Email</span><input class="form-control" [value]="u.email" disabled /></label>
        </form>

        <h2 class="block-title">{{ 'nav.subscriptions' | t }}</h2>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>{{ 'personal.plan' | t }}</th><th>{{ 'personal.subscribedAt' | t }}</th><th>{{ 'personal.validUntil' | t }}</th><th>{{ 'personal.state' | t }}</th></tr></thead>
            <tbody>
              @if (u.subscription; as s) {
                <tr>
                  <td>{{ 'plans.' + s.plan | t }}</td>
                  <td>{{ s.start | dt: true }}</td>
                  <td><ul class="cell-list">@for (a of s.areas; track a) { <li>{{ areaName(a) }} ({{ s.end | dt }})</li> }</ul></td>
                  <td>{{ (auth.subscriptionActive() ? 'personal.active' : 'personal.expired') | t }}</td>
                </tr>
              }
              <tr>
                <td>{{ 'personal.trial' | t }}</td>
                <td>{{ u.trialStart | dt }}</td>
                <td><ul class="cell-list">@for (a of u.trialAreas; track a) { <li>{{ areaName(a) }} ({{ auth.trialEnd()! | dt }})</li> }</ul></td>
                <td>{{ (auth.trialActive() ? 'personal.active' : 'personal.expired') | t }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <a routerLink="/subscricoes" class="link-strong">{{ 'trial.subscribe' | t }} <i class="fa fa-angle-right"></i></a>

        <h2 class="block-title">{{ 'personal.devices' | t }}</h2>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>{{ 'personal.platform' | t }}</th><th>{{ 'personal.platformVersion' | t }}</th><th>Browser</th><th>{{ 'personal.browserVersion' | t }}</th><th>{{ 'personal.deviceType' | t }}</th><th></th></tr></thead>
            <tbody>
              @for (dv of u.devices; track dv.id) {
                <tr>
                  <td>{{ dv.platform }} @if (dv.current) { <span class="tag tag-ok">{{ 'personal.thisDevice' | t }}</span> }</td>
                  <td>{{ dv.platformVersion }}</td><td>{{ dv.browser }}</td><td>{{ dv.browserVersion }}</td><td>{{ dv.type }}</td>
                  <td class="actions">@if (!dv.current) { <button type="button" class="btn btn-danger btn-xs" (click)="removeDevice(dv.id)" [attr.aria-label]="'common.remove' | t"><i class="fa fa-trash"></i></button> }</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <h2 class="block-title">{{ 'personal.purchases' | t }}</h2>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>{{ 'personal.date' | t }}</th><th>{{ 'personal.description' | t }}</th><th>{{ 'personal.invoice' | t }}</th><th class="num">{{ 'common.total' | t }}</th></tr></thead>
            <tbody>
              @for (tx of u.transactions; track tx.id) {
                <tr>
                  <td>{{ tx.date | dt: true }}</td>
                  <td>{{ tx.description }}<br /><span class="small muted">{{ methodName(tx.method) }} · {{ tx.paysuiteRef }}@if (tx.voucher) { · {{ tx.voucher }} }</span></td>
                  <td>{{ tx.invoice }}</td>
                  <td class="num">{{ tx.amount | money }}</td>
                </tr>
              } @empty { <tr><td colspan="4" class="center">{{ 'common.noData' | t }}</td></tr> }
            </tbody>
          </table>
        </div>

        <div class="demo-box">
          <p class="block-title small">{{ 'personal.demo' | t }}</p>
          <label class="check"><input type="checkbox" [checked]="!!u.demoTrialExpired" (change)="toggleExpired()" /> {{ 'personal.simulateExpired' | t }}</label>
          <button type="button" class="btn btn-light btn-sm" (click)="auth.resetDemo()">{{ 'personal.resetDemo' | t }}</button>
        </div>

        @if (confirmDelete()) {
          <div class="notice notice-danger">
            <p>{{ 'personal.deleteText' | t }}</p>
            <div class="dip-row-actions left">
              <button type="button" class="btn btn-danger" (click)="auth.deleteAccount()">{{ 'personal.deleteConfirm' | t }}</button>
              <button type="button" class="btn btn-light" (click)="confirmDelete.set(false)">{{ 'common.cancel' | t }}</button>
            </div>
          </div>
        }
        <div class="form-actions">
          <button type="button" class="btn btn-danger" (click)="confirmDelete.set(true)">{{ 'personal.delete' | t }}</button>
          <button type="button" class="btn btn-yellow btn-wide" (click)="save()">{{ saved() ? ('common.saved' | t) : ('common.save' | t) }}</button>
        </div>
      </div>
    }
  `,
})
export class PersonalData {
  protected auth = inject(AuthService);
  private data = inject(DataService);
  private i18n = inject(I18nService);
  protected countries = COUNTRIES;
  private u = computed(() => this.auth.user()!);
  protected f = {
    name: this.u().name, profession: this.u().profession, qualifications: this.u().qualifications, company: this.u().company,
    birthDate: this.u().birthDate, country: this.u().country, city: this.u().city, address: this.u().address,
    postalCode: this.u().postalCode, phone: this.u().phone, nuit: this.u().nuit,
  };
  protected saved = signal(false);
  protected confirmDelete = signal(false);

  save() {
    this.auth.update(u => Object.assign(u, this.f));
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
  removeDevice(id: string) { this.auth.update(u => u.devices = u.devices.filter(d => d.id !== id)); }
  toggleExpired() { this.auth.update(u => u.demoTrialExpired = !u.demoTrialExpired); }
  areaName(id: string) { return this.i18n.loc(this.data.area(id)?.name) || id; }
  methodName(m: string) { return ({ mpesa: 'M-Pesa', emola: 'E-Mola', mkesh: 'mKesh' } as Record<string, string>)[m] ?? m; }
}
