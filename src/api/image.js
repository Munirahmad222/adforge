import { json } from '../utils.js';
import { TOOLS } from '../tools.js';

export async function handleImage(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid request body' }, 400);
  }

  const rawPrompt = (body && body.prompt) ? String(body.prompt).trim() : '';
  const tool = (body && body.tool) || 'banner';
  if (!rawPrompt) return json({ error: 'prompt is required' }, 400);

  const def = TOOLS[tool];
  const prefix = (def && def.imagePrefix) || 'A professional advertising image, no text overlay, of: ';
  const prompt = prefix + rawPrompt;

  try {
    const result = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 6 });
    const b64 = result && (result.image || result.images?.[0]);
    if (!b64) throw new Error('empty response from model');
    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}
