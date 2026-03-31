import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from the profiles table
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, company, plan, created_at")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[Auth] Failed to fetch profile:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("[Auth] Profile fetch error:", err);
      return null;
    }
  }, []);

  // Update local state when session changes
  const handleSession = useCallback(
    async (newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        const p = await fetchProfile(newSession.user.id);
        setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    },
    [fetchProfile]
  );

  // Subscribe to auth state changes on mount
  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleSession(s);
    });

    // Listen for login, logout, token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleSession]);

  // ---- Auth actions ----

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async function register(email, password, meta = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: meta.name || "",
          company: meta.company || "",
        },
      },
    });
    if (error) throw error;

    // Create the profile row (the trigger in schema.sql also does this,
    // but we do it here as a fallback for immediate availability)
    if (data.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email,
          name: meta.name || "",
          company: meta.company || "",
          plan: "free",
        },
        { onConflict: "id" }
      );
    }

    return data;
  }

  async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/#app",
      },
    });
    if (error) throw error;
    return data;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
  }

  async function updateProfile(updates) {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  }

  const value = {
    user,
    profile,
    session,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isPro: profile?.plan === "pro" || profile?.plan === "business",
    isBusiness: profile?.plan === "business",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
