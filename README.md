# Docsie Connector

Knowledge connector that syncs Docsie documentation to Maven AGI knowledge base. Initially built for HubSync, designed for reuse across Maven AGI customers.

## Features

- Syncs all Docsie workspaces and documents to Maven AGI
- Automatic pagination for large document sets
- Rate limiting to respect API limits
- Retry logic with exponential backoff for transient failures
- Pre-sync validation to verify credentials
- Detailed progress logging and error reporting

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docsie API credentials
- Maven AGI organization credentials

## Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd docsie-connector
pnpm install

# 2. Configure credentials
cp .env.example .env
# Edit .env with your credentials

# 3. Validate credentials
pnpm start validate

# 4. Run sync
pnpm start sync
```

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Docsie API Credentials
DOCSIE_API_KEY=your_docsie_api_key_here
DOCSIE_BASE_URL=https://app.docsie.io/api/v1

# Maven AGI Credentials
MAVEN_ORGANIZATION_ID=your_maven_org_id_here
MAVEN_AGENT_ID=your_maven_agent_id_here
MAVEN_API_KEY=your_maven_api_key_here
MAVEN_KNOWLEDGE_BASE_ID=docsie-kb
```

### 3. Validate Credentials

Before running a full sync, validate your API credentials:

```bash
pnpm start validate
```

This will:
- Test Docsie API authentication
- Count available workspaces and documents
- Test Maven AGI API connectivity
- Verify knowledge base access

Example output:
```
Docsie Connector v1.0.0

=== Running Pre-Sync Validation ===

Validating Docsie connection...
Found 1 workspace(s)
  HubSync Help Center: 108 document(s)
Total documents: 108

Validating Maven connection...
Knowledge base: docsie-kb

=== Validation Summary ===
Docsie: OK
Maven: OK
Ready to sync: YES
```

## Usage

### Sync Documents

Run a full sync from Docsie to Maven:

```bash
pnpm start sync
```

This will:
1. Fetch all workspaces from Docsie
2. Fetch all documents from each workspace
3. Transform documents to Maven knowledge format
4. Upload in batches of 50 with retry logic
5. Report success/failure counts

Example output:
```
Docsie Connector v1.0.0

=== Docsie to Maven Sync ===

Fetching workspaces from Docsie...
Found 1 workspace(s)
Fetching documents from workspace: HubSync Help Center
Found 108 document(s) in HubSync Help Center
Total documents to sync: 108
Transforming documents to Maven format...
Uploading documents to Maven...
Chunk 1/3: Uploading 50 documents...
Chunk 1 complete: 50 success, 0 failed
Chunk 2/3: Uploading 50 documents...
Chunk 2 complete: 100 success, 0 failed
Chunk 3/3: Uploading 8 documents...
Chunk 3 complete: 108 success, 0 failed
Sync complete: 108 uploaded, 0 failed in 12345ms

=== Sync Complete ===
Workspaces: 1
Documents: 108
Uploaded: 108
Failed: 0
Duration: 12345ms
```

### Validate Only

Test credentials without syncing:

```bash
pnpm start validate
```

## Configuration

| Environment Variable | Description | Required | Default |
|---------------------|-------------|----------|---------|
| `DOCSIE_API_KEY` | Docsie API authentication key | Yes | - |
| `DOCSIE_BASE_URL` | Docsie API base URL | No | `https://app.docsie.io/api/v1` |
| `MAVEN_ORGANIZATION_ID` | Maven AGI organization ID | Yes | - |
| `MAVEN_AGENT_ID` | Maven AGI agent ID | Yes | - |
| `MAVEN_API_KEY` | Maven AGI API key | Yes | - |
| `MAVEN_KNOWLEDGE_BASE_ID` | Target knowledge base ID | No | `docsie-kb` |

## API Credential Requirements

### Docsie API Key

1. Log in to your Docsie account
2. Go to Settings > API Keys
3. Create a new API key with read access
4. Copy the key to `DOCSIE_API_KEY`

**Required permissions:**
- Read access to workspaces
- Read access to documents

### Maven AGI Credentials

1. Log in to Maven AGI dashboard
2. Navigate to your organization settings
3. Find Organization ID and Agent ID
4. Generate an API key with knowledge base write access

**Required permissions:**
- `knowledge:write` - Upload documents to knowledge base
- `knowledge:read` - Verify knowledge base exists

## Development

```bash
# Run with watch mode
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Build for production
pnpm build
```

## Architecture

```
src/
├── index.ts              # CLI entry point
├── cli/
│   ├── env.ts           # Environment validation
│   ├── run.ts           # Sync/validate runners
│   └── index.ts         # CLI exports
├── docsie/
│   ├── client.ts        # Docsie API client with rate limiting
│   ├── types.ts         # Docsie API types
│   └── index.ts         # Docsie exports
├── maven/
│   ├── transform.ts     # Docsie → Maven transformation
│   ├── uploader.ts      # Maven SDK upload with retry
│   └── index.ts         # Maven exports
├── sync/
│   ├── sync.ts          # Main sync orchestrator
│   ├── validate.ts      # Pre-sync validation
│   └── index.ts         # Sync exports
└── utils/
    ├── retry.ts         # Retry with exponential backoff
    └── index.ts         # Utils exports
```

## Troubleshooting

### "Missing required environment variables"

**Cause:** Required environment variables are not set.

**Solution:**
1. Ensure `.env` file exists: `cp .env.example .env`
2. Fill in all required values (marked with `Required` above)
3. Check for typos in variable names

### "Docsie API error: 401 Unauthorized"

**Cause:** Invalid or expired Docsie API key.

**Solution:**
1. Verify `DOCSIE_API_KEY` is correct
2. Check if the API key has been revoked
3. Generate a new API key in Docsie settings

### "Maven validation failed: Not found"

**Cause:** Knowledge base doesn't exist or incorrect IDs.

**Solution:**
1. Verify `MAVEN_ORGANIZATION_ID` and `MAVEN_AGENT_ID`
2. Check `MAVEN_KNOWLEDGE_BASE_ID` exists in your organization
3. Ensure API key has access to the knowledge base

### "Rate limit exceeded"

**Cause:** Too many requests to Docsie API.

**Solution:**
- The connector includes built-in rate limiting (5 concurrent, 200ms delay)
- If still hitting limits, wait a few minutes and try again
- For large syncs, consider running during off-peak hours

### "Upload failed for [document]"

**Cause:** Individual document failed to upload after retries.

**Solution:**
1. Check the error message for specifics
2. Document may have invalid content or be too large
3. The sync continues with other documents
4. Re-run sync to retry failed documents

### Tests failing

```bash
# Run tests with verbose output
pnpm test -- --reporter=verbose

# Run specific test file
pnpm test:run src/docsie/client.test.ts
```

## Test Coverage

The connector has 90%+ test coverage with 96 tests:

| Module | Coverage |
|--------|----------|
| DocsieClient | 100% |
| Transform | 100% |
| MavenUploader | 100% |
| DocsieSync | 98% |
| Validation | 100% |
| CLI | 100% |

## License

ISC
