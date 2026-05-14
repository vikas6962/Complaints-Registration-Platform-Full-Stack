import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

export async function generateAiQuestion(complaintText) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `You are a helpful assistant. Generate exactly one short follow-up question to clarify this complaint: ${complaintText}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: prompt,
      max_output_tokens: 100,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Gemini request failed: ${payload}`);
  }

  const payload = await response.json();
  const answer = payload?.output?.[0]?.content?.[0]?.text || payload?.output_text || '';
  if (!answer) {
    throw new Error('Unable to get a follow-up question from Gemini');
  }

  return answer.trim();
}
