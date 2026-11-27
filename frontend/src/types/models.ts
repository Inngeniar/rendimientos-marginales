export type ProcessCategory = "liquidacion" | "armado_cuentas" | "auditoria" | "radicacion" | "devoluciones";
export type ComplexityLevel = "baja" | "media" | "alta" | "soat_adres_baja" | "soat_adres_alta";
export type ResourceType = "human" | "bot";

export interface ProcessConfig {
  id: string;
  name: string;
  category: ProcessCategory;
  complexity: ComplexityLevel;
  expected_monthly_demand: number;
  avg_time_minutes: number;
  working_days_per_month: number;
  effective_hours_per_day: number;
  base_inefficiency_rate: number;
  rework_return_rate: number;
  sla_deadline_days: number | null;
}

export interface ResourceProfile {
  resource_type: ResourceType;
  name: string;
  available_hours_per_day: number;
  available_days_per_month: number;
  speed_multiplier: number;
  inefficiency_rate: number;
  exception_escalation_rate: number;
  fatigue_exponent: number;
  learning_curve_factor: number;
  monthly_cost: number;
  current_headcount: number;
}

export interface BaselineResult {
  process_name: string;
  effective_demand: number;
  raw_daily_capacity_per_resource: number;
  raw_hourly_capacity_per_resource: number;
  monthly_capacity_per_resource: number;
  net_monthly_capacity_per_resource: number;
  optimal_daily_production: number;
  optimal_hourly_production: number;
  required_resources_exact: number;
  required_resources_rounded: number;
  current_headcount: number;
  headcount_gap: number;
  utilization_rate: number;
  benchmark_status: string;
}

export interface MarginalPoint {
  staff_count: number;
  total_output: number;
  average_output: number;
  marginal_output: number;
  utilization_rate: number;
  unit_cost: number;
}

export interface MarginalResult {
  process_name: string;
  optimal_staff_for_demand: number;
  max_marginal_efficiency_staff: number;
  optimal_daily_production: number;
  optimal_hourly_production: number;
  curve: MarginalPoint[];
  bottleneck_alert: string | null;
}

export interface MixOptimizeResult {
  feasible: boolean;
  optimal_humans: number;
  optimal_bots: number;
  total_monthly_cost: number;
  total_monthly_capacity: number;
  escalated_demand_to_humans: number;
  bot_handled_demand: number;
  optimal_daily_production: number;
  optimal_hourly_production: number;
  cost_per_invoice: number;
  notes: string;
}

export interface PipelineStageResult {
  process_name: string;
  category: string;
  incoming_demand: number;
  effective_demand_with_rework: number;
  stage_monthly_capacity: number;
  utilization_rate: number;
  is_bottleneck: boolean;
  recommended_count: number;
  safe_recommended_count?: number;
  pass_through_rate?: number;
  shared_pool?: string | null;
  pool_utilization_rate?: number | null;
  human_utilization_rate?: number | null;
  bot_utilization_rate?: number | null;
}

export interface PipelineResult {
  stages: PipelineStageResult[];
  bottleneck_stage: string;
  max_end_to_end_monthly_throughput: number;
}

export interface SectorBenchmark {
  category: ProcessCategory;
  complexity: ComplexityLevel;
  label: string;
  min_per_hour_human: number;
  max_per_hour_human: number;
  min_per_day_human: number;
  max_per_day_human: number;
  recommended_avg_minutes: number;
  target_clean_claim_rate: number;
  notes: string;
}

export interface VolumeTierResult {
  tier_label: string;
  min_volume: number;
  max_volume: number;
  optimal_humans: number;
  optimal_bots: number;
  solo_humans_needed: number;
  monthly_operational_cost: number;
  unit_cost_per_invoice: number;
  recommended_unit_price: number;
  recommended_monthly_price: number;
  resource_jump_note: string;
}

export interface MonetizationOption {
  model_id: string;
  model_name: string;
  estimated_monthly_revenue: number;
  estimated_monthly_cost: number;
  gross_margin_amount: number;
  gross_margin_pct: number;
  market_acceptance_score: number;
  profitability_score: number;
  pros: string;
  cons: string;
  is_recommended: boolean;
}

export interface PricingSimulationResult {
  process_name: string;
  complexity: string;
  tiers: VolumeTierResult[];
  monetization_options: MonetizationOption[];
  recommended_monetization: string;
  executive_summary: string;
}

export interface ExerciseSnapshot {
  version: string;
  savedAt: string;
  name: string;
  notes: string;
  processCfg: ProcessConfig;
  humanProfile: ResourceProfile;
  botProfile: ResourceProfile;
  congestionAlpha: number;
  summaryResult?: {
    baseline: BaselineResult | null;
    mixResult: MixOptimizeResult | null;
    pricingResult?: PricingSimulationResult | null;
  };
}

export interface SavedExerciseRecord {
  id: string;
  name: string;
  category: string;
  complexity: string;
  notes: string;
  model_payload: ExerciseSnapshot;
  summary_result: Record<string, unknown>;
  created_at: string;
  source: "supabase" | "local";
}
