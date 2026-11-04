export type Severity = "critical" | "high" | "medium" | "low";
export type ScenarioType = "supplier-delay" | "demand-spike" | "logistics-disruption" | "adverse-news";

export interface Supplier { id: string; name: string; country: string; component: string; onTime: number; leadTime: number; defectRate: number; spend: number; }
export interface Sku { id: string; name: string; category: string; supplierId: string; inventory: number; dailyDemand: number; forecastVariance: number; }
export interface NewsArticle { id: string; title: string; source: string; publishedAt: string; url: string; tags: string[]; summary: string; riskWeight: number; }
export interface Evidence { label: string; value: string; direction: "up" | "down" | "neutral"; }
export interface RiskFactor { label: string; score: number; finding: string; }
export interface Insight { id: string; title: string; severity: Severity; score: number; confidence: number; category: string; supplier?: string; sku?: string; explanation: string; newsSummary?: string; action: string; evidence: Evidence[]; factors: RiskFactor[]; articles: NewsArticle[]; owner: string; change: string; }
export interface ProviderStatus { configured: boolean; mode: "live" | "fallback" | "unavailable"; detail: string; }
export interface DashboardState { generatedAt: string; scenario: string; kpis: { label: string; value: string; delta: string; tone: string }[]; insights: Insight[]; suppliers: Supplier[]; skus: Sku[]; trends: { week: string; onTime: number; inventoryRisk: number; demand: number }[]; news: NewsArticle[]; provider: { gemini: ProviderStatus; news: ProviderStatus }; }
