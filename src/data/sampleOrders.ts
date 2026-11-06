/**
 * Realistic Sample E-Commerce Order Payloads (Shopify & WooCommerce)
 * For test audits, CLI demo runs, and mock webhook dispatches.
 */

import { UnifiedOrder } from '../types/index.ts';

export const SAMPLE_SHOPIFY_WEBHOOK = {
  id: 8204918204,
  name: '#SH-1042',
  order_number: 1042,
  created_at: new Date().toISOString(),
  currency: 'USD',
  total_price: '189.50',
  total_weight: 4200, // 4.2 kg in grams
  admin_graphql_api_id: 'gid://shopify/Order/8204918204',
  customer: {
    first_name: 'Elena',
    last_name: 'Vance',
    email: 'elena.vance@example.com',
  },
  shipping_address: {
    first_name: 'Elena',
    last_name: 'Vance',
    address1: '742 Evergreen Terrace',
    city: 'Seattle',
    province: 'Washington',
    province_code: 'WA',
    country: 'United States',
    country_code: 'US',
    zip: '98101',
    latitude: 47.6062,
    longitude: -122.3321,
  },
  fulfillment_city: 'Memphis',
  fulfillment_state: 'TN',
  line_items: [
    {
      id: 9182301,
      title: 'Ergonomic Bamboo Standing Desk Converter',
      quantity: 1,
      grams: 3500,
      price: '149.00',
      sku: 'DESK-BAM-01',
    },
    {
      id: 9182302,
      title: 'Recycled Hemp Desk Mat',
      quantity: 1,
      grams: 700,
      price: '40.50',
      sku: 'MAT-HEMP-02',
    },
  ],
  shipping_lines: [
    {
      title: 'FedEx Express 2-Day Air',
      carrier_identifier: 'FedEx Express Air',
      code: 'FEDEX_2_DAY',
      price: '24.00',
      source: 'fedex',
    },
  ],
};

export const SAMPLE_WOOCOMMERCE_WEBHOOK = {
  id: 28490,
  number: '28490',
  date_created: new Date().toISOString(),
  currency: 'USD',
  total: '94.20',
  payment_method_title: 'Stripe Credit Card',
  billing: {
    first_name: 'Marcus',
    last_name: 'Brody',
    email: 'marcus.b@example.org',
    city: 'Austin',
    state: 'TX',
    postcode: '78701',
    country: 'US',
  },
  shipping: {
    first_name: 'Marcus',
    last_name: 'Brody',
    address_1: '1204 Congress Ave',
    city: 'Austin',
    state: 'TX',
    postcode: '78701',
    country: 'US',
  },
  line_items: [
    {
      id: 39182,
      name: 'Organic Cotton Fair-Trade Hoodie',
      product_id: 104,
      quantity: 2,
      price: '45.00',
      total: '90.00',
      sku: 'HOOD-ORG-BLK',
      meta_data: [{ key: '_weight', value: '0.85' }], // 0.85 kg each
    },
  ],
  shipping_lines: [
    {
      id: 88,
      method_title: 'USPS Ground Advantage (Regional Van)',
      method_id: 'usps_ground',
      total: '4.20',
    },
  ],
};

export const INITIAL_SAMPLE_ORDERS: UnifiedOrder[] = [
  {
    orderId: '#SH-1040',
    platform: 'shopify',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    customer: { name: 'Sarah Connor', email: 'sarah@cyberdyne.net' },
    origin: { city: 'Memphis', state: 'TN', country: 'US' },
    destination: { city: 'Los Angeles', state: 'CA', country: 'US' },
    items: [{ id: '1', name: 'Smart Solar Battery Unit', quantity: 1, weightKg: 8.5 }],
    totalWeightKg: 8.5,
    carrier: 'DHL Express Air Freight',
    shippingMethod: 'Express Next-Day Air',
    totalPrice: 420.0,
  },
  {
    orderId: 'WC-28488',
    platform: 'woocommerce',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    customer: { name: 'Liam Davies', email: 'liam@oxford.uk' },
    origin: { city: 'Frankfurt', country: 'DE' },
    destination: { city: 'London', country: 'GB' },
    items: [{ id: '2', name: 'Refurbished Audio Monitor', quantity: 1, weightKg: 3.2 }],
    totalWeightKg: 3.2,
    carrier: 'DPD Cross-Border Rail & Truck',
    shippingMethod: 'Standard Ground Road',
    totalPrice: 175.0,
  },
  {
    orderId: '#SH-1041',
    platform: 'shopify',
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    customer: { name: 'Aoi Tanaka', email: 'aoi.t@tokyo.jp' },
    origin: { city: 'Tokyo', country: 'JP' },
    destination: { city: 'Tokyo', country: 'JP' },
    items: [{ id: '3', name: 'Artisan Matcha Ceramic Set', quantity: 1, weightKg: 1.1 }],
    totalWeightKg: 1.1,
    carrier: 'Eco-Express Electric Van',
    shippingMethod: 'Local EV Same-Day Delivery',
    totalPrice: 65.0,
  },
  {
    orderId: 'WC-28489',
    platform: 'woocommerce',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    customer: { name: 'David Kim', email: 'dkim@vancouver.ca' },
    origin: { city: 'Ontario', state: 'CA', country: 'US' },
    destination: { city: 'Vancouver', country: 'CA' },
    items: [{ id: '4', name: 'Winter Trekking Boots', quantity: 1, weightKg: 2.4 }],
    totalWeightKg: 2.4,
    carrier: 'FedEx Ground Freight',
    shippingMethod: 'Ground International',
    totalPrice: 130.0,
  },
];
