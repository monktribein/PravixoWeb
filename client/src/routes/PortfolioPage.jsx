import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Film,
  Sparkles,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Trash2,
  X,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { influencers, mockBrands } from "@/data/influencer";
import { getGenderAvatar } from "@/utils/avatar";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const resolveImageUrl = (url) => {
  if (!url || url === "undefined" || url === "null" || typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  let base = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  if (base.endsWith("/api")) base = base.slice(0, -4);
  const cleanBase = base.replace(/\/$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

export default function PortfolioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioTab, setPortfolioTab] = useState("all");

  const [selectedPortfolioPost, setSelectedPortfolioPost] = useState(null);
  const [portfolioCommentText, setPortfolioCommentText] = useState("");
  const [submittingPortfolioComment, setSubmittingPortfolioComment] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Try fetching live profile
        let prof = null;
        try {
          const res = await api.get(`/profiles/${id}`);
          prof = res.data?.data || res.data;
        } catch {
          // fallback to mock
          prof = influencers.find((item) => String(item.id) === String(id)) ||
            mockBrands.find((item) => String(item.id) === String(id));
        }
        setProfile(prof);

        // Fetch live portfolio
        try {
          const pRes = await api.get(`/portfolio/profile/${id}`);
          const pData = pRes.data?.data || pRes.data;
          if (Array.isArray(pData)) {
            setPortfolio(pData);
          } else if (prof?.gallery && Array.isArray(prof.gallery)) {
            setPortfolio(prof.gallery);
          }
        } catch {
          if (prof?.gallery && Array.isArray(prof.gallery)) {
            setPortfolio(prof.gallery);
          }
        }
      } catch (err) {
        console.error("Portfolio page load error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (profile?.fullName || profile?.name) {
      document.title = `${profile.fullName || profile.name}'s Portfolio — Pravixo`;
    }
  }, [profile]);

  const handleTogglePortfolioLike = async (post) => {
    if (!post?._id) return;
    try {
      const res = await api.post(`/portfolio/${post._id}/like`);
      const likesCount = res?.data?.data?.likesCount;
      const isLiked = res?.data?.data?.isLiked;

      setSelectedPortfolioPost((prev) => prev ? {
        ...prev,
        likesCount,
        isLiked,
      } : null);

      setPortfolio((prev) =>
        prev.map((item) =>
          item._id === post._id
            ? { ...item, likesCount, isLiked }
            : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPortfolioComment = async () => {
    if (!selectedPortfolioPost?._id || !portfolioCommentText.trim()) return;
    setSubmittingPortfolioComment(true);
    try {
      const commenterAvatar = resolveImageUrl(myProfile?.avatarUrl) || (myProfile?.fullName ? getGenderAvatar(myProfile.fullName, myProfile.gender, myProfile.role) : "");
      const res = await api.post(`/portfolio/${selectedPortfolioPost._id}/comments`, {
        text: portfolioCommentText.trim(),
        userName: myProfile?.fullName || user?.email?.split("@")[0] || "Guest",
        userAvatar: commenterAvatar,
      });

      const updatedComments = res?.data?.data || [];
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: Array.isArray(updatedComments) ? updatedComments : [...(prev.comments || []), {
          text: portfolioCommentText.trim(),
          userName: myProfile?.fullName || "Guest",
          userAvatar: commenterAvatar,
          createdAt: Date.now(),
        }],
      }));

      setPortfolio((prev) =>
        prev.map((item) =>
          item._id === selectedPortfolioPost._id
            ? {
              ...item,
              comments: Array.isArray(updatedComments) ? updatedComments : [...(item.comments || []), {
                text: portfolioCommentText.trim(),
                userName: myProfile?.fullName || "Guest",
                userAvatar: commenterAvatar,
                createdAt: Date.now(),
              }],
            }
            : item
        )
      );

      setPortfolioCommentText("");
      toast.success("Comment added!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to post comment");
    } finally {
      setSubmittingPortfolioComment(false);
    }
  };

  const handleDeletePortfolioComment = async (commentId) => {
    if (!selectedPortfolioPost?._id) return;
    try {
      await api.delete(`/portfolio/${selectedPortfolioPost._id}/comments/${commentId}`);
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: (prev?.comments || []).filter((c) => (c._id || c.id) !== commentId),
      }));
      setPortfolio((prev) =>
        prev.map((item) =>
          item._id === selectedPortfolioPost._id
            ? { ...item, comments: (item.comments || []).filter((c) => (c._id || c.id) !== commentId) }
            : item
        )
      );
      toast.success("Comment deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    }
  };

  const handleSharePortfolioItem = (item) => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${profile?.fullName || profile?.name || 'Creator'}'s Portfolio`,
        url: url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Portfolio link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const profileName = profile?.fullName || profile?.name || "Profile";
  const profileHandle = profile?.handle || (profileName ? `@${profileName.toLowerCase().replace(/\s+/g, "")}` : "@user");
  const isBrand = profile?.role === "brand";
  const backUrl = isBrand ? `/brand/${id}` : `/influencer/${id}`;

  const filtered = (portfolio || []).filter((item) => {
    if (portfolioTab === "all") return true;
    const itemType = item.type || "post";
    return itemType === portfolioTab;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* HEADER NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(backUrl)}
            className="rounded-full h-10 w-10 border-border hover:bg-secondary shrink-0"
            title="Back to profile"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl overflow-hidden border border-border bg-muted shrink-0 shadow-sm">
              <img
                src={resolveImageUrl(profile?.avatarUrl || profile?.avatar || profile?.profileImage) || getGenderAvatar(profileName, profile?.gender, profile?.role || "creator")}
                alt={profileName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getGenderAvatar(profileName, profile?.gender, profile?.role || "creator");
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  {profileName}'s {isBrand ? "Gallery" : "Portfolio"}
                </h1>
                {(profile?.verificationStatus === "verified" || profile?.isVerified) && (
                  <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 fill-blue-500/15" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {profileHandle} · {portfolio.length} total deliverables
              </p>
            </div>
          </div>
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setPortfolioTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer",
              portfolioTab === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({portfolio?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("post")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer",
              portfolioTab === "post"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-3.5 w-3.5 text-blue-500" /> Posts ({(portfolio || []).filter(p => (p.type || "post") === "post").length})
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("reel")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer",
              portfolioTab === "reel"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Film className="h-3.5 w-3.5 text-pink-500" /> Reels ({(portfolio || []).filter(p => p.type === "reel").length})
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("story")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer",
              portfolioTab === "story"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Stories ({(portfolio || []).filter(p => p.type === "story").length})
          </button>
        </div>
      </div>

      {/* PORTFOLIO GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-muted/10 p-8">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">No deliverables published yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            There are no {portfolioTab === "all" ? "portfolio items" : portfolioTab + "s"} available in this category.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPortfolioTab("all")}
            className="mt-4 rounded-full"
          >
            Show All
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((item, index) => {
            const imageSrc = resolveImageUrl(item.url || item.imageUrl || item);
            const isReel = item.type === "reel";
            const isStory = item.type === "story";
            const isVideo = item.mediaType === "video" || /\.(mp4|mov|avi|webm)$/i.test(imageSrc || "");
            const likes = item.likesCount || 0;
            const comments = item.commentsCount || (item.comments?.length || 0);
            const views = item.viewsCount || (isReel ? 1200 : 0);

            return (
              <div
                key={item._id || index}
                className="group relative rounded-3xl overflow-hidden border border-border/80 bg-black cursor-pointer shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl aspect-[4/5]"
                onClick={() => setSelectedPortfolioPost(item)}
              >
                {isVideo ? (
                  <video
                    src={imageSrc}
                    className="h-full w-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={imageSrc}
                    alt={item.caption || "Portfolio deliverable"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Type Badge */}
                <div className="absolute top-3 left-3 z-10">
                  {isReel ? (
                    <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-pink-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-pink-500/30">
                      <Film className="h-3 w-3" /> Reel
                    </span>
                  ) : isStory ? (
                    <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      <Sparkles className="h-3 w-3" /> Story
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-blue-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                      <Camera className="h-3 w-3" /> Post
                    </span>
                  )}
                </div>

                {/* Brand Partnership Tag */}
                {item.brandTag && (
                  <div className="absolute top-3 right-3 z-10 max-w-[55%] truncate">
                    <span className="block truncate bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/20">
                      {item.brandTag.startsWith("@") ? item.brandTag : `@${item.brandTag}`}
                    </span>
                  </div>
                )}

                {/* Reel Views */}
                {isReel && views > 0 && (
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Play className="h-2.5 w-2.5 fill-white" /> {views.toLocaleString()}
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4 text-white">
                  {item.caption && (
                    <p className="text-xs font-medium text-white/90 line-clamp-2 mb-2">
                      {item.caption}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> {likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5 fill-white text-white" /> {comments}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL LIGHTBOX MODAL */}
      {selectedPortfolioPost && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedPortfolioPost(null)}
        >
          <button
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-gray-300 p-2 transition-colors rounded-full bg-black/60 sm:bg-transparent hover:bg-white/20 z-[110] cursor-pointer"
            onClick={() => setSelectedPortfolioPost(null)}
            aria-label="Close viewer"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <div
            className="relative w-full max-w-4xl bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col md:flex-row max-h-[92vh] sm:max-h-[90vh] overflow-y-auto md:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Side: Media Display */}
            <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative shrink-0 min-h-[200px] max-h-[42vh] sm:max-h-[50vh] md:max-h-none md:min-h-[500px]">
              {selectedPortfolioPost.mediaType === "video" || /\.(mp4|mov|avi|webm)$/i.test(selectedPortfolioPost.imageUrl || selectedPortfolioPost.url || "") ? (
                <video
                  src={resolveImageUrl(selectedPortfolioPost.imageUrl || selectedPortfolioPost.url)}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[42vh] sm:max-h-[50vh] md:max-h-[70vh] w-full h-full object-contain"
                />
              ) : (
                <img
                  src={resolveImageUrl(selectedPortfolioPost.imageUrl || selectedPortfolioPost.url)}
                  alt={selectedPortfolioPost.caption || "Portfolio deliverable"}
                  className="max-h-[42vh] sm:max-h-[50vh] md:max-h-[70vh] w-full h-full object-contain"
                />
              )}

              {/* Format Badge Overlay */}
              <div className="absolute top-3 left-3 z-10">
                {selectedPortfolioPost.type === "reel" ? (
                  <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-pink-400 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border border-pink-500/30">
                    <Film className="h-3 w-3" /> Reel
                  </span>
                ) : selectedPortfolioPost.type === "story" ? (
                  <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-amber-400 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                    <Sparkles className="h-3 w-3" /> Story
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-blue-400 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
                    <Camera className="h-3 w-3" /> Post
                  </span>
                )}
              </div>
            </div>

            {/* Right Side: Creator info, Brand tag, Caption, Comments */}
            <div className="w-full md:w-2/5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border bg-card flex-1 min-h-0">
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                    <img
                      src={resolveImageUrl(profile?.avatarUrl || profile?.avatar || profile?.profileImage) || getGenderAvatar(profileName, profile?.gender, profile?.role || "creator")}
                      alt={profileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold leading-tight truncate">{profileName}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{profileHandle}</p>
                  </div>
                </div>

                <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                  {profile?.category || "Creative"}
                </Badge>
              </div>

              {/* Caption & Comments List */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto max-h-[220px] md:max-h-[360px] space-y-3 text-xs">
                {selectedPortfolioPost.brandTag && (
                  <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-500 font-semibold flex items-center gap-2 text-xs">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Paid partnership with <span className="underline">{selectedPortfolioPost.brandTag.startsWith("@") ? selectedPortfolioPost.brandTag : `@${selectedPortfolioPost.brandTag}`}</span></span>
                  </div>
                )}

                {selectedPortfolioPost.caption ? (
                  <div className="flex gap-2.5">
                    <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-border">
                      <img
                        src={resolveImageUrl(profile?.avatarUrl || profile?.avatar || profile?.profileImage) || getGenderAvatar(profileName, profile?.gender, profile?.role || "creator")}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed break-words">
                        <span className="font-bold mr-1.5">{profileName}</span>
                        {selectedPortfolioPost.caption}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {new Date(selectedPortfolioPost.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-[11px]">No caption provided.</p>
                )}

                {/* Comments Section */}
                <div className="border-t border-border/50 pt-2.5 space-y-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Comments ({selectedPortfolioPost.comments?.length || selectedPortfolioPost.commentsCount || 0})
                  </p>

                  {(selectedPortfolioPost.comments || []).map((comm, cIdx) => {
                    const commentId = comm._id || comm.id || cIdx;
                    const isCommentOwner = myProfile?._id && (comm.userId === myProfile._id || comm.userName === myProfile.fullName);
                    const isProfileOwner = myProfile?._id && String(myProfile._id) === String(id);
                    const canDelete = isCommentOwner || isProfileOwner;

                    return (
                      <div key={cIdx} className="group/comm flex gap-2.5 items-start justify-between">
                        <div className="flex gap-2.5 items-start flex-1 min-w-0">
                          <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 border border-border bg-muted">
                            <img
                              src={resolveImageUrl(comm.userAvatar) || getGenderAvatar(comm.userName || "User", "", "creator")}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getGenderAvatar(comm.userName || "User", "", "creator");
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0 bg-secondary/30 p-2 rounded-xl">
                            <p className="font-bold text-[11px] leading-none mb-1 truncate">{comm.userName || "Pravixo User"}</p>
                            <p className="text-[11px] text-foreground leading-tight break-words">{comm.text}</p>
                          </div>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeletePortfolioComment(commentId)}
                            className="opacity-0 group-hover/comm:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions & Comment Input */}
              <div className="p-3 sm:p-4 border-t border-border bg-card space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePortfolioLike(selectedPortfolioPost)}
                      className="text-foreground hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Heart className={cn("h-5 w-5", selectedPortfolioPost.isLiked ? "fill-rose-500 text-rose-500" : "")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById("portfolio-page-comment-input")?.focus()}
                      className="text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSharePortfolioItem(selectedPortfolioPost)}
                      className="text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>

                  <span className="text-[11px] font-bold text-muted-foreground">
                    {selectedPortfolioPost.viewsCount ? `${selectedPortfolioPost.viewsCount.toLocaleString()} views` : ""}
                  </span>
                </div>

                <p className="text-xs font-bold text-foreground">
                  {(selectedPortfolioPost.likesCount || 0).toLocaleString()} likes
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    id="portfolio-page-comment-input"
                    placeholder="Leave feedback or comment..."
                    value={portfolioCommentText}
                    onChange={(e) => setPortfolioCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddPortfolioComment();
                    }}
                    className="text-xs rounded-full h-8 px-3"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={submittingPortfolioComment || !portfolioCommentText.trim()}
                    onClick={handleAddPortfolioComment}
                    className="rounded-full h-8 px-3 gradient-sunset text-white border-0 text-xs font-semibold"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
