import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  Star,
  MapPin,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Shirt,
  Sparkle,
  Coffee,
  UtensilsCrossed,
  Plane,
  Dumbbell,
  Gamepad2,
  Laptop,
  Coins,
  GraduationCap,
  Clapperboard,
  HeartPulse,
  Camera,
  Music2,
  Trophy,
  Compass,
  Handshake,
  ShieldCheck,
  Shield,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/Carousel";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  categories,
  formatFollowers,
  influencers,
  mockBrands,
} from "../data/influencer";
import { getGenderAvatar, DEFAULT_BANNER } from "../utils/avatar";
import { formatINR } from "@/lib/format";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

import heroBanner from "@/assets/hero-banner.jpg";
import pravixoFlow from "@/assets/pravixo-flow.jpeg";
import logoImg from "@/assets/log.png";


const CATEGORY_METADATA = {
  "Fashion": {
    icon: Shirt,
    gradient: "from-pink-500/20 via-rose-500/10 to-transparent",
    borderGlow: "hover:border-pink-500/50 hover:shadow-pink-500/15",
    iconBg: "bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-pink-500/25",
    badge: "Trending",
    tagColor: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    desc: "Apparel, runway, streetwear & styling"
  },
  "Beauty": {
    icon: Sparkle,
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
    borderGlow: "hover:border-purple-500/50 hover:shadow-purple-500/15",
    iconBg: "bg-gradient-to-tr from-purple-500 to-pink-600 text-white shadow-purple-500/25",
    badge: "Popular",
    tagColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    desc: "Makeup, skincare & personal glow"
  },
  "Lifestyle": {
    icon: Coffee,
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    borderGlow: "hover:border-amber-500/50 hover:shadow-amber-500/15",
    iconBg: "bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-amber-500/25",
    badge: "High ROI",
    tagColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    desc: "Daily vlogs, home decor & routines"
  },
  "Food & Dining": {
    icon: UtensilsCrossed,
    gradient: "from-red-500/20 via-amber-500/10 to-transparent",
    borderGlow: "hover:border-red-500/50 hover:shadow-red-500/15",
    iconBg: "bg-gradient-to-tr from-red-500 to-amber-600 text-white shadow-red-500/25",
    badge: "Hot",
    tagColor: "text-red-500 bg-red-500/10 border-red-500/20",
    desc: "Gourmet recipes, cafe reviews & culinary"
  },
  "Travel": {
    icon: Plane,
    gradient: "from-sky-500/20 via-cyan-500/10 to-transparent",
    borderGlow: "hover:border-sky-500/50 hover:shadow-sky-500/15",
    iconBg: "bg-gradient-to-tr from-sky-500 to-cyan-600 text-white shadow-sky-500/25",
    badge: "Explore",
    tagColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    desc: "Wanderlust, destinations & stays"
  },
  "Fitness": {
    icon: Dumbbell,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    borderGlow: "hover:border-emerald-500/50 hover:shadow-emerald-500/15",
    iconBg: "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-emerald-500/25",
    badge: "Active",
    tagColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    desc: "Workouts, nutrition & healthy living"
  },
  "Gaming": {
    icon: Gamepad2,
    gradient: "from-indigo-500/20 via-violet-500/10 to-transparent",
    borderGlow: "hover:border-indigo-500/50 hover:shadow-indigo-500/15",
    iconBg: "bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-indigo-500/25",
    badge: "Esports",
    tagColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    desc: "Live streams, walkthroughs & gaming rigs"
  },
  "Technology": {
    icon: Laptop,
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
    borderGlow: "hover:border-blue-500/50 hover:shadow-blue-500/15",
    iconBg: "bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-blue-500/25",
    badge: "Tech Giants",
    tagColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    desc: "Gadget unboxing, AI software & setups"
  },
  "Finance": {
    icon: Coins,
    gradient: "from-emerald-600/20 via-green-500/10 to-transparent",
    borderGlow: "hover:border-emerald-500/50 hover:shadow-emerald-500/15",
    iconBg: "bg-gradient-to-tr from-emerald-600 to-green-600 text-white shadow-emerald-500/25",
    badge: "Investing",
    tagColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    desc: "Stocks, crypto, wealth building & taxes"
  },
  "Education": {
    icon: GraduationCap,
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    borderGlow: "hover:border-violet-500/50 hover:shadow-violet-500/15",
    iconBg: "bg-gradient-to-tr from-violet-500 to-purple-600 text-white shadow-violet-500/25",
    badge: "Learn",
    tagColor: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    desc: "Upskilling, exam prep & career growth"
  },
  "Entertainment": {
    icon: Clapperboard,
    gradient: "from-fuchsia-500/20 via-pink-500/10 to-transparent",
    borderGlow: "hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/15",
    iconBg: "bg-gradient-to-tr from-fuchsia-500 to-pink-600 text-white shadow-fuchsia-500/25",
    badge: "Viral",
    tagColor: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
    desc: "Comedy sketches, podcasts & cinema"
  },
  "Health": {
    icon: HeartPulse,
    gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    borderGlow: "hover:border-rose-500/50 hover:shadow-rose-500/15",
    iconBg: "bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-rose-500/25",
    badge: "Wellness",
    tagColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    desc: "Holistic care, mental peace & wellness"
  },
  "Photography": {
    icon: Camera,
    gradient: "from-slate-500/20 via-zinc-500/10 to-transparent",
    borderGlow: "hover:border-slate-400/50 hover:shadow-slate-500/15",
    iconBg: "bg-gradient-to-tr from-slate-600 to-zinc-800 text-white shadow-slate-500/25",
    badge: "Visuals",
    tagColor: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    desc: "Cinematography, photo shoots & gear"
  },
  "Music": {
    icon: Music2,
    gradient: "from-purple-600/20 via-indigo-600/10 to-transparent",
    borderGlow: "hover:border-purple-500/50 hover:shadow-purple-500/15",
    iconBg: "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/25",
    badge: "Audio",
    tagColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    desc: "Original tracks, covers & sound artists"
  },
  "Sports": {
    icon: Trophy,
    gradient: "from-orange-500/20 via-amber-500/10 to-transparent",
    borderGlow: "hover:border-orange-500/50 hover:shadow-orange-500/15",
    iconBg: "bg-gradient-to-tr from-orange-500 to-amber-600 text-white shadow-orange-500/25",
    badge: "Athletics",
    tagColor: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    desc: "Cricket, athletics, training & fitness"
  },
  "Other": {
    icon: Compass,
    gradient: "from-primary/20 via-pink-500/10 to-transparent",
    borderGlow: "hover:border-primary/50 hover:shadow-primary/15",
    iconBg: "bg-gradient-to-tr from-primary to-pink-600 text-white shadow-primary/25",
    badge: "Niche",
    tagColor: "text-primary bg-primary/10 border-primary/20",
    desc: "Custom niches, creators & specialities"
  }
};

