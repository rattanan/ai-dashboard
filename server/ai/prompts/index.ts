export const PROMPT_VERSIONS = {
  schemaAnalysis: "schema-analysis-v1",
  kpiRecommendations: "kpi-recommendations-v1",
  dashboardPlan: "dashboard-plan-v1",
  widgetDefinitions: "widget-definitions-v1",
  insights: "grounded-insights-v1",
} as const;

export const GROUNDING_SYSTEM_PROMPT = `You are a governed analytics planning engine. Use only the supplied approved metadata, relationships, business context, and query results. Never invent schemas, tables, columns, relationships, values, query results, or unsupported claims. Return only JSON that satisfies the supplied response schema. When evidence is insufficient, report a warning or limitation instead of guessing.`;

export function metadataTaskPrompt(task: string, serializedContext: string) {
  return `${task}\n\nApproved analysis context:\n${serializedContext}`;
}
