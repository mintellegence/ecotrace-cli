/**
 * Kiro CLI Agent Specification Metadata & Helpers
 */

export const KIRO_AGENT_SPEC = {
  schema: 'https://kiro.dev/schemas/agent-v1.json',
  name: 'ecotrace-auditor',
  version: '1.0.0',
  category: 'Skeleton Crew',
  description: 'Autonomous background carbon auditing agent for e-commerce shipping logistics (Shopify & WooCommerce)',
  author: 'EcoTrace Open Source Community',
  license: 'Apache-2.0',
  capabilities: [
    'background-webhook-ingestion',
    'freight-carbon-accounting',
    'glec-framework-compliance',
    'route-optimization-advisory',
    'carbon-ledger-reporting',
  ],
  triggers: [
    {
      id: 'on-order-received',
      type: 'webhook',
      endpoints: ['/api/webhooks/shopify', '/api/webhooks/woocommerce'],
      action: 'audit_and_log',
    },
    {
      id: 'on-nightly-recap',
      type: 'cron',
      expression: '0 0 * * *',
      action: 'generate_daily_ledger',
    },
    {
      id: 'on-high-emission-detected',
      type: 'threshold',
      condition: "emissionKgCO2 >= 8.0 || carrierMode == 'air_freight'",
      action: 'emit_route_alert',
    },
  ],
  steeringPath: '.kiro/steering/eco-steering.md',
  hookPath: '.kiro/hooks/audit-hook.json',
};
