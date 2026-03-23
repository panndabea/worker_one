import Stripe from 'stripe';

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
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const route = pathname.startsWith('/api/') ? pathname.slice(4) : pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method === 'GET' && route === '/config') {
      const publishableKey = getConfiguredKey(env, [
        'STRIPE_PUBLISHABLE_KEY',
        'STRIPE_PUBLIC_KEY',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'VITE_STRIPE_PUBLISHABLE_KEY',
      ]);
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

    if (request.method === 'POST' && route === '/create-payment-intent') {
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

      const stripe = new Stripe(secretKey);
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
