import { useState } from "react";
import { Info } from "lucide-react";

interface Props {
  currentInefficiency: number;
  onApply: (rate: number) => void;
}

export function OitInefficiencyEstimator({ currentInefficiency, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [personal, setPersonal] = useState(5);
  const [basicFatigue, setBasicFatigue] = useState(4);
  const [mentalLoad, setMentalLoad] = useState(3);
  const [contingencies, setContingencies] = useState(3);

  const totalAllowance = personal + basicFatigue + mentalLoad + contingencies;
  // Según OIT, con suplemento S sobre tiempo básico, la fracción improductiva equivalente es S / (100 + S)
  const oitInefficiency = totalAllowance / (100 + totalAllowance);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-800">
            Estimador de Ineficiencia (Directrices OIT)
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            Actual: {(currentInefficiency * 100).toFixed(1)}%
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          {open ? "Ocultar estimador" : "Calcular según OIT"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
          <p className="text-[11px] leading-relaxed text-slate-600">
            La <strong>OIT</strong> (<em>Estudio del Trabajo</em>) estima la holgura operativa mediante{" "}
            <strong>suplementos de tiempo</strong> sobre la jornada: necesidades personales (5%), fatiga básica (4%),
            carga mental/visual en pantalla (2–7%) y contingencias del entorno (caídas de portales EPS/HIS). La
            ineficiencia equivalente resulta de <code>S / (1 + S)</code>.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="flex flex-col text-slate-600">
              Necesidades personales ({personal}%)
              <input
                type="range"
                min={3}
                max={7}
                step={1}
                value={personal}
                onChange={(e) => setPersonal(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col text-slate-600">
              Fatiga básica ({basicFatigue}%)
              <input
                type="range"
                min={2}
                max={6}
                step={1}
                value={basicFatigue}
                onChange={(e) => setBasicFatigue(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col text-slate-600">
              Carga visual / mental ({mentalLoad}%)
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={mentalLoad}
                onChange={(e) => setMentalLoad(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col text-slate-600">
              Contingencias HIS / EPS ({contingencies}%)
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={contingencies}
                onChange={(e) => setContingencies(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs">
            <span className="text-indigo-900">
              Suplemento total: <strong>{totalAllowance}%</strong> → Ineficiencia OIT:{" "}
              <strong>{(oitInefficiency * 100).toFixed(1)}%</strong>
            </span>
            <button
              type="button"
              onClick={() => onApply(Number(oitInefficiency.toFixed(3)))}
              className="rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white hover:bg-indigo-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
