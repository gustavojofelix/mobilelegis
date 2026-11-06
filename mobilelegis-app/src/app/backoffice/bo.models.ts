/** Modelos do back office (Mesa de Consolidação). Os dados de demonstração estão em public/data/backoffice/. */
export type Quality = 'poor' | 'medium' | 'good' | 'digital';
export type Severity = 'high' | 'medium' | 'low' | 'info';

export interface BoDoc {
  id: string;
  role: 'original' | 'amendment' | 'manual';
  type: string;
  number: string;
  title: string;
  subtitle: string;
  date: string;
  source: string;
  pages: number;
  quality: Quality;
  score: number;      // qualidade estimada da leitura (0–100)
  match: string[];    // palavras no nome do ficheiro que identificam o documento
  file: string;
  notes: string;
}

export interface CodeUnit { id: string; kind: 'body' | 'num' | 'par'; label: string; text: string; }
export interface CodeArticle { k: string; n: string; section: string; heading?: string; units: CodeUnit[]; }

export interface Doubt {
  id: string; doc: string; page: number; art: string; unit?: string;
  before: string; wrong: string; right: string; after: string; conf: number; why: string;
}

export type Effect =
  | { type: 'renumber'; map: Record<string, string> }
  | { type: 'append'; unit: string; text: string }
  | { type: 'replace'; unit: string; from: string; to: string }
  | { type: 'note'; arts: string[]; text: string };

export interface Choice { id: string; label: string; effect?: Effect; }

export interface Issue {
  id: string; doc: string; art: string; severity: Severity; auto?: boolean;
  title: string; detail: string; choices: Choice[];
}

export interface Operation {
  id: string; doc: string; ref: string; page: number;
  kind: 'substitute' | 'revoke';
  target: { art: string; unit?: string };
  targetLabel: string; summary: string;
  before: string; quote: string; hl: string; after: string;
  conf: number; note: string; hint?: string;
  newUnits?: CodeUnit[];
}

export interface Warning { id: string; doc: string; severity: Severity; title: string; detail: string; choices: Choice[]; }
export interface AuditItem { severity: Severity; where: string; title: string; detail: string; }

export interface DiplomaMeta {
  id: string; type: string; number: string; year: number; date: string;
  title: string; heading: string; preamble: string;
  areaId: string; categoryId: string; subcategoryId: string; price: number;
}

export interface CaseData {
  code: string; title: string; excerptNote: string;
  docs: BoDoc[]; articles: CodeArticle[]; doubts: Doubt[]; issues: Issue[];
  ops: Operation[]; warnings: Warning[]; audit: AuditItem[]; meta: DiplomaMeta;
}

export interface BoardCard {
  code: string; title: string; note: string; column: BoardColumn;
  assignee: string; due: string; progress: number; docs: number;
}
export type BoardColumn = 'read' | 'review' | 'reviewer' | 'published';

export interface BoardData {
  admins: { email: string; password: string; name: string; role: string }[];
  reviewer: { name: string; role: string };
  dossiers: BoardCard[];
  stats: { pagesRead: number };
}

export interface Attached { docId: string; fileName: string; size: number; pages?: number; example: boolean; }

export interface DoubtDecision { choice: 'accept' | 'keep' | 'custom'; value?: string; }

export interface LogEntry { at: string; who: string; key: string; params?: Record<string, string | number>; }

export interface DossierState {
  started: boolean;
  reached: number;                      // último passo alcançado (0–4)
  attached: Attached[];
  readDone: boolean;
  doubts: Record<string, DoubtDecision>;
  issues: Record<string, string>;
  ops: Record<string, 'approved' | 'rejected'>;
  warnings: Record<string, string>;
  meta: DiplomaMeta | null;
  submitted?: { by: string; at: string };
  reviewed?: { by: string; at: string };
  publishedAt?: string;
  log: LogEntry[];
}

/** Vista consolidada de um artigo numa data. */
export interface UnitView extends CodeUnit { state: 'kept' | 'new' | 'revoked'; note?: string; }
export interface ArticleView {
  k: string; n: string; section: string;
  units: UnitView[];
  previous?: UnitView[];
  revoked?: string;
  notes: string[];
  changed: boolean;
}
