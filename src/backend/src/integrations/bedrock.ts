import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config.js';

export interface ConverseResult { content: string; tokenUsage: { inputTokens: number | null; outputTokens: number | null } }
export interface ModelInfo { modelId: string; modelName: string; provider: string }
const timer = (ms: number) => { const controller = new AbortController(); const handle = setTimeout(() => controller.abort(), ms); return { signal: controller.signal, clear: () => clearTimeout(handle) }; };

export class BedrockService {
  private runtime = new BedrockRuntimeClient({ region: config.AWS_REGION });
  private catalog = new BedrockClient({ region: config.AWS_REGION });

  async listTextModels(): Promise<ModelInfo[]> {
    const timeout = timer(10_000);
    try {
      const result = await this.catalog.send(new ListFoundationModelsCommand({}), { abortSignal: timeout.signal });
      return (result.modelSummaries ?? []).filter((model) => model.outputModalities?.includes('TEXT')).map((model) => ({ modelId: model.modelId ?? '', modelName: model.modelName ?? '', provider: model.providerName ?? '' }));
    } finally { timeout.clear(); }
  }

  async converse(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<ConverseResult> {
    return config.BEDROCK_AUTH_MODE === 'api_key' ? this.withApiKey(messages) : this.withSdk(messages);
  }

  private async withSdk(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<ConverseResult> {
    const timeout = timer(Math.min(config.BEDROCK_BUSINESS_TIMEOUT_MS, 60_000));
    try {
      const result = await this.runtime.send(new ConverseCommand({ modelId: config.BEDROCK_MODEL_ID, messages: messages.map((message) => ({ role: message.role, content: [{ text: message.content }] })) }), { abortSignal: timeout.signal });
      return { content: result.output?.message?.content?.[0]?.text ?? '', tokenUsage: { inputTokens: result.usage?.inputTokens ?? null, outputTokens: result.usage?.outputTokens ?? null } };
    } finally { timeout.clear(); }
  }

  private async withApiKey(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<ConverseResult> {
    if (!config.BEDROCK_API_KEY) throw new Error('BEDROCK_API_KEY is not configured');
    const timeout = timer(Math.min(config.BEDROCK_BUSINESS_TIMEOUT_MS, 60_000));
    try {
      const response = await fetch(`https://bedrock-runtime.${config.AWS_REGION}.amazonaws.com/model/${encodeURIComponent(config.BEDROCK_MODEL_ID)}/converse`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.BEDROCK_API_KEY}` },
        body: JSON.stringify({ messages: messages.map((message) => ({ role: message.role, content: [{ text: message.content }] })) }), signal: timeout.signal
      });
      const body = await response.json() as { output?: { message?: { content?: Array<{ text?: string }> } }; usage?: { inputTokens?: number; outputTokens?: number }; message?: string };
      if (!response.ok) throw new Error(`Bedrock API ${response.status}: ${body.message ?? 'request failed'}`);
      return { content: body.output?.message?.content?.[0]?.text ?? '', tokenUsage: { inputTokens: body.usage?.inputTokens ?? null, outputTokens: body.usage?.outputTokens ?? null } };
    } finally { timeout.clear(); }
  }
}
