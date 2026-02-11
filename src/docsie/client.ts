/**
 * Docsie API Client
 *
 * Handles authentication and HTTP requests to the Docsie API.
 * Uses /api_v2/003/ endpoints with Bearer token auth.
 */

import Bottleneck from "bottleneck";
import type {
  PaginatedResponse,
  DocsieWorkspace,
  DocsieDocumentation,
  DocsieBook,
  DocsieArticle,
} from "./types.js";

export interface DocsieClientConfig {
  apiKey: string;
  baseUrl?: string;
  /** Max concurrent requests (default: 5) */
  maxConcurrent?: number;
  /** Min time between requests in ms (default: 200) */
  minTime?: number;
}

const DEFAULT_BASE_URL = "https://app.docsie.io/api_v2/003";
const DEFAULT_MAX_CONCURRENT = 5;
const DEFAULT_MIN_TIME = 200;

export class DocsieClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly limiter: Bottleneck;

  constructor(config: DocsieClientConfig) {
    if (!config.apiKey) {
      throw new Error("Docsie API key is required");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

    this.limiter = new Bottleneck({
      maxConcurrent: config.maxConcurrent ?? DEFAULT_MAX_CONCURRENT,
      minTime: config.minTime ?? DEFAULT_MIN_TIME,
    });
  }

  /**
   * Make a GET request to the Docsie API (rate limited)
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.limiter.schedule(() => this.fetchWithAuth<T>(endpoint));
  }

  /**
   * Internal fetch with authentication
   */
  private async fetchWithAuth<T>(endpoint: string): Promise<T> {
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
        `Docsie API error: ${response.status} ${response.statusText} for ${endpoint}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch all items from a paginated endpoint using offset/limit
   *
   * Docsie returns { count, next, previous, results } for all list endpoints.
   */
  async fetchAllPaginated<T>(
    endpoint: string,
    limit: number = 100
  ): Promise<T[]> {
    const allItems: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const separator = endpoint.includes("?") ? "&" : "?";
      const paginatedEndpoint = `${endpoint}${separator}limit=${limit}&offset=${offset}`;

      const response = await this.get<PaginatedResponse<T>>(paginatedEndpoint);

      allItems.push(...response.results);

      if (response.next === null || response.results.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return allItems;
  }

  /**
   * Fetch all workspaces
   */
  async getWorkspaces(): Promise<DocsieWorkspace[]> {
    return this.fetchAllPaginated<DocsieWorkspace>("/workspaces/");
  }

  /**
   * Fetch all documentation (shelves)
   */
  async getDocumentation(): Promise<DocsieDocumentation[]> {
    return this.fetchAllPaginated<DocsieDocumentation>("/documentation/");
  }

  /**
   * Fetch all books, optionally filtering out deleted
   */
  async getBooks(includeDeleted: boolean = false): Promise<DocsieBook[]> {
    const endpoint = includeDeleted ? "/books/" : "/books/?deleted=false";
    return this.fetchAllPaginated<DocsieBook>(endpoint);
  }

  /**
   * Fetch all articles, optionally filtered by book
   */
  async getArticles(bookId?: string): Promise<DocsieArticle[]> {
    const endpoint = bookId ? `/articles/?book=${bookId}` : "/articles/";
    return this.fetchAllPaginated<DocsieArticle>(endpoint);
  }

  /**
   * Fetch a single article by ID
   */
  async getArticle(articleId: string): Promise<DocsieArticle> {
    return this.get<DocsieArticle>(`/articles/${articleId}/`);
  }
}
