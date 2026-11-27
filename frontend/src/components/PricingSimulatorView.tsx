import { useEffect, useState } from "react";
import { Award, DollarSign, Layers } from "lucide-react";
import { simulatePricing } from "../api/client";
import type { PricingSimulationResult, ProcessConfig, ResourceProfile } from "../types/models";

interface Props {
  processCfg: ProcessConfig;
  humanProfile: ResourceProfile;
  botProfile: ResourceProfile;
  onResultChange?: (res: PricingSimulationResult | null) => void;
}

export function PricingSimulatorView({ processCfg, humanProfile, botProfile, onResultChange }: Props) {
  const [targetMargin, setTargetMargin] = useState(0.3);
  const [avgInvoiceValue, setAvgInvoiceValue] = useState(350_000);
  const [successFeePct, setSuccessFeePct] = useState(0.025);
  const [result, setResult] = useState<PricingSimulationResult | null>(null);

  useEffect(() => {
    let active = true;
    simulatePricing(processCfg, humanProfile, botProfile, targetMargin, avgInvoiceValue, successFeePct)
      .then((res) => {
        if (active) {
          setResult(res);
          onResultChange?.(res);
        }
      })
      .catch(() => {
        if (active) setResult(null);
      });
    return () => {
      active = false;
    };
  }, [processCfg, humanProfile, botProfile, targetMargin, avgInvoiceValue, successFeePct]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Simulador de Rangos por Volumen, Costos y Monetización
            </h2>
            <p className="text-xs text-slate-500">
              Evalúa saltos de dotación por volumen de facturas, estructura de costos y rentabilidad por modelo comercial
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Margen bruto objetivo (%)
            <input
              type="number"
              min={5}
              max={80}
              value={Math.round(targetMargin * 100)}
              onChange={(e) => setTargetMargin(Math.min(0.8, Math.max(0.05, Number(e.target.value) / 100)))}
              className="mt-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm tabular-nums"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Valor promedio por factura ($)
            <input
              type="number"
              min={10000}
              step={50000}
              value={avgInvoiceValue}
              onChange={(e) => setAvgInvoiceValue(Math.max(10000, Number(e.target.value)))}
              className="mt-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm tabular-nums"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Comisión % sobre recaudo / facturación
            <input
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              value={Number((successFeePct * 100).toFixed(1))}
              onChange={(e) => setSuccessFeePct(Math.min(0.25, Math.max(0.002, Number(e.target.value) / 100)))}
              className="mt-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm tabular-nums"
            />
          </label>
        </div>
      </div>

      {result && (
        <>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Escalado por Rangos de Facturas ({result.process_name} · {result.complexity})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Rango (Fact/Mes)</th>
                    <th className="px-3 py-2.5 font-semibold">Solo Humanos</th>
                    <th className="px-3 py-2.5 font-semibold">Mix Óptimo</th>
                    <th className="px-3 py-2.5 font-semibold">Salto de Capacidad</th>
                    <th className="px-3 py-2.5 font-semibold">Costo Operativo</th>
                    <th className="px-3 py-2.5 font-semibold">Costo / Fact.</th>
                    <th className="px-3 py-2.5 font-semibold">Precio Sug. / Fact.</th>
                    <th className="px-3 py-2.5 font-semibold">Precio Paquete / Mes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.tiers.map((t) => (
                    <tr key={t.tier_label} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-900">{t.tier_label}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600">{t.solo_humans_needed} H</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-indigo-700">
                        {t.optimal_humans}H + {t.optimal_bots}B
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{t.resource_jump_note}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-800">
                        ${t.monthly_operational_cost.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">
                        ${Math.round(t.unit_cost_per_invoice).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-emerald-700">
                        ${Math.round(t.recommended_unit_price).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 font-bold tabular-nums text-slate-900">
                        ${Math.round(t.recommended_monthly_price).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Comparativa de Modelos de Monetización
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Award className="h-3.5 w-3.5" /> Recomendado: {result.recommended_monetization}
              </span>
            </div>
            <p className="mb-5 text-xs text-slate-600">{result.executive_summary}</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {result.monetization_options.map((opt) => (
                <div
                  key={opt.model_id}
                  className={`rounded-xl border p-4 ${
                    opt.is_recommended
                      ? "border-emerald-300 bg-emerald-50/40 shadow-sm"
                      : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{opt.model_name}</h4>
                    {opt.is_recommended && (
                      <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        Óptimo
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-white p-2.5">
                      <div className="text-[11px] text-slate-500">Ingreso / Mes</div>
                      <div className="font-bold tabular-nums text-slate-900">
                        ${Math.round(opt.estimated_monthly_revenue).toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white p-2.5">
                      <div className="text-[11px] text-slate-500">Margen Bruto</div>
                      <div className="font-bold tabular-nums text-emerald-700">
                        {(opt.gross_margin_pct * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-lg bg-white p-2.5">
                      <div className="text-[11px] text-slate-500">Aceptación</div>
                      <div className="font-bold tabular-nums text-indigo-700">
                        {opt.market_acceptance_score}/100
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                    <p>
                      <strong className="text-emerald-700">Ventaja:</strong> {opt.pros}
                    </p>
                    <p>
                      <strong className="text-amber-700">Riesgo:</strong> {opt.cons}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
