import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AiAnswer, AiService } from '../core/ai.service';
import { AuthService } from '../core/auth.service';
import { I18N_PIPES } from '../core/pipes';
import { PageTitle } from '../shared/page-title';

interface Msg { role: 'user' | 'ai'; text: string; answer?: AiAnswer; at: string; }

const KEY = 'ml.ai.chat';
const SUGGESTIONS = [
  'Qual é a duração normal do trabalho?',
  'Qual é a idade núbil para casar?',
  'Qual é a taxa do IVA?',
  'Quem é considerado empresário comercial?',
  'Os artigos 147 e 148 do Código das Execuções Fiscais estão em vigor?',
];

@Component({
  selector: 'app-consultant',
  imports: [FormsModule, RouterLink, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'ai.title' | t" icon="comments" />
    <div class="container narrow ai-page">
      <div class="ai-intro">
        <div class="ai-orb"><i class="fa fa-balance-scale"></i></div>
        <div>
          <p><b>{{ 'ai.introTitle' | t }}</b></p>
          <p class="small muted">{{ 'ai.introText' | t }}</p>
        </div>
      </div>

      <div class="ai-thread" #thread>
        @if (!messages().length) {
          <p class="small muted">{{ 'ai.try' | t }}</p>
          <div class="ai-suggestions">
            @for (s of suggestions; track s) { <button type="button" class="ai-sugg" (click)="send(s)"><i class="fa fa-comment-o"></i> {{ s }}</button> }
          </div>
          <p class="small muted"><i class="fa fa-language"></i> {{ 'ai.ptNote' | t }}</p>
        }

        @for (m of messages(); track $index) {
          @if (m.role === 'user') {
            <div class="ai-msg user"><p>{{ m.text }}</p></div>
          } @else {
            <div class="ai-msg ai">
              <span class="ai-avatar"><i class="fa fa-bolt"></i></span>
              <div class="ai-bubble">
                @if (m.answer?.found) {
                  <p>{{ 'ai.answerIntro' | t: { n: m.answer!.citations.length } }}</p>
                  @for (c of m.answer!.citations; track c.diplomaId + c.articleId; let i = $index) {
                    <div class="ai-cite" [style.animation-delay.ms]="i * 180">
                      <div class="ai-cite-head">
                        <span class="ai-cite-n">{{ i + 1 }}</span>
                        <b>{{ c.diploma }}</b> — {{ 'diploma.article' | t }} {{ c.article }}@if (c.heading) { ({{ c.heading }}) }
                        @if (c.revoked) { <span class="tag tag-revogado">{{ 'status.revogado' | t }}</span> }
                        @if (c.locked) { <i class="fa fa-lock muted" [title]="'common.locked' | t"></i> }
                      </div>
                      <p class="ai-cite-text">«{{ c.excerpt }}»</p>
                      @if (c.note) { <p class="small muted">[{{ c.note }}]</p> }
                      <a [routerLink]="['/diploma', c.diplomaId]" [fragment]="c.articleId" class="link-strong small">{{ 'ai.openArticle' | t }} <i class="fa fa-angle-right"></i></a>
                    </div>
                  }
                  @if (m.answer!.cases?.length) {
                    <p class="ai-cases-h"><i class="fa fa-gavel"></i> {{ 'ai.relatedCases' | t }}</p>
                    @for (c of m.answer!.cases!; track c.id) {
                      <a class="ai-case" [routerLink]="['/jurisprudencia', c.id]"><b>{{ c.label }}</b><span class="small muted">{{ c.summary }}</span></a>
                    }
                  }
                  <p class="small muted">{{ 'ai.answerOutro' | t }}</p>
                } @else {
                  <p>{{ 'ai.noAnswer' | t }}</p>
                  <a routerLink="/pesquisa" class="link-strong small"><i class="fa fa-search"></i> {{ 'nav.search' | t }}</a>
                }
              </div>
            </div>
          }
        }
        @if (thinking()) {
          <div class="ai-msg ai"><span class="ai-avatar"><i class="fa fa-bolt"></i></span>
            <div class="ai-bubble ai-thinking"><span></span><span></span><span></span> <span class="small muted">{{ 'ai.searching' | t }}</span></div></div>
        }
      </div>

      <form class="ai-input" (ngSubmit)="send(draft)">
        <textarea class="form-control" rows="1" name="q" [(ngModel)]="draft" [placeholder]="'ai.placeholder' | t" (keydown.enter)="onEnter($event)"></textarea>
        <button type="submit" class="btn btn-yellow" [disabled]="!draft.trim() || thinking()" [attr.aria-label]="'ai.send' | t"><i class="fa fa-paper-plane"></i></button>
      </form>
      <div class="row-between ai-foot">
        <span class="small muted"><i class="fa fa-shield"></i> {{ 'ai.disclaimer' | t }}</span>
        @if (messages().length) { <button type="button" class="link-btn small" (click)="clear()"><i class="fa fa-trash-o"></i> {{ 'ai.clear' | t }}</button> }
      </div>
    </div>
  `,
})
export class Consultant {
  private ai = inject(AiService);
  private auth = inject(AuthService);
  protected suggestions = SUGGESTIONS;
  protected draft = '';
  protected thinking = signal(false);
  protected messages = signal<Msg[]>(this.load());
  private thread = viewChild<ElementRef<HTMLElement>>('thread');

  constructor() {
    effect(() => {
      const msgs = this.messages();
      try { localStorage.setItem(this.key(), JSON.stringify(msgs.slice(-30))); } catch { /* ignore */ }
      this.thinking();
      requestAnimationFrame(() => this.thread()?.nativeElement.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    });
  }

  private key() { return `${KEY}.${this.auth.user()?.id ?? 'anon'}`; }
  private load(): Msg[] { try { return JSON.parse(localStorage.getItem(this.key()) ?? '[]'); } catch { return []; } }

  onEnter(e: Event) {
    const k = e as KeyboardEvent;
    if (k.shiftKey) return;
    e.preventDefault();
    this.send(this.draft);
  }

  send(text: string) {
    const q = text.trim();
    if (!q || this.thinking()) return;
    this.draft = '';
    this.messages.update(m => [...m, { role: 'user', text: q, at: new Date().toISOString() }]);
    this.thinking.set(true);
    setTimeout(() => {
      const answer = this.ai.ask(q);
      this.thinking.set(false);
      this.messages.update(m => [...m, { role: 'ai', text: '', answer, at: new Date().toISOString() }]);
    }, 900 + Math.random() * 500);
  }

  clear() { this.messages.set([]); }
}
