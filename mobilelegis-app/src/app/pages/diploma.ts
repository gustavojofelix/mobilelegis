import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { Article } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { findAll, highlight, snippet } from '../core/text';
import { PaymentModal } from '../shared/payment-modal';

/** Uma ocorrência: artigo, bloco (0 = epígrafe, 1..n = parágrafos) e índice dentro do bloco. */
interface Hit { article: Article; block: number; local: number; snippet: string; }

@Component({
  selector: 'app-diploma',
  imports: [FormsModule, RouterLink, PaymentModal, ...I18N_PIPES],
  template: `
    @if (diploma(); as d) {
      <div class="container narrow viewer">
        <div class="viewer-top">
          <button type="button" class="back-btn" (click)="back()"><i class="fa fa-arrow-left"></i> {{ 'common.back' | t }}</button>
          <span class="viewer-top-icons">
            @if (auth.purchased(d)) {
              <button type="button" class="icon-link" (click)="download()" [title]="'diploma.download' | t" [attr.aria-label]="'diploma.download' | t"><i class="fa fa-download"></i></button>
            }
            @if (canRead()) {
              <button type="button" class="icon-link" [class.active]="showNotes()" (click)="showNotes.set(!showNotes())" [title]="'diploma.myNotes' | t" [attr.aria-label]="'diploma.myNotes' | t"><i class="fa fa-sticky-note"></i></button>
            }
            <button type="button" class="icon-link star" [class.active]="auth.isFavorite(d.id)" (click)="auth.toggleFavorite(d.id)"
                    [title]="(auth.isFavorite(d.id) ? 'favorites.remove' : 'favorites.add') | t" [attr.aria-label]="(auth.isFavorite(d.id) ? 'favorites.remove' : 'favorites.add') | t">
              <i class="fa" [class.fa-star]="auth.isFavorite(d.id)" [class.fa-star-o]="!auth.isFavorite(d.id)"></i>
            </button>
          </span>
        </div>

        @if (d.status === 'revogado' && revokedBy(); as r) {
          <div class="notice notice-danger"><strong>{{ 'diploma.revoked' | t }}.</strong> {{ 'diploma.revokedBy' | t }}
            <a [routerLink]="['/diploma', r.id]">{{ r.heading }}</a></div>
        }
        @if (d.amendments.length) {
          <details class="notice notice-warn">
            <summary><strong>{{ 'diploma.amended' | t }}</strong> — {{ 'diploma.amendedText' | t: { n: d.amendments.length } }}</summary>
            <ol class="amend-list">
              @for (a of d.amendments; track a.diploma) {
                <li><strong>{{ a.diploma }}</strong> — {{ a.summary }}</li>
              }
            </ol>
          </details>
        }

        @if (!canRead()) {
          <div class="legal-text">
            <p class="lt-heading">{{ d.heading }}</p>
            <p class="lt-title">{{ d.title.split(' - ')[0] }}</p>
            <p class="lt-p">{{ d.preamble }}</p>
          </div>
          <div class="locked-box">
            <i class="fa fa-lock fa-2x"></i>
            <p>{{ 'diploma.lockedText' | t }}</p>
            <div class="dip-row-actions">
              <button type="button" class="btn btn-yellow" (click)="paying.set(true)">{{ 'diploma.buy' | t: { price: (d.price | money) } }}</button>
              <a routerLink="/subscricoes" class="btn btn-light">{{ 'trial.subscribe' | t }}</a>
            </div>
            <p class="small muted">{{ 'diploma.buyHint' | t }}</p>
          </div>
        } @else {
          <div class="viewer-tools">
            <div class="find">
              <input type="search" class="form-control" [ngModel]="term()" (ngModelChange)="setTerm($event)" [placeholder]="'diploma.findPh' | t"
                     [attr.aria-label]="'diploma.findPh' | t" (keydown.enter)="onEnter($event)" />
              @if (term().trim().length > 1) {
                <span class="pager">
                  <button type="button" (click)="prev()" [disabled]="!hits().length" [attr.aria-label]="'diploma.prev' | t"><i class="fa fa-angle-left"></i></button>
                  <span aria-live="polite">{{ hits().length ? (active() + 1) + ' / ' + hits().length : ('diploma.noHits' | t) }}</span>
                  <button type="button" (click)="next()" [disabled]="!hits().length" [attr.aria-label]="'diploma.next' | t"><i class="fa fa-angle-right"></i></button>
                </span>
                <button type="button" class="icon-link" [class.active]="showHits()" (click)="showHits.set(!showHits())" [disabled]="!hits().length"
                        [title]="'diploma.allHits' | t" [attr.aria-label]="'diploma.allHits' | t"><i class="fa fa-list"></i></button>
              }
            </div>
            <div class="tools-right">
              <select class="form-control jump" (change)="jump($any($event.target).value); $any($event.target).value = ''" [attr.aria-label]="'diploma.goTo' | t">
                <option value="">{{ 'diploma.goTo' | t }}</option>
                @for (s of d.sections; track s.heading) {
                  <optgroup [label]="s.heading">
                    @for (a of s.articles; track a.id) { <option [value]="a.id">{{ 'diploma.article' | t }} {{ a.number }} — {{ a.heading }}</option> }
                  </optgroup>
                }
              </select>
              <button type="button" class="btn btn-yellow btn-square" (click)="zoom(-10)" [attr.aria-label]="'diploma.zoomOut' | t"><i class="fa fa-minus"></i></button>
              <button type="button" class="btn btn-yellow btn-square" (click)="zoom(10)" [attr.aria-label]="'diploma.zoomIn' | t"><i class="fa fa-plus"></i></button>
            </div>
          </div>

          @if (showHits() && hits().length) {
            <div class="panel">
              <p class="panel-title">{{ 'diploma.allHits' | t }} ({{ hits().length }})</p>
              <ol class="hit-list">
                @for (h of hits(); track $index) {
                  <li [class.active]="$index === active()">
                    <button type="button" class="linklike" (click)="goTo($index)">
                      <strong>{{ 'diploma.article' | t }} {{ h.article.number }}</strong> <span class="muted">({{ h.article.heading }})</span><br />
                      <span class="small" [innerHTML]="h.snippet"></span>
                    </button>
                  </li>
                }
              </ol>
            </div>
          }

          @if (showNotes()) {
            <div class="panel">
              <p class="panel-title">{{ 'diploma.myNotes' | t }}</p>
              @for (n of notes(); track n.article.id) {
                <p><a [href]="'#' + n.article.id" (click)="jump(n.article.id); $event.preventDefault()"><strong>{{ 'diploma.article' | t }} {{ n.article.number }}</strong></a> — {{ n.text }}</p>
              } @empty { <p class="muted">{{ 'diploma.noNotes' | t }}</p> }
            </div>
          }

          <article class="legal-text" [style.font-size.%]="scale()">
            <p class="lt-heading">{{ d.heading }}</p>
            <p class="lt-title">{{ d.title.split(' - ')[0] }}</p>
            <p class="lt-p">{{ d.preamble }}</p>
            @for (s of d.sections; track s.heading) {
              <p class="lt-section">{{ s.heading }}</p>
              @for (a of s.articles; track a.id) {
                <section class="art" [id]="a.id">
                  <p class="art-num">{{ 'diploma.article' | t }} {{ a.number }}</p>
                  @if (a.heading) { <p class="art-head">(<span [innerHTML]="html(a, 0)"></span>)</p> }
                  @for (p of a.paragraphs; track $index) { <p class="lt-p" [innerHTML]="html(a, $index + 1)"></p> }
                  @if (a.note) { <p class="art-note">[{{ a.note }}]</p> }
                  @if (a.annex) { <p class="art-note">{{ 'diploma.annexNote' | t: { name: a.annex } }}</p> }

                  @if (a.history?.length) {
                    <details class="history">
                      <summary>{{ 'diploma.previousVersions' | t }}</summary>
                      @for (v of a.history; track v.validUntil) {
                        <div class="old">
                          <p class="small muted">{{ v.source }} — {{ 'diploma.validUntil' | t }} {{ v.validUntil | dt }}</p>
                          @for (p of v.text; track $index) { <p>{{ p }}</p> }
                        </div>
                      }
                    </details>
                  }

                  <div class="art-actions">
                    <button type="button" class="link-btn" (click)="editNote(a.id)"><i class="fa fa-sticky-note-o"></i> {{ 'diploma.addNote' | t }}</button>
                    <button type="button" class="link-btn" (click)="copy(a)"><i class="fa" [class.fa-check]="copied() === a.id" [class.fa-files-o]="copied() !== a.id"></i> {{ (copied() === a.id ? 'diploma.copied' : 'diploma.copy') | t }}</button>
                  </div>

                  @if (editing() === a.id) {
                    <div class="note-edit">
                      <textarea class="form-control" rows="3" [(ngModel)]="draft" [placeholder]="'diploma.notePh' | t"></textarea>
                      <div class="dip-row-actions left">
                        <button type="button" class="btn btn-yellow btn-sm" (click)="saveNote(a.id)">{{ 'common.save' | t }}</button>
                        <button type="button" class="btn btn-light btn-sm" (click)="editing.set(null)">{{ 'common.cancel' | t }}</button>
                      </div>
                    </div>
                  } @else if (note(a.id); as n) {
                    <button type="button" class="note-view" (click)="editNote(a.id)"><strong>{{ 'diploma.note' | t }}:</strong> {{ n }}</button>
                  }
                </section>
              }
            }
            @if (d.annexes.length) {
              <p class="lt-section">{{ 'diploma.annexes' | t }}</p>
              <ul class="annex-list">
                @for (x of d.annexes; track x) { <li><i class="fa fa-paperclip"></i> {{ x }}</li> }
              </ul>
            }
          </article>
        }
      </div>

      @if (paying()) {
        <app-payment-modal [description]="d.title" [price]="d.price" kind="diplomas"
                           (paid)="auth.buyDiplomas([d.id])" (closed)="paying.set(false)" />
      }
    }
  `,
})
export class DiplomaView {
  protected data = inject(DataService);
  protected auth = inject(AuthService);
  private i18n = inject(I18nService);
  private location = inject(Location);
  private router = inject(Router);

