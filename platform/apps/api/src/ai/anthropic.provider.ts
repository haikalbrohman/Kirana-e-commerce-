import Anthropic from '@anthropic-ai/sdk';
import { AiUnavailableError, type AiProvider, type AiRequest, type AiResponse } from './ai.provider.js';

/** Claude melalui Anthropic SDK resmi. */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(private readonly model: string) {
    // Membaca ANTHROPIC_API_KEY dari environment; timeout pendek agar UI tetap responsif
    this.client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  }

  async generate(req: AiRequest): Promise<AiResponse> {
    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
      output_config: {
        effort: req.effort ?? 'low',
        ...(req.jsonSchema ? { format: { type: 'json_schema' as const, schema: req.jsonSchema } } : {}),
      },
      // Jika ditolak filter keamanan, coba otomatis dengan model cadangan
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (response.stop_reason === 'refusal') throw new AiUnavailableError('Permintaan ditolak oleh model');
    if (response.stop_reason === 'max_tokens') throw new AiUnavailableError('Jawaban terpotong');
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!text) throw new AiUnavailableError('Jawaban kosong');
    return { text, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, model: response.model };
  }
}
