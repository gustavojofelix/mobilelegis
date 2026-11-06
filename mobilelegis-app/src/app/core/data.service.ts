import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Area, Article, Diploma, Plan, User, Voucher } from './models';

export interface PlansData { trialDays: number; plans: Plan[]; vouchers: Voucher[]; }

/**
 * Carrega os dados fictícios (public/data/*.json).
 * Numa versão real, estes pedidos são substituídos pelas chamadas à API.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  readonly areas = signal<Area[]>([]);
  readonly diplomas = signal<Diploma[]>([]);
  readonly plansData = signal<PlansData>({ trialDays: 14, plans: [], vouchers: [] });
  readonly seedUsers = signal<User[]>([]);

  async init(): Promise<void> {
    const get = <T>(f: string) => firstValueFrom(this.http.get<T>(`data/${f}.json`));
    const [areas, diplomas, plans, users] = await Promise.all([
      get<Area[]>('areas'), get<Diploma[]>('diplomas'), get<PlansData>('plans'), get<User[]>('users'),
    ]);
    this.areas.set(areas);
    this.diplomas.set(diplomas);
    this.plansData.set(plans);
    this.seedUsers.set(users);
  }

  area(id: string) { return this.areas().find(a => a.id === id); }
  diploma(id: string) { return this.diplomas().find(d => d.id === id); }
  articles(d: Diploma): Article[] { return d.sections.flatMap(s => s.articles); }
  diplomasIn(areaId: string, categoryId: string, subcategoryId: string) {
    return this.diplomas().filter(d => d.areaId === areaId && d.categoryId === categoryId && d.subcategoryId === subcategoryId);
  }
}
