import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  saveToCloud,
  loadFromCloud,
  loadTeamData,
  createTeam,
  inviteTeamMember,
  removeTeamMember,
  loadCloudProjects,
} from "../cloudHandlers.js";

// ═══════════════════════════════════════════════════════════════════════════
// Helper: minimal mock pentru Supabase client (folosit în loadTeamData, createTeam etc.)
// Folosim vi.mock pentru a intercepta dynamic import la "../lib/supabase.js"
// ═══════════════════════════════════════════════════════════════════════════
vi.mock("../../lib/supabase.js", () => {
  const fromChain = (returnData) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: returnData, error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: "new-team-1" }, error: null })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  });
  return {
    supabase: {
      from: vi.fn((table) => fromChain(null)),
    },
  };
});

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ═══════════════════════════════════════════════════════════════════════════
// saveToCloud — apelează cloud.saveProject cu payload
// ═══════════════════════════════════════════════════════════════════════════
describe("saveToCloud", () => {
  it("refuză dacă user nu e logat", async () => {
    const ctx = {
      cloud: { isLoggedIn: false },
      getProjectData: vi.fn(() => ({ building: {} })),
      buildingAddress: "Test", showToast: vi.fn(),
    };
    await saveToCloud(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Autentifică-te"), "info");
    expect(ctx.getProjectData).not.toHaveBeenCalled();
  });

  it("trimite payload cu meta (name + date) către cloud.saveProject", async () => {
    const saveSpy = vi.fn(() => Promise.resolve({ error: null }));
    const ctx = {
      cloud: { isLoggedIn: true, saveProject: saveSpy },
      getProjectData: vi.fn(() => ({ building: { foo: 1 } })),
      buildingAddress: "Strada Test",
      showToast: vi.fn(),
    };
    await saveToCloud(ctx);
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      building: { foo: 1 },
      meta: expect.objectContaining({
        name: "Strada Test",
        date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      }),
    }));
    expect(ctx.showToast).toHaveBeenCalledWith("Salvat în cloud!", "success");
  });

  it("raportează eroare când cloud returnează error", async () => {
    const saveSpy = vi.fn(() => Promise.resolve({ error: "db offline" }));
    const ctx = {
      cloud: { isLoggedIn: true, saveProject: saveSpy },
      getProjectData: vi.fn(() => ({})),
      buildingAddress: "x", showToast: vi.fn(),
    };
    await saveToCloud(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith("Eroare cloud: db offline", "error");
  });

  it("fallback nume='Proiect' când buildingAddress e gol", async () => {
    const saveSpy = vi.fn(() => Promise.resolve({ error: null }));
    const ctx = {
      cloud: { isLoggedIn: true, saveProject: saveSpy },
      getProjectData: vi.fn(() => ({})),
      buildingAddress: "",
      showToast: vi.fn(),
    };
    await saveToCloud(ctx);
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      meta: expect.objectContaining({ name: "Proiect" }),
    }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadFromCloud — hidrează state prin loadProjectData
// ═══════════════════════════════════════════════════════════════════════════
describe("loadFromCloud", () => {
  it("early-exit când user nu e logat", async () => {
    const ctx = {
      cloud: { isLoggedIn: false, loadProject: vi.fn() },
      projectId: "p1",
      loadProjectData: vi.fn(), showToast: vi.fn(),
    };
    await loadFromCloud(ctx);
    expect(ctx.cloud.loadProject).not.toHaveBeenCalled();
    expect(ctx.loadProjectData).not.toHaveBeenCalled();
  });

  it("apelează loadProjectData cu data când cloud returnează success", async () => {
    const sampleData = { building: { address: "Test" } };
    const ctx = {
      cloud: { isLoggedIn: true, loadProject: vi.fn(() => Promise.resolve({ data: sampleData, error: null })) },
      projectId: "p1",
      loadProjectData: vi.fn(), showToast: vi.fn(),
    };
    await loadFromCloud(ctx);
    expect(ctx.loadProjectData).toHaveBeenCalledWith(sampleData);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("cloud"), "success");
  });

  it("raportează eroare pe răspuns cu error", async () => {
    const ctx = {
      cloud: { isLoggedIn: true, loadProject: vi.fn(() => Promise.resolve({ error: "not found" })) },
      projectId: "missing",
      loadProjectData: vi.fn(), showToast: vi.fn(),
    };
    await loadFromCloud(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith("Eroare: not found", "error");
    expect(ctx.loadProjectData).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadTeamData — hidrare detalii echipă
// ═══════════════════════════════════════════════════════════════════════════
describe("loadTeamData", () => {
  it("early-exit când user nu e logat", async () => {
    const ctx = {
      cloud: { isLoggedIn: false },
      setTeamLoading: vi.fn(), setTeamData: vi.fn(),
    };
    await loadTeamData(ctx);
    expect(ctx.setTeamLoading).not.toHaveBeenCalled();
    expect(ctx.setTeamData).not.toHaveBeenCalled();
  });

  it("gestionează exception fără crash (catch intern)", async () => {
    // Nu avem membership → setTeamData(null), setTeamLoading false
    const ctx = {
      cloud: { isLoggedIn: true, user: { id: "u1" } },
      setTeamLoading: vi.fn(), setTeamData: vi.fn(),
    };
    await loadTeamData(ctx);
    expect(ctx.setTeamLoading).toHaveBeenCalledWith(true);
    expect(ctx.setTeamLoading).toHaveBeenLastCalledWith(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createTeam — insert în teams + team_members
// ═══════════════════════════════════════════════════════════════════════════
describe("createTeam", () => {
  it("refuză dacă user nu e logat", async () => {
    const ctx = {
      cloud: { isLoggedIn: false },
      teamName: "Alpha",
      reloadTeamData: vi.fn(), showToast: vi.fn(),
    };
    await createTeam(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Autentifică-te"), "info");
    expect(ctx.reloadTeamData).not.toHaveBeenCalled();
  });

  it("invocă reloadTeamData după insert reușit", async () => {
    const ctx = {
      cloud: { isLoggedIn: true, user: { id: "u1" } },
      teamName: "Zephren Audit",
      reloadTeamData: vi.fn(() => Promise.resolve()),
      showToast: vi.fn(),
    };
    await createTeam(ctx);
    expect(ctx.reloadTeamData).toHaveBeenCalled();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("creată"), "success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// inviteTeamMember — insert team_invitations status pending
// ═══════════════════════════════════════════════════════════════════════════
describe("inviteTeamMember", () => {
  it("early-exit fără teamData", async () => {
    const ctx = {
      cloud: { isLoggedIn: true, user: { id: "u1" } },
      teamData: null,
      email: "test@ex.com", role: "member",
      reloadTeamData: vi.fn(), showToast: vi.fn(),
    };
    await inviteTeamMember(ctx);
    expect(ctx.showToast).not.toHaveBeenCalled();
    expect(ctx.reloadTeamData).not.toHaveBeenCalled();
  });

  it("trimite invitație și reîncarcă team data", async () => {
    const ctx = {
      cloud: { isLoggedIn: true, user: { id: "u1" } },
      teamData: { id: "t1" },
      email: "new@ex.com", role: "member",
      reloadTeamData: vi.fn(() => Promise.resolve()),
      showToast: vi.fn(),
    };
    await inviteTeamMember(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("new@ex.com"), "success");
    expect(ctx.reloadTeamData).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// removeTeamMember — delete din team_members
// ═══════════════════════════════════════════════════════════════════════════
describe("removeTeamMember", () => {
  it("șterge membru și reîncarcă data", async () => {
    const ctx = {
      cloud: { isLoggedIn: true, user: { id: "u1" } },
      teamData: { id: "t1" },
      userId: "u2",
      reloadTeamData: vi.fn(() => Promise.resolve()),
      showToast: vi.fn(),
    };
    await removeTeamMember(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith("Membru eliminat.", "info");
    expect(ctx.reloadTeamData).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadCloudProjects — listează proiectele user-ului
// ═══════════════════════════════════════════════════════════════════════════
describe("loadCloudProjects", () => {
  it("early-exit când nu e logat", async () => {
    const ctx = {
      cloud: { isLoggedIn: false, listProjects: vi.fn() },
      setCloudProjects: vi.fn(),
    };
    await loadCloudProjects(ctx);
    expect(ctx.cloud.listProjects).not.toHaveBeenCalled();
    expect(ctx.setCloudProjects).not.toHaveBeenCalled();
  });

  it("setează lista de proiecte din cloud.listProjects()", async () => {
    const projects = [{ id: "p1" }, { id: "p2" }];
    const ctx = {
      cloud: { isLoggedIn: true, listProjects: vi.fn(() => Promise.resolve(projects)) },
      setCloudProjects: vi.fn(),
    };
    await loadCloudProjects(ctx);
    expect(ctx.setCloudProjects).toHaveBeenCalledWith(projects);
  });
});
