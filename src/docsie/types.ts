/**
 * Docsie API Types
 *
 * Based on typical documentation platform API structures.
 * Will be refined when actual API access is available.
 */

export interface DocsieWorkspace {
  id: string;
  name: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocsieProject {
  id: string;
  workspace_id: string;
  name: string;
  slug?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocsieDocument {
  id: string;
  project_id?: string;
  workspace_id?: string;
  title: string;
  slug?: string;
  content?: string;
  html_content?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  author?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface DocsieDocumentFull extends DocsieDocument {
  content: string;
  html_content?: string;
}
