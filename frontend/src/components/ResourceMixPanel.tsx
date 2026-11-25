import { Bot, UserCheck } from "lucide-react";
import type { ResourceProfile } from "../types/models";

interface Props {
  title: string;
  value: ResourceProfile;
  onChange: (next: ResourceProfile) => void;
  isBot?: boolean;
}

const inputCls =
  "mt-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm tabular-nums text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function ResourceMixPanel({ title, value, onChange, isBot = false }: Props) {
  const set = <K extends keyof ResourceProfile>(k: K, v: ResourceProfile[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            isBot ? "bg-violet-50 text-violet-600" : "bg-sky-50 text-sky-600"
          }`}
        >
          {isBot ? <Bot className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            {isBot ? "Capacidad automatizada y escalamiento de excepciones" : "Disponibilidad, eficiencia y costo mensual"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Horas efectivas / día
          <input
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={value.available_hours_per_day}
            onChange={(e) => set("available_hours_per_day", Math.min(24, Math.max(0.5, Number(e.target.value))))}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Días disponibles / mes
          <input
            type="number"
            min={1}
            max={31}
            value={value.available_days_per_month}
            onChange={(e) => set("available_days_per_month", Math.min(31, Math.max(1, Number(e.target.value))))}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Multiplicador velocidad
          <input
            type="number"
            min={0.2}
            max={10}
            step={0.1}
            value={value.speed_multiplier}
            onChange={(e) => set("speed_multiplier", Math.max(0.2, Number(e.target.value)))}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-slate-600">
          Ineficiencia (%)
          <input
            type="number"
            min={0}
            max={90}
            value={Math.round(value.inefficiency_rate * 100)}
            onChange={(e) => set("inefficiency_rate", Math.min(0.9, Math.max(0, Number(e.target.value) / 100)))}
            className={inputCls}
          />
        </label>

        {isBot ? (
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Escalamiento a humano (%)
            <input
              type="number"
              min={0}
              max={95}
              value={Math.round(value.exception_escalation_rate * 100)}
              onChange={(e) =>
                set("exception_escalation_rate", Math.min(0.95, Math.max(0, Number(e.target.value) / 100)))
              }
              className={inputCls}
            />
          </label>
        ) : (
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Dotación actual
            <input
              type="number"
              min={0}
              value={value.current_headcount}
              onChange={(e) => set("current_headcount", Math.max(0, Number(e.target.value)))}
              className={inputCls}
            />
          </label>
        )}

        <label className="flex flex-col text-xs font-medium text-slate-600">
          {isBot ? "Costo mensual por bot ($)" : "Costo mensual por funcionario ($)"}
          <input
            type="number"
            min={0}
            step={100000}
            value={value.monthly_cost}
            onChange={(e) => set("monthly_cost", Math.max(0, Number(e.target.value)))}
            className={inputCls}
          />
        </label>
      </div>
    </div>
  );
}
