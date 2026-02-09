# Docsie Knowledge Connector - Specification

**Customer**: HubSync
**Ticket**: SOLN-2326
**Type**: Custom Knowledge Integration
**Timeline**: 3-5 days post-validation

## Problem

HubSync manually uploaded ~108 Docsie documents. Need API-based auto-sync to eliminate manual re-upload when docs change.

## Solution

Build custom Docsie→Maven knowledge connector using solutions-tools patterns.

## Requirements

### Functional
1. Authenticate to Docsie API (Bearer token)
2. Fetch all documents from workspace
3. Handle pagination properly (avoid missing docs)
4. Transform to Maven knowledge format
5. Upload to Maven with error handling
6. Log sync results

### Non-Functional
1. Rate limiting (respect API limits)
2. Retries for transient failures
3. Idempotent (safe to re-run)
4. Full content (not summaries)
5. Skip invalid docs

## Technical Design

**Stack**: TypeScript + Maven SDK + Bottleneck
**Pattern**: Follow private-*-app knowledge connector structure
**Testing**: TDD - write tests first per solutions-tools guide

**Architecture**:
```
DocsieClient → fetchDocs() → transform() → MavenSDK.upload() → log()
```

## Success Criteria

- ✅ Syncs 108 docs successfully
- ✅ Matches manual uploads
- ✅ <5 min sync time
- ✅ Graceful error handling
- ✅ Clear logs

## Blockers

Need from HubSync (Damon):
- Docsie API key
- Workspace ID
- Project IDs

## References

- [Docsie API](https://www.docsie.io/solutions/api-documentation/)
- [SOLN-2326](https://linear.app/mavenagi/issue/SOLN-2326)
- [KB Best Practices](../../../solutions-tools/guides/KNOWLEDGE_APP_BEST_PRACTICES.md)
