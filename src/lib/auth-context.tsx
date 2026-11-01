// ─── Real Supabase auth context ───────────────────────────────────────────────
// Loads (and self-provisions) the signed-in user's organisation, profile and
// subscription. Never uses PostgREST embeds across unrelated tables.

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { PlanId } from "./plans";
import { supabase } from "./supabase";

interface OrgProfile {
  profile_id: string;
  org_id: string;
  org_name: string;
  full_name: string;
  role: string;
  jurisdiction: string;
  plan: PlanId;
  plan_status: string;
  avatar_url?: string | undefined;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: OrgProfile | null;
  loading: boolean;
  planChosen: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  planChosen: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const provisioning = useRef(false);
  // Guards against duplicate/overlapping loads from getSession + INITIAL_SESSION + SIGNED_IN.
  const loadingUserId = useRef<string | null>(null);
  const loadedUserId = useRef<string | null>(null);


  const loadProfile = useCallback(async (u: User) => {
    try {
      // 1. Profile row (no cross-table embeds — profiles has no FK to subscriptions)
      let { data: row, error } = await supabase
        .from("profiles")
        .select("id, org_id, full_name, role")
        .eq("user_id", u.id)
        .maybeSingle();

      if (error) {
        return;
      }

      // 2. Self-provision organisation + profile + free subscription on first login
      if (!row && !provisioning.current) {
        provisioning.current = true;
        row = await provision(u);
        provisioning.current = false;
      }
      if (!row) {
        return;
      }

      // 3. Organisation + subscription, fetched independently
      const [orgRes, subRes] = await Promise.all([
        supabase
          .from("organizations")
          .select("name, jurisdiction_default")
          .eq("id", row.org_id)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("org_id", row.org_id)
          .maybeSingle(),
      ]);

      // Auto-create trial subscription if none exists
      if (!subRes.data) {
        await supabase.from("subscriptions").insert({
          org_id: row.org_id,
          plan: "standard",
          status: "trialing",
          charge_period: "MONTHLY",
          trial_end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Default plan is standard trial when no subscription row exists
      const plan = subRes.data?.plan ?? "standard";
      const planStatus = subRes.data?.status ?? "trialing";

      setProfile({
        profile_id: row.id,
        org_id: row.org_id,
        org_name: orgRes.data?.name ?? "My Organisation",
        full_name: row.full_name || ((u.user_metadata?.["full_name"] as string | undefined) ?? ""),
        role: row.role,
        jurisdiction: orgRes.data?.jurisdiction_default ?? "PSX",
        plan: plan as PlanId,
        plan_status: planStatus,
        avatar_url: u.user_metadata?.["avatar_url"] as string | undefined,
      });
    } catch (cause) {
      // Silent error handling
    }
  }, []);

  // Single controlled lifecycle: never overlap, never reload the same user,
  // always release the loading flag.
  const ensureUserData = useCallback(
    async (u: User, force = false) => {
      if (loadingUserId.current === u.id) return;
      if (!force && loadedUserId.current === u.id) {
        setLoading(false);
        return;
      }
      loadingUserId.current = u.id;
      setLoading(true);
      try {
        await loadProfile(u);
        loadedUserId.current = u.id;
      } finally {
        loadingUserId.current = null;
        setLoading(false);
      }
    },
    [loadProfile],
  );


  async function provision(u: User) {
    const meta = u.user_metadata ?? {};
    const orgName = (meta["org_name"] as string | undefined) || `${u.email?.split("@")[0] ?? "My"} Organisation`;
    const { data, error } = await supabase.rpc("provision_current_user", {
      _org_name: orgName,
      _full_name: (meta["full_name"] as string | undefined) ?? (meta["name"] as string | undefined) ?? u.email?.split("@")[0] ?? "",
      _jurisdiction: (meta["jurisdiction"] as string | undefined) ?? "PSX",
    });
    if (error || !data) {
      return null;
    }
    const p = data as { id: string; org_id: string; full_name: string; role: string };
    return { id: p.id, org_id: p.org_id, full_name: p.full_name, role: p.role };
  }

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await ensureUserData(data.user, true);
  }, [ensureUserData]);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const s = data.session;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) return ensureUserData(s.user);
        setLoading(false);
        return undefined;
      })
      .catch((cause: unknown) => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);

      if (event === "SIGNED_OUT") {
        loadedUserId.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }
      // INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED for an already-loaded
      // user must not re-run the expensive profile load.
      if (s?.user) void ensureUserData(s.user);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [ensureUserData]);


  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  const planChosen = Boolean(user?.user_metadata?.["plan_chosen"]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, planChosen, signOut: handleSignOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
