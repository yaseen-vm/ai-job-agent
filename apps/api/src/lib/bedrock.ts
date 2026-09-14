import { AwsClient } from 'aws4fetch';

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function createBedrockClient(accessKeyId: string, secretAccessKey: string, region: string) {
  const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: 'bedrock' });

  return {
    async invoke(modelId: string, systemPrompt: string, messages: BedrockMessage[], maxTokens = 4096): Promise<string> {
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`;
      const body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });
      const res = await aws.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`Bedrock error ${res.status}: ${await res.text()}`);
      const data = await res.json<{ content: Array<{ type: string; text: string }> }>();
      const block = data.content.find(b => b.type === 'text');
      if (!block) throw new Error('No text block in Bedrock response');
      return block.text;
    },
  };
}
