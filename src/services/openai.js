/**
 * OpenAI integration for refining user input (e.g. natural-language request) using gpt-4o-mini.
 * Set OPENAI_API_KEY in .env to enable.
 * Uses Node built-in https so it works on Node 16+.
 */

import https from 'https';

const OPENAI_HOST = 'api.openai.com';
const MODEL = 'gpt-4o-mini';

const REFINE_SYSTEM_PROMPT = `You are a helpful assistant for a local services marketplace (e.g. barber, beauty, handyman, cleaning, repair).
The user will send a short, casual message describing what they need (e.g. "I need a haircut at 4 PM near the station").
Refine it into a clear, structured sentence suitable for a service request. Keep the same meaning and tone. Do not add extra advice or options.
Reply with only the refined text, no quotes or labels.`;

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Refine user input using GPT-4o-mini.
 * @param {string} input - Raw user message to refine
 * @param {string} apiKey - OpenAI API key (from process.env.OPENAI_API_KEY)
 * @returns {Promise<{ refined: string }>} Refined text
 * @throws {Error} If API key is missing or OpenAI request fails
 */
export async function refineInput(input, apiKey = process.env.OPENAI_API_KEY) {
  const key = (apiKey || '').trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  if (!input || typeof input !== 'string') {
    throw new Error('input must be a non-empty string');
  }

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ],
    max_tokens: 256,
    temperature: 0.3,
  });

  const { statusCode, data } = await httpsRequest(
    {
      hostname: OPENAI_HOST,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        Authorization: `Bearer ${key}`,
      },
    },
    body
  );

  if (statusCode !== 200) {
    let message = `OpenAI API error: ${statusCode}`;
    try {
      const parsed = JSON.parse(data);
      if (parsed.error?.message) message = parsed.error.message;
    } catch (_) {
      if (data) message += ` ${data.slice(0, 200)}`;
    }
    throw new Error(message);
  }

  const parsed = JSON.parse(data);
  const content = parsed.choices?.[0]?.message?.content?.trim();
  if (content == null) {
    throw new Error('Invalid response from OpenAI');
  }
  return { refined: content };
}
