import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/auth/AuthProvider";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Bell,
  Check,
  Trash2,
  RefreshCw,
  Megaphone,
  CreditCard,
  FileCheck,
  MessageSquare,
  Wallet,
  Sparkles,
  AlertCircle,
  Activity,
  CheckCircle2,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

function getNotificationIcon(type) {
  switch (type) {
    case "campaign_pending_verification":
    case "campaign_approved":
    case "campaign_rejected":
    case "campaign_request_received":
    case "campaign_request_approved":
    case "campaign_request_rejected":
      return Megaphone;
    case "payment_successful":
    case "payment_secured":
    case "new_payment":
    case "payment_released":
    case "payment_release_eligible":
      return CreditCard;
    case "withdrawal_requested":
    case "withdrawal_completed":
    case "withdrawal_failed":
    case "payout_processed":
      return Wallet;
    case "agreement_signed_brand":
    case "agreement_signed_creator":
    case "agreement_fully_signed":
    case "agreement_pdf_sent":
      return FileCheck;
    case "admin_message":
      return MessageSquare;
    case "deliverable_submitted":
    case "deliverable_approved":
    case "all_deliverables_approved":
      return Sparkles;
    case "deliverable_rejected":
    case "dispute_raised":
      return AlertCircle;
    case "addon_booking":
    case "addon_booking_confirmed":
    case "addon_booking_cancelled":
    case "addon_service_submitted":
    case "addon_service_approved":
    case "addon_service_rejected":
      return Sparkles;
    default:
      return Activity;
  }
}

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { profile, user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const effectiveProfileId =
    profile?._id || user?.profile?._id || user?._id || user?.id;
  const isAdmin = profile?.role === "admin" || user?.role === "admin";

  useEffect(() => {
    document.title = "Notifications — Pravixo";
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchNotifications = useCallback(
    async (isManual = false) => {
      if (!effectiveProfileId && !isAdmin) return;

      try {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        let data = [];
        if (isAdmin) {
          try {
            const adminRes = await api.get("/admin/activity");
            data = adminRes.data?.data || [];
          } catch {
            const fallbackRes = await api.get(
              `/tasks/notifications/${effectiveProfileId}`
            );
            data = fallbackRes.data?.data || fallbackRes.data || [];
          }
        } else {
          const res = await api.get(
            `/tasks/notifications/${effectiveProfileId}`
          );
          data = res.data?.data || res.data || [];
        }

        setNotifications(Array.isArray(data) ? data : []);
        if (isManual) toast.success("Notifications refreshed");
      } catch (error) {
        console.error("Fetch notifications error:", error);
        if (isManual) toast.error("Failed to refresh notifications");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveProfileId, isAdmin]
  );

  useEffect(() => {
    if (!authLoading && user && (effectiveProfileId || isAdmin)) {
      fetchNotifications();
    }
  }, [authLoading, user, effectiveProfileId, isAdmin, fetchNotifications]);

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoading(id);
      await api.patch(`/tasks/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      toast.success("Marked as read");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark as read");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!effectiveProfileId) return;
    try {
      setActionLoading("all-read");
      await api.patch(`/tasks/notifications/${effectiveProfileId}/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      // Fallback one by one
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((n) => api.patch(`/tasks/notifications/${n._id}/read`))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoading(id);
      await api.delete(`/tasks/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Notification deleted");
    } catch (err) {
      console.error(err);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Notification dismissed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAll = async () => {
    if (!effectiveProfileId) return;
    try {
      setActionLoading("all-clear");
      await api.delete(`/tasks/notifications/${effectiveProfileId}/clear-all`);
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch {
      setNotifications([]);
      toast.success("Notifications cleared");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotificationClick = async (event) => {
    if (!event.read) {
      handleMarkRead(event._id);
    }

    if (event.targetUrl) {
      const url = event.targetUrl.trim();
      if (/^https?:\/\//i.test(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        navigate(url.startsWith("/") ? url : `/${url}`);
      }
      return;
    }

    // Role-aware and event-type fallback navigation
    switch (event.type) {
      case "withdrawal_requested":
      case "withdrawal_completed":
      case "withdrawal_failed":
      case "payout_processed":
        navigate("/dashboard/creator/wallet");
        break;
      case "agreement_signed_brand":
      case "agreement_signed_creator":
      case "agreement_fully_signed":
      case "agreement_pdf_sent":
      case "admin_message":
      case "new_message":
        navigate("/messages");
        break;
      case "deliverable_submitted":
      case "deliverable_approved":
      case "deliverable_rejected":
      case "deliverable_resubmitted":
      case "all_deliverables_approved":
        navigate("/collaborations");
        break;
      case "campaign_request_received":
      case "campaign_request_approved":
        navigate("/collaborations");
        break;
      case "campaign_approved":
      case "campaign_rejected":
      case "campaign_pending_verification":
        navigate(profile?.role === "brand" ? "/dashboard/brand?tab=campaigns" : "/collaborations");
        break;
      case "payment_successful":
      case "payment_secured":
      case "payment_released":
      case "new_payment":
        navigate("/collaborations");
        break;
      case "verification_requested":
      case "dispute_raised":
        navigate("/collaborations");
        break;
      case "addon_booking":
      case "addon_booking_confirmed":
      case "addon_booking_cancelled":
      case "addon_service_submitted":
      case "addon_service_approved":
      case "addon_service_rejected":
        navigate("/addons");
        break;
      default:
        break;
    }
  };

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Tab filter
      if (activeTab === "unread" && item.read) return false;
      if (activeTab === "read" && !item.read) return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const text = (item.text || "").toLowerCase();
        const type = (item.type || "").toLowerCase();
        return text.includes(query) || type.includes(query);
      }

      return true;
    });
  }, [notifications, activeTab, search]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-0.5">
                {unreadCount} Unread
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay updated with your campaigns, payments, messages, and platform
            activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin text-primary" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {notifications.length > 0 && (
            <>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={actionLoading === "all-read"}
                  className="flex items-center gap-2 rounded-xl text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Check className="h-4 w-4" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={actionLoading === "all-clear"}
                className="flex items-center gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            </>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex max-w-max flex-wrap gap-1 rounded-full border border-border/50 bg-secondary/35 p-1">
          {[
            { id: "all", label: `All (${notifications.length})` },
            { id: "unread", label: `Unread (${unreadCount})` },
            {
              id: "read",
              label: `Read (${notifications.length - unreadCount})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide capitalize transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-border bg-card/60 pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* CONTENT LIST */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 animate-pulse"
            >
              <div className="h-10 w-10 rounded-xl bg-secondary shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-secondary" />
                <div className="h-3 w-1/2 rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 py-16 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Bell className="h-8 w-8 text-primary/80" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            {search ? "No matching notifications" : "All caught up!"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search
              ? `No notifications found matching "${search}". Try adjusting your search query.`
              : "You don't have any notifications at the moment. When activities happen, they'll appear here."}
          </p>
          {search && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearch("")}
              className="mt-4 rounded-xl"
            >
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const Icon = getNotificationIcon(notif.type);
            const isUnread = !notif.read;

            return (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative flex items-start justify-between gap-4 rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                  isUnread
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10 shadow-sm"
                    : "border-border/60 bg-card/60 hover:bg-secondary/40 hover:border-border"
                }`}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                      isUnread
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-semibold leading-snug ${
                          isUnread ? "text-foreground" : "text-foreground/80"
                        }`}
                      >
                        {notif.text || "Notification"}
                      </p>
                      {isUnread && (
                        <span className="inline-block h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {timeAgo(notif.createdAt || notif.timestamp || Date.now())}
                      </span>
                      <span>•</span>
                      <span className="capitalize">
                        {(notif.type || "system").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center gap-2 shrink-0">
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleMarkRead(notif._id, e)}
                      title="Mark as read"
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(notif._id, e)}
                    title="Delete notification"
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
