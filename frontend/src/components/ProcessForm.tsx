import { SlidersHorizontal } from "lucide-react";
import type { ComplexityLevel, ProcessCategory, ProcessConfig, SectorBenchmark } from "../types/models";

interface Props {
  value: ProcessConfig;
  onChange: (next: ProcessConfig) => void;
  benchmarks?: SectorBenchmark[];
}

const inputCls =
  "mt-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function ProcessForm({ value, onChange, benchmarks = [] }: Props) {
  const set = <K extends keyof ProcessConfig>(k: K, v: ProcessConfig[K]) =>
    onChange({ ...value, [k]: v });

  const categoryBenchmarks = benchmarks.filter((b) => b.category === value.category);

  const applyCategoryOrComplexity = (nextCat: ProcessCategory, nextComp: ComplexityLevel) => {
    const forCat = benchmarks.filter((b) => b.category === nextCat);
    const match = forCat.find((b) => b.complexity === nextComp) ?? forCat[0];
    onChange({
      ...value,
      category: nextCat,
      complexity: match ? match.complexity : nextComp,
      avg_time_minutes: match ? match.recommended_avg_minutes : value.avg_time_minutes,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Parámetros del Proceso</h2>
          <p className="text-xs text-slate-500">Carga de trabajo, estándar de tiempo y reglas operativas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Nombre del proceso
          <input
            type="text"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Categoría
          <select
            value={value.category}
            onChange={(e) => applyCategoryOrComplexity(e.target.value as ProcessCategory, value.complexity)}
            className={inputCls}
          >
            <option value="liquidacion">Liquidación de facturas</option>
            <option value="armado_cuentas">Armado de cuentas</option>
            <option value="auditoria">Auditoría de cuentas</option>
            <option value="radicacion">Radicación de facturas</option>
            <option value="devoluciones">Devoluciones y glosas</option>
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Complejidad / Subproceso (Estándar)
          <select
            value={value.complexity}
            onChange={(e) => applyCategoryOrComplexity(value.category, e.target.value as ComplexityLevel)}
            className={inputCls}
          >
            {categoryBenchmarks.length > 0 ? (
              categoryBenchmarks.map((b) => (
                <option key={`${b.category}-${b.complexity}`} value={b.complexity}>
                  {b.complexity.toUpperCase()} — {b.label} ({b.recommended_avg_minutes} min)
                </option>
              ))
            ) : (
              <>
                <option value="baja">Baja (Ambulatorio / Digital)</option>
                <option value="media">Media (Cirugía Amb. / Estándar)</option>
                <option value="alta">Alta (Hospitalización / UCI)</option>
              </>
            )}
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Demanda mensual esperada (facturas)
          <input
            type="number"
            min={1}
            value={value.expected_monthly_demand}
            onChange={(e) => set("expected_monthly_demand", Math.max(1, Number(e.target.value)))}
            className={`${inputCls} tabular-nums`}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Tiempo promedio por factura (min)
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={value.avg_time_minutes}
            onChange={(e) => set("avg_time_minutes", Math.max(0.5, Number(e.target.value)))}
            className={`${inputCls} tabular-nums`}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Días laborales / mes
          <input
            type="number"
            min={1}
            max={31}
            value={value.working_days_per_month}
            onChange={(e) => set("working_days_per_month", Math.min(31, Math.max(1, Number(e.target.value))))}
            className={`${inputCls} tabular-nums`}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Jornada efectiva (horas/día)
          <input
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={value.effective_hours_per_day}
            onChange={(e) => set("effective_hours_per_day", Math.min(24, Math.max(0.5, Number(e.target.value))))}
            className={`${inputCls} tabular-nums`}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Ineficiencia esperada (%)
          <input
            type="number"
            min={0}
            max={90}
            step={1}
            value={Math.round(value.base_inefficiency_rate * 100)}
            onChange={(e) => set("base_inefficiency_rate", Math.min(0.9, Math.max(0, Number(e.target.value) / 100)))}
            className={`${inputCls} tabular-nums`}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Tasa de retrabajo / devolución (%)
          <input
            type="number"
            min={0}
            max={80}
            step={1}
            value={Math.round(value.rework_return_rate * 100)}
            onChange={(e) => set("rework_return_rate", Math.min(0.8, Math.max(0, Number(e.target.value) / 100)))}
            className={`${inputCls} tabular-nums`}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Ventana SLA cierre (días, opcional)
          <input
            type="number"
            min={1}
            max={31}
            placeholder="Sin límite"
            value={value.sla_deadline_days ?? ""}
            onChange={(e) => set("sla_deadline_days", e.target.value ? Number(e.target.value) : null)}
            className={`${inputCls} tabular-nums`}
          />
        </label>
      </div>
    </div>
  );
}
