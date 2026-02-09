/**
 * Docsie API Client
 *
 * Handles authentication and HTTP requests to the Docsie API.
 */

import type {
  DocsieWorkspace,
  DocsieProject,
  DocsieDocument,
  DocsieDocumentFull,
} from "./types.js";

export interface DocsieClientConfig {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://app.docsie.io/api/v1";

export class DocsieClient {
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: DocsieClientConfig) {
    if (!config.apiKey) {
      throw new Error("Docsie API key is required");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  /**
   * Make a GET request to the Docsie API
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Docsie API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch all items from a paginated endpoint
   *
   * Follows KB best practices: continues fetching until results < per_page
   */
  async fetchAllWithPagination<T>(
    endpoint: string,
    perPage: number = 100
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const separator = endpoint.includes("?") ? "&" : "?";
      const paginatedEndpoint = `${endpoint}${separator}page=${page}&per_page=${perPage}`;

      const items = await this.get<T[]>(paginatedEndpoint);

      console.log(`Page ${page}: fetched ${items.length} items`);

      allItems.push(...items);

      // Stop when we get fewer results than requested (no more pages)
      if (items.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allItems;
  }

  /**
   * Fetch all workspaces
   */
  async getWorkspaces(): Promise<DocsieWorkspace[]> {
    return this.get<DocsieWorkspace[]>("/workspaces");
  }

  /**
   * Fetch projects for a workspace
   */
  async getProjects(workspaceId: string): Promise<DocsieProject[]> {
    return this.get<DocsieProject[]>(`/workspaces/${workspaceId}/projects`);
  }

  /**
   * Fetch all documents for a workspace (with pagination)
   */
  async getDocuments(workspaceId: string): Promise<DocsieDocument[]> {
    return this.fetchAllWithPagination<DocsieDocument>(
      `/workspaces/${workspaceId}/documents`
    );
  }

  /**
   * Fetch a single document with full content
   */
  async getDocument(documentId: string): Promise<DocsieDocumentFull> {
    return this.get<DocsieDocumentFull>(`/documents/${documentId}`);
  }
}