const ACCENTS = [
  {
    ring: "hover:border-pink-500/50 hover:shadow-pink-500/10",
    bar: "bg-gradient-to-r from-pink-500 to-rose-500",
    tile: "bg-pink-500/10 text-pink-500",
  },
  {
    ring: "hover:border-purple-500/50 hover:shadow-purple-500/10",
    bar: "bg-gradient-to-r from-purple-500 to-indigo-500",
    tile: "bg-purple-500/10 text-purple-500",
  },
  {
    ring: "hover:border-amber-500/50 hover:shadow-amber-500/10",
    bar: "bg-gradient-to-r from-amber-500 to-orange-500",
    tile: "bg-amber-500/10 text-amber-500",
  },
  {
    ring: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
    tile: "bg-emerald-500/10 text-emerald-500",
  },
  {
    ring: "hover:border-sky-500/50 hover:shadow-sky-500/10",
    bar: "bg-gradient-to-r from-sky-500 to-blue-500",
    tile: "bg-sky-500/10 text-sky-500",
  },
  {
    ring: "hover:border-rose-500/50 hover:shadow-rose-500/10",
    bar: "bg-gradient-to-r from-rose-500 to-red-500",
    tile: "bg-rose-500/10 text-rose-500",
  },
];

const getCategoryIcon = (name) => {
  const meta = CATEGORY_METADATA[name];
  if (meta && meta.icon) return meta.icon;
  return Compass;
};

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