  readonly id = input.required<string>();
  readonly q = input<string | undefined>(undefined);

  protected diploma = computed(() => this.data.diploma(this.id()));
  protected revokedBy = computed(() => this.diploma()?.revokedBy ? this.data.diploma(this.diploma()!.revokedBy!) : undefined);
  protected canRead = computed(() => !!this.diploma() && this.auth.canRead(this.diploma()!));

  protected term = signal('');
  protected active = signal(0);
  protected showHits = signal(false);
  protected showNotes = signal(false);
  protected scale = signal(100);
  protected paying = signal(false);
  protected editing = signal<string | null>(null);
  protected copied = signal<string | null>(null);
  protected draft = '';

  /**
   * Todas as ocorrências no diploma INTEIRO, calculadas de uma só vez.
   * "Seguinte/anterior" percorrem esta lista, saltando directamente para o próximo artigo com resultado.
   */
  protected hits = computed<Hit[]>(() => {
    const d = this.diploma(), t = this.term();
    if (!d || t.trim().length < 2) return [];
    const out: Hit[] = [];
    for (const a of this.data.articles(d)) {
      [a.heading, ...a.paragraphs].forEach((text, block) => {
        findAll(text, t).forEach((_, local) =>
          out.push({ article: a, block, local, snippet: highlight(snippet(text, t, 40), t) }));
      });
    }
    return out;
  });

