/**
 * Index of the Kiro assets in /.kiro that were used to build EcoTrace.
 * The web app serves these files read-only (whitelist below) so judges and users can
 * see the real specs, steering, hooks and agent without cloning the repo.
 */

export const KIRO_FILES = [
  { path: '.kiro/specs/carbon-engine/requirements.md', kind: 'spec', title: 'Spec: carbon engine — requirements (EARS)' },
  { path: '.kiro/specs/carbon-engine/design.md', kind: 'spec', title: 'Spec: carbon engine — design' },
  { path: '.kiro/specs/carbon-engine/tasks.md', kind: 'spec', title: 'Spec: carbon engine — tasks' },
  { path: '.kiro/specs/signed-webhooks/requirements.md', kind: 'spec', title: 'Spec: signed webhooks — requirements (EARS)' },
  { path: '.kiro/specs/signed-webhooks/design.md', kind: 'spec', title: 'Spec: signed webhooks — design' },
  { path: '.kiro/specs/signed-webhooks/tasks.md', kind: 'spec', title: 'Spec: signed webhooks — tasks' },
  { path: '.kiro/steering/product.md', kind: 'steering', title: 'Steering: product principles (always)' },
  { path: '.kiro/steering/tech.md', kind: 'steering', title: 'Steering: tech stack & commands (always)' },
  { path: '.kiro/steering/structure.md', kind: 'steering', title: 'Steering: repo structure (always)' },
  { path: '.kiro/steering/emission-engine.md', kind: 'steering', title: 'Steering: engine rules (fileMatch)' },
  { path: '.kiro/steering/security.md', kind: 'steering', title: 'Steering: security rules (fileMatch)' },
  { path: '.kiro/hooks/test-foundation-on-save.json', kind: 'hook', title: 'Hook: run tests on engine save' },
  { path: '.kiro/hooks/typecheck-apps-on-save.json', kind: 'hook', title: 'Hook: type-check on app save' },
  { path: '.kiro/hooks/security-review-server.json', kind: 'hook', title: 'Hook: security review prompt' },
  { path: '.kiro/hooks/guard-secrets.json', kind: 'hook', title: 'Hook: block secrets (PreToolUse)' },
  { path: '.kiro/hooks/scripts/guard-secrets.mjs', kind: 'hook', title: 'Hook script: secret scanner' },
  { path: '.kiro/agents/carbon-auditor.md', kind: 'agent', title: 'Custom agent: carbon-auditor' },
] as const;

export type KiroFileKind = (typeof KIRO_FILES)[number]['kind'];

/** Short summary used by `ecotrace kiro specs`. */
export const KIRO_AGENT_SPEC = {
  project: 'EcoTrace',
  category: 'Kiroween 2026: Skeleton Crew',
  specs: ['carbon-engine', 'signed-webhooks'],
  steering: ['product.md (always)', 'tech.md (always)', 'structure.md (always)', 'emission-engine.md (fileMatch)', 'security.md (fileMatch)'],
  hooks: [
    'PostFileSave foundation/tests -> vitest run',
    'PostFileSave apps -> tsc --noEmit',
    'PostFileSave apps/ecotrace-web/server -> agent security review',
    'PreToolUse write -> block .env files and credential-like strings',
  ],
  agents: ['carbon-auditor: audits an order export via the CLI, read-only'],
};
