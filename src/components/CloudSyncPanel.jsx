/**
 * CloudSyncPanel — sincronizare proiecte în cloud Supabase
 * Autentificare (email/parolă sau Google), salvare/încărcare/ștergere proiecte.
 */
import { useState, useEffect, useCallback } from "react";
import { useZephrenCloud } from "../lib/useZephrenCloud.js";
import { cn } from "../components/ui.jsx";

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ro-RO", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function StatusDot({ status }) {
  const map = {
    connected: "bg-emerald-400",
    syncing:   "bg-amber-400 animate-pulse",
    offline:   "bg-slate-500",
  };
  const label = {
    connected: "Conectat",
    syncing:   "Se sincronizează…",
    offline:   "Offline",
  };
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className={cn("w-2 h-2 rounded-full inline-block", map[status] ?? "bg-slate-500")} />
      <span className="opacity-60">{label[status] ?? status}</span>
    </span>
  );
}

// ── Componentă principală ──────────────────────────────────────────────────────
export default function CloudSyncPanel({ building, instSummary, auditor, showToast }) {
  const {
    user, isLoggedIn, login, register, loginWithGoogle, logout,
    saveProject, loadProject, listProjects, deleteProject, cloudStatus,
  } = useZephrenCloud();

  const notify = useCallback((msg, type = "info") => {
    if (typeof showToast === "function") showToast(msg, type);
    else console.log(`[CloudSync ${type}]`, msg);
  }, [showToast]);

  // ── Auth state ────────────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState("");

  // ── Projects state ────────────────────────────────────────────────────────────
  const [projects, setProjects]     = useState([]);
  const [projLoading, setProjLoading] = useState(false);
  const [saving, setSaving]         = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!isLoggedIn) return;
    setProjLoading(true);
    try {
      const list = await listProjects();
      setProjects(Array.isArray(list) ? list : []);
    } catch { setProjects([]); }
    finally { setProjLoading(false); }
  }, [isLoggedIn, listProjects]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ── Auth handlers ─────────────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = authMode === "login"
        ? await login(email, password)
        : await register(email, password, name);
      if (result?.error) {
        setAuthError(result.error);
      } else {
        notify(authMode === "login" ? "Autentificat cu succes" : "Cont creat cu succes", "success");
        setEmail(""); setPassword(""); setName("");
      }
    } catch (err) {
      setAuthError(err?.message ?? "Eroare necunoscută");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      await loginWithGoogle();
    } catch (err) {
      setAuthError(err?.message ?? "Eroare autentificare Google");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setProjects([]);
    notify("Deconectat", "info");
  };

  // ── Save handler ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const projectName = [building?.address, building?.city].filter(Boolean).join(", ")
        || `Proiect ${new Date().toLocaleDateString("ro-RO")}`;
      const projectData = {
        name: projectName,
        building: building ?? {},
        instSummary: instSummary ?? {},
        auditor: auditor ?? {},
        savedAt: new Date().toISOString(),
      };
      const result = await saveProject(projectData);
      if (result?.error) {
        notify(`Eroare la salvare: ${result.error}`, "error");
      } else {
        notify("Proiect salvat în cloud", "success");
        await fetchProjects();
      }
    } catch (err) {
      notify(`Eroare: ${err?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Load handler (informativ) ─────────────────────────────────────────────────
  const handleLoad = async (projectId) => {
    const result = await loadProject(projectId);
    if (result?.error) {
      notify(`Eroare la încărcare: ${result.error}`, "error");
    } else {
      notify("Proiect încărcat", "success");
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────────
  const handleDelete = async (projectId, e) => {
    e.stopPropagation();
    const result = await deleteProject(projectId);
    if (result?.error) {
      notify(`Eroare la ștergere: ${result.error}`, "error");
    } else {
      notify("Proiect șters", "info");
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Banner status ── */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">Cloud Sync</span>
        <StatusDot status={cloudStatus} />
      </div>

      {/* ── Notă offline ── */}
      {cloudStatus === "offline" && (
        <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 px-4 py-3 text-[11px] opacity-60">
          Supabase neconfigurat — funcționează în modul local
        </div>
      )}

      {/* ── Secțiune autentificare ── */}
      {!isLoggedIn ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
          <div className="text-xs font-semibold opacity-70 uppercase tracking-wider">
            {authMode === "login" ? "Autentificare" : "Cont nou"}
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Nume complet"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:opacity-30"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:opacity-30"
            />
            <input
              type="password"
              placeholder="Parolă"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:opacity-30"
            />

            {authError && (
              <div className="text-[11px] text-red-400 opacity-80">{authError}</div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-sm font-medium transition-all disabled:opacity-40"
            >
              {authLoading ? "…" : authMode === "login" ? "Intră în cont" : "Creează cont"}
            </button>
          </form>

          {/* Google login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuă cu Google
          </button>

          {/* Toggle login/register */}
          <div className="text-center text-[11px] opacity-50">
            {authMode === "login" ? (
              <>Nu ai cont?{" "}
                <button type="button" onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className="text-amber-400 hover:underline">
                  Creează unul
                </button>
              </>
            ) : (
              <>Ai deja cont?{" "}
                <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className="text-amber-400 hover:underline">
                  Autentifică-te
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Utilizator autentificat ── */
        <>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
              <div className="text-[11px] opacity-40 truncate">{user?.email}</div>
              {user?.plan && (
                <div className="mt-1">
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                    user.plan === "pro"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                      : "bg-white/10 text-white/50"
                  )}>
                    {user.plan}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-all"
            >
              Deconectare
            </button>
          </div>

          {/* ── Secțiune sincronizare ── */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold opacity-70 uppercase tracking-wider">Proiecte cloud</div>
              <button
                onClick={handleSave}
                disabled={saving || cloudStatus === "offline"}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-all disabled:opacity-40"
              >
                {saving ? "Se salvează…" : "Salvează proiect curent"}
              </button>
            </div>

            {/* Lista proiecte */}
            {projLoading ? (
              <div className="text-[11px] opacity-40 text-center py-4">Se încarcă proiectele…</div>
            ) : projects.length === 0 ? (
              <div className="text-[11px] opacity-30 text-center py-4">Niciun proiect salvat</div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                {projects.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => handleLoad(proj.id)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] px-3 py-2 cursor-pointer transition-all group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate group-hover:text-amber-300 transition-colors">
                        {proj.name || `Proiect ${proj.id?.slice(0, 6)}`}
                      </div>
                      <div className="text-[10px] opacity-35 mt-0.5">{formatDate(proj.updated_at)}</div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(proj.id, e)}
                      className="shrink-0 w-6 h-6 rounded-md bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-[11px] opacity-40 hover:opacity-100 transition-all"
                      title="Șterge proiect"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