function FeaturedProfileCard({ inf, user, handleCardClick }) {
  const isBrand = inf.role === "brand";
  const targetUrl = isBrand ? `/brand/${inf.id}` : `/influencer/${inf.id}`;

  const bannerImg = resolveImageUrl(inf.cover || inf.coverUrl || inf.bannerUrl) || DEFAULT_BANNER;
  const avatarImg = resolveImageUrl(inf.avatar || inf.avatarUrl) || getGenderAvatar(inf.name || "User", inf.gender, inf.role || (isBrand ? "brand" : "creator"));

  const hasBarter = Boolean(inf.isBarterAllowed);
  const priceNum = Number(inf.startingPrice || 0);
  const isPureBarter = hasBarter && priceNum === 0;

  return (
    <Link
      to={targetUrl}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-primary/40 hover:shadow-primary/10 card-3d"
    >
      {/* Light sweep hover effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />

      {/* COVER / BANNER */}
      <div className="relative aspect-[1361/450] w-full overflow-hidden bg-muted">
        <img
          src={bannerImg}
          alt={inf.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_BANNER;
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Category & Badge */}
        <div className="absolute right-2 top-2 flex items-center gap-1.5 z-10">
          <Badge
            className="
              rounded-full border-0
              bg-black/60 text-white
              dark:bg-zinc-900/80 dark:text-white
              backdrop-blur-md
              px-2.5 py-0.5 sm:px-3 sm:py-1
              text-[10px] sm:text-xs font-semibold
              shadow-sm
              transition-colors duration-300
              group-hover:bg-primary group-hover:text-white
            "
          >
            {inf.category}
          </Badge>
        </div>

        {hasBarter && (
          <div className="absolute left-2 top-2 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold shadow-md animate-pulse">
              <Handshake className="h-3 w-3" /> Barter
            </span>
          </div>
        )}
      </div>

      {/* PROFILE CONTENT */}
      <div className="-mt-7 flex flex-1 flex-col px-3 pb-3 sm:-mt-10 sm:px-5 sm:pb-5">
        <div className="relative inline-block w-fit">
          <img
            src={avatarImg}
            alt={inf.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="relative z-10 h-14 w-14 rounded-full border-4 border-card bg-muted object-cover shadow-elevated transition-transform duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary/40 sm:h-20 sm:w-20"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getGenderAvatar(inf.name || "User", inf.gender, inf.role || (isBrand ? "brand" : "creator"));
            }}
          />
        </div>

        <div className="mt-2.5 flex items-start justify-between gap-2 sm:mt-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xs font-bold sm:text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
              <span className="truncate">{inf.name}</span>
              {(inf.verificationStatus === "verified" || inf.isVerified) && (
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0 inline-block fill-blue-500/15" title="Verified Profile" />
              )}
            </h3>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs font-medium">
              {inf.handle}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-amber-500 sm:text-sm bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Star className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" />
            {inf.rating || 5.0}
          </span>
        </div>

        <div className="mt-auto pt-3">
          {/* LOCATION + FOLLOWERS */}
          <div className="mt-2 flex flex-col justify-between gap-1 border-t border-border/80 pt-2.5 text-[10px] sm:mt-3 sm:flex-row sm:items-center sm:text-xs">
            <span className="flex items-center gap-1 truncate text-muted-foreground font-medium">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary/70" />
              {inf.location?.split(",")[0] || "India"}
            </span>
            <span className="font-semibold text-foreground">
              {formatFollowers(inf.followers || 0)}{" "}
              <span className="text-muted-foreground font-normal">followers</span>
            </span>
          </div>

          {/* PRICE / BARTER */}
          <div className="mt-2 flex items-center justify-between text-[11px] sm:text-sm">
            <span className="text-muted-foreground font-medium text-[10px] sm:text-xs">
              {isPureBarter ? "Collaboration" : "Starting from"}
            </span>

            {isPureBarter ? (
              <span className="inline-flex items-center gap-1 font-display text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shadow-xs transition-transform duration-300 group-hover:scale-105">
                <Handshake className="h-3.5 w-3.5" /> Barter Deal
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs font-black text-gradient-sunset sm:text-base">
                  {formatINR(priceNum)}
                </span>
                {hasBarter && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md">
                    <Handshake className="h-2.5 w-2.5" /> Barter
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [liveCreators, setLiveCreators] = useState([]);
  const [liveBrands, setLiveBrands] = useState([]);

  const [creatorsApi, setCreatorsApi] = useState(null);
  const [brandsApi, setBrandsApi] = useState(null);
  const [categoriesApi, setCategoriesApi] = useState(null);

  const [creatorsHovered, setCreatorsHovered] = useState(false);
  const [brandsHovered, setBrandsHovered] = useState(false);
  const [categoriesHovered, setCategoriesHovered] = useState(false);

  const [creatorsIndex, setCreatorsIndex] = useState(0);
  const [brandsIndex, setBrandsIndex] = useState(0);
  const [categoriesIndex, setCategoriesIndex] = useState(0);

  const [creatorsSnaps, setCreatorsSnaps] = useState([]);
  const [brandsSnaps, setBrandsSnaps] = useState([]);
  const [categoriesSnaps, setCategoriesSnaps] = useState([]);

  useEffect(() => {
    document.title = "Pravixo — Hire creators that move the needle";

    const fetchLiveProfiles = async () => {
      try {
        const [creatorsRes, brandsRes] = await Promise.all([
          api.get("/profiles", { params: { role: "creator" } }),
          api.get("/profiles", { params: { role: "brand" } }),
        ]);

        const creatorsData =
          creatorsRes.data?.data ||
          creatorsRes.data?.profiles ||
          creatorsRes.data ||
          [];

        const brandsData =
          brandsRes.data?.data ||
          brandsRes.data?.profiles ||
          brandsRes.data ||
          [];

        if (Array.isArray(creatorsData)) {
          setLiveCreators(creatorsData);
        }
        if (Array.isArray(brandsData)) {
          setLiveBrands(brandsData);
        }
      } catch (error) {
        console.error("Failed to load profiles for home:", error);
      }
    };

    fetchLiveProfiles();
  }, []);

  const isTestOrDummyProfile = (p) => {
    if (!p) return true;
    if (p.isSuspended) return true;
    const name = (p.fullName || p.name || "").toLowerCase().trim();
    const email = (p.email || "").toLowerCase().trim();
    if (email.includes("@pravixo.test") || email.includes("@test.com")) return true;
    return /task20|impostor|suspended|test brand|alice referrer|bob creator|charlie creator|^test$|^ppp$|^llalla$/i.test(name);
  };

  const featuredCreators = useMemo(() => {
    const live = (liveCreators || [])
      .filter((p) => !isTestOrDummyProfile(p))
      .map((p) => ({
        id: p._id || p.id,
        name: p.fullName || p.name || "Creator",
        handle:
          p.handle ? `@${p.handle.replace(/^@+/, '')}` :
          `@${(p.fullName || p.name || "creator")
            .toLowerCase()
            .replace(/\s/g, "")}`,
        category: p.category || "General",
        followers:
          (p.instagramFollowers || 0) +
          (p.facebookFollowers || 0) +
          (p.linkedinFollowers || 0) +
          (p.youtubeFollowers || 0) +
          (p.quoraFollowers || 0) +
          (p.twitterFollowers || 0),
        startingPrice: p.startingPrice || 0,
        isBarterAllowed: Boolean(p.isBarterAllowed),
        location: p.location || "India",
        rating: p.rating ?? 5.0,
        reviews: p.reviewsCount ?? 0,
        available: true,
        gender: p.gender || "",
        avatar: resolveImageUrl(p.avatarUrl || p.avatar || p.profileImage) ||
          getGenderAvatar(p.fullName || p.name || "Creator", p.gender, "creator"),
        cover: resolveImageUrl(p.coverUrl || p.cover || p.bannerUrl) ||
          DEFAULT_BANNER,
        bio: p.bio || "",
        verificationStatus: p.verificationStatus || (p.isVerified ? "verified" : "unverified"),
        role: p.role || "creator",
      }));

    const orderedLive = [...live].sort((a, b) => {
      if (profile?.role === "creator") {
        if (a.id === profile?._id) return -1;
        if (b.id === profile?._id) return 1;
      }
      return 0;
    });

    return orderedLive.length > 0 ? orderedLive.slice(0, 12) : influencers.slice(0, 6);
  }, [liveCreators, profile]);

  const featuredBrands = useMemo(() => {
    const live = (liveBrands || [])
      .filter((p) => !isTestOrDummyProfile(p))
      .map((p) => ({
        id: p._id || p.id,
        name: p.fullName || p.name || "Brand",
        handle:
          p.handle ||
          `@${(p.fullName || p.name || "brand")
            .toLowerCase()
            .replace(/\s/g, "")}`,
        category: p.category || "General",
        followers: 0,
        startingPrice: p.startingPrice || 0,
        isBarterAllowed: Boolean(p.isBarterAllowed),
        location: p.location || "India",
        rating: p.rating ?? 5.0,
        reviews: p.reviewsCount ?? 0,
        available: true,
        gender: p.gender || "",
        avatar: resolveImageUrl(p.avatarUrl || p.avatar || p.profileImage) ||
          getGenderAvatar(p.fullName || p.name || "Brand", p.gender, "brand"),
        cover: resolveImageUrl(p.coverUrl || p.cover || p.bannerUrl) ||
          DEFAULT_BANNER,
        bio: p.bio || "",
        verificationStatus: p.verificationStatus || (p.isVerified ? "verified" : "unverified"),
        role: p.role || "brand",
      }));

    return live.length > 0 ? live.slice(0, 12) : mockBrands.slice(0, 6);
  }, [liveBrands]);

  const handleProfileCardClick = (profileId, role) => {
    const targetUrl =
      role === "brand" ? `/brand/${profileId}` : `/influencer/${profileId}`;
    setPendingRedirectUrl(targetUrl);
    setShowAuthModal(true);
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/browse");
    }
  };

  const isSuspended =
    profile?.isSuspended &&
    profile?.suspendedUntil &&
    new Date(profile.suspendedUntil) > new Date();

  // Autoplay for categories
  useEffect(() => {
    if (!categoriesApi || categoriesHovered) return;
    const interval = setInterval(() => {
      categoriesApi.scrollNext();
    }, 4500);
    return () => clearInterval(interval);
  }, [categoriesApi, categoriesHovered]);

  // Autoplay for creators
  useEffect(() => {
    if (!creatorsApi || creatorsHovered) return;
    const interval = setInterval(() => {
      creatorsApi.scrollNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [creatorsApi, creatorsHovered]);

  // Autoplay for brands
  useEffect(() => {
    if (!brandsApi || brandsHovered) return;
    const interval = setInterval(() => {
      brandsApi.scrollNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [brandsApi, brandsHovered]);

  // Categories snaps & select listener
  useEffect(() => {
    if (!categoriesApi) return;
    const updateCategories = () => {
      setCategoriesSnaps(categoriesApi.scrollSnapList?.() || []);
      setCategoriesIndex(categoriesApi.selectedScrollSnap?.() || 0);
    };
    updateCategories();
    categoriesApi.on?.("select", updateCategories);
    return () => {
      categoriesApi.off?.("select", updateCategories);
    };
  }, [categoriesApi]);

  // Creators snaps & select listener
  useEffect(() => {
    if (!creatorsApi) return;
    const updateCreators = () => {
      setCreatorsSnaps(creatorsApi.scrollSnapList?.() || []);
      setCreatorsIndex(creatorsApi.selectedScrollSnap?.() || 0);
    };
    updateCreators();
    creatorsApi.on?.("select", updateCreators);
    return () => {
      creatorsApi.off?.("select", updateCreators);
    };
  }, [creatorsApi]);

  // Brands snaps & select listener
  useEffect(() => {
    if (!brandsApi) return;
    const updateBrands = () => {
      setBrandsSnaps(brandsApi.scrollSnapList?.() || []);
      setBrandsIndex(brandsApi.selectedScrollSnap?.() || 0);
    };
    updateBrands();
    brandsApi.on?.("select", updateBrands);
    return () => {
      brandsApi.off?.("select", updateBrands);
    };
  }, [brandsApi]);

  return (
    <div className="overflow-hidden">
      {/* SUSPENSION ALERT */}
      {isSuspended && (
        <div className="border-b border-destructive/30 bg-destructive/15 px-4 py-3 text-center text-sm font-medium text-destructive">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Your account is temporarily suspended until{" "}
              {new Date(profile.suspendedUntil).toLocaleDateString()}. Reason:{" "}
              {profile.suspensionReason || "Guideline violation"}
            </span>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:pb-16">
        {/* Background Banner Image */}
        <div className="absolute inset-0 -z-10">
          <img
            src={heroBanner}
            alt="Featured creators across fashion, fitness, tech, beauty, travel and food"
            className="h-full w-full scale-105 object-cover blur-xs"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/80 to-background" />
          <div className="absolute inset-0 bg-background/30" />
        </div>

        {/* 3D Ambient Gradient Blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-32 -top-40 h-[32rem] w-[32rem] rounded-full gradient-warm opacity-25 blur-3xl animate-blob" />
          <div
            className="absolute right-0 top-10 h-[30rem] w-[30rem] rounded-full gradient-pink opacity-25 blur-3xl animate-blob"
            style={{ animationDelay: "4s" }}
          />
          <div
            className="absolute left-1/3 bottom-0 h-[24rem] w-[24rem] rounded-full gradient-sunset opacity-15 blur-3xl animate-blob"
            style={{ animationDelay: "8s" }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center relative">

            {/* Heading */}
            <h1 className="text-center font-display font-extrabold tracking-tight select-none">
              <span className="block text-[clamp(2.4rem,5.2vw,4.6rem)] leading-[1.08] text-foreground font-black">
                Find the right influencers
              </span>
              <span className="block text-[clamp(2.4rem,5.2vw,4.6rem)] leading-[1.08] mt-1 text-gradient-sunset font-black">
                for your Brand
              </span>
              <span className="inline-block text-[clamp(2.1rem,4.6vw,4.2rem)] leading-[1.08] mt-1.5 text-gradient-sunset font-black">
                in Minutes.
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground font-normal leading-relaxed">
              Connect directly with verified creators and top brands across every niche for barter collaborations and paid campaigns.
            </p>

            {/* Search Input with 3D Glow Container */}
            <form
              onSubmit={handleSearch}
              className="mx-auto mt-8 flex max-w-3xl items-center gap-2 rounded-full border border-border/80 bg-card/95 p-2 shadow-2xl backdrop-blur-md focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 transition-all duration-300"
            >
              <Search className="ml-4 h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search creators by niche, location, handle, or 'barter'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-2 text-sm sm:text-base outline-none placeholder:text-muted-foreground font-medium"
              />
              <Button
                type="submit"
                size="sm"
                className="rounded-full gradient-sunset border-0 px-6 py-2.5 text-white shadow-glow hover:opacity-95 transition-all hover:scale-105 active:scale-95 text-xs font-bold"
              >
                Search <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </form>

            {/* Interactive Quick Search Pills */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase tracking-wider">Popular:</span>
              {[
                { label: "Barter Deals", query: "barter", icon: Handshake, iconColor: "text-emerald-500" },
                { label: "Fashion & Style", query: "fashion", icon: Shirt, iconColor: "text-pink-500" },
                { label: "Tech & Gadgets", query: "tech", icon: Laptop, iconColor: "text-blue-500" },
                { label: "Food & Beverage", query: "food", icon: UtensilsCrossed, iconColor: "text-amber-500" },
                { label: "Health & Fitness", query: "fitness", icon: Dumbbell, iconColor: "text-rose-500" },
                { label: "Travel & Living", query: "travel", icon: Plane, iconColor: "text-sky-500" },
                { label: "Beauty & Makeup", query: "beauty", icon: Sparkles, iconColor: "text-purple-500" },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => navigate(`/browse?q=${encodeURIComponent(pill.query)}`)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all duration-200 shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                >
                  <pill.icon className={cn("h-3.5 w-3.5", pill.iconColor || "text-primary")} />
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>

            {/* Live Trust Metrics Strip */}
            <div className="mt-8 pt-6 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-center">
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black font-outfit text-foreground">10,000+</div>
                <div className="text-xs text-muted-foreground font-medium">Verified Creators</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black font-outfit text-primary">₹0 Fee</div>
                <div className="text-xs text-muted-foreground font-medium">Barter Collabs</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black font-outfit text-emerald-400">100% Secure</div>
                <div className="text-xs text-muted-foreground font-medium">Direct Deals</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black font-outfit text-purple-400">&lt; 24 Hours</div>
                <div className="text-xs text-muted-foreground font-medium">Average Response</div>
              </div>
            </div>

            {/* Payment info buttons */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold border-border/80 bg-background/60 backdrop-blur hover:bg-accent hover:border-primary/40 shadow-xs gap-1.5"
                onClick={() =>
                  navigate("/protection-info", {
                    state: { type: "creator" },
                  })
                }
              >
                <Wallet className="h-3.5 w-3.5 text-amber-500" />
                How do I get paid? (Creators)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold border-border/80 bg-background/60 backdrop-blur hover:bg-accent hover:border-primary/40 shadow-xs gap-1.5"
                onClick={() =>
                  navigate("/protection-info", {
                    state: { type: "brand" },
                  })
                }
              >
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                How is my money protected? (Brands)
              </Button>
            </div>

            {/* If logged out CTA Buttons */}
            {!user && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/register?role=brand">
                  <Button
                    size="lg"
                    className="min-w-[210px] justify-center rounded-full gradient-sunset border-0 text-white shadow-glow transition-transform hover:scale-105 hover:opacity-95 font-bold"
                  >
                    I'm a brand
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/register?role=creator">
                  <Button
                    size="lg"
                    className="min-w-[210px] justify-center rounded-full gradient-sunset border-0 text-white shadow-glow transition-transform hover:scale-105 hover:opacity-95 font-bold"
                  >
                    I'm an influencer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================
          BROWSE BY CATEGORY
      ========================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Find creators by category
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Every creator is verified and grouped by niche, so you can shortlist
              the right audience for your campaign in minutes.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/browse"
              className="group inline-flex items-center gap-2 rounded-full gradient-sunset px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-glow transition-all hover:scale-105 active:scale-95"
            >
              <span>View all categories</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent cursor-pointer"
                onClick={() => categoriesApi?.scrollPrev()}
                aria-label="Previous categories slide"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent cursor-pointer"
                onClick={() => categoriesApi?.scrollNext()}
                aria-label="Next categories slide"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          onMouseEnter={() => setCategoriesHovered(true)}
          onMouseLeave={() => setCategoriesHovered(false)}
        >
          <Carousel
            setApi={setCategoriesApi}
            opts={{ loop: true, align: "start" }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 sm:-ml-5">
              {categories.map((c, i) => {
                const meta = CATEGORY_METADATA[c.name] || {};
                const accent = ACCENTS[i % ACCENTS.length];
                const IconComp = meta.icon || getCategoryIcon(c.name);

                const creatorCount = (liveCreators || []).filter((p) => {
                  if (isTestOrDummyProfile(p)) return false;
                  const cats = (p.category || "").toLowerCase();
                  return cats.includes(c.name.toLowerCase());
                }).length;

                return (
                  <CarouselItem
                    key={c.name}
                    className="basis-full pl-3 sm:basis-1/2 sm:pl-5 lg:basis-1/3 xl:basis-1/4"
                  >
                    <Link
                      to={`/browse?category=${encodeURIComponent(c.name)}`}
                      className={cn(
                        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        accent.ring
                      )}
                    >
                      {/* Accent line along the top edge */}
                      <span className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100", accent.bar)} />

                      <div className="flex items-start justify-between">
                        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105", accent.tile)}>
                          <IconComp className="h-7 w-7" strokeWidth={1.8} />
                        </div>
                        <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {creatorCount > 0
                            ? `${creatorCount} ${creatorCount === 1 ? "creator" : "creators"}`
                            : "Coming soon"}
                        </span>
                      </div>

                      <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-foreground">
                        {c.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {meta.desc || "Top tier creators & influencers"}
                      </p>

                      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-foreground">
                        <span>Browse creators</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Category Dots */}
        {categoriesSnaps.length > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {categoriesSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                  index === categoriesIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                onClick={() => categoriesApi?.scrollTo(index)}
                aria-label={`Go to category slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* =========================
          FEATURED CREATORS
      ========================= */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Featured creators
            </h2>
            <p className="mt-2 text-muted-foreground">
              Hand-picked by our team this week.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/browse?role=creator"
              className="group inline-flex items-center gap-2 rounded-full gradient-sunset px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-glow transition-all hover:scale-105 active:scale-95"
            >
              <span>View all creators</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent"
                onClick={() => creatorsApi?.scrollPrev()}
                aria-label="Previous slide"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent"
                onClick={() => creatorsApi?.scrollNext()}
                aria-label="Next slide"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          onMouseEnter={() => setCreatorsHovered(true)}
          onMouseLeave={() => setCreatorsHovered(false)}
        >
          <Carousel
            setApi={setCreatorsApi}
            opts={{ loop: true, align: "start" }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 sm:-ml-6">
              {featuredCreators.map((inf) => (
                <CarouselItem
                  key={inf.id}
                  className="basis-full pl-3 sm:basis-1/2 sm:pl-6 lg:basis-1/3"
                >
                  <FeaturedProfileCard
                    inf={inf}
                    user={user}
                    handleCardClick={handleProfileCardClick}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Creator Dots */}
        {creatorsSnaps.length > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {creatorsSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === creatorsIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                onClick={() => creatorsApi?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* =========================
          FEATURED BRANDS
      ========================= */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Featured brands
            </h2>
            <p className="mt-2 text-muted-foreground">
              Vetted brands hiring creators today.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/browse?role=brand"
              className="group inline-flex items-center gap-2 rounded-full gradient-sunset px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-glow transition-all hover:scale-105 active:scale-95"
            >
              <span>View all brands</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent"
                onClick={() => brandsApi?.scrollPrev()}
                aria-label="Previous slide"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent"
                onClick={() => brandsApi?.scrollNext()}
                aria-label="Next slide"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          onMouseEnter={() => setBrandsHovered(true)}
          onMouseLeave={() => setBrandsHovered(false)}
        >
          <Carousel
            setApi={setBrandsApi}
            opts={{ loop: true, align: "start" }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 sm:-ml-6">
              {featuredBrands.map((brand) => (
                <CarouselItem
                  key={brand.id}
                  className="basis-full pl-3 sm:basis-1/2 sm:pl-6 lg:basis-1/3"
                >
                  <FeaturedProfileCard
                    inf={brand}
                    user={user}
                    handleCardClick={handleProfileCardClick}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Brand Dots */}
        {brandsSnaps.length > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {brandsSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === brandsIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                onClick={() => brandsApi?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* =========================
          PRAVIXO FLOW
      ========================= */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            How Pravixo Works
          </h2>
          <p className="mt-2 text-muted-foreground">
            Secure. Transparent. Trusted.
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-elevated">
          <img
            src={pravixoFlow}
            alt="Pravixo Flow"
            className="w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          />
        </div>
      </section>

      {/* =========================
          CTA
      ========================= */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] gradient-sunset p-10 text-center text-white shadow-glow sm:p-16">
          <div
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white, transparent 40%), radial-gradient(circle at 80% 60%, white, transparent 40%)",
            }}
          />

          <div className="relative">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">
              Ready to launch your next campaign?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Join thousands of brands and creators using Pravixo to grow together.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {!user ? (
                <Link to="/register">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                  >
                    Start free
                  </Button>
                </Link>
              ) : (
                <Link
                  to={
                    profile?.role === "creator"
                      ? "/dashboard/influencer"
                      : "/dashboard/customer"
                  }
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              )}

              <Link to="/browse">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                >
                  Explore creators
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          />

          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-elevated animate-in fade-in zoom-in duration-200">
            <h3 className="font-display text-lg font-bold text-foreground">
              Sign In Required
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in or create an account to view full profile details and pricing tiers.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAuthModal(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate("/login", {
                    state: { from: pendingRedirectUrl },
                  });
                }}
                className="rounded-full gradient-sunset border-0 text-white shadow-glow"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}