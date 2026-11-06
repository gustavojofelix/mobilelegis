/** Código de língua (ex: "pt", "en", "fr"). A lista disponível vem de public/i18n/languages.json. */
export type Lang = string;
/** Texto traduzido por língua; se faltar a língua activa, usa-se "pt". */
export type Localized = Record<string, string>;

export interface Language { code: Lang; label: string; locale: string; }

export interface Subcategory { id: string; name: Localized; }
export interface Category { id: string; name: Localized; subcategories: Subcategory[]; }
export interface Area { id: string; number: number; image: string; name: Localized; categories: Category[]; }

export type DiplomaStatus = 'em_vigor' | 'alterado' | 'revogado';

export interface ArticleVersion { text: string[]; validUntil: string; source: string; }

export interface Article {
  id: string;          // ex: "art-5"
  number: string;      // ex: "5"
  heading: string;     // epígrafe
  paragraphs: string[];
  note?: string;       // nota de alteração (ex: "Redacção dada pela Lei n.º 1/2018")
  history?: ArticleVersion[];
  annex?: string;      // referência a anexo
}

export interface Section { heading: string; articles: Article[]; }

export interface Amendment { diploma: string; date: string; summary: string; }

export interface Diploma {
  id: string;
  type: string;
  number: string;
  year: number;
  date: string;
  title: string;
  heading: string;     // título oficial (ex: "Lei n.º 1/2018 de 12 de Junho")
  preamble: string;
  areaId: string;
  categoryId: string;
  subcategoryId: string;
  status: DiplomaStatus;
  revokedBy?: string;
  price: number;
  amendments: Amendment[];
  annexes: string[];
  sections: Section[];
}

export interface Device {
  id: string; platform: string; platformVersion: string; browser: string; browserVersion: string;
  type: string; lastSeen: string; current?: boolean;
}

export type PaymentMethod = 'mpesa' | 'emola' | 'mkesh';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  method: PaymentMethod;
  phone: string;
  invoice: string;      // número da fatura (OfficeGest)
  paysuiteRef: string;  // referência PaySuite
  voucher?: string;
}

export type PlanType = 'basic' | 'unlimited';

export interface Subscription { plan: PlanType; months: number; start: string; end: string; areas: string[]; }

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  profession: string;
  qualifications: string;
  company: string;
  birthDate: string;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  nuit: string;
  createdAt: string;
  trialStart: string;
  trialAreas: string[];
  subscription?: Subscription;
  purchases: string[];   // diplomas comprados avulso
  cart: string[];        // diplomas no carrinho
  favorites: string[];   // diplomas favoritos
  devices: Device[];
  transactions: Transaction[];
  annotations: Record<string, string>; // chave: diplomaId#articleId
  demoTrialExpired?: boolean;          // apenas para a demonstração
}

export interface PlanPrice { months: number; price: number; }
export interface Plan { id: PlanType; maxAreas: number | null; prices: PlanPrice[]; }

export interface Voucher { code: string; type: 'percent' | 'fixed'; value: number; appliesTo: 'all' | 'plans' | 'diplomas'; }
