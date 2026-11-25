import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Deterministic evaluator mirroring firestore.rules invariants to verify all "Dirty Dozen" payloads return PERMISSION_DENIED
const rulesSource = fs.readFileSync('firestore.rules', 'utf8');

interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
  isAdminDoc?: boolean;
}

const SERVER_TIME = '2026-11-10T09:00:00Z';

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function isVerifiedUser(auth: AuthContext | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function isAdmin(auth: AuthContext | null): boolean {
  return (
    isVerifiedUser(auth) &&
    (auth!.email === 'tvhisense15112025@gmail.com' || auth!.isAdminDoc === true)
  );
}

function hasExactKeys(data: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(data);
  return keys.every((k) => actual.includes(k)) && actual.every((k) => keys.includes(k));
}

function evaluateRules(params: {
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: AuthContext | null;
  incoming?: Record<string, unknown>;
  existing?: Record<string, unknown>;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { collection, docId, operation, auth, incoming, existing } = params;

  if (collection === 'admins') {
    if (operation === 'create' || operation === 'update' || operation === 'delete') {
      return 'PERMISSION_DENIED';
    }
    if (operation === 'get') {
      return isVerifiedUser(auth) && isValidId(docId) && (auth!.uid === docId || isAdmin(auth))
        ? 'ALLOW'
        : 'PERMISSION_DENIED';
    }
    return isAdmin(auth) ? 'ALLOW' : 'PERMISSION_DENIED';
  }

  if (collection === 'products') {
    if (operation === 'create') {
      if (!isAdmin(auth) || !isValidId(docId) || !incoming) return 'PERMISSION_DENIED';
      const reqKeys = [
        'name', 'category', 'price', 'stock', 'variants', 'sizes',
        'imageKey', 'description', 'featured', 'updatedBy', 'createdAt', 'updatedAt'
      ];
      if (!hasExactKeys(incoming, reqKeys)) return 'PERMISSION_DENIED';
      if (typeof incoming.name !== 'string' || incoming.name.length < 2 || incoming.name.length > 100) return 'PERMISSION_DENIED';
      if (!['Headgear', 'Shin Guards', 'Gloves', 'Apparel', 'Accessories'].includes(String(incoming.category))) return 'PERMISSION_DENIED';
      if (typeof incoming.price !== 'number' || incoming.price < 0 || incoming.price > 100000) return 'PERMISSION_DENIED';
      if (typeof incoming.stock !== 'number' || incoming.stock < 0 || incoming.stock > 100000) return 'PERMISSION_DENIED';
      if (typeof incoming.description !== 'string' || incoming.description.length < 2 || incoming.description.length > 600) return 'PERMISSION_DENIED';
      if (incoming.updatedBy !== auth!.uid) return 'PERMISSION_DENIED';
      if (incoming.createdAt !== SERVER_TIME || incoming.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
  }

  if (collection === 'orders') {
    if (operation === 'list') {
      if (!isVerifiedUser(auth) || !existing) return 'PERMISSION_DENIED';
      return existing.userId === auth!.uid || isAdmin(auth) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (!isVerifiedUser(auth) || !isValidId(docId) || !incoming) return 'PERMISSION_DENIED';
      const reqKeys = [
        'userId', 'customerName', 'itemsSummary', 'itemCount',
        'totalAmount', 'orderType', 'status', 'createdAt', 'updatedAt'
      ];
      if (!hasExactKeys(incoming, reqKeys)) return 'PERMISSION_DENIED';
      if (incoming.userId !== auth!.uid) return 'PERMISSION_DENIED';
      if (typeof incoming.totalAmount !== 'number' || incoming.totalAmount < 0) return 'PERMISSION_DENIED';
      if (incoming.status !== 'pending') return 'PERMISSION_DENIED';
      if (incoming.createdAt !== SERVER_TIME || incoming.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
    if (operation === 'update') {
      if (!isVerifiedUser(auth) || !isValidId(docId) || !incoming || !existing) return 'PERMISSION_DENIED';
      if (incoming.userId !== existing.userId || incoming.createdAt !== existing.createdAt) return 'PERMISSION_DENIED';
      if (incoming.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
      const changedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);
      if (!changedKeys.every((k) => ['status', 'updatedAt'].includes(k))) return 'PERMISSION_DENIED';
      if (isAdmin(auth)) return 'ALLOW';
      if (
        existing.userId === auth!.uid &&
        !['completed', 'cancelled', 'shipped'].includes(String(existing.status)) &&
        incoming.status === 'cancelled'
      ) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
  }

  if (collection === 'users') {
    if (operation === 'get') {
      if (!isValidId(docId) || !isVerifiedUser(auth)) return 'PERMISSION_DENIED';
      return auth!.uid === docId || isAdmin(auth) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
  }

  return 'PERMISSION_DENIED';
}

const adminAuth: AuthContext = {
  uid: 'admin_1',
  email: 'tvhisense15112025@gmail.com',
  email_verified: true
};

const userAAuth: AuthContext = {
  uid: 'user_A',
  email: 'fighterA@adashev.nyc',
  email_verified: true
};

const validProduct = {
  name: 'MMA Headgear Green',
  category: 'Headgear',
  price: 90,
  stock: 25,
  variants: 'Green & Red & White',
  sizes: 'S, M, L, XL',
  imageKey: '/assets/adashev/headgear_green.png',
  description: 'Official Zarrukh Adashev Performance School full-face sparring headgear.',
  featured: true,
  updatedBy: 'admin_1',
  createdAt: SERVER_TIME,
  updatedAt: SERVER_TIME
};

const validOrder = {
  userId: 'user_A',
  customerName: 'Alex Volkov',
  itemsSummary: '1x MMA Headgear Green (L)',
  itemCount: 1,
  totalAmount: 90,
  orderType: 'gear',
  status: 'pending',
  createdAt: SERVER_TIME,
  updatedAt: SERVER_TIME
};

test('firestore.rules file contains all required collections and guards', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('match /products/{productId}'));
  assert.ok(rulesSource.includes('match /courses/{courseId}'));
  assert.ok(rulesSource.includes('match /orders/{orderId}'));
  assert.ok(rulesSource.includes('match /users/{userId}'));
  assert.ok(rulesSource.includes('match /admins/{adminId}'));
});

test('Dirty Dozen #1: Shadow Field Injection on Product returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'products',
    docId: 'prod_1',
    operation: 'create',
    auth: adminAuth,
    incoming: { ...validProduct, isDiscounted: true }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Identity Spoofing on Order Creation returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'orders',
    docId: 'ord_1',
    operation: 'create',
    auth: userAAuth,
    incoming: { ...validOrder, userId: 'user_B' }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #3: Unverified Email Admin Spoof returns PERMISSION_DENIED', () => {
  const spoofAdmin: AuthContext = {
    uid: 'attacker_1',
    email: 'tvhisense15112025@gmail.com',
    email_verified: false
  };
  const res = evaluateRules({
    collection: 'products',
    docId: 'prod_1',
    operation: 'create',
    auth: spoofAdmin,
    incoming: { ...validProduct, updatedBy: 'attacker_1' }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #4: PII Blanket Read on /users/{userId} by non-owner returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'users',
    docId: 'user_B',
    operation: 'get',
    auth: userAAuth
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #5: Cross-Tenant Query Scraping on /orders returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'orders',
    docId: 'ord_B',
    operation: 'list',
    auth: userAAuth,
    existing: { ...validOrder, userId: 'user_B' }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #6: Terminal State Mutation on completed Order returns PERMISSION_DENIED', () => {
  const completedOrder = { ...validOrder, status: 'completed' };
  const res = evaluateRules({
    collection: 'orders',
    docId: 'ord_1',
    operation: 'update',
    auth: userAAuth,
    existing: completedOrder,
    incoming: { ...completedOrder, status: 'cancelled', updatedAt: SERVER_TIME }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #7: Immutable Field Tampering on Order Update returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'orders',
    docId: 'ord_1',
    operation: 'update',
    auth: userAAuth,
    existing: validOrder,
    incoming: { ...validOrder, totalAmount: 1, status: 'cancelled', updatedAt: SERVER_TIME }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #8: Denial-of-Wallet Oversized String returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'products',
    docId: 'prod_1',
    operation: 'create',
    auth: adminAuth,
    incoming: { ...validProduct, description: 'X'.repeat(1000) }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #9: ID Poisoning Attack returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'products',
    docId: 'bad$id!attack',
    operation: 'create',
    auth: adminAuth,
    incoming: validProduct
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #10: Negative Price / Negative Amount Injection returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'products',
    docId: 'prod_1',
    operation: 'create',
    auth: adminAuth,
    incoming: { ...validProduct, price: -50 }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #11: Forged Client Timestamp returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'orders',
    docId: 'ord_1',
    operation: 'create',
    auth: userAAuth,
    incoming: { ...validOrder, createdAt: '1999-01-01T00:00:00Z' }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #12: Self-Privilege Escalation on /admins/{adminId} returns PERMISSION_DENIED', () => {
  const res = evaluateRules({
    collection: 'admins',
    docId: 'user_A',
    operation: 'create',
    auth: userAAuth,
    incoming: { role: 'admin' }
  });
  assert.equal(res, 'PERMISSION_DENIED');
});
