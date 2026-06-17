export interface CashlessErrorJson {
  type: string;
  code: string;
  message: string;
  requestId?: string;
}

export class CashlessError extends Error {
  readonly type: string;
  readonly code: string;
  readonly requestId?: string;

  constructor(type: string, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'CashlessError';
    this.type = type;
    this.code = code;
    this.requestId = requestId;
  }

  static async fromResponse(response: Response): Promise<CashlessError> {
    let body: CashlessErrorJson | undefined;
    try {
      body = (await response.json()) as CashlessErrorJson;
    } catch {
      // ignore invalid JSON bodies
    }

    return new CashlessError(
      body?.type ?? 'api_error',
      body?.code ?? `http_${response.status}`,
      body?.message ?? response.statusText,
      body?.requestId
    );
  }
}
