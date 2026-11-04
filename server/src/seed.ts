import type { NewsArticle, Sku, Supplier } from "./types.js";

export const suppliers: Supplier[] = [
  { id: "sup-1", name: "Taiwan Precision Semicon", country: "Taiwan", component: "Power-management IC", onTime: 82, leadTime: 46, defectRate: 1.8, spend: 36 },
  { id: "sup-2", name: "Nova Display Systems", country: "South Korea", component: "OLED display", onTime: 96, leadTime: 28, defectRate: 0.6, spend: 24 },
  { id: "sup-3", name: "Apex Battery Materials", country: "China", component: "Lithium battery cell", onTime: 89, leadTime: 39, defectRate: 2.7, spend: 28 },
  { id: "sup-4", name: "Vector Enclosures", country: "Vietnam", component: "Aluminium housing", onTime: 94, leadTime: 22, defectRate: 0.8, spend: 12 }
];
export const skus: Sku[] = [
  { id: "sku-1", name: "PulseBook 14", category: "Laptop", supplierId: "sup-1", inventory: 1460, dailyDemand: 98, forecastVariance: 18 },
  { id: "sku-2", name: "Orbit X1", category: "Smartphone", supplierId: "sup-2", inventory: 9600, dailyDemand: 310, forecastVariance: -6 },
  { id: "sku-3", name: "PulseBook 16 Pro", category: "Laptop", supplierId: "sup-3", inventory: 620, dailyDemand: 74, forecastVariance: 23 },
  { id: "sku-4", name: "SoundPod Mini", category: "Audio", supplierId: "sup-4", inventory: 18300, dailyDemand: 170, forecastVariance: -21 }
];
export const fixtureNews: NewsArticle[] = [
  { id: "n1", title: "Taiwanese electronics suppliers report extended allocation windows", source: "Supply Wire", publishedAt: "2026-10-31", url: "#", tags: ["Taiwan", "semiconductor", "supplier"], summary: "Power-management component allocations may extend through the next quarter.", riskWeight: 18 },
  { id: "n2", title: "Pacific port congestion adds delays to Asia-Europe lanes", source: "Logistics Daily", publishedAt: "2026-11-02", url: "#", tags: ["port", "logistics", "Asia"], summary: "Vessel dwell times have increased at key transshipment hubs.", riskWeight: 12 },
  { id: "n3", title: "Lithium carbonate prices rise on renewed battery demand", source: "Materials Monitor", publishedAt: "2026-10-29", url: "#", tags: ["lithium", "battery", "China"], summary: "Spot prices climbed as storage demand and EV production increased.", riskWeight: 10 },
  { id: "n4", title: "OLED panel capacity remains tight for premium-device launches", source: "Display Chain Review", publishedAt: "2026-11-01", url: "#", tags: ["South Korea", "display", "capacity"], summary: "Panel allocation is tightening as premium handset and laptop launch volumes increase.", riskWeight: 9 },
  { id: "n5", title: "Vietnam electronics plants face longer outbound booking windows", source: "Manufacturing Routes", publishedAt: "2026-11-03", url: "#", tags: ["Vietnam", "logistics", "shipping"], summary: "Export booking lead times are extending at major electronics manufacturing hubs.", riskWeight: 8 }
];
