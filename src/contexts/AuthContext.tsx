import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "manager" | "supervisor" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  site: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserProfile(uid: string): Promise<User | null> {
  const [profileRes, roleRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).single(),
    supabase.from("user_roles").select("role").eq("user_id", uid).single(),
  ]);
  if (profileRes.error || !profileRes.data) return null;
  const p = profileRes.data;
  const role = (roleRes.data?.role as UserRole) ?? "employee";
  return {
    id: p.id,
    name: p.full_name || p.email || "",
    email: p.email || "",
    role,
    department: p.department || "",
    site: p.site || "",
    avatar: p.avatar_url || undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Defer profile fetch to avoid Supabase deadlock
        setTimeout(async () => {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then((profile) => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string): Promise<boolean> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated: !!session, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
