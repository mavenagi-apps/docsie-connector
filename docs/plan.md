# Docsie Connector - Implementation Plan

**Spec**: [docs/spec.md](./spec.md)
**Approach**: TDD per solutions-tools/guides/KNOWLEDGE_APP_BEST_PRACTICES.md

---

## Epic 1: Project Setup

### E1-S1: Initialize Project Structure ✅
**Size**: XS
**Status**: Complete (2025-02-09)
**Commit**: `6a50809`
**Description**: Set up TypeScript project with proper config
**Acceptance Criteria**:
- [x] package.json with dependencies (mavenagi, bottleneck, dotenv)
- [x] tsconfig.json configured
- [x] .env.example with required vars
- [x] Basic README with setup instructions
- [x] Git initialized with proper .gitignore

---

## Epic 2: Docsie API Client

### E2-S1: Implement Docsie Client with Auth ✅
**Size**: S
**Status**: Complete (2025-02-09)
**Commit**: `dba7912`
**Description**: Create DocsieClient class with authentication
**Acceptance Criteria**:
- [x] DocsieClient class initialized with API key
- [x] Handles Bearer token auth in requests
- [x] Has configurable base URL
- [x] Test: Authentication success/failure

### E2-S2: Implement Pagination Helper ✅
**Size**: S
**Status**: Complete (2025-02-09)
**Commit**: `af2354f`
**Description**: Generic pagination fetcher following KB best practices
**Acceptance Criteria**:
- [x] fetchAllWithPagination() method
- [x] Handles page/per_page params
- [x] Stops when results < per_page
- [x] Logs page counts
- [x] Test: Pagination with 150 items (2 pages)

### E2-S3: Implement Document Fetching ✅
**Size**: S
**Status**: Complete (2025-02-09)
**Commit**: `8c4e130`
**Description**: Fetch workspaces, projects, documents
**Acceptance Criteria**:
- [x] getWorkspaces() method
- [x] getProjects(workspaceId) method
- [x] getDocuments(workspaceId) method
- [x] getDocument(documentId) for full content
- [x] Test: Mock API responses

### E2-S4: Add Rate Limiting ✅
**Size**: XS
**Status**: Complete (2025-02-09)
**Commit**: `69b814e`
**Description**: Use Bottleneck for rate limiting
**Acceptance Criteria**:
- [x] Bottleneck configured (5 concurrent, 200ms delay)
- [x] Applied to all API requests
- [x] Test: Verify delays between requests

---

## Epic 3: Maven Integration

### E3-S1: Transform Docsie to Maven Format ✅
**Size**: S
**Status**: Complete (2025-02-09)
**Commit**: `4f14f7b`
**Description**: Convert Docsie docs to Maven knowledge schema
**Acceptance Criteria**:
- [x] transformToMavenFormat() function
- [x] Maps all required fields
- [x] Handles missing/optional fields
- [x] Uses referenceId for deduplication
- [x] Test: Transform sample Docsie doc

### E3-S2: Implement Maven Upload ✅
**Size**: M
**Status**: Complete (2025-02-09)
**Commit**: `27b6e5a`
**Description**: Upload docs to Maven in chunks
**Acceptance Criteria**:
- [x] Uses Maven SDK
- [x] Processes in 50-doc chunks
- [x] Logs progress per chunk
- [x] Returns success/failure counts
- [x] Test: Mock Maven SDK upload

### E3-S3: Add Error Handling ✅
**Size**: S
**Status**: Complete (2025-02-09)
**Commit**: `670aa6a`
**Description**: Retry logic + error logging
**Acceptance Criteria**:
- [x] Retries transient failures (3x with backoff)
- [x] Logs errors with context
- [x] Continues on single doc failure
- [x] Returns detailed error report
- [x] Test: Retry behavior

---

## Epic 4: Sync Orchestration

### E4-S1: Implement Sync Flow ✅
**Size**: M
**Status**: Complete (2025-02-10)
**Commit**: `5300597`
**Description**: Main sync orchestrator
**Acceptance Criteria**:
- [x] DocsieSync class
- [x] syncAll() method
- [x] Fetches all docs from Docsie
- [x] Transforms and uploads to Maven
- [x] Returns SyncResult with counts
- [x] Test: End-to-end with mocks

### E4-S2: Add Validation Script ✅
**Size**: S
**Status**: Complete (2025-02-10)
**Commit**: `8495899`
**Description**: Pre-sync validation (from existing script)
**Acceptance Criteria**:
- [x] validate.ts script
- [x] Tests auth + counts resources
- [x] Compares to expected counts
- [x] Reports missing permissions
- [x] Run before first sync

### E4-S3: Create CLI Entry Point ✅
**Size**: XS
**Status**: Complete (2025-02-10)
**Commit**: `db5afeb`
**Description**: CLI for running sync
**Acceptance Criteria**:
- [x] index.ts with env validation
- [x] Runs sync with error handling
- [x] Exits with proper codes
- [x] Clear console output

---

## Epic 5: Testing & Documentation

### E5-S1: Write Unit Tests ✅
**Size**: M
**Status**: Complete (2025-02-10)
**Commit**: `684e220`
**Description**: Test coverage for all modules
**Acceptance Criteria**:
- [x] DocsieClient tests (20 tests, 100% coverage)
- [x] Transform tests (16 tests, 100% coverage)
- [x] Sync orchestration tests (8 tests, 98% coverage)
- [x] >80% coverage (90.19% overall)

### E5-S2: Write Integration Test ✅
**Size**: S
**Status**: Complete (2025-02-10)
**Commit**: `a549e07`
**Description**: End-to-end test with test fixtures
**Acceptance Criteria**:
- [x] Mock Docsie API responses
- [x] Mock Maven SDK
- [x] Verifies 108-doc sync
- [x] Runs in CI (all mocked, no external deps)

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
