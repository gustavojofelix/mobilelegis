import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { Plan, PlanType } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { PageTitle } from '../shared/page-title';
import { PaymentModal } from '../shared/payment-modal';

/** Subscrições: Plano Básico (áreas à escolha) e Plano Ilimitado, com duração de 1, 3, 6 ou 12 meses. */
@Component({
  selector: 'app-plans',
  imports: [PageTitle, PaymentModal, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'nav.subscriptions' | t" icon="user" />
    <div class="container narrow">
      @if (auth.subscriptionActive()) {
        <div class="notice notice-ok">{{ 'plans.current' | t }}: <strong>{{ 'plans.' + sub()!.plan | t }}</strong> — {{ 'personal.validUntil' | t }} {{ sub()!.end | dt }}</div>
      }

      <div class="plan-grid">
        @for (p of data.plansData().plans; track p.id) {
          <div class="plan-card">
            <h2>{{ 'plans.' + p.id | t }}</h2>
            <ul class="checks">
              <li><i class="fa fa-check"></i> {{ p.maxAreas ? ('plans.featAreas' | t: { n: p.maxAreas }) : ('plans.featUnlimited' | t) }}</li>
              <li><i class="fa fa-check"></i> {{ 'plans.featSearch' | t }}</li>
              <li><i class="fa fa-check"></i> {{ 'plans.featCopy' | t }}</li>
              <li><i class="fa fa-check"></i> {{ 'plans.featNotes' | t }}</li>
              <li><i class="fa fa-check"></i> {{ 'plans.featBuy' | t }}</li>
            </ul>

            <label class="field"><span>{{ 'plans.duration' | t }}:</span>
              <select class="form-control" [value]="months()[p.id] ?? ''" (change)="setMonths(p.id, $any($event.target).value)">
                <option value="">{{ 'plans.durationPh' | t }}</option>
                @for (x of p.prices; track x.months) {
                  <option [value]="x.months">{{ x.months }} {{ (x.months === 1 ? 'common.month' : 'common.months') | t }} — {{ x.price | money }}</option>
                }
              </select>
            </label>

            <div class="field"><span>{{ 'plans.areas' | t }}:</span>
              @if (p.maxAreas) {
                <div class="multi" [class.open]="openPicker() === p.id">
                  <button type="button" class="form-control multi-toggle" (click)="openPicker.set(openPicker() === p.id ? '' : p.id)" [attr.aria-expanded]="openPicker() === p.id">
                    <span>{{ areas().length ? ('plans.areasSelected' | t: { n: areas().length, max: p.maxAreas }) : ('plans.areasPh' | t) }}</span>
                    <i class="fa fa-caret-down"></i>
                  </button>
                  @if (openPicker() === p.id) {
                    <div class="multi-menu">
                      @for (a of data.areas(); track a.id) {
                        <label class="check" [class.disabled]="!areas().includes(a.id) && areas().length >= p.maxAreas">
                          <input type="checkbox" [checked]="areas().includes(a.id)"
                                 [disabled]="!areas().includes(a.id) && areas().length >= p.maxAreas" (change)="toggle(a.id, p.maxAreas)" />
                          {{ a.name | loc }}
                        </label>
                      }
                    </div>
                  }
                </div>
              } @else {
                <p>{{ 'common.all' | t }}</p>
              }
            </div>

            @if (priceOf(p); as price) { <p class="plan-price">{{ price | money }}</p> }
            @if (error() && errorPlan() === p.id) { <p class="form-error">{{ error() | t }}</p> }
            <button type="button" class="btn btn-yellow btn-block" (click)="start(p)">{{ 'plans.subscribe' | t }}</button>
          </div>
        }
      </div>
    </div>

    @if (paying(); as p) {
      <app-payment-modal [description]="description(p)" [price]="priceOf(p)!" kind="plans"
                         (paid)="activate(p)" (closed)="paying.set(null)" />
    }
  `,
})
export class Plans {
  protected data = inject(DataService);
  protected auth = inject(AuthService);
  private i18n = inject(I18nService);
  protected months = signal<Partial<Record<PlanType, number>>>({});
  protected areas = signal<string[]>((this.auth.user()?.subscription?.areas ?? this.auth.user()?.trialAreas ?? []).slice(0, 5));
  protected openPicker = signal('');
  protected paying = signal<Plan | null>(null);
  protected error = signal('');
  protected errorPlan = signal('');
  protected sub = computed(() => this.auth.user()?.subscription);

  setMonths(id: PlanType, v: string) { this.months.update(m => ({ ...m, [id]: v ? +v : undefined })); }
  priceOf(p: Plan) { const m = this.months()[p.id]; return m ? p.prices.find(x => x.months === m)?.price ?? null : null; }
  description(p: Plan) {
    const m = this.months()[p.id]!;
    return `${this.i18n.t('plans.' + p.id)} · ${m} ${this.i18n.t(m === 1 ? 'common.month' : 'common.months')}`;
  }

  toggle(id: string, max: number) {
    this.areas.update(a => a.includes(id) ? a.filter(x => x !== id) : a.length < max ? [...a, id] : a);
  }

  start(p: Plan) {
    this.errorPlan.set(p.id);
    if (!this.months()[p.id]) { this.error.set('plans.durationRequired'); return; }
    if (p.maxAreas && !this.areas().length) { this.error.set('plans.areasRequired'); return; }
    this.error.set('');
    this.openPicker.set('');
    this.paying.set(p);
  }

  activate(p: Plan) {
    const all = this.data.areas().map(a => a.id);
    this.auth.subscribe(p.id, this.months()[p.id]!, p.maxAreas ? this.areas() : all);
  }
}
