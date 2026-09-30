import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, VideoIcon, CheckCircle2, XCircle, Star, MessageSquare, UserCheck, Search, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/axios";
import { resolveImageUrl } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../components/ui/dialog";
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

export default function ClientReviewsPage() {
  const [activeTab, setActiveTab] = useState("user_reviews"); // "user_reviews" | "video_reviews"
  const [userReviews, setUserReviews] = useState([]);
  const [videoReviews, setVideoReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    reviewerName: "", reviewText: "", rating: 5, targetRole: "brand", videoUrl: "", thumbnailUrl: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, activeTab]);

  const filteredUserReviews = useMemo(() => {
    return userReviews.filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const reviewer = (r.reviewerName || "").toLowerCase();
      const target = (r.targetUserName || "").toLowerCase();
      const title = (r.title || "").toLowerCase();
      const content = (r.content || r.feedback || "").toLowerCase();
      return reviewer.includes(q) || target.includes(q) || title.includes(q) || content.includes(q);
    });
  }, [userReviews, search]);

  const totalUserReviews = filteredUserReviews.length;
  const totalUserReviewPages = Math.max(1, Math.ceil(totalUserReviews / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalUserReviewPages);

  const paginatedUserReviews = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredUserReviews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUserReviews, safeCurrentPage, itemsPerPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, uRes] = await Promise.all([
        api.get("/admin/content/client-reviews").catch(() => ({ data: { data: [] } })),
        api.get(`/reviews/admin/all?status=${statusFilter}`).catch(() => ({ data: { data: [] } })),
      ]);
      setVideoReviews(vRes.data?.data || []);
      setUserReviews(uRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId) => {
    try {
      const res = await api.patch(`/reviews/admin/${reviewId}/approve`);
      toast.success(res.data?.message || "Review approved and now visible!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve review");
    }
  };

  const handleReject = async (reviewId) => {
    try {
      const res = await api.patch(`/reviews/admin/${reviewId}/reject`);
      toast.info(res.data?.message || "Review rejected");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject review");
    }
  };

  const [videoFile, setVideoFile] = useState(null);
  const [videoSourceType, setVideoSourceType] = useState("file"); // "file" | "link"

  const handleSubmitVideoReview = async (e) => {
    e.preventDefault();
    try {
      if (videoSourceType === "file") {
        if (!videoFile) {
          toast.error("Please choose a video file.");
          return;
        }
        const fData = new FormData();
        fData.append("reviewerName", formData.reviewerName);
        fData.append("reviewText", formData.reviewText);
        fData.append("rating", String(formData.rating));
        fData.append("targetRole", formData.targetRole);
        fData.append("video", videoFile);
        if (formData.thumbnailUrl) {
          fData.append("thumbnailUrl", formData.thumbnailUrl);
        }
        await api.post("/admin/content/client-reviews", fData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        if (!formData.videoUrl) {
          toast.error("Please enter a video URL.");
          return;
        }
        await api.post("/admin/content/client-reviews", formData);
      }
      setOpen(false);
      setVideoFile(null);
      setFormData({ reviewerName: "", reviewText: "", rating: 5, targetRole: "brand", videoUrl: "", thumbnailUrl: "" });
      toast.success("Client video review saved!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving review");
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.delete(`/admin/content/client-reviews/${id}`);
      fetchData();
    } catch (err) {
      toast.error("Error deleting review");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reviews & Moderation</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Approve, moderate, or reject Brand & Creator collaboration reviews before they appear on profiles.
          </p>
        </div>

        {activeTab === "video_reviews" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full gradient-sunset border-0 text-white shadow-glow text-xs font-semibold self-start sm:self-auto">
                <Plus className="h-4 w-4 mr-2" /> Add Featured Video Review
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Featured Client Review</DialogTitle>
                <DialogDescription className="hidden">Add a new client review</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitVideoReview} className="space-y-4 mt-2">
                <div className="flex rounded-xl bg-secondary/50 p-1 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setVideoSourceType("file")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      videoSourceType === "file" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground"
                    }`}
                  >
                    Upload Video File
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSourceType("link")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      videoSourceType === "link" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground"
                    }`}
                  >
                    Paste Video Link
                  </button>
                </div>

                <div>
                  <Label>Reviewer Name</Label>
                  <Input value={formData.reviewerName} onChange={e => setFormData({...formData, reviewerName: e.target.value})} required className="rounded-xl" />
                </div>
                <div>
                  <Label>Review Text</Label>
                  <Textarea value={formData.reviewText} onChange={e => setFormData({...formData, reviewText: e.target.value})} required className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rating (1-5)</Label>
                    <Input type="number" min="1" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} required className="rounded-xl" />
                  </div>
                  <div>
                    <Label>Target Role</Label>
                    <select 
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      value={formData.targetRole} onChange={e => setFormData({...formData, targetRole: e.target.value})}
                    >
                      <option value="brand">Brand</option>
                      <option value="creator">Creator</option>
                    </select>
                  </div>
                </div>

                {videoSourceType === "file" ? (
                  <div>
                    <Label>Video File (MP4, MOV, WebM)</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      required={!formData.videoUrl}
                      className="rounded-xl cursor-pointer"
                    />
                    {videoFile && (
                      <p className="text-[11px] text-muted-foreground mt-1">Selected: {videoFile.name} ({(videoFile.size / (1024*1024)).toFixed(1)} MB)</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label>Video URL (YouTube/Vimeo/Direct)</Label>
                    <Input value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} required placeholder="https://..." className="rounded-xl" />
                  </div>
                )}

                <div>
                  <Label>Thumbnail Image URL (Optional)</Label>
                  <Input value={formData.thumbnailUrl} onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})} placeholder="https://..." className="rounded-xl" />
                </div>
                <Button type="submit" className="w-full rounded-full gradient-sunset text-white font-semibold">Save Review</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("user_reviews")}
          className={`py-3 px-4 sm:px-6 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === "user_reviews"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCheck className="h-4 w-4" /> Brand & Creator Reviews
          {userReviews.filter(r => r.status === "pending").length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-500 rounded-full font-bold">
              {userReviews.filter(r => r.status === "pending").length} Pending
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("video_reviews")}
          className={`py-3 px-4 sm:px-6 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === "video_reviews"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <VideoIcon className="h-4 w-4" /> Featured Video Reviews ({videoReviews.length})
        </button>
      </div>

      {/* TAB 1: User Reviews Moderation */}
      {activeTab === "user_reviews" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-full border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Reviews</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved (Live on Display)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search reviewer, target, text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 rounded-full bg-card/60 border-border/60"
              />
            </div>
          </div>

          {/* Mobile Card Layout (< md) */}
          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading user reviews...</div>
            ) : paginatedUserReviews.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs rounded-2xl border border-border bg-card">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                No reviews found matching filter.
              </div>
            ) : (
              paginatedUserReviews.map((r) => (
                <div key={r._id} className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={resolveImageUrl(r.reviewerAvatar, r.reviewerName || "User", r.reviewerGender, r.reviewerRole)}
                        alt=""
                        className="h-8 w-8 rounded-full border border-border object-cover shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = resolveImageUrl("", r.reviewerName || "User", r.reviewerGender, r.reviewerRole);
                        }}
                      />
                      <div className="min-w-0">
                        <span className="block font-semibold text-xs text-foreground truncate">{r.reviewerName}</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0">
                          {r.reviewerRole}
                        </Badge>
                      </div>
                    </div>
                    {r.status === "approved" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] font-bold rounded-full">
                        ✓ Approved
                      </Badge>
                    ) : r.status === "rejected" ? (
                      <Badge variant="destructive" className="text-[9px] font-bold rounded-full">
                        ✕ Rejected
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] font-bold rounded-full">
                        Pending
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs bg-secondary/30 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (r.rating || 5) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-[11px] text-foreground ml-1">{r.rating}/5</span>
                    </div>
                    {r.title && <p className="font-semibold text-foreground text-xs">{r.title}</p>}
                    <p className="text-muted-foreground text-xs leading-relaxed">{r.feedback || r.content || r.text}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>Target: <strong>{r.targetUserName || r.targetName || "User"}</strong> ({r.targetUserRole || r.targetRole || "creator"})</span>
                    <span>{r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "Recent"}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {r.status !== "approved" && (
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
                        onClick={() => handleApprove(r._id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold h-8"
                        onClick={() => handleReject(r._id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block rounded-3xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Reviewer</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Feedback Title & Content</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right pr-6">Admin Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                        Loading user reviews...
                      </TableCell>
                    </TableRow>
                  ) : paginatedUserReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-xs">
                        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                        No reviews found matching filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUserReviews.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={resolveImageUrl(r.reviewerAvatar, r.reviewerName || "User", r.reviewerGender, r.reviewerRole)}
                              alt=""
                              className="h-8 w-8 rounded-full border border-border object-cover shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = resolveImageUrl("", r.reviewerName || "User", r.reviewerGender, r.reviewerRole);
                              }}
                            />
                            <div>
                              <span className="block font-semibold text-xs text-foreground">{r.reviewerName || "User"}</span>
                              <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0">
                                {r.reviewerRole || "user"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <img
                              src={resolveImageUrl(r.targetUserAvatar || r.targetAvatar, r.targetUserName || r.targetName || "Target", r.targetGender, r.targetUserRole || r.targetRole)}
                              alt=""
                              className="h-8 w-8 rounded-full border border-border object-cover shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = resolveImageUrl("", r.targetUserName || r.targetName || "Target", r.targetGender, r.targetUserRole || r.targetRole);
                              }}
                            />
                            <div>
                              <span className="block font-semibold text-xs text-foreground">{r.targetUserName || r.targetName || "Target"}</span>
                              <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 text-muted-foreground">
                                {r.targetUserRole || r.targetRole || "creator"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {r.rating}/5
                          </div>
                        </TableCell>

                        <TableCell className="max-w-[280px]">
                          <p className="font-semibold text-xs text-foreground truncate">{r.title || "Feedback"}</p>
                          <p className="text-muted-foreground text-xs line-clamp-2">{r.feedback || r.content || r.text}</p>
                        </TableCell>

                        <TableCell>
                          {r.status === "approved" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold rounded-full">
                              ✓ Approved (Live)
                            </Badge>
                          ) : r.status === "rejected" ? (
                            <Badge variant="destructive" className="text-[10px] font-bold rounded-full">
                              ✕ Rejected
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold rounded-full">
                              ⏳ Pending Admin Approval
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "Recent"}
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status !== "approved" && (
                              <Button
                                size="sm"
                                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 shadow-sm flex items-center gap-1"
                                onClick={() => handleApprove(r._id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </Button>
                            )}
                            {r.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold h-8 px-3 flex items-center gap-1"
                                onClick={() => handleReject(r._id)}
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
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
          </div>

          {/* Pagination Controls */}
          {totalUserReviews > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40 text-xs">
              <span className="text-muted-foreground order-2 sm:order-1">
                Showing <strong className="text-foreground">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong className="text-foreground">{Math.min(safeCurrentPage * itemsPerPage, totalUserReviews)}</strong> of{" "}
                <strong className="text-foreground">{totalUserReviews}</strong> reviews
              </span>
              {totalUserReviewPages > 1 && (
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
                    {getPageNumbers(safeCurrentPage, totalUserReviewPages).map((page, idx) =>
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
                              ? "gradient-sunset text-white border-0 shadow-xs"
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
                    onClick={() => setCurrentPage((p) => Math.min(totalUserReviewPages, p + 1))}
                    disabled={safeCurrentPage === totalUserReviewPages}
                    className="h-8 px-2.5 rounded-full border-border/60 hover:bg-accent disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Featured Video Reviews */}
      {activeTab === "video_reviews" && (
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Reviewer</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videoReviews.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="pl-6 font-medium text-xs">{r.reviewerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.thumbnailUrl && <img src={resolveImageUrl(r.thumbnailUrl)} alt="" className="w-8 h-8 rounded object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
                        <a href={resolveImageUrl(r.videoUrl)} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 hover:underline text-xs">
                          <VideoIcon className="w-3.5 h-3.5" /> Watch Video
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-xs">{r.targetRole}</TableCell>
                    <TableCell className="text-xs font-semibold">{r.rating}/5</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteVideo(r._id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {videoReviews.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">No featured reviews found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
