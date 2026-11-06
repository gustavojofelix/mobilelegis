import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { I18N_PIPES } from '../core/pipes';
import { PaymentMethod, Transaction, Voucher } from '../core/models';

const METHODS: { id: PaymentMethod; name: string; prefixes: string[]; color: string }[] = [
  { id: 'mpesa', name: 'M-Pesa', prefixes: ['84', '85'], color: '#e4002b' },
  { id: 'emola', name: 'E-Mola', prefixes: ['86', '87'], color: '#f39200' },
  { id: 'mkesh', name: 'mKesh', prefixes: ['82', '83'], color: '#0067b1' },
];

/** Modal de pagamento por carteira móvel (simulação PaySuite). */
@Component({
  selector: 'app-payment-modal',
  imports: [FormsModule, ...I18N_PIPES],
  template: `
    <div class="modal-backdrop" (click)="step() !== 'waiting' && closed.emit()">
      <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h2>{{ 'pay.title' | t }}</h2>
          @if (step() !== 'waiting') { <button type="button" class="icon-link" (click)="closed.emit()" [attr.aria-label]="'common.close' | t"><i class="fa fa-times fa-lg"></i></button> }
        </header>

        <p class="muted">{{ description() }}</p>

        @switch (step()) {
          @case ('form') {
            @if (allowVoucher()) {
              <label class="field">
                <span>{{ 'plans.voucher' | t }}</span>
                <div class="row">
                  <input class="form-control" [(ngModel)]="voucherCode" placeholder="LEGIS10" autocapitalize="characters" />
                  <button type="button" class="btn btn-light" (click)="applyVoucher()">{{ 'plans.apply' | t }}</button>
                </div>
              </label>
              @if (voucherState() === 'ok') { <p class="form-ok"><i class="fa fa-check"></i> {{ 'plans.voucherOk' | t: { v: voucher()!.code } }}</p> }
              @if (voucherState() === 'bad') { <p class="form-error">{{ 'plans.voucherBad' | t }}</p> }
            }

            <fieldset class="methods">
              <legend>{{ 'pay.method' | t }}</legend>
              @for (m of methods; track m.id) {
                <label class="method" [class.on]="method() === m.id" [style.--brand]="m.color">
                  <input type="radio" name="method" [value]="m.id" [checked]="method() === m.id" (change)="method.set(m.id)" />
                  <span class="dot"></span>{{ m.name }}
                </label>
              }
            </fieldset>

            <label class="field">
              <span>{{ 'pay.phone' | t }}</span>
              <div class="row phone">
                <span class="prefix">+258</span>
                <input class="form-control" inputmode="numeric" maxlength="9" [ngModel]="phone()" (ngModelChange)="phone.set($event)" placeholder="84 123 4567" />
              </div>
              <small class="muted">{{ 'pay.phoneHelp' | t }}</small>
            </label>
            @if (phoneTouched() && !phoneValid()) { <p class="form-error">{{ 'pay.phoneBad' | t }}</p> }

            <div class="totals">
              @if (voucher()) {
                <div><span>{{ 'common.price' | t }}</span><s>{{ price() | money }}</s></div>
                <div><span>{{ 'plans.discount' | t }} ({{ voucher()!.code }})</span><span>−{{ price() - total() | money }}</span></div>
              }
              <div class="total"><span>{{ 'common.total' | t }}</span><strong>{{ total() | money }}</strong></div>
            </div>

            <button type="button" class="btn btn-yellow btn-block" (click)="pay()">{{ 'pay.pay' | t: { v: (total() | money) } }}</button>
          }
          @case ('waiting') {
            <div class="center">
              <div class="spinner"></div>
              <p>{{ 'pay.waiting' | t }}</p>
            </div>
          }
          @case ('done') {
            <div class="center">
              <div class="success-ico"><i class="fa fa-check"></i></div>
              <h3>{{ 'pay.success' | t }}</h3>
              <p>{{ 'pay.invoice' | t: { n: tx()!.invoice, email: auth.user()!.email } }}</p>
              <p class="muted">{{ 'pay.ref' | t: { r: tx()!.paysuiteRef } }}</p>
              <button type="button" class="btn btn-yellow btn-block" (click)="closed.emit()">{{ 'common.close' | t }}</button>
            </div>
          }
        }
      </div>
    </div>`,
})
export class PaymentModal {
  protected auth = inject(AuthService);
  readonly description = input.required<string>();
  readonly price = input.required<number>();
  readonly kind = input<'plans' | 'diplomas'>('diplomas');
  readonly allowVoucher = input(true);
  readonly paid = output<Transaction>();
  readonly closed = output<void>();

  protected methods = METHODS;
  protected step = signal<'form' | 'waiting' | 'done'>('form');
  protected method = signal<PaymentMethod>('mpesa');
  protected phone = signal(this.auth.user()?.phone.replace(/\D/g, '').slice(-9) ?? '');
  protected phoneTouched = signal(false);
  protected voucherCode = '';
  protected voucher = signal<Voucher | null>(null);
  protected voucherState = signal<'' | 'ok' | 'bad'>('');
  protected tx = signal<Transaction | null>(null);

  protected total = computed(() => this.auth.applyVoucher(this.price(), this.voucher()));
  protected phoneValid = computed(() => {
    const p = this.phone().replace(/\D/g, '');
    return p.length === 9 && METHODS.find(m => m.id === this.method())!.prefixes.includes(p.slice(0, 2));
  });

  applyVoucher() {
    const v = this.auth.findVoucher(this.voucherCode, this.kind());
    this.voucher.set(v);
    this.voucherState.set(v ? 'ok' : 'bad');
  }

  pay() {
    this.phoneTouched.set(true);
    if (!this.phoneValid()) return;
    this.step.set('waiting');
    // Simula o pedido push (USSD) e a confirmação instantânea pela PaySuite
    setTimeout(() => {
      const tx = this.auth.recordPayment(this.description(), this.total(), this.method(), this.phone().replace(/\D/g, ''), this.voucher()?.code);
      this.tx.set(tx);
      this.step.set('done');
      this.paid.emit(tx);
    }, 2200);
  }
}
