import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Users,
  Search,
  Check,
  X,
  MessageSquare,
  Clock,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const resolveImageUrl = (url) => {
  if (!url || url === "undefined" || url === "null") return null;
  if (url.startsWith("http")) return url;
  let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
  return `${apiUrl}${url}`;
};

export default function Connections() {
  const navigate = useNavigate();

  const { profile, user, loading } = useAuth();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(null);

  // --------------------------------------------------
  // PAGE TITLE
  // --------------------------------------------------

  useEffect(() => {
    document.title = "Connections — Pravixo";
  }, []);

  // --------------------------------------------------
  // AUTH CHECK
  // --------------------------------------------------

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // --------------------------------------------------
  // FETCH ALL CONNECTIONS
  // --------------------------------------------------

  const fetchConnections = async () => {
    if (!profile?._id || !profile?.role) return;

    try {
      setConnectionsLoading(true);
      const res = await api.get(
        `/connections/all?profileId=${profile._id}&role=${profile.role}`
      );
      setConnections(res.data?.data || []);
    } catch (error) {
      console.error("Fetch connections error:", error);
      toast.error(error?.response?.data?.message || "Failed to load connections.");
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD CONNECTIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!loading && user && profile) {
      fetchConnections();
      if (profile.role === "creator" && profile._id) {
        api.patch(`/connections/creator/${profile._id}/seen`).catch(() => {});
      }
    }
  }, [loading, user, profile]);

  // --------------------------------------------------
  // ACCEPT CONNECTION
  // --------------------------------------------------

  const openCollaborationPayment = async (connectionId) => {
    try {
      const res = await api.post(`/api/payments/collaboration/${connectionId}/order`);
      const orderData = res.data?.data || res.data;
      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to generate payment order.");
      }

      return new Promise((resolve, reject) => {
        const options = {
          key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: "Pravixo Platform",
          description: `Escrow Payment for Collaboration`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              await api.post(`/api/payments/collaboration/${connectionId}/verify`, {
                gatewayOrderId: response.razorpay_order_id,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature,
              });
              toast.success("Payment successful! Funds secured with Pravixo.");
              resolve(true);
            } catch (verifyErr) {
              console.error("Verification error:", verifyErr);
              toast.error(verifyErr?.response?.data?.message || "Payment verification failed.");
              reject(verifyErr);
            }
          },
          prefill: {
            name: profile?.fullName || "",
            email: profile?.email || "",
            contact: profile?.phone || "",
          },
          theme: {
            color: "#EC4899",
          },
          modal: {
            ondismiss: () => {
              toast.info("Payment window closed. You can pay anytime from the Chat header.");
              resolve(false);
            },
          },
        };

        if (!window.Razorpay) {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => {
            const rzp = new window.Razorpay(options);
            rzp.open();
          };
          document.body.appendChild(script);
        } else {
          const rzp = new window.Razorpay(options);
          rzp.open();
        }
      });
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Payment initiation failed.");
    }
  };

  const handleAccept = async (connectionId, partnerName) => {
    try {
      setActionLoading(connectionId);
      const res = await api.patch(`/connections/${connectionId}/accept`);
      const convId = res.data?.data?.conversationId || null;
      toast.success(`Approved connection with ${partnerName}!`);

      setConnections((prev) =>
        prev.map((connection) =>
          connection._id === connectionId
            ? { ...connection, status: "accepted", conversationId: convId || connection.conversationId }
            : connection
        )
      );

      if (profile?.role === "brand") {
        toast.info("Opening Pravixo Escrow payment gateway...");
        await openCollaborationPayment(connectionId);
      }
    } catch (error) {
      console.error("Accept connection error:", error);
      toast.error(error?.response?.data?.message || "Failed to accept connection request.");
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------
  // REJECT CONNECTION
  // --------------------------------------------------

  const handleReject = async (connectionId) => {
    try {
      setActionLoading(connectionId);
      await api.patch(`/connections/${connectionId}/reject`);
      toast.info("Connection request declined.");

      setConnections((prev) =>
        prev.map((connection) =>
          connection._id === connectionId
            ? { ...connection, status: "rejected" }
            : connection
        )
      );
    } catch (error) {
      console.error("Reject connection error:", error);
      toast.error(error?.response?.data?.message || "Failed to reject connection request.");
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------
  // DELETE CONNECTION REQUEST
  // --------------------------------------------------

  const handleDeleteConnection = async (connectionId) => {
    if (!window.confirm("Are you sure you want to delete this connection request?")) {
      return;
    }

    try {
      setActionLoading(connectionId);
      await api.delete(`/connections/${connectionId}`);
      toast.success("Connection request deleted.");

      setConnections((prev) => prev.filter((c) => c._id !== connectionId));
    } catch (error) {
      console.error("Delete connection error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete connection request.");
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------
  // SEARCH + FILTER
  // --------------------------------------------------


  const filteredConnections = useMemo(() => {
    if (!connections) return [];

    const searchValue = search.trim().toLowerCase();

    return connections.filter((connection) => {
      const partner = connection.otherProfile;

      const name =
        partner?.fullName?.toLowerCase() || "";

      const category =
        partner?.category?.toLowerCase() || "";

      const location =
        partner?.location?.toLowerCase() || "";

      const matchesSearch =
        !searchValue ||
        name.includes(searchValue) ||
        category.includes(searchValue) ||
        location.includes(searchValue);

      const matchesStatus =
        activeTab === "all" ||
        connection.status === activeTab;

      return matchesSearch && matchesStatus;
    });
  }, [connections, search, activeTab]);

  // --------------------------------------------------
  // AUTH / LOADING
  // --------------------------------------------------

  if (loading || !profile) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // --------------------------------------------------
  // ROLE TEXT
  // --------------------------------------------------

  const roleText =
    profile.role === "brand" ? "creators" : "brands";

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <Users className="h-8 w-8 text-primary" />
            Connections
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage collaborations, review pitches, and unlock
            direct messaging with {roleText}.
          </p>
        </div>
      </div>

      {/* FILTERS + SEARCH */}

      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex max-w-max flex-wrap gap-1 rounded-full border border-border/50 bg-secondary/35 p-1">
          {["all", "pending", "accepted", "rejected"].map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide capitalize transition-all ${
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder={`Search ${roleText}...`}
            className="rounded-full border-border bg-card pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* CONNECTION LIST */}

      {connectionsLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading your connections...
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/50 px-4 py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/35" />

          <h3 className="font-display text-base font-semibold">
            No connections found
          </h3>

          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {activeTab === "all"
              ? `You don't have any connection requests with ${roleText} yet.`
              : `No connections with status "${activeTab}" match your query.`}
          </p>

          {activeTab === "all" && (
            <Link to="/browse" className="mt-4">
              <Button
                size="sm"
                className="rounded-full border-0 gradient-sunset text-white shadow-glow"
              >
                Browse {roleText}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="max-h-[680px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredConnections.map((connection) => {
              const partner = connection.otherProfile;

              if (!partner) return null;

              const isActionLoading =
                actionLoading === connection._id;

              const isPartnerVerified =
                partner.verificationStatus === "verified" ||
                partner.isVerified === true;

              return (
                <div
                  key={connection._id}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-elevated"
                >
                  {/* PROFILE */}

                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <img src={
                            resolveImageUrl(partner.avatarUrl) ||
                            `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
                              partner.fullName || "User"
                            )}`
                          }
                          alt={partner.fullName || "User"}
                          className="h-12 w-12 flex-shrink-0 rounded-2xl border border-border/50 object-cover shadow-sm"
                         onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback"; }} />

                        <div className="min-w-0">
                          <Link
                            to={`/influencer/${partner._id}`}
                            className="flex items-center gap-1 font-display text-sm font-bold hover:text-primary truncate"
                          >
                            <span className="truncate">{partner.fullName}</span>
                            {isPartnerVerified && (
                              <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 inline-block fill-blue-500/15" title="Verified Profile" />
                            )}
                          </Link>

                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {partner.category || "General"} ·{" "}
                            {partner.location || "India"}
                          </p>
                        </div>
                      </div>

                      {/* STATUS & DELETE */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          className={`rounded-full border-0 px-2 py-0.5 text-[9px] font-medium tracking-wide capitalize ${
                            connection.status === "accepted"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : connection.status === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {connection.status}
                        </Badge>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => handleDeleteConnection(connection._id)}
                          className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition"
                          title="Delete connection request"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* PITCH */}

                    <div className="mt-4 rounded-2xl border border-border/40 bg-secondary/40 p-3.5 text-xs italic leading-relaxed text-muted-foreground/95">
                      "{connection.pitch || "No pitch provided."}"
                    </div>
                  </div>

                  {/* FOOTER */}

                  <div className="mt-5 flex flex-col justify-between gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center">
                    <span className="text-[10px] text-muted-foreground">
                      Sent on{" "}
                      {connection.createdAt
                        ? new Date(
                            connection.createdAt
                          ).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Unknown date"}
                    </span>

                    <div className="flex gap-2 self-stretch sm:self-auto">
                      {/* BRAND PENDING */}

                      {connection.status === "pending" &&
                        profile.role === "brand" && (
                          <>
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              className="h-8 flex-1 rounded-full border-0 bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 sm:flex-none"
                              onClick={() =>
                                handleAccept(
                                  connection._id,
                                  partner.fullName
                                )
                              }
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />

                              {isActionLoading
                                ? "Processing..."
                                : "Accept"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActionLoading}
                              className="h-8 flex-1 rounded-full border-border px-4 text-xs font-semibold hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive sm:flex-none"
                              onClick={() =>
                                handleReject(connection._id)
                              }
                            >
                              <X className="mr-1.5 h-3.5 w-3.5" />
                              Decline
                            </Button>
                          </>
                        )}

                      {/* ACCEPTED */}

                      {connection.status === "accepted" && (
                        <Button
                          size="sm"
                          className="h-8 w-full rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-95 sm:w-auto"
                          onClick={() => {
                            if (connection.conversationId) {
                              navigate(`/messages?conversationId=${connection.conversationId}`);
                            } else if (partner?._id) {
                              navigate(`/messages?recipientId=${partner._id}`);
                            } else {
                              navigate("/messages");
                            }
                          }}
                        >
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          Chat
                        </Button>
                      )}

                      {/* CREATOR PENDING */}

                      {connection.status === "pending" &&
                        profile.role === "creator" && (
                          <span className="flex items-center gap-1.5 py-1 text-xs font-medium text-amber">
                            <Clock className="h-3.5 w-3.5" />
                            Awaiting Brand Review
                          </span>
                        )}

                      {/* REJECTED */}

                      {connection.status === "rejected" && (
                        <span className="py-1 text-xs font-medium text-destructive">
                          Declined
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}