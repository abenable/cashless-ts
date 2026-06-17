import { MomoError } from './errors.js';
import { CollectionsResource } from './resources/collections.js';
import { CommonResource } from './resources/common.js';
import { DisbursementsResource } from './resources/disbursements.js';

export type MomoEnvironment = 'sandbox' | 'production';

export const MOMO_SANDBOX_BASE_URL = 'https://sandbox.momodeveloper.mtn.com';

export interface MomoClientOptions {
  apiUser: string;
  apiKey: string;
  subscriptionKey: string;
  /** If omitted, `environment` must be `'sandbox'`. */
  baseUrl?: string;
  /** Determines the default MTN MoMo base URL. */
  environment?: MomoEnvironment;
  targetEnvironment?: string;
  fetchFn?: typeof fetch;
}

function resolveMomoBaseUrl(options: Pick<MomoClientOptions, 'baseUrl' | 'environment'>): string {
  if (options.baseUrl) {
    return options.baseUrl;
  }
  if (options.environment === 'sandbox') {
    return MOMO_SANDBOX_BASE_URL;
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

export class MomoClient {
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

  constructor(options: MomoClientOptions) {
    this.apiUser = options.apiUser;
    this.apiKey = options.apiKey;
    this.subscriptionKey = options.subscriptionKey;
    this.baseUrl = resolveMomoBaseUrl(options).replace(/\/+$/, '');
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
