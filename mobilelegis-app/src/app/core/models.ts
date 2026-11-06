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
  tables?: LegalTable[]; // tabelas no texto corrido
}

/** Tabela apresentada no próprio texto (em vez de "consultar anexo no texto oficial"). */
export interface LegalTable { caption: string; head: string[]; rows: string[][]; source?: string; }

/** Anexos, formulários e modelos ligados a um diploma (repositório). */
export interface Attachment { name: string; kind: 'form' | 'table' | 'template' | 'pdf'; url?: string; templateId?: string; }

export interface NormRef { diplomaId: string; articleId: string; label?: string; }

export type CaseDecision = 'procedente' | 'improcedente' | 'parcial' | 'negado';
export interface CaseLaw {
  id: string; court: string; chamber: string; kind: string; number: string; process: string; date: string;
  areaId: string; decision: CaseDecision; keywords: string[]; summary: string; text: string[]; norms: NormRef[]; addedAt?: string;
}

export interface TemplateField { key: string; label: string; placeholder?: string; type?: 'text' | 'date' | 'textarea'; }
export interface LegalTemplate {
  id: string; title: string; category: string; areaId: string; description: string;
  fields: TemplateField[]; body: string[]; norms: NormRef[];
}

export interface Follows { areas: string[]; diplomas: string[]; }
export interface AlertPrefs { email: boolean; push: boolean; digest: 'daily' | 'weekly'; }

export interface Section { heading: string; articles: Article[]; }

export interface Amendment { diploma: string; date: string; summary: string; id?: string; brPdf?: string; }

/** Publicação no Boletim da República (ou Boletim Oficial, antes de 1975). */
export interface BrRef { gazette: string; number: string; series: string; page: number; date: string; }

export type RelationKind = 'altera' | 'alterado_por' | 'revoga' | 'revogado_por' | 'regulamenta' | 'regulamentado_por' | 'ver_tambem';
/** Legislação associada: `id` quando o diploma existe na plataforma, senão `label`. */
export interface Relation { kind: RelationKind; id?: string; label?: string; note?: string; pdf?: string; }

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
  issuer?: string;        // entidade emitente
  br?: BrRef;
  brPdf?: string;         // PDF do BR original (caminho em public/)
  inForce?: string;       // data de entrada em vigor
  inForceRule?: string;   // cláusula de entrada em vigor
  descriptors?: string[];
  relations?: Relation[];
  textPending?: boolean;  // ficha publicada pelo Radar BR; texto integral ainda em tratamento
  attachments?: Attachment[];
  addedAt?: string;       // data em que entrou na plataforma (para as novidades)
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
  follows?: Follows;                   // alertas: áreas e diplomas seguidos
  newsSeenAt?: string;
  alertPrefs?: AlertPrefs;
}

export interface PlanPrice { months: number; price: number; }
export interface Plan { id: PlanType; maxAreas: number | null; prices: PlanPrice[]; }

export interface Voucher { code: string; type: 'percent' | 'fixed'; value: number; appliesTo: 'all' | 'plans' | 'diplomas'; }
