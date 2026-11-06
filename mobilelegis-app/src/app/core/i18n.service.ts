import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Lang, Language, Localized } from './models';

type Dict = Record<string, unknown>;
const STORAGE_KEY = 'ml.lang';
const DEFAULT: Lang = 'pt';

/**
 * Traduções carregadas de public/i18n/<código>.json.
 * As línguas disponíveis são definidas em public/i18n/languages.json:
 * para acrescentar uma língua, basta adicionar uma entrada nesse ficheiro e o respectivo <código>.json.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private http = inject(HttpClient);
  private dicts = signal<Record<Lang, Dict>>({});
  readonly languages = signal<Language[]>([]);
  readonly lang = signal<Lang>(DEFAULT);
  readonly locale = computed(() => this.languages().find(l => l.code === this.lang())?.locale ?? 'pt-PT');

  async init(): Promise<void> {
    this.languages.set(await firstValueFrom(this.http.get<Language[]>('i18n/languages.json')));
    const initial = this.initialLang();
    await this.load(DEFAULT);
    await this.load(initial);
    this.lang.set(initial);
    document.documentElement.lang = initial;
  }

  async use(lang: Lang): Promise<void> {
    if (!this.languages().some(l => l.code === lang)) return;
    await this.load(lang);
    this.lang.set(lang);
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }

  /** Traduz uma chave "a.b.c", com parâmetros {{x}}; recorre ao português se faltar. */
  t(key: string, params?: Record<string, unknown>): string {
    const d = this.dicts();
    let value = this.lookup(d[this.lang()], key) ?? this.lookup(d[DEFAULT], key) ?? key;
    if (params) for (const [k, v] of Object.entries(params)) value = value.split(`{{${k}}}`).join(String(v));
    return value;
  }

  /** Lista (array de strings) numa chave, ex: perguntas frequentes. */
  list<T = unknown>(key: string): T[] {
    const d = this.dicts();
    const v = this.lookupAny(d[this.lang()], key) ?? this.lookupAny(d[DEFAULT], key);
    return Array.isArray(v) ? v as T[] : [];
  }

  loc(value: Localized | undefined): string {
    return value ? (value[this.lang()] ?? value[DEFAULT] ?? '') : '';
  }

  money(v: number): string {
    return new Intl.NumberFormat(this.locale(), { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(v);
  }

  date(v: string | Date, withTime = false): string {
    const d = typeof v === 'string' ? new Date(v) : v;
    return new Intl.DateTimeFormat(this.locale(), withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(d);
  }

  private lookupAny(dict: Dict | undefined, key: string): unknown {
    let cur: unknown = dict;
    for (const part of key.split('.')) {
      if (cur && typeof cur === 'object') cur = (cur as Dict)[part]; else return undefined;
    }
    return cur;
  }

  private lookup(dict: Dict | undefined, key: string): string | undefined {
    const v = this.lookupAny(dict, key);
    return typeof v === 'string' ? v : undefined;
  }

  private async load(lang: Lang): Promise<void> {
    if (this.dicts()[lang]) return;
    const dict = await firstValueFrom(this.http.get<Dict>(`i18n/${lang}.json`));
    this.dicts.update(d => ({ ...d, [lang]: dict }));
  }

  private initialLang(): Lang {
    const codes = this.languages().map(l => l.code);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && codes.includes(saved)) return saved;
    } catch { /* ignore */ }
    const nav = navigator.language.slice(0, 2);
    return codes.includes(nav) ? nav : DEFAULT;
  }
}
