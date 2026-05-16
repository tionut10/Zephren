import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import {
  COMMANDS,
  COMMAND_GROUPS,
  checkCommandAvailability,
  sortCommands,
  getRecentCommandIds,
  recordRecentCommand,
} from "../lib/commands-registry.js";

// ═══════════════════════════════════════════════════════════════
// COMMAND PALETTE — Ctrl+K (D3 Sprint Optimizări 16 mai 2026)
// ═══════════════════════════════════════════════════════════════
// UI bazat pe cmdk (Linear/Vercel/Raycast standard).
// Filtering fuzzy match built-in (matchSorter intern cmdk).
// Comenzi blocate de plan apar grayed-out cu badge upgrade.
// ═══════════════════════════════════════════════════════════════

export default function CommandPalette({ open, onOpenChange, context = {} }) {
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState([]);

  // Reload recent commands when palette opens
  useEffect(() => {
    if (open) {
      setRecentIds(getRecentCommandIds());
      setQuery("");
    }
  }, [open]);

  // Prepare commands cu availability check
  const preparedCommands = useMemo(() => {
    const ctxFull = { currentStep: 1, userPlan: "free", ...context };
    const sorted = sortCommands(COMMANDS, ctxFull, recentIds);
    return sorted.map(cmd => ({
      ...cmd,
      _availability: checkCommandAvailability(cmd, ctxFull),
    }));
  }, [context, recentIds]);

  // Group by COMMAND_GROUPS, preserving sort order (recent first)
  const groupedCommands = useMemo(() => {
    const groups = new Map();
    // Recent group (always first if any)
    const recent = preparedCommands.filter(c => recentIds.includes(c.id));
    if (recent.length > 0) {
      groups.set("🕘 Recent folosite", recent);
    }
    // Restul grupate după cmd.group
    preparedCommands.forEach(cmd => {
      if (recentIds.includes(cmd.id)) return; // deja în Recent
      const g = cmd.group || "Altele";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(cmd);
    });
    return Array.from(groups.entries());
  }, [preparedCommands, recentIds]);

  // Execute command + close palette + record recent
  function executeCommand(cmd) {
    if (!cmd._availability.available) return; // blocked → no-op
    try {
      recordRecentCommand(cmd.id);
      cmd.action({ currentStep: 1, userPlan: "free", ...context });
    } catch (err) {
      console.warn(`[CommandPalette] action failed for ${cmd.id}:`, err);
      context.showToast?.(`Eroare la executare: ${err.message || "necunoscută"}`);
    }
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[100] flex items-start justify-center pt-[10vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      <Command
        label="Command Palette"
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        shouldFilter={true}
      >
        {/* Input cu icon search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <span className="text-slate-500 text-lg">🔍</span>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Caută comenzi: export, pas 7, BACS, factură…"
            autoFocus
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
            Esc
          </kbd>
        </div>

        {/* Lista comenzi */}
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-sm text-slate-500">
            Nicio comandă găsită pentru „{query}"
          </Command.Empty>

          {groupedCommands.map(([groupName, items]) => (
            <Command.Group
              key={groupName}
              heading={groupName}
              className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 mb-1 px-2"
            >
              {items.map(cmd => {
                const blocked = !cmd._availability.available;
                const blockReason = cmd._availability.blocked;
                return (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.label} ${(cmd.keywords || []).join(" ")} ${cmd.id}`}
                    onSelect={() => executeCommand(cmd)}
                    disabled={blocked}
                    className={
                      blocked
                        ? "flex items-center gap-3 px-3 py-2 rounded-lg cursor-not-allowed opacity-50"
                        : "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-500/20 aria-selected:text-indigo-300 hover:bg-slate-800 text-slate-300 transition-colors"
                    }
                  >
                    <span className="text-lg flex-shrink-0">{cmd.icon || "•"}</span>
                    <span className="flex-1 text-sm">{cmd.label}</span>
                    {blocked && blockReason === "plan" && cmd.requires?.plan && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded">
                        Necesită {cmd.requires.plan.toUpperCase()}
                      </span>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>

        {/* Footer cu hint-uri tastatură */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-950/50 text-[10px] text-slate-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded mr-1 font-mono">↑↓</kbd>
            Navighează
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded mx-1 ml-3 font-mono">↵</kbd>
            Selectează
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded mx-1 ml-3 font-mono">Esc</kbd>
            Închide
          </span>
          <span className="text-slate-600">{COMMANDS.length} comenzi disponibile</span>
        </div>
      </Command>
    </div>
  );
}
