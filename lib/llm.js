export async function runTextModel(env, messages) {
  if (!env?.AI) return null;
  const currentModel = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const model = !env.MODEL_NAME || env.MODEL_NAME === '@cf/meta/llama-3.1-8b-instruct-fast'
    ? currentModel : env.MODEL_NAME;
  try {
    const result = await env.AI.run(model, { messages, max_tokens: 220, temperature: 0.4 });
    if (typeof result === 'string') return result.trim();
    if (typeof result?.response === 'string') return result.response.trim();
    if (Array.isArray(result?.choices) && result.choices[0]?.message?.content) {
      return String(result.choices[0].message.content).trim();
    }
    return null;
  } catch {
    return null;
  }
}
