import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { NewsService } from '../core/news.service';
import { I18N_PIPES } from '../core/pipes';
import { PageTitle } from '../shared/page-title';

/** Novidades e alertas: o que mudou nas áreas e diplomas que o utilizador segue. */
@Component({
  selector: 'app-news',
  imports: [RouterLink, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'news.title' | t" icon="bell" />
    <div class="container narrow">
      <div class="row-between news-head">
        <div class="seg" role="radiogroup" [attr.aria-label]="'news.title' | t">
          <button type="button" role="radio" [class.active]="!all()" [attr.aria-checked]="!all()" (click)="all.set(false)">{{ 'news.mine' | t }} ({{ mine().length }})</button>
          <button type="button" role="radio" [class.active]="all()" [attr.aria-checked]="all()" (click)="all.set(true)">{{ 'news.all' | t }} ({{ news.items().length }})</button>
        </div>
        <button type="button" class="link-btn" (click)="settings.set(!settings())" [attr.aria-expanded]="settings()"><i class="fa fa-cog"></i> {{ 'news.settings' | t }}</button>
      </div>

      @if (settings()) {
        <section class="panel news-settings">
          <p class="panel-title">{{ 'news.followAreas' | t }}</p>
          <div class="dinfo-chips">
            @for (a of data.areas(); track a.id) {
              <button type="button" class="dinfo-chip" [class.active]="auth.followsArea(a.id)" (click)="auth.toggleFollowArea(a.id)">
                <i class="fa" [class.fa-check]="auth.followsArea(a.id)" [class.fa-plus]="!auth.followsArea(a.id)"></i> {{ a.name | loc }}</button>
            }
          </div>
          <p class="panel-title news-gap">{{ 'news.followDiplomas' | t }}</p>
          @for (id of auth.follows().diplomas; track id) {
            @if (data.diploma(id); as d) {
              <p class="news-fd"><a [routerLink]="['/diploma', d.id]">{{ d.heading }}</a> — {{ d.title.split(' - ')[0] }}
                <button type="button" class="link-btn" (click)="auth.toggleFollow(d.id)"><i class="fa fa-bell-slash-o"></i> {{ 'news.unfollow' | t }}</button></p>
            }
          } @empty { <p class="small muted">{{ 'news.noDiplomas' | t }}</p> }
          <p class="panel-title news-gap">{{ 'news.channels' | t }}</p>
          <label class="check"><input type="checkbox" [checked]="auth.alertPrefs().email" (change)="auth.setAlertPrefs({ email: $any($event.target).checked })" /> {{ 'news.email' | t: { email: auth.user()?.email ?? '' } }}</label>
          <label class="check"><input type="checkbox" [checked]="auth.alertPrefs().push" (change)="auth.setAlertPrefs({ push: $any($event.target).checked })" /> {{ 'news.push' | t }}</label>
          <div class="seg news-gap">
            <button type="button" [class.active]="auth.alertPrefs().digest === 'daily'" (click)="auth.setAlertPrefs({ digest: 'daily' })">{{ 'news.daily' | t }}</button>
            <button type="button" [class.active]="auth.alertPrefs().digest === 'weekly'" (click)="auth.setAlertPrefs({ digest: 'weekly' })">{{ 'news.weekly' | t }}</button>
          </div>
          <p class="small muted">{{ 'news.channelsNote' | t }}</p>
        </section>
      }

      <ol class="news-list">
        @for (n of shown(); track n.id) {
          <li class="news-item" [class.unread]="unreadAtEntry.has(n.id) && n.followed">
            <span class="news-ico" [class]="'k-' + n.kind"><i class="fa" [class.fa-file-text-o]="n.kind === 'new'" [class.fa-pencil-square-o]="n.kind === 'amend'" [class.fa-gavel]="n.kind === 'case'"></i></span>
            <div class="news-body">
              <p class="news-meta"><span class="tag" [class.tag-ok]="n.kind === 'new'" [class.tag-alterado]="n.kind === 'amend'">{{ ('news.kind.' + n.kind) | t }}</span> {{ n.date | dt }}
                @if (unreadAtEntry.has(n.id) && n.followed) { <span class="news-dot" [title]="'news.unread' | t"></span> }</p>
              <a [routerLink]="n.link" class="news-title">{{ n.title }}</a>
              <p class="small news-sub">{{ n.subtitle }}</p>
              @if (n.reason) { <p class="small muted"><i class="fa fa-bell-o"></i> {{ n.reason }}</p> }
            </div>
          </li>
        } @empty { <p class="empty">{{ 'news.empty' | t }}</p> }
      </ol>
    </div>
  `,
})
export class News {
  protected data = inject(DataService);
  protected auth = inject(AuthService);
  protected news = inject(NewsService);
  protected all = signal(false);
  protected settings = signal(false);
  protected mine = computed(() => this.news.items().filter(i => i.followed));
  protected shown = computed(() => this.all() ? this.news.items() : this.mine());
  /** Itens por ler à entrada: ficam destacados nesta visita, mas o sino é limpo logo. */
  protected unreadAtEntry = new Set(this.news.items().filter(i => i.unread).map(i => i.id));
  constructor() { this.auth.markNewsSeen(); }
}
