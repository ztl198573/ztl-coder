---
description: Search past plans, ledgers, and designs for relevant context
allowed-tools: Glob, Grep, Read
---

## Search Locations

- `thoughts/ledgers/` - Session continuity ledgers
- `thoughts/shared/plans/` - Implementation plans
- `thoughts/shared/designs/` - Design documents

## Output Format

```markdown
# Search Results: {query}

## Matches Found
### {file-name}
- Path: {full-path}
- Relevance: high/medium/low
- Date: {last-modified}
- Summary: {Brief summary of relevant content}

## Related Context
{Additional relevant information discovered}
```

## Your Task

1. Parse the search query from $ARGUMENTS
2. Search all artifact directories using Glob and Grep
3. Rank results by relevance
4. Return summaries with paths

## Relevance Scoring

- **High**: Query appears in title or 5+ times
- **Medium**: Query appears 2-5 times
- **Low**: Query appears 1-2 times

## Rules

- Search all artifact directories
- Rank results by relevance then date
- Provide summaries, not full content
- Note date of each artifact
