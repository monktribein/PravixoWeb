import { useState, useEffect, useMemo } from "react";
import { resolveImageUrl } from "@/lib/utils";
import {
  Tag,
  Trash2,
  Clock,
  Search,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Shield,
  CheckCircle2,
  XCircle,
  Check,
  Send,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Rejection modal state
  const [offerToReject, setOfferToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Soft-delete modal state
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Approving state
  const [approvingId, setApprovingId] = useState(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/offers/admin/all");
      if (res.data?.success) {
        setOffers(res.data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load offers.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleApproveOffer = async (offerId) => {
    try {
      setApprovingId(offerId);
      const res = await api.put(`/offers/${offerId}/approve`);
      if (res.data?.success) {
        toast.success(res.data.message || "Offer approved and broadcasted!");
        fetchOffers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve offer.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectOffer = async () => {
    if (!offerToReject) return;
    try {
      setRejecting(true);
      const res = await api.put(`/offers/${offerToReject._id}/reject`, {
        reason: rejectReason.trim() || "Offer does not meet platform guidelines.",
      });
      if (res.data?.success) {
        toast.success("Offer rejected and creator/brand notified.");
        setOfferToReject(null);
        setRejectReason("");
        fetchOffers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject offer.");
    } finally {
      setRejecting(false);
    }
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/offers/${offerToDelete._id}`);
      if (res.data?.success) {
        toast.success(res.data.message || "Offer soft-deleted successfully.");
        setOfferToDelete(null);
        fetchOffers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete offer.");
    } finally {
      setDeleting(false);
    }
  };

  const pendingCount = offers.filter((o) => o.status === "pending_approval").length;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const owner = offer.creatorId || offer.brandId || {};
      const matchesSearch =
        (owner.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (owner.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (offer.offerTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (offer.conditionText || "").toLowerCase().includes(searchTerm.toLowerCase());

      const isExpired = offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now();
      let currentStatus = offer.status;
      if (currentStatus === "active" && isExpired) currentStatus = "expired";

      if (statusFilter === "all") return matchesSearch;
      if (statusFilter === "pending") return matchesSearch && currentStatus === "pending_approval";
      if (statusFilter === "active") return matchesSearch && currentStatus === "active";
      if (statusFilter === "expired") return matchesSearch && currentStatus === "expired";
      if (statusFilter === "rejected") return matchesSearch && currentStatus === "rejected";
      if (statusFilter === "deleted") return matchesSearch && currentStatus === "deleted";
      return matchesSearch;
    });
  }, [offers, searchTerm, statusFilter]);

  const totalOffers = filteredOffers.length;
  const totalPages = Math.max(1, Math.ceil(totalOffers / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOffers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredOffers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOffers, safeCurrentPage, itemsPerPage]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Tag className="h-6 w-6 text-primary" /> Creator & Brand Offers Moderation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review submissions, approve deals to trigger Web Push alerts, and manage active promotions.
          </p>
        </div>
        <Button
          onClick={fetchOffers}
          variant="outline"
          className="rounded-xl text-xs self-start sm:self-auto"
        >
          Refresh Offers
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search creator, brand, title, or conditions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: `Pending (${pendingCount})`, highlight: pendingCount > 0 },
            { key: "active", label: "Active" },
            { key: "expired", label: "Expired" },
            { key: "rejected", label: "Rejected" },
            { key: "deleted", label: "Deleted" },
          ].map(({ key, label, highlight }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                statusFilter === key
                  ? "bg-primary text-white shadow-xs"
                  : highlight
                  ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <th className="p-4">Owner / Type</th>
                <th className="p-4">Offer Title</th>
                <th className="p-4">Perk / Discount</th>
                <th className="p-4">Condition & Terms</th>
                <th className="p-4">Duration & Expiry</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Loading offers...
                  </td>
                </tr>
              ) : paginatedOffers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No offers found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedOffers.map((offer) => {
                  const isCreator = offer.creatorOrBrandType === "creator";
                  const owner = isCreator ? offer.creatorId : offer.brandId;
                  const isExpired = offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now();
                  const isPending = offer.status === "pending_approval";
                  const isDeleted = offer.status === "deleted";
                  const isRejected = offer.status === "rejected";

                  return (
                    <tr
                      key={offer._id}
                      className={`hover:bg-secondary/30 transition-colors ${
                        isPending ? "bg-amber-500/5" : isDeleted ? "opacity-60 bg-secondary/10" : ""
                      }`}
                    >
                      {/* Owner */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveImageUrl(owner?.avatarUrl || owner?.profilePicture, owner?.fullName || "user", owner?.gender, isCreator ? "creator" : "brand")}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = resolveImageUrl("", owner?.fullName || "user", owner?.gender, isCreator ? "creator" : "brand");
                            }}
                          />
                          <div>
                            <p className="font-semibold text-foreground">
                              {owner?.fullName || (isCreator ? "Creator" : "Brand")}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isCreator
                                  ? "text-purple-600 bg-purple-500/10"
                                  : "text-blue-600 bg-blue-500/10"
                              }`}
                            >
                              {isCreator ? <User className="h-2.5 w-2.5" /> : <Building2 className="h-2.5 w-2.5" />}
                              {isCreator ? "Creator Offer" : "Brand Offer"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="p-4 max-w-xs font-semibold text-foreground">
                        {offer.offerTitle}
                      </td>

                      {/* Perk */}
                      <td className="p-4 whitespace-nowrap">
                        {offer.discountPercent ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {offer.discountPercent}% OFF
                          </span>
                        ) : offer.monetaryBonus ? (
                          <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            +₹{offer.monetaryBonus} Perk
                          </span>
                        ) : (
                          <span className="capitalize text-muted-foreground">{offer.offerCategory}</span>
                        )}
                      </td>

                      {/* Condition */}
                      <td className="p-4 max-w-sm">
                        <p className="line-clamp-2 text-foreground/90 font-normal">
                          "{offer.conditionText}"
                        </p>
                      </td>

                      {/* Validity */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground">{offer.validityHours} Hours</p>
                          {offer.expiresAt && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(offer.expiresAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-amber-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                            Pending Approval
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-red-500/20">
                            Rejected
                          </span>
                        ) : isDeleted ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            Deleted
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active & Live
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveOffer(offer._id)}
                                disabled={approvingId === offer._id}
                                className="h-7 text-[11px] rounded-lg px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" />
                                {approvingId === offer._id ? "Approving..." : "Approve & Broadcast"}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setOfferToReject(offer);
                                  setRejectReason("");
                                }}
                                className="h-7 text-[11px] rounded-lg px-2.5 border-red-500/30 text-red-500 hover:bg-red-500/10 flex items-center gap-1"
                              >
                                <XCircle className="h-3 w-3" /> Reject
                              </Button>
                            </>
                          )}

                          {!isPending && !isDeleted && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setOfferToDelete(offer)}
                              className="h-7 text-[11px] rounded-lg px-2.5 flex items-center gap-1.5"
                            >
                              <Trash2 className="h-3 w-3" /> Soft Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalOffers > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/40 text-xs">
            <span className="text-muted-foreground order-2 sm:order-1">
              Showing <strong className="text-foreground">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{" "}
              <strong className="text-foreground">{Math.min(safeCurrentPage * itemsPerPage, totalOffers)}</strong> of{" "}
              <strong className="text-foreground">{totalOffers}</strong> offers
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-8 px-2.5 rounded-full border-border/60 hover:bg-accent disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers(safeCurrentPage, totalPages).map((page, idx) =>
                    page === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={safeCurrentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 p-0 rounded-full text-xs font-semibold ${
                          safeCurrentPage === page
                            ? "bg-primary text-white border-0 shadow-xs"
                            : "border-border/60 hover:bg-accent"
                        }`}
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="h-8 px-2.5 rounded-full border-border/60 hover:bg-accent disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Offer Dialog */}
      <Dialog open={!!offerToReject} onOpenChange={(open) => !open && setOfferToReject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Reject Offer Submission
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Provide a reason for rejection. This will be sent as a notification to the creator or brand.
            </DialogDescription>
          </DialogHeader>

          {offerToReject && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1">
                <p className="font-semibold text-foreground">
                  Title: {offerToReject.offerTitle}
                </p>
                <p className="text-muted-foreground">"{offerToReject.conditionText}"</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Rejection Reason *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Terms violate pricing guidelines or inappropriate content."
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOfferToReject(null)}
              disabled={rejecting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectOffer}
              disabled={rejecting}
              className="text-xs flex items-center gap-1.5"
            >
              {rejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Soft-Delete Dialog */}
      <Dialog open={!!offerToDelete} onOpenChange={(open) => !open && setOfferToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Offer
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to remove this offer? It will be marked as deleted, immediately removed from all sidebar widgets, and the owner will be notified.
            </DialogDescription>
          </DialogHeader>

          {offerToDelete && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-foreground">
                Offer: {offerToDelete.offerTitle}
              </p>
              <p className="text-muted-foreground">"{offerToDelete.conditionText}"</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOfferToDelete(null)}
              disabled={deleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteOffer}
              disabled={deleting}
              className="text-xs flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OffersPage;
