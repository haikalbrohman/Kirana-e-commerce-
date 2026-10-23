/**
 * Abstraksi penyedia AI agar model/penyedia bisa diganti tanpa mengubah fitur.
 * API key hanya dibaca di server.
 */
export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiRequest {
  system: string;
  messages: AiMessage[];
  maxTokens: number;
  effort?: 'low' | 'medium' | 'high';
  /** Jika diisi, keluaran dipaksa berupa JSON sesuai skema */
  jsonSchema?: Record<string, unknown>;
}

export interface AiResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface AiProvider {
  readonly name: string;
  generate(req: AiRequest): Promise<AiResponse>;
}

export class AiUnavailableError extends Error {}
