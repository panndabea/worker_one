import Stripe from 'stripe';

const CORS_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json',
  ...CORS_HEADERS,
});

const OPTIONS_RESPONSE = new Response(null, {
  status: 204,
  headers: CORS_HEADERS,
});

const PUBLISHABLE_KEY_NAMES = Object.freeze([
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PUBLIC_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
]);

const SLASH_CHAR_CODE = '/'.charCodeAt(0);
const MAX_STRIPE_CLIENTS_CACHE_SIZE = 4;
const stripeClients = new Map();

function getConfiguredKey(env, names) {
  for (const name of names) {
    const value = env?.[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function normalizePath(pathname) {
  if (pathname === '/') {
    return pathname;
  }

  let end = pathname.length;
  while (end > 1 && pathname.charCodeAt(end - 1) === SLASH_CHAR_CODE) {
    end -= 1;
  }
  return pathname.slice(0, end);
}

function getStripeClient(secretKey) {
  const cachedClient = stripeClients.get(secretKey);
  if (cachedClient) {
    stripeClients.delete(secretKey);
    stripeClients.set(secretKey, cachedClient);
    return cachedClient;
  }

  if (stripeClients.size >= MAX_STRIPE_CLIENTS_CACHE_SIZE) {
    const oldestKey = stripeClients.keys().next().value;
    if (oldestKey !== undefined) {
      stripeClients.delete(oldestKey);
    }
  }

  const stripeClient = new Stripe(secretKey);
  stripeClients.set(secretKey, stripeClient);
  return stripeClient;
}

export default {
  async fetch(request, env) {
    const method = request.method;

    if (method === 'OPTIONS') {
      return OPTIONS_RESPONSE;
    }

    const pathname = normalizePath(new URL(request.url).pathname);
    const route = pathname.startsWith('/api/') ? pathname.slice(4) : pathname;

    if (method === 'GET' && route === '/config') {
      const publishableKey = getConfiguredKey(env, PUBLISHABLE_KEY_NAMES);
      if (!publishableKey) {
        return jsonResponse(
          {
            error:
              'STRIPE_PUBLISHABLE_KEY is not configured (accepted aliases: STRIPE_PUBLIC_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, VITE_STRIPE_PUBLISHABLE_KEY)',
          },
          500
        );
      }
      return jsonResponse({ publishableKey });
    }

    if (method === 'POST' && route === '/create-payment-intent') {
      const secretKey = getConfiguredKey(env, ['STRIPE_SECRET_KEY']);
      if (!secretKey) {
        return jsonResponse({ error: 'STRIPE_SECRET_KEY is not configured' }, 500);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }

      const { amount, currency = 'usd' } = body;
      if (!Number.isInteger(amount) || amount < 50) {
        return jsonResponse({ error: 'amount must be an integer in cents and at least 50' }, 400);
      }
      if (amount > 99999999) {
        return jsonResponse({ error: 'amount exceeds the maximum of 99999999 cents' }, 400);
      }

      const stripe = getStripeClient(secretKey);
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency,
          automatic_payment_methods: { enabled: true },
        });
        return jsonResponse({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        return jsonResponse({ error: error.message }, 500);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
