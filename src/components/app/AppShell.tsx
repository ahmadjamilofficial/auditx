import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CreditCard,
  FileText,
  GitFork,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelRight,
  Plug,
  Radio,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Sun,
  Upload,
  User,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";
import { CommandBarProvider, useCommandBar } from "@/components/intelligence/AuditXCommandBar";
import {
  NotificationBell,
  NotificationCenter,
} from "@/components/notifications/NotificationCenter";
import { usePendingApprovals } from "@/lib/data-hooks";
import { useAgentHeartbeat } from "@/lib/use-agent-heartbeat";
import { useTheme } from "@/lib/theme-context";
import { TRIAL_DAYS, kelviqCheckoutUrl, normalizePlanId } from "@/lib/plans";
import {
  clearTrialClock,
  getTrialClock,
  isTrialExpired,
  trialDaysRemaining,
} from "@/lib/trial";

// ── Persist sidebar state across page loads ───────────────────────────────────
const SIDEBAR_KEY = "wab.sidebar.expanded";
function readSidebarPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}
function writeSidebarPref(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_KEY, String(v));
  } catch {
    /* ignore */
  }
}

// ── Nav structure ─────────────────────────────────────────────────────────────

const primaryItem = { label: "Ask Wab", icon: Sparkles, to: "/app/parser" } as const;

