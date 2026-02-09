/**
 * Docsie API Client
 *
 * Handles authentication and HTTP requests to the Docsie API.
 */

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
}
