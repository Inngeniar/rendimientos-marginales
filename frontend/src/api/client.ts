import axios from "axios";
import type {
  BaselineResult,
  MarginalResult,
  MixOptimizeResult,
  PipelineResult,
  ProcessConfig,
  ResourceProfile,
  SectorBenchmark,
} from "../types/models";

const api = axios.create({
  baseURL: "/api/v1",
});

export async function simulateBaseline(
  process: ProcessConfig,
  resource?: ResourceProfile
): Promise<BaselineResult> {
  const { data } = await api.post<BaselineResult>("/simulate/baseline", {
    process,
    resource,
  });
  return data;
}

export async function simulateMarginal(
  process: ProcessConfig,
  resource: ResourceProfile,
  max_staff = 15,
  congestion_alpha = 0.03
): Promise<MarginalResult> {
  const { data } = await api.post<MarginalResult>("/simulate/marginal", {
    process,
    resource,
    max_staff,
    congestion_alpha,
  });
  return data;
}

export async function optimizeMix(
  process: ProcessConfig,
  human_profile: ResourceProfile,
  bot_profile: ResourceProfile,
  max_humans = 500,
  max_bots = 50,
  objective: "min_cost" | "max_throughput" = "min_cost"
): Promise<MixOptimizeResult> {
  const { data } = await api.post<MixOptimizeResult>("/optimize/mix", {
    process,
    human_profile,
    bot_profile,
    max_humans,
    max_bots,
    objective,
  });
  return data;
}

export async function simulatePipeline(
  stages: Array<{
    process: ProcessConfig;
    resource: ResourceProfile;
    assigned_count: number;
    bot_resource?: ResourceProfile | null;
    assigned_bots?: number;
    pass_through_rate?: number;
    shared_pool?: string | null;
  }>
): Promise<PipelineResult> {
  const { data } = await api.post<PipelineResult>("/simulate/pipeline", {
    stages,
  });
  return data;
}

export async function fetchBenchmarks(): Promise<SectorBenchmark[]> {
  const { data } = await api.get<SectorBenchmark[]>("/benchmarks");
  return data;
}

export async function importExcel(file: File): Promise<ProcessConfig[]> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<ProcessConfig[]>("/excel/import", form);
  return data;
}

export async function exportExcel(rows: BaselineResult[]): Promise<Blob> {
  const { data } = await api.post("/excel/export", rows, {
    responseType: "blob",
  });
  return data;
}
