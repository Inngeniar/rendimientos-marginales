import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Bot,
  Clock,
  Database,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import {
  exportExcel,
  fetchBenchmarks,
  importExcel,
  optimizeMix,
  simulateBaseline,
  simulateMarginal,
  simulatePipeline,
} from "./api/client";
import { BenchmarkBadge } from "./components/BenchmarkBadge";
import { ExecutiveReportView } from "./components/ExecutiveReportView";
import { MarginalAnalyst } from "./components/MarginalAnalyst";
import { MarginalChart } from "./components/MarginalChart";
import { OitInefficiencyEstimator } from "./components/OitInefficiencyEstimator";
import { PipelineView, type EditablePipelineStage } from "./components/PipelineView";
import { PricingSimulatorView } from "./components/PricingSimulatorView";
import { ProcessForm } from "./components/ProcessForm";
import { ResourceMixPanel } from "./components/ResourceMixPanel";
import { SavedExercisesPanel } from "./components/SavedExercisesPanel";
import { ScenarioLibrary, loadAutosave, saveAutosave } from "./components/ScenarioLibrary";
import { TheoryAndSources } from "./components/TheoryAndSources";
import type {
  BaselineResult,
  MarginalResult,
  MixOptimizeResult,
  PipelineResult,
  PricingSimulationResult,
  ProcessConfig,
  ResourceProfile,
  SectorBenchmark,
} from "./types/models";

const DEFAULT_PROCESS: ProcessConfig = {
  id: "proc-1",
  name: "Radicación Digital",
  category: "radicacion",
  complexity: "baja",
  expected_monthly_demand: 18395,
  avg_time_minutes: 3,
  working_days_per_month: 22,
  effective_hours_per_day: 8,
  base_inefficiency_rate: 0.1,
  rework_return_rate: 0.05,
  sla_deadline_days: null,
};

const DEFAULT_HUMAN: ResourceProfile = {
  resource_type: "human",
  name: "Operador Humano",
  available_hours_per_day: 8,
  available_days_per_month: 22,
  speed_multiplier: 1.0,
  inefficiency_rate: 0.1,
  exception_escalation_rate: 0.0,
  fatigue_exponent: 0.15,
  learning_curve_factor: 1.0,
  monthly_cost: 2_500_000,
  current_headcount: 6,
};

const DEFAULT_BOT: ResourceProfile = {
  resource_type: "bot",
  name: "Bot RPA",
  available_hours_per_day: 12,
  available_days_per_month: 30,
  speed_multiplier: 1.5,
  inefficiency_rate: 0.03,
  exception_escalation_rate: 0.15,
  fatigue_exponent: 0.0,
  learning_curve_factor: 1.0,
  monthly_cost: 1_800_000,
  current_headcount: 0,
};

const DEFAULT_PIPELINE_STAGES: EditablePipelineStage[] = [
  { name: "1. Liquidación", category: "liquidacion", avg_time_minutes: 8, bot_avg_time_minutes: 4, mode: "human", human_role: "auxiliar", assigned_count: 6, assigned_bots: 0, pass_through_rate: 1.0, share_bot_pool: false },
  { name: "2. Armado de Cuentas", category: "armado_cuentas", avg_time_minutes: 8, bot_avg_time_minutes: 4, mode: "human", human_role: "auxiliar", assigned_count: 6, assigned_bots: 0, pass_through_rate: 1.0, share_bot_pool: false },
  { name: "3. Auditoría", category: "auditoria", avg_time_minutes: 15, bot_avg_time_minutes: 5, mode: "human", human_role: "tecnico", assigned_count: 8, assigned_bots: 0, pass_through_rate: 1.0, share_bot_pool: false },
  { name: "4. Radicación", category: "radicacion", avg_time_minutes: 3, bot_avg_time_minutes: 3, mode: "human", human_role: "tecnico", assigned_count: 6, assigned_bots: 0, pass_through_rate: 1.0, share_bot_pool: false },
];

