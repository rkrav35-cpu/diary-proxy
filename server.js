import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPTS = {
  polish_diary: `Ты — опытный психиатр. Перепиши дневник клиническим языком: убери тавтологии и повторы, разверни сухие формулировки. Сохрани все факты, порядок и пол пациента. Пиши сплошным текстом, без скобок и подзаголовков. Верни только готовый текст.`,
  formulate_complaint: `Ты — опытный психиатр. Даны черновая жалоба и черновое описание проявления. Сформулируй их грамотно, учитывая пол пациента. Ответ строго в формате:
жалоба: <текст>
проявление: <текст>`
};

app.post('/api/ai', async (req, res) => {
  try {
    const { action, payload } = req.body;
    if (!SYSTEM_PROMPTS[action]) return res.status(400).json({ error: 'Unknown action' });
    if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'No key' });

    let user = '';
    if (action === 'polish_diary') user = `Пол: ${payload.gender}\n\n${payload.text}`;
    if (action === 'formulate_complaint') user = `Пол: ${payload.gender}\nЖалоба: ${payload.complaint || '(пусто)'}\nПроявление: ${payload.manifestation || '(пусто)'}`;

    const r = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_KEY },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[action] },
          { role: 'user', content: user }
        ],
        temperature: 0.3
      })
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    const data = await r.json();
    res.json({ result: data.choices[0].message.content.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('OK'));
