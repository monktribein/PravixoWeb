import { useEffect, useState } from "react";
import { resolveImageUrl, resolveFrontendUrl } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  Building2,
  MessageSquare,
  Mail,
  Heart,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { NotificationBell } from "@/components/notification-bell";

        export function Dashboard() {
  useEffect(() => {
    document.title = "Dashboard — Pravixo Admin";
  }, []);

  const [stats, setStats] = useState(null);
  const [allProfiles, setAllProfiles] = useState(null);
  const [allConversations, setAllConversations] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, profilesRes, convsRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/profiles"),
          api.get("/admin/conversations"),
        ]);
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (profilesRes.data.success) setAllProfiles(profilesRes.data.data);
        if (convsRes.data.success) setAllConversations(convsRes.data.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    fetchData();
  }, []);

  const recentUsers = allProfiles?.slice(-5).reverse();
  const recentConvs = allConversations?.slice(-5).reverse();

  // Active segment states for dynamic center tooltips
  const [activeRole, setActiveRole] = useState(null);
  const [activeVerification, setActiveVerification] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);

  // Overview stats cards
  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, href: "/users" },
    { label: "Creators", value: stats?.creators, href: "/users" },
    { label: "Brands", value: stats?.brands, href: "/users" },
    { label: "Conversations", value: stats?.conversations, href: "/conversations" },
    { label: "Messages", value: stats?.messages },
    { label: "Favorites", value: stats?.favorites },
  ];

  // User Roles Data
  const totalUserRoles = (stats?.creators || 0) + (stats?.brands || 0);
  const userRoleData = [
    { name: "Creators", value: stats?.creators || 0, color: "#8b5cf6", total: totalUserRoles },
    { name: "Brands", value: stats?.brands || 0, color: "#f59e0b", total: totalUserRoles },
  ];

  // Verification Statuses Data
  const verifiedCount = allProfiles?.filter((p) => p.verificationStatus === "verified").length || 0;
  const pendingCount = allProfiles?.filter((p) => p.verificationStatus === "pending").length || 0;
  const rejectedCount = allProfiles?.filter((p) => p.verificationStatus === "rejected").length || 0;
  const unverifiedCount = allProfiles?.filter((p) => !p.verificationStatus || p.verificationStatus === "unverified").length || 0;
  const totalVerification = verifiedCount + pendingCount + rejectedCount + unverifiedCount;

  const verificationData = [
    { name: "Verified", value: verifiedCount, color: "#10b981", total: totalVerification },
    { name: "Pending", value: pendingCount, color: "#f59e0b", total: totalVerification },
    { name: "Rejected", value: rejectedCount, color: "#f43f5e", total: totalVerification },
    { name: "Unverified", value: unverifiedCount, color: "#64748b", total: totalVerification },
  ];

  // Conversation Statuses Data
  const activeConvs = allConversations?.filter((c) => c.status === "active").length || 0;
  const pendingConvs = allConversations?.filter((c) => c.status === "pending").length || 0;
  const completedConvs = allConversations?.filter((c) => c.status === "completed").length || 0;
  const totalConversations = activeConvs + pendingConvs + completedConvs;

  const conversationData = [
    { name: "Active", value: activeConvs, color: "#10b981", total: totalConversations },
    { name: "Pending", value: pendingConvs, color: "#f59e0b", total: totalConversations },
    { name: "Completed", value: completedConvs, color: "#64748b", total: totalConversations },
  ];

  const isLoading = !stats || !allProfiles || !allConversations;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Platform overview and analytics charts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 animate-pulse">Live data</span>
          </div>
          <NotificationBell align="right" />
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => {
          const CardWrapper = card.href ? Link : "div";
          return (
            <CardWrapper
              key={card.label}
              to={card.href}
              className={`rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm ${card.href ? "hover:bg-secondary/50 transition-colors" : ""}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <div className="mt-1 font-display text-xl sm:text-2xl font-bold">
                {card.value !== undefined ? formatNumber(card.value) : <Skeleton className="h-8 w-16" />}
              </div>
            </CardWrapper>
          );
        })}
      </div>

      {/* Donut Charts Section */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: User Roles */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> User Roles
            </h2>
          </div>
          {isLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <Skeleton className="h-28 w-28 rounded-full" />
            </div>
          ) : (
            <div className="relative h-[200px] w-full flex items-center justify-center mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userRoleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(data) => setActiveRole(data)}
                    onMouseLeave={() => setActiveRole(null)}
                    className="cursor-pointer focus:outline-none"
                  >
                    {userRoleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="focus:outline-none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none select-none text-center">
                {activeRole ? (
                  <div className="flex flex-col items-center justify-center animate-in fade-in-50 zoom-in-95 duration-150">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-sm"
                      style={{ backgroundColor: activeRole.color }}
                    >
                      {activeRole.name}
                    </span>
                    <span className="text-xl font-bold mt-1 text-foreground">
                      {activeRole.value}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        ({activeRole.total > 0 ? ((activeRole.value / activeRole.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center animate-in fade-in-50 duration-150">
                    <span className="text-2xl font-bold text-foreground">{totalUserRoles}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Users</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs border-t border-border/50 pt-4">
            {userRoleData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}:</span>
                <span className="text-foreground font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Verification Status */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Verification Status
            </h2>
          </div>
          {isLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <Skeleton className="h-28 w-28 rounded-full" />
            </div>
          ) : (
            <div className="relative h-[200px] w-full flex items-center justify-center mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(data) => setActiveVerification(data)}
                    onMouseLeave={() => setActiveVerification(null)}
                    className="cursor-pointer focus:outline-none"
                  >
                    {verificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="focus:outline-none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none select-none text-center">
                {activeVerification ? (
                  <div className="flex flex-col items-center justify-center animate-in fade-in-50 zoom-in-95 duration-150">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-sm"
                      style={{ backgroundColor: activeVerification.color }}
                    >
                      {activeVerification.name}
                    </span>
                    <span className="text-xl font-bold mt-1 text-foreground">
                      {activeVerification.value}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        ({activeVerification.total > 0 ? ((activeVerification.value / activeVerification.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </span>
                  </div>
                ) : ( 
                  <div className="flex flex-col items-center justify-center animate-in fade-in-50 duration-150">
                    <span className="text-2xl font-bold text-foreground">{totalVerification}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accounts</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs border-t border-border/50 pt-4">
            {verificationData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}:</span>
                <span className="text-foreground font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Conversation Status */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet" /> Conversation Status
            </h2>
          </div>
          {isLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <Skeleton className="h-28 w-28 rounded-full" />
            </div>
          ) : (
            <div className="relative h-[200px] w-full flex items-center justify-center mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(data) => setActiveConversation(data)}
                    onMouseLeave={() => setActiveConversation(null)}
                    className="cursor-pointer focus:outline-none"
                  >
                    {conversationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="focus:outline-none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none select-none text-center">
                {activeConversation ? (
                  <div className="flex flex-col items-center justify-center animate-in fade-in-50 zoom-in-95 duration-150">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-sm"
                      style={{ backgroundColor: activeConversation.color }}
                    >
                      {activeConversation.name}
                    </span>
                    <span className="text-xl font-bold mt-1 text-foreground">
                      {activeConversation.value}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        ({activeConversation.total > 0 ? ((activeConversation.value / activeConversation.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center animate-in fade-in-50 duration-150">
                    <span className="text-2xl font-bold text-foreground">{totalConversations}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Convs</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs border-t border-border/50 pt-4">
            {conversationData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}:</span>
                <span className="text-foreground font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base sm:text-lg font-semibold">Recent Users</h2>
            <Link to="/users" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {!recentUsers ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : recentUsers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No users yet</p>
            ) : (
              recentUsers.map((u) => (
                <button
                  key={u._id}
                  onClick={() =>
                    window.open(
                      resolveFrontendUrl(`/${u.role === "creator" ? "influencer" : "brand"}/${u._id}`),
                      "_blank"
                    )
                  }
                  className="w-full text-left flex items-center gap-3 rounded-2xl border border-border/50 p-3 transition-colors hover:bg-secondary/50 cursor-pointer"
                >
                  <img
                    src={resolveImageUrl(u.avatarUrl, u.fullName || "User", u.gender, u.role)}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = resolveImageUrl("", u.fullName || "User", u.gender, u.role);
                    }}
                    alt=""
                    className="h-10 w-10 rounded-full border border-border object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.handle ? `@${u.handle.replace(/^@+/, '')}` : u.category || "—"}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`rounded-full text-[10px] shrink-0 ${
                      u.role === "creator" ? "bg-violet/10 text-violet" : "bg-amber/10 text-amber"
                    }`}
                  >
                    {u.role}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base sm:text-lg font-semibold">Recent Conversations</h2>
            <Link to="/conversations" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {!recentConvs ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : recentConvs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No conversations yet</p>
            ) : (
              recentConvs.map((c) => (
                <Link
                  key={c._id}
                  to={`/conversations`}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 p-3 transition-colors hover:bg-secondary/50 overflow-hidden"
                >
                  <div className="relative shrink-0">
                    <img
                      src={resolveImageUrl(c.creator?.avatarUrl, c.creator?.fullName || "C", c.creator?.gender, c.creator?.role || "creator")}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = resolveImageUrl("", c.creator?.fullName || "C", c.creator?.gender, c.creator?.role || "creator");
                      }}
                      alt=""
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                    <img
                      src={c.brand ? resolveImageUrl(c.brand?.avatarUrl, c.brand?.fullName || "B", c.brand?.gender, c.brand?.role || "brand") : "/log.png"}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = resolveImageUrl("", c.brand?.fullName || "B", c.brand?.gender, c.brand?.role || "brand");
                      }}
                      alt=""
                      className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-card object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <span className="truncate">{c.creator?.fullName || "Creator"}</span>
                      <span className="font-normal text-muted-foreground shrink-0">↔</span>
                      <span className="truncate">{c.brand?.fullName || "Brand"}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground mt-0.5">
                      {c.lastMessage?.text || "No messages"}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`rounded-full text-[10px] shrink-0 ${
                      c.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : c.status === "pending"
                        ? "bg-amber/10 text-amber"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.status || "active"}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