export function App() {
  const [initial] = useState(() => loadAutosave());
  const [tab, setTab] = useState<"simulator" | "optimizer" | "pipeline" | "pricing" | "report" | "saved" | "theory">("simulator");
  const [processCfg, setProcessCfg] = useState<ProcessConfig>(() => initial?.processCfg ?? DEFAULT_PROCESS);
  const [humanProfile, setHumanProfile] = useState<ResourceProfile>(() => initial?.humanProfile ?? DEFAULT_HUMAN);
  const [botProfile, setBotProfile] = useState<ResourceProfile>(() => initial?.botProfile ?? DEFAULT_BOT);
  const [congestionAlpha, setCongestionAlpha] = useState<number>(() => initial?.congestionAlpha ?? 0.03);
  const [tecnicoMonthlyCost, setTecnicoMonthlyCost] = useState<number>(() => initial?.tecnicoMonthlyCost ?? 3_800_000);
  const [pipelineStages, setPipelineStages] = useState<EditablePipelineStage[]>(
    () => initial?.pipelineStages ?? DEFAULT_PIPELINE_STAGES
  );

  useEffect(() => {
    saveAutosave({ processCfg, humanProfile, botProfile, congestionAlpha, pipelineStages, tecnicoMonthlyCost });
  }, [processCfg, humanProfile, botProfile, congestionAlpha, pipelineStages, tecnicoMonthlyCost]);

  const [baseline, setBaseline] = useState<BaselineResult | null>(null);
  const [marginal, setMarginal] = useState<MarginalResult | null>(null);
  const [mixResult, setMixResult] = useState<MixOptimizeResult | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingSimulationResult | null>(null);
  const [benchmarks, setBenchmarks] = useState<SectorBenchmark[]>([]);
  const [importedProcesses, setImportedProcesses] = useState<ProcessConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBenchmarks().then(setBenchmarks).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setError(null);
        const [b, m, mix] = await Promise.all([
          simulateBaseline(processCfg, humanProfile),
          simulateMarginal(processCfg, humanProfile, 15, congestionAlpha),
          optimizeMix(processCfg, humanProfile, botProfile),
        ]);
        if (active) {
          setBaseline(b);
          setMarginal(m);
          setMixResult(mix);
        }
      } catch {
        if (active) setError("No se pudo conectar con el servicio de cálculo (/api/v1).");
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [processCfg, humanProfile, botProfile, congestionAlpha]);

  const handleOptimizeMix = async () => {
    try {
      setError(null);
      const res = await optimizeMix(processCfg, humanProfile, botProfile);
      setMixResult(res);
    } catch {
      setError("Error ejecutando optimización Humano + Bot.");
    }
  };

  const handleRunPipeline = async (stagesOverride?: EditablePipelineStage[]) => {
    const activeStages = stagesOverride ?? pipelineStages;
    try {
      setError(null);
      const res = await simulatePipeline(
        activeStages.map((st) => ({
          process: {
            ...processCfg,
            name: st.name,
            category: st.category,
            avg_time_minutes: st.mode === "bot" ? st.bot_avg_time_minutes : st.avg_time_minutes,
          },
          resource: st.mode === "bot" ? botProfile : humanProfile,
          assigned_count: st.mode === "bot" ? Math.max(1, st.assigned_bots) : st.assigned_count,
          bot_resource: st.mode === "mix" ? botProfile : null,
          assigned_bots: st.mode === "mix" ? st.assigned_bots : 0,
          bot_avg_time_minutes: st.mode === "mix" ? st.bot_avg_time_minutes : null,
          pass_through_rate: st.pass_through_rate,
          shared_pool: st.mode !== "human" && st.share_bot_pool ? "bot-rpa-compartido" : null,
        }))
      );
      setPipelineResult(res);
    } catch {
      setError("Error analizando el flujo encadenado.");
    }
  };

  const handleApplyPipelinePreset = (preset: "traditional" | "shared_bot" | "relay_bots") => {
    let next: EditablePipelineStage[];
    if (preset === "shared_bot") {
      next = [
        { name: "1. Liquidación", category: "liquidacion", avg_time_minutes: 5, bot_avg_time_minutes: 3, mode: "human", human_role: "auxiliar", assigned_count: 9, assigned_bots: 0, pass_through_rate: 1.0, share_bot_pool: false },
        { name: "2. Armado de Cuentas", category: "armado_cuentas", avg_time_minutes: 8, bot_avg_time_minutes: 4, mode: "bot", human_role: "auxiliar", assigned_count: 0, assigned_bots: 3, pass_through_rate: 1.0, share_bot_pool: true },
        { name: "3. Auditoría", category: "auditoria", avg_time_minutes: 12, bot_avg_time_minutes: 4, mode: "human", human_role: "tecnico", assigned_count: 2, assigned_bots: 0, pass_through_rate: 0.1, share_bot_pool: false },
        { name: "4. Radicación", category: "radicacion", avg_time_minutes: 3.5, bot_avg_time_minutes: 3.5, mode: "bot", human_role: "tecnico", assigned_count: 0, assigned_bots: 3, pass_through_rate: 1.0, share_bot_pool: true },
      ];
    } else if (preset === "relay_bots") {
      next = [
        { name: "1. Liquidación", category: "liquidacion", avg_time_minutes: 5, bot_avg_time_minutes: 3, mode: "human", human_role: "auxiliar", assigned_count: 9, assigned_bots: 0, pass_through_rate: 1.0, share_bot_pool: false },
        { name: "2. Armado de Cuentas", category: "armado_cuentas", avg_time_minutes: 8, bot_avg_time_minutes: 4, mode: "mix", human_role: "auxiliar", assigned_count: 2, assigned_bots: 2, pass_through_rate: 1.0, share_bot_pool: false },
        { name: "3. Auditoría", category: "auditoria", avg_time_minutes: 12, bot_avg_time_minutes: 4, mode: "human", human_role: "tecnico", assigned_count: 2, assigned_bots: 0, pass_through_rate: 0.1, share_bot_pool: false },
        { name: "4. Radicación", category: "radicacion", avg_time_minutes: 3.5, bot_avg_time_minutes: 3.5, mode: "bot", human_role: "tecnico", assigned_count: 0, assigned_bots: 2, pass_through_rate: 1.0, share_bot_pool: false },
      ];
    } else {
      next = DEFAULT_PIPELINE_STAGES;
    }
    setPipelineStages(next);
    handleRunPipeline(next);
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const list = await importExcel(file);
      setImportedProcesses(list);
      if (list.length > 0) setProcessCfg(list[0]);
    } catch {
      setError("No se pudo leer el archivo Excel.");
    }
  };

  const handleExportExcel = async () => {
    if (!baseline) return;
    const blob = await exportExcel([baseline]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rendimientos_marginales.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100/70">
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 backdrop-blur">
              <TrendingUp className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Rendimientos Marginales — Facturación en Salud
                </h1>
                <span className="hidden rounded-full bg-indigo-500/25 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200 ring-1 ring-indigo-400/30 sm:inline-block">
                  MSM Analytics
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Liquidación · Armado de Cuentas · Auditoría · Radicación · SOAT-ADRES · Optimización Humano + RPA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20">
              <Upload className="h-3.5 w-3.5" />
              Importar Excel
              <input type="file" accept=".xlsx" className="hidden" onChange={handleUploadExcel} />
            </label>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!baseline}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-3">
          <nav className="inline-flex flex-wrap gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setTab("simulator")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "simulator"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Activity className="h-4 w-4" /> Simulador y Curva Marginal
            </button>
            <button
              type="button"
              onClick={() => setTab("optimizer")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "optimizer"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Bot className="h-4 w-4" /> Optimizador Humano + Bot
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("pipeline");
                handleRunPipeline();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "pipeline"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" /> Flujo Integral y Estándares
            </button>
            <button
              type="button"
              onClick={() => setTab("pricing")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "pricing"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <DollarSign className="h-4 w-4" /> Rangos y Monetización
            </button>
            <button
              type="button"
              onClick={() => setTab("report")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "report"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4" /> Informe Ejecutivo
            </button>
            <button
              type="button"
              onClick={() => setTab("saved")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "saved"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Database className="h-4 w-4" /> Mis Ejercicios
            </button>
            <button
              type="button"
              onClick={() => setTab("theory")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "theory"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4" /> Marco Teórico y Fuentes
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-7">
        <ScenarioLibrary
          currentState={{ processCfg, humanProfile, botProfile, congestionAlpha, pipelineStages, tecnicoMonthlyCost }}
          onLoadExercise={(ex) => {
            setProcessCfg(ex.processCfg);
            setHumanProfile(ex.humanProfile);
            setBotProfile(ex.botProfile);
            setCongestionAlpha(ex.congestionAlpha);
            setPipelineStages(ex.pipelineStages);
            if (typeof ex.tecnicoMonthlyCost === "number") setTecnicoMonthlyCost(ex.tecnicoMonthlyCost);
            handleRunPipeline(ex.pipelineStages);
          }}
          onResetDefaults={() => {
            setProcessCfg(DEFAULT_PROCESS);
            setHumanProfile(DEFAULT_HUMAN);
            setBotProfile(DEFAULT_BOT);
            setCongestionAlpha(0.03);
            setTecnicoMonthlyCost(3_800_000);
            setPipelineStages(DEFAULT_PIPELINE_STAGES);
            handleRunPipeline(DEFAULT_PIPELINE_STAGES);
          }}
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {importedProcesses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs shadow-sm">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            <span className="font-semibold text-indigo-950">Bloques importados:</span>
            {importedProcesses.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProcessCfg(p)}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  processCfg.id === p.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {tab === "simulator" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-5">
              <ProcessForm value={processCfg} onChange={setProcessCfg} benchmarks={benchmarks} />
              <ResourceMixPanel title="Perfil del Recurso Humano" value={humanProfile} onChange={setHumanProfile} />
              <OitInefficiencyEstimator
                currentInefficiency={humanProfile.inefficiency_rate}
                onApply={(rate) => setHumanProfile({ ...humanProfile, inefficiency_rate: rate })}
              />
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <label className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>Factor de congestión marginal (α): {(congestionAlpha * 100).toFixed(1)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={0.12}
                    step={0.01}
                    value={congestionAlpha}
                    onChange={(e) => setCongestionAlpha(Number(e.target.value))}
                    className="w-40 accent-indigo-600"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-7">
              {baseline && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Óptimo / Día</span>
                      <Zap className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                      {baseline.optimal_daily_production.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">facturas / día</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Óptimo / Hora</span>
                      <Clock className="h-4 w-4 text-sky-500" />
                    </div>
                    <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                      {baseline.optimal_hourly_production.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">facturas / hora</div>
                  </div>

                  <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between text-xs font-medium text-indigo-700">
                      <span>Dotación Req.</span>
                      <Users className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold tabular-nums text-indigo-700">
                      {baseline.required_resources_rounded}
                    </div>
                    <div className="mt-0.5 text-[11px] text-indigo-500">
                      exacto: {baseline.required_resources_exact}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Brecha vs Actual</span>
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                      {baseline.headcount_gap > 0 ? `+${baseline.headcount_gap}` : baseline.headcount_gap}
                    </div>
                    <div className="mt-1.5">
                      <BenchmarkBadge status={baseline.benchmark_status} />
                    </div>
                  </div>
                </div>
              )}

              {marginal?.bottleneck_alert && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 shadow-sm">
                  {marginal.bottleneck_alert}
                </div>
              )}

              {marginal && (
                <>
                  <MarginalChart curve={marginal.curve} optimalStaff={marginal.optimal_staff_for_demand} />
                  <MarginalAnalyst
                    marginal={marginal}
                    baseline={baseline}
                    processCfg={processCfg}
                    humanProfile={humanProfile}
                    congestionAlpha={congestionAlpha}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {tab === "optimizer" && (
          <div className="space-y-6">
            <ProcessForm value={processCfg} onChange={setProcessCfg} benchmarks={benchmarks} />
            <OitInefficiencyEstimator
              currentInefficiency={humanProfile.inefficiency_rate}
              onApply={(rate) => setHumanProfile({ ...humanProfile, inefficiency_rate: rate })}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ResourceMixPanel title="Perfil Humano" value={humanProfile} onChange={setHumanProfile} />
              <ResourceMixPanel title="Perfil Bot RPA" value={botProfile} onChange={setBotProfile} isBot />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleOptimizeMix}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Recalcular Combinación Óptima
              </button>
            </div>

            {mixResult && baseline && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <h3 className="mb-1 text-base font-semibold text-slate-900">
                    Opción 1: Solo Personas ({baseline.effective_demand.toLocaleString()} fact/mes)
                  </h3>
                  <p className="mb-4 text-xs text-slate-500">
                    Capacidad neta por funcionario: {baseline.net_monthly_capacity_per_resource.toLocaleString()} fact/mes
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <div className="text-xs text-slate-500">Personas necesarias</div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                        {baseline.required_resources_rounded}
                      </div>
                      <div className="text-[11px] text-slate-400">exacto: {baseline.required_resources_exact}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <div className="text-xs text-slate-500">Costo Total Mensual</div>
                      <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                        ${(baseline.required_resources_rounded * humanProfile.monthly_cost).toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <div className="text-xs text-slate-500">Costo / Factura</div>
                      <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                        $
                        {Math.round(
                          (baseline.required_resources_rounded * humanProfile.monthly_cost) /
                            Math.max(1, baseline.effective_demand)
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/40 via-white to-white p-6 shadow-sm">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">Opción 2: Mix Óptimo (Humano + Bot)</h3>
                    {mixResult.feasible &&
                      baseline.required_resources_rounded * humanProfile.monthly_cost > mixResult.total_monthly_cost && (
                        <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                          Ahorro: $
                          {(
                            baseline.required_resources_rounded * humanProfile.monthly_cost -
                            mixResult.total_monthly_cost
                          ).toLocaleString()}
                          /mes
                        </span>
                      )}
                  </div>
                  <p className="mb-4 text-xs text-slate-500">{mixResult.notes}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <div className="text-xs text-slate-500">Humanos</div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                        {mixResult.optimal_humans}
                      </div>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3.5">
                      <div className="text-xs text-violet-700">Bots RPA</div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-violet-900">
                        {mixResult.optimal_bots}
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3.5">
                      <div className="text-xs text-emerald-700">Costo Mensual</div>
                      <div className="mt-1 text-lg font-bold tabular-nums text-emerald-900">
                        ${mixResult.total_monthly_cost.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl bg-indigo-50 p-3.5">
                      <div className="text-xs text-indigo-700">Costo / Factura</div>
                      <div className="mt-1 text-lg font-bold tabular-nums text-indigo-900">
                        ${mixResult.cost_per_invoice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "pipeline" && (
          <div className="space-y-6">
            <PipelineView
              stages={pipelineStages}
              onChangeStages={(next) => {
                setPipelineStages(next);
                handleRunPipeline(next);
              }}
              onApplyPreset={handleApplyPipelinePreset}
              result={pipelineResult}
              botEscalationRate={botProfile.exception_escalation_rate}
              auxiliarMonthlyCost={humanProfile.monthly_cost}
              tecnicoMonthlyCost={tecnicoMonthlyCost}
              botMonthlyCost={botProfile.monthly_cost}
              onChangeCosts={({ auxiliar, tecnico, bot }) => {
                setHumanProfile((prev) => ({ ...prev, monthly_cost: auxiliar }));
                setTecnicoMonthlyCost(tecnico);
                setBotProfile((prev) => ({ ...prev, monthly_cost: bot }));
              }}
            />

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="mb-1 text-base font-semibold text-slate-900">
                Estándares de Producción Sector Salud (Referencia)
              </h3>
              <p className="mb-4 text-xs text-slate-500">
                Parámetros de referencia sectorial por proceso, complejidad y normativa SOAT-ADRES / RIPS-CUV
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                    <tr>
                      <th className="rounded-tl-lg px-3 py-2.5 font-semibold">Proceso</th>
                      <th className="px-3 py-2.5 font-semibold">Fact / Hora</th>
                      <th className="px-3 py-2.5 font-semibold">Fact / Día (8h)</th>
                      <th className="px-3 py-2.5 font-semibold">Tiempo Rec.</th>
                      <th className="rounded-tr-lg px-3 py-2.5 font-semibold">CCR Meta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {benchmarks.map((b) => (
                      <tr key={b.label} className="transition hover:bg-slate-50/70">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-800">{b.label}</div>
                          <div className="text-[11px] text-slate-400">{b.notes}</div>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {b.min_per_hour_human} – {b.max_per_hour_human}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {b.min_per_day_human} – {b.max_per_day_human}
                        </td>
                        <td className="px-3 py-2.5 font-semibold tabular-nums text-indigo-700">
                          {b.recommended_avg_minutes} min
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 tabular-nums">
                            {(b.target_clean_claim_rate * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "pricing" && (
          <PricingSimulatorView
            processCfg={processCfg}
            humanProfile={humanProfile}
            botProfile={botProfile}
            onResultChange={setPricingResult}
          />
        )}

        {tab === "report" && (
          <ExecutiveReportView
            processCfg={processCfg}
            humanProfile={humanProfile}
            botProfile={botProfile}
            baseline={baseline}
            marginal={marginal}
            mixResult={mixResult}
            pricingResult={pricingResult}
          />
        )}

        {tab === "saved" && (
          <SavedExercisesPanel
            currentSnapshot={{
              version: "1.0",
              savedAt: new Date().toISOString(),
              name: processCfg.name,
              notes: "",
              processCfg,
              humanProfile,
              botProfile,
              congestionAlpha,
              summaryResult: { baseline, mixResult, pricingResult },
            }}
            onLoadSnapshot={(snap) => {
              setProcessCfg(snap.processCfg);
              setHumanProfile(snap.humanProfile);
              setBotProfile(snap.botProfile);
              setCongestionAlpha(snap.congestionAlpha ?? 0.03);
              setTab("simulator");
            }}
          />
        )}

        {tab === "theory" && <TheoryAndSources />}
      </main>
    </div>
  );
}

export default App;
