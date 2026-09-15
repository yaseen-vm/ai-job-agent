import { AwsClient } from 'aws4fetch';

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ConverseContentBlock =
  | { text: string }
  | { document: { format: string; name: string; source: { bytes: string } } }
  | { image: { format: string; source: { bytes: string } } };

export function createBedrockClient(accessKeyId: string, secretAccessKey: string, region: string) {
  const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: 'bedrock' });

  return {
    // Invoke via the Converse API — supports both regular models and cross-region inference profiles.
    async invoke(modelId: string, systemPrompt: string, messages: BedrockMessage[], maxTokens = 4096): Promise<string> {
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;
      const body = JSON.stringify({
        system: [{ text: systemPrompt }],
        messages: messages.map(m => ({ role: m.role, content: [{ text: m.content }] })),
        inferenceConfig: { maxTokens },
      });
      const res = await aws.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`Bedrock error ${res.status}: ${await res.text()}`);
      const data = await res.json<{ output: { message: { content: Array<{ text?: string }> } } }>();
      const text = data.output.message.content.find(b => b.text !== undefined)?.text;
      if (!text) throw new Error('No text block in Bedrock response');
      return text;
    },

    // Converse API — supports document/image blocks, works with Nova and other models
    async converse(
      modelId: string,
      systemPrompt: string,
      content: ConverseContentBlock[],
      maxTokens = 1024,
    ): Promise<string> {
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;
      const body = JSON.stringify({
        system: [{ text: systemPrompt }],
        messages: [{ role: 'user', content }],
        inferenceConfig: { maxTokens },
      });
      const res = await aws.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`Bedrock error ${res.status}: ${await res.text()}`);
      const data = await res.json<{ output: { message: { content: Array<{ text?: string }> } } }>();
      return data.output.message.content.find(b => b.text !== undefined)?.text ?? '';
    },
  };
}
