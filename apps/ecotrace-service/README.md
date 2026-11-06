# @ecotrace/service

> **Application Implementation 2** for Kiroween (Skeleton Crew Category).  
> Lightweight HTTP Webhook Listener Daemon that intercepts e-commerce orders (Shopify & WooCommerce), normalizes schemas, and triggers GLEC freight carbon calculations.

## Endpoints
- `POST /api/webhooks/shopify`: Intercepts `orders/create` events.
- `POST /api/webhooks/woocommerce`: Intercepts `order.created` REST v3 payloads.
- `GET /health`: Daemon health probe.