  protected notes = computed(() => {
    const d = this.diploma(), ann = this.auth.user()?.annotations ?? {};
    return d ? this.data.articles(d).filter(a => ann[`${d.id}#${a.id}`]).map(a => ({ article: a, text: ann[`${d.id}#${a.id}`] })) : [];
  });

  constructor() {
    effect(() => this.term.set(this.q() ?? ''));
    effect(() => {
      if (!this.hits()[this.active()]) return;
      requestAnimationFrame(() => document.querySelector('.legal-text mark.active')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    });
  }

  back() {
    if (history.length > 1) this.location.back();
    else this.router.navigate(['/area', this.diploma()?.areaId ?? '']);
  }
  onEnter(e: Event) { if ((e as KeyboardEvent).shiftKey) this.prev(); else this.next(); }
  setTerm(v: string) { this.term.set(v); this.active.set(0); }
  next() { const n = this.hits().length; if (n) this.active.set((this.active() + 1) % n); }
  prev() { const n = this.hits().length; if (n) this.active.set((this.active() - 1 + n) % n); }
  goTo(i: number) { this.active.set(i); this.showHits.set(false); }
  jump(articleId: string) { if (articleId) document.getElementById(articleId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  html(a: Article, block: number): string {
    const text = block === 0 ? a.heading : a.paragraphs[block - 1];
    const h = this.hits()[this.active()];
    const activeLocal = h && h.article.id === a.id && h.block === block ? h.local : -1;
    return highlight(text, this.term(), activeLocal);
  }

  zoom(delta: number) { this.scale.update(s => Math.min(180, Math.max(70, s + delta))); }

  note(articleId: string) { return this.auth.user()?.annotations[`${this.id()}#${articleId}`]; }
  editNote(articleId: string) { this.draft = this.note(articleId) ?? ''; this.editing.set(articleId); }
  saveNote(articleId: string) {
    const key = `${this.id()}#${articleId}`, text = this.draft.trim();
    this.auth.update(u => { if (text) u.annotations[key] = text; else delete u.annotations[key]; });
    this.editing.set(null);
  }

  copy(a: Article) {
    const d = this.diploma()!;
    const label = this.i18n.t('diploma.article');
    navigator.clipboard?.writeText(`${label} ${a.number} (${a.heading})\n${a.paragraphs.join('\n')}\n— ${d.heading}. Mobilelegis`);
    this.copied.set(a.id);
    setTimeout(() => this.copied.set(null), 1500);
  }

  /** Versão para download (simulação): texto com marca d'água com o e-mail do utilizador. */
  download() {
    const d = this.diploma()!, u = this.auth.user()!;
    const wm = `MOBILELEGIS · ${u.email} · ${this.i18n.date(new Date(), true)}`;
    const body = d.sections.map(s => `\n${s.heading}\n\n` + s.articles.map(a =>
      `Artigo ${a.number}\n(${a.heading})\n${a.paragraphs.join('\n')}${a.note ? `\n[${a.note}]` : ''}`).join('\n\n')).join('\n');
    const blob = new Blob([`${wm}\n${'='.repeat(wm.length)}\n\n${d.heading}\n${d.title}\n\n${d.preamble}\n${body}\n\n${wm}\n`], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${d.id}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
