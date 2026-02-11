/**
 * Docsie API Types
 *
 * Based on the real OpenAPI schema at https://app.docsie.io/schema/
 * API version: /api_v2/003/
 */

/** Paginated response wrapper used by all list endpoints */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DocsieWorkspace {
  id: string;
  name: string;
  slug: string;
  created: string;
  modified: string;
  deleted: boolean;
  owner: number;
  members: number[];
  administrators: number[];
  editors: number[];
  viewers: number[];
  public: boolean;
  shelves_count: number;
  config: Record<string, unknown>;
  style?: string;
  domain_name: string | null;
  domain_verified: boolean;
  allowed_hosts: string[];
  custom_links: Record<string, unknown>;
}

/** Documentation (shelf) - groups books within a workspace */
export interface DocsieDocumentation {
  id: string;
  name: string;
  description: string;
  slug: string;
  created: string;
  modified: string;
  deleted: boolean;
  owner: number;
  public: boolean;
  primary: boolean;
  nickname: string;
  locale: Record<string, Record<string, string>>;
  tags: string[];
  order: number;
  password_protected: boolean;
  published: Record<string, unknown>;
  active_books_count: number;
  gallery: Array<{ key: string; created: string; starred: boolean }>;
  links: unknown[];
  linkable: boolean;
  forked: boolean;
  forked_parent: string | null;
  members: number[];
  administrators: number[];
  editors: number[];
  viewers: number[];
}

export interface DocsieBook {
  id: string;
  name: string;
  description: string;
  slug: string;
  created: string;
  modified: string;
  deleted: boolean;
  style: Record<string, unknown>;
  url_path: string | null;
  locale: Record<string, Record<string, string>>;
  collection: string[];
  tags: string[];
  primary: boolean;
  meta: Record<string, unknown>;
  password_protected: boolean;
  published: boolean;
  order: number;
  type: string;
  members: number[];
  administrators: number[];
  editors: number[];
  viewers: number[];
  active_versions_count: number;
}

/** Draft.js-style inline style range */
export interface InlineStyleRange {
  offset: number;
  length: number;
  style: string;
}

/** Draft.js-style entity range */
export interface EntityRange {
  offset: number;
  length: number;
  key: number | string;
}

/** ProseMirror-style text node */
export interface ProseMirrorTextNode {
  type: "text";
  text: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/** ProseMirror-style content node */
export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/** Content block - Draft.js format with optional ProseMirror content */
export interface DocBlock {
  type: string;
  text: string;
  key?: string;
  depth?: number;
  data?: Record<string, unknown>;
  entityRanges?: EntityRange[];
  inlineStyleRanges?: InlineStyleRange[];
  /** ProseMirror-style nested content (used by banner, tiles, content blocks) */
  content?: ProseMirrorNode[];
}

/** Article document content */
export interface DocContent {
  blocks: DocBlock[];
  entityMap?: Record<string, unknown>;
}

export interface DocsieArticle {
  id: string;
  name: string;
  description: string;
  slug: string;
  doc: DocContent;
  order: number;
  tags: string[];
  template: string;
  updated_by: number;
  updators: number[];
  revision: number;
}

export interface DocsieVersion {
  id: string;
  name: string;
  number: string;
  change_log: string | null;
  created: string;
  modified: string;
  deleted: boolean;
  active: boolean;
  primary: boolean;
  active_languages_count: number;
}

export interface DocsieLanguage {
  id: string;
  language: string;
  primary: boolean;
  abbreviation: string;
  active: boolean;
}

export interface DocsieJob {
  id: string;
  modified: string;
  created: string;
  deleted: boolean;
  job_name: string;
  verbose_name: string;
  job_status: "started" | "processing" | "completed" | "failed";
  result: Record<string, unknown>;
  instructions: Record<string, unknown>;
  parent_object_id: string;
}
