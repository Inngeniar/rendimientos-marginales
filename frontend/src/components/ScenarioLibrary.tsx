import { useState } from "react";
import { BookmarkPlus, Download, FolderOpen, RotateCcw, Trash2, Upload } from "lucide-react";
import type { ProcessConfig, ResourceProfile } from "../types/models";
import type { EditablePipelineStage } from "./PipelineView";

export interface SavedExercise {
  id: string;
  name: string;
  savedAt: string;
  processCfg: ProcessConfig;
  humanProfile: ResourceProfile;
  botProfile: ResourceProfile;
  congestionAlpha: number;
  pipelineStages: EditablePipelineStage[];
  tecnicoMonthlyCost?: number;
}

export const AUTOSAVE_KEY = "msm_rm_autosave_v1";
export const SCENARIOS_KEY = "msm_rm_scenarios_v1";

export function loadAutosave(): Partial<Omit<SavedExercise, "id" | "name" | "savedAt">> | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAutosave(data: Omit<SavedExercise, "id" | "name" | "savedAt">) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar si el navegador bloquea localStorage
  }
}

function loadSavedList(): SavedExercise[] {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface Props {
  currentState: Omit<SavedExercise, "id" | "name" | "savedAt">;
  onLoadExercise: (ex: Omit<SavedExercise, "id" | "name" | "savedAt">) => void;
  onResetDefaults: () => void;
}

export function ScenarioLibrary({ currentState, onLoadExercise, onResetDefaults }: Props) {
  const [exercises, setExercises] = useState<SavedExercise[]>(() => loadSavedList());
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const persistList = (list: SavedExercise[]) => {
    setExercises(list);
    try {
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(list));
    } catch {
      // Ignorar errores de cuota
    }
  };

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSave = () => {
    const trimmed = name.trim() || `${currentState.processCfg.name} (${new Date().toLocaleDateString()})`;
    const entry: SavedExercise = {
      id: `${Date.now()}`,
      name: trimmed,
      savedAt: new Date().toLocaleString(),
      ...currentState,
    };
    persistList([entry, ...exercises]);
    setName("");
    notify(`Ejercicio "${trimmed}" guardado en este navegador.`);
  };

  const handleDelete = (id: string) => {
    persistList(exercises.filter((e) => e.id !== id));
  };

  const handleExportJson = () => {
    const payload: SavedExercise = {
      id: `${Date.now()}`,
      name: name.trim() || currentState.processCfg.name || "ejercicio_rendimientos",
      savedAt: new Date().toISOString(),
      ...currentState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.name.toLowerCase().replace(/[^a-z0-9]+/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Archivo .json descargado.");
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.processCfg || !data.humanProfile || !data.botProfile) {
        notify("El archivo .json no corresponde a un ejercicio válido.");
        return;
      }
      onLoadExercise({
        processCfg: data.processCfg,
        humanProfile: data.humanProfile,
        botProfile: data.botProfile,
        congestionAlpha: typeof data.congestionAlpha === "number" ? data.congestionAlpha : 0.03,
        pipelineStages: Array.isArray(data.pipelineStages) ? data.pipelineStages : currentState.pipelineStages,
        tecnicoMonthlyCost: typeof data.tecnicoMonthlyCost === "number" ? data.tecnicoMonthlyCost : currentState.tecnicoMonthlyCost,
      });
      notify(`Ejercicio "${data.name || file.name}" cargado.`);
    } catch {
      notify("No se pudo leer el archivo .json.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FolderOpen className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-800">Mis Ejercicios</span>
          <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 sm:inline-block">
            Auto-guardado activo
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del ejercicio..."
            className="w-44 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none sm:w-52"
          />
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Guardar
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            title="Descargar ejercicio completo en .json para compartir"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" />
            .JSON
          </button>
          <label
            title="Cargar un ejercicio desde archivo .json"
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <Upload className="h-3.5 w-3.5" />
            Cargar .JSON
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportJson} />
          </label>
          <button
            type="button"
            onClick={() => {
              onResetDefaults();
              notify("Valores restablecidos por defecto.");
            }}
            title="Restablecer valores por defecto"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800">
          {feedback}
        </div>
      )}

      {exercises.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
          <span className="text-[11px] font-medium text-slate-500">Guardados:</span>
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  onLoadExercise({
                    processCfg: ex.processCfg,
                    humanProfile: ex.humanProfile,
                    botProfile: ex.botProfile,
                    congestionAlpha: ex.congestionAlpha,
                    pipelineStages: ex.pipelineStages,
                    tecnicoMonthlyCost: ex.tecnicoMonthlyCost,
                  });
                  notify(`Ejercicio "${ex.name}" cargado.`);
                }}
                className="font-medium text-slate-800 hover:text-indigo-700"
                title={`Guardado: ${ex.savedAt}`}
              >
                {ex.name}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(ex.id)}
                className="text-slate-400 hover:text-rose-600"
                title="Eliminar ejercicio"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
