import { useEffect, useState, useMemo } from "react";
import { resolveImageUrl } from "@/lib/utils";
import api from "@/lib/axios";
import {
  Megaphone,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Building2,
  MapPin,
  Calendar,
  IndianRupee,
  Layers,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Tag,
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

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

export function CampaignsPage() {
  useEffect(() => {
    document.title = "Campaigns Verification — Pravixo Admin";
  }, []);

  const [campaigns, setCampaigns] = useState(null);
  const [statusFilter, setStatusFilter] = useState("PENDING_VERIFICATION");
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [rejectingCampaign, setRejectingCampaign] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [cleaningTests, setCleaningTests] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const res = await api.get("/admin/campaigns");
      if (res.data.success) {
        setCampaigns(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns", err);
      toast.error("Failed to load campaigns.");
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleApprove = async (campaignId) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/campaigns/${campaignId}/verify`, {
        status: "APPROVED",
      });
      if (res.data.success) {
        toast.success("Campaign approved! It is now visible to Creators.");
        setSelectedCampaign(null);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve campaign.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (campaignId) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/campaigns/${campaignId}/verify`, {
        status: "REJECTED",
        verificationFeedback: rejectionReason.trim(),
      });
      if (res.data.success) {
        toast.success("Campaign marked as Rejected.");
        setRejectingCampaign(null);
        setSelectedCampaign(null);
        setRejectionReason("");
        fetchCampaigns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject campaign.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetToPending = async (campaignId) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/campaigns/${campaignId}/verify`, {
        status: "PENDING_VERIFICATION",
      });
      if (res.data.success) {
        toast.success("Campaign status reset back to Pending Verification.");
        setSelectedCampaign(null);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset campaign status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/campaigns/${campaignId}`);
      if (res.data.success) {
        toast.success("Campaign permanently deleted from database.");
        setDeletingCampaign(null);
        setSelectedCampaign(null);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete campaign.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanupTestCampaigns = async () => {
    setCleaningTests(true);
    try {
      const res = await api.post("/admin/campaigns/cleanup-test");
      if (res.data.success) {
        toast.success(res.data.message || "Test campaigns cleaned successfully.");
        fetchCampaigns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cleanup test campaigns.");
    } finally {
      setCleaningTests(false);
    }
  };

  const filteredCampaigns = campaigns?.filter((c) => {
    const matchesStatus = !statusFilter || c.status === statusFilter;
    const titleLower = (c.title || "").toLowerCase();
    const brandLower = (c.brandId?.fullName || "").toLowerCase();
    const catLower = (c.category || "").toLowerCase();
    const searchLower = search.toLowerCase();

    const matchesSearch =
      !search ||
      titleLower.includes(searchLower) ||
      brandLower.includes(searchLower) ||
      catLower.includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // Pagination (10 campaigns per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const totalItems = filteredCampaigns ? filteredCampaigns.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCampaigns = useMemo(() => {
    if (!filteredCampaigns) return null;
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCampaigns, safeCurrentPage, itemsPerPage]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
            <Clock className="h-3 w-3 mr-1" /> Closed
          </Badge>
        );
      case "PENDING_VERIFICATION":
      default:
        return (
          <Badge variant="outline" className="bg-amber/10 text-amber border-amber/20 animate-pulse">
            <Clock className="h-3 w-3 mr-1" /> Pending Verification
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" /> Campaign Verification
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review campaigns submitted by Brands. Approve them to make them discoverable to Creators or reject if guidelines are not met.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCleanupTestCampaigns}
            disabled={cleaningTests}
            className="rounded-xl text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            title="Clean all dummy and test campaigns from database"
          >
            {cleaningTests ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            )}
            Clean Test Campaigns
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { label: "Pending", fullLabel: "Pending Verification", val: "PENDING_VERIFICATION" },
            { label: "Approved", fullLabel: "Approved", val: "APPROVED" },
            { label: "Rejected", fullLabel: "Rejected", val: "REJECTED" },
            { label: "All", fullLabel: "All Campaigns", val: "" },
          ].map((tab) => (
            <Button
              key={tab.val}
              size="sm"
              variant={statusFilter === tab.val ? "default" : "outline"}
              className={`rounded-full text-xs px-3 sm:px-4 h-8 sm:h-9 shrink-0 ${
                statusFilter === tab.val ? "gradient-sunset border-0 text-white shadow-glow" : ""
              }`}
              onClick={() => setStatusFilter(tab.val)}
            >
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.fullLabel}</span>
              {campaigns && (
                <span className="ml-1 opacity-80">
                  (
                  {tab.val
                    ? campaigns.filter((c) => c.status === tab.val).length
                    : campaigns.length}
                  )
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns, brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Mobile Campaigns Card List (Visible on < md) */}
      <div className="mt-4 space-y-3 md:hidden">
        {!filteredCampaigns ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground rounded-2xl border border-border bg-card p-4">
            No campaigns found in this view.
          </div>
        ) : (
          paginatedCampaigns.map((camp) => (
            <div key={camp._id} className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground leading-tight">
                    {camp.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">{camp.brandId?.fullName || "Unknown Brand"}</span>
                  </div>
                </div>
                <div>{getStatusBadge(camp.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Category</span>
                  <Badge variant="secondary" className="text-[10px] rounded-md font-medium mt-0.5">
                    {camp.category}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Total Budget</span>
                  <span className="font-bold text-foreground">₹{Number(camp.totalBudget || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Creator Budget</span>
                  <span className="text-muted-foreground font-medium">
                    ₹{Number(camp.minBudgetPerCreator || 0).toLocaleString("en-IN")} - ₹{Number(camp.maxBudgetPerCreator || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 rounded-xl text-xs"
                  onClick={() => setSelectedCampaign(camp)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Details
                </Button>
                {camp.status === "PENDING_VERIFICATION" ? (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={() => handleApprove(camp._id)}
                      disabled={actionLoading}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 rounded-xl text-xs px-3"
                      onClick={() => setRejectingCampaign(camp)}
                      disabled={actionLoading}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs px-2.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border-amber-500/20"
                    onClick={() => handleResetToPending(camp._id)}
                    disabled={actionLoading}
                    title="Reset back to Pending Verification"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-xl text-xs px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setDeletingCampaign(camp)}
                  disabled={actionLoading}
                  title="Delete campaign permanently"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
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

      {/* Desktop Campaigns Table (Visible on md+) */}
      <div className="hidden md:block mt-6 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow className="bg-secondary/20">
                <TableHead className="font-semibold text-xs">Campaign</TableHead>
                <TableHead className="font-semibold text-xs">Brand</TableHead>
                <TableHead className="font-semibold text-xs">Category & Location</TableHead>
                <TableHead className="font-semibold text-xs">Budget</TableHead>
                <TableHead className="font-semibold text-xs">Per Creator Budget</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredCampaigns ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    No campaigns found in this view.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCampaigns.map((camp) => (
                  <TableRow key={camp._id} className="hover:bg-secondary/10">
                    <TableCell>
                      <div>
                        <span className="font-semibold text-sm text-foreground block">
                          {camp.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[220px]">
                          {camp.description || "No description provided"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img
                          src={resolveImageUrl(camp.brandId?.avatarUrl, camp.brandId?.fullName || "Brand", camp.brandId?.gender, "brand")}
                          alt=""
                          className="h-7 w-7 rounded-lg object-cover border border-border shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = resolveImageUrl("", camp.brandId?.fullName || "Brand", camp.brandId?.gender, "brand");
                          }}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate block">
                            {camp.brandId?.fullName || "Unknown Brand"}
                          </span>
                          {camp.brandId?.email && (
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {camp.brandId.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <Badge variant="secondary" className="text-[10px] rounded-md font-medium">
                          {camp.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {camp.location || "Pan India"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-foreground">
                        ₹{Number(camp.totalBudget || 0).toLocaleString("en-IN")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        ₹{Number(camp.minBudgetPerCreator || 0).toLocaleString("en-IN")} - ₹{Number(camp.maxBudgetPerCreator || 0).toLocaleString("en-IN")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(camp.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => setSelectedCampaign(camp)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Details
                        </Button>
                        {camp.status === "PENDING_VERIFICATION" ? (
                          <>
                            <Button
                              size="sm"
                              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5"
                              onClick={() => handleApprove(camp._id)}
                              disabled={actionLoading}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 rounded-lg text-xs px-2.5"
                              onClick={() => setRejectingCampaign(camp)}
                              disabled={actionLoading}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs px-2.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border-amber-500/20"
                            onClick={() => handleResetToPending(camp._id)}
                            disabled={actionLoading}
                            title="Reset back to Pending Verification"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-xs px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setDeletingCampaign(camp)}
                          disabled={actionLoading}
                          title="Delete campaign"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredCampaigns && filteredCampaigns.length > 0 && (
          <div className="border-t border-border px-6 py-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10">
            <div>
              Showing <strong className="text-foreground font-semibold">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{" "}
              <strong className="text-foreground font-semibold">{Math.min(safeCurrentPage * itemsPerPage, totalItems)}</strong> of{" "}
              <strong className="text-foreground font-semibold">{totalItems}</strong> campaigns
              {campaigns && totalItems !== campaigns.length && ` (filtered from ${campaigns.length})`}
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

      {/* Campaign Details Modal */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="sm:max-w-2xl rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" /> Campaign Details
              </DialogTitle>
              {selectedCampaign && getStatusBadge(selectedCampaign.status)}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Review all campaign information provided by the brand.
            </DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
              {/* Brand Header */}
              <div className="flex items-center gap-3 p-3 bg-secondary/15 rounded-2xl border border-border/50">
                <img
                  src={resolveImageUrl(selectedCampaign.brandId?.avatarUrl, selectedCampaign.brandId?.fullName || "Brand", selectedCampaign.brandId?.gender, "brand")}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover border border-border shrink-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = resolveImageUrl("", selectedCampaign.brandId?.fullName || "Brand", selectedCampaign.brandId?.gender, "brand");
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">
                    {selectedCampaign.brandId?.fullName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedCampaign.brandId?.email} · {selectedCampaign.brandId?.handle || "Brand Account"}
                  </p>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Campaign Title
                </label>
                <p className="text-base font-bold text-foreground">
                  {selectedCampaign.title}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-background/50 p-3 rounded-xl border border-border/40">
                  {selectedCampaign.description || "No description provided."}
                </p>
              </div>

              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <IndianRupee className="h-3 w-3 text-primary" /> Total Budget
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    ₹{Number(selectedCampaign.totalBudget || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <IndianRupee className="h-3 w-3 text-primary" /> Creator Budget
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    ₹{Number(selectedCampaign.minBudgetPerCreator || 0).toLocaleString("en-IN")} - ₹{Number(selectedCampaign.maxBudgetPerCreator || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Calendar className="h-3 w-3 text-primary" /> Start Date
                  </span>
                  <p className="text-xs font-medium text-foreground">
                    {format(new Date(selectedCampaign.startDate || Date.now()), "dd MMM yyyy")}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Calendar className="h-3 w-3 text-primary" /> End Date
                  </span>
                  <p className="text-xs font-medium text-foreground">
                    {format(new Date(selectedCampaign.endDate || Date.now()), "dd MMM yyyy")}
                  </p>
                </div>
              </div>

              {/* Extra Campaign Details: Category, Location, Min Followers Requirement */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Tag className="h-3 w-3 text-primary" /> Category
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    {selectedCampaign.category || "All Categories"}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <MapPin className="h-3 w-3 text-primary" /> Location
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    {selectedCampaign.location || "Pan India"}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Users className="h-3 w-3 text-primary" /> Min Followers
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    {selectedCampaign.minFollowers > 0
                      ? `${selectedCampaign.minFollowers >= 1000 ? `${(selectedCampaign.minFollowers / 1000).toFixed(0)}k+` : selectedCampaign.minFollowers} followers`
                      : "No minimum required"}
                  </p>
                </div>
              </div>

              {/* Condition-Based Tiers / Perk Options Breakdown */}
              {selectedCampaign.tiers && selectedCampaign.tiers.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Condition-Based Options & Perks ({selectedCampaign.tiers.length} Options)
                  </label>
                  <div className="space-y-2">
                    {selectedCampaign.tiers.map((tier, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-3 bg-secondary/20 border border-border/60 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] border border-primary/20">
                            Option {tIdx + 1}
                          </span>
                          <span className="font-bold text-foreground">
                            {tier.minFollowers >= 1000 ? `${(tier.minFollowers / 1000).toFixed(0)}k+` : tier.minFollowers} Followers
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {tier.reward || tier.perks || "Standard Reward"}
                          </p>
                          {tier.cashAmount > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold block">
                              + ₹{tier.cashAmount.toLocaleString("en-IN")} Cash
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3 text-primary" /> Deliverables Breakdown
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">Reels</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaign.deliverables?.reels || 0}</span>
                  </div>
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">Posts</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaign.deliverables?.posts || 0}</span>
                  </div>
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">Stories</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaign.deliverables?.stories || 0}</span>
                  </div>
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">Videos</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaign.deliverables?.videos || 0}</span>
                  </div>
                </div>
                {selectedCampaign.deliverables?.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    Notes: {selectedCampaign.deliverables.notes}
                  </p>
                )}
              </div>

              {selectedCampaign.verificationFeedback && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600">
                  <strong>Rejection Feedback:</strong> {selectedCampaign.verificationFeedback}
                </div>
              )}

              <DialogFooter className="pt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={() => setSelectedCampaign(null)}
                >
                  Close
                </Button>
                {selectedCampaign.status !== "PENDING_VERIFICATION" && (
                  <Button
                    variant="outline"
                    className="rounded-full text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border-amber-500/30"
                    onClick={() => handleResetToPending(selectedCampaign._id)}
                    disabled={actionLoading}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to Pending
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="rounded-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    const c = selectedCampaign;
                    setSelectedCampaign(null);
                    setDeletingCampaign(c);
                  }}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
                {selectedCampaign.status === "PENDING_VERIFICATION" && (
                  <>
                    <Button
                      variant="destructive"
                      className="rounded-full flex-1 text-xs"
                      onClick={() => setRejectingCampaign(selectedCampaign)}
                      disabled={actionLoading}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Reject Campaign
                    </Button>
                    <Button
                      className="rounded-full flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-glow"
                      onClick={() => handleApprove(selectedCampaign._id)}
                      disabled={actionLoading}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve Campaign
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectingCampaign} onOpenChange={(open) => !open && setRejectingCampaign(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-destructive flex items-center gap-1.5">
              <XCircle className="h-5 w-5" /> Reject Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a reason for rejecting this campaign. The brand will be notified with this feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea
              placeholder="e.g. Budget is too low for the required deliverables, or guidelines violation..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="text-xs rounded-xl resize-none"
            />
            <DialogFooter className="pt-2 flex gap-2">
              <Button
                variant="outline"
                className="rounded-full flex-1 text-xs"
                onClick={() => setRejectingCampaign(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-full flex-1 text-xs font-semibold"
                onClick={() => handleReject(rejectingCampaign._id)}
                disabled={actionLoading}
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCampaign} onOpenChange={(open) => !open && setDeletingCampaign(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Delete Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this campaign? This will remove all associated tasks and applications from the entire database.
            </DialogDescription>
          </DialogHeader>
          {deletingCampaign && (
            <div className="p-3 bg-secondary/20 rounded-xl border border-border/50 text-xs">
              <p className="font-bold text-foreground">{deletingCampaign.title}</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Brand: {deletingCampaign.brandId?.fullName || "Unknown Brand"} · Status: {deletingCampaign.status}
              </p>
            </div>
          )}
          <DialogFooter className="pt-2 flex gap-2">
            <Button
              variant="outline"
              className="rounded-full flex-1 text-xs"
              onClick={() => setDeletingCampaign(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full flex-1 text-xs font-semibold"
              onClick={() => handleDeleteCampaign(deletingCampaign._id)}
              disabled={actionLoading}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CampaignsPage;
