# Docsie Connector

Knowledge connector that syncs Docsie documentation to Maven AGI. Initially built for HubSync, designed for reuse across Maven AGI customers.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docsie API credentials
- Maven AGI organization credentials

## Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment template and fill in credentials:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your credentials:
   - `DOCSIE_API_KEY` - Your Docsie API key
   - `MAVEN_ORGANIZATION_ID` - Maven AGI organization ID
   - `MAVEN_AGENT_ID` - Maven AGI agent ID
   - `MAVEN_API_KEY` - Maven AGI API key

## Usage

### Validate Credentials

Before syncing, validate your API credentials:

```bash
pnpm validate
```

This tests authentication and displays resource counts.

### Run Sync

Sync all Docsie documents to Maven:

```bash
pnpm sync
```

### Development

```bash
# Run with watch mode
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `DOCSIE_API_KEY` | Docsie API authentication key | Required |
| `DOCSIE_BASE_URL` | Docsie API base URL | `https://app.docsie.io/api/v1` |
| `MAVEN_ORGANIZATION_ID` | Maven AGI organization ID | Required |
| `MAVEN_AGENT_ID` | Maven AGI agent ID | Required |
| `MAVEN_API_KEY` | Maven AGI API key | Required |
| `SYNC_BATCH_SIZE` | Documents per upload batch | `50` |
| `RATE_LIMIT_CONCURRENT` | Max concurrent API requests | `5` |
| `RATE_LIMIT_DELAY_MS` | Delay between requests (ms) | `200` |

## Architecture

```
src/
├── index.ts         # CLI entry point
├── validate.ts      # Credential validation script
├── docsie/          # Docsie API client
├── maven/           # Maven SDK integration
├── sync/            # Sync orchestration
└── types/           # Shared types
```

## License

ISC
