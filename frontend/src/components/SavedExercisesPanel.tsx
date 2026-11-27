import { useEffect, useState } from "react";
import { Cloud, CloudOff, Database, Download, FolderOpen, Save, Trash2, Upload } from "lucide-react";
import {
  deleteExercise,
  downloadSnapshotJson,
  getSupabaseConfig,
  isSupabaseConfigured,
  listExercises,
  parseSnapshotJsonFile,
  saveExercise,
  saveSupabaseConfig,
} from "../services/exerciseStorage";
import type { ExerciseSnapshot, SavedExerciseRecord } from "../types/models";

interface Props {
  currentSnapshot: ExerciseSnapshot;
  onLoadSnapshot: (snap: ExerciseSnapshot) => void;
}

export function SavedExercisesPanel({ currentSnapshot, onLoadSnapshot }: Props) {
  const [exercises, setExercises] = useState<SavedExerciseRecord[]>([]);
  const [name, setName] = useState(currentSnapshot.processCfg.name);
  const [notes, setNotes] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showCfg, setShowCfg] = useState(false);
  const initialCfg = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(initialCfg.url);
  const [sbKey, setSbKey] = useState(initialCfg.anonKey);
  const [sbConnected, setSbConnected] = useState(isSupabaseConfigured());

  const refreshList = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const items = await listExercises();
      setExercises(items);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error cargando ejercicios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, [sbConnected]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const snap: ExerciseSnapshot = {
        ...currentSnapshot,
        name: name.trim(),
        notes: notes.trim(),
        savedAt: new Date().toISOString(),
      };
      const saved = await saveExercise(snap);
      setStatusMsg(
        saved.source === "supabase"
          ? "Ejercicio guardado en la nube (Supabase)."
          : "Guardado localmente (configura Supabase para sincronizar en la nube)."
      );
      setNotes("");
      await refreshList();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo guardar el ejercicio.");
    }
  };

  const handleDelete = async (item: SavedExerciseRecord) => {
    try {
      await deleteExercise(item.id, item.source);
      await refreshList();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al eliminar.");
    }
  };

  const handleSaveSupabase = () => {
    saveSupabaseConfig({ url: sbUrl, anonKey: sbKey });
    setSbConnected(isSupabaseConfigured());
    setShowCfg(false);
    setStatusMsg("Configuración de Supabase actualizada.");
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snap = await parseSnapshotJsonFile(file);
      onLoadSnapshot(snap);
      setStatusMsg(`Modelo "${snap.name}" restaurado desde archivo JSON.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "JSON inválido.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Repositorio de Ejercicios (Supabase + JSON)
              </h2>
              <p className="text-xs text-slate-500">
                Guarda tus escenarios en la nube para recuperarlos en cualquier sesión o expórtalos en JSON
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                sbConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
              }`}
            >
              {sbConnected ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              {sbConnected ? "Supabase Conectado" : "Modo Local (sin Supabase)"}
            </span>
            <button
              type="button"
              onClick={() => setShowCfg((v) => !v)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Configurar Supabase
            </button>
          </div>
        </div>

        {showCfg && (
          <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <p className="mb-3 text-xs text-slate-600">
              Ingresa la URL y la <code>anon key</code> de tu proyecto Supabase (tabla <code>saved_exercises</code>{" "}
              creada con <code>supabase_schema.sql</code>).
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="https://tu-proyecto.supabase.co"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
              <input
                type="password"
                placeholder="SUPABASE_ANON_KEY"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSupabase}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Guardar Conexión
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input
            type="text"
            placeholder="Nombre del ejercicio (ej. Radicación SOAT Q4)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm md:col-span-4"
          />
          <input
            type="text"
            placeholder="Notas o contexto (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm md:col-span-4"
          />
          <div className="flex flex-wrap gap-2 md:col-span-4 md:justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </button>
            <button
              type="button"
              onClick={() => downloadSnapshotJson({ ...currentSnapshot, name: name || currentSnapshot.processCfg.name })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> JSON
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" /> Cargar JSON
              <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            </label>
          </div>
        </div>

        {statusMsg && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
            {errorMsg}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Ejercicios Guardados ({exercises.length})
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Cargando ejercicios...</p>
        ) : exercises.length === 0 ? (
          <p className="text-xs text-slate-500">Aún no hay ejercicios guardados.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {exercises.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                      {item.category} · {item.complexity}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      {item.source === "supabase" ? "Nube" : "Local"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString()} {item.notes ? `· ${item.notes}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onLoadSnapshot(item.model_payload);
                      setStatusMsg(`Ejercicio "${item.name}" cargado en el simulador.`);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <FolderOpen className="h-3.5 w-3.5" /> Recuperar
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSnapshotJson(item.model_payload)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    title="Descargar JSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
