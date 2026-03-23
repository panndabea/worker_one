import Stripe from 'stripe';

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

    if (request.method === 'GET' && url.pathname === '/config') {
      if (!env.STRIPE_PUBLISHABLE_KEY) {
        return jsonResponse({ error: 'STRIPE_PUBLISHABLE_KEY is not configured' }, 500);
      }
      return jsonResponse({ publishableKey: env.STRIPE_PUBLISHABLE_KEY });
    }

    if (request.method === 'POST' && url.pathname === '/create-payment-intent') {
      if (!env.STRIPE_SECRET_KEY) {
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

      const stripe = new Stripe(env.STRIPE_SECRET_KEY);
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
