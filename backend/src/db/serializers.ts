import type {
  Module,
  Category,
  ModuleStatus,
  PricingModel,
  Complexity,
  ApiKey,
  CustomerReview,
} from '@rotshop/shared';
import type { ModuleRow, ApiKeyRow, CustomerReviewRow } from './schema.js';

function parseTechStack(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function isoOrNow(d: Date | null | undefined): string {
  return (d ?? new Date()).toISOString();
}

export function toModuleDTO(row: ModuleRow): Module {
  return {
    id: row.id,
    githubUrl: row.githubUrl,
    submitterEmail: row.submitterEmail,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    category: (row.category ?? 'AI/ML') as Category,
    techStack: parseTechStack(row.techStack),
    inputContract: row.inputContract ?? '',
    outputContract: row.outputContract ?? '',
    pricingModel: (row.pricingModel ?? 'buy') as PricingModel,
    price: row.price ?? 0,
    status: row.status as ModuleStatus,
    complexity: (row.complexity ?? 'Medium') as Complexity,
    rating: row.rating ?? null,
    integrationCount: row.integrationCount ?? 0,
    createdAt: isoOrNow(row.createdAt),
    updatedAt: isoOrNow(row.updatedAt),
  };
}

export function toApiKeyDTO(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    keyPrefix: row.keyPrefix,
    customerEmail: row.customerEmail,
    isActive: row.isActive,
    rateLimitPerHour: row.rateLimitPerHour,
    createdAt: isoOrNow(row.createdAt),
  };
}

export function toCustomerReviewDTO(row: CustomerReviewRow): CustomerReview {
  return {
    id: row.id,
    customerName: row.customerName,
    rating: row.rating,
    comment: row.comment,
    createdAt: isoOrNow(row.createdAt),
  };
}
