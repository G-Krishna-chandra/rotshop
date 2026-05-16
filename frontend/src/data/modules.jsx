// Mock data, keyword map, project-descriptor extraction, fit lines.
// Ported verbatim from the v5 design prototype.

export const CATEGORIES = [
  { id: 'Auth', label: 'Auth' },
  { id: 'Payments', label: 'Payments' },
  { id: 'Notifications', label: 'Notifications' },
  { id: 'Analytics', label: 'Analytics' },
  { id: 'AI/ML', label: 'AI/ML' },
  { id: 'DevOps', label: 'DevOps' },
  { id: 'UI Components', label: 'UI Components' },
  { id: 'Data Pipelines', label: 'Data Pipelines' },
];

// Keywords mapped to category. Longer phrases first within each category for greedy matching.
export const KEYWORD_CATEGORY = [
  // Auth
  ['magic link', 'Auth'], ['sign in', 'Auth'], ['sign up', 'Auth'], ['access control', 'Auth'],
  ['oauth', 'Auth'], ['session', 'Auth'], ['login', 'Auth'], ['signup', 'Auth'], ['signin', 'Auth'],
  ['password', 'Auth'], ['sso', 'Auth'], ['identity', 'Auth'], ['jwt', 'Auth'], ['auth', 'Auth'],

  // Payments
  ['subscription billing', 'Payments'], ['usage metering', 'Payments'], ['pricing tier', 'Payments'],
  ['payments', 'Payments'], ['payment', 'Payments'], ['billing', 'Payments'], ['stripe', 'Payments'],
  ['subscription', 'Payments'], ['invoice', 'Payments'], ['checkout', 'Payments'], ['pricing', 'Payments'],
  ['charge', 'Payments'], ['monetize', 'Payments'], ['revenue', 'Payments'],

  // Notifications
  ['email alerts', 'Notifications'], ['email alert', 'Notifications'], ['push notification', 'Notifications'],
  ['in-app', 'Notifications'], ['notifications', 'Notifications'], ['notification', 'Notifications'],
  ['alerts', 'Notifications'], ['alert', 'Notifications'], ['notify', 'Notifications'],
  ['sms', 'Notifications'], ['push', 'Notifications'],

  // UI Components
  ['form builder', 'UI Components'], ['custom forms', 'UI Components'], ['custom fields', 'UI Components'],
  ['product tour', 'UI Components'], ['onboarding flow', 'UI Components'], ['onboarding', 'UI Components'],
  ['walkthrough', 'UI Components'], ['stepper', 'UI Components'], ['wizard', 'UI Components'],
  ['form', 'UI Components'], ['tooltip', 'UI Components'],

  // Data Pipelines
  ['data pipeline', 'Data Pipelines'], ['csv ingestion', 'Data Pipelines'], ['schema validation', 'Data Pipelines'],
  ['ingest csvs', 'Data Pipelines'], ['ingest csv', 'Data Pipelines'], ['etl', 'Data Pipelines'],
  ['ingestion', 'Data Pipelines'], ['ingest', 'Data Pipelines'], ['csv', 'Data Pipelines'],
  ['data clean', 'Data Pipelines'], ['schema', 'Data Pipelines'],

  // AI/ML
  ['similarity search', 'AI/ML'], ['vector search', 'AI/ML'], ['semantic search', 'AI/ML'],
  ['embeddings', 'AI/ML'], ['embedding', 'AI/ML'], ['vectors', 'AI/ML'], ['vector', 'AI/ML'],
  ['rag', 'AI/ML'], ['llm', 'AI/ML'], ['ai', 'AI/ML'], ['ml', 'AI/ML'],

  // DevOps
  ['error tracking', 'DevOps'], ['stack trace', 'DevOps'], ['scheduled reminders', 'DevOps'],
  ['scheduled reminder', 'DevOps'], ['scheduled job', 'DevOps'], ['background job', 'DevOps'],
  ['cron', 'DevOps'], ['scheduler', 'DevOps'], ['schedule', 'DevOps'], ['monitoring', 'DevOps'],
  ['logging', 'DevOps'], ['error', 'DevOps'], ['errors', 'DevOps'], ['crash', 'DevOps'],
  ['reminders', 'DevOps'], ['reminder', 'DevOps'],

  // Analytics
  ['analytics dashboard', 'Analytics'], ['user analytics', 'Analytics'], ['analytics', 'Analytics'],
  ['metrics', 'Analytics'],
];

