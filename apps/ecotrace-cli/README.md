# @ecotrace/cli

> **Application Implementation 1** for Kiroween (Skeleton Crew Category).  
> Lightweight command-line interface for calculating, auditing, and mitigating e-commerce logistics emissions.

## Installation
```bash
npm install -g @ecotrace/cli
# or run directly with npx
npx ecotrace --help
```

## Commands
- `ecotrace init`: Setup store defaults and link Kiro hooks.
- `ecotrace calculate -d <km> -w <kg> -c <carrier>`: Immediate shipping emission audit ($E = d \cdot w \cdot f$).
- `ecotrace audit [manifests.json]`: Batch audit manifests and generate ASCII scorecard.
- `ecotrace kiro run`: Trigger autonomous Kiro agent audit.
- `ecotrace listen`: Verify webhook daemon status.
