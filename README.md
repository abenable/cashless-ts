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
    collectionsSubscriptionKey: process.env.MOMO_COLLECTIONS_SUBSCRIPTION_KEY,
    disbursementsSubscriptionKey: process.env.MOMO_DISBURSEMENTS_SUBSCRIPTION_KEY,
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
  amount: '1000',
  currency: 'EUR', // MTN sandbox uses EUR. Use UGX for MTN Uganda production.
  externalId: 'ORDER-123',
  payer: { partyIdType: 'MSISDN', partyId: '46733123499' },
});

// Airtel Money USSD push
await cashless.airtel?.collections.ussdPush({
  reference: 'ORDER-123',
  subscriber: { country: 'UG', msisdn: '25677xxxxxxx' },
  transaction: { amount: 5000, id: 'ref-123' },
});
```

## Environments

- **MTN MoMo:** `sandbox` routes collections through `https://sandbox.momodeveloper.mtn.com/collection` and disbursements through `https://sandbox.momodeveloper.mtn.com/disbursement`.
- **Airtel Money (Uganda):** `sandbox` resolves to `https://openapiuat.airtel.ug`; `production` resolves to `https://openapi.airtel.ug`.

For other countries/deployments, pass a `baseUrl` explicitly.

`subscriptionKey` is still supported as a legacy fallback, but MTN integrations should prefer `collectionsSubscriptionKey` and `disbursementsSubscriptionKey` so each product uses the correct key and access token.

For MTN balance and account-holder checks, `momo.common` remains an alias for collection operations. Use `momo.collectionCommon` for collections and `momo.disbursementCommon` for disbursements when you need product-specific keys and balances.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
