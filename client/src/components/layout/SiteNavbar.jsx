import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  MessageSquare,
  UserPlus,
  ChevronDown,
  Star,
  Sparkles,
  Gift,
  Wallet,
  Megaphone,
  LayoutDashboard,
  CheckCircle2,
  User,
  Briefcase,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { toast } from "sonner";
import api from "@/lib/api";
import logoImg from "@/assets/log.png";
import { NotificationBell } from "./NotificationBell";


import { getGenderAvatar } from "@/utils/avatar";

const baseLinks = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/blog", label: "Blog" },
  { to: "/tips", label: "Pro Tips" },
  { to: "/reviews", label: "Reviews" },
  { to: "/addons", label: "Add-ons" },
];

export function SiteNavbar() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const lastScrollY = useRef(0);

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 80) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY.current + 8) {
        setIsNavVisible(false);
        setOpen(false);
      } else if (currentScrollY < lastScrollY.current - 8) {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
    if (url.startsWith("/avatars/") || url.startsWith("/icons/") || url.startsWith("/assets/")) return url;
    let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
    if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${apiUrl}${cleanPath}`;
  };

  useEffect(() => {
    if (!profile?._id) return;

    const fetchCounts = async () => {
      try {
        const [convRes, notifCountRes] = await Promise.all([
          api.get("/conversations", {
            params: { profileId: profile._id, role: profile.role },
          }).catch(() => ({ data: [] })),
          api.get("/connections/notifications/count", {
            params: { profileId: profile._id, role: profile.role },
          }).catch(() => ({ data: { data: 0 } })),
        ]);

        const convs = convRes.data?.data || convRes.data || [];
        const totalUnread = Array.isArray(convs)
          ? convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
          : 0;
        setUnreadCount(totalUnread);

        const pendingCount = Number(notifCountRes.data?.data ?? notifCountRes.data ?? 0);
        setConnectionCount(pendingCount);
      } catch (err) {
        // silent fail
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 6000);
    return () => clearInterval(interval);
  }, [profile]);

  const dashboardBaseUrl =
    profile?.role === "creator"
      ? "/dashboard/creator"
      : "/dashboard/brand";

  const links = [
    ...baseLinks,
    ...(user && profile?.role === "creator"
      ? [{ to: "/dashboard/creator", label: "Creator" }]
      : []),
    ...(user && profile?.role === "brand"
      ? [{ to: "/dashboard/brand", label: "Brand" }]
      : []),
  ];

  const handleSignOut = () => {
    setShowLogoutModal(true);
  };

  const confirmSignOut = () => {
    signOut();
    setShowLogoutModal(false);
    toast.success("Signed out successfully");
    navigate("/");
    setOpen(false);
  };

  const initial =
    profile?.fullName?.trim()?.[0]?.toUpperCase() ||
    profile?.name?.trim()?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          isNavVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-2 lg:mr-4">
            <img
              src={logoImg}
              alt="Pravixo"
              className="h-8 w-auto object-contain dark:bg-white/90 dark:p-0.5 dark:rounded-md"
            />
            <span className="font-display text-lg font-bold tracking-tight text-foreground dark:text-white">
              Pravixo
            </span>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden items-center gap-0.5 lg:gap-1 md:flex overflow-x-auto no-scrollbar">
            {links.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-full px-2.5 lg:px-3.5 py-1.5 text-xs lg:text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
                    active
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary cursor-pointer shrink-0"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Authenticated Icons */}
            {user && (
              <>
                <NotificationBell profileId={profile?._id} />
                <Link
                  to="/connections"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary shrink-0"
                  aria-label="Connections"
                >
                  <UserPlus className="h-4 w-4" />
                  {connectionCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {connectionCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/messages"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary shrink-0"
                  aria-label="Messages"
                >
                  <MessageSquare className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* Auth Buttons / Profile Pill & Dropdown */}
            {loading ? (
              <div className="h-9 w-24 rounded-full bg-secondary animate-pulse shrink-0" />
            ) : user ? (
              <div className="hidden items-center gap-2 sm:flex relative shrink-0" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                  className="flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 transition-all hover:bg-secondary hover:border-border/80 cursor-pointer shadow-xs focus:outline-none"
                  aria-expanded={isUserDropdownOpen}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        resolveImageUrl(profile?.avatarUrl) ||
                        getGenderAvatar(profile?.fullName || profile?.name || user?.email, profile?.gender, profile?.role)
                      }
                      alt=""
                      className="h-7 w-7 rounded-full object-cover border border-border/50"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getGenderAvatar(profile?.fullName || profile?.name || user?.email, profile?.gender, profile?.role);
                      }}
                    />
                  </div>
                  <span className="max-w-[110px] truncate text-sm font-medium text-foreground">
                    {profile?.fullName || profile?.name || user.email}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isUserDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* DROPDOWN MENU */}
                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-12 z-50 w-64 rounded-3xl border border-border/80 bg-popover/95 backdrop-blur-xl p-2.5 shadow-2xl origin-top-right"
                    >
                      <div className="px-3 py-2 border-b border-border/50 mb-1.5 flex items-center gap-2.5">
                      <img
                        src={
                          resolveImageUrl(profile?.avatarUrl) ||
                          getGenderAvatar(profile?.fullName || profile?.name || user?.email, profile?.gender, profile?.role)
                        }
                        alt=""
                        className="h-9 w-9 rounded-full object-cover border border-border/60"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground truncate">
                          {profile?.fullName || profile?.name || "User"}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                          <span className="capitalize font-semibold text-primary">{profile?.role || "Brand"}</span> • @{profile?.handle?.replace("@", "") || "user"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0.5 text-xs font-medium">
                      <Link
                        to={dashboardBaseUrl}
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        <span>Overview Dashboard</span>
                      </Link>

                      {profile?.role === "creator" ? (
                        <Link
                          to="/collaborations"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors font-semibold"
                        >
                          <Briefcase className="h-4 w-4 text-purple-500" />
                          <span>My Work & Deliverables</span>
                        </Link>
                      ) : (
                        <Link
                          to="/collaborations"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors font-semibold"
                        >
                          <Briefcase className="h-4 w-4 text-purple-500" />
                          <span>Campaign Work & Deliverables</span>
                        </Link>
                      )}

                      <Link
                        to={`${dashboardBaseUrl}?tab=subscription`}
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Star className="h-4 w-4 text-amber-500" />
                        <span>{profile?.role === "brand" ? "Add-on Services & Packages" : "Packages & Plan"}</span>
                      </Link>

                      <Link
                        to={`${dashboardBaseUrl}?tab=offers`}
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Sparkles className="h-4 w-4 text-pink-500" />
                        <span>Special Offers & Deals</span>
                      </Link>

                      <Link
                        to={`${dashboardBaseUrl}?tab=wallet`}
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors font-medium"
                      >
                        <Wallet className="h-4 w-4 text-emerald-500" />
                        <span>My Wallet</span>
                      </Link>

                      {profile?.role === "creator" ? (
                        <Link
                          to={`${dashboardBaseUrl}?tab=campaigns`}
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <Megaphone className="h-4 w-4 text-blue-500" />
                          <span>Find Campaigns</span>
                        </Link>
                      ) : (
                        <Link
                          to={`${dashboardBaseUrl}?tab=campaigns`}
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <Megaphone className="h-4 w-4 text-blue-500" />
                          <span>Campaigns & Escrow</span>
                        </Link>
                      )}

                      {profile?.handle && (
                        <Link
                          to={`/c/${profile.handle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <span>Public Media Kit</span>
                        </Link>
                      )}

                      <div className="my-1 border-t border-border/50" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="rounded-full">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register" className="hidden sm:block">
                  <Button
                    size="sm"
                    className="rounded-full gradient-sunset border-0 text-white shadow-glow hover:opacity-95"
                  >
                    Get started
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile menu trigger */}
            <button
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-full border border-border"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-border/80 md:hidden bg-popover/95 backdrop-blur-xl overflow-hidden shadow-2xl"
            >
              <div className="mx-auto max-w-7xl p-3.5 space-y-2">
                {/* User Profile Header Card if logged in */}
                {user && (
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-3 mb-2 flex items-center gap-3">
                    <img
                      src={
                        resolveImageUrl(profile?.avatarUrl) ||
                        getGenderAvatar(profile?.fullName || profile?.name || user?.email, profile?.gender, profile?.role)
                      }
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border border-border/60"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getGenderAvatar(profile?.fullName || profile?.name || user?.email, profile?.gender, profile?.role);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate">
                        {profile?.fullName || profile?.name || "User"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                        <span className="capitalize font-semibold text-primary">{profile?.role || "Brand"}</span>
                        <span>•</span>
                        <span>@{profile?.handle?.replace("@", "") || "user"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Base Navigation Links */}
                <div className="grid grid-cols-2 gap-1 pb-1">
                  {baseLinks.map((l) => {
                    const active = pathname === l.to;
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setOpen(false)}
                        className={`block rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                          active
                            ? "bg-secondary text-foreground font-bold"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </div>

                {/* Authenticated Dashboard & Feature Links */}
                {user ? (
                  <div className="space-y-0.5 border-t border-border/50 pt-2 text-xs font-medium">
                    <Link
                      to={dashboardBaseUrl}
                      onClick={() => {
                        setOpen(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <span>Overview Dashboard</span>
                    </Link>

                    {profile?.role === "creator" ? (
                      <Link
                        to="/collaborations"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors font-semibold"
                      >
                        <Briefcase className="h-4 w-4 text-purple-500" />
                        <span>My Work & Deliverables</span>
                      </Link>
                    ) : (
                      <Link
                        to="/collaborations"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors font-semibold"
                      >
                        <Briefcase className="h-4 w-4 text-purple-500" />
                        <span>Campaign Work & Deliverables</span>
                      </Link>
                    )}

                    <Link
                      to={`${dashboardBaseUrl}?tab=subscription`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Star className="h-4 w-4 text-amber-500" />
                      <span>{profile?.role === "brand" ? "Add-on Services & Packages" : "Packages & Plan"}</span>
                    </Link>

                    <Link
                      to={`${dashboardBaseUrl}?tab=offers`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-pink-500" />
                      <span>Special Offers & Deals</span>
                    </Link>

                    <Link
                      to={`${dashboardBaseUrl}?tab=wallet`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Wallet className="h-4 w-4 text-emerald-500" />
                      <span>My Wallet</span>
                    </Link>

                    {profile?.role === "creator" ? (
                      <Link
                        to={`${dashboardBaseUrl}?tab=campaigns`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Megaphone className="h-4 w-4 text-blue-500" />
                        <span>Find Campaigns</span>
                      </Link>
                    ) : (
                      <Link
                        to={`${dashboardBaseUrl}?tab=campaigns`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Megaphone className="h-4 w-4 text-blue-500" />
                        <span>Campaigns & Escrow</span>
                      </Link>
                    )}

                    {profile?.handle && (
                      <Link
                        to={`/c/${profile.handle.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span>Public Media Kit</span>
                      </Link>
                    )}

                    <div className="my-1 border-t border-border/50" />

                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Link
                      to="/login"
                      className="flex-1"
                      onClick={() => setOpen(false)}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-full"
                      >
                        Sign in
                      </Button>
                    </Link>
                    <Link
                      to="/register"
                      className="flex-1"
                      onClick={() => setOpen(false)}
                    >
                      <Button
                        size="sm"
                        className="w-full rounded-full gradient-sunset border-0 text-white"
                      >
                        Get started
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close logout confirmation"
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-elevated"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full gradient-sunset text-white shadow-glow">
                <LogOut className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Are you sure you want to logout?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You can sign in again anytime.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-24 rounded-full border-primary/30 bg-white/10 text-foreground hover:bg-accent/40 cursor-pointer"
                  onClick={() => setShowLogoutModal(false)}
                >
                  No
                </Button>
                <Button
                  type="button"
                  className="min-w-24 rounded-full gradient-sunset border-0 text-white shadow-glow hover:opacity-95 cursor-pointer"
                  onClick={confirmSignOut}
                >
                  Yes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}