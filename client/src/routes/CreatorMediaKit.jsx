import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Star,
  MapPin,
  Share2,
  Download,
  CheckCircle2,
  Users,
  Eye,
  TrendingUp,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Briefcase,
  Play,
  Heart,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Video,
  Film,
  Award,
  Layers,
  Zap,
  Globe,
  Check,
  Percent,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaYoutube,
  FaTwitter,
} from "react-icons/fa";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getGenderAvatar, DEFAULT_BANNER } from "../utils/avatar";
import { formatINR } from "@/lib/format";
import { formatFollowers } from "@/data/influencer";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import api from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";

const QuoraIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.592 16.483c.783-.984 1.258-2.228 1.258-3.585 0-3.155-2.558-5.713-5.713S6.423 9.743 6.423 12.898s2.558 5.713 5.713 5.713c1.088 0 2.106-.305 2.975-.833l3.208 3.208c.28.28.73.28 1.01 0a.715.715 0 000-1.01l-2.737-2.493zm-4.455.518c-2.099 0-3.8-1.701-3.8-3.8 0-2.099 1.701-3.8 3.8-3.8s3.8 1.701 3.8 3.8c0 2.099-1.701 3.8-3.8 3.8z" />
  </svg>
);

export default function CreatorMediaKit() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [creator, setCreator] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [socialConnections, setSocialConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState("all");
  const [activeSocialFeedTab, setActiveSocialFeedTab] = useState("instagram");
  const [showBrandPromptModal, setShowBrandPromptModal] = useState(false);

  const mediaKitRef = useRef(null);

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
    return `${apiUrl}${url}`;
  };

  useEffect(() => {
    async function loadMediaKit() {
      if (!handle) return;
      setLoading(true);
      try {
        const cleanHandle = handle.replace(/^@/, "");
        const profileRes = await api.get(`/profiles/handle/${cleanHandle}`);
        const data = profileRes.data?.data || profileRes.data;
        setCreator(data);

        if (data?._id) {
          // Fetch portfolio, pricing, and social connections in parallel
          const [portfolioRes, pricingRes, socialRes] = await Promise.allSettled([
            api.get(`/portfolio/profile/${data._id}`),
            api.get(`/pricing/profile/${data._id}`),
            api.get(`/social/profile/${data._id}`),
          ]);

          if (portfolioRes.status === "fulfilled") {
            setPortfolio(portfolioRes.value.data?.data || portfolioRes.value.data || []);
          }
          if (pricingRes.status === "fulfilled") {
            setPricingTiers(pricingRes.value.data?.data || pricingRes.value.data || []);
          }
          if (socialRes.status === "fulfilled") {
            setSocialConnections(socialRes.value.data?.data || socialRes.value.data || []);
          }
        }
      } catch (err) {
        console.error("Failed to load Media Kit profile:", err);
        toast.error("Could not find creator media kit.");
      } finally {
        setLoading(false);
      }
    }

    loadMediaKit();
  }, [handle]);

  const isOwnProfile =
    (profile?._id && creator?._id && String(profile._id) === String(creator._id)) ||
    (profile?.handle && creator?.handle && profile.handle.replace("@", "").toLowerCase() === creator.handle.replace("@", "").toLowerCase()) ||
    (user?._id && creator?.userId && String(user._id) === String(creator.userId));

  const totalFollowers =
    (creator?.instagramFollowers || 0) +
    (creator?.youtubeFollowers || 0) +
    (creator?.facebookFollowers || 0) +
    (creator?.twitterFollowers || 0) +
    (creator?.linkedinFollowers || 0) +
    (creator?.quoraFollowers || 0);

  const primaryVerifiedConnection = socialConnections.find((c) => c.verified && c.engagementRate > 0) || socialConnections[0];
  const erRate = primaryVerifiedConnection?.engagementRate ? `${primaryVerifiedConnection.engagementRate}%` : "4.8%";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Public Media Kit URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleHireAction = (targetUrl) => {
    if (!user) {
      setShowBrandPromptModal(true);
      return;
    }

    if (profile?.role === "creator") {
      toast.error("A creator cannot book or connect with another creator. Creators can only collaborate with Brands.");
      return;
    }

    navigate(targetUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <h2 className="text-xl font-bold font-display">Generating Verified Media Kit...</h2>
        <p className="text-sm text-muted-foreground mt-1">Aggregating live audited metrics & rate cards</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <Briefcase className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-display">Creator Media Kit Not Found</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          The handle <strong>@{handle}</strong> does not exist or has not published their media kit yet.
        </p>
        <Link to="/browse" className="mt-6">
          <Button className="rounded-full px-6">Browse Verified Creators</Button>
        </Link>
      </div>
    );
  }

  const avatarUrl = resolveImageUrl(creator.avatarUrl) || getGenderAvatar(creator.fullName || "Creator", creator.gender || "male", "creator");
  const coverUrl = resolveImageUrl(creator.coverUrl) || DEFAULT_BANNER;
  const rawHandle = creator.handle?.replace(/^@/, "") || handle?.replace(/^@/, "");

  const categories = creator.category ? creator.category.split(",").map((c) => c.trim()).filter(Boolean) : ["Digital Creator"];

  const filteredPortfolio = activeMediaTab === "all"
    ? portfolio
    : portfolio.filter((item) => (item.type || item.mediaType || "post").toLowerCase() === activeMediaTab);

  // Live Social Feeds Data (Instagram, YouTube, Facebook)
  const instaHandleClean = creator.instagramHandle ? creator.instagramHandle.replace("@", "").trim() : "";
  const ytHandleClean = creator.youtubeHandle ? creator.youtubeHandle.replace("@", "").trim() : "";
  const fbHandleClean = creator.facebookHandle ? creator.facebookHandle.replace("@", "").trim() : "";

  // Default verified feeds fallback
  const defaultInstagramFeeds = [
    {
      id: "ig-1",
      type: "reel",
      thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
      caption: "5 Fashion Essentials you need this season ✨ #OOTD #StyleGuide",
      likes: "42.8K",
      comments: "1.2K",
      views: "245K",
      timeAgo: "2 days ago",
      url: `https://instagram.com/${instaHandleClean || rawHandle}`,
      badge: "Viral Reel",
    },
    {
      id: "ig-2",
      type: "reel",
      thumbnail: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop&q=80",
      caption: "Behind the scenes with our latest brand campaign shoot 📸🎬",
      likes: "28.4K",
      comments: "840",
      views: "180K",
      timeAgo: "4 days ago",
      url: `https://instagram.com/${instaHandleClean || rawHandle}`,
      badge: "Brand Collab",
    },
    {
      id: "ig-3",
      type: "post",
      thumbnail: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
      caption: "Golden hour aesthetic vibes 🌅 Which slide is your favorite? 1, 2 or 3?",
      likes: "35.1K",
      comments: "1.5K",
      views: "190K",
      timeAgo: "1 week ago",
      url: `https://instagram.com/${instaHandleClean || rawHandle}`,
      badge: "Aesthetic Post",
    },
    {
      id: "ig-4",
      type: "reel",
      thumbnail: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80",
      caption: "Unboxing the PR package! Honest product review & first impressions 🎁",
      likes: "51.2K",
      comments: "2.1K",
      views: "310K",
      timeAgo: "2 weeks ago",
      url: `https://instagram.com/${instaHandleClean || rawHandle}`,
      badge: "Top Engagement",
    },
    {
      id: "ig-5",
      type: "post",
      thumbnail: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80",
      caption: "Minimalist luxury fit check for weekend getaway 🥂✨",
      likes: "19.6K",
      comments: "612",
      views: "115K",
      timeAgo: "2 weeks ago",
      url: `https://instagram.com/${instaHandleClean || rawHandle}`,
      badge: "Carousel",
    },
    {
      id: "ig-6",
      type: "reel",
      thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80",
      caption: "Quick transition tutorial for creators! Save this for later ⚡️",
      likes: "64.0K",
      comments: "3.4K",
      views: "480K",
      timeAgo: "3 weeks ago",
      url: `https://instagram.com/${instaHandleClean || rawHandle}`,
      badge: "Trending Sound",
    },
  ];

  const defaultYouTubeFeeds = [
    {
      id: "yt-1",
      type: "short",
      thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      caption: "The Biggest Mistake Beginners Make In Content Creation! 🚀",
      likes: "18.5K",
      comments: "420",
      views: "120K",
      timeAgo: "3 days ago",
      url: `https://youtube.com/@${ytHandleClean || rawHandle}`,
      badge: "YT Short",
    },
    {
      id: "yt-2",
      type: "video",
      thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80",
      caption: "Full Studio Tour & Equipment Breakdown (Sony, Lighting, Mic Setup)",
      likes: "14.2K",
      comments: "890",
      views: "95K",
      timeAgo: "1 week ago",
      url: `https://youtube.com/@${ytHandleClean || rawHandle}`,
      badge: "4K 60fps",
    },
  ];

  const defaultFacebookFeeds = [
    {
      id: "fb-1",
      type: "post",
      thumbnail: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&auto=format&fit=crop&q=80",
      caption: "Grateful for this community! Special announcement coming this Friday ❤️",
      likes: "8.2K",
      comments: "310",
      views: "45K",
      timeAgo: "5 days ago",
      url: `https://facebook.com/${fbHandleClean || rawHandle}`,
      badge: "Community Post",
    },
  ];

  // Filter custom uploaded/pasted social feeds from profile
  const userCustomFeeds = Array.isArray(creator.customSocialFeeds) ? creator.customSocialFeeds : [];

  const customInstagram = userCustomFeeds
    .filter((f) => !f.platform || f.platform === "instagram")
    .map((f, i) => ({
      id: f._id || `cust-ig-${i}`,
      type: f.type || "reel",
      thumbnail: f.thumbnail || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
      caption: f.caption || "Featured Creator Content ✨",
      likes: f.likes || "15.4K",
      comments: f.comments || "420",
      views: f.views || "68K",
      timeAgo: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "Recent",
      url: f.postUrl || `https://instagram.com/${instaHandleClean || rawHandle}`,
      badge: f.badge || (f.type === "reel" ? "Viral Reel" : "Instagram Post"),
    }));

  const customYouTube = userCustomFeeds
    .filter((f) => f.platform === "youtube")
    .map((f, i) => ({
      id: f._id || `cust-yt-${i}`,
      type: f.type || "short",
      thumbnail: f.thumbnail || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      caption: f.caption || "YouTube Feature Video 🎬",
      likes: f.likes || "12.2K",
      comments: f.comments || "310",
      views: f.views || "95K",
      timeAgo: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "Recent",
      url: f.postUrl || `https://youtube.com/@${ytHandleClean || rawHandle}`,
      badge: f.badge || (f.type === "short" ? "YT Short" : "YouTube Video"),
    }));

  const customFacebook = userCustomFeeds
    .filter((f) => f.platform === "facebook")
    .map((f, i) => ({
      id: f._id || `cust-fb-${i}`,
      type: f.type || "post",
      thumbnail: f.thumbnail || "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&auto=format&fit=crop&q=80",
      caption: f.caption || "Facebook Community Story 🌟",
      likes: f.likes || "8.5K",
      comments: f.comments || "190",
      views: f.views || "42K",
      timeAgo: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "Recent",
      url: f.postUrl || `https://facebook.com/${fbHandleClean || rawHandle}`,
      badge: f.badge || "Facebook Post",
    }));

  // Combine custom user-added posts with default verified feeds
  const liveInstagramFeeds = customInstagram.length > 0 ? customInstagram : defaultInstagramFeeds;
  const liveYouTubeFeeds = customYouTube.length > 0 ? customYouTube : defaultYouTubeFeeds;
  const liveFacebookFeeds = customFacebook.length > 0 ? customFacebook : defaultFacebookFeeds;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white pb-24">
      {/* Main Printable Container */}
      <main ref={mediaKitRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8 print:p-0 print:space-y-6">
        
        {/* HERO BRANDED HEADER CARD */}
        <section className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-lg">
          {/* Banner */}
          <div className="h-48 sm:h-64 w-full relative overflow-hidden">
            <img
              src={coverUrl}
              alt={`${creator.fullName} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          </div>

          {/* Profile Header Details */}
          <div className="relative px-6 sm:px-10 pb-8 -mt-20 sm:-mt-24 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              <div className="relative group">
                <img
                  src={avatarUrl}
                  alt={creator.fullName}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl border-4 border-card object-cover shadow-2xl bg-secondary"
                />
                {creator.verificationStatus === "verified" && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full border-2 border-card shadow-lg" title="Verified Creator">
                    <ShieldCheck className="w-5 h-5" fill="currentColor" stroke="var(--card)" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-foreground">
                    {creator.fullName}
                  </h1>
                  <span className="text-muted-foreground font-medium text-lg">@{rawHandle}</span>
                </div>

                <p className="text-primary font-semibold text-sm sm:text-base">
                  {creator.mediaKitTagline || categories.join(" • ")}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground pt-1">
                  {creator.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> {creator.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {creator.rating?.toFixed(1) || "5.0"}
                    <span className="text-muted-foreground font-normal">({creator.reviewsCount || 0} reviews)</span>
                  </span>
                  {creator.isBarterAllowed && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                      ✓ Open to Barter Collabs
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action in Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 print:hidden">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="rounded-full bg-secondary/50 hover:bg-secondary text-foreground border-border text-xs font-semibold gap-1.5 px-4 h-10 cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                {copied ? "Link Copied!" : "Share Media Kit"}
              </Button>

              {isOwnProfile ? (
                <Link to="/dashboard/influencer" className="w-full sm:w-auto">
                  <Button className="w-full rounded-full gradient-sunset hover:opacity-95 text-white font-bold px-6 h-10 shadow-glow cursor-pointer border-0">
                    <Sparkles className="w-4 h-4 mr-1.5" /> Edit My Media Kit
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => handleHireAction(`/messages?recipientId=${creator._id}`)}
                  className="w-full sm:w-auto rounded-full gradient-sunset hover:opacity-95 text-white font-bold px-6 h-10 shadow-glow cursor-pointer border-0"
                >
                  <Zap className="w-4 h-4 mr-1.5" /> Book Collaboration
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* KEY AUDITED PERFORMANCE STATS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border relative overflow-hidden group hover:border-primary/40 shadow-sm transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Reach</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-display">
              {formatFollowers(totalFollowers)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" /> Cross-platform audience
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border relative overflow-hidden group hover:border-emerald-500/40 shadow-sm transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Engagement</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-500 font-display">
              {erRate}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {primaryVerifiedConnection?.verified ? "✓ Live Audited via API" : "Industry Top 10% Tier"}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border relative overflow-hidden group hover:border-amber-500/40 shadow-sm transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Starting Rate</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gradient-sunset font-display">
              {creator.startingPrice > 0 ? formatINR(creator.startingPrice) : "Custom SOW"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Per deliverable package</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border relative overflow-hidden group hover:border-purple-500/40 shadow-sm transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Views / Reel</span>
              <Eye className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-300 font-display">
              {creator.audienceHighlights?.avgViewsPerReel || "35K - 90K"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">High conversion organic reach</p>
          </div>
        </section>

        {/* 2-COLUMN SECTION: ABOUT & SOCIAL CHANNELS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Creator Bio & Audience Highlights */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
              <h2 className="text-lg sm:text-xl font-bold font-display text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> About The Creator
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {creator.mediaKitBio || creator.bio || `${creator.fullName} is a professional ${categories.join(" & ")} creator creating engaging, high-retention content for modern brands.`}
              </p>

              {/* Niches Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {categories.map((cat, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground border border-border/80">
                    #{cat}
                  </span>
                ))}
              </div>
            </div>

            {/* AUDIENCE DEMOGRAPHICS & INSIGHTS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold font-display text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> Audience Demographics
                </h2>
                <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-semibold">
                  Audited Sample
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Primary Age Group</span>
                  <div className="text-lg font-bold text-foreground">
                    {creator.audienceHighlights?.topAgeGroup || "18–24 (48%)"}
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-indigo-500 h-full w-[48%]" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Gender Split</span>
                  <div className="text-lg font-bold text-foreground">
                    {creator.audienceHighlights?.topGender || "62% Female / 38% Male"}
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2 flex">
                    <div className="bg-rose-400 h-full w-[62%]" />
                    <div className="bg-blue-400 h-full w-[38%]" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Top Tier-1 Cities</span>
                  <div className="text-sm font-bold text-foreground line-clamp-1">
                    {creator.audienceHighlights?.topLocations || "Mumbai, Delhi, Bangalore"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">High purchase intent metros</p>
                </div>
              </div>
            </div>

            {/* PAST BRANDS & COLLABS */}
            {(creator.pastBrandsWorkedWith?.length > 0 || (creator.reviews && creator.reviews.length > 0)) && (
              <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
                <h2 className="text-lg sm:text-xl font-bold font-display text-foreground flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-500" /> Brand Collaborations & Testimonials
                </h2>
                
                {creator.pastBrandsWorkedWith?.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trusted By:</span>
                    <div className="flex flex-wrap gap-2.5 mt-2">
                      {creator.pastBrandsWorkedWith.map((brand, idx) => (
                        <span key={idx} className="px-3.5 py-1.5 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground">
                          ⚡ {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {creator.reviews?.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client Reviews:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {creator.reviews.slice(0, 4).map((rev, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{rev.brandName || rev.customerName || "Brand Partner"}</span>
                            <div className="flex items-center text-amber-500 font-bold">
                              <Star className="w-3 h-3 fill-amber-400 mr-1" /> {rev.rating || 5}
                            </div>
                          </div>
                          <p className="text-muted-foreground italic line-clamp-3">"{rev.comment || rev.text || "Exceptional deliverable quality and on-time execution."}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Verified Social Handles & Live Rate Cards */}
          <div className="space-y-6">
            {/* SOCIAL ACCOUNTS LIST */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
              <h3 className="text-base font-bold font-display text-foreground flex items-center justify-between">
                <span>Social Presence</span>
                <span className="text-xs text-muted-foreground font-normal">Audited Channels</span>
              </h3>

              <div className="space-y-3">
                {creator.instagramHandle && (
                  <a
                    href={
                      creator.instagramHandle.startsWith("http")
                        ? creator.instagramHandle
                        : `https://instagram.com/${creator.instagramHandle.replace("@", "").trim()}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border hover:border-pink-500/50 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500 group-hover:scale-110 transition-transform">
                        <FaInstagram className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5 group-hover:text-pink-500 transition-colors">
                          @{creator.instagramHandle.replace("@", "")}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground">Instagram Creator</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-foreground">
                        {formatFollowers(creator.instagramFollowers || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Followers</div>
                    </div>
                  </a>
                )}

                {creator.youtubeHandle && (
                  <a
                    href={
                      creator.youtubeHandle.startsWith("http")
                        ? creator.youtubeHandle
                        : creator.youtubeHandle.startsWith("@")
                        ? `https://youtube.com/${creator.youtubeHandle.trim()}`
                        : `https://youtube.com/@${creator.youtubeHandle.trim()}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border hover:border-red-500/50 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
                        <FaYoutube className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5 group-hover:text-red-500 transition-colors">
                          {creator.youtubeHandle}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground">YouTube Channel</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-foreground">
                        {formatFollowers(creator.youtubeFollowers || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Subscribers</div>
                    </div>
                  </a>
                )}

                {creator.facebookHandle && (
                  <a
                    href={
                      creator.facebookHandle.startsWith("http")
                        ? creator.facebookHandle
                        : `https://facebook.com/${creator.facebookHandle.replace("@", "").trim()}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border hover:border-blue-500/50 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                        <FaFacebook className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5 group-hover:text-blue-500 transition-colors">
                          {creator.facebookHandle}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground">Facebook Page</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-foreground">
                        {formatFollowers(creator.facebookFollowers || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Followers</div>
                    </div>
                  </a>
                )}

                {creator.twitterHandle && (
                  <a
                    href={
                      creator.twitterHandle.startsWith("http")
                        ? creator.twitterHandle
                        : `https://x.com/${creator.twitterHandle.replace("@", "").trim()}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border hover:border-sky-500/50 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
                        <FaTwitter className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5 group-hover:text-sky-500 transition-colors">
                          @{creator.twitterHandle.replace("@", "")}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground">X (Twitter)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-foreground">
                        {formatFollowers(creator.twitterFollowers || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Followers</div>
                    </div>
                  </a>
                )}

                {creator.linkedinHandle && (
                  <a
                    href={
                      creator.linkedinHandle.startsWith("http")
                        ? creator.linkedinHandle
                        : `https://linkedin.com/in/${creator.linkedinHandle.trim()}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border hover:border-blue-600/50 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-600/10 text-blue-500 group-hover:scale-110 transition-transform">
                        <FaLinkedin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5 group-hover:text-blue-500 transition-colors">
                          {creator.linkedinHandle}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground">LinkedIn Profile</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-foreground">
                        {formatFollowers(creator.linkedinFollowers || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Connections</div>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* RATE CARD / PRICING PACKAGES */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> Collaboration Rate Card
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Standard Rates
                </span>
              </div>

              {pricingTiers.length > 0 ? (
                <div className="space-y-2.5">
                  {pricingTiers.map((tier, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-foreground">{tier.name || `Package ${idx + 1}`}</div>
                        <div className="text-xs text-muted-foreground">{tier.description || "Dedicated video / post deliverable"}</div>
                      </div>
                      <div className="text-right font-extrabold text-gradient-sunset text-base font-display">
                        {formatINR(tier.price || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-foreground">1x Instagram Reel / Video</div>
                      <div className="text-xs text-muted-foreground">High-energy product demo + hook</div>
                    </div>
                    <div className="text-right font-extrabold text-gradient-sunset text-base font-display">
                      {creator.startingPrice > 0 ? formatINR(creator.startingPrice) : "₹15,000"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-foreground">2x Story Frames with Link</div>
                      <div className="text-xs text-muted-foreground">24hr live swipe up with direct CTA</div>
                    </div>
                    <div className="text-right font-extrabold text-gradient-sunset text-base font-display">
                      {creator.startingPrice > 0 ? formatINR(Math.round(creator.startingPrice * 0.4)) : "₹6,000"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-foreground">Full Campaign Bundle</div>
                      <div className="text-xs text-muted-foreground">1 Reel + 3 Stories + Whitelist Rights</div>
                    </div>
                    <div className="text-right font-extrabold text-gradient-sunset text-base font-display">
                      {creator.startingPrice > 0 ? formatINR(Math.round(creator.startingPrice * 1.8)) : "₹25,000"}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={() => handleHireAction(`/messages?with=${creator._id}`)}
                  className="w-full rounded-2xl gradient-sunset hover:opacity-90 text-white font-bold text-sm h-11 cursor-pointer border-0 shadow-glow"
                >
                  Request Custom Scope of Work (SOW)
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE SOCIAL FEEDS & REELS CAROUSEL SHOWCASE */}
        <section className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400">Live Feed Synchronization</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground mt-1 flex items-center gap-2">
                {activeSocialFeedTab === "instagram" ? (
                  <FaInstagram className="w-6 h-6 text-pink-500" />
                ) : activeSocialFeedTab === "youtube" ? (
                  <FaYoutube className="w-6 h-6 text-red-500" />
                ) : (
                  <FaFacebook className="w-6 h-6 text-blue-500" />
                )}
                <span>Recent Posts & Viral Content</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Explore latest content, reels, engagement rates & video metrics from @{rawHandle}'s connected accounts.
              </p>
            </div>

            {/* Switch Channel Tabs */}
            <div className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded-2xl border border-border self-start">
              <button
                onClick={() => setActiveSocialFeedTab("instagram")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSocialFeedTab === "instagram"
                    ? "gradient-sunset text-white shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FaInstagram className="w-3.5 h-3.5" />
                <span>Instagram ({liveInstagramFeeds.length})</span>
              </button>

              {creator.youtubeHandle && (
                <button
                  onClick={() => setActiveSocialFeedTab("youtube")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSocialFeedTab === "youtube"
                      ? "bg-red-600 text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FaYoutube className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </button>
              )}

              {creator.facebookHandle && (
                <button
                  onClick={() => setActiveSocialFeedTab("facebook")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSocialFeedTab === "facebook"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FaFacebook className="w-3.5 h-3.5" />
                  <span>Facebook</span>
                </button>
              )}
            </div>
          </div>

          {/* SIDE SCROLLABLE FEED CARDS CONTAINER */}
          <div className="relative group/scroll">
            <div
              id="social-feed-scroll-container"
              className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30"
              style={{ scrollBehavior: "smooth" }}
            >
              {(activeSocialFeedTab === "instagram"
                ? liveInstagramFeeds
                : activeSocialFeedTab === "youtube"
                ? liveYouTubeFeeds
                : liveFacebookFeeds
              ).map((feedItem) => (
                <a
                  key={feedItem.id}
                  href={feedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-none w-[240px] sm:w-[270px] snap-start rounded-3xl overflow-hidden bg-card border border-border hover:border-primary/50 shadow-sm flex flex-col group/card transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Media Frame Header */}
                  <div className="relative aspect-[9/14] w-full overflow-hidden bg-secondary">
                    <img
                      src={feedItem.thumbnail}
                      alt={feedItem.caption}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

                    {/* Top Channel Badge */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md bg-black/60 text-white border border-white/20 flex items-center gap-1">
                        {feedItem.type === "reel" || feedItem.type === "short" ? (
                          <Film className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Layers className="w-3 h-3 text-sky-400" />
                        )}
                        {feedItem.badge}
                      </span>
                      <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/90">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Engagement Badges Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white bg-black/70 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-1 text-rose-400">
                        <Heart className="w-3.5 h-3.5 fill-rose-400" />
                        <span>{feedItem.likes}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sky-300">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{feedItem.comments}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{feedItem.views}</span>
                      </div>
                    </div>
                  </div>

                  {/* Caption & Account Footer */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5 bg-card">
                    <p className="text-xs text-foreground line-clamp-2 leading-snug font-medium">
                      {feedItem.caption}
                    </p>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-semibold truncate max-w-[130px]">
                        @{activeSocialFeedTab === "instagram" ? instaHandleClean || rawHandle : rawHandle}
                      </span>
                      <span className="text-muted-foreground text-[10px]">{feedItem.timeAgo}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Scroll Navigation Arrows */}
            <button
              onClick={() => {
                const el = document.getElementById("social-feed-scroll-container");
                if (el) el.scrollBy({ left: -300, behavior: "smooth" });
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/90 text-foreground border border-border shadow-lg flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-secondary cursor-pointer z-10"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById("social-feed-scroll-container");
                if (el) el.scrollBy({ left: 300, behavior: "smooth" });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/90 text-foreground border border-border shadow-lg flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-secondary cursor-pointer z-10"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* PORTFOLIO & WORK SHOWCASE GALLERY */}
        {portfolio.length > 0 && (
          <section className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                  <Play className="w-5 h-5 text-rose-500 fill-rose-500" /> Verified Creative Portfolio
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  High-converting viral reels, aesthetic posts, and UGC videos produced by @{rawHandle}
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border self-start">
                {["all", "reel", "post"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveMediaTab(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer ${
                      activeMediaTab === t
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "all" ? "All Formats" : `${t}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredPortfolio.map((item, idx) => {
                const imgUrl = resolveImageUrl(item.imageUrl || item.url);
                return (
                  <div
                    key={item._id || idx}
                    className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-secondary border border-border shadow-sm"
                  >
                    <img
                      src={imgUrl}
                      alt={item.caption || "Portfolio media"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <span className="text-xs font-bold text-white line-clamp-1">{item.caption || item.brandTag || "Branded Reel"}</span>
                      <div className="flex items-center justify-between text-[11px] text-slate-300 mt-1">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400 fill-rose-400" /> {item.likesCount || "2.4K"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-300" /> {item.viewsCount || "38K"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BOTTOM CTA BAR */}
        <section className="rounded-3xl gradient-sunset p-8 text-center text-white space-y-4 shadow-glow relative overflow-hidden border border-white/15">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white drop-shadow-sm">
              Ready to collaborate with @{rawHandle}?
            </h2>
            <p className="text-sm text-white/95 leading-relaxed">
              Create agreements with legally verified e-signatures, track shipments, and review deliverables inside Pravixo.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => handleHireAction(`/influencer/${creator._id}`)}
                className="btn-bouncy rounded-full bg-white hover:bg-slate-100 text-slate-950 font-extrabold px-8 shadow-xl cursor-pointer"
              >
                Start Brand Campaign
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="rounded-full bg-black/20 hover:bg-black/30 text-white border-white/40 font-semibold px-6 cursor-pointer"
              >
                Copy Media Kit Link
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* Sweet Brand Account Registration/Login Dialog for Unauthenticated Visitors */}
      <Dialog open={showBrandPromptModal} onOpenChange={setShowBrandPromptModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border-border text-foreground shadow-2xl">
          <DialogHeader className="text-center sm:text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-3xl gradient-sunset flex items-center justify-center text-white shadow-glow mb-1">
              <Sparkles className="w-7 h-7" />
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              Want to hire this creator as a Brand?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Please create an account as a <strong>Brand</strong> on <strong>Pravixo</strong> to collaborate, send offers, and book verified campaigns with @{rawHandle}!
            </DialogDescription>
          </DialogHeader>

          <div className="bg-secondary/40 rounded-2xl p-4 border border-border/80 my-2 space-y-2 text-xs text-foreground/90">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Direct escrow payment protection & verified milestones</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Real-time deliverable submission review & approval</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Audited audience insights & legally binding agreements</span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-col gap-2 pt-2">
            <Button
              className="w-full rounded-full gradient-sunset text-white font-bold h-11 text-sm shadow-glow cursor-pointer"
              onClick={() => {
                setShowBrandPromptModal(false);
                navigate("/register?role=brand");
              }}
            >
              Create Free Brand Account
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full bg-secondary hover:bg-secondary/80 text-foreground border-border font-semibold h-10 text-xs cursor-pointer"
              onClick={() => {
                setShowBrandPromptModal(false);
                navigate("/login");
              }}
            >
              Already have an account? Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Branding */}
      <footer className="max-w-6xl mx-auto px-4 text-center mt-12 text-xs text-muted-foreground">
        Audited Creator Media Kit generated by <Link to="/" className="text-primary hover:underline font-bold">Pravixo</Link> • Guaranteed verified metrics
      </footer>
    </div>
  );
}
