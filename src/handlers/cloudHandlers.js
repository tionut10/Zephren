// ═══════════════════════════════════════════════════════════════════════════
// CLOUD HANDLERS — extrase din energy-calc.jsx (refactor S5.3, pct.80)
// Sync cloud (Supabase) + team management. Funcții pure (fără hooks) invocate
// din stub-uri lazy în energy-calc.jsx. NU SCHIMBA LOGICA.
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 1. SAVE TO CLOUD — persistă proiectul curent în Supabase (via cloud.saveProject)
// ═══════════════════════════════════════════════════════════════════════════
export async function saveToCloud(ctx) {
  const { cloud, getProjectData, buildingAddress, showToast } = ctx;
  if (!cloud?.isLoggedIn) { showToast("Autentifică-te pentru a salva în cloud.", "info"); return; }
  const data = getProjectData();
  const payload = { ...data, meta: { name: buildingAddress || "Proiect", date: new Date().toISOString().slice(0, 10) } };
  const result = await cloud.saveProject(payload);
  if (result.error) showToast("Eroare cloud: " + result.error, "error");
  else showToast("Salvat în cloud!", "success");
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LOAD FROM CLOUD — hydrează state-ul dintr-un proiect cloud
// ═══════════════════════════════════════════════════════════════════════════
export async function loadFromCloud(ctx) {
  const { cloud, projectId, loadProjectData, showToast } = ctx;
  if (!cloud?.isLoggedIn) return;
  const result = await cloud.loadProject(projectId);
  if (result.error) { showToast("Eroare: " + result.error, "error"); return; }
  if (result.data) { loadProjectData(result.data); showToast("Proiect încărcat din cloud.", "success"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LOAD TEAM DATA — hidratarea structurilor team_members, teams, invitations
// ═══════════════════════════════════════════════════════════════════════════
export async function loadTeamData(ctx) {
  const { cloud, setTeamLoading, setTeamData } = ctx;
  if (!cloud?.isLoggedIn) return;
  setTeamLoading(true);
  try {
    const sb = (await import("../lib/supabase.js")).supabase;
    const { data: memberships } = await sb.from("team_members").select("team_id, role").eq("user_id", cloud.user.id);
    if (memberships && memberships.length > 0) {
      const teamId = memberships[0].team_id;
      const { data: team } = await sb.from("teams").select("id, name, plan").eq("id", teamId).single();
      const { data: members } = await sb.from("team_members").select("user_id, role, joined_at").eq("team_id", teamId);
      const { data: invitations } = await sb.from("team_invitations").select("id, email, role, status, created_at").eq("team_id", teamId).eq("status", "pending");
      const memberProfiles = [];
      for (const m of (members || [])) {
        const { data: p } = await sb.from("profiles").select("name, email").eq("id", m.user_id).single();
        memberProfiles.push({ ...m, name: p?.name || p?.email || m.user_id, email: p?.email || "" });
      }
      setTeamData({ id: teamId, name: team?.name || "Echipa", plan: team?.plan || "business", myRole: memberships[0].role, members: memberProfiles, invitations: invitations || [] });
    } else {
      setTeamData(null);
    }
  } catch (e) { console.error("Team load error:", e); }
  setTeamLoading(false);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CREATE TEAM — fondatorul e owner implicit
// ═══════════════════════════════════════════════════════════════════════════
export async function createTeam(ctx) {
  const { cloud, teamName, reloadTeamData, showToast } = ctx;
  if (!cloud?.isLoggedIn) { showToast("Autentifică-te pentru a crea o echipă.", "info"); return; }
  try {
    const sb = (await import("../lib/supabase.js")).supabase;
    const { data: team, error } = await sb.from("teams").insert({ name: teamName, owner_id: cloud.user.id, plan: "business" }).select("id").single();
    if (error) { showToast("Eroare: " + error.message, "error"); return; }
    await sb.from("team_members").insert({ team_id: team.id, user_id: cloud.user.id, role: "owner", invited_by: cloud.user.id });
    showToast("Echipă creată: " + teamName, "success");
    await reloadTeamData();
  } catch (e) { showToast("Eroare creare echipă: " + e.message, "error"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. INVITE TEAM MEMBER — creează invitație în status "pending"
// ═══════════════════════════════════════════════════════════════════════════
export async function inviteTeamMember(ctx) {
  const { cloud, teamData, email, role, reloadTeamData, showToast } = ctx;
  if (!cloud?.isLoggedIn || !teamData) return;
  try {
    const sb = (await import("../lib/supabase.js")).supabase;
    const { error } = await sb.from("team_invitations").insert({ team_id: teamData.id, email, role: role || "member", invited_by: cloud.user.id });
    if (error) { showToast("Eroare: " + error.message, "error"); return; }
    showToast("Invitație trimisă la " + email, "success");
    await reloadTeamData();
  } catch (e) { showToast("Eroare invitație: " + e.message, "error"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. REMOVE TEAM MEMBER — șterge relația user↔team
// ═══════════════════════════════════════════════════════════════════════════
export async function removeTeamMember(ctx) {
  const { cloud, teamData, userId, reloadTeamData, showToast } = ctx;
  if (!cloud?.isLoggedIn || !teamData) return;
  try {
    const sb = (await import("../lib/supabase.js")).supabase;
    await sb.from("team_members").delete().eq("team_id", teamData.id).eq("user_id", userId);
    showToast("Membru eliminat.", "info");
    await reloadTeamData();
  } catch (e) { showToast("Eroare: " + e.message, "error"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LOAD CLOUD PROJECTS — listă proiecte cloud ale user-ului curent
// ═══════════════════════════════════════════════════════════════════════════
export async function loadCloudProjects(ctx) {
  const { cloud, setCloudProjects } = ctx;
  if (!cloud?.isLoggedIn) return;
  const projects = await cloud.listProjects();
  setCloudProjects(projects);
}
