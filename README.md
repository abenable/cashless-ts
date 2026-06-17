# @ablea/cashless

TypeScript SDK for mobile-money operations with **MTN MoMo** and **Airtel Money** in Africa.

This is a dependency-free, fetch-based SDK that talks directly to the provider APIs.

## Install

```bash
npm install @ablea/cashless
```

## Usage

```ts
import { CashlessClient } from '@ablea/cashless';

const cashless = new CashlessClient({
  momo: {
    apiUser: process.env.MOMO_API_USER,
    apiKey: process.env.MOMO_API_KEY,
    subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY,
    environment: 'sandbox', // or 'production'
  },
  airtel: {
    clientId: process.env.AIRTEL_CLIENT_ID,
    clientSecret: process.env.AIRTEL_CLIENT_SECRET,
    environment: 'sandbox', // or 'production'
    country: 'UG',
    currency: 'UGX',
  },
});

// MTN MoMo collection
await cashless.momo?.collections.requestToPay('ref-123', {
  amount: '5000',
  currency: 'UGX',
  externalId: 'ORDER-123',
  payer: { partyIdType: 'MSISDN', partyId: '25677xxxxxxx' },
});

// Airtel Money USSD push
await cashless.airtel?.collections.ussdPush({
  reference: 'ORDER-123',
  subscriber: { country: 'UG', msisdn: '25677xxxxxxx' },
  transaction: { amount: 5000, id: 'ref-123' },
});
```

## Environments

- **MTN MoMo:** `sandbox` resolves to `https://sandbox.momodeveloper.mtn.com`.
- **Airtel Money (Uganda):** `sandbox` resolves to `https://openapiuat.airtel.ug`; `production` resolves to `https://openapi.airtel.ug`.

For other countries/deployments, pass a `baseUrl` explicitly.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