export const MODULES = [
  {
    id: 'authforge',
    name: 'AuthForge',
    tagline: 'Drop-in OAuth2 + magic link authentication with session management.',
    category: 'Auth',
    stack: ['Python', 'FastAPI'],
    hackathon: 'HackMIT 2025',
    pricing: { model: 'buy', amount: 1200 },
    rating: 4.8, integrations: 67, complexity: 'Easy',
    keywords: ['auth', 'login', 'sign in', 'signup', 'oauth', 'session', 'password', 'sso', 'identity', 'user', 'magic link', 'jwt', 'token', 'access control'],
    inputs: 'User credentials (email/password or OAuth token), redirect URI, requested scopes.',
    outputs: 'JWT session token, user profile object, refresh token.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/authforge/login \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "ada@example.com",
    "method": "magic_link",
    "redirect": "https://yourapp.com/callback"
  }'`,
    fit: (proj) => `Handles user authentication and session management for ${proj}.`,
  },
  {
    id: 'paypipe',
    name: 'PayPipe',
    tagline: 'Stripe subscription billing wrapper with usage metering.',
    category: 'Payments',
    stack: ['Node.js', 'Express'],
    hackathon: 'TreeHacks 2025',
    pricing: { model: 'royalty', amount: 45 },
    rating: 4.6, integrations: 43, complexity: 'Medium',
    keywords: ['payment', 'billing', 'stripe', 'subscription', 'invoice', 'checkout', 'pricing', 'charge', 'revenue', 'monetize', 'plan', 'tier', 'usage'],
    inputs: 'Customer ID, plan selection, usage events.',
    outputs: 'Subscription object, invoice URL, payment webhooks.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/paypipe/subscribe \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "cus_8a2f",
    "plan": "pro_monthly",
    "metered": true
  }'`,
    fit: (proj) => `Manages subscription billing and usage metering for ${proj}.`,
  },
  {
    id: 'notifystack',
    name: 'NotifyStack',
    tagline: 'Multi-channel notifications across email, SMS, push, and in-app.',
    category: 'Notifications',
    stack: ['TypeScript', 'Bun'],
    hackathon: 'CalHacks 2025',
    pricing: { model: 'buy', amount: 800 },
    rating: 4.7, integrations: 89, complexity: 'Easy',
    keywords: ['notification', 'email', 'sms', 'push', 'alert', 'message', 'notify', 'template', 'mail', 'send'],
    inputs: 'Recipient ID, channel preference, template name, variables.',
    outputs: 'Delivery status per channel, message ID, read receipts.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/notifystack/send \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient_id": "u_42",
    "channels": ["email", "push"],
    "template": "alert_triggered",
    "vars": { "metric": "p95_latency" }
  }'`,
    fit: (proj, hits) => {
      const what = hits.includes('email alerts') || hits.includes('alerts') ? 'email alerts' : 'multi-channel notifications';
      return `Delivers ${what} across email, SMS, and push for ${proj}.`;
    },
  },
  {
    id: 'onboardkit',
    name: 'OnboardKit',
    tagline: 'Product tour and onboarding flow builder.',
    category: 'UI Components',
    stack: ['React', 'TypeScript'],
    hackathon: 'HackSC 2025',
    pricing: { model: 'royalty', amount: 30 },
    rating: 4.5, integrations: 34, complexity: 'Easy',
    keywords: ['onboard', 'tour', 'ui', 'component', 'widget', 'walkthrough', 'guide', 'tooltip', 'wizard', 'stepper', 'welcome'],
    inputs: 'Step definitions, target elements, user segment rules.',
    outputs: 'Completion events, drop-off analytics, engagement metrics.',
    snippet: `fetch('https://api.rotshop.dev/v1/onboardkit/track', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + ROTSHOP_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_id: 'u_42',
    flow: 'first_run',
    event: 'step_completed',
  }),
});`,
    fit: (proj) => `Adds a guided product tour and onboarding flow to ${proj}.`,
  },
  {
    id: 'datapour',
    name: 'DataPour',
    tagline: 'CSV / JSON / API data ingestion with schema validation.',
    category: 'Data Pipelines',
    stack: ['Python', 'Pandas'],
    hackathon: 'Hack the North 2025',
    pricing: { model: 'buy', amount: 650 },
    rating: 4.3, integrations: 21, complexity: 'Medium',
    keywords: ['data', 'ingest', 'etl', 'csv', 'json', 'import', 'transform', 'pipeline', 'schema', 'validation', 'clean'],
    inputs: 'Data source (file or API endpoint), target schema.',
    outputs: 'Cleaned dataset, validation report, rejected rows.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/datapour/ingest \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -F "file=@orders.csv" \\
  -F 'schema={
    "order_id": "string",
    "amount":   "number",
    "created":  "iso_datetime"
  }'`,
    fit: (proj, hits) => {
      const has = (k) => hits.some((h) => h.includes(k));
      if (has('csv')) return `Handles your CSV ingestion and schema validation for ${proj}.`;
      return `Powers the data ingestion and validation layer of ${proj}.`;
    },
  },
  {
    id: 'sentinellog',
    name: 'SentinelLog',
    tagline: 'Error tracking and alerting with stack-trace deduplication.',
    category: 'DevOps',
    stack: ['Go', 'Redis'],
    hackathon: 'HackMIT 2025',
    pricing: { model: 'royalty', amount: 55 },
    rating: 4.9, integrations: 52, complexity: 'Advanced',
    keywords: ['error', 'tracking', 'alert', 'monitor', 'log', 'crash', 'bug', 'stack trace', 'incident', 'sentry'],
    inputs: 'Error events (message, stack trace, severity).',
    outputs: 'Grouped reports, alert notifications, trend data.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/sentinellog/capture \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "TypeError: cannot read x of undefined",
    "stack":   "[…]",
    "severity": "error",
    "context": { "release": "v1.4.2" }
  }'`,
    fit: (proj) => `Catches and groups errors in ${proj}, with alerting on regressions.`,
  },
  {
    id: 'formcraft',
    name: 'FormCraft',
    tagline: 'Dynamic form builder with conditional logic and validation.',
    category: 'UI Components',
    stack: ['React', 'Zod'],
    hackathon: 'TreeHacks 2025',
    pricing: { model: 'buy', amount: 400 },
    rating: 4.4, integrations: 38, complexity: 'Easy',
    keywords: ['form', 'builder', 'input', 'field', 'validation', 'conditional', 'survey', 'dynamic', 'custom'],
    inputs: 'Form schema (fields, rules, conditions).',
    outputs: 'Validated data object, submission events.',
    snippet: `fetch('https://api.rotshop.dev/v1/formcraft/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + ROTSHOP_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    form_id: 'contact_v2',
    values:  { name: 'Ada', email: 'ada@x.com' },
  }),
});`,
    fit: (proj, hits) => {
      if (hits.includes('custom fields') || hits.includes('form builder')) {
        return `Builds the custom form fields and validation for ${proj}.`;
      }
      return `Generates dynamic, validated forms inside ${proj}.`;
    },
  },
  {
    id: 'vectorvault',
    name: 'VectorVault',
    tagline: 'Embeddings storage and similarity search.',
    category: 'AI/ML',
    stack: ['Python', 'FAISS'],
    hackathon: 'CalHacks 2025',
    pricing: { model: 'buy', amount: 1800 },
    rating: 4.7, integrations: 15, complexity: 'Advanced',
    keywords: ['ai', 'ml', 'embedding', 'vector', 'search', 'similarity', 'nlp', 'rag', 'semantic', 'llm'],
    inputs: 'Text or vectors, collection name, query with top-k.',
    outputs: 'Ranked results with similarity scores.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/vectorvault/search \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection": "docs",
    "query":      "how do refunds work",
    "top_k":      10
  }'`,
    fit: (proj) => `Stores embeddings and powers similarity search in ${proj}.`,
  },
  {
    id: 'cronpilot',
    name: 'CronPilot',
    tagline: 'Scheduled job runner with retry logic.',
    category: 'DevOps',
    stack: ['Node.js', 'Redis'],
    hackathon: 'HackSC 2025',
    pricing: { model: 'royalty', amount: 25 },
    rating: 4.2, integrations: 29, complexity: 'Medium',
    keywords: ['cron', 'schedule', 'job', 'timer', 'recurring', 'retry', 'queue', 'worker', 'task', 'background', 'reminder'],
    inputs: 'Cron expression, handler URL, retry policy.',
    outputs: 'Execution logs, success/failure webhooks.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/cronpilot/schedule \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name":     "daily-rollup",
    "schedule": "0 3 * * *",
    "handler":  "https://api.yours.com/rollup",
    "retries":  3
  }'`,
    fit: (proj, hits) => {
      if (hits.includes('scheduled reminders') || hits.includes('reminders')) {
        return `Runs the scheduled reminders for ${proj}, with retries baked in.`;
      }
      return `Runs recurring background jobs for ${proj}.`;
    },
  },
  {
    id: 'mailmerge',
    name: 'MailMerge',
    tagline: 'Transactional email templating and delivery.',
    category: 'Notifications',
    stack: ['Python', 'Jinja2'],
    hackathon: 'Hack the North 2025',
    pricing: { model: 'buy', amount: 350 },
    rating: 4.6, integrations: 71, complexity: 'Easy',
    keywords: ['email', 'transactional', 'template', 'mail', 'delivery', 'smtp', 'newsletter', 'drip', 'campaign'],
    inputs: 'Template name, recipient, variables, attachments.',
    outputs: 'Send confirmation, delivery status, open/click tracking.',
    snippet: `curl -X POST https://api.rotshop.dev/v1/mailmerge/send \\
  -H "Authorization: Bearer $ROTSHOP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template":  "order_receipt",
    "to":        "customer@example.com",
    "vars":      { "total": "$24.00" }
  }'`,
    fit: (proj) => `Sends transactional emails (receipts, alerts, drip) for ${proj}.`,
  },
];