const navGroups = [
  {
    title: "Workspace",
    items: [
      { label: "Portfolio", icon: LayoutDashboard, to: "/app/overview" },
      { label: "Ledger", icon: BookOpen, to: "/app/ledger" },
      { label: "Exceptions", icon: GitFork, to: "/app/reconciliation" },
      { label: "Data Sources", icon: Plug, to: "/app/sources" },
      { label: "Integrations", icon: Share2, to: "/app/integrations" },
      { label: "Tax Center", icon: BarChart3, to: "/app/tax" },
      { label: "Audit Trail", icon: Shield, to: "/app/audit-trail" },
    ],
  },
  {
    title: "Autonomous",
    items: [
      { label: "Activity Feed", icon: Radio, to: "/app/activity" },
      { label: "Review Inbox", icon: Inbox, to: "/app/review" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", icon: Settings, to: "/app/settings" },
      { label: "Billing", icon: CreditCard, to: "/app/billing" },
    ],
  },
] as const;

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  label,
  icon: Icon,
  to,
  active,
  collapsed,
  accent,
  badge,
  onClick,
}: {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  active: boolean;
  collapsed: boolean;
  accent?: boolean;
  badge?: number;
  onClick?: (() => void) | undefined;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={label}
      className={`relative flex items-center rounded-xl text-sm font-medium transition-all ${
        collapsed ? "size-10 justify-center" : "gap-3 px-3 py-2.5"
      }`}
      style={{
        background: active || accent ? "var(--sidebar-accent)" : "transparent",
        color: active || accent ? "var(--sidebar-primary)" : "var(--sidebar-foreground)",
        opacity: active || accent ? 1 : 0.72,
      }}
      onMouseEnter={(e) => {
        if (!active && !accent) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-accent)";
      }}
      onMouseLeave={(e) => {
        if (!active && !accent) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <Icon size={18} strokeWidth={1.75} />
      {!collapsed && <span className="truncate">{label}</span>}
      {badge != null && badge > 0 && (
        <span
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ background: "var(--bad)", color: "#fff" }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {collapsed && badge != null && badge > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: "var(--bad)", color: "#fff" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function TrialStatusBar() {
  const { profile, user } = useAuth();
  const clock = getTrialClock(profile?.org_id, user?.id);
  const current = normalizePlanId(profile?.plan);
  const paid = profile?.plan_status === "active" && current !== "free";
  if (paid) return null;
  const onTrial = profile?.plan_status === "trialing" || Boolean(clock);
  if (!onTrial && !clock) return null;
  const expired = isTrialExpired(clock, clock?.endsAt);
  const days = trialDaysRemaining(clock, clock?.endsAt);

  if (expired && current !== "pro" && current !== "standard") {
    return (
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs"
        style={{
          background: "color-mix(in srgb, var(--bad) 8%, transparent)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        <p>
          Your {TRIAL_DAYS}-day Standard trial has ended. Upgrade, or continue on Basic at $0 with
          limited features and AI quality.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/billing"
            className="rounded-full px-3 py-1.5 font-semibold text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Upgrade
          </Link>
          <button
            type="button"
            className="rounded-full border px-3 py-1.5 font-semibold"
            style={{ borderColor: "var(--hairline)" }}
            onClick={() => {
              clearTrialClock(profile?.org_id, user?.id);
              window.location.href = kelviqCheckoutUrl({
                plan: "free",
                orgId: profile?.org_id ?? null,
              });
            }}
          >
            Continue on Basic $0
          </button>
        </div>
      </div>
    );
  }

  if (!expired && (profile?.plan_status === "trialing" || clock)) {
    return (
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 text-xs"
        style={{ background: "var(--accent-6)", borderColor: "var(--sidebar-border)" }}
      >
        <p>
          Standard trial · {days} day{days === 1 ? "" : "s"} remaining of {TRIAL_DAYS}. Days keep
          counting if you sign out.
        </p>
        <Link to="/app/billing" className="font-semibold" style={{ color: "var(--color-accent)" }}>
          Manage
        </Link>
      </div>
    );
  }

  return null;
}

// ── InnerShell ────────────────────────────────────────────────────────────────

function InnerShell({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const nav = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { setOpen: setCommandBarOpen } = useCommandBar();
  const { theme, setTheme, actualTheme } = useTheme();

  // Desktop sidebar: expanded state persisted in localStorage
  const [expanded, setExpanded] = useState(() => readSidebarPref());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Review inbox badge — pending approvals count
  const { data: pendingApprovals } = usePendingApprovals(profile?.org_id);
  const reviewBadge = (pendingApprovals ?? []).length;

  // Fire heartbeat once per session to schedule cron-equivalent jobs
  useAgentHeartbeat(!!profile?.org_id);

  // Persist preference
  useEffect(() => {
    writeSidebarPref(expanded);
  }, [expanded]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    await signOut();
    setUserMenuOpen(false);
    nav({ to: "/" });
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const orgName = profile?.org_name || "My Organisation";
  const plan = profile?.plan || "free";
  const isAskPage = currentPath.startsWith("/app/parser");
  const initials = displayName.charAt(0).toUpperCase();
  const avatarUrl = (profile?.avatar_url || user?.user_metadata?.["avatar_url"]) as
    string | undefined;

  const isActive = (to: string) => currentPath === to || currentPath.startsWith(to + "/");

  // ── SidebarContent — shared by desktop and mobile ──────────────────────────
  function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {/* ── Logo + toggle ────────────────────────────────────────────────── */}
        <div className={`shrink-0 ${collapsed ? "flex flex-col items-center gap-3 p-3" : "p-4"}`}>
          <div className="flex w-full items-center justify-between">
            {collapsed ? (
              /* When collapsed: just the logomark, clicking it expands */
              <button
                type="button"
                aria-label="Expand navigation"
                onClick={() => (onClose ? onClose() : setExpanded(true))}
                className="flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-hover"
                style={{ background: "var(--sidebar)", border: "1px solid var(--sidebar-border)" }}
              >
                <LogoMark size={20} />
              </button>
            ) : (
              /* When expanded: logo on left, collapse button on right */
              <>
                <Link to="/app/parser" aria-label="Wab home">
                  <Logo />
                </Link>
                <button
                  type="button"
                  aria-label="Collapse navigation"
                  onClick={() => setExpanded(false)}
                  className="flex size-8 items-center justify-center rounded-xl transition-colors hover:bg-surface-hover"
                  title="Collapse sidebar"
                >
                  <PanelLeft size={16} strokeWidth={1.75} style={{ color: "var(--ink-3)" }} />
                </button>
              </>
            )}
          </div>

          {/* Org badge — only when expanded */}
          {!collapsed && (
            <div
              className="mt-4 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs"
              style={{ background: "var(--sidebar-accent)", border: "1px solid var(--sidebar-border)" }}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{orgName}</p>
                <p style={{ color: "var(--ink-3)" }}>
                  {(plan === "free" ? "BASIC" : plan).toUpperCase()} plan
                </p>
              </div>
              <ChevronDown size={14} strokeWidth={1.75} style={{ color: "var(--ink-3)" }} />
            </div>
          )}
        </div>

        {/* ── Nav links ─────────────────────────────────────────────────────── */}
        <nav
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin ${
            collapsed ? "flex flex-col items-center gap-1 px-3" : "space-y-4 px-4"
          }`}
        >
          <NavItem
            {...primaryItem}
            collapsed={collapsed}
            accent
            active={isActive(primaryItem.to)}
            onClick={onClose}
          />

          {navGroups.map((group) => (
            <div
              key={group.title}
              className={collapsed ? "flex flex-col items-center gap-1" : "space-y-0.5"}
            >
              {!collapsed && (
                <p
                  className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--sidebar-primary)", opacity: 0.45 }}
                >
                  {group.title}
                </p>
              )}
              {collapsed && (
                <div className="my-1 h-px w-6" style={{ background: "var(--sidebar-border)" }} />
              )}
              {group.items.map((item) => (
                <NavItem
                  key={item.label}
                  {...item}
                  collapsed={collapsed}
                  active={isActive(item.to)}
                  badge={item.to === "/app/review" ? reviewBadge : undefined}
                  onClick={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* ── User profile ──────────────────────────────────────────────────── */}
        <div ref={collapsed ? undefined : userMenuRef} className="relative shrink-0 p-3">
          {/* Profile button — when collapsed, clicking opens user menu ABOVE */}
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            title={displayName}
            className={`flex w-full items-center rounded-xl transition-colors ${
              collapsed ? "justify-center py-2" : "gap-3 px-3 py-2.5"
            }`}
            style={{ color: "var(--sidebar-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sidebar-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
              style={{
                background: avatarUrl ? "transparent" : "var(--color-accent)",
                color: "var(--accent-fg)",
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="size-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs" style={{ color: "var(--ink-3)" }}>
                  {user?.email ?? ""}
                </p>
              </div>
            )}
          </button>

          {/* User menu — always shown when userMenuOpen, regardless of collapsed state */}
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                ref={collapsed ? userMenuRef : undefined}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden rounded-2xl p-2"
                style={{
                  position: collapsed ? "fixed" : "absolute",
                  ...(collapsed
                    ? {
                        bottom: "16px",
                        left: "72px",
                        minWidth: 220,
                      }
                    : {
                        bottom: "100%",
                        left: "12px",
                        right: "12px",
                        marginBottom: "4px",
                        minWidth: 180,
                      }),
                  zIndex: 9999,
                  border: "1px solid var(--sidebar-border)",
                  background: "var(--sidebar)",
                  boxShadow: "var(--shadow-hover)",
                }}
              >
                {/* User info row at top */}
                <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
                    style={{
                      background: avatarUrl ? "transparent" : "var(--color-accent)",
                      color: "var(--accent-fg)",
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="size-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs" style={{ color: "var(--ink-3)" }}>
                      {user?.email ?? ""}
                    </p>
                  </div>
                </div>
                <div className="my-1 h-px" style={{ background: "var(--sidebar-border)" }} />
                <Link
                  to="/app/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors"
                  style={{ color: "var(--sidebar-foreground)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sidebar-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <User size={16} strokeWidth={1.75} />
                  Account settings
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors"
                  style={{ color: "var(--bad)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sidebar-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={16} strokeWidth={1.75} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-dvh h-screen overflow-hidden"
      style={{
        background: "var(--color-login-bg)",
        fontFamily: "var(--font-body)",
        color: "var(--color-text)",
      }}
    >
      {/* Desktop sidebar — own 100vh scroll, independent of the page */}
      <motion.aside
        animate={{ width: expanded ? 248 : 64 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden h-dvh h-screen min-h-0 shrink-0 overflow-hidden lg:sticky lg:top-0 lg:flex lg:flex-col"
        style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        <SidebarContent collapsed={!expanded} />

        {/* Expand tab — shown only when sidebar is collapsed (on the right edge) */}
        {!expanded && (
          <button
            type="button"
            aria-label="Expand navigation"
            onClick={() => setExpanded(true)}
            title="Expand sidebar"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex size-5 items-center justify-center rounded-full border shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: "var(--sidebar-border)", background: "var(--sidebar)" }}
          >
            <PanelRight size={11} strokeWidth={2} style={{ color: "var(--ink-3)" }} />
          </button>
        )}
      </motion.aside>

      {/* Mobile overlay + drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 z-50 h-dvh h-screen w-72 overflow-hidden shadow-2xl lg:hidden"
              style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <SidebarContent collapsed={false} onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={`flex shrink-0 items-center gap-3 border-b px-4 sm:px-6 ${isAskPage ? "py-2" : "py-3"}`}
          style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
        >
          {/* Mobile hamburger */}
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} strokeWidth={1.75} />
          </button>

          {!isAskPage && (
          <button
            type="button"
            className="hidden flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm sm:flex"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)", maxWidth: 380 }}
            onClick={() => setCommandBarOpen(true)}
          >
            <Sparkles size={15} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
            <span style={{ color: "var(--ink-3)" }}>Ask Wab anything…</span>
            <kbd
              className="ml-auto rounded px-2 py-0.5 text-xs"
              style={{ background: "var(--accent-6)", color: "var(--ink-3)" }}
            >
              ⌘K
            </kbd>
          </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(actualTheme === "dark" ? "light" : "dark")}
              className="hidden items-center justify-center rounded-xl p-2 transition-colors hover:bg-surface-hover sm:flex"
              title={actualTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{ color: "var(--ink-2)" }}
            >
              {actualTheme === "dark" ? (
                <Sun size={18} strokeWidth={1.75} />
              ) : (
                <Moon size={18} strokeWidth={1.75} />
              )}
            </button>

            {!isAskPage && (
            <Link
              to="/app/parser"
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-white sm:flex"
              style={{
                background: "var(--color-accent)",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              <Upload size={14} strokeWidth={2} />
              Upload statement
            </Link>
            )}

            <div className="relative">
              <NotificationBell userId={user?.id} onClick={() => setNotifOpen(true)} />
              <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
          </div>
        </header>

        <TrialStatusBar />

        <main
          className={`min-h-0 flex-1 ${isAskPage ? "overflow-hidden" : "overflow-y-auto scrollbar-thin"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CommandBarProvider>
      <InnerShell>{children}</InnerShell>
    </CommandBarProvider>
  );
}
