import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Diploma } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { PaymentModal } from './payment-modal';

/** Linha de diploma: título, carrinho e favorito; ao abrir mostra o preâmbulo e os botões Abrir / Comprar. */
@Component({
  selector: 'app-diploma-row',
  imports: [RouterLink, PaymentModal, ...I18N_PIPES],
  template: `
    <div class="dip-row" [class.open]="open()">
      <div class="dip-row-head">
        <button type="button" class="dip-row-title" (click)="open.set(!open())" [attr.aria-expanded]="open()">
          {{ d().title }}
          @if (d().status !== 'em_vigor') { <span class="tag tag-{{ d().status }}">{{ 'status.' + d().status | t }}</span> }
          @if (!auth.canRead(d())) { <i class="fa fa-lock muted" [title]="'common.locked' | t"></i> }
        </button>
        <span class="dip-row-icons">
          @if (auth.purchased(d())) {
            <i class="fa fa-check-circle ok" [title]="'diploma.purchased' | t"></i>
          } @else {
            <button type="button" class="icon-link" [class.active]="auth.inCart(d().id)" (click)="toggleCart()"
                    [title]="(auth.inCart(d().id) ? 'cart.inCart' : 'cart.add') | t" [attr.aria-label]="(auth.inCart(d().id) ? 'cart.inCart' : 'cart.add') | t">
              <i class="fa fa-shopping-cart"></i>
            </button>
          }
          <button type="button" class="icon-link star" [class.active]="fav()" (click)="auth.toggleFavorite(d().id)"
                  [title]="(fav() ? 'favorites.remove' : 'favorites.add') | t" [attr.aria-label]="(fav() ? 'favorites.remove' : 'favorites.add') | t">
            <i class="fa" [class.fa-star]="fav()" [class.fa-star-o]="!fav()"></i>
          </button>
        </span>
      </div>
      @if (open()) {
        <div class="dip-row-body">
          <p>{{ d().preamble }}</p>
          @if (hint()) { <p class="small muted">{{ hint() }}</p> }
          <div class="dip-row-actions">
            @if (auth.canRead(d())) {
              <a class="btn btn-yellow" [routerLink]="['/diploma', d().id]" [queryParams]="query() ? { q: query() } : {}">{{ 'diploma.open' | t }}</a>
            }
            @if (!auth.purchased(d())) {
              <button type="button" class="btn btn-yellow" (click)="paying.set(true)">{{ 'diploma.buy' | t: { price: (d().price | money) } }}</button>
            }
          </div>
          @if (!auth.canRead(d())) {
            <p class="small muted center">{{ 'diploma.lockedText' | t }} <a routerLink="/subscricoes">{{ 'diploma.orSubscribe' | t }}</a></p>
          }
        </div>
      }
    </div>
    @if (paying()) {
      <app-payment-modal [description]="d().title" [price]="d().price" kind="diplomas"
                         (paid)="auth.buyDiplomas([d().id])" (closed)="paying.set(false)" />
    }`,
})
export class DiplomaRow {
  protected auth = inject(AuthService);
  readonly d = input.required<Diploma>();
  readonly query = input('');
  readonly hint = input('');
  readonly startOpen = input(false);
  protected open = signal(false);
  protected paying = signal(false);
  protected fav = computed(() => this.auth.isFavorite(this.d().id));

  ngOnInit() { this.open.set(this.startOpen()); }

  toggleCart() {
    if (this.auth.inCart(this.d().id)) this.auth.removeFromCart(this.d().id); else this.auth.addToCart(this.d().id);
  }
}
