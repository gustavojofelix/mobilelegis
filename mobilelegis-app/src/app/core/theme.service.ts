import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
const KEY = 'ml.theme';

/** Tema claro/escuro. Por omissão segue o sistema; a escolha do utilizador fica guardada. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initial());

  constructor() { this.apply(this.theme()); }

  toggle() { this.set(this.theme() === 'dark' ? 'light' : 'dark'); }

  set(t: Theme) {
    this.theme.set(t);
    this.apply(t);
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  }

  private apply(t: Theme) {
    document.documentElement.dataset['theme'] = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#121414' : '#ffffff');
  }

  private initial(): Theme {
    try {
      const s = localStorage.getItem(KEY);
      if (s === 'light' || s === 'dark') return s;
    } catch { /* ignore */ }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
