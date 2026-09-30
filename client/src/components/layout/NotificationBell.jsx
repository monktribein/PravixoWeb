import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Bell,
  BellRing,
  CheckCircle,
  X,
  Trash2,
  Check,
  Activity,
  Megaphone,
  CreditCard,
  FileCheck,
  MessageSquare,
  Wallet,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { subscribeToPush } from "@/utils/pushNotification";

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

export function NotificationBell({ profileId: propProfileId }) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [allEvents, setAllEvents] = useState([]);

  const effectiveProfileId =
    propProfileId || profile?._id || user?.profile?._id || user?._id || user?.id;
  const isAdmin = profile?.role === "admin" || user?.role === "admin";

  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(`notif_deleted_${effectiveProfileId}`) || "[]"
        )
      );
    } catch {
      return new Set();
    }
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pushStatus, setPushStatus] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });
  const [enablingPush, setEnablingPush] = useState(false);
  const panelRef = useRef(null);

  const handleEnableWebPush = async () => {
    setEnablingPush(true);
    try {
      const res = await subscribeToPush();
      if (res.success) {
        setPushStatus("granted");
        toast.success("Push notifications enabled! You will get instant alerts.");
      } else if (res.reason === "denied") {
        setPushStatus("denied");
        toast.error("Notification permission denied in browser settings.");
      }
    } catch (err) {
      console.error("Push subscribe error:", err);
      toast.error("Failed to enable notifications.");
    } finally {
      setEnablingPush(false);
    }
  };

  const saveDeletedIds = (ids) => {
    setDeletedIds(ids);
    if (effectiveProfileId) {
      localStorage.setItem(
        `notif_deleted_${effectiveProfileId}`,
        JSON.stringify([...ids])
      );
    }
  };

  const fetchActivity = useCallback(
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

        setAllEvents(Array.isArray(data) ? data : []);
        if (isManual) toast.success("Notifications refreshed");
      } catch (err) {
        console.error("Fetch notifications error:", err);
        if (isManual) toast.error("Failed to refresh notifications");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveProfileId, isAdmin]
  );

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(() => fetchActivity(false), 20000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Visible events = not deleted
  const visibleEvents = allEvents.filter((e) => !deletedIds.has(e._id));
  const unread = visibleEvents.filter((e) => !e.read).length;

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/tasks/notifications/${id}/read`);
      setAllEvents((prev) =>
        prev.map((ev) => (ev._id === id ? { ...ev, read: true } : ev))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const next = new Set(deletedIds);
    next.add(id);
    saveDeletedIds(next);
  };

  const handleMarkAllRead = async () => {
    if (effectiveProfileId) {
      try {
        await api.patch(`/tasks/notifications/${effectiveProfileId}/read-all`);
        setAllEvents((prev) => prev.map((ev) => ({ ...ev, read: true })));
        return;
      } catch {
        // fallback loop
      }
    }
    const unreadEvents = visibleEvents.filter((e) => !e.read);
    for (const ev of unreadEvents) {
      await handleMarkRead(ev._id, null);
    }
  };

  const handleClearAll = async () => {
    const next = new Set([...deletedIds, ...visibleEvents.map((e) => e._id)]);
    saveDeletedIds(next);
    if (effectiveProfileId) {
      try {
        await api.delete(`/tasks/notifications/${effectiveProfileId}/clear-all`);
      } catch {
        // local state already cleared
      }
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-x-3 top-16 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:inset-x-auto sm:mt-2 z-50 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-card/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <span className="flex h-4 px-1.5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                  {unread} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchActivity(true)}
                disabled={refreshing}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="Refresh notifications"
              >
                <RefreshCw
                  className={`h-3 w-3 ${refreshing ? "animate-spin text-primary" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Push Notification Permission Quick-Action */}
          <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/10 border-b border-blue-500/20 px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <BellRing className={`h-4 w-4 shrink-0 ${pushStatus === "granted" ? "text-emerald-500" : "text-blue-500 animate-bounce"}`} />
              <span className="text-[11px] font-medium text-foreground">
                {pushStatus === "granted" ? "Web Push Alerts: Active ✓" : "Enable Web Push Notifications"}
              </span>
            </div>
            <button
              onClick={handleEnableWebPush}
              disabled={enablingPush}
              className={`shrink-0 rounded-full font-bold text-[10px] px-3 py-1 shadow-sm transition-all ${
                pushStatus === "granted"
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {enablingPush ? "Enabling..." : pushStatus === "granted" ? "Re-sync Push" : "Enable"}
            </button>
          </div>

          {/* Bulk actions */}
          {visibleEvents.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-secondary/30 shrink-0">
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
              <span className="text-muted-foreground/40">·</span>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {visibleEvents.length} events
              </span>
            </div>
          )}

          {/* Events list */}
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {loading && visibleEvents.length === 0 ? (
              <div className="flex flex-col gap-3 p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded bg-secondary animate-pulse" />
                      <div className="h-2.5 w-48 rounded bg-secondary animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Events appear here as users interact on the platform
                </p>
              </div>
            ) : (
              visibleEvents.map((event) => {
                const Icon = getNotificationIcon(event.type);
                const isUnread = !event.read;

                const handleNotificationClick = async () => {
                  if (isUnread) {
                    await handleMarkRead(event._id, null);
                  }
                  setOpen(false);

                  if (event.targetUrl) {
                    const url = event.targetUrl.trim();
                    if (/^https?:\/\//i.test(url)) {
                      window.open(url, "_blank", "noopener,noreferrer");
                    } else {
                      navigate(url.startsWith("/") ? url : `/${url}`);
                    }
                    return;
                  }

                  // Fallback intelligent navigation based on event type
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
                    default:
                      if (event.text?.toLowerCase().includes("deliverable") || event.text?.toLowerCase().includes("post") || event.text?.toLowerCase().includes("reel")) {
                        navigate("/collaborations");
                      }
                      break;
                  }
                };

                return (
                  <div
                    key={event._id}
                    onClick={handleNotificationClick}
                    className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/40 cursor-pointer ${
                      isUnread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-primary bg-primary/10">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isUnread
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {event.text || "Notification"}
                            {isUnread && (
                              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            {timeAgo(
                              event.createdAt || event.timestamp || Date.now()
                            )}
                          </p>
                        </div>
                        {/* Per-item actions — show on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {isUnread && (
                            <button
                              onClick={(e) => handleMarkRead(event._id, e)}
                              title="Mark as read"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(event._id, e)}
                            title="Delete"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with link to Full Notifications Page */}
          <div className="border-t border-border bg-card p-2 text-center shrink-0">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              View all notifications
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