export const PARTNERS = ['HackMIT', 'TreeHacks', 'CalHacks', 'HackSC', 'Hack the North'];

export const DASHBOARD_MODULES = [
  { name: 'AuthForge', status: 'Live', earnings: 1200, integrations: 67 },
  { name: 'NotifyStack', status: 'Live', earnings: 800, integrations: 89 },
  { name: 'DataPour', status: 'Live', earnings: 340, integrations: 21 },
  { name: 'CacheLayer', status: 'Manual Review', earnings: 0, integrations: 0 },
];

export const EARNINGS = [
  { month: 'Nov', value: 180 },
  { month: 'Dec', value: 260 },
  { month: 'Jan', value: 340 },
  { month: 'Feb', value: 410 },
  { month: 'Mar', value: 520 },
  { month: 'Apr', value: 630 },
];

// Greedy longest-match tokenizer. Returns text/tag segments preserving original casing.
export function tokenize(text) {
  if (!text) return [];
  const sorted = [...KEYWORD_CATEGORY].sort((a, b) => b[0].length - a[0].length);
  const segs = [];
  let i = 0;
  const lower = text.toLowerCase();
  const isWordChar = (c) => /[a-z0-9]/i.test(c);

  while (i < text.length) {
    let matched = null;
    for (const [kw, cat] of sorted) {
      if (lower.startsWith(kw, i)) {
        const before = i === 0 ? ' ' : text[i - 1];
        const after = text[i + kw.length] || ' ';
        if (!isWordChar(before) && !isWordChar(after)) {
          matched = [kw, cat];
          break;
        }
      }
    }
    if (matched) {
      const [kw, cat] = matched;
      segs.push({ type: 'tag', value: text.slice(i, i + kw.length), cat });
      i += kw.length;
    } else {
      let j = i + 1;
      while (j < text.length) {
        let hit = false;
        for (const [kw] of sorted) {
          if (lower.startsWith(kw, j)) {
            const before = j === 0 ? ' ' : text[j - 1];
            const after = text[j + kw.length] || ' ';
            if (!isWordChar(before) && !isWordChar(after)) { hit = true; break; }
          }
        }
        if (hit) break;
        j++;
      }
      segs.push({ type: 'text', value: text.slice(i, j) });
      i = j;
    }
  }
  const out = [];
  for (const s of segs) {
    if (s.type === 'text' && out.length && out[out.length - 1].type === 'text') {
      out[out.length - 1].value += s.value;
    } else {
      out.push(s);
    }
  }
  return out;
}

