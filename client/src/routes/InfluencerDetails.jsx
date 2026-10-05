import { useEffect, useMemo, useState, useCallback } from "react";
import {
  useParams,
  useNavigate,
  Link,
} from "react-router-dom";


import {
  MapPin,
  Star,
  Heart,
  Share2,
  MessageCircle,
  Check,
  UserPlus,
  Users,
  Globe,
  ShieldCheck,
  X,
  Film,
  Camera,
  Sparkles,
  Play,
  Eye,
  Trash2,
  Handshake,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getGenderAvatar, DEFAULT_BANNER } from "../utils/avatar";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/TextArea";

import {
  formatFollowers,
  influencers,
  mockBrands,
} from "../data/influencer";

import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import api from "@/lib/api";

// =====================================================
// CUSTOM QUORA ICON
// =====================================================

const QuoraIcon = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M16.592 16.483c.783-.984 1.258-2.228 1.258-3.585 0-3.155-2.558-5.713-5.713-5.713S6.423 9.743 6.423 12.898s2.558 5.713 5.713 5.713c1.088 0 2.106-.305 2.975-.833l3.208 3.208c.28.28.73.28 1.01 0a.715.715 0 000-1.01l-2.737-2.493zm-4.455.518c-2.099 0-3.8-1.701-3.8-3.8 0-2.099 1.701-3.8 3.8-3.8s3.8 1.701 3.8 3.8c0 2.099-1.701 3.8-3.8 3.8z" />
  </svg>
);

// =====================================================
// SOCIAL ICON
// We don't use lucide brand icons.
// =====================================================

const SocialIcon = ({ platform, className = "" }) => {
  const icons = {
    Instagram: "◎",
    Facebook: "f",
    LinkedIn: "in",
    YouTube: "▶",
    Quora: "Q",
    "X (Twitter)": "𝕏",
  };

  return (
    <span
      className={`font-bold flex items-center justify-center ${className}`}
    >
      {icons[platform] || "•"}
    </span>
  );
};

// =====================================================
// FALLBACK COVER
// =====================================================

const fallbackCover =
  "https://api.dicebear.com/7.x/shapes/svg";

// =====================================================
// API HELPERS
// =====================================================

const fetchProfileById = async (id) => {
  const res = await api.get(`/profiles/${id}`);
  return res.data?.data || res.data;
};

const fetchPortfolio = async (profileId) => {
  const res = await api.get(`/portfolio/profile/${profileId}`);
  return res.data?.data || res.data;
};

const fetchSocialConnections = async (profileId) => {
  try {
    const res = await api.get(`/social/profile/${profileId}`);
    return res.data?.data || res.data || [];
  } catch {
    return [];
  }
};


// =====================================================
// LOADER
// =====================================================

export const loader = async ({ params }) => {
  const profileId = params.id;

  let inf =
    influencers.find(
      (item) => String(item.id) === String(profileId)
    ) ||
    mockBrands.find(
      (item) => String(item.id) === String(profileId)
    );

  // ===================================================
  // FETCH FROM NODE BACKEND
  // ===================================================

  if (!inf && profileId) {
    try {
      const profileResponse =
        await fetchProfileById(profileId);

      const profile =
        profileResponse?.data ||
        profileResponse?.profile ||
        profileResponse;

      if (profile) {
        let portfolioImages = [];
        let socialConnections = [];

        try {
          const [portfolioResponse, socialResponse] = await Promise.all([
            fetchPortfolio(profile._id || profile.id),
            fetchSocialConnections(profile._id || profile.id),
          ]);

          const portfolioData =
            portfolioResponse?.data || portfolioResponse || [];

          portfolioImages = Array.isArray(portfolioData) ? portfolioData : [];
          socialConnections = Array.isArray(socialResponse) ? socialResponse : [];
        } catch (portfolioError) {
          console.error(
            "Portfolio / social fetch failed:",
            portfolioError
          );
        }

        const fullName =
          profile.fullName ||
          profile.name ||
          "Creator";

        inf = {
          id: profile._id || profile.id,

          name: fullName,

          handle:
            profile.handle ||
            `@${fullName
              .toLowerCase()
              .replace(/\s/g, "")}`,

          category:
            profile.category || "General",

          followers:
            Number(
              profile.instagramFollowers || 0
            ) +
            Number(
              profile.facebookFollowers || 0
            ) +
            Number(
              profile.linkedinFollowers || 0
            ) +
            Number(
              profile.youtubeFollowers || 0
            ) +
            Number(
              profile.quoraFollowers || 0
            ) +
            Number(
              profile.twitterFollowers || 0
            ),

          startingPrice:
            Number(profile.startingPrice || 0),

          location:
            profile.location || "India",

          rating:
            profile.rating ?? 5,

          reviews:
            profile.reviewsCount ?? 0,

          available: true,

          avatar:
            (profile.avatarUrl && profile.avatarUrl !== "undefined" && profile.avatarUrl !== "null")
              ? (profile.avatarUrl.startsWith("/") ? `${(import.meta.env.VITE_API_URL || "http://localhost:5000").replace("/api", "")}${profile.avatarUrl}` : profile.avatarUrl)
              : getGenderAvatar(profile.fullName || "User", profile.gender, profile.role),

          cover:
            (profile.coverUrl && profile.coverUrl !== "undefined" && profile.coverUrl !== "null")
              ? (profile.coverUrl.startsWith("/") ? `${(import.meta.env.VITE_API_URL || "http://localhost:5000").replace("/api", "")}${profile.coverUrl}` : profile.coverUrl)
              : fallbackCover,

          bio:
            profile.bio ||
            (profile.role === "brand"
              ? "Brand details on Pravixo."
              : "Creator on Pravixo."),

          portfolioImages,

          instagramHandle:
            profile.instagramHandle,

          instagramFollowers:
            Number(
              profile.instagramFollowers || 0
            ),

          facebookHandle:
            profile.facebookHandle,

          facebookFollowers:
            Number(
              profile.facebookFollowers || 0
            ),

          linkedinHandle:
            profile.linkedinHandle,

          linkedinFollowers:
            Number(
              profile.linkedinFollowers || 0
            ),

          youtubeHandle:
            profile.youtubeHandle,

          youtubeFollowers:
            Number(
              profile.youtubeFollowers || 0
            ),

          quoraHandle:
            profile.quoraHandle,

          quoraFollowers:
            Number(
              profile.quoraFollowers || 0
            ),

          twitterHandle:
            profile.twitterHandle,

          twitterFollowers:
            Number(
              profile.twitterFollowers || 0
            ),

          pricingTiers:
            profile.pricingTiers || [],

          role:
            profile.role || "creator",

          verificationStatus:
            profile.verificationStatus,

          website:
            profile.website,

          companySize:
            profile.companySize,

          prefNiches:
            profile.prefNiches,

          prefBudget:
            profile.prefBudget,

          prefReach:
            profile.prefReach,

          prefRegions:
            profile.prefRegions,

          campaigns:
            profile.campaigns || [],

          campaignsCount:
            profile.campaignsCount || 0,

          hiredCount:
            profile.hiredCount || 0,

          socialConnections:
            socialConnections || [],
        };
      }
    } catch (error) {
      console.error(
        "Node profile fetch failed:",
        error
      );
    }
  }

  if (!inf) {
    throw new Response(
      "Creator not found",
      {
        status: 404,
        statusText: "Creator not found",
      }
    );
  }

  return { inf };
};

// =====================================================
// DEFAULT TIERS
// =====================================================

const tiers = [
  {
    name: "Story",
    price: 1,
    perks: [
      "1 story slide",
      "24h live",
      "Link in story",
      "Quick turnaround",
    ],
  },
  {
    name: "Post",
    price: 2.5,
    perks: [
      "1 in-feed post",
      "2 revisions",
      "Caption draft",
      "Performance recap",
    ],
    popular: true,
  },
  {
    name: "Reel",
    price: 4,
    perks: [
      "30–60s reel",
      "Concept call",
      "3 revisions",
      "Cross-post to TikTok",
    ],
  },
];

// =====================================================
// BRAND DETAILS
// =====================================================

