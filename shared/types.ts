// shared/types.ts — THE CONTRACT. Both frontend and backend import from here.

// ─── Constants ───

export const CATEGORIES = [
  'Auth',
  'Payments',
  'Notifications',
  'Analytics',
  'AI/ML',
  'DevOps',
  'UI Components',
  'Data Pipelines',
] as const;

export type Category = typeof CATEGORIES[number];

export const MODULE_STATUSES = [
  'pending_sandbox_test',
  'sandbox_running',
  'sandbox_passed',
  'sandbox_failed',
  'pending_review',
  'approved',
  'rejected',
  'live',
] as const;

export type ModuleStatus = typeof MODULE_STATUSES[number];

export const PRICING_MODELS = ['buy', 'royalty'] as const;
export type PricingModel = typeof PRICING_MODELS[number];

export const COMPLEXITY_LEVELS = ['Easy', 'Medium', 'Advanced'] as const;
export type Complexity = typeof COMPLEXITY_LEVELS[number];


// ─── Core Entities ───

export interface Module {
  id: string;
  githubUrl: string;
  submitterEmail: string;
  name: string;
  slug: string;
  description: string;
  category: Category;
  techStack: string[];
  inputContract: string;
  outputContract: string;
  pricingModel: PricingModel;
  price: number;               // cents for buy, cents/month for royalty
  status: ModuleStatus;
  complexity: Complexity;
  rating: number | null;
  integrationCount: number;
  createdAt: string;           // ISO 8601
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;           // first 8 chars, for display
  customerEmail: string;
  isActive: boolean;
  rateLimitPerHour: number;
  createdAt: string;
}

export interface UsageLog {
  id: string;
  apiKeyId: string;
  moduleId: string;
  action: string;
  statusCode: number;
  responseTimeMs: number;
  createdAt: string;
}


// ─── API: Submit Flow ───

export interface SubmitRequest {
  githubUrl: string;
  submitterEmail: string;
}

export interface SubmitResponse {
  module: Module;
  message: string;
}

export interface SubmitEditRequest {
  name?: string;
  description?: string;
  category?: Category;
  techStack?: string[];
  inputContract?: string;
  outputContract?: string;
  pricingModel?: PricingModel;
  price?: number;
}

export interface SubmitEditResponse {
  module: Module;
}


// ─── API: Discovery Flow ───

export interface DiscoverRequest {
  query: string;
  categories?: Category[];
}

export interface ModuleMatch {
  module: Module;
  fitLine: string;
  matchScore: number;
  matchedKeywords: string[];
}

export interface DiscoverResponse {
  matches: ModuleMatch[];
  query: string;
}


// ─── API: Module Detail ───

export interface ModuleDetailResponse {
  module: Module;
  apiSnippet: string;
  reviews: CustomerReview[];
}

export interface CustomerReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}


// ─── API: Review (Admin) ───

export interface ReviewListResponse {
  modules: ReviewItem[];
}

export interface ReviewItem {
  module: Module;
  testResults: TestResult[];
  sandboxLogs: string;
}

export interface TestResult {
  testCase: string;
  input: any;
  expectedOutputShape: string;
  actualOutput: any;
  passed: boolean;
  error?: string;
}

export interface ApproveRequest {
  notes?: string;
}

export interface RejectRequest {
  reason: string;
}


// ─── API: Proxy (Customer-facing) ───

export interface ProxyResponse<T = any> {
  success: boolean;
  data: T;
  module: string;
  version: string;
  requestId: string;
  error?: string;
}


// ─── API: Dashboard ───

export interface DashboardResponse {
  stats: {
    totalEarnings: number;
    liveModules: number;
    totalIntegrations: number;
    inReview: number;
  };
  modules: Module[];
  earnings: MonthlyEarning[];
}

export interface MonthlyEarning {
  month: string;
  amount: number;
}


// ─── API: Keys (Admin) ───

export interface GenerateKeyRequest {
  customerEmail: string;
  rateLimitPerHour?: number;
}

export interface GenerateKeyResponse {
  key: string;
  keyPrefix: string;
  customerEmail: string;
}


// ─── Utilities ───

export function formatPrice(cents: number, model: PricingModel): string {
  const dollars = (cents / 100).toFixed(0);
  return model === 'buy' ? `$${dollars}` : `$${dollars}/mo`;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
