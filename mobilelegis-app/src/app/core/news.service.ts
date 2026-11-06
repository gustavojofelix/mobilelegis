import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { I18nService } from './i18n.service';

export type NewsKind = 'new' | 'amend' | 'case';
export interface NewsItem {
  id: string; kind: NewsKind; date: string; title: string; subtitle: string;
  link: (string | number)[]; reason: string; followed: boolean; unread: boolean;
}

const WINDOW_DAYS = 120;

/**
 * Novidades: diplomas novos (Radar BR / back office), alterações a diplomas seguidos e jurisprudência nova.
 * Na versão final, o mesmo feed alimenta o e-mail diário/semanal e as notificações push.
 */
@Injectable({ providedIn: 'root' })
export class NewsService {
  private data = inject(DataService);
  private auth = inject(AuthService);
  private i18n = inject(I18nService);

  readonly items = computed<NewsItem[]>(() => {
    const f = this.auth.follows(), seen = this.auth.user()?.newsSeenAt ?? '';
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    const area = (id: string) => this.i18n.loc(this.data.area(id)?.name);
    const out: NewsItem[] = [];

    for (const d of this.data.diplomas()) {
      const date = d.addedAt ?? d.br?.date ?? d.date;
      if (date.slice(0, 10) < since) continue;
      const target = (d.relations ?? []).find(r => r.kind === 'altera' && r.id && this.data.diploma(r.id));
      const t = target ? this.data.diploma(target.id!) : undefined;
      const byDiploma = !!t && f.diplomas.includes(t.id);
      const byArea = f.areas.includes(d.areaId);
      out.push({
        id: 'd:' + d.id, kind: t ? 'amend' : 'new', date, link: ['/diploma', d.id],
        title: t ? this.i18n.t('news.amendTitle', { name: t.heading }) : d.heading,
        subtitle: t ? `${d.heading} — ${d.preamble}` : d.preamble,
        reason: byDiploma ? this.i18n.t('news.reasonDiploma', { name: t!.heading }) : byArea ? this.i18n.t('news.reasonArea', { name: area(d.areaId) }) : '',
        followed: byDiploma || byArea, unread: date > seen,
      });
    }
    for (const c of this.data.cases()) {
      const date = c.addedAt ?? c.date;
      if (date < since) continue;
      const fd = c.norms.find(n => f.diplomas.includes(n.diplomaId));
      const byArea = f.areas.includes(c.areaId);
      out.push({
        id: 'c:' + c.id, kind: 'case', date, link: ['/jurisprudencia', c.id],
        title: `${c.kind} ${c.number} — ${c.court}`, subtitle: c.summary,
        reason: fd ? this.i18n.t('news.reasonDiploma', { name: this.data.diploma(fd.diplomaId)?.heading ?? '' }) : byArea ? this.i18n.t('news.reasonArea', { name: area(c.areaId) }) : '',
        followed: !!fd || byArea, unread: date > seen,
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly unread = computed(() => this.items().filter(i => i.followed && i.unread).length);
}
