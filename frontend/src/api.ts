import type {
  Module,
  ModuleMatch,
  SubmitRequest, SubmitResponse,
  SubmitEditRequest, SubmitEditResponse,
  DiscoverRequest, DiscoverResponse,
  ModuleDetailResponse,
  DashboardResponse,
} from '@rotshop/shared';

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  submit: (data: SubmitRequest) =>
    request<SubmitResponse>('/api/submit', { method: 'POST', body: JSON.stringify(data) }),

  editSubmission: (id: string, data: SubmitEditRequest) =>
    request<SubmitEditResponse>(`/api/submit/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  discover: (data: DiscoverRequest) =>
    request<DiscoverResponse>('/api/discover', { method: 'POST', body: JSON.stringify(data) }),

  getModule: (slug: string) =>
    request<ModuleDetailResponse>(`/api/modules/${slug}`),

  getModules: () =>
    request<{ modules: Module[] }>('/api/modules'),

  getDashboard: () =>
    request<DashboardResponse>('/api/dashboard'),
};

// ─── Adapter: backend Module → legacy mock shape the UI was built against ───
//
// The mock modules in src/data/modules.jsx use a slightly different shape
// (pricing object, stack, integrations count, snippet/fit inline). Rather
// than refactor every consumer, we adapt API responses into that shape.

export interface UiModule {
  id: string;
  slug?: string;
  name: string;
  tagline: string;
  category: string;
  stack: string[];
  hackathon: string;
  pricing: { model: 'buy' | 'royalty'; amount: number };
  rating: number;
  integrations: number;
  complexity: string;
  keywords: string[];
  inputs: string;
  outputs: string;
  snippet: string;
  fit: (proj?: string, hits?: string[]) => string;
}

export function adaptModule(m: Module, apiSnippet = '', fitLine = ''): UiModule {
  // Backend stores price in cents (whole-dollar amount for buy, monthly for royalty).
  const dollars = Math.round((m.price ?? 0) / 100);
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    tagline: m.description || '',
    category: m.category,
    stack: m.techStack || [],
    hackathon: 'Verified by Rotshop',
    pricing: { model: m.pricingModel, amount: dollars },
    rating: m.rating ?? 4.5,
    integrations: m.integrationCount ?? 0,
    complexity: m.complexity || 'Medium',
    keywords: [],
    inputs: m.inputContract || '',
    outputs: m.outputContract || '',
    snippet: apiSnippet,
    fit: () => fitLine || `Strong match for your project.`,
  };
}

// Convert API ModuleMatch[] into the result-row shape the Discovery UI uses.
export function adaptMatches(matches: ModuleMatch[]) {
  return matches.map((match) => ({
    m: adaptModule(match.module, '', match.fitLine),
    score: match.matchScore,
    hits: match.matchedKeywords || [],
    fit: match.fitLine,
    fallback: false,
  }));
}
