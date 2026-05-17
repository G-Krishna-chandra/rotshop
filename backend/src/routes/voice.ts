import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';

interface VoiceBody {
  // base64-encoded audio (webm/opus from browser MediaRecorder)
  audio: string;
  mimeType?: string;
}

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: VoiceBody }>('/api/voice', async (req, reply) => {
    const { audio, mimeType = 'audio/webm' } = req.body ?? {};

    if (!audio || typeof audio !== 'string') {
      return reply.status(400).send({ error: 'BadRequest', message: 'audio (base64) is required.' });
    }

    if (!config.groqApiKey) {
      return reply.status(503).send({
        error: 'NotConfigured',
        message: 'Voice transcription requires a GROQ_API_KEY in the backend .env.',
      });
    }

    // Decode base64 → Buffer → Blob for Groq's multipart endpoint
    const buffer = Buffer.from(audio, 'base64');
    const blob = new Blob([buffer], { type: mimeType });

    const form = new FormData();
    form.append('file', blob, 'recording.webm');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.groqApiKey}` },
      body: form,
    });

    if (!groqRes.ok) {
      const err = await groqRes.text().catch(() => 'unknown error');
      req.log.error({ status: groqRes.status, err }, 'Groq transcription failed');
      return reply.status(502).send({ error: 'TranscriptionFailed', message: err.slice(0, 200) });
    }

    const data = (await groqRes.json()) as { text: string };
    return { text: data.text?.trim() ?? '' };
  });
};
