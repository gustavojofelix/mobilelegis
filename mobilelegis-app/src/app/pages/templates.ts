import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18nService } from '../core/i18n.service';
import { LegalTemplate } from '../core/models';
import { I18N_PIPES } from '../core/pipes';
import { escapeHtml, normalize } from '../core/text';
import { PageTitle } from '../shared/page-title';

/** Biblioteca de minutas e formulários jurídicos, por categoria. */
@Component({
  selector: 'app-templates',
  imports: [FormsModule, RouterLink, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'tpl.title' | t" icon="file-text-o" />
    <div class="container narrow">
      <p class="muted">{{ 'tpl.subtitle' | t }}</p>
      <input type="search" class="form-control" [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="'tpl.searchPh' | t" [attr.aria-label]="'tpl.searchPh' | t" />
      <div class="facets tpl-cats">
        <button type="button" class="dinfo-chip" [class.active]="!cat()" (click)="cat.set('')">{{ 'common.all' | t }}</button>
        @for (c of cats(); track c) { <button type="button" class="dinfo-chip" [class.active]="cat() === c" (click)="cat.set(c)">{{ c }}</button> }
      </div>
      <div class="tpl-grid">
        @for (t of list(); track t.id) {
          <a class="tpl-card" [routerLink]="['/minutas', t.id]">
            <span class="tpl-ico"><i class="fa fa-file-text-o"></i></span>
            <span class="tpl-cat">{{ t.category }}</span>
            <b>{{ t.title }}</b>
            <span class="small muted">{{ t.description }}</span>
            <span class="small tpl-meta"><i class="fa fa-pencil-square-o"></i> {{ 'tpl.nFields' | t: { n: t.fields.length } }} · <i class="fa fa-book"></i> {{ 'tpl.nNorms' | t: { n: t.norms.length } }}</span>
          </a>
        } @empty { <p class="empty">{{ 'common.noRecords' | t }}</p> }
      </div>
      <p class="small muted tpl-disclaimer"><i class="fa fa-info-circle"></i> {{ 'tpl.disclaimer' | t }}</p>
    </div>
  `,
})
export class Templates {
  protected data = inject(DataService);
  readonly qParam = input<string | undefined>(undefined, { alias: 'q' });
  protected q = signal(''); protected cat = signal('');
  protected cats = computed(() => [...new Set(this.data.templates().map(t => t.category))]);
  constructor() { effect(() => this.q.set(this.qParam() ?? '')); }
  protected list = computed(() => {
    const words = normalize(this.q()).split(/\s+/).filter(w => w.length > 1);
    return this.data.templates().filter(t => (!this.cat() || t.category === this.cat()) &&
      words.every(w => normalize(t.title + ' ' + t.description + ' ' + t.category + ' ' + t.body.join(' ')).includes(w)));
  });
}

/** Preenchimento de uma minuta, com pré-visualização em tempo real e exportação. */
@Component({
  selector: 'app-template-view',
  imports: [FormsModule, RouterLink, ...I18N_PIPES],
  template: `
    @if (t(); as t) {
      <div class="container viewer tpl-view">
        <div class="viewer-top"><a routerLink="/minutas" class="back-btn"><i class="fa fa-arrow-left"></i> {{ 'tpl.title' | t }}</a></div>
        <h1 class="tpl-h1">{{ t.title }}</h1>
        <p class="muted">{{ t.description }}</p>
        <div class="tpl-layout">
          <form class="tpl-form" (submit)="$event.preventDefault()">
            <p class="panel-title">{{ 'tpl.fill' | t }} <span class="dinfo-count">{{ filled() }}/{{ t.fields.length }}</span></p>
            @for (f of t.fields; track f.key) {
              <label class="field"><span>{{ f.label }}</span>
                @if (f.type === 'textarea') {
                  <textarea class="form-control" rows="3" [attr.name]="f.key" [ngModelOptions]="{ standalone: true }" [ngModel]="values()[f.key] ?? ''" (ngModelChange)="set(f.key, $event)" [placeholder]="f.placeholder ?? ''"></textarea>
                } @else {
                  <input class="form-control" [type]="f.type === 'date' ? 'date' : 'text'" [attr.name]="f.key" [ngModelOptions]="{ standalone: true }" [ngModel]="values()[f.key] ?? ''" (ngModelChange)="set(f.key, $event)" [placeholder]="f.placeholder ?? ''" />
                }
              </label>
            }
            <button type="button" class="link-btn" (click)="resetForm()"><i class="fa fa-eraser"></i> {{ 'tpl.clear' | t }}</button>
            <div class="panel tpl-norms">
              <p class="panel-title"><i class="fa fa-book"></i> {{ 'tpl.basis' | t }}</p>
              <ul class="dinfo-rel tight">
                @for (n of t.norms; track $index) {
                  <li>@if (data.diploma(n.diplomaId)) { <a [routerLink]="['/diploma', n.diplomaId]" [fragment]="n.articleId">{{ n.label ?? data.normLabel(n) }}</a> } @else { {{ n.label ?? n.diplomaId }} }</li>
                }
              </ul>
            </div>
          </form>
          <div class="tpl-preview-col">
            <div class="tpl-actions">
              <button type="button" class="btn btn-yellow btn-sm" (click)="downloadDoc()"><i class="fa fa-file-word-o"></i> {{ 'tpl.word' | t }}</button>
              <button type="button" class="btn btn-light btn-sm" (click)="copy()"><i class="fa" [class.fa-check]="copied()" [class.fa-files-o]="!copied()"></i> {{ (copied() ? 'diploma.copied' : 'diploma.copy') | t }}</button>
              <button type="button" class="btn btn-light btn-sm" (click)="print()"><i class="fa fa-print"></i> {{ 'tpl.print' | t }}</button>
            </div>
            <article class="tpl-paper" [innerHTML]="previewHtml()"></article>
          </div>
        </div>
        <p class="small muted tpl-disclaimer"><i class="fa fa-info-circle"></i> {{ 'tpl.disclaimer' | t }}</p>
      </div>
    } @else { <div class="container narrow"><p class="empty">{{ 'common.noRecords' | t }}</p></div> }
  `,
})
export class TemplateView {
  protected data = inject(DataService);
  private auth = inject(AuthService);
  private i18n = inject(I18nService);
  readonly id = input.required<string>();
  protected t = computed(() => this.data.template(this.id()));
  protected values = signal<Record<string, string>>({});
  protected copied = signal(false);
  protected filled = computed(() => (this.t()?.fields ?? []).filter(f => (this.values()[f.key] ?? '').trim()).length);

  private key = computed(() => `ml.tpl.${this.auth.user()?.id ?? 'anon'}.${this.id()}`);
  constructor() {
    effect(() => { try { this.values.set(JSON.parse(localStorage.getItem(this.key()) ?? '{}')); } catch { this.values.set({}); } });
  }
  set(k: string, v: string) {
    this.values.update(x => ({ ...x, [k]: v }));
    try { localStorage.setItem(this.key(), JSON.stringify(this.values())); } catch { /* ignore */ }
  }
  resetForm() { this.values.set({}); try { localStorage.removeItem(this.key()); } catch { /* ignore */ } }

  private val(k: string) {
    const f = this.t()?.fields.find(x => x.key === k), v = (this.values()[k] ?? '').trim();
    if (v && f?.type === 'date') return this.i18n.date(v);
    return v;
  }
  /** Texto final; campos por preencher ficam como "[Rótulo]". */
  protected lines = computed(() => (this.t()?.body ?? []).map(l => l.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    this.val(k) || `[${this.t()?.fields.find(f => f.key === k)?.label ?? k}]`)));
  protected previewHtml = computed(() => (this.t()?.body ?? []).map((l, i) => {
    const html = escapeHtml(l).replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = this.val(k), label = this.t()?.fields.find(f => f.key === k)?.label ?? k;
      return v ? `<span class="tpl-v">${escapeHtml(v)}</span>` : `<span class="tpl-ph">[${escapeHtml(label)}]</span>`;
    });
    return i === 0 ? `<h2>${html}</h2>` : `<p>${html}</p>`;
  }).join(''));

  copy() {
    navigator.clipboard?.writeText(this.lines().join('\n\n'));
    this.copied.set(true); setTimeout(() => this.copied.set(false), 1500);
  }
  /** Word abre HTML com extensão .doc; suficiente para o protótipo (na versão final: .docx gerado no servidor). */
  downloadDoc() {
    const body = this.lines().map((l, i) => i === 0 ? `<h2 style="text-align:center">${escapeHtml(l)}</h2>` : `<p>${escapeHtml(l)}</p>`).join('');
    const html = `<html><head><meta charset="utf-8"><title>${escapeHtml(this.t()!.title)}</title></head><body style="font-family:'Times New Roman';font-size:12pt;line-height:1.5">${body}</body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + html], { type: 'application/msword' }));
    a.download = `${this.t()!.id}.doc`; a.click(); URL.revokeObjectURL(a.href);
  }
  print() { window.print(); }
}
