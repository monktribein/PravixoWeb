import { useEffect, useState, useMemo, useCallback } from "react";
import { resolveImageUrl } from "@/lib/utils";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  X,
  ExternalLink,
  FileText,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Clock,
  Eye,
  User,
  Mail,
  MapPin,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  Building2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [];
  pages.push(1);
  if (currentPage > 3) {
    pages.push("...");
  }
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) {
    pages.push("...");
  }
  pages.push(totalPages);
  return pages;
}

/* ──────────────────────────────────────────────
   BRAND REVIEW MODAL
   ────────────────────────────────────────────── */
function BrandReviewModal({ brand, onClose, onApprove, onReject, onReset, onSendMessage }) {
  const [msgMode, setMsgMode] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);

  if (!brand) return null;

  const hasGst = !!brand.gstNumber;
  const hasGstCert = !!brand.gstCertificateUrl;
  const hasHandle = !!brand.handle;
  const hasWebsite = !!brand.website;
  const hasCategory = !!brand.category;
  const hasLocation = !!brand.location;
  const hasCompanySize = !!brand.companySize;

  const missing = [];
  if (!hasGst) missing.push("GST Number");
  if (!hasGstCert) missing.push("GST Certificate");
  if (!hasHandle) missing.push("Handle / Username");
  if (!hasCategory) missing.push("Category");
  if (!hasWebsite) missing.push("Website");
  if (!hasLocation) missing.push("Location");
  if (!hasCompanySize) missing.push("Company Size");

  const allComplete = missing.length === 0;

  const handleApprove = async () => {
    setApproving(true);
    await onApprove();
    setApproving(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    setSending(true);
    await onSendMessage(msgText);
    setSending(false);
    setMsgText("");
    setMsgMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-auto rounded-3xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500/10 to-primary/10 border-b border-border px-4 sm:px-6 py-4 sm:py-5 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={resolveImageUrl(brand.avatarUrl, brand.fullName || "Brand", brand.gender, "brand")}
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border-2 border-border object-cover shadow-xs shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = resolveImageUrl("", brand.fullName || "Brand", brand.gender, "brand");
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg sm:text-xl font-bold truncate">{brand.fullName}</h3>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="truncate">{brand.handle ? `@${brand.handle.replace(/^@+/, '')}` : "No handle set"}</span>
                <span>•</span>
                <span className="capitalize font-medium text-primary">Brand</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Completeness Banner */}
          {allComplete ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                All required details are complete — ready to approve!
              </span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400">
                Missing: {missing.join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Profile Details */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Brand Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <InfoRow icon={Building2} label="Brand Name" value={brand.fullName} />
              <InfoRow icon={Mail} label="Email" value={brand.email} />
              <InfoRow icon={MapPin} label="Location" value={brand.location} missing="Not set" />
              <InfoRow icon={FileText} label="Category" value={brand.category} missing="Not set" />
              <InfoRow icon={User} label="Handle" value={brand.handle ? `@${brand.handle.replace(/^@+/, '')}` : null} missing="Not set" />
              <InfoRow icon={Building2} label="Company Size" value={brand.companySize} missing="Not set" />
              <InfoRow icon={ExternalLink} label="Website" value={brand.website} missing="Not set" />
              <InfoRow label="GST Number" icon={FileText}
                value={brand.gstNumber || null}
                missing="Not provided"
              />
            </div>
          </div>

          {/* KYC / Documents */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              KYC Documents
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <DocRow label="GST Number" value={brand.gstNumber} hasDoc={hasGst} isText />
              <DocRow label="GST Certificate" url={brand.gstCertificateUrl} hasDoc={hasGstCert} />
            </div>
          </div>

          {/* Message Mode */}
          {msgMode && (
            <form onSubmit={handleSend} className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                📩 Send a message to {brand.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                This message will appear in the brand's in-app notification center.
              </p>
              <textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="e.g. Please upload a valid GST certificate to complete your verification."
                rows={3}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                required
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-xs"
                  onClick={() => { setMsgMode(false); setMsgText(""); }}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="rounded-full bg-primary text-primary-foreground text-xs"
                  disabled={sending || !msgText.trim()}>
                  {sending ? "Sending…" : <><Send className="h-3.5 w-3.5 mr-1.5" /> Send Message</>}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center gap-2 justify-between bg-card shrink-0">
          <Button size="sm" variant="outline"
            className="rounded-full gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs sm:text-sm"
            onClick={() => setMsgMode((v) => !v)}>
            <Send className="h-3.5 w-3.5" />
            {msgMode ? "Hide Message" : "Send Message"}
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full text-xs sm:text-sm" onClick={onClose}>
              Close
            </Button>
            {brand.verificationStatus !== "verified" && (
              <Button size="sm"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs sm:text-sm"
                onClick={handleApprove} disabled={approving}>
                <ShieldCheck className="h-4 w-4" />
                {approving ? "Approving…" : (allComplete ? "Approve ✓" : "Approve Anyway")}
              </Button>
            )}
            {brand.verificationStatus !== "rejected" && (
              <Button size="sm" variant="destructive" className="rounded-full font-semibold gap-1.5 text-xs sm:text-sm"
                onClick={() => {
                  onClose();
                  onReject();
                }}>
                <X className="h-4 w-4" /> Reject
              </Button>
            )}
            {brand.verificationStatus !== "pending" && (
              <Button size="sm" variant="outline" className="rounded-full text-xs sm:text-sm gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onClose();
                  onReset();
                }}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset to Pending
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Helper sub-components */
function InfoRow({ icon: Icon, label, value, missing = "Not provided" }) {
  const hasValue = value && value !== "" && value !== "0" && value !== 0;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2">
      {Icon && <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xs sm:text-sm font-medium truncate ${hasValue ? "text-foreground" : "text-muted-foreground/50 italic"}`}>
          {hasValue ? value : missing}
        </p>
      </div>
    </div>
  );
}

function DocRow({ label, url, hasDoc, value, isText }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${hasDoc ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
      <FileText className={`h-3.5 w-3.5 shrink-0 ${hasDoc ? "text-emerald-500" : "text-red-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {hasDoc ? (
          isText ? (
            <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 font-mono truncate">{value}</p>
          ) : (
            <a href={url} target="_blank" rel="noreferrer"
              className="text-xs sm:text-sm font-medium text-emerald-600 hover:underline inline-flex items-center gap-1 truncate">
              View Document <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )
        ) : (
          <p className="text-xs font-medium text-red-500 italic">Not uploaded</p>
        )}
      </div>
      {hasDoc ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
    </div>
  );
}

function StatusBadge({ status }) {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1 w-fit text-xs px-2 py-0.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold flex items-center gap-1 w-fit text-xs px-2 py-0.5">
          <ShieldAlert className="h-3.5 w-3.5" /> Rejected
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1 w-fit text-xs px-2 py-0.5">
          <Clock className="h-3.5 w-3.5" /> Pending
        </Badge>
      );
    case "unverified":
    default:
      return (
        <Badge className="bg-muted text-muted-foreground border border-border font-medium flex items-center gap-1 w-fit text-xs px-2 py-0.5">
          <ShieldQuestion className="h-3.5 w-3.5" /> Unverified
        </Badge>
      );
  }
}

/* ──────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────── */
export default function BrandRequests() {
  useEffect(() => {
    document.title = "Brand Verification Requests — Pravixo Admin";
  }, []);

  const [pendingBrands, setPendingBrands] = useState(null);
  const [historyBrands, setHistoryBrands] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [pendingRes, historyRes] = await Promise.all([
        api.get("/admin/verification/brands/pending"),
        api.get("/admin/verification/brands/history"),
      ]);

      if (pendingRes.data.success) setPendingBrands(pendingRes.data.data || []);
      if (historyRes.data.success) setHistoryBrands(historyRes.data.data || []);
      if (isManual) toast.success("Brand verification records refreshed");
    } catch (err) {
      console.error("Failed to fetch brand requests:", err);
      if (isManual) toast.error("Failed to refresh records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id, status, name, reason = "") => {
    try {
      await api.patch(`/admin/profiles/${id}/verification`, { status, rejectReason: reason });
      toast.success(`Brand ${name} status updated to ${status === "verified" ? "Verified ✓" : status}.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update verification status");
    }
  };

  const [reviewTarget, setReviewTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    await handleAction(rejectTarget.id, "rejected", rejectTarget.name, rejectReason);
    setRejectTarget(null);
    setRejectReason("");
  };

  const handleSendMessage = async (message) => {
    if (!reviewTarget) return;
    try {
      await api.post(`/admin/profiles/${reviewTarget._id}/message`, { message });
      toast.success("Message sent to brand's notification center.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    }
  };

  // Combine and deduplicate
  const allBrands = useMemo(() => {
    const map = new Map();
    (historyBrands || []).forEach((b) => map.set(b._id, b));
    (pendingBrands || []).forEach((b) => map.set(b._id, { ...b, verificationStatus: "pending" }));
    return Array.from(map.values());
  }, [pendingBrands, historyBrands]);

  // Counts
  const counts = useMemo(() => {
    const c = { all: allBrands.length, pending: 0, verified: 0, rejected: 0, unverified: 0 };
    allBrands.forEach((item) => {
      const st = item.verificationStatus || "unverified";
      if (c[st] !== undefined) c[st]++;
      else c.unverified++;
    });
    return c;
  }, [allBrands]);

  // Filtered & Sorted
  const filteredBrands = useMemo(() => {
    let list = allBrands.filter((item) => {
      const st = item.verificationStatus || "unverified";
      if (activeTab !== "all" && st !== activeTab) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const name = (item.fullName || "").toLowerCase();
        const handle = (item.handle || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const gst = (item.gstNumber || "").toLowerCase();
        return name.includes(query) || handle.includes(query) || email.includes(query) || gst.includes(query);
      }

      return true;
    });

    list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sortBy === "newest" ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [allBrands, activeTab, search, sortBy]);

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, sortBy]);

  const totalItems = filteredBrands.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedBrands = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredBrands.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBrands, safeCurrentPage, itemsPerPage]);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-primary" />
            Brand Verification
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review GST documents submitted by brands and manage verification credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex max-w-full overflow-x-auto gap-1 rounded-full border border-border/50 bg-secondary/35 p-1 no-scrollbar">
          {[
            { id: "all", label: `All (${counts.all})` },
            { id: "pending", label: `Pending (${counts.pending})` },
            { id: "verified", label: `Verified (${counts.verified})` },
            { id: "rejected", label: `Rejected (${counts.rejected})` },
            { id: "unverified", label: `Unverified (${counts.unverified})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search brand, GST, handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-border bg-card pl-9 pr-4 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8.5 rounded-full border border-border bg-card px-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (< lg) */}
      <div className="block lg:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </div>
          ))
        ) : filteredBrands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No brands found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? `No results matching "${search}" in ${activeTab}` : "No brand records in this tab."}
            </p>
          </div>
        ) : (
          paginatedBrands.map((b) => (
            <div
              key={b._id}
              className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-border/80 transition-all"
            >
              {/* Brand Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={resolveImageUrl(b.avatarUrl, b.fullName || "Brand", b.gender, "brand")}
                    alt=""
                    className="h-11 w-11 rounded-xl border border-border object-cover shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = resolveImageUrl("", b.fullName || "Brand", b.gender, "brand");
                    }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{b.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.handle ? `@${b.handle.replace(/^@+/, '')}` : "No handle"}
                    </p>
                  </div>
                </div>
                <StatusBadge status={b.verificationStatus} />
              </div>

              {/* GST & Docs */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60 text-xs">
                <span className="font-mono text-muted-foreground">
                  GST: <span className="font-semibold text-foreground">{b.gstNumber || "Not set"}</span>
                </span>

                <span className="text-border">•</span>

                {b.gstCertificateUrl ? (
                  <a
                    href={b.gstCertificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    <FileText className="h-3.5 w-3.5" /> Certificate <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground/70 inline-flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-400" /> Certificate
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  size="sm"
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3.5 gap-1 font-semibold cursor-pointer"
                  onClick={() => setReviewTarget(b)}
                >
                  <Eye className="h-3.5 w-3.5" /> Review Details
                </Button>

                {b.verificationStatus === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs h-8 px-3 border-border hover:bg-destructive/10 hover:text-destructive gap-1 font-semibold cursor-pointer"
                    onClick={() => setRejectTarget({ id: b._id, name: b.fullName })}
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                )}

                {b.verificationStatus !== "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-xs h-8 px-3 text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    onClick={() => handleAction(b._id, "pending", b.fullName)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-2 px-1 text-xs text-muted-foreground">
            <span>
              Page {safeCurrentPage} of {totalPages} ({totalItems} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="h-8 rounded-full px-3 text-xs gap-1 border-border cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="h-8 rounded-full px-3 text-xs gap-1 border-border cursor-pointer disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW (lg+) */}
      <div className="hidden lg:block rounded-3xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 font-semibold">Brand</TableHead>
                <TableHead className="font-semibold">Handle</TableHead>
                <TableHead className="font-semibold">GST Number</TableHead>
                <TableHead className="font-semibold">Certificate</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right pr-6 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right pr-6">
                      <Skeleton className="h-8 w-24 rounded-full ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredBrands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">No brand records found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? `No results matching "${search}" in ${activeTab}` : "No records found in this category."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBrands.map((b) => (
                  <TableRow key={b._id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveImageUrl(b.avatarUrl, b.fullName || "Brand", b.gender, "brand")}
                          alt=""
                          className="h-9 w-9 rounded-full border border-border object-cover shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = resolveImageUrl("", b.fullName || "Brand", b.gender, "brand");
                          }}
                        />
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate block">
                            {b.fullName}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {b.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {b.handle ? `@${b.handle.replace(/^@+/, '')}` : "—"}
                    </TableCell>

                    <TableCell className="text-sm font-medium font-mono">
                      {b.gstNumber || (
                        <span className="text-red-400 font-sans not-italic font-normal text-xs inline-flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Not provided
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {b.gstCertificateUrl ? (
                        <a
                          href={b.gstCertificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Certificate <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium">
                          <XCircle className="h-3.5 w-3.5" /> No file
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={b.verificationStatus} />
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 px-3.5 text-xs gap-1 cursor-pointer"
                          onClick={() => setReviewTarget(b)}
                        >
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Button>

                        {b.verificationStatus === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-semibold h-8 px-3 text-xs gap-1 cursor-pointer"
                            onClick={() => setRejectTarget({ id: b._id, name: b.fullName })}
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1 cursor-pointer"
                            title="Reset to Pending"
                            onClick={() => handleAction(b._id, "pending", b.fullName)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredBrands.length > 0 && (
          <div className="border-t border-border px-6 py-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10">
            <div>
              Showing <strong className="text-foreground font-semibold">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{" "}
              <strong className="text-foreground font-semibold">{Math.min(safeCurrentPage * itemsPerPage, totalItems)}</strong> of{" "}
              <strong className="text-foreground font-semibold">{totalItems}</strong> brands
              {totalItems !== counts.all && ` (filtered from ${counts.all})`}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-8 rounded-full px-2.5 text-xs gap-1 border-border hover:bg-secondary disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-1.5 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 min-w-[32px] px-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          safeCurrentPage === p
                            ? "bg-primary text-white shadow-xs"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="h-8 rounded-full px-2.5 text-xs gap-1 border-border hover:bg-secondary disabled:opacity-40 cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── REVIEW MODAL ── */}
      {reviewTarget && (
        <BrandReviewModal
          brand={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onApprove={async () => {
            await handleAction(reviewTarget._id, "verified", reviewTarget.fullName);
            setReviewTarget(null);
          }}
          onReject={() => {
            const target = reviewTarget;
            setReviewTarget(null);
            setRejectTarget({ id: target._id, name: target.fullName });
          }}
          onReset={async () => {
            await handleAction(reviewTarget._id, "pending", reviewTarget.fullName);
            setReviewTarget(null);
          }}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* ── REJECT MODAL ── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-display text-xl font-bold text-foreground mb-2">Reject {rejectTarget.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Please provide a reason for rejection. This will be sent to the brand.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Document is blurry, GST does not match, etc."
                className="w-full h-24 rounded-xl border border-border bg-secondary/50 p-3 text-xs sm:text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/20 mb-4"
                required
              />
              <div className="flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full text-xs"
                  onClick={() => {
                    setRejectTarget(null);
                    setRejectReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" className="rounded-full text-xs">
                  Reject Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}