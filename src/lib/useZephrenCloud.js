/**
 * useZephrenCloud.js
 *
 * React hook that integrates Supabase auth and cloud features into the
 * Zephren energy calculator.  Designed to degrade gracefully:
 *
 *  - If @supabase/supabase-js is not installed the hook still works but
 *    every cloud operation returns an "offline" error.
 *  - If the required env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 *    are missing the hook stays in offline mode.
 *
 * Import into your component:
 *   import { useZephrenCloud } from "@/lib/useZephrenCloud";
 *   const cloud = useZephrenCloud();
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { PLAN_FEATURES, canAccess } from "./planGating";

// ---------------------------------------------------------------------------
// Supabase client singleton (lazy, async)
// ---------------------------------------------------------------------------

let _supabasePromise = null;

/**
 * Dynamically import and initialise the Supabase client.
 * Returns null when the library or env vars are missing.
 */
function getSupabase() {
  if (_supabasePromise) return _supabasePromise;

  _supabasePromise = (async () => {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        console.warn(
          "[ZephrenCloud] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Running in offline mode."
        );
        return null;
      }

      const { createClient } = await import("@supabase/supabase-js");
      return createClient(url, key);
    } catch (err) {
      console.warn(
        "[ZephrenCloud] @supabase/supabase-js not available. Running in offline mode.",
        err.message
      );
      return null;
    }
  })();

  return _supabasePromise;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useZephrenCloud() {
  // ---- state ---------------------------------------------------------------
  const [user, setUser] = useState(null); // { id, email, name, plan }
  const [cloudStatus, setCloudStatus] = useState("offline"); // "connected" | "offline" | "syncing"
  const supabaseRef = useRef(null);

  // ---- derived -------------------------------------------------------------
  const isLoggedIn = !!user;
  const plan = user?.plan || "free";

  const canExportDOCX = canAccess(plan, "exportDOCX");
  const canExportXML = canAccess(plan, "exportXML");
  const canUseAI = canAccess(plan, "aiAssistant");
  const maxProjects = PLAN_FEATURES[plan]?.maxProjects ?? 2;

  // ---- initialise supabase & listen to auth --------------------------------
  useEffect(() => {
    let authSubscription = null;

    (async () => {
      const supabase = await getSupabase();
      supabaseRef.current = supabase;

      if (!supabase) {
        setCloudStatus("offline");
        return;
      }

      setCloudStatus("connected");

      // Fetch initial session
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await hydrateUser(supabase, session.user);
        }
      } catch (err) {
        console.error("[ZephrenCloud] Failed to get session:", err.message);
      }

      // Listen for future auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await hydrateUser(supabase, session.user);
        } else {
          setUser(null);
        }
      });

      authSubscription = subscription;
    })();

    return () => {
      authSubscription?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- helpers -------------------------------------------------------------

  /**
   * Populate local user state from a Supabase auth user object.
   * Looks up the `profiles` table for name and plan.
   */
  async function hydrateUser(supabase, authUser) {
    let name = authUser.user_metadata?.full_name || authUser.email;
    let userPlan = "free";

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, plan")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        name = profile.name || name;
        userPlan = profile.plan || "free";
      }
    } catch {
      // profiles table may not exist yet -- treat as free
    }

    setUser({
      id: authUser.id,
      email: authUser.email,
      name,
      plan: userPlan,
    });
  }

  /**
   * Return the live Supabase client or throw a user-friendly error.
   */
  function requireSupabase() {
    const sb = supabaseRef.current;
    if (!sb) {
      throw new Error(
        "Cloud features are unavailable. Supabase is not configured."
      );
    }
    return sb;
  }

  // ---- auth actions --------------------------------------------------------

  const login = useCallback(async (email, password) => {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (err) {
      console.error("[ZephrenCloud] Google login failed:", err.message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const supabase = requireSupabase();
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("[ZephrenCloud] Logout failed:", err.message);
    }
  }, []);

  // ---- cloud projects ------------------------------------------------------

  const saveProject = useCallback(
    async (projectData) => {
      try {
        const supabase = requireSupabase();
        if (!user) return { id: null, error: "You must be logged in to save projects." };

        setCloudStatus("syncing");

        // Upsert: if projectData.id exists, update; otherwise insert.
        const row = {
          user_id: user.id,
          name: projectData.name || "Untitled Project",
          data: projectData,
          updated_at: new Date().toISOString(),
        };

        let result;
        if (projectData.id) {
          result = await supabase
            .from("projects")
            .update(row)
            .eq("id", projectData.id)
            .eq("user_id", user.id)
            .select("id")
            .single();
        } else {
          result = await supabase
            .from("projects")
            .insert(row)
            .select("id")
            .single();
        }

        setCloudStatus("connected");

        if (result.error) return { id: null, error: result.error.message };
        return { id: result.data.id, error: null };
      } catch (err) {
        setCloudStatus("connected");
        return { id: null, error: err.message };
      }
    },
    [user]
  );

  const loadProject = useCallback(
    async (projectId) => {
      try {
        const supabase = requireSupabase();
        if (!user) return { data: null, error: "You must be logged in to load projects." };

        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .eq("user_id", user.id)
          .single();

        if (error) return { data: null, error: error.message };
        return { data: data.data, error: null };
      } catch (err) {
        return { data: null, error: err.message };
      }
    },
    [user]
  );

  const listProjects = useCallback(async () => {
    try {
      const supabase = requireSupabase();
      if (!user) return [];

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("[ZephrenCloud] listProjects error:", error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error("[ZephrenCloud] listProjects error:", err.message);
      return [];
    }
  }, [user]);

  const deleteProject = useCallback(
    async (projectId) => {
      try {
        const supabase = requireSupabase();
        if (!user) return { success: false, error: "You must be logged in to delete projects." };

        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("id", projectId)
          .eq("user_id", user.id);

        if (error) return { success: false, error: error.message };
        return { success: true, error: null };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [user]
  );

  // ---- AI assistant --------------------------------------------------------

  const askAI = useCallback(
    async (question, context = {}) => {
      try {
        if (!canAccess(user?.plan, "aiAssistant")) {
          return {
            answer: null,
            error: "AI Assistant is available on the Business plan.",
          };
        }

        const supabase = requireSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch("/api/ai-assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ question, context }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return {
            answer: null,
            error: body.error || `AI request failed (${res.status})`,
          };
        }

        const body = await res.json();
        return { answer: body.answer, error: null };
      } catch (err) {
        return { answer: null, error: err.message };
      }
    },
    [user]
  );

  // ---- public API ----------------------------------------------------------

  return {
    // Auth
    user,
    isLoggedIn,
    login,
    register,
    loginWithGoogle,
    logout,

    // Cloud projects
    saveProject,
    loadProject,
    listProjects,
    deleteProject,

    // Plan features
    canExportDOCX,
    canExportXML,
    canUseAI,
    maxProjects,

    // AI Assistant
    askAI,

    // Status
    cloudStatus,
  };
}
