import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { Diploma } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { PageTitle } from '../shared/page-title';
import { PaymentModal } from '../shared/payment-modal';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, PageTitle, PaymentModal, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'nav.cart' | t" icon="shopping-cart" />
    <div class="container narrow">
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>{{ 'cart.diploma' | t }}</th><th class="num">{{ 'common.price' | t }}</th><th></th></tr></thead>
          <tbody>
            @for (d of items(); track d.id) {
              <tr>
                <td><a [routerLink]="['/diploma', d.id]">{{ d.title }}</a></td>
                <td class="num">{{ d.price | money }}</td>
                <td class="actions"><button type="button" class="btn btn-danger btn-xs" (click)="auth.removeFromCart(d.id)" [attr.aria-label]="'common.remove' | t"><i class="fa fa-trash"></i></button></td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="center">{{ 'common.noData' | t }}</td></tr>
            }
          </tbody>
          @if (items().length) {
            <tfoot><tr><th>{{ 'common.total' | t }}</th><th class="num">{{ total() | money }}</th><th></th></tr></tfoot>
          }
        </table>
      </div>
      @if (items().length) {
        <div class="form-actions"><span></span><button type="button" class="btn btn-yellow btn-wide" (click)="paying.set(true)">{{ 'cart.checkout' | t }}</button></div>
      }
    </div>
    @if (paying()) {
      <app-payment-modal [description]="description()" [price]="total()" kind="diplomas"
                         (paid)="auth.buyDiplomas(ids())" (closed)="paying.set(false)" />
    }
  `,
})
export class Cart {
  protected auth = inject(AuthService);
  private data = inject(DataService);
  private i18n = inject(I18nService);
  protected paying = signal(false);
  protected items = computed<Diploma[]>(() => (this.auth.user()?.cart ?? []).map(id => this.data.diploma(id)).filter((d): d is Diploma => !!d));
  protected ids = computed(() => this.items().map(d => d.id));
  protected total = computed(() => this.items().reduce((s, d) => s + d.price, 0));
  protected description = computed(() =>
    this.items().length === 1 ? this.items()[0].title : this.i18n.t('cart.description', { n: this.items().length }));
}
