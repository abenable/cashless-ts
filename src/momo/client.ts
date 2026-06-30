import { MomoError } from './errors.js';
import { CollectionsResource } from './resources/collections.js';
import { CommonResource } from './resources/common.js';
import { DisbursementsResource } from './resources/disbursements.js';

export type MomoEnvironment = 'sandbox' | 'production';

export const MOMO_SANDBOX_BASE_URL = 'https://sandbox.momodeveloper.mtn.com';
export const MOMO_SANDBOX_COLLECTION_BASE_URL = `${MOMO_SANDBOX_BASE_URL}/collection`;
export const MOMO_SANDBOX_DISBURSEMENT_BASE_URL = `${MOMO_SANDBOX_BASE_URL}/disbursement`;

export interface MomoClientOptions {
  apiUser: string;
  apiKey: string;
  /** Legacy fallback key used when operation-specific keys are not provided. */
  subscriptionKey?: string;
  /** MTN Collections product subscription key. */
  collectionsSubscriptionKey?: string;
  /** MTN Disbursements product subscription key. */
  disbursementsSubscriptionKey?: string;
  /** If omitted, `environment` must be `'sandbox'`. */
  baseUrl?: string;
  /** Determines the default MTN MoMo base URL. */
  environment?: MomoEnvironment;
  targetEnvironment?: string;
  fetchFn?: typeof fetch;
}

export type MomoProduct = 'collections' | 'disbursements';

function resolveMomoBaseUrl(
  options: Pick<MomoClientOptions, 'baseUrl' | 'environment'>,
  product: MomoProduct
): string {
  if (options.baseUrl) {
    return options.baseUrl;
  }
  if (options.environment === 'sandbox') {
    return product === 'disbursements'
      ? MOMO_SANDBOX_DISBURSEMENT_BASE_URL
      : MOMO_SANDBOX_COLLECTION_BASE_URL;
  }
  throw new Error(
    'MomoClient: `baseUrl` is required when `environment` is not "sandbox". Provide a baseUrl explicitly.'
  );
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AccessToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface MomoRequestClient {
  request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T>;
}

export class MomoProductClient {
  readonly collections: CollectionsResource;
  readonly disbursements: DisbursementsResource;
  readonly common: CommonResource;

  private readonly apiUser: string;
  private readonly apiKey: string;
  private readonly subscriptionKey: string;
  private readonly baseUrl: string;
  private readonly targetEnvironment: string;
  private readonly fetchFn: typeof fetch;

  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(options: MomoClientOptions, product: MomoProduct = 'collections') {
    this.apiUser = options.apiUser;
    this.apiKey = options.apiKey;
    this.subscriptionKey = resolveMomoSubscriptionKey(options, product);
    this.baseUrl = resolveMomoBaseUrl(options, product).replace(/\/+$/, '');
    this.targetEnvironment = options.targetEnvironment ?? 'sandbox';
    this.fetchFn = options.fetchFn ?? fetch;

    this.collections = new CollectionsResource(this);
    this.disbursements = new DisbursementsResource(this);
    this.common = new CommonResource(this);
  }

  async createAccessToken(): Promise<AccessToken> {
    const credentials = btoa(`${this.apiUser}:${this.apiKey}`);
    const response = await this.fetchFn(`${this.baseUrl}/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      },
    });

    if (!response.ok) {
      throw await MomoError.fromResponse(response);
    }

    const body = (await response.json()) as AccessTokenResponse;
    this.accessToken = body.access_token;
    this.tokenExpiry = Date.now() + body.expires_in * 1000;

    return {
      accessToken: body.access_token,
      tokenType: body.token_type,
      expiresIn: body.expires_in,
    };
  }

  private async ensureAccessToken(): Promise<string> {
    const refreshBufferMs = 60_000;
    if (this.accessToken && Date.now() < this.tokenExpiry - refreshBufferMs) {
      return this.accessToken;
    }
    const token = await this.createAccessToken();
    return token.accessToken;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const token = await this.ensureAccessToken();
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchFn(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'X-Target-Environment': this.targetEnvironment,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw await MomoError.fromResponse(response);
    }

    if (response.status === 202 || response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export class MomoClient {
  readonly collections: CollectionsResource;
  readonly disbursements: DisbursementsResource;
  readonly collectionCommon: CommonResource;
  readonly disbursementCommon: CommonResource;
  /** Collection common resource retained for backwards compatibility. */
  readonly common: CommonResource;

  private readonly collectionsClient: MomoProductClient;
  private readonly disbursementsClient: MomoProductClient;

  constructor(options: MomoClientOptions) {
    this.collectionsClient = new MomoProductClient(options, 'collections');
    this.disbursementsClient = new MomoProductClient(options, 'disbursements');
    this.collections = this.collectionsClient.collections;
    this.disbursements = this.disbursementsClient.disbursements;
    this.collectionCommon = this.collectionsClient.common;
    this.disbursementCommon = this.disbursementsClient.common;
    this.common = this.collectionCommon;
  }

  createAccessToken(): Promise<AccessToken> {
    return this.collectionsClient.createAccessToken();
  }

  request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    return this.collectionsClient.request(method, path, body, extraHeaders);
  }
}

function resolveMomoSubscriptionKey(options: MomoClientOptions, product: MomoProduct): string {
  const productKey =
    product === 'disbursements'
      ? options.disbursementsSubscriptionKey
      : options.collectionsSubscriptionKey;
  const subscriptionKey = productKey ?? options.subscriptionKey;

  if (!subscriptionKey) {
    throw new Error(
      product === 'disbursements'
        ? 'MomoClient: `disbursementsSubscriptionKey` is required when `subscriptionKey` is not provided.'
        : 'MomoClient: `collectionsSubscriptionKey` is required when `subscriptionKey` is not provided.'
    );
  }

  return subscriptionKey;
}
