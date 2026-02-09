# Docsie Connector - Implementation Plan

**Spec**: [docs/spec.md](./spec.md)
**Approach**: TDD per solutions-tools/guides/KNOWLEDGE_APP_BEST_PRACTICES.md

---

## Epic 1: Project Setup

### E1-S1: Initialize Project Structure
**Size**: XS
**Description**: Set up TypeScript project with proper config
**Acceptance Criteria**:
- [ ] package.json with dependencies (mavenagi, bottleneck, dotenv)
- [ ] tsconfig.json configured
- [ ] .env.example with required vars
- [ ] Basic README with setup instructions
- [ ] Git initialized with proper .gitignore

---

## Epic 2: Docsie API Client

### E2-S1: Implement Docsie Client with Auth
**Size**: S
**Description**: Create DocsieClient class with authentication
**Acceptance Criteria**:
- [ ] DocsieClient class initialized with API key
- [ ] Handles Bearer token auth in requests
- [ ] Has configurable base URL
- [ ] Test: Authentication success/failure

### E2-S2: Implement Pagination Helper
**Size**: S
**Description**: Generic pagination fetcher following KB best practices
**Acceptance Criteria**:
- [ ] fetchAllWithPagination() method
- [ ] Handles page/per_page params
- [ ] Stops when results < per_page
- [ ] Logs page counts
- [ ] Test: Pagination with 150 items (2 pages)

### E2-S3: Implement Document Fetching
**Size**: S
**Description**: Fetch workspaces, projects, documents
**Acceptance Criteria**:
- [ ] getWorkspaces() method
- [ ] getProjects(workspaceId) method
- [ ] getDocuments(workspaceId) method
- [ ] getDocument(documentId) for full content
- [ ] Test: Mock API responses

### E2-S4: Add Rate Limiting
**Size**: XS
**Description**: Use Bottleneck for rate limiting
**Acceptance Criteria**:
- [ ] Bottleneck configured (5 concurrent, 200ms delay)
- [ ] Applied to all API requests
- [ ] Test: Verify delays between requests

---

## Epic 3: Maven Integration

### E3-S1: Transform Docsie to Maven Format
**Size**: S
**Description**: Convert Docsie docs to Maven knowledge schema
**Acceptance Criteria**:
- [ ] transformToMavenFormat() function
- [ ] Maps all required fields
- [ ] Handles missing/optional fields
- [ ] Uses referenceId for deduplication
- [ ] Test: Transform sample Docsie doc

### E3-S2: Implement Maven Upload
**Size**: M
**Description**: Upload docs to Maven in chunks
**Acceptance Criteria**:
- [ ] Uses Maven SDK
- [ ] Processes in 50-doc chunks
- [ ] Logs progress per chunk
- [ ] Returns success/failure counts
- [ ] Test: Mock Maven SDK upload

### E3-S3: Add Error Handling
**Size**: S
**Description**: Retry logic + error logging
**Acceptance Criteria**:
- [ ] Retries transient failures (3x with backoff)
- [ ] Logs errors with context
- [ ] Continues on single doc failure
- [ ] Returns detailed error report
- [ ] Test: Retry behavior

---

## Epic 4: Sync Orchestration

### E4-S1: Implement Sync Flow
**Size**: M
**Description**: Main sync orchestrator
**Acceptance Criteria**:
- [ ] DocsieSync class
- [ ] syncAll() method
- [ ] Fetches all docs from Docsie
- [ ] Transforms and uploads to Maven
- [ ] Returns SyncResult with counts
- [ ] Test: End-to-end with mocks

### E4-S2: Add Validation Script
**Size**: S
**Description**: Pre-sync validation (from existing script)
**Acceptance Criteria**:
- [ ] validate.ts script
- [ ] Tests auth + counts resources
- [ ] Compares to expected counts
- [ ] Reports missing permissions
- [ ] Run before first sync

### E4-S3: Create CLI Entry Point
**Size**: XS
**Description**: CLI for running sync
**Acceptance Criteria**:
- [ ] index.ts with env validation
- [ ] Runs sync with error handling
- [ ] Exits with proper codes
- [ ] Clear console output

---

## Epic 5: Testing & Documentation

### E5-S1: Write Unit Tests
**Size**: M
**Description**: Test coverage for all modules
**Acceptance Criteria**:
- [ ] DocsieClient tests
- [ ] Transform tests
- [ ] Sync orchestration tests
- [ ] >80% coverage

### E5-S2: Write Integration Test
**Size**: S
**Description**: End-to-end test with test fixtures
**Acceptance Criteria**:
- [ ] Mock Docsie API responses
- [ ] Mock Maven SDK
- [ ] Verifies 108-doc sync
- [ ] Runs in CI

### E5-S3: Final Documentation
**Size**: XS
**Description**: Complete README + runbook
**Acceptance Criteria**:
- [ ] Setup instructions
- [ ] Usage examples
- [ ] Troubleshooting guide
- [ ] API credential requirements

---

## Execution Order

1. **E1** (Setup) → Start here
2. **E2** (Docsie Client) → Core API integration
3. **E3** (Maven Integration) → Upload logic
4. **E4** (Orchestration) → Tie it together
5. **E5** (Testing) → Validate everything

**Estimated**: 3-4 days with API creds, 5 days without (due to validation delays)

---

## Dependencies

**Critical Blockers**:
- Docsie API credentials from HubSync (Damon)
- Maven org/agent IDs for HubSync

**Tools Needed**:
- solutions-tools repo patterns
- Knowledge connector best practices guide
- TDD workflow per solutions-tools

---

## Notes

- Follow TDD: Write tests FIRST for each story
- Use solutions-tools /build command if available
- Reference private-papaya-app for knowledge connector patterns
- Keep chunks small (50 docs) per best practices
- Log extensively for debugging