const getBrandProfileDetails = (
  brandId,
  brandName
) => {
  const nameLower =
    String(brandName || "").toLowerCase();

  const isNike =
    nameLower.includes("nike");

  const isZomato =
    nameLower.includes("zomato");

  const isTata =
    nameLower.includes("tata") ||
    nameLower.includes("hawa");

  let companySize =
    "50 - 200 employees";

  let website =
    "https://www.hawai.restaurant";

  let campaignsCount = 14;
  let hiredCount = 52;
  let activeCampaignsCount = 2;
  let successRate = "95%";

  if (isNike) {
    companySize = "10,000+ employees";
    website = "https://www.nike.com/in";
    campaignsCount = 24;
    hiredCount = 180;
    activeCampaignsCount = 3;
    successRate = "98%";
  }

  if (isZomato) {
    companySize = "5,000 - 10,000 employees";
    website = "https://www.zomato.com";
    campaignsCount = 36;
    hiredCount = 320;
    activeCampaignsCount = 5;
    successRate = "96%";
  }

  if (isTata) {
    companySize = "50,000+ employees";
    website = "https://www.tatamotors.com";
    campaignsCount = 15;
    hiredCount = 95;
    activeCampaignsCount = 2;
    successRate = "99%";
  }

  const defaultGallery = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=400&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
  ];

  let gallery = defaultGallery;

  if (isNike) {
    gallery = [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
      "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=400&q=80",
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80",
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&q=80",
    ];
  }

  if (isZomato) {
    gallery = [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
      "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80",
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
    ];
  }

  if (isTata) {
    gallery = [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80",
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
    ];
  }

  let campaigns = [
    {
      id: "camp_hawai_1",
      title:
        "Dine-in Experience Video Campaign",
      budget: "₹20,000 - ₹40,000",
      category: "Food & Vlogging",
      duration: "2 weeks",
      applications: 18,
    },
    {
      id: "camp_hawai_2",
      title:
        "Family Weekend Feast Reels",
      budget: "₹30,000 - ₹50,000",
      category: "Food & Family",
      duration: "3 weeks",
      applications: 27,
    },
  ];

  if (isNike) {
    campaigns = [
      {
        id: "nike_c1",
        title:
          "Air Max Day 2026 Campaign",
        budget:
          "₹1,50,000 - ₹3,00,000",
        category:
          "Fashion & Sports",
        duration: "3 weeks",
        applications: 68,
      },
      {
        id: "nike_c2",
        title:
          "Just Do It: Running Series",
        budget:
          "₹80,000 - ₹1,50,000",
        category:
          "Fitness & Athletics",
        duration: "1 month",
        applications: 112,
      },
    ];
  }

  if (isZomato) {
    campaigns = [
      {
        id: "zomato_c1",
        title:
          "Late Night Cravings Reels",
        budget:
          "₹30,000 - ₹60,000",
        category:
          "Food & Entertainment",
        duration: "2 weeks",
        applications: 145,
      },
      {
        id: "zomato_c2",
        title:
          "Healthy Options Launch Campaign",
        budget:
          "₹60,000 - ₹1,20,000",
        category:
          "Food & Health",
        duration: "3 weeks",
        applications: 89,
      },
    ];
  }

  if (isTata) {
    campaigns = [
      {
        id: "tata_c1",
        title:
          "Tata Punch EV Roadtrip Vlog",
        budget:
          "₹2,50,000 - ₹5,00,000",
        category:
          "Automobile & Travel",
        duration: "1 month",
        applications: 56,
      },
      {
        id: "tata_c2",
        title:
          "Urban EV Commuter Campaign",
        budget:
          "₹1,00,000 - ₹2,00,000",
        category:
          "Automobile & Tech",
        duration: "2 weeks",
        applications: 37,
      },
    ];
  }

  let preferences = {
    niches:
      "Food, Dining, Family Vlogs, Lifestyle",
    reach: "10K+ followers",
    region: "Delhi & NCR",
    budgetRange:
      "₹10K - ₹40K per post",
  };

  if (isNike) {
    preferences = {
      niches:
        "Sports, Fitness, Running, Lifestyle",
      reach: "50K+ followers",
      region: "India (Metros)",
      budgetRange:
        "₹25K - ₹100K per post",
    };
  }

  if (isZomato) {
    preferences = {
      niches:
        "Food, Cooking, Vlogging, Comedy, Lifestyle",
      reach: "20K+ followers",
      region:
        "India (All major cities)",
      budgetRange:
        "₹15K - ₹50K per reel",
    };
  }

  if (isTata) {
    preferences = {
      niches:
        "Automobile, Tech, Travel, Family, Sustainability",
      reach: "100K+ followers",
      region: "India",
      budgetRange:
        "₹50K - ₹200K per deliverable",
    };
  }

  return {
    companySize,
    website,
    campaignsCount,
    hiredCount,
    activeCampaignsCount,
    successRate,
    gallery,
    campaigns,
    preferences,
  };
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function InfluencerDetails() {
  const { id: profileId } = useParams();
  const navigate = useNavigate();

  const {
    profile: myProfile,
    user,
    loading: authLoading,
  } = useAuth();

  const isOwnProfile = Boolean(
    myProfile &&
    (String(myProfile._id) === String(profileId) ||
     String(myProfile.id) === String(profileId) ||
     String(myProfile.userId) === String(user?.id || user?._id))
  );

  const fallbackCover = DEFAULT_BANNER;
  const fallbackAvatar = getGenderAvatar("Creator", "male", "creator");

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
    return `${apiUrl}${url}`;
  };

  const [inf, setInf] = useState(() => {
    return (
      influencers.find((item) => String(item.id) === String(profileId)) ||
      mockBrands.find((item) => String(item.id) === String(profileId)) ||
      null
    );
  });

  const [portfolioImages, setPortfolioImages] = useState(
    () => inf?.portfolioImages || []
  );
  
  const [lightboxImage, setLightboxImage] = useState(null);
  const [portfolioTab, setPortfolioTab] = useState("all");
  const [selectedPortfolioPost, setSelectedPortfolioPost] = useState(null);
  const [portfolioCommentText, setPortfolioCommentText] = useState("");
  const [submittingPortfolioComment, setSubmittingPortfolioComment] = useState(false);
  const [showAllPortfolioModal, setShowAllPortfolioModal] = useState(false);

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

      setPortfolioImages((prev) =>
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
        userName: myProfile?.fullName || user?.email?.split("@")[0] || "Guest Brand",
        userAvatar: commenterAvatar,
      });

      const updatedComments = res?.data?.data || [];
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: Array.isArray(updatedComments) ? updatedComments : [...(prev.comments || []), {
          userName: myProfile?.fullName || "Brand Visitor",
          userAvatar: commenterAvatar,
          text: portfolioCommentText.trim(),
          createdAt: new Date(),
        }],
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
      setPortfolioCommentText("");
      toast.success("Comment posted!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to post comment");
    } finally {
      setSubmittingPortfolioComment(false);
    }
  };

  const handleDeletePortfolioComment = async (commentId) => {
    if (!selectedPortfolioPost?._id || !commentId) return;
    try {
      const res = await api.delete(`/portfolio/${selectedPortfolioPost._id}/comments/${commentId}`);
      const updatedComments = res?.data?.data || (selectedPortfolioPost.comments || []).filter(c => (c._id || c.id) !== commentId);
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: updatedComments,
        commentsCount: Math.max(0, (prev.commentsCount || 1) - 1),
      }));
      setPortfolioImages((prev) =>
        prev.map((item) =>
          item._id === selectedPortfolioPost._id
            ? { ...item, comments: updatedComments, commentsCount: Math.max(0, (item.commentsCount || 1) - 1) }
            : item
        )
      );
      toast.success("Comment deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    }
  };

  const handleSharePortfolioItem = (post) => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Creator portfolio link copied to clipboard!");
    } else {
      toast.info(`Link: ${url}`);
    }
  };

  // FOLLOW FEATURE STATE
  const [isFollowing, setIsFollowing] = useState(false);
  const [followFollowersCount, setFollowFollowersCount] = useState(0);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    const checkFollow = async () => {
      try {
        const res = await api.get("/follows/status", {
          params: {
            followerId: myProfile?._id,
            targetProfileId: profileId,
          },
        });
        if (res.data?.success) {
          setIsFollowing(Boolean(res.data.isFollowing));
          if (res.data.followersCount !== undefined) {
            setFollowFollowersCount(res.data.followersCount);
          }
        }
      } catch (err) {
        // silent fail
      }
    };
    checkFollow();
  }, [profileId, myProfile?._id]);

  const handleToggleFollow = async () => {
    if (!myProfile) {
      toast.error("Please login to follow profiles.");
      navigate("/login");
      return;
    }
    if (myProfile._id === profileId) {
      toast.error("You cannot follow your own profile.");
      return;
    }
    const currentRole = myProfile.role;
    const targetRole = inf?.role || (isBrand ? "brand" : "creator");
    if (currentRole === "creator" && targetRole === "creator") {
      toast.error("A creator cannot follow another creator. Creators can only follow Brands.");
      return;
    }
    if (currentRole === "brand" && targetRole === "brand") {
      toast.error("A brand cannot follow another brand. Brands can only follow Creators.");
      return;
    }

    try {
      setFollowingLoading(true);
      const res = await api.post("/follows/toggle", {
        followerId: myProfile._id,
        targetProfileId: profileId,
      });
      if (res.data?.success) {
        setIsFollowing(res.data.isFollowing);
        setFollowFollowersCount((prev) => (res.data.isFollowing ? prev + 1 : Math.max(0, prev - 1)));
        toast.success(res.data.message || (res.data.isFollowing ? "Followed!" : "Unfollowed."));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update follow status.");
    } finally {
      setFollowingLoading(false);
    }
  };

  const [profileLoading, setProfileLoading] = useState(() => !inf);
  const [profileNotFound, setProfileNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!profileId) {
        setProfileLoading(false);
        setProfileNotFound(true);
        return;
      }

      // If we don't have it in initial state, mark loading
      if (!inf) {
        setProfileLoading(true);
      }

      try {
        const profile = await fetchProfileById(profileId);
        if (profile && isMounted) {
          let portfolio = [];
          try {
            const portRes = await fetchPortfolio(profile._id || profileId);
            const portData = Array.isArray(portRes) ? portRes : portRes?.data || [];
            portfolio = Array.isArray(portData) ? portData : [];
          } catch (e) {
            console.error("Portfolio fetch failed:", e);
          }

          const fullName = profile.fullName || "User";
          const formatted = {
            id: profile._id,
            name: fullName,
            handle: profile.handle ? `@${profile.handle.replace(/^@+/, "")}` : `@${fullName.toLowerCase().replace(/\s/g, "")}`,
            bio: profile.bio || "",
            role: profile.role,
            category: profile.category || "General",
            followers:
              Number(profile.instagramFollowers || 0) +
              Number(profile.facebookFollowers || 0) +
              Number(profile.linkedinFollowers || 0) +
              Number(profile.youtubeFollowers || 0) +
              Number(profile.quoraFollowers || 0) +
              Number(profile.twitterFollowers || 0),
            startingPrice: Number(profile.startingPrice || 0),
            location: profile.location || "India",
            rating: profile.rating ?? 5,
            reviews: profile.reviewsCount ?? 0,
            available: true,
            gender: profile.gender || "",
            avatar: resolveImageUrl(profile.avatarUrl) || profile.avatar || getGenderAvatar(profile.fullName || profile.name || "Creator", profile.gender, profile.role),
            cover: resolveImageUrl(profile.coverUrl) || profile.cover || fallbackCover,
            portfolioImages: portfolio,
            instagramHandle: profile.instagramHandle,
            instagramFollowers: Number(profile.instagramFollowers || 0),
            facebookHandle: profile.facebookHandle,
            facebookFollowers: Number(profile.facebookFollowers || 0),
            linkedinHandle: profile.linkedinHandle,
            linkedinFollowers: Number(profile.linkedinFollowers || 0),
            youtubeHandle: profile.youtubeHandle,
            youtubeFollowers: Number(profile.youtubeFollowers || 0),
            quoraHandle: profile.quoraHandle,
            quoraFollowers: Number(profile.quoraFollowers || 0),
            twitterHandle: profile.twitterHandle,
            twitterFollowers: Number(profile.twitterFollowers || 0),
            pricingTiers: profile.pricingTiers || [],
            verificationStatus: profile.verificationStatus,
            website: profile.website,
            companySize: profile.companySize,
            prefNiches: profile.prefNiches,
            prefBudget: profile.prefBudget,
            prefReach: profile.prefReach,
            prefRegions: profile.prefRegions,
            campaigns: profile.campaigns || [],
            campaignsCount: profile.campaignsCount || 0,
            hiredCount: profile.hiredCount || 0,
          };

          setInf(formatted);
          setProfileNotFound(false);
          if (portfolio.length > 0) {
            setPortfolioImages(portfolio);
          }
        } else if (isMounted && !inf) {
          setProfileNotFound(true);
        }
      } catch (err) {
        console.error("Failed to load live profile:", err);
        if (isMounted && !inf) {
          setProfileNotFound(true);
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [profileId]);

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFav = async () => {
      if (myProfile && (inf?.id || profileId)) {
        try {
          const res = await api.get("/favorites/check", {
            params: {
              brandId: myProfile._id,
              creatorId: inf?.id || profileId
            }
          });
          setIsFavorite(res.data?.data?.isFavorite || false);
        } catch (err) {
          console.error("Failed to check favorite status", err);
        }
      }
    };
    checkFav();
  }, [myProfile, inf?.id, profileId]);


  const [
    isConnectionModalOpen,
    setIsConnectionModalOpen,
  ] = useState(false);

  const [
    selectedCampaign,
    setSelectedCampaign,
  ] = useState(null);

  const [pitchText, setPitchText] =
    useState("");

  const [
    sendingRequest,
    setSendingRequest,
  ] = useState(false);

  const [
    isReviewModalOpen,
    setIsReviewModalOpen,
  ] = useState(false);

  const [
    submitRating,
    setSubmitRating,
  ] = useState(0);

  const [
    reviewTitle,
    setReviewTitle,
  ] = useState("");

  const [
    reviewText,
    setReviewText,
  ] = useState("");

  const [
    campaignRef,
    setCampaignRef,
  ] = useState("");

  const [
    submittingReview,
    setSubmittingReview,
  ] = useState(false);

  const [sortBy, setSortBy] =
    useState("latest");

  const [
    reviewsList,
    setReviewsList,
  ] = useState([]);

  const [
    loadingReviews,
    setLoadingReviews,
  ] = useState(false);

  const [reviewEligibility, setReviewEligibility] = useState({
    canReview: false,
    campaigns: [],
    loading: false,
    reason: "",
    conversationId: null,
  });

  const checkReviewEligibility = useCallback(async () => {
    const targetId = inf?.id || profileId;
    const reviewerId = myProfile?._id || myProfile?.id;
    if (!targetId || !reviewerId || isOwnProfile) {
      setReviewEligibility({ canReview: false, campaigns: [], loading: false, reason: "", conversationId: null });
      return;
    }

    setReviewEligibility((prev) => ({ ...prev, loading: true }));
    try {
      const res = await api.get(`/api/reviews/can-review/${targetId}?reviewerId=${reviewerId}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setReviewEligibility({
          canReview: Boolean(d.canReview),
          campaigns: Array.isArray(d.campaigns) ? d.campaigns : [],
          loading: false,
          reason: d.reason || "",
          conversationId: d.conversationId || null,
        });
        if (Array.isArray(d.campaigns) && d.campaigns.length > 0 && !campaignRef) {
          setCampaignRef(d.campaigns[0].title);
        }
      }
    } catch {
      setReviewEligibility({ canReview: false, campaigns: [], loading: false, reason: "Unable to verify collaboration status", conversationId: null });
    }
  }, [inf?.id, profileId, myProfile?._id, myProfile?.id, isOwnProfile, campaignRef]);

  useEffect(() => {
    checkReviewEligibility();
  }, [checkReviewEligibility]);

  // ===================================================
  // PUBLIC PROFILE VIEW (Login is NOT required to view profiles)
  // ===================================================


  // ===================================================
  // LOAD PORTFOLIO
  // ===================================================

  useEffect(() => {
    const loadPortfolio = async () => {
      if (!inf?.id) return;

      try {
        const response =
          await fetchPortfolio(inf.id);

        const data =
          response?.data || response || [];

        if (Array.isArray(data) && data.length > 0) {
          setPortfolioImages(data);
        }
      } catch (error) {
        console.error(
          "Failed to load portfolio:",
          error
        );
      }
    };

    loadPortfolio();
  }, [inf?.id]);

  // ===================================================
  // BRAND
  // ===================================================

  const isBrand = inf?.role === "brand";

  const brandDetails = useMemo(() => {
    if (!isBrand) return null;

    const isMock =
      String(inf.id).startsWith(
        "brand_mock_"
      ) ||
      !isNaN(Number(inf.id));

    if (isMock) {
      return getBrandProfileDetails(
        inf.id,
        inf.name
      );
    }

    const activeCamps =
      (inf.campaigns || []).filter(
        (campaign) =>
          campaign.active === true
      );

    const fallback =
      getBrandProfileDetails(
        inf.id,
        inf.name
      );

    const dbGallery =
      portfolioImages.length > 0
        ? portfolioImages
        : fallback.gallery;

    return {
      companySize:
        inf.companySize ||
        "50 - 200 employees",

      website:
        inf.website ||
        "https://pravixo.co",

      campaignsCount:
        inf.campaignsCount ?? 0,

      hiredCount:
        inf.hiredCount ?? 0,

      activeCampaignsCount:
        activeCamps.length,

      successRate: "98%",

      gallery: dbGallery,

      campaigns:
        activeCamps.map(
          (campaign) => ({
            id:
              campaign._id ||
              campaign.id,

            title:
              campaign.title,

            budget:
              campaign.budget,

            category:
              campaign.category,

            duration:
              campaign.duration,

            applications: 0,
          })
        ),

      preferences: {
        niches:
          inf.prefNiches ||
          "General",

        reach:
          inf.prefReach ||
          "Any",

        region:
          inf.prefRegions ||
          "Any",

        budgetRange:
          inf.prefBudget ||
          "Any",
      },
    };
  }, [
    isBrand,
    inf,
    portfolioImages,
  ]);

  // ===================================================
  // REVIEWS
  // ===================================================

  const loadReviews = useCallback(async () => {
    const targetId = inf?.id || profileId;
    if (!targetId) return;

    setLoadingReviews(true);

    try {
      const response = await api(`/api/reviews/target/${targetId}`, {
        method: "GET",
      });

      const resData = response?.data;
      const reviews = Array.isArray(resData) 
        ? resData 
        : (Array.isArray(resData?.data) ? resData.data : []);
      setReviewsList(reviews);
    } catch (error) {
      console.error("Failed to load reviews:", error);
      setReviewsList([]);
    } finally {
      setLoadingReviews(false);
    }
  }, [inf?.id, profileId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // ===================================================
  // SORT REVIEWS
  // ===================================================

  const sortedReviews = useMemo(() => {
    const list = Array.isArray(reviewsList) ? reviewsList : [];
    return [...list].sort(
      (a, b) => {
        if (sortBy === "latest") {
          return (
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
          );
        }

        if (sortBy === "highest") {
          return (
            Number(b.rating || 0) -
            Number(a.rating || 0)
          );
        }

        if (sortBy === "lowest") {
          return (
            Number(a.rating || 0) -
            Number(b.rating || 0)
          );
        }

        return 0;
      }
    );
  }, [
    reviewsList,
    sortBy,
  ]);

  // ===================================================
  // RATING
  // ===================================================

  const rating = inf?.rating ?? 5;
  const reviewsCount = inf?.reviews ?? reviewsList.length;

  // ===================================================
  // FAVORITE
  // ===================================================

  const handleToggleFavorite = async () => {
    if (!myProfile) {
      toast.error("Please log in to save creators");
      return;
    }

    if (myProfile.role !== "brand") {
      toast.error("Only brands can save creators");
      return;
    }

    try {
      if (isFavorite) {
        await api.delete("/favorites", {
          data: {
            brandId: myProfile._id,
            creatorId: inf?.id || profileId,
          },
        });
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        await api.post("/favorites", {
          brandId: myProfile._id,
          creatorId: inf?.id || profileId,
        });
        setIsFavorite(true);
        toast.success("Saved to favorites");
      }
    } catch (error) {
      console.error("Favorite toggle error:", error);
      toast.error("Failed to update favorites");
    }
  };


  // ===================================================
  // HIRE / CONNECT ROLE CHECK
  // ===================================================

  const checkConnectionRoleEligibility = () => {
    if (!user || !myProfile) {
      toast.error("Please log in to send collaboration requests");
      navigate("/login");
      return false;
    }

    const currentRole = myProfile.role;
    const targetRole = inf?.role || (isBrand ? "brand" : "creator");

    if (currentRole === "creator" && targetRole === "creator") {
      toast.error("A creator cannot collaborate or connect with another creator. Creators can only connect with Brands.");
      return false;
    }

    if (currentRole === "brand" && targetRole === "brand") {
      toast.error("A brand cannot collaborate or connect with another brand. Brands can only connect with Creators.");
      return false;
    }

    return true;
  };

  const handleHire = async () => {
    if (!checkConnectionRoleEligibility()) return;
    setIsConnectionModalOpen(true);
  };

  // ===================================================
  // CONNECTION
  // ===================================================

  const handleSendConnection =
    async (event) => {
      event.preventDefault();

      if (!checkConnectionRoleEligibility()) return;

      if (!pitchText.trim()) {
        toast.error(
          "Please enter a personalized pitch"
        );
        return;
      }

      setSendingRequest(true);

      try {
        await api.post(
          "/connections/request",
          {
            creatorId:
              myProfile.role === "creator" ? (myProfile._id || myProfile.id) : inf.id,

            brandId:
              myProfile.role === "brand" ? (myProfile._id || myProfile.id) : inf.id,

            senderId:
              myProfile._id || myProfile.id,

            campaignId:
              selectedCampaign?.id,

            pitch:
              pitchText,
          }
        );

        toast.success(
          "Connection request sent! Redirecting to messages..."
        );

        setIsConnectionModalOpen(
          false
        );

        setPitchText("");
        setSelectedCampaign(null);
        
        navigate("/messages");
      } catch (error) {
        console.error(error);

        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          "Failed to send request"
        );
      } finally {
        setSendingRequest(false);
      }
    };

  // ===================================================
  // REVIEW
  // ===================================================

  const handleSubmitReview =
    async (event) => {
      event.preventDefault();

      if (!myProfile) return;

      if (isOwnProfile) {
        toast.error("You cannot review your own profile");
        return;
      }

      if (submitRating === 0) {
        toast.error(
          "Please select a star rating"
        );
        return;
      }

      setSubmittingReview(true);

      try {
        const targetId = inf?.id || profileId;
        const reviewerId = myProfile._id || myProfile.id;

        if (String(reviewerId) === String(targetId)) {
          toast.error("You cannot review your own profile");
          setSubmittingReview(false);
          return;
        }

        // Check if there is an active/past conversation with target
        let activeConversationId = inf?.conversationId || undefined;
        try {
          const canReviewCheck = await api.get(`/api/reviews/can-review/${targetId}?reviewerId=${reviewerId}`);
          if (canReviewCheck?.data?.data?.conversationId) {
            activeConversationId = canReviewCheck.data.data.conversationId;
          }
        } catch {
          // ignore eligibility check error
        }

        await api.post(
          "/api/reviews",
          {
            targetId,
            reviewerId,
            conversationId: activeConversationId || undefined,
            rating: submitRating,
            title: reviewTitle,
            text: reviewText,
            campaignRef: campaignRef || undefined,
          }
        );

        toast.success("Review submitted successfully!");

        setIsReviewModalOpen(false);
        setSubmitRating(0);
        setReviewTitle("");
        setReviewText("");
        setCampaignRef("");

        // Immediately reload reviews on creator profile
        await loadReviews();
      } catch (error) {
        console.error(error);
        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          "Failed to submit review"
        );
      } finally {
        setSubmittingReview(false);
      }
    };

  // ===================================================
  // TITLE
  // ===================================================

  useEffect(() => {
    if (inf) {
      document.title =
        `${inf.name} — Pravixo`;
    }
  }, [inf]);

  // ===================================================
  // PROFILE LOADING & ERROR GUARDS
  // ===================================================

  if (profileLoading && !inf) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="relative h-44 sm:h-56 md:h-64 w-full rounded-b-2xl sm:rounded-b-3xl bg-secondary/50 animate-pulse border border-border/50" />
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-14 sm:-mt-20 px-4">
          <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-secondary animate-pulse border-4 border-background shadow-elevated" />
          <div className="space-y-2 flex-1 pb-2">
            <div className="h-7 w-48 bg-secondary animate-pulse rounded-lg" />
            <div className="h-4 w-32 bg-secondary animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-secondary/40 animate-pulse border border-border/50" />
          ))}
        </div>
      </div>
    );
  }

  if (profileNotFound || !inf) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 border border-border">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
          Profile Not Found
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          This creator or brand profile does not exist, has been removed, or is currently unavailable.
        </p>
        <Link to="/browse" className="mt-6">
          <Button className="rounded-full px-6 shadow-sm">
            Browse Creators & Brands
          </Button>
        </Link>
      </div>
    );
  }

  // ===================================================
  // PRICING
  // ===================================================

  const activeTiers =
    inf.pricingTiers &&
      inf.pricingTiers.length > 0
      ? [...inf.pricingTiers].sort(
        (a, b) =>
          (a.sortOrder || 0) -
          (b.sortOrder || 0)
      )
      : null;

  const displayTiers =
    activeTiers
      ? activeTiers.map(
        (tier) => {
          const name =
            String(
              tier.name || ""
            ).toLowerCase();

          let perks = [];
          let popular = false;

          if (name === "story") {
            perks = [
              "1 story slide",
              "24h live",
              "Link in story",
              "Quick turnaround",
            ];
          } else if (
            name === "post"
          ) {
            perks = [
              "1 in-feed post",
              "2 revisions",
              "Caption draft",
              "Performance recap",
            ];

            popular = true;
          } else if (
            name === "reel"
          ) {
            perks = [
              "30–60s reel",
              "Concept call",
              "3 revisions",
              "Cross-post to TikTok",
            ];
          } else {
            perks = [
              `1 ${tier.name} deliverable`,
              "Professional content",
              "1 revision included",
              "Fast delivery",
            ];
          }

          return {
            name: tier.name,
            price: tier.price,
            perks,
            popular,
          };
        }
      )
      : tiers.map(
        (tier) => ({
          name: tier.name,

          price:
            Math.round(
              (inf.startingPrice || 0) *
              tier.price
            ),

          perks: tier.perks,

          popular:
            tier.popular,
        })
      );

  // ===================================================
  // PORTFOLIO
  // ===================================================

  const portfolio =
    portfolioImages.length
      ? portfolioImages
      : [
        inf.cover,
        ...influencers
          .slice(0, 5)
          .map(
            (item) =>
              item.cover
          ),
      ].filter(Boolean);

  // ===================================================
  // SOCIAL PLATFORMS
  // ===================================================

  const getPlatformVerifiedInfo = (platformKey) => {
    const found = inf?.socialConnections?.find((c) => c.platform?.toLowerCase() === platformKey.toLowerCase());
    return {
      isVerified: Boolean(found?.verified),
      engagementRate: found?.engagementRate || null,
      views: found?.views || null,
    };
  };

  const socialCards = [
    {
      label: "Instagram",
      handle: inf.instagramHandle,
      followers: inf.instagramFollowers,
      href: inf.instagramHandle
        ? `https://instagram.com/${inf.instagramHandle.replace("@", "")}`
        : "",
      iconClass: "text-pink-600",
      hoverClass: "hover:border-pink-200 hover:bg-pink-50/30",
      ...getPlatformVerifiedInfo("instagram"),
    },
    {
      label: "Facebook",
      handle: inf.facebookHandle,
      followers: inf.facebookFollowers,
      href: inf.facebookHandle
        ? `https://facebook.com/${inf.facebookHandle.replace("@", "")}`
        : "",
      iconClass: "text-blue-600",
      hoverClass: "hover:border-blue-200 hover:bg-blue-50/30",
      ...getPlatformVerifiedInfo("facebook"),
    },
    {
      label: "LinkedIn",
      handle: inf.linkedinHandle,
      followers: inf.linkedinFollowers,
      href: inf.linkedinHandle
        ? `https://linkedin.com/in/${inf.linkedinHandle.replace("in/", "").replace("@", "")}`
        : "",
      iconClass: "text-blue-800",
      hoverClass: "hover:border-blue-300 hover:bg-blue-50/30",
      ...getPlatformVerifiedInfo("linkedin"),
    },
    {
      label: "YouTube",
      handle: inf.youtubeHandle,
      followers: inf.youtubeFollowers,
      href: inf.youtubeHandle
        ? `https://youtube.com/@${inf.youtubeHandle.replace("@", "")}`
        : "",
      iconClass: "text-red-600",
      hoverClass: "hover:border-red-200 hover:bg-red-50/30",
      ...getPlatformVerifiedInfo("youtube"),
    },
    {
      label: "Quora",
      handle: inf.quoraHandle,
      followers: inf.quoraFollowers,
      href: inf.quoraHandle
        ? `https://quora.com/profile/${inf.quoraHandle.replace("@", "")}`
        : "",
      iconClass: "text-red-700",
      hoverClass: "hover:border-red-200 hover:bg-red-50/30",
      ...getPlatformVerifiedInfo("quora"),
    },
    {
      label: "X (Twitter)",
      handle: inf.twitterHandle,
      followers: inf.twitterFollowers,
      href: inf.twitterHandle
        ? `https://x.com/${inf.twitterHandle.replace("@", "")}`
        : "",
      iconClass: "text-sky-500",
      hoverClass: "hover:border-sky-200 hover:bg-sky-50/30",
      ...getPlatformVerifiedInfo("twitter"),
    },
  ].filter(
    (item) => item.handle
  );

  // ===================================================
  // STATS
  // ===================================================

  const numConnected =
    socialCards.length;

  const avgFollowersValue =
    numConnected > 0
      ? Math.round(
        (inf.followers || 0) /
        numConnected
      )
      : 0;

  // Calculate total connected followers
  const totalFollowers = (inf.followers || 0);

  // Real aggregate views from portfolio deliverables or profile views
  const portfolioViewsSum = portfolioImages.reduce((sum, item) => sum + (Number(item.viewsCount) || 0), 0);
  const totalViewsValue = portfolioViewsSum > 0 ? portfolioViewsSum : (inf.profileViews || (totalFollowers > 0 ? Math.round(totalFollowers * 0.25) : 0));

  // Real reach
  const estimatedReach = totalFollowers > 0 ? Math.round(totalFollowers * 0.45) : (portfolioViewsSum > 0 ? Math.round(portfolioViewsSum * 1.2) : 0);

  const statCards =
    isBrand && brandDetails
      ? [
        {
          label:
            "Campaigns Posted",
          value: String(
            brandDetails.campaignsCount
          ),
        },
        {
          label:
            "Creators Hired",
          value: String(
            brandDetails.hiredCount
          ),
        },
        {
          label:
            "Active Campaigns",
          value: String(
            brandDetails.activeCampaignsCount
          ),
        },
        {
          label:
            "Success Rate",
          value:
            brandDetails.successRate,
        },
      ]
      : [
        {
          label:
            "Total Followers",
          value:
            formatFollowers(
              totalFollowers
            ),
        },
        {
          label:
            "Est. Total Reach",
          value:
            formatFollowers(
              estimatedReach
            ),
        },
        {
          label:
            "Total Views",
          value:
            formatFollowers(
              totalViewsValue
            ),
        },
        {
          label:
            "Total Posts & Reels",
          value: String(
            portfolioImages.length
          ),
        },
      ];

  // ===================================================
  // AUTH LOADING
  // ===================================================

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading details...
        </p>
      </div>
    );
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div>

      {/* COVER */}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative h-44 sm:h-56 md:h-64 overflow-hidden w-full rounded-b-2xl sm:rounded-b-3xl rounded-t-none shadow-sm border border-border/50">
          <img
            src={inf.cover}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => { e.target.onerror = null; e.target.src = fallbackCover; }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* PROFILE HEADER */}

        <div className="relative pb-8 border-b border-border/60 z-20">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">

            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">

              <div className="-mt-14 sm:-mt-20 relative z-30 flex-shrink-0">
                <img src={inf.avatar}
                  alt={inf.name}
                  className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-background object-cover shadow-elevated bg-background"
                 onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(inf.name, inf.gender, inf.role || "creator"); }} />
              </div>

              <div className="pb-2 space-y-2">

                <div className="flex items-center justify-center sm:justify-start gap-2.5">

                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <span>{inf.name}</span>
                    {(inf.verificationStatus === "verified" || inf.isVerified) && (
                      <ShieldCheck className="h-6 w-6 text-blue-500 fill-blue-500/15 shrink-0" title="Verified Profile" />
                    )}
                  </h1>

                </div>

                <p className="text-sm font-semibold text-muted-foreground tracking-wide">
                  {inf.handle}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1.5 text-sm text-muted-foreground">

                  <Badge
                    variant="secondary"
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  >
                    {inf.category}
                  </Badge>

                  <span className="text-border hidden sm:inline">
                    •
                  </span>

                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {inf.location}
                  </span>

                  <span className="text-border">
                    •
                  </span>

                  <span className="flex items-center gap-1.5 font-bold text-amber-500">
                    <Star className="h-4 w-4 fill-current" />

                    {rating}

                    <span className="text-muted-foreground font-medium text-xs">
                      ({reviewsCount} reviews)
                    </span>
                  </span>

                  {(inf.startingPrice > 0 || inf.isBarterAllowed) && (
                    <>
                      <span className="text-border hidden sm:inline">•</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inf.startingPrice > 0 && (
                          <span className="font-bold text-xs text-foreground bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                            Starting ₹{Number(inf.startingPrice).toLocaleString("en-IN")}
                          </span>
                        )}
                        {inf.isBarterAllowed && (
                          <span className="font-bold text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Handshake className="h-3 w-3" /> Barter Allowed
                          </span>
                        )}
                      </div>
                    </>
                  )}

                </div>

              </div>

            </div>

            {/* ACTIONS (Single Clean Unified Responsive Row on Mobile & Desktop) */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2 pb-1 shrink-0 w-full sm:w-auto">
              {myProfile?.role === "brand" && (
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full h-8 w-8 sm:h-9 sm:w-9 shrink-0 ${
                    isFavorite ? "border-red-500 bg-red-50 text-red-500" : ""
                  }`}
                  onClick={handleToggleFavorite}
                >
                  <Heart
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFavorite ? "fill-current text-red-500" : ""}`}
                  />
                </Button>
              )}

              {inf.role !== "brand" && inf.handle && (
                <Link to={`/c/${inf.handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button
                    variant="outline"
                    className="rounded-full h-8 sm:h-9 px-2.5 sm:px-3.5 flex items-center gap-1 text-[11px] sm:text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-600 hover:text-amber-700 hover:bg-amber-500/20 shrink-0 whitespace-nowrap"
                  >
                    <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" /> Media Kit
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                title="Share profile"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  toast("Link copied to clipboard!");
                }}
              >
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>

              {/* FOLLOW BUTTON (Only shown across roles: Brand to Creator or Creator to Brand, or Guest) */}
              {(() => {
                const myRole = myProfile?.role;
                const targetRole = inf.role || (isBrand ? "brand" : "creator");
                const isSameRole = myRole && targetRole && myRole === targetRole;

                if (isSameRole) return null;

                return (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    onClick={handleToggleFollow}
                    disabled={followingLoading}
                    className={`rounded-full px-2.5 sm:px-3.5 h-8 sm:h-9 flex items-center gap-1 text-[11px] sm:text-xs font-semibold shrink-0 whitespace-nowrap ${
                      isFollowing
                        ? "border-primary/50 text-primary hover:bg-primary/10"
                        : "gradient-sunset border-0 text-white shadow-glow"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>{isFollowing ? "Following" : "Follow"}</span>
                    {followFollowersCount > 0 && (
                      <span className="ml-0.5 rounded-full bg-black/20 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold">
                        {followFollowersCount}
                      </span>
                    )}
                  </Button>
                );
              })()}

              {/* HIRE BUTTON (When logged in as brand) */}
              {myProfile?.role === "brand" && (
                <Button
                  className="rounded-full gradient-sunset border-0 text-white shadow-glow px-3 sm:px-4 h-8 sm:h-9 flex items-center gap-1 text-[11px] sm:text-xs font-semibold shrink-0 whitespace-nowrap"
                  onClick={handleHire}
                >
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Hire {inf.name.split(" ")[0]}
                </Button>
              )}

              {/* CONNECT WITH BRAND (When logged in as creator looking at brand) */}
              {myProfile?.role === "creator" && inf.role === "brand" && (
                <>
                  <Button
                    className="rounded-full gradient-sunset border-0 text-white shadow-glow px-3 sm:px-4 h-8 sm:h-9 flex items-center gap-1 text-[11px] sm:text-xs font-semibold shrink-0 whitespace-nowrap"
                    onClick={() => {
                      setSelectedCampaign(null);
                      setIsConnectionModalOpen(true);
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Connect With Brand
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-full px-2.5 sm:px-3.5 h-8 sm:h-9 text-[11px] sm:text-xs font-semibold shrink-0 whitespace-nowrap"
                    onClick={() => {
                      document.getElementById("open-campaigns")?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                  >
                    Apply for Campaign
                  </Button>
                </>
              )}

              {/* SIGN IN TO CONNECT (When guest / not logged in) */}
              {!user && (
                <Button
                  className="rounded-full gradient-sunset border-0 text-white shadow-glow px-3 sm:px-4 h-8 sm:h-9 flex items-center gap-1 text-[11px] sm:text-xs font-semibold shrink-0 whitespace-nowrap"
                  onClick={() =>
                    navigate("/login", {
                      state: { from: `/influencer/${inf?.id || profileId}` },
                    })
                  }
                >
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Sign In to Connect
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* MAIN (FULL WIDTH MATCHING BANNER) */}

        <div className="mt-8 space-y-6">

            {/* BRAND INFO OR CONNECTED CHANNELS */}
            {isBrand && brandDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="flex h-24 items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Users className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Company Size
                    </div>

                    <div className="font-display text-base font-bold mt-0.5 truncate">
                      {brandDetails.companySize || "1 - 10 employees"}
                    </div>
                  </div>

                </div>

                <div className="flex h-24 items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Globe className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Website
                    </div>

                    <a
                      href={brandDetails.website}
                      target="_blank"
                      rel="noreferrer"
                      className="font-display text-sm font-bold text-primary hover:underline block truncate"
                    >
                      {brandDetails.website ? brandDetails.website.replace(/^https?:\/\//, "") : "Not specified"}
                    </a>
                  </div>

                </div>

                <div className="flex h-24 items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500 shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Target Niches & Reach
                    </div>

                    <div className="font-display text-sm font-bold mt-0.5 truncate">
                      {brandDetails.preferences?.niches || "All Niches"} ({brandDetails.preferences?.reach || "Any"})
                    </div>
                  </div>

                </div>

                <div className="flex h-24 items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                    <Handshake className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Budget & Region
                    </div>

                    <div className="font-display text-sm font-bold text-gradient-sunset mt-0.5 truncate">
                      {brandDetails.preferences?.budgetRange || "Negotiable"} · {brandDetails.preferences?.region || "India"}
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="space-y-4">
                {/* 4 PRIMARY HIGHLIGHT STATS */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {statCards.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex h-24 flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm"
                    >
                      <div className="font-display text-xl sm:text-2xl font-bold">
                        {stat.value}
                      </div>

                      <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CONNECTED CHANNELS ROW */}
                {socialCards.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                      Channels:
                    </span>
                    {socialCards.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold shadow-xs transition-all hover:scale-105 hover:border-primary/40",
                          social.hoverClass
                        )}
                      >
                        <SocialIcon
                          platform={social.label}
                          className={cn("h-4 w-4", social.iconClass)}
                        />
                        <span className="text-foreground">{social.label}</span>
                        <span className="font-bold text-primary">
                          {formatFollowers(social.followers || 0)}
                        </span>
                        {social.isVerified && (
                          <ShieldCheck className="h-3.5 w-3.5 text-sky-500" title="Verified Live Metric" />
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABOUT + PORTFOLIO */}

            <div className="grid gap-8 lg:grid-cols-2">

              {/* ABOUT */}

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">

                <h2 className="font-display text-xl font-semibold">
                  {isBrand
                    ? "About Brand"
                    : "About"}
                </h2>

                <div className="mt-3 max-h-48 overflow-y-auto">

                  <p className="text-muted-foreground">
                    {inf.bio ||
                      (isBrand
                        ? "Brand details on Pravixo."
                        : "Creator on Pravixo.")}
                  </p>

                </div>

              </div>

              {/* INSTAGRAM-STYLE CREATOR PORTFOLIO / BRAND GALLERY */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-xs">
                      <Camera className="h-4 w-4" />
                    </span>
                    <h2 className="font-display text-lg sm:text-xl font-semibold">
                      {isBrand ? "Brand Gallery" : "Creative Portfolio & Feed"}
                    </h2>
                    {portfolio?.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20">
                        {portfolio.length}
                      </Badge>
                    )}
                  </div>

                  {/* View All Button (Direct Page Route) */}
                  {portfolio?.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${isBrand ? `/brand/${inf.id}/portfolio` : `/influencer/${inf.id}/portfolio`}`)}
                      className="h-7.5 rounded-full text-xs font-semibold border-border hover:bg-secondary flex items-center gap-1 self-start sm:self-auto shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" /> View All ({portfolio.length})
                    </Button>
                  )}
                </div>

                {/* Format Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/50 text-xs w-fit mb-4 overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setPortfolioTab("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all shrink-0",
                      portfolioTab === "all"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioTab("post")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all shrink-0",
                      portfolioTab === "post"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Camera className="h-3 w-3 text-blue-500" /> Posts
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioTab("reel")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all shrink-0",
                      portfolioTab === "reel"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Film className="h-3 w-3 text-pink-500" /> Reels
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioTab("story")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all shrink-0",
                      portfolioTab === "story"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" /> Stories
                  </button>
                </div>

                {/* Portfolio Grid - Consistent Uniform 4:5 Aspect Ratio Cards */}
                {(() => {
                  const filtered = (portfolio || []).filter((item) => {
                    if (portfolioTab === "all") return true;
                    const itemType = item.type || "post";
                    return itemType === portfolioTab;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 border border-dashed border-border/80 rounded-2xl bg-muted/10 p-6">
                        <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          No {portfolioTab === "all" ? "portfolio deliverables" : portfolioTab + "s"} published yet.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filtered.slice(0, 6).map((item, index) => {
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
                            className="group relative rounded-2xl overflow-hidden border border-border bg-black cursor-pointer shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md aspect-[4/5]"
                            onClick={() => {
                              setSelectedPortfolioPost(item);
                            }}
                          >
                            {/* Media Display */}
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

                            {/* Type Pill Badge (Top Left) */}
                            <div className="absolute top-2 left-2 z-10">
                              {isReel ? (
                                <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/30">
                                  <Film className="h-2.5 w-2.5" /> Reel
                                </span>
                              ) : isStory ? (
                                <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                                  <Sparkles className="h-2.5 w-2.5" /> Story
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                                  <Camera className="h-2.5 w-2.5" /> Post
                                </span>
                              )}
                            </div>

                            {/* Brand Collab Badge (Top Right) */}
                            {item.brandTag && (
                              <div className="absolute top-2 right-2 z-10 max-w-[55%] truncate">
                                <span className="block truncate bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/20">
                                  {item.brandTag.startsWith("@") ? item.brandTag : `@${item.brandTag}`}
                                </span>
                              </div>
                            )}

                            {/* Reel Play / Views (Bottom Left) */}
                            {isReel && views > 0 && (
                              <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <Play className="h-2.5 w-2.5 fill-white" /> {views.toLocaleString()}
                              </div>
                            )}

                            {/* Hover Overlay with Likes & Comments */}
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-white">
                              {item.caption && (
                                <p className="text-[11px] font-medium text-white/90 line-clamp-2 mb-2">
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
                  );
                })()}
              </div>
            </div>

            {/* OPEN CAMPAIGNS (FULL WIDTH FOR BRAND) */}
            {isBrand && brandDetails && (
              <div
                id="open-campaigns"
                className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6"
              >
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold">
                    Open Campaigns
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Explore active collaboration opportunities and send proposals directly.
                  </p>
                </div>

                <div className="space-y-4">
                  {brandDetails.campaigns.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No active campaigns.
                    </div>
                  ) : (
                    brandDetails.campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border p-5 bg-secondary/20 hover:border-primary/40 transition-all"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <h3 className="font-display text-base font-bold">
                            {campaign.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium">
                            <span className="font-bold text-gradient-sunset text-sm">
                              {campaign.budget}
                            </span>
                            <span>·</span>
                            <span>{campaign.category}</span>
                            <span>·</span>
                            <span>{campaign.duration}</span>
                          </div>

                          {/* Condition-Based Tiers / Options preview */}
                          {Array.isArray(campaign.tiers) && campaign.tiers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {campaign.tiers.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold bg-secondary/60 text-foreground px-2 py-0.5 rounded-md border border-border/50"
                                >
                                  🎯 {t.minFollowers >= 1000 ? `${(t.minFollowers / 1000).toFixed(0)}k+` : t.minFollowers}: {t.reward || ''}{t.cashAmount ? ` + ₹${t.cashAmount}` : ''}
                                </span>
                              ))}
                            </div>
                          ) : campaign.minFollowers > 0 ? (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Min {campaign.minFollowers >= 1000 ? `${(campaign.minFollowers / 1000).toFixed(0)}k+` : campaign.minFollowers} Followers
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {isOwnProfile ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs font-semibold shrink-0 border-border"
                            onClick={() => navigate("/dashboard/customer")}
                          >
                            Manage Campaign
                          </Button>
                        ) : myProfile?.role === "brand" ? (
                          <span className="text-[11px] text-muted-foreground italic px-2">
                            Creator Opportunity
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-full gradient-sunset border-0 text-white px-5 h-9 text-xs font-semibold shrink-0 shadow-sm"
                            onClick={() => {
                              if (!user) {
                                toast.error("Please login as a creator to apply for campaigns");
                                navigate("/login");
                                return;
                              }
                              setSelectedCampaign(campaign);
                              setIsConnectionModalOpen(true);
                            }}
                          >
                            Apply to Connect
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CREATOR PRICING PACKAGES (FULL WIDTH CARD MATCHING BANNER) */}
            {!isBrand && displayTiers?.length > 0 && (
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold">
                    Pricing Packages & Deliverables
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Choose a collaboration tier or send custom deliverables proposals.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayTiers.map((tier) => (
                    <div
                      key={tier.name}
                      onClick={() => {
                        if (!checkConnectionRoleEligibility()) return;
                        setIsConnectionModalOpen(true);
                      }}
                      className={`rounded-2xl border p-5 relative cursor-pointer hover:border-primary/50 transition-all flex flex-col justify-between ${
                        tier.popular
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border bg-background"
                      }`}
                    >
                      {tier.popular && (
                        <span className="absolute -top-2.5 right-4 rounded-full gradient-sunset px-2.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                          Popular
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-border/40">
                          <h4 className="font-display text-base font-bold">
                            {tier.name}
                          </h4>

                          <span className="font-display text-lg font-bold text-gradient-sunset">
                            {formatINR(tier.price)}
                          </span>
                        </div>

                        <ul className="mt-4 space-y-2">
                          {tier.perks.map((perk, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{perk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        size="sm"
                        variant={tier.popular ? "default" : "outline"}
                        className={`mt-6 w-full rounded-full text-xs font-semibold ${
                          tier.popular ? "gradient-sunset text-white border-0" : ""
                        }`}
                      >
                        Select Package
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVIEWS (RENDERED AT LAST) */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

                <div>

                  <h2 className="font-display text-xl font-semibold">
                    Reviews & Feedback
                  </h2>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    What brands are saying about collaborating with{" "}
                    {inf.name}
                  </p>

                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isOwnProfile && (
                    <Button
                      size="sm"
                      className={cn(
                        "rounded-full text-xs font-semibold h-8 px-4 shadow-sm",
                        reviewEligibility.canReview
                          ? "gradient-sunset text-white"
                          : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                      )}
                      onClick={() => {
                        if (!user) {
                          toast.error("Please login to write a review");
                          navigate("/login");
                          return;
                        }
                        if (!reviewEligibility.canReview) {
                          toast.error(
                            reviewEligibility.reason ||
                            "You can only review brands or creators with whom you have completed a collaboration."
                          );
                          return;
                        }
                        setIsReviewModalOpen(true);
                      }}
                    >
                      ★ Write a Review
                    </Button>
                  )}

                  <span className="text-xs font-medium text-muted-foreground">
                    Sort by:
                  </span>

                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(
                        event.target.value
                      )
                    }
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
                  >
                    <option value="latest">
                      Latest
                    </option>

                    <option value="highest">
                      Highest Rated
                    </option>

                    <option value="lowest">
                      Lowest Rated
                    </option>
                  </select>

                </div>

              </div>

              {loadingReviews ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading reviews...
                </div>
              ) : sortedReviews.length ===
                0 ? (
                <div className="py-12 text-center border border-dashed border-border rounded-xl">

                  <Star className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />

                  <p className="font-semibold text-sm text-muted-foreground">
                    No reviews yet
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    Completed collaborations will appear here once reviewed.
                  </p>

                </div>
              ) : (
                <div className="space-y-4">

                  {sortedReviews.map(
                    (review) => (
                      <div
                        key={
                          review._id ||
                          review.id
                        }
                        className="border border-border rounded-xl p-4"
                      >

                        <div className="flex items-center gap-3">

                          <img src={
                              resolveImageUrl(review.brandAvatar) ||
                              getGenderAvatar(review.brandName || "Brand", "male", "brand")
                            }
                            alt=""
                            className="h-10 w-10 rounded-full object-cover border"
                           onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(review.brandName || "Brand", "male", "brand"); }} />

                          <div>

                            <h4 className="font-display text-sm font-semibold">
                              {review.brandName ||
                                "Brand"}
                            </h4>

                            <div className="flex items-center gap-1.5 mt-0.5">

                              <div className="flex">

                                {[1, 2, 3, 4, 5].map(
                                  (star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${star <=
                                        review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground/30"
                                        }`}
                                    />
                                  )
                                )}

                              </div>

                              <span className="text-[10px] text-muted-foreground">
                                {review.createdAt
                                  ? new Date(
                                    review.createdAt
                                  ).toLocaleDateString()
                                  : ""}
                              </span>

                            </div>

                          </div>

                        </div>

                        {review.campaignRef && (
                          <Badge
                            variant="secondary"
                            className="mt-3 text-[10px] rounded-full"
                          >
                            Campaign:{" "}
                            {
                              review.campaignRef
                            }
                          </Badge>
                        )}

                        <div className="mt-3">

                          <h5 className="text-sm font-semibold">
                            {review.title}
                          </h5>

                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                            {review.text}
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

        </div>

        <div className="h-20" />

      </div>

      {/* REVIEW MODAL */}

      <Dialog
        open={isReviewModalOpen}
        onOpenChange={
          setIsReviewModalOpen
        }
      >

        <DialogContent className="sm:max-w-[480px] rounded-3xl">

          <DialogHeader>

            <DialogTitle className="font-display text-xl font-bold">
              Rate {inf.name}
            </DialogTitle>

            <DialogDescription className="text-xs">
              Share your collaboration experience.
            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={
              handleSubmitReview
            }
            className="space-y-4 mt-2"
          >

            <div className="space-y-2">

              <Label>
                Overall Rating
              </Label>

              <div className="flex items-center gap-1.5">

                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setSubmitRating(
                          star
                        )
                      }
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${star <=
                          submitRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                          }`}
                      />
                    </button>
                  )
                )}

              </div>

            </div>

            <div className="space-y-1.5">

              <Label htmlFor="review-title">
                Review Title
              </Label>

              <Input
                id="review-title"
                required
                value={reviewTitle}
                onChange={(event) =>
                  setReviewTitle(
                    event.target.value
                  )
                }
                placeholder="Exceptional content quality & communication!"
                className="rounded-xl"
              />

            </div>

            <div className="space-y-1.5">

              <Label htmlFor="review-text">
                Detailed Feedback
              </Label>

              <Textarea
                id="review-text"
                required
                rows={4}
                value={reviewText}
                onChange={(event) =>
                  setReviewText(
                    event.target.value
                  )
                }
                placeholder="Describe your experience..."
                className="rounded-xl resize-none"
              />

            </div>

            <div className="space-y-1.5">

              <Label htmlFor="campaign-ref">
                Campaign Reference
              </Label>

              {reviewEligibility.campaigns && reviewEligibility.campaigns.length > 0 ? (
                <select
                  id="campaign-ref"
                  value={campaignRef}
                  onChange={(event) => setCampaignRef(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="" disabled>Select collaborated campaign...</option>
                  {reviewEligibility.campaigns.map((camp) => (
                    <option key={camp.id || camp.title} value={camp.title}>
                      {camp.title}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="campaign-ref"
                  value={campaignRef}
                  onChange={(event) =>
                    setCampaignRef(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Summer Launch Campaign"
                  className="rounded-xl"
                />
              )}

            </div>

            <DialogFooter className="pt-2 flex gap-2">

              <Button
                type="button"
                variant="outline"
                className="rounded-full flex-1"
                onClick={() =>
                  setIsReviewModalOpen(
                    false
                  )
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  submittingReview
                }
                className="rounded-full flex-1 gradient-sunset border-0 text-white"
              >
                {submittingReview
                  ? "Submitting..."
                  : "Submit Review"}
              </Button>

            </DialogFooter>

          </form>

        </DialogContent>

      </Dialog>

      {/* CONNECTION MODAL */}

      <Dialog
        open={
          isConnectionModalOpen
        }
        onOpenChange={
          setIsConnectionModalOpen
        }
      >

        <DialogContent className="sm:max-w-[480px] rounded-3xl">

          <DialogHeader>

            <DialogTitle className="font-display text-xl font-bold">
              Connect with{" "}
              {inf.name}
            </DialogTitle>

            <DialogDescription className="text-xs">
              Send a personalized pitch message to introduce yourself and propose a collaboration.
            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={
              handleSendConnection
            }
            className="space-y-4 mt-2"
          >

            <div className="space-y-1.5">

              <Label htmlFor="pitch-text">
                Your Pitch / Collaboration Message
              </Label>

              <Textarea
                id="pitch-text"
                required
                rows={5}
                value={pitchText}
                onChange={(event) =>
                  setPitchText(
                    event.target.value
                  )
                }
                placeholder="Hi! I love your brand and would love to collaborate..."
                className="rounded-xl resize-none"
              />

            </div>

            <DialogFooter className="pt-2 flex gap-2">

              <Button
                type="button"
                variant="outline"
                className="rounded-full flex-1"
                onClick={() =>
                  setIsConnectionModalOpen(
                    false
                  )
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  sendingRequest
                }
                className="rounded-full flex-1 gradient-sunset border-0 text-white"
              >
                {sendingRequest
                  ? "Sending..."
                  : "Send Request"}
              </Button>

            </DialogFooter>

          </form>

        </DialogContent>

      </Dialog>

      {/* INSTAGRAM-STYLE INTERACTIVE LIGHTBOX & POST VIEWER */}
      {selectedPortfolioPost && (
        <div
          className="fixed inset-0 z-[100] flex items-center sm:items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
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

            {/* Right Side: Creator info, Brand tag, Caption, Live Comments & Actions */}
            <div className="w-full md:w-2/5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border bg-card flex-1 min-h-0">
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                    <img
                      src={resolveImageUrl(inf.avatarUrl || inf.avatar) || getGenderAvatar(inf.name, inf.gender, "creator")}
                      alt={inf.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(inf.name, inf.gender, "creator"); }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold leading-tight truncate">{inf.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{inf.handle || "@creator"}</p>
                  </div>
                </div>

                <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                  {inf.category || "Creator"}
                </Badge>
              </div>

              {/* Scrollable Caption & Comments List */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto max-h-[220px] md:max-h-[360px] space-y-3 text-xs">
                {/* Brand Collab Partnership Tag */}
                {selectedPortfolioPost.brandTag && (
                  <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-500 font-semibold flex items-center gap-2 text-xs">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Paid partnership with <span className="underline">{selectedPortfolioPost.brandTag.startsWith("@") ? selectedPortfolioPost.brandTag : `@${selectedPortfolioPost.brandTag}`}</span></span>
                  </div>
                )}

                {/* Main Creator Caption */}
                {selectedPortfolioPost.caption ? (
                  <div className="flex gap-2.5">
                    <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-border">
                      <img
                        src={resolveImageUrl(inf.avatarUrl || inf.avatar) || getGenderAvatar(inf.name, inf.gender, "creator")}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(inf.name, inf.gender, "creator"); }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed break-words">
                        <span className="font-bold mr-1.5">{inf.name}</span>
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
                    const isProfileOwner = myProfile?._id && String(myProfile._id) === String(inf.id);
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

              {/* Bottom Action Bar: Like, Share, Stats, Add Comment */}
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
                      onClick={() => document.getElementById("public-portfolio-comment-input")?.focus()}
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

                {/* Add Comment Input */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    id="public-portfolio-comment-input"
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

      {/* VIEW ALL PORTFOLIO DELIVERABLES FULL SCREEN MODAL */}
      <Dialog open={showAllPortfolioModal} onOpenChange={setShowAllPortfolioModal}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-sm">
                  <Camera className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="font-display text-xl font-bold">
                    {inf.name}'s Complete Portfolio
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Browse all verified posts, reels, and stories created by {inf.name}.
                  </DialogDescription>
                </div>
              </div>

              {/* Format Switcher inside Modal */}
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPortfolioTab("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all",
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
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
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
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
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
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
                    portfolioTab === "story"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Stories ({(portfolio || []).filter(p => p.type === "story").length})
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Grid inside modal */}
          <div className="py-4">
            {(() => {
              const modalFiltered = (portfolio || []).filter((item) => {
                if (portfolioTab === "all") return true;
                const itemType = item.type || "post";
                return itemType === portfolioTab;
              });

              if (modalFiltered.length === 0) {
                return (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10 p-8">
                    <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-foreground">No deliverables found</p>
                    <p className="text-xs text-muted-foreground mt-1">There are no {portfolioTab === "all" ? "items" : portfolioTab + "s"} published in this category.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {modalFiltered.map((item, index) => {
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
                        className="group relative rounded-2xl overflow-hidden border border-border bg-black cursor-pointer shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg aspect-[4/5]"
                        onClick={() => {
                          setSelectedPortfolioPost(item);
                        }}
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

                        <div className="absolute top-2 left-2 z-10">
                          {isReel ? (
                            <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/30">
                              <Film className="h-2.5 w-2.5" /> Reel
                            </span>
                          ) : isStory ? (
                            <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                              <Sparkles className="h-2.5 w-2.5" /> Story
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                              <Camera className="h-2.5 w-2.5" /> Post
                            </span>
                          )}
                        </div>

                        {item.brandTag && (
                          <div className="absolute top-2 right-2 z-10 max-w-[55%] truncate">
                            <span className="block truncate bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/20">
                              {item.brandTag.startsWith("@") ? item.brandTag : `@${item.brandTag}`}
                            </span>
                          </div>
                        )}

                        {isReel && views > 0 && (
                          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Play className="h-2.5 w-2.5 fill-white" /> {views.toLocaleString()}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-white">
                          {item.caption && (
                            <p className="text-[11px] font-medium text-white/90 line-clamp-2 mb-2">
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
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* BASIC FALLBACK LIGHTBOX */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 transition-colors rounded-full hover:bg-white/10"
              onClick={() => setLightboxImage(null)}
            >
              <X className="h-8 w-8" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Portfolio full view" 
              className="max-h-[85vh] w-auto rounded-md shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}