export function segmentsToText(segs) {
  return segs.map((s) => s.value).join('');
}

export function matchModules(segments) {
  const flatText = segmentsToText(segments).toLowerCase();
  if (!flatText.trim()) return [];
  const tagCats = new Set(segments.filter((s) => s.type === 'tag').map((s) => s.cat));
  const tagValues = segments.filter((s) => s.type === 'tag').map((s) => s.value.toLowerCase());

  const scored = MODULES.map((m) => {
    let score = 0;
    const hits = [];
    if (tagCats.has(m.category)) score += 4;
    for (const kw of m.keywords) {
      if (flatText.includes(kw)) { score += kw.split(' ').length; hits.push(kw); }
    }
    for (const tv of tagValues) {
      if (m.keywords.includes(tv)) score += 1;
    }
    return { m, score, hits };
  }).filter((x) => x.score > 0)
    .sort((a, b) => (b.score - a.score) || (b.m.integrations - a.m.integrations));

  if (scored.length === 0) {
    return [...MODULES]
      .sort((a, b) => b.integrations - a.integrations)
      .slice(0, 3)
      .map((m) => ({ m, score: 0, hits: [], fallback: true }));
  }
  return scored.slice(0, 6);
}

export function projectDescriptor(text) {
  if (!text) return 'your project';
  const t = text.toLowerCase().trim();
  const tryPatterns = [
    /\bbuilding\s+(?:an?\s+)?([a-z][a-z\s\-/]{2,40}?)(?=\s+(?:with|that|to|for|and|using)\b|[.,]|$)/,
    /\b(?:i\s+have|i'm\s+making)\s+(?:an?\s+)?([a-z][a-z\s\-/]{2,40}?)(?=\s+(?:with|that|to|for|and|using)\b|[.,]|$)/,
    /\bfor\s+(?:my|a|an)\s+([a-z][a-z\s\-/]{2,40}?)(?=\s+(?:with|that|to|for|and|using)\b|[.,]|$)/,
  ];
  for (const p of tryPatterns) {
    const m = t.match(p);
    if (m && m[1]) {
      const phrase = m[1].replace(/\s+(with|for|that|to|and|the|a|an)$/, '').trim();
      if (phrase.length > 2 && phrase.length < 60) return 'your ' + phrase;
    }
  }
  if (t.includes('saas')) return 'your SaaS';
  if (t.includes('analytics dashboard')) return 'your analytics dashboard';
  if (t.includes('dashboard')) return 'your dashboard';
  if (t.includes('task manager') || t.includes('task management')) return 'your task manager';
  if (t.includes('pipeline')) return 'your pipeline';
  if (t.includes('app')) return 'your app';
  if (t.includes('platform')) return 'your platform';
  if (t.includes('tool')) return 'your tool';
  return 'your project';
}

export function formatPrice(p) {
  return p.model === 'buy' ? '$' + p.amount.toLocaleString() : '$' + p.amount + '/mo';
}

export function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const chars = [];
  for (let i = 0; i < 5; i++) chars.push(i < full ? '★' : (i === full && half ? '★' : '☆'));
  return <span className="stars">{chars.join('')}</span>;
}
