import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from './data.service';
import { Device, Diploma, PaymentMethod, PlanType, Transaction, User, Voucher } from './models';

const USERS_KEY = 'ml.users.v2';
const SESSION_KEY = 'ml.session';
const DAY = 86_400_000;

function read<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/** Detecção simples do dispositivo actual, para a lista de dispositivos. */
function currentDevice(): Device {
  const ua = navigator.userAgent;
  const platform = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : 'Linux';
  const m = ua.match(/(Edg|Chrome|Firefox|Version)\/([\d.]+)/);
  const browser = m ? ({ Edg: 'Edge', Version: 'Safari' } as Record<string, string>)[m[1]] ?? m[1] : 'Browser';
  return {
    id: 'd' + Date.now(), platform, platformVersion: '—', browser, browserVersion: m?.[2] ?? '—',
    type: /Mobile/.test(ua) ? 'Mobile' : 'Desktop', lastSeen: new Date().toISOString(), current: true,
  };
}

export type RegisterInput = Pick<User, 'name' | 'email' | 'password' | 'phone' | 'profession' | 'trialAreas'>;

/**
 * "Back end" simulado: utilizadores, sessão, período de teste, subscrições, carrinho e favoritos.
 * O estado é guardado no localStorage a partir de public/data/users.json.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private data = inject(DataService);
  private router = inject(Router);
  private users = signal<User[]>([]);
  private sessionId = signal<string | null>(null);

  readonly user = computed(() => this.users().find(u => u.id === this.sessionId()) ?? null);

  readonly trialEnd = computed(() => {
    const u = this.user();
    return u ? new Date(new Date(u.trialStart).getTime() + this.data.plansData().trialDays * DAY) : null;
  });
  readonly trialDaysLeft = computed(() => {
    const end = this.trialEnd(), u = this.user();
    if (!end || !u || u.demoTrialExpired) return 0;
    return Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY));
  });
  readonly trialActive = computed(() => this.trialDaysLeft() > 0);
  readonly subscriptionActive = computed(() => {
    const s = this.user()?.subscription;
    return !!s && new Date(s.end).getTime() > Date.now();
  });
  /** Áreas actualmente acessíveis (null = todas). */
  readonly accessibleAreas = computed<string[] | null>(() => {
    const u = this.user();
    if (!u) return [];
    if (this.subscriptionActive()) return u.subscription!.plan === 'unlimited' ? null : u.subscription!.areas;
    return this.trialActive() ? u.trialAreas : [];
  });
  readonly blocked = computed(() => !this.subscriptionActive() && !this.trialActive());
  readonly cartCount = computed(() => this.user()?.cart.length ?? 0);

  init() {
    this.users.set(read<User[]>(USERS_KEY) ?? structuredClone(this.data.seedUsers()));
    this.sessionId.set(read<string>(SESSION_KEY));
  }

  login(email: string, password: string): boolean {
    const u = this.users().find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) return false;
    this.sessionId.set(u.id);
    write(SESSION_KEY, u.id);
    return true;
  }

  exists(email: string) { return this.users().some(u => u.email.toLowerCase() === email.trim().toLowerCase()); }

  register(input: RegisterInput): boolean {
    if (this.exists(input.email)) return false;
    const today = new Date().toISOString().slice(0, 10);
    const user: User = {
      ...input, id: 'u-' + Date.now(), createdAt: today, trialStart: today,
      qualifications: '', company: '', birthDate: '', country: 'Moçambique', city: '', address: '', postalCode: '', nuit: '',
      purchases: [], cart: [], favorites: [], transactions: [], annotations: {}, devices: [currentDevice()],
    };
    this.users.update(us => [...us, user]);
    this.persist();
    return this.login(input.email, input.password);
  }

  logout() {
    this.sessionId.set(null);
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    this.router.navigateByUrl('/login');
  }

  update(fn: (u: User) => void) {
    const id = this.sessionId();
    this.users.update(us => us.map(u => {
      if (u.id !== id) return u;
      const copy = structuredClone(u); fn(copy); return copy;
    }));
    this.persist();
  }

  changePassword(pw: string) { this.update(u => u.password = pw); }

  deleteAccount() {
    const id = this.sessionId();
    this.logout();
    this.users.update(us => us.filter(u => u.id !== id));
    this.persist();
  }

  resetDemo() {
    this.users.set(structuredClone(this.data.seedUsers()));
    this.persist();
  }

  // ---------- Acesso ----------
  purchased(d: Diploma) { return !!this.user()?.purchases.includes(d.id); }

  hasArea(areaId: string) { const a = this.accessibleAreas(); return a === null || a.includes(areaId); }

  canRead(d: Diploma): boolean { return this.purchased(d) || this.hasArea(d.areaId); }

  // ---------- Carrinho e favoritos ----------
  inCart(id: string) { return !!this.user()?.cart.includes(id); }
  addToCart(id: string) { this.update(u => { if (!u.cart.includes(id) && !u.purchases.includes(id)) u.cart.push(id); }); }
  removeFromCart(id: string) { this.update(u => u.cart = u.cart.filter(x => x !== id)); }

  isFavorite(id: string) { return !!this.user()?.favorites.includes(id); }
  toggleFavorite(id: string) {
    this.update(u => u.favorites = u.favorites.includes(id) ? u.favorites.filter(x => x !== id) : [...u.favorites, id]);
  }

  // ---------- Vouchers e pagamentos ----------
  findVoucher(code: string, kind: 'plans' | 'diplomas'): Voucher | null {
    const v = this.data.plansData().vouchers.find(x => x.code === code.trim().toUpperCase());
    return v && (v.appliesTo === 'all' || v.appliesTo === kind) ? v : null;
  }

  applyVoucher(price: number, v: Voucher | null): number {
    if (!v) return price;
    return Math.max(0, Math.round(v.type === 'percent' ? price * (1 - v.value / 100) : price - v.value));
  }

  /** Regista o pagamento (simulação PaySuite + fatura OfficeGest). */
  recordPayment(description: string, amount: number, method: PaymentMethod, phone: string, voucher?: string): Transaction {
    const n = 1000 + Math.floor(Math.random() * 9000);
    const tx: Transaction = {
      id: 't' + Date.now(), date: new Date().toISOString(), description, amount, method, phone, voucher,
      invoice: `FT ${new Date().getFullYear()}/${n}`,
      paysuiteRef: 'PS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    this.update(u => u.transactions.unshift(tx));
    return tx;
  }

  buyDiplomas(ids: string[]) {
    this.update(u => {
      for (const id of ids) if (!u.purchases.includes(id)) u.purchases.push(id);
      u.cart = u.cart.filter(x => !ids.includes(x));
    });
  }

  subscribe(plan: PlanType, months: number, areas: string[]) {
    const start = new Date();
    const end = new Date(start); end.setMonth(end.getMonth() + months);
    this.update(u => u.subscription = { plan, months, areas, start: start.toISOString(), end: end.toISOString() });
  }

  private persist() { write(USERS_KEY, this.users()); }
}
