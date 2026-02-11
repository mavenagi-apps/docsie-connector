/**
 * Environment Configuration
 *
 * Validates and provides typed access to environment variables.
 */

const REQUIRED_ENV_VARS = [
  "DOCSIE_API_KEY",
  "MAVEN_ORGANIZATION_ID",
  "MAVEN_AGENT_ID",
  "MAVEN_API_KEY",
] as const;

const DEFAULT_DOCSIE_BASE_URL = "https://app.docsie.io/api_v2/003";

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
}

export interface DocsieConfig {
  apiKey: string;
  baseUrl: string;
}

export interface MavenConfig {
  organizationId: string;
  agentId: string;
  apiKey: string;
}

export interface Config {
  docsie: DocsieConfig;
  maven: MavenConfig;
}

/**
 * Validate that all required environment variables are set
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get typed configuration from environment variables
 *
 * @throws Error if required variables are missing
 */
export function getConfig(): Config {
  const validation = validateEnv();

  if (!validation.valid) {
    throw new Error(
      `Missing required environment variables: ${validation.missing.join(", ")}`
    );
  }

  return {
    docsie: {
      apiKey: process.env.DOCSIE_API_KEY!,
      baseUrl: process.env.DOCSIE_BASE_URL ?? DEFAULT_DOCSIE_BASE_URL,
    },
    maven: {
      organizationId: process.env.MAVEN_ORGANIZATION_ID!,
      agentId: process.env.MAVEN_AGENT_ID!,
      apiKey: process.env.MAVEN_API_KEY!,
    },
  };
}
