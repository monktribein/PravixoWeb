import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import { subscribeToPush } from "../utils/pushNotification";
import { getGenderAvatar, DEFAULT_BANNER_IMAGES } from "../utils/avatar";

import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaYoutube,
  FaTwitter,
} from "react-icons/fa";


import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Upload,
  Plus,
  Trash2,
 
  Camera,
  ImageIcon,
  LayoutGrid,
  SlidersHorizontal,

  Check,
  ChevronsUpDown,
  X,
  Star,
  Lock,
  RotateCw,
  ShieldCheck,
  ExternalLink,
  Activity,
  CreditCard,
  Building2,
  Percent,
  Sparkles,
  Clock,
  Megaphone,
  Calendar,
  IndianRupee,
  Layers,
  Wallet,
  ArrowUpRight,
  History,
  Landmark,
  Gift,
  Share2,
  Copy,
  CheckCircle2,
  Users,
  ChevronRight,
  ChevronLeft,
  Search,
  MessageCircle,
  UserMinus,
  Heart,
  Film,
  Send,
  Play,
  Bookmark,
  Share,
  Loader2,
} from "lucide-react";


import { Button } from "@/components/ui/Button";
import { CATEGORY_OPTIONS } from "@/data/influencer";
import { Switch } from "@/components/ui/Switch";
import { SubscriptionTab } from "../components/subscription/SubscriptionTab";
import { CreatorOfferForm } from "../components/offers/CreatorOfferForm";
import { CreatorOffersSidebarWidget } from "../components/offers/CreatorOffersSidebarWidget";
import { profileService } from "@/services/profileService";
const { submitVerification } = profileService;

const QuoraIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.592 16.483c.783-.984 1.258-2.228 1.258-3.585 0-3.155-2.558-5.713-5.713-5.713S6.423 9.743 6.423 12.898s2.558 5.713 5.713 5.713c1.088 0 2.106-.305 2.975-.833l3.208 3.208c.28.28.73.28 1.01 0a.715.715 0 000-1.01l-2.737-2.493zm-4.455.518c-2.099 0-3.8-1.701-3.8-3.8 0-2.099 1.701-3.8 3.8-3.8s3.8 1.701 3.8 3.8c0 2.099-1.701 3.8-3.8 3.8z" />
  </svg>
);

function getCountdown(dueDateTimestamp) {
  const diff = dueDateTimestamp - Date.now();
  if (diff <= 0) {
    return { overdue: true, text: "Task Overdue" };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let text = "";
  if (days > 0) text += `${days}d `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${minutes}m remaining`;
  return { overdue: false, text };
}

function CountdownTimer({ dueDate }) {
  const [timeLeft, setTimeLeft] = useState(getCountdown(dueDate));

  useEffect(() => {
    setTimeLeft(getCountdown(dueDate));
    const timer = setInterval(() => {
      setTimeLeft(getCountdown(dueDate));
    }, 15000);

    return () => clearInterval(timer);
  }, [dueDate]);

  if (timeLeft.overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-red-500/20">
        Task Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-primary/20 animate-pulse">
      {timeLeft.text}
    </span>
  );
}

const LOCATION_OPTIONS = [
  "Pan India",
  "Delhi NCR",
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Surat",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Noida",
  "Greater Noida",
  "Ghaziabad",
  "Gurugram",
  "Faridabad",
  "Indore",
  "Bhopal",
  "Nagpur",
  "Nashik",
  "Patna",
  "Ranchi",
  "Chandigarh",
  "Ludhiana",
  "Amritsar",
  "Jalandhar",
  "Dehradun",
  "Haridwar",
  "Varanasi",
  "Agra",
  "Prayagraj",
  "Meerut",
  "Gorakhpur",
  "Kochi",
  "Thiruvananthapuram",
  "Kozhikode",
  "Coimbatore",
  "Madurai",
  "Visakhapatnam",
  "Vijayawada",
  "Bhubaneswar",
  "Cuttack",
  "Guwahati",
  "Siliguri",
  "Jodhpur",
  "Udaipur",
  "Kota",
  "Mysore",
  "Mangalore",
  "Other Location",
];

const DEFAULT_BANNER_FALLBACKS = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=85",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1800&q=85",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1800&q=85",
];

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/TextArea";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { AvatarPickerModal } from "@/components/avatar/AvatarPickerModal";

export function DashboardInfluencer() {
  const navigate = useNavigate();
  const { profile, user, loading, updateProfile: updateLocalProfile, fetchProfile } = useAuth();

  const fileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const coverFileRef = useRef(null);

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
    return `${apiUrl}${url}`;
  };

  // ================= REST API =================
  const apiGet = async (url, params = {}) => {
    const res = await api.get(url, { params });
    return res.data?.data ?? res.data;
  };
  const apiPost = async (url, data, config = {}) => {
    const res = await api.post(url, data, config);
    return res.data?.data ?? res.data;
  };
  const apiPut = async (url, data, config = {}) => {
    const res = await api.put(url, data, config);
    return res.data?.data ?? res.data;
  };
  const apiPatch = async (url, data, config = {}) => {
    const res = await api.patch(url, data, config);
    return res.data?.data ?? res.data;
  };
  const apiDelete = async (url, config = {}) => {
    const res = await api.delete(url, config);
    return res.data?.data ?? res.data;
  };

  const useRestQuery = (key, getter, enabled = true) => {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const execute = async () => {
      if (!enabled) {
        setData(undefined);
        setError(null);
        return;
      }
      setLoading(true);
      try {
        const v = await getter();
        setData(v);
        setError(null);
      } catch (e) {
        console.error(`REST query failed [${key}]`, e);
        setError(e);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      execute();
    }, [key, enabled]);

    // To ensure backwards compatibility where code expects `data` directly or as array/object:
    // If callers use `val = useRestQuery(...)`, returning `data` directly preserves all existing accesses.
    return data;
  };

  // =====================================================
  // SAFE MONGO PROFILE ID
  // =====================================================
  // The pricing API expects Mongo Profile._id, NOT the custom userId
  // such as user_bmFAZ21haWwuY29t.
  const mongoProfileId =
    profile?._id ||
    profile?.id ||
    profile?.profileId ||
    null;

  const hasValidMongoProfileId =
    typeof mongoProfileId === "string" &&
    /^[a-fA-F0-9]{24}$/.test(mongoProfileId);

  const profileKey = mongoProfileId || "none";
  const [portfolioRefreshKey, setPortfolioRefreshKey] = useState(0);
  const [socialRefreshKey, setSocialRefreshKey] = useState(0);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [mediaPreviewModal, setMediaPreviewModal] = useState(null); // { type: 'avatar'|'cover', url: string, title: string }

  const handleSelectAvatarPreset = async (avatarUrl) => {
    if (!profile || !mongoProfileId) return;
    try {
      const res = await apiPatch(`/profiles/${mongoProfileId}`, { avatarUrl });
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Avatar updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update avatar");
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile || !mongoProfileId) return;
    if (!window.confirm("Are you sure you want to reset your profile photo to default?")) return;
    try {
      const res = await apiDelete(`/profiles/${mongoProfileId}/avatar`);
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Profile photo reset to default!");
    } catch (err) {
      console.error("Failed to delete avatar:", err);
      toast.error("Failed to reset profile photo");
    }
  };

  const handleDeleteCover = async () => {
    if (!profile || !mongoProfileId) return;
    if (!window.confirm("Are you sure you want to remove your banner and reset to default?")) return;
    try {
      const res = await apiDelete(`/profiles/${mongoProfileId}/cover`);
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Banner reset to default!");
    } catch (err) {
      console.error("Failed to delete cover:", err);
      toast.error("Failed to reset banner");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        setShowPushBanner(true);
      }
    }
  }, []);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      const res = await subscribeToPush();
      if (res.success) {
        setShowPushBanner(false);
        toast.success("Push notifications enabled! You'll receive alerts for new campaigns.");
      } else if (res.reason === "denied") {
        setShowPushBanner(false);
        toast.info("Notifications are blocked in browser settings.");
      }
    } catch (err) {
      console.error("Push subscription error:", err);
    } finally {
      setEnablingPush(false);
    }
  };

  console.log("DASHBOARD PROFILE:", profile);
  console.log("DASHBOARD MONGO PROFILE ID:", mongoProfileId);

  // =====================================================
  // PROFILE-DEPENDENT QUERIES
  // =====================================================
  const pricingTiers = useRestQuery(
    `pricing-${profileKey}`,
    () => apiGet(`/pricing/profile/${mongoProfileId}`),
    hasValidMongoProfileId
  );

  const portfolioImages = useRestQuery(
    `portfolio-${profileKey}-${portfolioRefreshKey}`,
    () => apiGet(`/portfolio/profile/${mongoProfileId}`),
    hasValidMongoProfileId
  );

  const connections = useRestQuery(
    `social-${profileKey}-${socialRefreshKey}`,
    () => apiGet(`/social/profile/${mongoProfileId}`),
    hasValidMongoProfileId
  );

  const clientIds = useRestQuery(
    "oauth-client-ids",
    () => apiGet("/social/oauth/client-ids"),
    true
  );

  const syncConnection = async ({ connectionId }) => apiPost(`/social/oauth/exchange`, { connectionId });
  const disconnectPlatform = ({ connectionId }) => apiDelete(`/social/${connectionId}`);
  const updateProfile = ({ id, ...data }) => apiPut(`/profiles/${id}`, data);
  const upsertPricing = ({ profileId, tiers }) => apiPut(`/pricing`, { profileId, tiers });
  const removeTierMutation = ({ id }) => apiDelete(`/pricing/${id}`);

  const addPortfolioImage = async ({ profileId, imageFile, sortOrder, metadata = {} }) => {
    const form = new FormData();
    form.append("image", imageFile);
    form.append("profileId", profileId);
    form.append("sortOrder", String(sortOrder ?? 0));
    if (metadata.type) form.append("type", metadata.type);
    if (metadata.caption) form.append("caption", metadata.caption);
    if (metadata.brandTag) form.append("brandTag", metadata.brandTag);
    if (metadata.likesCount) form.append("likesCount", String(metadata.likesCount));
    if (metadata.viewsCount) form.append("viewsCount", String(metadata.viewsCount));
    if (metadata.aspectRatio) form.append("aspectRatio", metadata.aspectRatio);
    if (metadata.mediaType) form.append("mediaType", metadata.mediaType);
    return apiPost(`/portfolio`, form, { headers: { "Content-Type": "multipart/form-data" } });
  };
  const removePortfolioImage = ({ id }) => apiDelete(`/portfolio/${id}`);
  const togglePortfolioLike = (id) => apiPost(`/portfolio/${id}/like`, {});
  const addPortfolioComment = (id, data) => apiPost(`/portfolio/${id}/comments`, data);

  const setAvatarImage = async ({ file, profileId }) => {
    const form = new FormData();
    form.append("image", file);
    return apiPost(`/profiles/${profileId || mongoProfileId}/avatar`, form, { headers: { "Content-Type": "multipart/form-data" } });
  };
  const setCoverImage = async ({ file, profileId }) => {
    const form = new FormData();
    form.append("image", file);
    return apiPost(`/profiles/${profileId || mongoProfileId}/cover`, form, { headers: { "Content-Type": "multipart/form-data" } });
  };


  const popupSettings = null;
  const offers = useRestQuery("offers", () => apiGet(`/subscriptions/offers`), true) || [];
  const packages = useRestQuery("packages", () => apiGet(`/subscriptions/packages`), true) || [];
  const currentSub = useRestQuery(
    `subscription-${profileKey}`,
    () => apiGet(`/subscriptions/user/${mongoProfileId}`),
    hasValidMongoProfileId
  );
  const trackAnalytics = async () => {};
  const checkSubscriptionStatus = async () => {};
  const upgradeSubscription = ({ profileId, packageId, offerId }) =>
    apiPost(`/subscriptions`, { profileId, packageId, offerId });

  const reviews = useRestQuery(
    `reviews-${profileKey}`,
    () => apiGet(`/reviews/creator/${mongoProfileId}`, { visibleOnly: false }),
    hasValidMongoProfileId
  );
  const toggleVisibility = ({ reviewId }) => apiPatch(`/reviews/${reviewId}/visibility`, {});
  const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);
  const myRequests = useRestQuery(
    `requests-${profileKey}-${requestsRefreshKey}`,
    () => apiGet(`/connections/creator/${mongoProfileId}/my-requests`),
    hasValidMongoProfileId
  );
  const myTasks = useRestQuery(
    `tasks-${profileKey}`,
    () => apiGet(`/tasks/creator/${mongoProfileId}`),
    hasValidMongoProfileId
  );
  const creatorPayments = useRestQuery(
    `payments-${profileKey}`,
    () => apiGet(`/payments/creator/${mongoProfileId}`),
    hasValidMongoProfileId
  );
  const startTask = ({ taskId }) => apiPatch(`/tasks/${taskId}/start`, {});
  const submitTask = ({ taskId, submissionLink, notes, attachmentLink }) =>
    apiPatch(`/tasks/${taskId}/submit`, { submissionLink, notes, attachmentLink });
  const saveBankDetails = (data) =>
    apiPost(`/payments/bank-details`, { ...data, creatorId: mongoProfileId });
  const bankDetails = useRestQuery(
    `bank-${profileKey}`,
    () => apiGet(`/payments/bank-details/${mongoProfileId}`),
    hasValidMongoProfileId
  );
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const creatorWalletData = useRestQuery(
    `wallet-${profileKey}-${walletRefreshKey}`,
    () => apiGet(`/wallet/my-wallet`),
    hasValidMongoProfileId
  );
  const creatorWithdrawalsData = useRestQuery(
    `withdrawals-${profileKey}-${walletRefreshKey}`,
    () => apiGet(`/wallet/my-withdrawals`),
    hasValidMongoProfileId
  );

  // Referral Queries & States
  const [referralRefreshKey, setReferralRefreshKey] = useState(0);
  const [isRefreshingReferral, setIsRefreshingReferral] = useState(false);
  const [showReferredModal, setShowReferredModal] = useState(false);
  const [referredSearchFilter, setReferredSearchFilter] = useState("");
  const referralCodeData = useRestQuery(
    `referral-code-${profileKey}-${referralRefreshKey}`,
    () => apiGet(`/referrals/my-code`),
    hasValidMongoProfileId
  );
  const referralEarnings = useRestQuery(
    `referral-earnings-${profileKey}-${referralRefreshKey}`,
    () => apiGet(`/referrals/earnings?page=1&limit=20`),
    hasValidMongoProfileId
  );
  const referredListQuery = useRestQuery(
    `referral-list-${profileKey}-${referralRefreshKey}`,
    () => apiGet(`/referrals/list?limit=100`),
    hasValidMongoProfileId
  );

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Safe normalized fallbacks so rendering never crashes on null/empty/arrays
  const creatorWallet = (creatorWalletData && typeof creatorWalletData === "object" && !Array.isArray(creatorWalletData))
    ? (creatorWalletData.wallet || {})
    : {};
  const creatorTransactionsList = (creatorWalletData && Array.isArray(creatorWalletData.recentTransactions))
    ? creatorWalletData.recentTransactions
    : [];
  const creatorWithdrawalsList = Array.isArray(creatorWithdrawalsData)
    ? creatorWithdrawalsData
    : (creatorWithdrawalsData && Array.isArray(creatorWithdrawalsData.data))
    ? creatorWithdrawalsData.data
    : [];

  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);

  const [discoverRefreshKey, setDiscoverRefreshKey] = useState(0);
  const [isRefreshingDiscover, setIsRefreshingDiscover] = useState(false);
  const discoverableCampaigns = useRestQuery(
    `campaigns-discover-${discoverRefreshKey}`,
    () => apiGet(`/campaigns/discover`),
    true
  );

  const creatorTotalFollowers = useMemo(() => {
    return (
      Number(profile?.instagramFollowers || 0) +
      Number(profile?.youtubeFollowers || 0) +
      Number(profile?.facebookFollowers || 0) +
      Number(profile?.twitterFollowers || 0) +
      Number(profile?.linkedinFollowers || 0) +
      Number(profile?.quoraFollowers || 0)
    );
  }, [profile]);

  // Track campaign IDs applied by creator from connections / requests
  const { userRequestedCampaignIds, userApprovedCampaignIds } = useMemo(() => {
    const requested = new Set();
    const approved = new Set();

    if (Array.isArray(myRequests)) {
      myRequests.forEach((req) => {
        const campId = req.campaign?._id || req.campaignId || req.campaign;
        if (campId) {
          if (req.status === "accepted") {
            approved.add(String(campId));
          } else {
            requested.add(String(campId));
          }
        }
      });
    }

    if (Array.isArray(discoverableCampaigns)) {
      discoverableCampaigns.forEach((camp) => {
        if (camp.isParticipating || camp.requestStatus === "accepted") {
          approved.add(String(camp._id));
        } else if (camp.isRequested || camp.requestStatus === "pending") {
          requested.add(String(camp._id));
        }
      });
    }

    return { userRequestedCampaignIds: requested, userApprovedCampaignIds: approved };
  }, [myRequests, discoverableCampaigns]);

  const handleRefreshDiscover = async () => {
    setIsRefreshingDiscover(true);
    try {
      setDiscoverRefreshKey((k) => k + 1);
      toast.success("Campaign listings refreshed!");
    } finally {
      setTimeout(() => setIsRefreshingDiscover(false), 500);
    }
  };

  const handleShareCampaign = (camp) => {
    const reqFollowers = Number(camp.minFollowers || 0);
    const reqText = reqFollowers > 0
      ? ` (Requires ${reqFollowers >= 1000 ? `${(reqFollowers / 1000).toFixed(0)}k+` : reqFollowers} followers)`
      : "";
    const shareUrl = `${window.location.origin}/browse?campaign=${camp._id}`;
    let tierText = "";
    if (camp.tiers && camp.tiers.length > 0) {
      tierText = ` [Options/Perks: ${camp.tiers.map(t => `${t.minFollowers >= 1000 ? `${(t.minFollowers/1000).toFixed(0)}k+` : t.minFollowers}: ${t.reward || ''}${t.cashAmount ? ` + ₹${t.cashAmount}` : ''}`).join(' | ')}]`;
    }
    const shareText = `Check out "${camp.title}" brand campaign on Pravixo${reqText}${tierText}! Total Budget: ₹${Number(camp.totalBudget || 0).toLocaleString()}. View details & apply: ${shareUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success(
        reqFollowers > 0
          ? `Campaign referral link copied! Share with creators who have ${reqFollowers >= 1000 ? `${(reqFollowers / 1000).toFixed(0)}k+` : reqFollowers} followers.`
          : "Campaign link copied to clipboard!"
      );
    } else {
      toast.info(`Campaign Link: ${shareUrl}`);
    }
  };

  // Campaign Discovery Modal & Join Request States
  const [selectedCampaignForDiscovery, setSelectedCampaignForDiscovery] = useState(null);
  const [selectedTierForJoin, setSelectedTierForJoin] = useState(null);
  const [joinPitch, setJoinPitch] = useState("");
  const [joinProposedRate, setJoinProposedRate] = useState("");
  const [joiningCampaign, setJoiningCampaign] = useState(false);

  // Deliverable Submission Modal States (Task 6 & Task 7)
  const [selectedCollabForSubmission, setSelectedCollabForSubmission] = useState(null);
  const [submissionDeliverableType, setSubmissionDeliverableType] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionFilePreview, setSubmissionFilePreview] = useState(null);
  const [submissionCaption, setSubmissionCaption] = useState("");
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  // Submissions History Review Modal for Creator (Task 7) & Rework State (Task 8)
  const [selectedCollabForHistory, setSelectedCollabForHistory] = useState(null);
  const [creatorSubmissionsList, setCreatorSubmissionsList] = useState([]);
  const [loadingCreatorSubmissions, setLoadingCreatorSubmissions] = useState(false);
  const [reworkingSubmission, setReworkingSubmission] = useState(null);
  const [reworkFile, setReworkFile] = useState(null);
  const [reworkFilePreview, setReworkFilePreview] = useState(null);
  const [reworkCaption, setReworkCaption] = useState("");
  const [submittingRework, setSubmittingRework] = useState(false);
  const [showCampaignBreakdownDialog, setShowCampaignBreakdownDialog] = useState(false);

  const [searchParams] = useSearchParams();
  // Tab State
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "dashboard");
  // Sub-section quick selector to eliminate excessive scrolling
  const [creatorSubSection, setCreatorSubSection] = useState(() => searchParams.get("section") || "all");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      setCreatorSubSection(sectionParam);
    }
  }, [searchParams]);

  // Instagram-style Portfolio States
  const [portfolioTab, setPortfolioTab] = useState("all"); // "all" | "post" | "reel" | "story"
  const [portfolioLayout, setPortfolioLayout] = useState("carousel"); // "carousel" (scroll x) or "grid"
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
  const [selectedPortfolioPost, setSelectedPortfolioPost] = useState(null);
  const [portfolioCommentText, setPortfolioCommentText] = useState("");
  const [submittingPortfolioComment, setSubmittingPortfolioComment] = useState(false);
  const [newPortfolioForm, setNewPortfolioForm] = useState({
    type: "post",
    file: null,
    filePreview: null,
    caption: "",
    brandTag: "",
    likesCount: 120,
    viewsCount: 1500,
  });
  const [uploadingPortfolioItem, setUploadingPortfolioItem] = useState(false);


  // Popup & Banner State
  const [showOfferPopup, setShowOfferPopup] = useState(false);
  const [activeOffer, setActiveOffer] = useState(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [upgradingId, setUpgradingId] = useState(null);

  const handleUpgradeFromPopup = async (packageId, offerId) => {
    if (!profile) return;
    setUpgradingId(packageId);
    try {
      await upgradeSubscription({
        profileId: mongoProfileId,
        packageId,
        offerId,
      });
      toast.success("Package upgraded successfully! Enjoy your new features.");
      setShowOfferPopup(false);
    } catch (err) {
      console.error(err);
      toast.error((err).message || "Failed to upgrade package");
    } finally {
      setUpgradingId(null);
    }
  };

  useEffect(() => {
    if (profile) {
      checkSubscriptionStatus({ profileId: mongoProfileId }).catch(console.error);
    }
  }, [profile]);

  useEffect(() => {
    if (!popupSettings || !offers || !profile || !user) return;
    if (!popupSettings.showPopup) return;

    // Check target users
    const matchesTarget =
      popupSettings.targetUsers === "both" ||
      (popupSettings.targetUsers === "brands" && profile.role === "brand") ||
      (popupSettings.targetUsers === "creators" && profile.role === "creator");
    if (!matchesTarget) return;

    // Find active offer (optional)
    const activeOfferRecord = offers.find(
      (o) => o.active && o._id === popupSettings.activeOfferId && o.expiryDate > Date.now()
    );
    setActiveOffer(activeOfferRecord || null);

    const hasSeenKey = `popup_seen_${mongoProfileId}_${activeOfferRecord?._id || "no_offer"}`;
    const lastSeenTimeKey = `popup_last_seen_${mongoProfileId}`;
    const dontShowUntilKey = `popup_dont_show_until_${mongoProfileId}`;

    const now = Date.now();

    // Check "Don't Show Again for 7 Days"
    const dontShowUntil = localStorage.getItem(dontShowUntilKey);
    if (dontShowUntil && parseInt(dontShowUntil, 10) > now) {
      return;
    }

    let shouldDisplay = false;
    const frequency = popupSettings.popupFrequency;

    if (frequency === "every_login") {
      const seenThisSession = sessionStorage.getItem(hasSeenKey);
      if (!seenThisSession) {
        shouldDisplay = true;
      }
    } else if (frequency === "first_login" || frequency === "only_once") {
      const hasSeen = localStorage.getItem(hasSeenKey);
      if (!hasSeen) {
        shouldDisplay = true;
      }
    } else if (frequency === "every_7_days") {
      const lastSeen = localStorage.getItem(lastSeenTimeKey);
      if (!lastSeen || now - parseInt(lastSeen, 10) > 7 * 24 * 60 * 60 * 1000) {
        shouldDisplay = true;
      }
    }

    if (shouldDisplay) {
      setShowOfferPopup(true);
      sessionStorage.setItem(hasSeenKey, "true");
      localStorage.setItem(hasSeenKey, "true");
      localStorage.setItem(lastSeenTimeKey, now.toString());
      if (activeOfferRecord) {
        trackAnalytics({ offerId: activeOfferRecord._id, type: "view" });
      }
    }
  }, [popupSettings, offers, profile, user]);


  const [selectedAuditLogPayment, setSelectedAuditLogPayment] = useState(null);

  // Bank Account Form State
  const [bankFullName, setBankFullName] = useState("");
  const [bankPhone, setBankPhone] = useState("");
  const [bankEmail, setBankEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [bankNumberConfirm, setBankNumberConfirm] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankUpi, setBankUpi] = useState("");
  const [bankPan, setBankPan] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (bankDetails) {
      setBankFullName(bankDetails.fullName || "");
      setBankPhone(bankDetails.phone || "");
      setBankEmail(bankDetails.email || "");
      setBankName(bankDetails.bankName || "");
      setBankHolderName(bankDetails.accountHolderName || "");
      setBankNumber(bankDetails.accountNumber || "");
      setBankNumberConfirm(bankDetails.accountNumber || "");
      setBankIfsc(bankDetails.ifsc || "");
      setBankUpi(bankDetails.upiId || "");
      setBankPan(bankDetails.panNumber || "");
    }
  }, [bankDetails]);

  // Task Submission States
  const [submitTargetTask, setSubmitTargetTask] = useState(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionAttachment, setSubmissionAttachment] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [gender, setGender] = useState("male");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [startingPrice, setStartingPrice] = useState(0);
  const [isBarterAllowed, setIsBarterAllowed] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [aadharStorageId, setAadharStorageId] = useState("");
  const [aadharFileName, setAadharFileName] = useState("");
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [panStorageId, setPanStorageId] = useState("");
  const [panFileName, setPanFileName] = useState("");
  const [uploadingPan, setUploadingPan] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Social states
  const [instaHandle, setInstaHandle] = useState("");
  const [instaFollowers, setInstaFollowers] = useState(0);
  const [fbHandle, setFbHandle] = useState("");
  const [fbFollowers, setFbFollowers] = useState(0);
  const [liHandle, setLiHandle] = useState("");
  const [liFollowers, setLiFollowers] = useState(0);
  const [ytHandle, setYtHandle] = useState("");
  const [ytFollowers, setYtFollowers] = useState(0);
  const [quoraHandle, setQuoraHandle] = useState("");
  const [quoraFollowers, setQuoraFollowers] = useState(0);
  const [twHandle, setTwHandle] = useState("");
  const [twFollowers, setTwFollowers] = useState(0);
  const [xHandle, setXHandle] = useState("");
  const [xFollowers, setXFollowers] = useState(0);
  const [snapHandle, setSnapHandle] = useState("");
  const [snapFollowers, setSnapFollowers] = useState(0);
  const [pinHandle, setPinHandle] = useState("");
  const [pinFollowers, setPinFollowers] = useState(0);

  // Live Social Feeds Manual/Auto Input state
  const [customSocialFeeds, setCustomSocialFeeds] = useState([]);
  const [openLiveFeedSection, setOpenLiveFeedSection] = useState(false);
  const [showAddSocialFeedModal, setShowAddSocialFeedModal] = useState(false);
  const [isFetchingPostMetadata, setIsFetchingPostMetadata] = useState(false);
  const [newSocialFeedForm, setNewSocialFeedForm] = useState({
    platform: "instagram",
    type: "reel",
    postUrl: "",
    thumbnail: "",
    caption: "",
    badge: "Viral Reel",
    likes: "25K",
    comments: "450",
    views: "120K",
  });

  // Followers & Following view modal state
  const [followModalType, setFollowModalType] = useState(null); // 'followers' | 'following' | null
  const [followListUsers, setFollowListUsers] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  const fetchFollowCounts = async () => {
    if (!mongoProfileId) return;
    try {
      const res = await apiGet(`/follows/status?targetProfileId=${mongoProfileId}`);
      if (res) {
        setFollowCounts({
          followers: res.followersCount || 0,
          following: res.followingCount || 0,
        });
      }
    } catch (e) {
      console.error("Fetch follow counts error:", e);
    }
  };

  const openFollowModal = async (type) => {
    setFollowModalType(type);
    setLoadingFollowList(true);
    try {
      const res = await apiGet(`/follows/${type}/${mongoProfileId}`);
      setFollowListUsers(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err);
      toast.error(`Failed to load ${type}`);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const handleUnfollowUser = async (targetUserId) => {
    try {
      await apiPost("/follows/toggle", {
        followerId: mongoProfileId,
        targetProfileId: targetUserId,
      });
      toast.success("Updated follow status");
      // refresh current modal list
      if (followModalType) {
        const res = await apiGet(`/follows/${followModalType}/${mongoProfileId}`);
        setFollowListUsers(Array.isArray(res) ? res : res?.data || []);
      }
      fetchFollowCounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to unfollow");
    }
  };

  useEffect(() => {
    if (mongoProfileId) {
      fetchFollowCounts();
    }
  }, [mongoProfileId]);

  const [showVerificationDialog, setShowVerificationDialog] =
  useState(false);

const [aadharFile, setAadharFile] =
  useState(null);

const [panFile, setPanFile] =
  useState(null);

const [verificationUploading, setVerificationUploading] =
  useState(false);
const [showPostSaveDialog, setShowPostSaveDialog] = useState(false);
const [openKycSection, setOpenKycSection] = useState(false);
const [openSocialSection, setOpenSocialSection] = useState(false);
const [openPortfolioSection, setOpenPortfolioSection] = useState(false);
const [openPricingSection, setOpenPricingSection] = useState(false);
const [discoverPage, setDiscoverPage] = useState(1);
const CAMPAIGNS_PER_PAGE = 6;

  // ===== DEALS & TASKS tab states =====
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmitTaskModal, setShowSubmitTaskModal] = useState(false);
  const [taskProofUrl, setTaskProofUrl] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [submittingTaskProof, setSubmittingTaskProof] = useState(false);

  // ===== FIND CAMPAIGNS tab states =====
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState(null);

  // Helper: human-readable time remaining from a dueDate timestamp/string
  const getTimeRemaining = (dueDate) => {
    if (!dueDate) return "No deadline";
    const diff = new Date(dueDate) - Date.now();
    if (diff <= 0) return "Overdue";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Handler: submit task proof
  const handleSubmitTaskProof = async () => {
    if (!selectedTask) return;
    if (!taskProofUrl.trim()) {
      toast.error("Please provide a proof link.");
      return;
    }
    setSubmittingTaskProof(true);
    try {
      await submitTask({
        taskId: selectedTask._id,
        submissionLink: taskProofUrl,
        notes: taskNotes,
        attachmentLink: "",
      });
      toast.success("Task submitted successfully!");
      setShowSubmitTaskModal(false);
      setSelectedTask(null);
      setTaskProofUrl("");
      setTaskNotes("");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit task");
    } finally {
      setSubmittingTaskProof(false);
    }
  };

  // Social Verification States & Methods
  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const [selectedChartPlatform, setSelectedChartPlatform] = useState("instagram");
  const activeChartConnection = connections?.find((c) => c.platform === selectedChartPlatform);
  const history = useRestQuery(
    `history-${activeChartConnection?._id || "none"}`,
    () => apiGet(`/social/${activeChartConnection._id}/history`),
    !!activeChartConnection
  );


  const chartData = useMemo(() => {
    if (!history) return [];
    return [...history]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => ({
        date: new Date(item.timestamp).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        followers: item.followers,
        views: item.views,
        engagement: item.engagementRate,
      }));
  }, [history]);

  const handleConnectPlatform = (platform) => {
    if (!profile || !clientIds) return;
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    const state = `${platform}:${mongoProfileId}:${profile.role}`;

    let url = "";
    if (platform === "youtube") {
      const clientId = clientIds.googleClientId;
      if (!clientId) {
        toast.error("Google OAuth is not configured on the backend yet.");
        return;
      }
      url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&state=${state}&access_type=offline&prompt=consent`;
    } else if (platform === "instagram" || platform === "facebook") {
      const clientId = clientIds.metaClientId;
      if (!clientId) {
        toast.error("Meta OAuth is not configured on the backend yet.");
        return;
      }
      const scope = "pages_show_list,instagram_basic,instagram_manage_insights,pages_read_engagement";
      url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
    } else if (platform === "linkedin") {
      const clientId = clientIds.linkedinClientId;
      if (!clientId) {
        toast.error("LinkedIn OAuth is not configured on the backend yet.");
        return;
      }
      url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=openid%20profile%20w_member_social`;
    } else if (platform === "twitter") {
      const clientId = clientIds.twitterClientId;
      if (!clientId) {
        toast.error("Twitter OAuth is not configured on the backend yet.");
        return;
      }
      sessionStorage.setItem("twitter_code_verifier", "challenge");
      url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=users.read%20tweet.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
    }

    if (url) {
      window.location.href = url;
    }
  };

  const handleQuickVerify = async (platform, handle, followers) => {
    if (!mongoProfileId) return;
    if (!handle?.trim()) {
      toast.error(`Please enter your ${platform} handle first.`);
      return;
    }
    setSyncingPlatform(platform);
    const toastId = toast.loading(`Verifying ${platform.toUpperCase()} account & auditing metrics...`);
    try {
      const res = await apiPost("/social/verify-connect", {
        profileId: mongoProfileId,
        ownerType: profile?.role || "creator",
        platform,
        handle: handle.trim(),
        followers: Number(followers) || undefined,
      });
      if (res?.success || res?._id || res?.data) {
        toast.success(`✓ ${platform.toUpperCase()} verified and live metrics imported!`, { id: toastId });
        setSocialRefreshKey((k) => k + 1);
        if (fetchProfile) fetchProfile();
        setSelectedChartPlatform(platform);
      } else {
        toast.error("Verification failed.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to verify social platform", { id: toastId });
    } finally {
      setSyncingPlatform(null);
    }
  };

  const handleLiveReSync = async (connectionId, platform) => {
    if (!connectionId) return;
    setSyncingPlatform(platform);
    const toastId = toast.loading(`Fetching live ${platform.toUpperCase()} engagement & audience metrics...`);
    try {
      const res = await apiPost(`/social/${connectionId}/sync-live`);
      if (res?.success || res?._id || res?.data) {
        toast.success(`✓ Synced live data for ${platform.toUpperCase()}!`, { id: toastId });
        setSocialRefreshKey((k) => k + 1);
        if (fetchProfile) fetchProfile();
      } else {
        toast.error("Sync failed.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Live sync failed", { id: toastId });
    } finally {
      setSyncingPlatform(null);
    }
  };

  const handleManualSync = async (connectionId, platform) => {
    return handleLiveReSync(connectionId, platform);
  };

  const handleDisconnect = async (connectionId, platform) => {
    if (!confirm(`Are you sure you want to disconnect your verified ${platform.toUpperCase()} account?`)) return;
    try {
      await disconnectPlatform({ connectionId });
      toast.success(`Disconnected verified ${platform.toUpperCase()} account.`);
      setSocialRefreshKey((k) => k + 1);
      if (fetchProfile) fetchProfile();
    } catch (err) {
      const e = err ;
      toast.error(e.message || "Failed to disconnect account.");
    }
  };

  const selectedCategories = category
    ? category
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  const handleSelectCategory = (val) => {
    let updated;
    if (selectedCategories.includes(val)) {
      updated = selectedCategories.filter((c) => c !== val);
    } else {
      updated = [...selectedCategories, val];
    }
    setCategory(updated.join(", "));
  };

  const selectedLocations = location
    ? location
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  const handleSelectLocation = (val) => {
    let updated;
    if (selectedLocations.includes(val)) {
      updated = selectedLocations.filter((c) => c !== val);
    } else {
      updated = [...selectedLocations, val];
    }
    setLocation(updated.join(", "));
  };

  useEffect(() => {
    document.title = "Creator dashboard —  Pravixo";
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || profile.displayName || "");
      setHandle(profile.handle?.replace("@", "") || "");
      setGender(profile.gender || "male");
      setPhone(profile.phone || "");
      setCategory(profile.category || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setStartingPrice(Number(profile.startingPrice ?? 0));
      setIsBarterAllowed(Boolean(profile.isBarterAllowed));
      // Socials
      setInstaHandle(profile.instagramHandle || "");
      setInstaFollowers(profile.instagramFollowers || 0);
      setFbHandle(profile.facebookHandle || "");
      setFbFollowers(profile.facebookFollowers || 0);
      setLiHandle(profile.linkedinHandle || "");
      setLiFollowers(profile.linkedinFollowers || 0);
      setYtHandle(profile.youtubeHandle || "");
      setYtFollowers(profile.youtubeFollowers || 0);
      setQuoraHandle(profile.quoraHandle || "");
      setQuoraFollowers(profile.quoraFollowers || 0);
      setTwHandle(profile.twitterHandle || "");
      setTwFollowers(profile.twitterFollowers || 0);
      setCustomSocialFeeds(Array.isArray(profile.customSocialFeeds) ? profile.customSocialFeeds : []);
    }
  }, [profile]);

  useEffect(() => {
    if (pricingTiers && pricingTiers.length) {
      setTiers(
        pricingTiers.map((t) => ({
          id: t._id,
          name: t.name,
          price: t.price,
          sortOrder: t.sortOrder,
        })),
      );
    } else if (pricingTiers && pricingTiers.length === 0) {
      setTiers([
        { name: "Story", price: 0, sortOrder: 0 },
        { name: "Post", price: 0, sortOrder: 1 },
        { name: "Reel", price: 0, sortOrder: 2 },
      ]);
    }
  }, [pricingTiers]);

  const getMissingProfileDetails = () => {
    const missing = [];
    if (!fullName.trim()) missing.push("name");
    if (!phone.trim()) missing.push("phone number");
    if (!handle.trim()) missing.push("social handle / username");
    if (!bio.trim()) missing.push("bio");
    return missing;
  };

  const saveProfileDetails = async () => {
    if (!profile || !hasValidMongoProfileId) return;

    const missing = getMissingProfileDetails();
    if (!category.trim()) missing.push("category");
    if (!location.trim()) missing.push("location");
    if (!Number(startingPrice) && !isBarterAllowed) missing.push("starting price or barter option");
    if (missing.length) {
      toast.error(`Please complete your ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        id: mongoProfileId,
        fullName: fullName.trim(),
        handle: `@${handle.trim().replace(/^@+/, "")}`,
        gender: gender,
        phone: phone.trim(),
        bio: bio.trim(),
        category: category,
        location: location,
        startingPrice: startingPrice || 0,
        isBarterAllowed: isBarterAllowed,
      });
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Profile details saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save profile details");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    const missing = getMissingProfileDetails();
    if (missing.length) {
      toast.error(`Please complete your ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        id: mongoProfileId,
        fullName: fullName,
        handle: handle ? `@${handle.replace("@", "")}` : "",
        phone: phone,
        category: category,
        location: location,
        bio: bio,
        startingPrice,
      });
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Profile saved successfully!");
      if (!profile?.verificationStatus || profile.verificationStatus === "unverified" || profile.verificationStatus === "rejected") {
        setShowPostSaveDialog(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const saveSocialPresence = async (updatedFeeds = null) => {
    if (!profile) return;
    const feedsToSave = updatedFeeds !== null ? updatedFeeds : customSocialFeeds;
    try {
      const res = await updateProfile({
        id: mongoProfileId,
        instagramHandle: instaHandle,
        instagramFollowers: instaFollowers,
        facebookHandle: fbHandle,
        facebookFollowers: fbFollowers,
        linkedinHandle: liHandle,
        linkedinFollowers: liFollowers,
        youtubeHandle: ytHandle,
        youtubeFollowers: ytFollowers,
        quoraHandle: quoraHandle,
        quoraFollowers: quoraFollowers,
        twitterHandle: twHandle,
        twitterFollowers: twFollowers,
        customSocialFeeds: feedsToSave,
      });
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Social presence and live feeds saved!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save social presence");
    }
  };

  const handleAutoExtractPostMetadata = async (urlToFetch) => {
    const targetUrl = (urlToFetch || newSocialFeedForm.postUrl || "").trim();
    if (!targetUrl) return;

    setIsFetchingPostMetadata(true);
    const toastId = toast.loading("Fetching reel thumbnail, caption & live metrics...");
    try {
      const res = await apiPost("/social/extract-metadata", {
        url: targetUrl,
        platform: newSocialFeedForm.platform || "instagram",
      });

      // apiPost returns res.data or res.data?.data
      const meta = res?.data || res;
      if (meta && (meta.thumbnail || meta.caption || meta.likes || meta.postUrl)) {
        setNewSocialFeedForm((prev) => ({
          ...prev,
          platform: meta.platform || prev.platform,
          type: meta.type || prev.type,
          postUrl: meta.postUrl || targetUrl,
          thumbnail: meta.thumbnail || prev.thumbnail,
          caption: meta.caption || prev.caption,
          badge: meta.badge || prev.badge,
          likes: meta.likes || prev.likes,
          comments: meta.comments || prev.comments,
          views: meta.views || prev.views,
        }));
        toast.success("✓ Thumbnail & metrics extracted directly from Reel link!", { id: toastId });
      } else {
        toast.info("Link formatted. You can customize details below.", { id: toastId });
      }
    } catch (err) {
      console.warn("Auto metadata extraction fallback:", err);
      toast.info("Auto-populated default reel metadata. You can save or customize.", { id: toastId });
    } finally {
      setIsFetchingPostMetadata(false);
    }
  };

  const handleAddCustomSocialFeed = async (e) => {
    e?.preventDefault();
    if (!newSocialFeedForm.postUrl?.trim()) {
      toast.error("Please enter a valid post or reel URL.");
      return;
    }

    // Auto generate high-quality placeholder thumbnail if none provided
    const fallbackThumbnails = {
      reel: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
      post: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
      short: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      video: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80",
    };

    const newFeedItem = {
      platform: newSocialFeedForm.platform || "instagram",
      type: newSocialFeedForm.type || "reel",
      postUrl: newSocialFeedForm.postUrl.trim(),
      thumbnail: newSocialFeedForm.thumbnail?.trim() || fallbackThumbnails[newSocialFeedForm.type] || fallbackThumbnails.reel,
      caption: newSocialFeedForm.caption?.trim() || "Featured Content ✨",
      badge: newSocialFeedForm.badge?.trim() || (newSocialFeedForm.type === "reel" ? "Viral Reel" : "Top Post"),
      likes: newSocialFeedForm.likes?.trim() || "24.5K",
      comments: newSocialFeedForm.comments?.trim() || "520",
      views: newSocialFeedForm.views?.trim() || "110K",
      createdAt: new Date(),
    };

    const nextFeeds = [newFeedItem, ...customSocialFeeds];
    setCustomSocialFeeds(nextFeeds);
    setShowAddSocialFeedModal(false);
    setNewSocialFeedForm({
      platform: "instagram",
      type: "reel",
      postUrl: "",
      thumbnail: "",
      caption: "",
      badge: "Viral Reel",
      likes: "25K",
      comments: "450",
      views: "120K",
    });

    await saveSocialPresence(nextFeeds);
    toast.success("Live reel/post added and synced with your Media Kit!");
  };

  const handleRemoveCustomSocialFeed = async (indexToRemove) => {
    const nextFeeds = customSocialFeeds.filter((_, idx) => idx !== indexToRemove);
    setCustomSocialFeeds(nextFeeds);
    await saveSocialPresence(nextFeeds);
    toast.success("Removed post from Media Kit live showcase.");
  };


  const savePricing = async () => {
    if (!profile) return;
    try {
      await upsertPricing({
        profileId: mongoProfileId,
        tiers: tiers.map((t, idx) => ({
          id: t.id,
          name: t.name,
          price: t.price,
          sortOrder: idx,
        })),
      });
      toast.success("Pricing updated");
    } catch (err) {
      const e = err ;
      toast.error(e.message);
    }
  };

  const removeTier = async (idx) => {
    const t = tiers[idx];
    if (t.id) {
      try {
        await removeTierMutation({ id: t.id });
      } catch (err) {
        const e = err ;
        toast.error(e.message);
        return;
      }
    }
    setTiers(tiers.filter((_, i) => i !== idx));
  };

  const onPortfolioUpload = async (e) => {
    if (!profile || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    setUploadingPortfolio(true);
    try {
      for (const file of files) {
        await addPortfolioImage({
          profileId: mongoProfileId,
          imageFile: file,
          sortOrder: portfolioImages?.length || 0,
        });
      }
      setPortfolioRefreshKey((current) => current + 1);
      toast.success(files.length > 1 ? `${files.length} images uploaded to portfolio!` : "Portfolio image uploaded!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload portfolio image");
    } finally {
      setUploadingPortfolio(false);
      e.target.value = "";
    }
  };

  const handleCreateInstagramPortfolioItem = async () => {
    if (!profile || !newPortfolioForm.file) {
      toast.error("Please choose an image or video file to publish.");
      return;
    }
    setUploadingPortfolioItem(true);
    try {
      await addPortfolioImage({
        profileId: mongoProfileId,
        imageFile: newPortfolioForm.file,
        sortOrder: portfolioImages?.length || 0,
        metadata: {
          type: newPortfolioForm.type,
          caption: newPortfolioForm.caption,
          brandTag: newPortfolioForm.brandTag,
          likesCount: Number(newPortfolioForm.likesCount) || 0,
          viewsCount: Number(newPortfolioForm.viewsCount) || 0,
          mediaType: newPortfolioForm.file?.type?.startsWith("video/") ? "video" : "image",
          aspectRatio: newPortfolioForm.type === "reel" || newPortfolioForm.type === "story" ? "9:16" : "1:1",
        },
      });

      setPortfolioRefreshKey((c) => c + 1);
      toast.success(`Published ${newPortfolioForm.type.toUpperCase()} to your portfolio!`);
      setShowAddPortfolioModal(false);
      setNewPortfolioForm({
        type: "post",
        file: null,
        filePreview: null,
        caption: "",
        brandTag: "",
        likesCount: 120,
        viewsCount: 1500,
      });
    } catch (err) {
      console.error("Create portfolio item error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to publish portfolio item");
    } finally {
      setUploadingPortfolioItem(false);
    }
  };

  const handleTogglePortfolioLike = async (post) => {
    if (!post?._id) return;
    try {
      const res = await togglePortfolioLike(post._id);
      const isLiked = res?.data?.isLiked;
      const likesCount = res?.data?.likesCount;

      // Update in active modal if open
      if (selectedPortfolioPost?._id === post._id) {
        setSelectedPortfolioPost((prev) => ({
          ...prev,
          likesCount,
          isLiked,
        }));
      }
      setPortfolioRefreshKey((c) => c + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPortfolioComment = async () => {
    if (!selectedPortfolioPost?._id || !portfolioCommentText.trim()) return;
    setSubmittingPortfolioComment(true);
    try {
      const res = await addPortfolioComment(selectedPortfolioPost._id, {
        text: portfolioCommentText.trim(),
        userName: displayName || profile?.fullName || "Creator",
        userAvatar: resolveImageUrl(profile?.avatarUrl) || "",
      });

      const updatedComments = res?.data || [];
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: Array.isArray(updatedComments) ? updatedComments : [...(prev.comments || []), {
          userName: displayName || "Creator",
          text: portfolioCommentText.trim(),
          createdAt: new Date(),
        }],
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
      setPortfolioCommentText("");
      setPortfolioRefreshKey((c) => c + 1);
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
      const res = await apiDelete(`/portfolio/${selectedPortfolioPost._id}/comments/${commentId}`);
      const updatedComments = res?.data || (selectedPortfolioPost.comments || []).filter(c => (c._id || c.id) !== commentId);
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: updatedComments,
        commentsCount: Math.max(0, (prev.commentsCount || 1) - 1),
      }));
      setPortfolioRefreshKey((c) => c + 1);
      toast.success("Comment deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    }
  };

  const handleSharePortfolioItem = (post) => {
    const url = `${window.location.origin}/creator/${mongoProfileId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Portfolio link copied to clipboard!");
    } else {
      toast.info(`Link: ${url}`);
    }
  };

  const handleRemovePortfolioImage = async (idxOrId) => {
    try {
      const targetImage = Array.isArray(portfolioImages) ? portfolioImages[idxOrId] || portfolioImages.find(img => img._id === idxOrId) : null;
      const idToDelete = targetImage?._id || idxOrId;
      await removePortfolioImage({ id: idToDelete });
      if (selectedPortfolioPost?._id === idToDelete) {
        setSelectedPortfolioPost(null);
      }
      setPortfolioRefreshKey((current) => current + 1);
      toast.success("Portfolio item removed");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove item");
    }
  };

  const onUpload = async (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      await addPortfolioImage({
        profileId: mongoProfileId,
        imageFile: file,
        sortOrder: portfolioImages?.length || 0,
      });

      setPortfolioRefreshKey((current) => current + 1);
      toast.success("Image uploaded");
    } catch (err) {
      const e = err ;
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onAvatarUpload = async (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await apiPost(`/profiles/${mongoProfileId}/avatar`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = res?.data || res?.profile || res;
      if (updatedProfile && updateLocalProfile) {
        updateLocalProfile(updatedProfile);
      }
      toast.success("Profile photo updated successfully!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update profile photo");
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const onCoverUpload = async (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];

    const isImageValid = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(true); // removed size restriction to allow auto compression/fixing
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });

    if (!isImageValid) {
      toast.error("Invalid image file.");
      if (coverFileRef.current) coverFileRef.current.value = "";
      return;
    }

    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await apiPost(`/profiles/${mongoProfileId}/cover`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = res?.data || res?.profile || res;
      if (updatedProfile && updateLocalProfile) {
        updateLocalProfile(updatedProfile);
      }
      toast.success("Banner updated successfully!");
    } catch (err) {
      console.error("Cover upload error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update cover banner");
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const onAadharUpload = (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];
    setAadharFile(file);
    setAadharFileName(file.name);
    setAadharStorageId("selected");
    toast.success(`Aadhar Card selected: ${file.name}`);
  };

  const onPanUpload = (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];
    setPanFile(file);
    setPanFileName(file.name);
    setPanStorageId("selected");
    toast.success(`PAN Card selected: ${file.name}`);
  };

  const handleVerificationSubmit = async () => {
    if (!profile || (!aadharFile && !panFile)) {
      toast.error("Please upload at least Aadhar or PAN card.");
      return;
    }
    setSubmittingVerification(true);
    try {
      const form = new FormData();
      if (aadharFile) form.append("aadhar", aadharFile);
      if (panFile) form.append("pan", panFile);

      const res = await apiPost(`/profiles/${mongoProfileId}/kyc-documents`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = res?.data || res?.profile || res;
      if (updatedProfile && updateLocalProfile) {
        updateLocalProfile(updatedProfile);
      }
      toast.success("Documents saved successfully.");
      setAadharFile(null);
      setAadharStorageId("");
      setPanFile(null);
      setPanStorageId("");
    } catch (err) {
      console.error("KYC submit error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save documents");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const submitVerificationRequest = async () => {
    if (!profile || !hasValidMongoProfileId) return;

    const missing = getMissingProfileDetails();
    if (missing.length) {
      toast.error(`Please save your ${missing.join(", ")} before requesting verification.`);
      return;
    }

    const hasVerificationDocument = Boolean(
      profile.aadharUrl || profile.aadharStorageId || profile.panUrl || profile.panStorageId,
    );
    if (!hasVerificationDocument) {
      toast.error("Please save an Aadhaar or PAN document before requesting verification.");
      return;
    }

    try {
      const res = await submitVerification({ profileId: mongoProfileId });
      const updatedProfile = res?.data || res?.profile || res;
      if (updatedProfile && updateLocalProfile) {
        updateLocalProfile(updatedProfile);
      }
      toast.success("Verification request submitted successfully!");
    } catch (err) {
      console.error("Verification submit error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit verification request");
    }
  };


  const removeImage = async (id) => {
    try {
      await removePortfolioImage({ id });
      setPortfolioRefreshKey((current) => current + 1);
      toast.success("Image removed");
    } catch (err) {
      const e = err ;
      toast.error(e.message);
    }
  };

  const handleToggleVisibility = async (reviewId) => {
    if (!profile) return;
    try {
      const res = await toggleVisibility({
        reviewId,
        creatorId: mongoProfileId,
      });
      if (res.visible) {
        toast.success("Review is now visible on your public profile");
      } else {
        toast.info("Review is now hidden from your public profile");
      }
    } catch (err) {
      const e = err ;
      toast.error(e.message || "Failed to update review visibility");
    }
  };

  const displayName =
    fullName?.split(" ")[0] ||
    profile?.fullName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";
  const bannerList = DEFAULT_BANNER_IMAGES || DEFAULT_BANNER_FALLBACKS;
  const defaultBannerIndex = [...(profile?._id || profile?.userId || "creator")]
    .reduce((total, character) => total + character.charCodeAt(0), 0) % bannerList.length;
  const bannerUrl = resolveImageUrl(profile?.coverUrl) || bannerList[defaultBannerIndex];
  const creatorGender = profile?.gender || gender || "male";
  const avatarUrl = resolveImageUrl(profile?.avatarUrl) || getGenderAvatar(profile?.fullName || displayName, creatorGender, "creator");
  const status = profile?.verificationStatus || user?.verificationStatus || "unverified";
  console.log("PROFILE FROM API:", profile);
  console.log("Verification Status:", status);

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Sticky Top Promo Banner */}
      {activeOffer && !dismissedBanner && (
        <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white py-2 px-4 shadow-md sticky top-[64px] z-40">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold animate-pulse">Limited Deal</span>
              <span>🔥 Upgrade Account: Get special discounts on premium packages!</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="link"
                className="text-white hover:text-white/80 p-0 h-auto font-bold underline text-xs"
                onClick={() => {
                  setActiveTab("subscription");
                  trackAnalytics({ offerId: activeOffer._id, type: "click" });
                }}
              >
                Upgrade Now
              </Button>
              <button
                className="hover:opacity-80 p-1"
                onClick={() => setDismissedBanner(true)}
                aria-label="Dismiss banner"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Notification Permission Banner */}
      {showPushBanner && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2.5 px-4 shadow-md sticky top-[64px] z-40">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">🔔 NEW</span>
              <span>Turn on notifications to get instant alerts whenever brands launch new campaigns!</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={enablingPush}
                className="bg-white text-blue-700 hover:bg-slate-100 font-bold text-xs h-7 px-3 rounded-full"
                onClick={handleEnablePush}
              >
                {enablingPush ? "Enabling..." : "Enable Notifications"}
              </Button>
              <button
                className="hover:opacity-80 p-1"
                onClick={() => setShowPushBanner(false)}
                aria-label="Dismiss banner"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COVER BANNER PREVIEW & PROFILE HEADER (Visible ONLY on Overview Dashboard) */}
      {activeTab === "dashboard" ? (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <section className="relative group h-44 sm:h-56 md:h-64 overflow-hidden bg-muted w-full rounded-b-2xl sm:rounded-b-3xl rounded-t-none shadow-sm border border-border/50">
          <img
            src={bannerUrl}
            alt="Creator profile banner"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
          />

          {/* Sleek Minimalist Banner Action Button (Bottom Right) */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => coverFileRef.current?.click()}
              className="rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 text-xs font-semibold h-8 px-3.5 shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Edit Cover</span>
            </Button>
            {profile?.coverUrl && (
              <button
                type="button"
                onClick={() => setMediaPreviewModal({ type: "cover", url: bannerUrl, title: "Profile Banner" })}
                className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-lg"
                title="View Full Banner"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            {profile?.coverUrl && (
              <button
                type="button"
                onClick={handleDeleteCover}
                className="h-8 w-8 rounded-full bg-red-600/70 hover:bg-red-600 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-lg"
                title="Reset Banner to Default"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-5 -mt-16 sm:-mt-20 z-10 min-w-0">
            {/* AVATAR WITH INSTA-STYLE HOVER/CLICK ACTIONS */}
            <div className="relative group shrink-0">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-4 border-card bg-muted object-cover shadow-elevated"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getGenderAvatar(profile?.fullName || displayName, creatorGender, "creator");
                }}
              />
              
              {/* Quick Hover Menu Trigger Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-[2px] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setMediaPreviewModal({ type: "avatar", url: avatarUrl, title: `${displayName}'s Profile Picture` })}
                  className="hover:scale-110 transition-transform p-1 text-white hover:text-amber-300"
                  title="View full profile photo"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="hover:scale-110 transition-transform p-1 text-white hover:text-blue-300"
                    title="Upload custom photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAvatarPickerOpen(true)}
                    className="hover:scale-110 transition-transform p-1 text-white hover:text-pink-300"
                    title="Choose from Avatar Library"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  {profile?.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      className="hover:scale-110 transition-transform p-1 text-white hover:text-rose-400"
                      title="Reset profile picture to default"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-12 sm:pt-14 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Creator dashboard
              </p>
              <h1 className="font-display text-2xl font-bold sm:text-3xl lg:text-4xl flex items-center gap-2 truncate">
                {displayName}
                {status === "verified" && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 shadow-xs" title="Verified Creator">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Action Buttons Row - Shifted Inward & Protected from Clipping */}
          <div className="flex items-center flex-nowrap gap-2 py-1 shrink-0 overflow-x-auto no-scrollbar max-w-full lg:max-w-none pr-1">
            {profile?.handle && (
              <Link to={`/c/${profile.handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full text-xs font-bold px-3.5 flex items-center gap-1.5 gradient-sunset text-white shadow-glow hover:opacity-90 cursor-pointer border-0 shrink-0 whitespace-nowrap h-9"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Media Kit
                </Button>
              </Link>
            )}
            {/* COMBINED FOLLOWERS & FOLLOWING IN ONE UNIFIED PILL */}
            <div className="inline-flex items-center rounded-full border border-border/80 bg-card text-xs font-semibold overflow-hidden shadow-xs shrink-0 whitespace-nowrap h-9">
              <button
                type="button"
                onClick={() => openFollowModal("followers")}
                className="px-3 py-1.5 flex items-center gap-1.5 hover:bg-secondary transition-colors cursor-pointer whitespace-nowrap"
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold text-foreground">{followCounts.followers}</span>
                <span className="text-muted-foreground">Followers</span>
              </button>
              <span className="h-3.5 w-[1px] bg-border/80"></span>
              <button
                type="button"
                onClick={() => openFollowModal("following")}
                className="px-3 py-1.5 flex items-center gap-1.5 hover:bg-secondary transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="font-bold text-foreground">{followCounts.following}</span>
                <span className="text-muted-foreground">Following</span>
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const handleClean = profile?.handle?.replace("@", "") || profile?._id;
                const url = `${window.location.origin}/c/${handleClean}`;
                navigator.clipboard.writeText(url);
                toast.success("Media Kit shareable link copied to clipboard!");
              }}
              className="rounded-full text-xs font-semibold px-3.5 flex items-center gap-1.5 border-border/80 hover:bg-secondary cursor-pointer shrink-0 whitespace-nowrap h-9"
            >
              <Share2 className="h-3.5 w-3.5 text-primary" /> Share Media Kit
            </Button>

            {(() => {
              if (status === "pending") {
                return (
                  <Button disabled className="rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 px-6 font-semibold opacity-70 cursor-not-allowed">
                    Verification Pending
                  </Button>
                );
              }
              if (status === "rejected") {
                return (
                  <Button
                    onClick={submitVerificationRequest}
                    className="rounded-full bg-red-600 hover:bg-red-700 text-white px-6 font-semibold shadow-sm"
                  >
                    Verification Failed (Try Again)
                  </Button>
                );
              }
              if (status !== "verified") {
                return (
                  <Button
                    onClick={submitVerificationRequest}
                    className="rounded-full gradient-sunset text-white px-6 font-semibold shadow-glow border-0"
                  >
                    Get Verified
                  </Button>
                );
              }
              return null;
            })()}
          </div>

  <Dialog open={showPostSaveDialog} onOpenChange={setShowPostSaveDialog}>
    <DialogContent className="sm:max-w-md rounded-3xl">
      <DialogHeader>
        <DialogTitle className="font-display text-xl font-bold">Request Verification?</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Your profile changes have been saved successfully. Would you like to submit a request for verification now?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex sm:justify-end gap-2 mt-4">
        <Button
          variant="outline"
          onClick={() => {
            setShowPostSaveDialog(false);
          }}
          className="rounded-full"
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            setShowPostSaveDialog(false);
            await submitVerificationRequest();
          }}
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-glow px-5"
        >
          Get Verified
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>

        {/* COMPACT REAL-TIME PERFORMANCE & AUDIENCE STRIP */}
        <div className="mt-6 p-4 sm:p-5 rounded-3xl bg-card/60 backdrop-blur-md border border-border/70 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
            
            {/* Metric 1: Total Reach / Audience */}
            <div className="flex items-center gap-3.5 pr-2 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-black font-outfit text-foreground leading-tight">
                  {creatorTotalFollowers > 0
                    ? creatorTotalFollowers >= 1000
                      ? `${(creatorTotalFollowers / 1000).toFixed(1).replace(/\.0$/, "")}K`
                      : creatorTotalFollowers
                    : profile?.instagramFollowers ? `${profile.instagramFollowers}` : "Audited"}
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <span>Social Reach</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                </div>
              </div>
            </div>

            {/* Metric 2: Profile Views & Discovery */}
            <div className="flex items-center gap-3.5 sm:px-4 pr-2 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-black font-outfit text-foreground leading-tight">
                  {Number(profile?.profileViews || 0) > 0
                    ? Number(profile?.profileViews).toLocaleString()
                    : "184"}
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Profile Views
                </div>
              </div>
            </div>

            {/* Metric 3: Media Kit Inquiries & Clicks */}
            <div className="flex items-center gap-3.5 sm:px-4 pr-2 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-black font-outfit text-foreground leading-tight">
                  {Number(profile?.clicks || 0) > 0
                    ? Number(profile?.clicks).toLocaleString()
                    : "42"}
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Link Clicks
                </div>
              </div>
            </div>

            {/* Metric 4: Direct Brand Bookings & Collabs */}
            <div className="flex items-center gap-3.5 sm:pl-4 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-black font-outfit text-emerald-500 leading-tight">
                  {Number(profile?.bookings || 0) > 0
                    ? Number(profile?.bookings).toLocaleString()
                    : (myRequests?.filter(r => r.status === "accepted")?.length || "0")} Deals
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Collabs
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      </>
    ) : (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <button
            onClick={() => setActiveTab("dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer group"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Dashboard
          </button>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-4 font-jakarta">
          <div className="w-full">
            {activeTab === "dashboard" ? (
              <div className="w-full space-y-8">
                <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                  <h2 className="font-outfit text-xl font-bold">Edit Profile</h2>
                  <div className="mt-5">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <img src={
                          resolveImageUrl(profile?.avatarUrl) ||
                          profile?.avatar ||
                          getGenderAvatar(profile?.fullName || displayName, creatorGender, "creator")
                        }
                        alt=""
                        className="h-20 w-20 rounded-full border border-border object-cover bg-muted"
                       onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(profile?.fullName || displayName, creatorGender, "creator"); }} />
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          {uploadingAvatar ? "Uploading..." : "Upload profile photo"}
                          <input
                            ref={avatarFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onAvatarUpload}
                            disabled={uploadingAvatar}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsAvatarPickerOpen(true)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:border-pink-500/40 hover:text-pink-500 hover:bg-secondary transition-colors"
                        >
                          <Sparkles className="h-4 w-4 text-pink-500" />
                          Choose Avatar Persona
                        </button>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          {uploadingCover ? "Uploading..." : "Upload banner"}
                          <input
                            ref={coverFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onCoverUpload}
                            disabled={uploadingCover}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Display name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Handle</Label>
                      <Input
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="@yourname"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1.5">
                        {[
                          { value: "male", label: "Male" },
                          { value: "female", label: "Female" },
                          { value: "other", label: "Other" },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setGender(item.value)}
                            className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              gender === item.value
                                ? "border-pink-500 bg-pink-500/10 text-pink-500 ring-1 ring-pink-500 font-bold"
                                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Category</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            className="flex min-h-[2.5rem] w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-left mt-1.5 cursor-pointer"
                          >
                            <div className="flex flex-wrap gap-1">
                              {selectedCategories.length === 0 ? (
                                <span className="text-muted-foreground">
                                  Select categories...
                                </span>
                              ) : (
                                selectedCategories.map((cat) => (
                                  <Badge
                                    key={cat}
                                    variant="secondary"
                                    className="rounded-sm px-1.5 py-0.5 font-normal text-xs flex items-center gap-1"
                                  >
                                    {cat}
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className="rounded-full outline-none hover:bg-muted p-0.5 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectCategory(cat);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.stopPropagation();
                                          handleSelectCategory(cat);
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </span>
                                  </Badge>
                                ))
                              )}
                            </div>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          align="start"
                        >
                          <Command className="w-full">
                            <CommandInput
                              placeholder="Search categories..."
                              className="h-9"
                            />
                            <CommandList>
                              <CommandEmpty>No category found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {CATEGORY_OPTIONS.map((cat) => {
                                  const isSelected =
                                    selectedCategories.includes(cat);
                                  return (
                                    <CommandItem
                                      key={cat}
                                      value={cat}
                                      onSelect={() => handleSelectCategory(cat)}
                                      className="cursor-pointer"
                                    >
                                      <div
                                        className={cn(
                                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                          isSelected
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible",
                                        )}
                                      >
                                        <Check className="h-4 w-4" />
                                      </div>
                                      <span>{cat}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Location</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            className="flex min-h-[2.5rem] w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-left mt-1.5 cursor-pointer"
                          >
                            <div className="flex flex-wrap gap-1">
                              {selectedLocations.length === 0 ? (
                                <span className="text-muted-foreground">
                                  Select locations...
                                </span>
                              ) : (
                                selectedLocations.map((loc) => (
                                  <Badge
                                    key={loc}
                                    variant="secondary"
                                    className="rounded-sm px-1.5 py-0.5 font-normal text-xs flex items-center gap-1"
                                  >
                                    {loc}
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className="rounded-full outline-none hover:bg-muted p-0.5 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectLocation(loc);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.stopPropagation();
                                          handleSelectLocation(loc);
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </span>
                                  </Badge>
                                ))
                              )}
                            </div>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          align="start"
                        >
                          <Command className="w-full">
                            <CommandInput
                              placeholder="Search locations..."
                              className="h-9"
                            />
                            <CommandList>
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {LOCATION_OPTIONS.map((loc) => {
                                  const isSelected =
                                    selectedLocations.includes(loc);
                                  return (
                                    <CommandItem
                                      key={loc}
                                      value={loc}
                                      onSelect={() => handleSelectLocation(loc)}
                                      className="cursor-pointer"
                                    >
                                      <div
                                        className={cn(
                                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                          isSelected
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible",
                                        )}
                                      >
                                        <Check className="h-4 w-4" />
                                      </div>
                                      <span>{loc}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Phone number</Label>
                      <Input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1.5"
                        placeholder="e.g. +91 9876543210"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Starting price (₹)</Label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-pink-500 select-none">
                          <input
                            type="checkbox"
                            checked={isBarterAllowed}
                            onChange={(e) => setIsBarterAllowed(e.target.checked)}
                            className="rounded border-border text-pink-500 accent-pink-500 focus:ring-pink-500 h-3.5 w-3.5"
                          />
                          <span>Barter Allowed</span>
                        </label>
                      </div>
                      <Input
                        type="text"
                        value={startingPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setStartingPrice(val === "" ? "" : Number(val));
                        }}
                        placeholder={isBarterAllowed ? "0 (Barter accepted)" : "e.g. 5000"}
                        className="mt-1.5"
                      />
                      {isBarterAllowed && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1">
                          ✓ Open to product perks, gifting, or service exchange (Barter deals).
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="mt-1.5"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={saveProfileDetails}
                      disabled={saving}
                      className="rounded-full gradient-sunset border-0 text-white shadow-glow"
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>

                  <div className="mt-8 rounded-2xl border border-border/70 overflow-hidden bg-card/60 transition-all">
                    <button
                      type="button"
                      onClick={() => setOpenKycSection(!openKycSection)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors"
                    >
                      <div>
                        <h3 className="font-display text-base font-bold flex items-center gap-2">
                          KYC Documents
                          {(profile?.aadharUrl || profile?.panUrl) && (
                            <Badge variant="secondary" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20">
                              Uploaded ✓
                            </Badge>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click to {openKycSection ? "collapse" : "view and upload Aadhaar or PAN card"}
                        </p>
                      </div>
                      <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", openKycSection && "rotate-90 text-pink-500")} />
                    </button>

                    {openKycSection && (
                      <div className="p-4 pt-0 border-t border-border/40 mt-3">
                        <p className="mb-4 text-xs text-muted-foreground">
                          Upload and save your Aadhaar card, PAN card, or both. At least one document is required for verification.
                        </p>
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 bg-muted/10 p-4 rounded-2xl border border-border">
                          {/* Aadhar Upload */}
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Aadhar Card (PDF, JPG, PNG)</Label>
                            <div className="flex items-center gap-3">
                              <label className="flex-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-secondary/40 px-4 py-4 text-sm font-medium transition-colors">
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground truncate">
                                  {aadharFileName || (profile?.aadharUrl ? "Aadhar Uploaded ✓" : "Upload Aadhar")}
                                </span>
                                <input type="file" className="hidden" accept=".pdf,image/*" onChange={onAadharUpload} />
                              </label>
                              {(profile?.aadharUrl || aadharFile) && (
                                <Button type="button" variant="outline" size="icon" className="shrink-0 h-12 w-12 rounded-xl"
                                  onClick={() => profile?.aadharUrl ? window.open(resolveImageUrl(profile.aadharUrl), "_blank") : toast.info("File selected but not yet uploaded")}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* PAN Upload */}
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">PAN Card (PDF, JPG, PNG)</Label>
                            <div className="flex items-center gap-3">
                              <label className="flex-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-secondary/40 px-4 py-4 text-sm font-medium transition-colors">
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground truncate">
                                  {panFileName || (profile?.panUrl ? "PAN Uploaded ✓" : "Upload PAN")}
                                </span>
                                <input type="file" className="hidden" accept=".pdf,image/*" onChange={onPanUpload} />
                              </label>
                              {(profile?.panUrl || panFile) && (
                                <Button type="button" variant="outline" size="icon" className="shrink-0 h-12 w-12 rounded-xl"
                                  onClick={() => profile?.panUrl ? window.open(resolveImageUrl(profile.panUrl), "_blank") : toast.info("File selected but not yet uploaded")}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="md:col-span-2 flex justify-end">
                            <Button onClick={handleVerificationSubmit} disabled={submittingVerification || (!aadharFile && !panFile)} className="rounded-full bg-primary text-primary-foreground px-6 font-semibold">
                              {submittingVerification ? "Uploading..." : "Save Documents"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. SOCIAL PRESENCE ACCORDION */}
                  <div className="rounded-3xl border border-border/80 overflow-hidden bg-card/70 backdrop-blur-md shadow-sm transition-all mb-5 hover:border-pink-500/30 mt-6">
                    <button
                      type="button"
                      onClick={() => setOpenSocialSection(!openSocialSection)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display text-base font-bold text-foreground">
                              Social Presence & Handles
                            </h3>
                            {connections && connections.some((c) => c.verified) && (
                              <Badge variant="secondary" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2">
                                Verified ✓
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-pink-500/10 text-pink-500 border border-pink-500/20 rounded-full px-2">
                              {[instaHandle, ytHandle, liHandle, fbHandle, xHandle, snapHandle, pinHandle, quoraHandle].filter(Boolean).length}/8 Connected
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Connect and verify your Instagram, YouTube, LinkedIn, Facebook, X, Snapchat, and Quora
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-pink-500 hidden sm:inline-block">
                          {openSocialSection ? "Collapse" : "Manage"}
                        </span>
                        <div className="h-8 w-8 rounded-full bg-secondary/60 flex items-center justify-center">
                          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", openSocialSection && "rotate-90 text-pink-500")} />
                        </div>
                      </div>
                    </button>

                    {openSocialSection && (
                      <div className="p-5 pt-3 border-t border-border/40 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                          <p className="text-xs text-muted-foreground">
                            Verify your accounts with real-time sync, quick audits, or direct OAuth to attract high-paying brand collaborations.
                          </p>
                          <span className="text-[11px] font-medium text-emerald-500/90 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 self-start sm:self-auto">
                            ✓ Realtime Profile Sync
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            {
                              id: "instagram",
                              name: "Instagram",
                              icon: FaInstagram,
                              gradient: "from-pink-500/15 via-purple-500/10 to-transparent",
                              badgeColor: "text-pink-500 bg-pink-500/10 border-pink-500/20",
                              iconColor: "text-pink-500",
                              handle: instaHandle,
                              setHandle: setInstaHandle,
                              placeholder: "@username",
                              followers: instaFollowers,
                              setFollowers: setInstaFollowers,
                              oauth: true,
                            },
                            {
                              id: "youtube",
                              name: "YouTube",
                              icon: FaYoutube,
                              gradient: "from-red-600/15 via-red-500/10 to-transparent",
                              badgeColor: "text-red-500 bg-red-500/10 border-red-500/20",
                              iconColor: "text-red-500",
                              handle: ytHandle,
                              setHandle: setYtHandle,
                              placeholder: "@channel",
                              followers: ytFollowers,
                              setFollowers: setYtFollowers,
                              oauth: true,
                            },
                            {
                              id: "linkedin",
                              name: "LinkedIn",
                              icon: FaLinkedin,
                              gradient: "from-sky-600/15 via-sky-500/10 to-transparent",
                              badgeColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
                              iconColor: "text-sky-500",
                              handle: liHandle,
                              setHandle: setLiHandle,
                              placeholder: "in/username",
                              followers: liFollowers,
                              setFollowers: setLiFollowers,
                              oauth: false,
                            },
                            {
                              id: "facebook",
                              name: "Facebook",
                              icon: FaFacebook,
                              gradient: "from-blue-600/15 via-blue-500/10 to-transparent",
                              badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
                              iconColor: "text-blue-500",
                              handle: fbHandle,
                              setHandle: setFbHandle,
                              placeholder: "profile/page",
                              followers: fbFollowers,
                              setFollowers: setFbFollowers,
                              oauth: true,
                            },
                            {
                              id: "twitter",
                              name: "X / Twitter",
                              icon: FaTwitter,
                              gradient: "from-slate-400/15 via-slate-500/10 to-transparent",
                              badgeColor: "text-foreground bg-foreground/10 border-foreground/20",
                              iconColor: "text-sky-400",
                              handle: xHandle,
                              setHandle: setXHandle,
                              placeholder: "@username",
                              followers: xFollowers,
                              setFollowers: setXFollowers,
                              oauth: false,
                            },
                            {
                              id: "snapchat",
                              name: "Snapchat",
                              icon: Sparkles,
                              gradient: "from-yellow-500/15 via-amber-500/10 to-transparent",
                              badgeColor: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
                              iconColor: "text-yellow-500",
                              handle: snapHandle,
                              setHandle: setSnapHandle,
                              placeholder: "@snap_handle",
                              followers: snapFollowers,
                              setFollowers: setSnapFollowers,
                              oauth: false,
                            },
                            {
                              id: "pinterest",
                              name: "Pinterest",
                              icon: Sparkles,
                              gradient: "from-rose-500/15 via-red-500/10 to-transparent",
                              badgeColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
                              iconColor: "text-rose-500",
                              handle: pinHandle,
                              setHandle: setPinHandle,
                              placeholder: "pin/username",
                              followers: pinFollowers,
                              setFollowers: setPinFollowers,
                              oauth: false,
                            },
                            {
                              id: "quora",
                              name: "Quora",
                              icon: Sparkles,
                              gradient: "from-rose-700/15 via-red-600/10 to-transparent",
                              badgeColor: "text-rose-600 bg-rose-600/10 border-rose-600/20",
                              iconColor: "text-rose-600",
                              handle: quoraHandle,
                              setHandle: setQuoraHandle,
                              placeholder: "profile/name",
                              followers: quoraFollowers,
                              setFollowers: setQuoraFollowers,
                              oauth: false,
                            },
                          ].map((plat) => {
                            const Icon = plat.icon;
                            const conn = connections?.find((c) => c.platform === plat.id);
                            const isVerified = conn?.verified;
                            const hasData = Boolean((plat.handle && plat.handle.trim()) || Number(plat.followers) > 0);

                            return (
                              <div
                                key={plat.id}
                                className={cn(
                                  "group/card relative rounded-2xl border p-4.5 transition-all duration-300 flex flex-col justify-between overflow-hidden",
                                  "bg-gradient-to-b bg-card/90 hover:-translate-y-0.5 hover:shadow-lg",
                                  hasData ? "border-border/90 shadow-sm" : "border-border/60 opacity-90 hover:opacity-100"
                                )}
                              >
                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", plat.gradient)} />

                                <div className="relative z-10 space-y-3.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <a
                                        href={
                                          plat.handle
                                            ? (plat.id === "linkedin" ? `https://linkedin.com/${plat.handle}` : plat.id === "quora" ? `https://quora.com/profile/${plat.handle}` : `https://${plat.id}.com/${plat.handle.replace('@', '')}`)
                                            : `https://${plat.id}.com`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="h-8 w-8 rounded-xl bg-background/90 border border-border/80 shadow-xs flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                                      >
                                        <Icon className={cn("h-4 w-4", plat.iconColor)} />
                                      </a>
                                      <div className="min-w-0">
                                        <span className="text-sm font-bold text-foreground tracking-tight block truncate">
                                          {plat.name}
                                        </span>
                                      </div>
                                    </div>

                                    {isVerified ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 shrink-0 px-2 py-0.5"
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                        Verified
                                      </Badge>
                                    ) : (
                                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", plat.badgeColor)}>
                                        {hasData ? "Connected" : "Not Set"}
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-2.5">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                        <span>Handle / Username</span>
                                      </Label>
                                      <div className="relative">
                                        <Input
                                          value={plat.handle}
                                          onChange={(e) => plat.setHandle(e.target.value)}
                                          placeholder={plat.placeholder}
                                          className="h-9 text-xs rounded-xl bg-background/70 border-border/80 focus:bg-background focus:border-primary transition-all font-medium"
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                        <span>Followers / Audience</span>
                                        {Number(plat.followers) > 0 && (
                                          <span className="text-primary font-bold lowercase">
                                            {Number(plat.followers).toLocaleString()} fans
                                          </span>
                                        )}
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={plat.followers || ""}
                                        onChange={(e) => plat.setFollowers(Number(e.target.value))}
                                        placeholder="0"
                                        className="h-9 text-xs rounded-xl bg-background/70 border-border/80 focus:bg-background focus:border-primary transition-all font-medium"
                                      />
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-border/40 flex flex-col gap-1.5">
                                    {isVerified ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 text-[11px] h-7.5 rounded-lg border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/15 text-sky-500 gap-1.5 font-semibold transition-all cursor-pointer"
                                          disabled={syncingPlatform === plat.id}
                                          onClick={() => handleLiveReSync(conn?._id, plat.id)}
                                        >
                                          <RotateCw className={cn("h-3 w-3", syncingPlatform === plat.id && "animate-spin")} />
                                          {syncingPlatform === plat.id ? "Syncing..." : "Live Sync"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-[11px] h-7.5 px-2.5 text-red-500/80 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                          onClick={() => handleDisconnect(conn?._id, plat.id)}
                                          title="Disconnect verified account"
                                        >
                                          Disconnect
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <Button
                                          size="sm"
                                          className="flex-1 text-[11px] h-7.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-xs transition-all cursor-pointer"
                                          disabled={syncingPlatform === plat.id}
                                          onClick={() => handleQuickVerify(plat.id, plat.handle, plat.followers)}
                                        >
                                          <ShieldCheck className="h-3.5 w-3.5" />
                                          {syncingPlatform === plat.id ? "Auditing..." : "Quick Verify"}
                                        </Button>
                                        {plat.oauth && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-[11px] h-7.5 px-2.5 border-border hover:border-primary/40 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
                                            onClick={() => handleOAuthConnect(plat.id)}
                                            title="OAuth Login verification"
                                          >
                                            OAuth
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40">
                          <p className="text-xs text-muted-foreground text-center sm:text-left">
                            ✨ Verified stats and updated handles help brands discover and book you directly.
                          </p>
                          <Button
                            type="button"
                            onClick={() => saveSocialPresence()}
                            disabled={saving}
                            className="btn-bouncy rounded-full gradient-sunset border-0 text-white shadow-glow px-6 font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
                          >
                            {saving ? (
                              <span className="flex items-center gap-2">
                                <RotateCw className="h-4 w-4 animate-spin" /> Saving...
                              </span>
                            ) : (
                              "Save Social Presence"
                            )}
                          </Button>
                        </div>

                        {/* Growth trends charts if verified accounts exist */}
                        {connections && connections.some((c) => c.verified) && (
                          <div className="mt-6 border border-border rounded-2xl p-4 bg-muted/5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                  <Activity className="h-4 w-4 text-primary" /> Verified Analytics Trends
                                </h4>
                                <p className="text-[10px] text-muted-foreground">
                                  Audited growth and engagement metrics updated every 12 hours.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedChartPlatform}
                                  onChange={(e) => setSelectedChartPlatform(e.target.value)}
                                  className="bg-background border border-border text-xs rounded-lg px-2.5 py-1 font-medium focus:ring-1 focus:ring-primary outline-none"
                                >
                                  {connections
                                    .filter((c) => c.verified)
                                    .map((c) => (
                                      <option key={c._id} value={c.platform}>
                                        {c.platform.toUpperCase()}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>

                            {chartData.length > 0 ? (
                              <div className="h-48 w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                                    <YAxis stroke="#94a3b8" fontSize={9} />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        borderColor: "hsl(var(--border))",
                                        borderRadius: "12px",
                                      }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="followers"
                                      stroke="#f43f5e"
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill="url(#colorFollowers)"
                                      name="Followers"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="h-32 flex items-center justify-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                                No historical sync metrics logged for this account yet. Sync runs automatically every 12 hours.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* LIVE SOCIAL CONTENT & REELS MANAGER SECTION (FOR MEDIA KIT) */}
                  <div className="mt-6 rounded-2xl border border-pink-500/30 overflow-hidden bg-card/60 transition-all shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpenLiveFeedSection(!openLiveFeedSection)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-transparent"
                    >
                      <div>
                        <h3 className="font-display text-base font-bold flex items-center gap-2">
                          Live Social Feeds & Viral Reels Showcase
                          {customSocialFeeds?.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20">
                              {customSocialFeeds.length} active {customSocialFeeds.length > 1 ? "reels/posts" : "reel/post"}
                            </Badge>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Paste your real Instagram Reels, YouTube Shorts, or Facebook post links to display directly in your live Media Kit side-scroll
                        </p>
                      </div>
                      <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", openLiveFeedSection && "rotate-90 text-primary")} />
                    </button>

                    {openLiveFeedSection && (
                      <div className="p-4 pt-2 border-t border-border/40 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/30 p-3 rounded-2xl border border-border/60">
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">💡 How this works:</span> When you add a reel or post URL, it automatically syncs with your public Media Kit at <strong className="text-primary font-mono">/c/{handle || "username"}</strong> with clickable direct links.
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowAddSocialFeedModal(true)}
                            className="rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-semibold text-xs shadow-sm hover:opacity-95"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Real Reel / Post Link
                          </Button>
                        </div>

                        {customSocialFeeds.length === 0 ? (
                          <div className="text-center py-8 border border-dashed border-border/80 rounded-2xl bg-muted/10 p-6">
                            <div className="mx-auto w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 mb-2">
                              <Film className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold text-sm">No custom reels/posts added yet</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                              Your Media Kit is currently using smart verified template placeholders. Add your own real Instagram/YouTube links to showcase your real engagement.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setShowAddSocialFeedModal(true)}
                              className="mt-3 rounded-full gradient-sunset text-white text-xs"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add My First Reel Link
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                            {customSocialFeeds.map((feed, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-border bg-background p-3 flex flex-col justify-between space-y-2 relative group hover:border-pink-500/40 transition-all shadow-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-14 h-18 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative aspect-[9/12]">
                                    <img
                                      src={feed.thumbnail}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80";
                                      }}
                                    />
                                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/70 text-white uppercase">
                                      {feed.type}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1 text-xs">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                      {feed.badge || "Featured"}
                                    </span>
                                    <p className="font-semibold text-foreground truncate text-xs">
                                      {feed.caption || "Creator deliverable"}
                                    </p>
                                    <a
                                      href={feed.postUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-primary hover:underline flex items-center gap-1 truncate"
                                    >
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                      {feed.postUrl}
                                    </a>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                                    <Heart className="h-3 w-3 fill-rose-500" /> {feed.likes || "10K"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" /> {feed.views || "50K"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomSocialFeed(idx)}
                                    className="text-destructive hover:bg-destructive/10 p-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                    title="Delete feed"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* INSTAGRAM-STYLE PORTFOLIO COLLAPSIBLE SECTION */}
                  <div className="mt-6 rounded-2xl border border-border/70 overflow-hidden bg-card/60 transition-all shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpenPortfolioSection(!openPortfolioSection)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors"
                    >
                      <div>
                        <h3 className="font-display text-base font-bold flex items-center gap-2">
                          Creative Portfolio & Feed
                          {portfolioImages?.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20">
                              {portfolioImages.length} {portfolioImages.length > 1 ? "deliverables" : "deliverable"}
                            </Badge>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Showcase Posts, Reels, and Stories to brands with verified metrics, tags, and likes
                        </p>
                      </div>
                      <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", openPortfolioSection && "rotate-90 text-primary")} />
                    </button>

                    {openPortfolioSection && (
                      <div className="p-4 pt-2 border-t border-border/40">
                        {/* Format Tabs, Layout Switcher & Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/50 text-xs overflow-x-auto">
                            <button
                              type="button"
                              onClick={() => setPortfolioTab("all")}
                              className={cn(
                                "px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer",
                                portfolioTab === "all"
                                  ? "bg-background text-foreground shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              All ({portfolioImages?.length || 0})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPortfolioTab("post")}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer",
                                portfolioTab === "post"
                                  ? "bg-background text-foreground shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Camera className="h-3.5 w-3.5 text-blue-500" /> Posts ({portfolioImages?.filter(i => (i.type || "post") === "post").length || 0})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPortfolioTab("reel")}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer",
                                portfolioTab === "reel"
                                  ? "bg-background text-foreground shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Film className="h-3.5 w-3.5 text-pink-500" /> Reels ({portfolioImages?.filter(i => i.type === "reel").length || 0})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPortfolioTab("story")}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer",
                                portfolioTab === "story"
                                  ? "bg-background text-foreground shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Stories ({portfolioImages?.filter(i => i.type === "story").length || 0})
                            </button>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Horizontal Carousel vs Grid view toggle */}
                            <div className="flex items-center p-1 bg-muted/40 rounded-xl border border-border/50 text-xs">
                              <button
                                type="button"
                                onClick={() => setPortfolioLayout("carousel")}
                                title="Horizontal Scroll Strip View"
                                className={cn(
                                  "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer",
                                  portfolioLayout === "carousel"
                                    ? "bg-background text-foreground shadow-xs font-semibold text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Scroll X</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPortfolioLayout("grid")}
                                title="Compact Grid View"
                                className={cn(
                                  "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer",
                                  portfolioLayout === "grid"
                                    ? "bg-background text-foreground shadow-xs font-semibold text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Grid</span>
                              </button>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setShowAddPortfolioModal(true)}
                              className="rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-semibold text-xs shadow-sm hover:opacity-95 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
                            </Button>
                          </div>
                        </div>

                        {/* Portfolio Feed / Horizontal Scroll View */}
                        {(() => {
                          const filtered = (portfolioImages || []).filter((item) => {
                            if (portfolioTab === "all") return true;
                            const itemType = item.type || "post";
                            return itemType === portfolioTab;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-12 border border-dashed border-border/80 rounded-2xl bg-muted/10 p-6">
                                <div className="mx-auto w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 mb-3">
                                  <Camera className="h-6 w-6" />
                                </div>
                                <h4 className="font-semibold text-sm">No {portfolioTab === "all" ? "deliverables" : portfolioTab + "s"} added yet</h4>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                  Upload your Instagram/YouTube content, reels, stories, or campaign creatives to attract premium brands.
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setShowAddPortfolioModal(true)}
                                  className="mt-4 rounded-full gradient-sunset text-white text-xs cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
                                </Button>
                              </div>
                            );
                          }

                          const renderMediaCard = (item, idx, customWidth = "") => {
                            const imageSrc = resolveImageUrl(item.url || item.imageUrl || item);
                            const isReel = item.type === "reel";
                            const isStory = item.type === "story";
                            const isVideo = item.mediaType === "video" || /\.(mp4|mov|avi|webm)$/i.test(imageSrc || "");
                            const likes = item.likesCount || 0;
                            const comments = item.commentsCount || (item.comments?.length || 0);
                            const views = item.viewsCount || (isReel ? 1200 : 0);

                            return (
                              <div
                                key={item._id || idx}
                                onClick={() => setSelectedPortfolioPost(item)}
                                className={cn(
                                  "group relative aspect-square rounded-2xl overflow-hidden border border-border/80 bg-neutral-900 cursor-pointer shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-pink-500/40 shrink-0",
                                  customWidth || "w-full"
                                )}
                              >
                                {/* Media Thumbnail */}
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
                                    alt={item.caption || "Portfolio item"}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "https://api.dicebear.com/9.x/shapes/svg?seed=Portfolio";
                                    }}
                                  />
                                )}

                                {/* Type Pill Badge (Top Left) */}
                                <div className="absolute top-2 left-2 z-10">
                                  {isReel ? (
                                    <span className="flex items-center gap-1 bg-black/75 backdrop-blur-md text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/30 shadow-xs">
                                      <Film className="h-2.5 w-2.5" /> Reel
                                    </span>
                                  ) : isStory ? (
                                    <span className="flex items-center gap-1 bg-black/75 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 shadow-xs">
                                      <Sparkles className="h-2.5 w-2.5" /> Story
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 bg-black/75 backdrop-blur-md text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 shadow-xs">
                                      <Camera className="h-2.5 w-2.5" /> Post
                                    </span>
                                  )}
                                </div>

                                {/* Brand Tag Badge (Top Right) */}
                                {item.brandTag && (
                                  <div className="absolute top-2 right-2 z-10 max-w-[55%] truncate">
                                    <span className="block truncate bg-black/75 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/20">
                                      {item.brandTag.startsWith("@") ? item.brandTag : `@${item.brandTag}`}
                                    </span>
                                  </div>
                                )}

                                {/* Delete Button (Visible on hover) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemovePortfolioImage(item._id || idx);
                                  }}
                                  className="absolute top-2 right-2 z-20 bg-destructive/90 hover:bg-destructive text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                                  title="Delete item"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>

                                {/* Reel Play / Views pill (Bottom Left) */}
                                {isReel && views > 0 && (
                                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
                                    <Play className="h-2.5 w-2.5 fill-white" /> {views.toLocaleString()}
                                  </div>
                                )}

                                {/* Hover Overlay with Likes & Comments */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-white">
                                  {item.caption && (
                                    <p className="text-[11px] font-medium text-white/95 line-clamp-2 mb-2 leading-snug">
                                      {item.caption}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 text-xs font-bold">
                                    <span className="flex items-center gap-1 text-rose-300">
                                      <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> {likes}
                                    </span>
                                    <span className="flex items-center gap-1 text-white/90">
                                      <MessageCircle className="h-3.5 w-3.5 fill-white text-white" /> {comments}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          };

                          if (portfolioLayout === "carousel") {
                            return (
                              <div className="relative group/scroll">
                                {/* Scroll container */}
                                <div
                                  id="creator-portfolio-carousel"
                                  className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar snap-x snap-mandatory"
                                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                  {filtered.map((item, idx) => (
                                    <div key={item._id || idx} className="snap-start shrink-0">
                                      {renderMediaCard(item, idx, "w-48 sm:w-52 md:w-56")}
                                    </div>
                                  ))}
                                </div>

                                {/* Left Scroll Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const container = document.getElementById("creator-portfolio-carousel");
                                    if (container) container.scrollBy({ left: -320, behavior: "smooth" });
                                  }}
                                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-background/90 hover:bg-background border border-border/80 shadow-lg flex items-center justify-center text-foreground opacity-0 group-hover/scroll:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                                  title="Scroll left"
                                >
                                  <ChevronLeft className="h-5 w-5" />
                                </button>

                                {/* Right Scroll Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const container = document.getElementById("creator-portfolio-carousel");
                                    if (container) container.scrollBy({ left: 320, behavior: "smooth" });
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-background/90 hover:bg-background border border-border/80 shadow-lg flex items-center justify-center text-foreground opacity-0 group-hover/scroll:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                                  title="Scroll right"
                                >
                                  <ChevronRight className="h-5 w-5" />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="max-h-[520px] overflow-y-auto pr-1">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                                {filtered.map((item, idx) => renderMediaCard(item, idx, "w-full"))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* PRICING TIERS COLLAPSIBLE SECTION */}
                  <div className="mt-6 rounded-2xl border border-border/70 overflow-hidden bg-card/60 transition-all">
                    <button
                      type="button"
                      onClick={() => setOpenPricingSection(!openPricingSection)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors"
                    >
                      <div>
                        <h3 className="font-display text-base font-bold flex items-center gap-2">
                          Pricing Tiers
                          {tiers?.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              {tiers.length} tier{tiers.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click to {openPricingSection ? "collapse" : "view and customize your pricing packages"}
                        </p>
                      </div>
                      <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", openPricingSection && "rotate-90 text-primary")} />
                    </button>

                    {openPricingSection && (
                      <div className="p-4 pt-2 border-t border-border/40">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs text-muted-foreground">Add and manage different collaboration packages.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs h-8"
                            onClick={() =>
                              setTiers([
                                ...tiers,
                                { name: "New tier", price: 0, sortOrder: tiers.length },
                              ])
                            }
                          >
                            <Plus className="mr-1 h-3 w-3" /> Add
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {tiers.map((t, idx) => (
                            <div key={idx} className="rounded-2xl border border-border p-4 bg-background/50">
                              <div className="flex items-center justify-between gap-2">
                                <Input
                                  value={t.name}
                                  onChange={(e) => {
                                    const next = [...tiers];
                                    next[idx] = { ...t, name: e.target.value };
                                    setTiers(next);
                                  }}
                                  className="h-8 max-w-[60%] font-display font-semibold text-xs"
                                />
                                <span className="font-display font-bold text-sm">
                                  {formatINR(t.price)}
                                </span>
                                <button
                                  onClick={() => removeTier(idx)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <Input
                                type="number"
                                value={t.price}
                                onChange={(e) => {
                                  const next = [...tiers];
                                  next[idx] = { ...t, price: Number(e.target.value) };
                                  setTiers(next);
                                }}
                                className="mt-3 h-8 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={savePricing}
                          variant="secondary"
                          className="btn-bouncy mt-4 w-full rounded-full font-bold text-xs h-9"
                        >
                          Update pricing
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviews Section */}
                <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                  <div className="mb-6">
                    <h2 className="font-outfit text-xl font-bold">
                      Reviews & Feedback
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage reviews displayed on your public profile page.
                    </p>
                  </div>

                  {!reviews ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading reviews...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-border rounded-2xl">
                      <Star className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="font-semibold text-sm text-muted-foreground font-outfit">
                        No reviews received yet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reviews left by brands you collaborate with will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review._id}
                          className="card-3d flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border/60 bg-background/70 rounded-2xl p-4 transition-all hover:border-primary/40"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <img src={
                                  review.brandAvatar ||
                                  `https://api.dicebear.com/9.x/avataaars/svg?seed=${review.brandName}`
                                }
                                alt=""
                                className="h-10 w-10 rounded-full object-cover border border-border/50 shadow-sm aspect-square"
                               onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback"; }} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-outfit text-sm font-bold text-foreground">
                                    {review.brandName}
                                  </h4>
                                  {review.campaignRef && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] rounded-full font-bold"
                                    >
                                      Campaign: {review.campaignRef}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= review.rating
                                            ? "fill-amber text-amber"
                                            : "text-muted-foreground/30"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(review.createdAt).toLocaleDateString(
                                      undefined,
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 text-xs text-foreground/90">
                              {review.comment && (
                                <p className="font-medium text-foreground">
                                  "{review.comment}"
                                </p>
                              )}
                              <p className="text-muted-foreground mt-1">
                                {review.text}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-start">
                            <div className="text-right">
                              <span className="block text-xs font-semibold text-foreground">
                                Public Display
                              </span>
                              <span className="block text-[10px] text-muted-foreground">
                                {review.visible
                                  ? "Shown on public profile"
                                  : "Hidden from public"}
                              </span>
                            </div>
                            <Switch
                              checked={review.visible}
                              onCheckedChange={() => handleToggleVisibility(review._id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === "tasks" ? (
              /* DEALS & TASKS TAB */
              <div className="w-full space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
                  <div>
                    <h2 className="font-display text-xl font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-primary" /> Active Deals & Deliverables
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Track your brand collaboration requests, milestones, deadlines, and submissions in real time.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                      {myTasks?.length || 0} Tasks Assigned
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                      {myRequests?.length || 0} Collaborations
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-12 items-start">
                  {/* ASSIGNED TASKS (Left Column: 5 Cols) */}
                  <div className="lg:col-span-5 rounded-3xl border border-border/70 bg-card/80 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Assigned Tasks
                      </h3>
                      <span className="text-xs text-muted-foreground">({myTasks?.length || 0})</span>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {!myTasks ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">Loading tasks...</p>
                      ) : myTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                          No tasks assigned yet. Apply to campaigns or accept brand offers to get started.
                        </div>
                      ) : (
                        myTasks.map((task) => (
                          <div
                            key={task._id}
                            className="rounded-2xl border border-border/80 p-4 space-y-3 bg-secondary/15 hover:bg-secondary/25 hover:border-primary/40 transition-all duration-200"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-foreground truncate">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  Campaign: {task.campaignId?.title || "Direct Collab"}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                  Brand: {task.brandId?.fullName || "Brand Partner"}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "rounded-full text-[10px] uppercase font-semibold shrink-0",
                                  task.status === "completed" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                  task.status === "in_progress" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                  task.status === "pending" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                                  task.status === "under_review" && "bg-purple-500/10 text-purple-600 border-purple-500/20",
                                  task.status === "overdue" && "bg-red-500/10 text-red-500 border-red-500/20"
                                )}
                              >
                                {task.status?.replace("_", " ") || "Active"}
                              </Badge>
                            </div>

                            <div className="rounded-xl border border-border/50 bg-background/60 p-2.5 text-xs space-y-1">
                              <p className="text-muted-foreground flex items-center justify-between">
                                <span className="font-semibold text-foreground">Deliverable:</span>
                                <span className="font-bold text-primary">{task.deliverableType || "Reel / Post"}</span>
                              </p>
                              {task.dueDate && (
                                <p className="text-muted-foreground flex items-center justify-between">
                                  <span className="font-semibold text-foreground">Due Date:</span>
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </p>
                              )}
                              <p className="text-muted-foreground flex items-center justify-between">
                                <span className="font-semibold text-foreground">Priority:</span>
                                <span className="capitalize font-medium">{task.priority || "Medium"}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-0.5">
                              <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                                <span>Time Left: {getTimeRemaining(task.dueDate)}</span>
                              </div>
                              {task.status === "overdue" && (
                                <Badge variant="destructive" className="text-[9px]">
                                  Overdue
                                </Badge>
                              )}
                            </div>

                            <div className="pt-1 flex gap-2">
                              {task.status !== "completed" && (
                                <Button
                                  size="sm"
                                  className="flex-1 rounded-full gradient-sunset border-0 text-white text-xs font-semibold shadow-glow cursor-pointer"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setTaskProofUrl(task.proofUrl || "");
                                    setTaskNotes(task.creatorNotes || "");
                                    setShowSubmitTaskModal(true);
                                  }}
                                >
                                  Submit Task
                                </Button>
                              )}
                              {task.conversationId && (
                                <Link
                                  to={`/messages?conversationId=${task.conversationId}`}
                                  className="flex-1"
                                >
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full rounded-full border-border hover:bg-secondary text-foreground text-xs font-medium cursor-pointer"
                                  >
                                    Open Chat
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* MY REQUESTS & COLLABORATIONS (Right Column: 7 Cols) */}
                  <div className="lg:col-span-7 rounded-3xl border border-border/70 bg-card/80 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
                        <Clock className="h-4 w-4 text-indigo-500" /> Collaboration Requests & Contracts
                      </h3>
                      <span className="text-xs text-muted-foreground">({myRequests?.length || 0})</span>
                    </div>

                    <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                      {!myRequests ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">Loading requests...</p>
                      ) : myRequests.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                          No active collaboration requests yet.
                        </div>
                      ) : (
                        myRequests.map((req) => (
                          <div
                            key={req._id}
                            className="rounded-2xl border border-border/80 p-4 space-y-3 bg-secondary/15 hover:bg-secondary/25 hover:border-primary/40 transition-all duration-200"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-foreground truncate">
                                  {req.campaign?.title || "Direct Brand Collaboration"}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  Brand Partner: <span className="font-semibold text-foreground">{req.brandProfile?.fullName || "Brand Partner"}</span>
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "rounded-full text-[10px] uppercase font-semibold shrink-0",
                                  req.status === "accepted" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                  req.status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                  req.status === "rejected" && "bg-red-500/10 text-red-500 border-red-500/20"
                                )}
                              >
                                {req.status}
                              </Badge>
                            </div>

                            {req.status === "accepted" && (
                              <div className="rounded-xl border border-border/50 bg-background/50 p-2.5 text-[11px] space-y-2">
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span>Payment Status:</span>
                                  {req.paymentStatus === "PAID" ? (
                                    <span className="font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                                      ✓ Paid to Pravixo (Secured)
                                    </span>
                                  ) : req.collaborationStatus === "AMOUNT_AGREED" ? (
                                    <span className="font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px]">
                                      Awaiting Brand Payment
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-muted-foreground">
                                      Negotiating
                                    </span>
                                  )}
                                </div>
                                {req.collaborationStatus === "AMOUNT_AGREED" && (
                                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-muted-foreground">
                                    <span>Agreed Payout:</span>
                                    <span className="font-bold text-foreground">₹{req.creatorAmount?.toLocaleString()}</span>
                                  </div>
                                )}

                                {req.deliverablesTracking && req.deliverablesTracking.length > 0 && (
                                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[10px] text-foreground uppercase tracking-wider">
                                        Campaign Deliverables
                                      </span>
                                      {req.paymentStatus === "PAID" ? (
                                        (() => {
                                          const totalReq = req.deliverablesTracking.reduce((acc, d) => acc + (d.requiredQuantity || 0), 0);
                                          const totalDone = req.deliverablesTracking.reduce((acc, d) => acc + (d.completedQuantity || 0), 0);
                                          return (
                                            <span className="text-[10px] font-bold text-primary">
                                              {totalDone}/{totalReq} Completed
                                            </span>
                                          );
                                        })()
                                      ) : (
                                        <span className="text-[9px] text-amber-600 font-semibold">
                                          Locked (Payment Pending)
                                        </span>
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      {req.deliverablesTracking.map((deliv, dIdx) => {
                                        const isDelivCompleted = (deliv.completedQuantity || 0) >= deliv.requiredQuantity;
                                        const typeLabels = {
                                          REEL: "Instagram Reel",
                                          POST: "Feed Post",
                                          STORY: "Story",
                                          VIDEO: "YouTube Video",
                                          SHORT: "YouTube Short",
                                        };

                                        return (
                                          <div
                                            key={dIdx}
                                            className={cn(
                                              "flex items-center justify-between px-2 py-1 rounded-lg border text-[10px]",
                                              isDelivCompleted
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                                                : req.paymentStatus === "PAID"
                                                ? "bg-secondary/40 border-border/60 text-foreground"
                                                : "bg-muted/20 border-border/30 opacity-70 text-muted-foreground"
                                            )}
                                          >
                                            <span className="font-medium">
                                              {typeLabels[deliv.type] || deliv.type}
                                            </span>
                                            <span className="font-bold flex items-center gap-1">
                                              {deliv.completedQuantity || 0} / {deliv.requiredQuantity}
                                              {isDelivCompleted && <Check className="h-3 w-3 text-emerald-600" />}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {req.paymentStatus === "PAID" && (
                                      <div className="pt-1 flex flex-col gap-1.5">
                                        {(() => {
                                          const allCompleted =
                                            req.allDeliverablesCompleted ||
                                            req.deliverablesTracking.every(
                                              (d) => (d.completedQuantity || 0) >= (d.requiredQuantity || 1)
                                            );

                                          if (allCompleted) {
                                            const isReleased = req.paymentReleaseStatus === "RELEASED";
                                            const nowTime = Date.now();
                                            const targetEligible = req.paymentReleaseEligibleAt || (req.approvalCompletedAt ? req.approvalCompletedAt + 72 * 60 * 60 * 1000 : null);
                                            const isEligible = targetEligible ? nowTime >= targetEligible : false;
                                            const remainingMs = targetEligible ? Math.max(0, targetEligible - nowTime) : 0;
                                            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
                                            const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

                                            return (
                                              <div className="space-y-1.5">
                                                <div className="text-[10px] text-center font-bold text-emerald-600 bg-emerald-500/15 rounded-xl py-1.5 px-2 border border-emerald-500/30 flex items-center justify-center gap-1.5">
                                                  <CheckCircle2 className="h-3.5 w-3.5" /> Campaign Work: COMPLETED (All Deliverables Approved)
                                                </div>
                                                
                                                <div className="rounded-xl border border-border/60 bg-secondary/20 p-2 text-[10px] space-y-1">
                                                  <div className="flex items-center justify-between font-bold">
                                                    <span className="text-muted-foreground uppercase text-[9px] tracking-wider flex items-center gap-1">
                                                      <Landmark className="h-3 w-3 text-primary" /> Payout Status
                                                    </span>
                                                    {isReleased ? (
                                                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                        ✓ Payout Released
                                                      </span>
                                                    ) : isEligible ? (
                                                      <span className="text-emerald-600 font-bold">
                                                        ✓ Review Completed · Eligible for Release
                                                      </span>
                                                    ) : (
                                                      <span className="text-amber-600 font-bold">
                                                        ⏳ Under Review ({remainingHours}h {remainingMins}m remaining)
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          const hasPendingDeliverables = req.deliverablesTracking.some(
                                            (d) => (d.completedQuantity || 0) < d.requiredQuantity
                                          );
                                          if (hasPendingDeliverables) {
                                            return (
                                              <Button
                                                size="sm"
                                                className="w-full h-8 rounded-full gradient-sunset border-0 text-white text-[10px] font-bold shadow-glow flex items-center justify-center gap-1 cursor-pointer"
                                                onClick={() => {
                                                  setSelectedCollabForSubmission(req);
                                                  const firstIncomplete = req.deliverablesTracking.find(
                                                    (d) => (d.completedQuantity || 0) < d.requiredQuantity
                                                  );
                                                  setSubmissionDeliverableType(firstIncomplete ? firstIncomplete.type : req.deliverablesTracking[0]?.type || "REEL");
                                                  setSubmissionFile(null);
                                                  setSubmissionFilePreview(null);
                                                  setSubmissionCaption("");
                                                }}
                                              >
                                                <Upload className="h-3.5 w-3.5" /> Submit Work
                                              </Button>
                                            );
                                          } else {
                                            return (
                                              <div className="text-[10px] text-center font-bold text-amber-600 bg-amber-500/10 rounded-full py-1 border border-amber-500/20">
                                                ⏳ Submissions Awaiting Brand Review
                                              </div>
                                            );
                                          }
                                        })()}

                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full h-7 rounded-full border-border hover:bg-secondary text-foreground text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                                          onClick={async () => {
                                            setSelectedCollabForHistory(req);
                                            setLoadingCreatorSubmissions(true);
                                            try {
                                              const res = await api.get(`/api/submissions/${req._id}/submissions`);
                                              const data = res.data?.data || res.data;
                                              setCreatorSubmissionsList(data.submissions || []);
                                            } catch (err) {
                                              console.error("Fetch creator submissions error:", err);
                                              toast.error(err?.response?.data?.message || "Failed to load submission history.");
                                            } finally {
                                              setLoadingCreatorSubmissions(false);
                                            }
                                          }}
                                        >
                                          <Eye className="h-3 w-3" /> View Submissions & Feedback
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {req.status === "accepted" && req.conversationId ? (
                              <Link
                                to={`/messages?conversationId=${req.conversationId}`}
                                className="block w-full"
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-8 rounded-full border-border hover:bg-secondary text-foreground text-[10px] font-semibold cursor-pointer"
                                >
                                  Open Chat
                                </Button>
                              </Link>
                            ) : req.status === "pending" ? (
                              <div className="text-[10px] text-center text-amber bg-amber/5 rounded-full py-1 font-semibold border border-amber/10">
                                Waiting for Brand Approval
                              </div>
                            ) : (
                              <div className="text-[10px] text-center text-red-500 bg-red-500/5 rounded-full py-1 font-semibold border border-red-500/10">
                                Request Rejected
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* LIVE BRAND OPPORTUNITIES & INCENTIVES */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <CreatorOffersSidebarWidget audience="creator" />
                </div>
              </div>
            ) : activeTab === "campaigns" ? (
              /* DISCOVER CAMPAIGNS TAB */
              <div className="w-full max-w-5xl mx-auto space-y-8">
                <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                      <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" /> Discover Campaigns
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Explore brand-funded, verified campaigns open for creators.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs self-start sm:self-auto flex items-center gap-1.5"
                      disabled={isRefreshingDiscover}
                      onClick={handleRefreshDiscover}
                    >
                      <RotateCw className={cn("h-3.5 w-3.5", isRefreshingDiscover && "animate-spin")} />
                      Refresh Listings
                    </Button>
                  </div>

                  {!discoverableCampaigns ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Loading available campaigns...
                    </div>
                  ) : discoverableCampaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
                      <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="font-semibold text-sm text-foreground">
                        No active campaigns available right now
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                        New verified brand campaigns will appear here once approved by admin. Check back soon!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {discoverableCampaigns
                          .slice((discoverPage - 1) * CAMPAIGNS_PER_PAGE, discoverPage * CAMPAIGNS_PER_PAGE)
                          .map((camp) => {
                            const hasTiers = Array.isArray(camp.tiers) && camp.tiers.length > 0;
                            const sortedTiers = hasTiers
                              ? [...camp.tiers].sort((a, b) => (Number(a.minFollowers) || 0) - (Number(b.minFollowers) || 0))
                              : [];
                            const minRequiredAcrossTiers = hasTiers ? (sortedTiers[0]?.minFollowers || 0) : 0;
                            const reqFollowers = Number(camp.minFollowers || 0);

                            // Qualification check: either tiered minimum or flat minFollowers
                            const meetsFollowerCriteria = hasTiers
                              ? creatorTotalFollowers >= minRequiredAcrossTiers
                              : (reqFollowers === 0 || creatorTotalFollowers >= reqFollowers);

                            // Find best matched tier if tiered
                            const matchedTier = hasTiers
                              ? [...sortedTiers].reverse().find(t => creatorTotalFollowers >= (Number(t.minFollowers) || 0))
                              : null;

                            const creatorMinBudget = camp.minBudgetPerCreator ?? camp.budget?.min ?? 0;
                            const creatorMaxBudget = camp.maxBudgetPerCreator ?? camp.budget?.max ?? 0;

                            return (
                              <div
                                key={camp._id}
                                className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between hover:border-primary/50 hover:shadow-sm transition-all group relative"
                              >
                                <div className="space-y-3">
                                  {/* Brand Header & Share Action */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <img
                                        src={
                                          camp.brand?.avatarUrl ||
                                          `https://api.dicebear.com/9.x/avataaars/svg?seed=${camp.brand?.fullName || "Brand"}`
                                        }
                                        alt=""
                                        className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback";
                                        }}
                                      />
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-foreground truncate">
                                          {camp.brand?.fullName || "Brand Partner"}
                                        </h4>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                          <span>5.0</span>
                                          <span>•</span>
                                          <span>{camp.location || "Pan India"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                                      title="Share / Refer this Campaign"
                                      onClick={() => handleShareCampaign(camp)}
                                    >
                                      <Share2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  <div>
                                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                      {camp.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {camp.description}
                                    </p>
                                  </div>

                                  {/* Condition-Based Tiers / Options Preview */}
                                  {hasTiers ? (
                                    <div className="space-y-1.5 pt-0.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                          <Sparkles className="h-3 w-3 text-amber-500" /> Perk Options ({sortedTiers.length})
                                        </span>
                                        {matchedTier ? (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                            ✓ You Qualify ({matchedTier.minFollowers >= 1000 ? `${(matchedTier.minFollowers/1000).toFixed(0)}k+` : matchedTier.minFollowers})
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            🔒 Min {minRequiredAcrossTiers >= 1000 ? `${(minRequiredAcrossTiers/1000).toFixed(0)}k+` : minRequiredAcrossTiers}
                                          </span>
                                        )}
                                      </div>
                                      <div className="space-y-1 bg-secondary/15 p-2 rounded-xl border border-border/40">
                                        {sortedTiers.slice(0, 3).map((tier, idx) => {
                                          const isThisTierQualified = creatorTotalFollowers >= (Number(tier.minFollowers) || 0);
                                          const isHighestMatched = matchedTier && matchedTier.minFollowers === tier.minFollowers;
                                          return (
                                            <div
                                              key={idx}
                                              className={cn(
                                                "text-[10px] flex items-center justify-between p-1.5 rounded-lg transition-colors",
                                                isHighestMatched
                                                  ? "bg-primary/10 text-foreground font-semibold border border-primary/20"
                                                  : isThisTierQualified
                                                  ? "bg-secondary/40 text-foreground"
                                                  : "text-muted-foreground opacity-70"
                                              )}
                                            >
                                              <span className="font-bold flex items-center gap-1">
                                                {tier.minFollowers >= 1000 ? `${(tier.minFollowers / 1000).toFixed(0)}k+` : tier.minFollowers}
                                              </span>
                                              <span className="truncate max-w-[140px] text-right">
                                                {tier.reward || ""}{tier.reward && tier.cashAmount ? " + " : ""}{tier.cashAmount ? `₹${tier.cashAmount}` : ""}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : reqFollowers > 0 ? (
                                    /* Single Min Follower Condition */
                                    <div className="pt-0.5">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                                          meetsFollowerCriteria
                                            ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                                            : "text-amber-500 bg-amber-500/10 border-amber-500/30"
                                        )}
                                      >
                                        {meetsFollowerCriteria ? (
                                          <Check className="h-3 w-3" />
                                        ) : (
                                          <Lock className="h-3 w-3" />
                                        )}
                                        {reqFollowers >= 1000
                                          ? `${(reqFollowers / 1000).toFixed(0)}k+`
                                          : reqFollowers.toLocaleString()}{" "}
                                        Followers Required
                                      </span>
                                    </div>
                                  ) : null}

                                  <div className="bg-secondary/20 rounded-xl p-2.5 space-y-1 text-[11px] border border-border/40">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Creator Budget:</span>
                                      <span className="font-bold text-foreground">
                                        ₹{creatorMinBudget.toLocaleString()} - ₹{creatorMaxBudget.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Total Budget:</span>
                                      <span className="font-medium text-muted-foreground">
                                        ₹{Number(camp.totalBudget || 0).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Timeline:</span>
                                      <span className="font-medium text-foreground">
                                        {camp.startDate ? new Date(camp.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Any"} - {camp.endDate ? new Date(camp.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Open"}
                                      </span>
                                    </div>
                                  </div>

                                  {camp.deliverables && typeof camp.deliverables === "object" && (
                                    <div className="flex flex-wrap gap-1">
                                      {Array.isArray(camp.deliverables) ? (
                                        camp.deliverables.map((d, i) => (
                                          <span
                                            key={i}
                                            className="text-[9px] font-semibold bg-secondary/50 text-foreground px-2 py-0.5 rounded-md border border-border/60"
                                          >
                                            {d.quantity}x {d.type}
                                          </span>
                                        ))
                                      ) : (
                                        <>
                                          {camp.deliverables.reels > 0 && <span className="text-[9px] font-semibold bg-secondary/50 text-foreground px-2 py-0.5 rounded-md border border-border/60">{camp.deliverables.reels}x Reel</span>}
                                          {camp.deliverables.posts > 0 && <span className="text-[9px] font-semibold bg-secondary/50 text-foreground px-2 py-0.5 rounded-md border border-border/60">{camp.deliverables.posts}x Post</span>}
                                          {camp.deliverables.stories > 0 && <span className="text-[9px] font-semibold bg-secondary/50 text-foreground px-2 py-0.5 rounded-md border border-border/60">{camp.deliverables.stories}x Story</span>}
                                          {camp.deliverables.videos > 0 && <span className="text-[9px] font-semibold bg-secondary/50 text-foreground px-2 py-0.5 rounded-md border border-border/60">{camp.deliverables.videos}x Video</span>}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="pt-4 mt-3 border-t border-border/40 flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 rounded-full text-xs h-8"
                                    onClick={() => setSelectedCampaignDetail(camp)}
                                  >
                                    View Details
                                  </Button>
                                  {userApprovedCampaignIds.has(String(camp._id)) ? (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="flex-1 rounded-full text-xs h-8 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold"
                                    >
                                      Approved ✓
                                    </Button>
                                  ) : userRequestedCampaignIds.has(String(camp._id)) ? (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="flex-1 rounded-full text-xs h-8 bg-secondary text-muted-foreground font-semibold"
                                    >
                                      Applied ✓
                                    </Button>
                                  ) : !meetsFollowerCriteria ? (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="flex-1 rounded-full text-[11px] h-8 bg-secondary/80 text-muted-foreground cursor-not-allowed border border-border/60 flex items-center justify-center gap-1"
                                      title={hasTiers
                                        ? `Requires at least ${minRequiredAcrossTiers >= 1000 ? `${(minRequiredAcrossTiers / 1000).toFixed(0)}k+` : minRequiredAcrossTiers} followers. Your profile has ${creatorTotalFollowers.toLocaleString()} followers.`
                                        : `Requires ${reqFollowers >= 1000 ? `${(reqFollowers / 1000).toFixed(0)}k+` : reqFollowers} followers. Your profile has ${creatorTotalFollowers.toLocaleString()} followers.`}
                                    >
                                      <Lock className="h-3 w-3 text-muted-foreground/60" />
                                      Apply ({hasTiers ? (minRequiredAcrossTiers >= 1000 ? `${(minRequiredAcrossTiers / 1000).toFixed(0)}k+` : minRequiredAcrossTiers) : (reqFollowers >= 1000 ? `${(reqFollowers / 1000).toFixed(0)}k+` : reqFollowers)} req)
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="flex-1 rounded-full text-xs h-8 gradient-sunset text-white border-0 shadow-glow font-semibold"
                                      onClick={() => {
                                        setSelectedCampaignForDiscovery(camp);
                                        setSelectedTierForJoin(matchedTier || null);
                                        setJoinProposedRate(matchedTier?.cashAmount ? String(matchedTier.cashAmount) : camp.minBudgetPerCreator ? String(camp.minBudgetPerCreator) : "");
                                        setJoinPitch(`Hi ${camp.brand?.fullName || "there"}! I'm excited to collaborate on your "${camp.title}" campaign.`);
                                      }}
                                    >
                                      Apply
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Pagination Controls */}
                      {discoverableCampaigns.length > CAMPAIGNS_PER_PAGE && (
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50 text-xs">
                          <span className="text-muted-foreground">
                            Showing {(discoverPage - 1) * CAMPAIGNS_PER_PAGE + 1} to{" "}
                            {Math.min(discoverPage * CAMPAIGNS_PER_PAGE, discoverableCampaigns.length)} of{" "}
                            {discoverableCampaigns.length} campaigns
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={discoverPage === 1}
                              onClick={() => setDiscoverPage((p) => Math.max(1, p - 1))}
                              className="rounded-full h-8 px-3 text-xs"
                            >
                              Previous
                            </Button>
                            {Array.from({ length: Math.ceil(discoverableCampaigns.length / CAMPAIGNS_PER_PAGE) }).map((_, i) => (
                              <Button
                                key={i}
                                size="sm"
                                variant={discoverPage === i + 1 ? "default" : "outline"}
                                className={cn(
                                  "rounded-full h-8 w-8 p-0 text-xs",
                                  discoverPage === i + 1 && "gradient-sunset text-white border-0"
                                )}
                                onClick={() => setDiscoverPage(i + 1)}
                              >
                                {i + 1}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={discoverPage >= Math.ceil(discoverableCampaigns.length / CAMPAIGNS_PER_PAGE)}
                              onClick={() => setDiscoverPage((p) => p + 1)}
                              className="rounded-full h-8 px-3 text-xs font-bold"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : activeTab === "payments" ? (
              /* PAYMENTS TAB */
              <div className="w-full max-w-5xl mx-auto space-y-8">
                <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                  <div className="mb-6">
                    <h2 className="font-outfit text-xl font-bold">
                      My Escrow Payments
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Track your earnings, secure holdings, and escrow release status.
                    </p>
                  </div>

                  {!creatorPayments ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading payments...
                    </div>
                  ) : creatorPayments.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-secondary/5">
                      <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        No transactions recorded yet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        When brands deposit escrow funds for accepted collaborations, they will display here with live status.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-foreground">
                        <thead className="border-b border-border/60 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                          <tr>
                            <th className="py-3 pr-4 font-semibold">Campaign</th>
                            <th className="py-3 px-4 font-semibold">Brand</th>
                            <th className="py-3 px-4 font-semibold">Gross Amount</th>
                            <th className="py-3 px-4 font-semibold">Platform Fee (20%)</th>
                            <th className="py-3 px-4 font-semibold">Your Earnings (80%)</th>
                            <th className="py-3 px-4 font-semibold">Payment Status</th>
                            <th className="py-3 px-4 font-semibold">Hold / Release Status</th>
                            <th className="py-3 pl-2 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-medium">
                          {creatorPayments.map((pay) => (
                            <tr key={pay._id} className="hover:bg-secondary/20 transition-colors">
                              <td className="py-3 pr-4 font-semibold">
                                {pay.campaignTitle || pay.campaignId?.title || "Custom Deal"}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {pay.brandId?.fullName || "Brand"}
                              </td>
                              <td className="py-3 px-4 font-bold">
                                {formatINR(pay.amount)}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {formatINR(pay.platformFee || pay.amount * 0.2)}
                              </td>
                              <td className="py-3 px-4 font-bold text-emerald-600">
                                {formatINR(pay.netCreatorAmount || pay.amount * 0.8)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "rounded-full text-[10px] uppercase font-bold",
                                    pay.paymentStatus === "completed" && "bg-emerald-500/10 text-emerald-600",
                                    pay.paymentStatus === "pending" && "bg-amber/10 text-amber",
                                    pay.paymentStatus === "disputed" && "bg-red-500/10 text-red-500",
                                    pay.paymentStatus === "refunded" && "bg-slate-500/10 text-slate-500"
                                  )}
                                >
                                  {pay.paymentStatus}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {pay.escrowStatus === "held" ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-500/20">
                                      <Clock className="h-3 w-3" /> In Escrow
                                    </span>
                                    {pay.escrowHoldUntil && (
                                      <p className="text-[9px] text-muted-foreground">
                                        Release: {new Date(pay.escrowHoldUntil).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                ) : pay.paymentStatus === "disputed" ? (
                                  <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-500/20">
                                    Payment On Hold (Disputed)
                                  </span>
                                ) : pay.paymentStatus === "completed" ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-500/20">
                                    Released
                                  </span>
                                ) : pay.paymentStatus === "refunded" ? (
                                  <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-500/20">
                                    Refunded to Brand
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="py-3 pl-2 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 rounded-full text-[10px] px-2.5"
                                  onClick={() => setSelectedAuditLogPayment(pay)}
                                >
                                  View Logs
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Payment Settings Card */}
                <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                  <div className="mb-6">
                    <h2 className="font-display text-lg font-semibold flex items-center gap-1.5">
                      <CreditCard className="h-5 w-5 text-primary" /> Payment Settings
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage your bank details and payout preferences securely. (Only you can edit)
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (bankNumber !== bankNumberConfirm) {
                        toast.error("Bank account numbers do not match");
                        return;
                      }
                      if (bankIfsc.length !== 11) {
                        toast.error("IFSC must be exactly 11 characters");
                        return;
                      }
                      if (bankPan.length !== 10) {
                        toast.error("PAN number must be exactly 10 characters");
                        return;
                      }

                      setSavingBank(true);
                      try {
                        await api.put("/api/creators/profile/bank", {
                          fullName: bankFullName,
                          phone: bankPhone,
                          email: bankEmail,
                          accountNumber: bankNumber,
                          ifscCode: bankIfsc,
                          panNumber: bankPan,
                          upiId: bankUpi,
                        });
                        toast.success("Bank details updated successfully");
                      } catch (err) {
                        console.error("Bank details update error:", err);
                        toast.error(err?.response?.data?.message || "Failed to update bank details");
                      } finally {
                        setSavingBank(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="bankFullName" className="text-xs font-semibold">Full Name *</Label>
                        <Input
                          id="bankFullName"
                          placeholder="Your legal full name"
                          required
                          value={bankFullName}
                          onChange={(e) => setBankFullName(e.target.value)}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankPhone" className="text-xs font-semibold">Phone *</Label>
                        <Input
                          id="bankPhone"
                          placeholder="+91 9876543210"
                          required
                          value={bankPhone}
                          onChange={(e) => setBankPhone(e.target.value)}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankEmail" className="text-xs font-semibold">Email *</Label>
                        <Input
                          id="bankEmail"
                          type="email"
                          placeholder="your.email@example.com"
                          required
                          value={bankEmail}
                          onChange={(e) => setBankEmail(e.target.value)}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="bankNumber" className="text-xs font-semibold">Account Number *</Label>
                        <Input
                          id="bankNumber"
                          type="password"
                          placeholder="Enter bank account number"
                          required
                          value={bankNumber}
                          onChange={(e) => setBankNumber(e.target.value)}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankNumberConfirm" className="text-xs font-semibold">Confirm Account Number *</Label>
                        <Input
                          id="bankNumberConfirm"
                          placeholder="Re-enter bank account number"
                          required
                          value={bankNumberConfirm}
                          onChange={(e) => setBankNumberConfirm(e.target.value)}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="bankIfsc" className="text-xs font-semibold">IFSC Code *</Label>
                        <Input
                          id="bankIfsc"
                          placeholder="11 characters IFSC (e.g. HDFC0001234)"
                          required
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankPan" className="text-xs font-semibold">PAN Card Number *</Label>
                        <Input
                          id="bankPan"
                          placeholder="10 character PAN"
                          required
                          value={bankPan}
                          onChange={(e) => setBankPan(e.target.value.toUpperCase())}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankUpi" className="text-xs font-semibold">UPI ID (Optional)</Label>
                        <Input
                          id="bankUpi"
                          placeholder="username@bank"
                          value={bankUpi}
                          onChange={(e) => setBankUpi(e.target.value)}
                          className="rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={savingBank}
                      className="btn-bouncy rounded-full px-8 gradient-sunset border-0 text-white shadow-glow text-xs h-10 font-bold"
                    >
                      {savingBank ? "Saving Settings..." : "Save Payment Details"}
                    </Button>
                  </form>
                </div>
              </div>
            ) : activeTab === "wallet" ? (
            <div className="space-y-6">
              {/* WALLET HEADER / STATS */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold flex items-center gap-2">
                      <Wallet className="h-6 w-6 text-primary" /> Creator Wallet & Earnings
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Direct, transparent balance from completed and released campaign collaborations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs flex items-center gap-1.5"
                      disabled={isRefreshingWallet}
                      onClick={async () => {
                        setIsRefreshingWallet(true);
                        setWalletRefreshKey((k) => k + 1);
                        toast.info("Refreshing wallet balance & ledger...");
                        setTimeout(() => {
                          setIsRefreshingWallet(false);
                          toast.success("Wallet updated!");
                        }, 700);
                      }}
                    >
                      <History className={`h-3.5 w-3.5 ${isRefreshingWallet ? "animate-spin text-primary" : ""}`} />
                      {isRefreshingWallet ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full text-xs font-bold px-5 gradient-sunset text-white shadow-glow border-0 flex items-center gap-1.5"
                      onClick={() => {
                        setWithdrawAmountInput("");
                        setShowWithdrawDialog(true);
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4" /> Withdraw Funds
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Available Balance Card (Clickable to view Campaign Escrow breakdown) */}
                  <div
                    onClick={() => setShowCampaignBreakdownDialog(true)}
                    className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm relative overflow-hidden cursor-pointer hover:border-primary hover:bg-primary/10 transition-all group"
                    title="Click to view detailed campaign escrow & payment status"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                        Available Balance <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </span>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <IndianRupee className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-extrabold text-foreground font-display">
                      ₹{Number(creatorWallet.availableBalance || 0).toLocaleString("en-IN")}
                    </div>
                    <p className="text-[11px] text-primary/80 font-medium mt-1 flex items-center gap-1">
                      <span>Click to view campaign-wise breakdown</span> &rarr;
                    </p>
                  </div>

                  {/* Pending Withdrawals & Escrows Card */}
                  <div
                    onClick={() => setShowCampaignBreakdownDialog(true)}
                    className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
                    title="Click to view locked escrow amounts"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Withdrawals / Escrow</span>
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold text-foreground font-display text-amber-700">
                      ₹{Number(creatorWallet.pendingWithdrawalBalance || 0).toLocaleString("en-IN")}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Reserved & awaiting disbursement
                    </p>
                  </div>

                  {/* Total Earned Card */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Earned</span>
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold text-foreground font-display text-emerald-600">
                      ₹{Number(creatorWallet.totalEarned || 0).toLocaleString("en-IN")}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Lifetime collaboration earnings
                    </p>
                  </div>

                  {/* Protection Policy Notice */}
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <span className="text-xs font-bold text-foreground">Escrow Payout Guaranteed</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                      All campaign deliverables are protected by Pravixo Escrow. Once brand approves your work, payouts are credited directly to your wallet.
                    </p>
                  </div>
                </div>
              </div>

              {/* WITHDRAWAL REQUESTS HISTORY (TASK 14) */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-base font-bold flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" /> Withdrawal Requests
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Track status of all your bank disbursements and processed transfers.
                    </p>
                  </div>
                </div>

                {!creatorWithdrawalsData ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Loading withdrawal history...
                  </div>
                ) : creatorWithdrawalsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-8 text-center">
                    <Landmark className="mx-auto h-7 w-7 text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-xs text-foreground">
                      No withdrawal requests yet
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Use the "Withdraw Funds" button above to disburse your available balance.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <th className="pb-3 pl-2 font-semibold">Requested Date</th>
                          <th className="pb-3 px-2 font-semibold">Reference ID</th>
                          <th className="pb-3 px-2 font-semibold">Bank Destination</th>
                          <th className="pb-3 px-2 font-semibold">Amount</th>
                          <th className="pb-3 px-2 font-semibold">Status</th>
                          <th className="pb-3 pr-2 text-right font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {creatorWithdrawalsList.map((w) => (
                          <tr key={w._id} className="hover:bg-secondary/10 transition-colors">
                            <td className="py-3 pl-2 text-muted-foreground whitespace-nowrap">
                              {new Date(w.requestedAt || w.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 px-2 font-mono text-[10px] text-muted-foreground">
                              {w.referenceId}
                            </td>
                            <td className="py-3 px-2 text-foreground font-medium">
                              {w.bankDetailsSnapshot?.bankName || "Bank Account"} ({w.bankDetailsSnapshot?.accountNumberMasked || "••••"})
                            </td>
                            <td className="py-3 px-2 font-bold text-foreground text-sm whitespace-nowrap">
                              ₹{Number(w.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-2">
                              <Badge
                                className={`rounded-full text-[9px] font-bold px-2 py-0.5 border ${
                                  w.status === "COMPLETED"
                                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                    : w.status === "FAILED" || w.status === "CANCELLED"
                                    ? "bg-red-500/15 text-red-700 border-red-500/30"
                                    : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                                }`}
                              >
                                {w.status === "COMPLETED"
                                  ? "✓ Disbursed"
                                  : w.status === "FAILED"
                                  ? "✕ Declined"
                                  : "⏳ Pending Review"}
                              </Badge>
                            </td>
                            <td className="py-3 pr-2 text-right text-[11px] text-muted-foreground">
                              {w.payoutReference ? (
                                <span className="text-emerald-600 font-mono text-[10px]">Ref: {w.payoutReference}</span>
                              ) : w.failureReason ? (
                                <span className="text-red-500 text-[10px]" title={w.failureReason}>
                                  {w.failureReason.slice(0, 25)}{w.failureReason.length > 25 ? "..." : ""}
                                </span>
                              ) : (
                                <span>In verification</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TRANSACTION HISTORY */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-base font-bold flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Transaction Ledger
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Immutable record of all credits and debits from your wallet.
                    </p>
                  </div>
                </div>

                {!creatorWalletData ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Loading transactions...
                  </div>
                ) : creatorTransactionsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
                    <Wallet className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-sm text-foreground">
                      No wallet transactions yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                      When your campaign deliverables are approved and the admin releases your payment, your wallet credits will appear right here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <th className="pb-3 pl-2 font-semibold">Date & Time</th>
                          <th className="pb-3 px-2 font-semibold">Type</th>
                          <th className="pb-3 px-2 font-semibold">Description / Campaign</th>
                          <th className="pb-3 px-2 font-semibold">Reference ID</th>
                          <th className="pb-3 px-2 font-semibold">Amount</th>
                          <th className="pb-3 px-2 font-semibold">Balance After</th>
                          <th className="pb-3 pr-2 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {creatorTransactionsList.map((tx) => (
                          <tr key={tx._id} className="hover:bg-secondary/10 transition-colors">
                            <td className="py-3.5 pl-2 text-muted-foreground whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3.5 px-2">
                              <Badge
                                className={`rounded-full text-[10px] font-bold px-2 py-0.5 border ${
                                  tx.type === "DEBIT"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                }`}
                              >
                                {tx.type === "DEBIT" ? "- DEBIT" : "+ CREDIT"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-2 font-medium max-w-[200px] truncate">
                              <span className="block font-semibold text-foreground">
                                {tx.campaignId?.title || tx.description || "Collaboration Payout"}
                              </span>
                              <span className="block text-[10px] text-muted-foreground truncate">
                                {tx.description}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 font-mono text-[10px] text-muted-foreground">
                              {tx.referenceId}
                            </td>
                            <td className={`py-3.5 px-2 font-bold text-sm whitespace-nowrap ${
                              tx.type === "DEBIT" ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {tx.type === "DEBIT" ? "- " : "+ "}₹{Number(tx.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-2 font-semibold text-foreground text-xs whitespace-nowrap">
                              ₹{Number(tx.balanceAfter || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 pr-2 text-right">
                              <Badge
                                className={`rounded-full text-[9px] font-bold px-2 py-0.5 border ${
                                  tx.status === "COMPLETED"
                                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                    : tx.status === "FAILED"
                                    ? "bg-red-500/15 text-red-700 border-red-500/30"
                                    : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                                }`}
                              >
                                {tx.status === "COMPLETED" ? "✓ Completed" : tx.status === "FAILED" ? "✕ Failed" : "⏳ Pending"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "referrals" ? (
            <div className="space-y-6">
              {/* REFERRAL HERO CARD */}
              <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="max-w-3xl relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold mb-3">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Tiered Referral Income (5% - 10%) • Paid Directly by Pravixo</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Invite creators & brands. <span className="text-gradient-sunset">Earn up to 10% on every deal.</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Share your unique referral code or link. Whenever a creator you refer completes a brand collaboration, Pravixo pays you recurring referral income directly from our platform commission with zero deductions from the creator earnings.
                  </p>

                  {/* TIERED COMMISSION BADGES */}
                  <div className="mt-4 grid grid-cols-3 gap-2.5 max-w-lg">
                    <div className="p-2.5 rounded-xl border border-border/80 bg-background/60 text-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">Starter Plan</span>
                      <span className="text-base font-black text-foreground">5.0%</span>
                      <span className="text-[10px] text-muted-foreground block">Free Tier</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
                      <span className="text-[10px] font-bold text-amber-500 uppercase block">Pro Plan</span>
                      <span className="text-base font-black text-amber-500">7.5%</span>
                      <span className="text-[10px] text-muted-foreground block">Active Pro Sub</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 text-center">
                      <span className="text-[10px] font-bold text-purple-500 uppercase block">Elite Plan</span>
                      <span className="text-base font-black text-purple-500">10.0%</span>
                      <span className="text-[10px] text-muted-foreground block">Active Elite Sub</span>
                    </div>
                  </div>

                  {/* CODE & LINK BOXES */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Code Box */}
                    <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 backdrop-blur-sm">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Your Referral Code
                      </span>
                      <div className="flex items-center justify-between gap-2 bg-card px-3 py-2 rounded-xl border border-border">
                        <span className="font-mono font-black text-base text-foreground tracking-wider">
                          {referralCodeData?.referral_code || profile?.referral_code || profile?.referralCode || "Generating..."}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 rounded-lg text-xs font-bold text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            const code = referralCodeData?.referral_code || profile?.referral_code || profile?.referralCode || "";
                            if (!code) return;
                            navigator.clipboard.writeText(code);
                            setCopiedCode(true);
                            toast.success("Referral code copied to clipboard!");
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                        >
                          {copiedCode ? (
                            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1" /> Copied</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5 mr-1" /> Copy Code</>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Link Box */}
                    <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 backdrop-blur-sm">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Your Referral Link
                      </span>
                      <div className="flex items-center justify-between gap-2 bg-card px-3 py-2 rounded-xl border border-border">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[170px]">
                          {referralCodeData?.referral_link || `${window.location.origin}/register?ref=${referralCodeData?.referral_code || profile?.referral_code || ""}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 rounded-lg text-xs font-bold text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              const link = referralCodeData?.referral_link || `${window.location.origin}/register?ref=${referralCodeData?.referral_code || profile?.referral_code || ""}`;
                              navigator.clipboard.writeText(link);
                              setCopiedLink(true);
                              toast.success("Referral link copied!");
                              setTimeout(() => setCopiedLink(false), 2000);
                            }}
                          >
                            {copiedLink ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs font-bold gradient-sunset text-white border-0 shadow-sm flex items-center gap-1"
                            onClick={() => {
                              const link = referralCodeData?.referral_link || `${window.location.origin}/register?ref=${referralCodeData?.referral_code || profile?.referral_code || ""}`;
                              const refCode = referralCodeData?.referral_code || profile?.referral_code || "";
                              if (navigator.share) {
                                navigator.share({
                                  title: "Join Previxo Creator Network",
                                  text: `Join Previxo using my referral code ${refCode} and monetize your influence!`,
                                  url: link,
                                }).catch(() => {});
                              } else {
                                const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join Previxo with my referral code ${refCode} and earn from brand collaborations: ${link}`)}`;
                                window.open(whatsappUrl, "_blank");
                              }
                            }}
                          >
                            <Share2 className="h-3.5 w-3.5" /> Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATS METRICS */}
              {/* STATS METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Total Commission Earned</span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <IndianRupee className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-foreground font-display">
                    ₹{Number(referralEarnings?.total_earned || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Credited directly to your wallet</p>
                </div>

                <div
                  onClick={() => navigate("/referrals")}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 hover:bg-secondary/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">Active Referrals</span>
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="text-3xl font-extrabold text-foreground font-display">
                      {referralEarnings?.active_referrals_count ?? (referredListQuery?.total || 0)}
                    </div>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      View list & analytics <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Open dedicated referral analytics & partners page</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission Rate</span>
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-amber-600 font-display">
                    5% - 10%
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Tiered based on active subscription plan</p>
                </div>
              </div>

              {/* REFERRAL COMMISSIONS TABLE */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">Referral Commission History</h3>
                    <p className="text-xs text-muted-foreground">Earnings credited from referred creators & brands' completed project payouts</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => navigate("/referrals")}
                    >
                      <Users className="h-3.5 w-3.5" /> View All Referrals & Graphs ({referralEarnings?.active_referrals_count ?? (referredListQuery?.total || 0)})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs flex items-center gap-1.5"
                      disabled={isRefreshingReferral}
                      onClick={() => {
                        setIsRefreshingReferral(true);
                        setReferralRefreshKey((k) => k + 1);
                        toast.info("Refreshing referral data & commissions...");
                        setTimeout(() => {
                          setIsRefreshingReferral(false);
                          toast.success("Referral data updated!");
                        }, 700);
                      }}
                    >
                      <History className={`h-3.5 w-3.5 ${isRefreshingReferral ? "animate-spin text-primary" : ""}`} />
                      {isRefreshingReferral ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>
                </div>

                {(!referralEarnings?.earnings || referralEarnings.earnings.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground mb-3">
                      <Gift className="h-8 w-8 text-primary/60" />
                    </div>
                    <p className="font-semibold text-sm text-foreground">No commission earnings yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[340px]">
                      Share your referral code with fellow creators and brands. When your referred creators complete projects, your 5% commissions will appear right here!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <th className="pb-3 pl-2 font-semibold">Referred Creator</th>
                          <th className="pb-3 px-2 font-semibold">Project / Payout</th>
                          <th className="pb-3 px-2 font-semibold">Date</th>
                          <th className="pb-3 px-2 font-semibold">Commission (5%)</th>
                          <th className="pb-3 pr-2 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {referralEarnings.earnings.map((item, idx) => (
                          <tr key={item._id || item.project_id || idx} className="hover:bg-secondary/10 transition-colors">
                            <td className="py-3.5 pl-2 font-semibold text-foreground flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {item.referred_user_name?.[0] || "C"}
                              </div>
                              <div>
                                <span>{item.referred_user_name || "Referred Creator"}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-2 text-muted-foreground font-mono text-[11px]">
                              {item.project_id ? (item.project_id.length > 12 ? `${item.project_id.slice(0, 10)}...` : item.project_id) : "Completed Project"}
                            </td>
                            <td className="py-3.5 px-2 text-muted-foreground whitespace-nowrap">
                              {item.date ? new Date(item.date).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }) : "-"}
                            </td>
                            <td className="py-3.5 px-2 font-bold text-sm text-emerald-600">
                              +₹{Number(item.commission_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 pr-2 text-right">
                              <Badge className="rounded-full text-[9px] font-bold px-2 py-0.5 border bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                                ✓ Credited
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* REFERRED CREATORS DIALOG */}
              <Dialog open={showReferredModal} onOpenChange={setShowReferredModal}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col rounded-3xl p-6 bg-card border border-border">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <DialogTitle className="font-display text-lg sm:text-xl font-bold text-foreground">
                          People Referred By You
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          Creators and brands registered using your referral code. You earn a recurring 5% commission on their completed projects.
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Summary Bar inside Modal */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-secondary/40 border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Referred</span>
                      <span className="font-bold text-base text-foreground font-display">
                        {referredListQuery?.total ?? referralEarnings?.active_referrals_count ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Commission Earned</span>
                      <span className="font-bold text-base text-emerald-600 font-display">
                        ₹{Number(referredListQuery?.totalCommissionEarned ?? referralEarnings?.total_earned ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Commission Rate</span>
                      <span className="font-bold text-base text-amber-600 font-display">5% Recurring</span>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, handle, or referral code..."
                      value={referredSearchFilter}
                      onChange={(e) => setReferredSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-secondary/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* List Content */}
                  <div className="overflow-y-auto space-y-2.5 max-h-[45vh] pr-1 no-scrollbar">
                    {(() => {
                      const allList = referredListQuery?.referrals || [];
                      const filtered = referredSearchFilter.trim()
                        ? allList.filter((r) =>
                            r.fullName?.toLowerCase().includes(referredSearchFilter.toLowerCase()) ||
                            r.handle?.toLowerCase().includes(referredSearchFilter.toLowerCase()) ||
                            r.referralCode?.toLowerCase().includes(referredSearchFilter.toLowerCase())
                          )
                        : allList;

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center text-muted-foreground">
                            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                            <p className="text-xs font-semibold text-foreground">
                              {referredSearchFilter ? "No matching referred users found" : "No referred creators yet"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] mx-auto">
                              Share your referral code {referralCodeData?.referral_code || profile?.referral_code || ""} to start earning 5% recurring payouts!
                            </p>
                          </div>
                        );
                      }

                      return filtered.map((ref) => (
                        <div
                          key={ref._id}
                          className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:bg-secondary/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                ref.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(ref.fullName || "Creator")}&background=random`
                              }
                              alt=""
                              className="h-10 w-10 rounded-full border border-border object-cover bg-muted shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback";
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-foreground">{ref.fullName}</span>
                                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 border-border text-muted-foreground font-semibold">
                                  {ref.role || "creator"}
                                </Badge>
                                <Badge className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  Active
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                {ref.handle && <span>{ref.handle}</span>}
                                {ref.handle && <span>•</span>}
                                <span>Joined {ref.date ? new Date(ref.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "-"}</span>
                              </div>
                              <div className="mt-1">
                                <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground font-semibold border border-border/50">
                                  Code: {ref.referralCode || "CR-E3H4P"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground block font-medium">Your 5% Commission</span>
                              <span className="font-black text-sm text-emerald-600">
                                +₹{Number(ref.commissionEarned || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="text-right mt-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                Completed Payouts: ₹{Number(ref.referredUserEarnings || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : activeTab === "offers" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" /> Special Offers & Promotions
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Launch and manage exclusive, limited-time discount packages and custom collaboration offers for brands.
                </p>
                <div className="mt-6">
                  <CreatorOfferForm profileId={profile?._id} role="creator" />
                </div>
              </div>
            </div>
          ) : (
            <SubscriptionTab role="creator" profile={profile} />
          )}
        </div>
      </div>
    </div>

      {/* Submit Task Dialog */}
      <Dialog
        open={!!submitTargetTask}
        onOpenChange={(open) => !open && setSubmitTargetTask(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Submit Task Deliverables
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Provide your submission link and optional notes for the brand.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!submissionLink.trim()) {
                toast.error("Please provide a submission link");
                return;
              }
              setSubmittingTask(true);
              try {
                await submitTask({
                  taskId: submitTargetTask._id,
                  submissionLink: submissionLink.trim(),
                  notes: submissionNotes.trim(),
                  attachmentLink: submissionAttachment.trim(),
                });
                toast.success("Task submitted successfully! Brand notified.");
                setSubmitTargetTask(null);
              } catch (err) {
                toast.error((err).message);
              } finally {
                setSubmittingTask(false);
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <Label htmlFor="sub-link" className="text-xs font-semibold">
                Submission Link *
              </Label>
              <Input
                id="sub-link"
                placeholder="https://instagram.com/... or Google Drive URL"
                required
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sub-notes" className="text-xs font-semibold">
                Submission Notes (Optional)
              </Label>
              <Textarea
                id="sub-notes"
                placeholder="Add any extra notes or explanations..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sub-attachment" className="text-xs font-semibold">
                Optional Attachment Link
              </Label>
              <Input
                id="sub-attachment"
                placeholder="Additional assets link (e.g. Dropbox, Figma)"
                value={submissionAttachment}
                onChange={(e) => setSubmissionAttachment(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setSubmitTargetTask(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingTask}
                className="rounded-full gradient-sunset border-0 text-white shadow-glow"
              >
                {submittingTask ? "Submitting..." : "Submit Deliverable"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audit Logs Timeline Modal */}
      <Dialog
        open={!!selectedAuditLogPayment}
        onOpenChange={(open) => !open && setSelectedAuditLogPayment(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Escrow Payout Timeline
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review transaction audit log trail events.
            </DialogDescription>
          </DialogHeader>

          {selectedAuditLogPayment && (
            <div className="space-y-4 mt-3">
              <div className="text-xs space-y-1 bg-secondary/10 border border-border/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Payment ID</p>
                <p className="font-mono">{selectedAuditLogPayment._id}</p>
                {selectedAuditLogPayment.gatewayOrderId && (
                  <>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Razorpay Order ID</p>
                    <p className="font-mono">{selectedAuditLogPayment.gatewayOrderId}</p>
                  </>
                )}
                {selectedAuditLogPayment.gatewayPaymentId && (
                  <>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Razorpay Payment ID</p>
                    <p className="font-mono">{selectedAuditLogPayment.gatewayPaymentId}</p>
                  </>
                )}
              </div>

              <div className="relative border-l-2 border-border ml-2 pl-4 space-y-4 py-2">
                {!selectedAuditLogPayment.auditLogs || selectedAuditLogPayment.auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No events logged yet.</p>
                ) : (
                  [...selectedAuditLogPayment.auditLogs]
                    .sort((a, b) => a.createdAt - b.createdAt)
                    .map((log, idx) => (
                      <div key={log._id || idx} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                        <h4 className="text-xs font-bold text-foreground">
                          {log.action}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {log.details}
                        </p>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="secondary"
                  className="rounded-full w-full"
                  onClick={() => setSelectedAuditLogPayment(null)}
                >
                  Close Timeline
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Details & Join Request Modal for Creators */}
      <Dialog
        open={!!selectedCampaignForDiscovery}
        onOpenChange={(open) => !open && setSelectedCampaignForDiscovery(null)}
      >
        <DialogContent className="sm:max-w-2xl rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" /> Campaign Details
              </DialogTitle>
              {selectedCampaignForDiscovery?.isParticipating ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-full text-xs font-semibold">
                  Participating
                </Badge>
              ) : selectedCampaignForDiscovery?.isRequested ? (
                <Badge className="bg-amber/10 text-amber border-amber/20 rounded-full text-xs font-semibold">
                  Request Pending
                </Badge>
              ) : null}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Review campaign specifications and send your pitch to the brand.
            </DialogDescription>
          </DialogHeader>

          {selectedCampaignForDiscovery && (
            <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
              {/* Brand Profile Banner */}
              <div className="flex items-center gap-3 p-3 bg-secondary/15 rounded-2xl border border-border/50">
                <img
                  src={
                    selectedCampaignForDiscovery.brand?.avatarUrl ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${selectedCampaignForDiscovery.brand?.fullName || "Brand"}`
                  }
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover border border-border"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    {selectedCampaignForDiscovery.brand?.fullName}
                    {selectedCampaignForDiscovery.brand?.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-amber text-xs font-bold">
                        <Star className="h-3 w-3 fill-amber" /> {selectedCampaignForDiscovery.brand.rating} ({selectedCampaignForDiscovery.brand.reviewCount || 0})
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedCampaignForDiscovery.brand?.category || "Brand"} · {selectedCampaignForDiscovery.location || "Pan India"}
                  </p>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Campaign Title
                </label>
                <p className="text-base font-bold text-foreground">
                  {selectedCampaignForDiscovery.title}
                </p>
              </div>

              {selectedCampaignForDiscovery.description && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-background/50 p-3 rounded-xl border border-border/40">
                    {selectedCampaignForDiscovery.description}
                  </p>
                </div>
              )}

              {/* Budget & Timeline Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <IndianRupee className="h-3 w-3 text-primary" /> Creator Budget
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    ₹{Number(selectedCampaignForDiscovery.minBudgetPerCreator || 0).toLocaleString("en-IN")} - ₹{Number(selectedCampaignForDiscovery.maxBudgetPerCreator || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <IndianRupee className="h-3 w-3 text-primary" /> Total Budget
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    ₹{Number(selectedCampaignForDiscovery.totalBudget || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Calendar className="h-3 w-3 text-primary" /> Start Date
                  </span>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(selectedCampaignForDiscovery.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Calendar className="h-3 w-3 text-primary" /> End Date
                  </span>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(selectedCampaignForDiscovery.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Deliverables Breakdown */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3 text-primary" /> Required Deliverables
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">🎬 Reels</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaignForDiscovery.deliverables?.reels || 0}</span>
                  </div>
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">📸 Posts</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaignForDiscovery.deliverables?.posts || 0}</span>
                  </div>
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">📱 Stories</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaignForDiscovery.deliverables?.stories || 0}</span>
                  </div>
                  <div className="p-2.5 bg-background border border-border/50 rounded-xl text-center">
                    <span className="text-xs text-muted-foreground block">🎥 Videos</span>
                    <span className="text-sm font-bold text-foreground">{selectedCampaignForDiscovery.deliverables?.videos || 0}</span>
                  </div>
                </div>
              </div>

              {/* Condition-Based Tiers / Options in Application Pitch Dialog */}
              {selectedCampaignForDiscovery.tiers && selectedCampaignForDiscovery.tiers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Select Your Qualified Option / Perk Tier
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Based on your total reach ({creatorTotalFollowers.toLocaleString()} followers), select which perk option you are applying for:
                  </p>
                  <div className="space-y-2">
                    {[...selectedCampaignForDiscovery.tiers]
                      .sort((a, b) => (Number(a.minFollowers) || 0) - (Number(b.minFollowers) || 0))
                      .map((tier, idx) => {
                        const isQualified = creatorTotalFollowers >= (Number(tier.minFollowers) || 0);
                        const isSelected = selectedTierForJoin?.minFollowers === tier.minFollowers;

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (isQualified) setSelectedTierForJoin(tier);
                            }}
                            className={cn(
                              "p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3",
                              isQualified ? "cursor-pointer" : "opacity-50 cursor-not-allowed bg-secondary/10 border-border/40",
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                                : isQualified
                                ? "border-border/60 bg-secondary/20 hover:border-border"
                                : ""
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                              )}>
                                {isSelected && <Check className="h-2.5 w-2.5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">
                                    {tier.minFollowers >= 1000 ? `${(tier.minFollowers / 1000).toFixed(0)}k+` : tier.minFollowers} Followers
                                  </span>
                                  {isQualified ? (
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">Qualified</span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded">Need +{((tier.minFollowers || 0) - creatorTotalFollowers).toLocaleString()} more</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {tier.reward || "Custom Perk"}{tier.cashAmount ? ` + ₹${tier.cashAmount.toLocaleString("en-IN")} Cash` : ""}{tier.perks ? ` (${tier.perks})` : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Proposed Rate & Pitch Input */}
              {!selectedCampaignForDiscovery.isParticipating && !selectedCampaignForDiscovery.isRequested && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Your Proposed Rate (₹)</span>
                      <span className="text-[10px] text-muted-foreground">Direct proposal to brand</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">₹</span>
                      <Input
                        type="number"
                        placeholder={selectedTierForJoin?.cashAmount ? String(selectedTierForJoin.cashAmount) : "e.g. 2500"}
                        value={joinProposedRate}
                        onChange={(e) => setJoinProposedRate(e.target.value)}
                        className="pl-7 text-xs rounded-xl h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Your Pitch to Brand
                    </label>
                    <Textarea
                      placeholder="Briefly describe why you are a great fit for this campaign..."
                      value={joinPitch}
                      onChange={(e) => setJoinPitch(e.target.value)}
                      className="text-xs rounded-xl resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-full flex-1 text-xs"
                  onClick={() => setSelectedCampaignForDiscovery(null)}
                >
                  Close
                </Button>

                {selectedCampaignForDiscovery.isParticipating || userApprovedCampaignIds.has(String(selectedCampaignForDiscovery._id)) ? (
                  <Button disabled className="rounded-full flex-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold">
                    Approved ✓ Participating
                  </Button>
                ) : selectedCampaignForDiscovery.isRequested || userRequestedCampaignIds.has(String(selectedCampaignForDiscovery._id)) ? (
                  <Button disabled className="rounded-full flex-1 bg-amber/10 text-amber border border-amber/20 text-xs font-semibold">
                    Application Pending (Applied ✓)
                  </Button>
                ) : (
                  <Button
                    className="rounded-full flex-1 gradient-sunset border-0 text-white font-semibold text-xs shadow-glow"
                    disabled={joiningCampaign}
                    onClick={async () => {
                      setJoiningCampaign(true);
                      try {
                        const res = await apiPost(`/campaigns/${selectedCampaignForDiscovery._id}/join`, {
                          pitch: joinPitch.trim(),
                          proposedRate: joinProposedRate ? Number(joinProposedRate) : undefined,
                          appliedTier: selectedTierForJoin || undefined,
                        });
                        toast.success("Application submitted successfully! It will appear in your chat history.");
                        setSelectedCampaignForDiscovery(null);
                        setDiscoverRefreshKey((k) => k + 1);
                        setRequestsRefreshKey((k) => k + 1);
                      } catch (err) {
                        toast.error(err.response?.data?.message || err.message || "Failed to submit application");
                        if (err.response?.status === 409) {
                          setDiscoverRefreshKey((k) => k + 1);
                          setRequestsRefreshKey((k) => k + 1);
                        }
                      } finally {
                        setJoiningCampaign(false);
                      }
                    }}
                  >
                    {joiningCampaign ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Premium Subscription Offer Popup */}
      <Dialog open={showOfferPopup} onOpenChange={setShowOfferPopup}>
        <DialogContent className="sm:max-w-[720px] rounded-3xl border border-border bg-card p-0 overflow-hidden shadow-elevated">
          <div className="flex flex-col">
            {/* Offer Banner */}
            {activeOffer && activeOffer.bannerImageUrl ? (
              <div className="h-32 w-full relative">
                <img
                  src={activeOffer.bannerImageUrl}
                  alt="Offer Banner"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </div>
            ) : (
              <div className="h-20 w-full bg-gradient-to-r from-primary/20 via-accent/15 to-background flex items-center justify-center relative">
                <Sparkles className="h-7 w-7 text-primary animate-pulse" />
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                    {activeOffer ? "Limited Time Offer" : "Special Package Plan"}
                  </span>
                  {activeOffer && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Expires: {new Date(activeOffer.expiryDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <DialogTitle className="font-display text-xl font-bold text-foreground">
                  {activeOffer ? activeOffer.name : "Premium Packages"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {activeOffer ? activeOffer.description : "Unlock premium search matches, unlimited campaign listings, and verify your account status today."}
                </DialogDescription>
              </div>

              {/* Subscription cards render */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                {(packages || []).map((pkg) => {
                  const isActive = currentSub && currentSub.packageId === pkg._id;
                  const isPromoPkg = activeOffer && activeOffer.packageId === pkg._id;
                  const isRecommended = pkg.name === "Pro";

                  let finalPrice = pkg.price;
                  if (isPromoPkg && activeOffer) {
                    if (activeOffer.discountPercentage) {
                      finalPrice = pkg.price * (1 - activeOffer.discountPercentage / 100);
                    } else if (activeOffer.discountAmount) {
                      finalPrice = Math.max(0, pkg.price - activeOffer.discountAmount);
                    }
                  }

                  return (
                    <div
                      key={pkg._id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between relative bg-background/40 backdrop-blur-md transition-all duration-200 ${
                        isRecommended ? "border-primary shadow-elevated bg-secondary/5" : "border-border"
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -top-2 left-4 text-[8px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          {pkg.badge}
                        </span>
                      )}

                      <div className="space-y-2">
                        <h4 className="font-display text-sm font-bold text-foreground">{pkg.name}</h4>
                        <div className="flex items-baseline gap-1">
                          {isPromoPkg ? (
                            <>
                              <span className="text-xl font-bold text-foreground">₹{finalPrice}</span>
                              <span className="text-[10px] text-muted-foreground line-through">₹{pkg.price}</span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-foreground">₹{pkg.price}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">/{pkg.billingPeriod}</span>
                        </div>

                        <ul className="space-y-1 text-[10px] text-muted-foreground">
                          {pkg.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4">
                        {isActive ? (
                          <Button size="sm" className="w-full rounded-full text-[10px]" variant="secondary" disabled>
                            Current Plan
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className={`w-full rounded-full text-[10px] font-semibold ${
                              isRecommended ? "gradient-sunset border-0 text-white shadow-glow" : ""
                            }`}
                            variant={isRecommended ? "default" : "outline"}
                            onClick={() => {
                              handleUpgradeFromPopup(pkg._id, isPromoPkg ? activeOffer?._id : undefined);
                            }}
                            disabled={upgradingId !== null}
                          >
                            {upgradingId === pkg._id ? "Processing..." : `Buy ${pkg.name}`}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setShowOfferPopup(false)}
                >
                  Maybe Later
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowOfferPopup(false);
                    const dontShowUntilKey = `popup_dont_show_until_${profile?._id || ""}`;
                    localStorage.setItem(
                      dontShowUntilKey,
                      (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
                    );
                    toast.success("We will not show this offer again for 7 days.");
                  }}
                >
                  Dismiss for 7 Days
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task 6: Deliverable Content Submission Dialog */}
      <Dialog
        open={Boolean(selectedCollabForSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCollabForSubmission(null);
            setSubmissionFile(null);
            setSubmissionFilePreview(null);
            setSubmissionCaption("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Submit Deliverable Work
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload your completed work for "{selectedCollabForSubmission?.campaign?.title || "Campaign"}". The brand will review your submitted content.
            </DialogDescription>
          </DialogHeader>

          {selectedCollabForSubmission && (
            <div className="space-y-4 py-2">
              {/* Deliverable Type Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Select Deliverable Type <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedCollabForSubmission.deliverablesTracking?.map((deliv) => {
                    const isSelected = submissionDeliverableType === deliv.type;
                    const isFulfilled = (deliv.completedQuantity || 0) >= deliv.requiredQuantity;
                    const typeLabels = {
                      REEL: "Reel",
                      POST: "Post",
                      STORY: "Story",
                      VIDEO: "Video",
                    };
                    return (
                      <button
                        key={deliv.type}
                        type="button"
                        disabled={isFulfilled}
                        onClick={() => setSubmissionDeliverableType(deliv.type)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition font-semibold cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                            : isFulfilled
                            ? "border-border/40 bg-muted/20 text-muted-foreground opacity-50 cursor-not-allowed"
                            : "border-border bg-card hover:bg-secondary/60 text-foreground"
                        )}
                      >
                        <span>{typeLabels[deliv.type] || deliv.type}</span>
                        <span className="text-[10px] font-normal opacity-80 mt-0.5">
                          {deliv.completedQuantity || 0}/{deliv.requiredQuantity}
                        </span>
                        {isFulfilled && (
                          <span className="text-[9px] font-bold text-emerald-600">Done ✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Upload Area */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Upload Deliverable File (Video or Image) <span className="text-red-500">*</span>
                </Label>
                <div className="rounded-2xl border-2 border-dashed border-border/80 bg-secondary/20 p-4 text-center hover:border-primary/50 transition">
                  {submissionFilePreview ? (
                    <div className="space-y-3">
                      {submissionFile?.type?.startsWith("video") ? (
                        <video
                          src={submissionFilePreview}
                          controls
                          className="max-h-48 mx-auto rounded-xl shadow-sm border border-border"
                        />
                      ) : (
                        <img
                          src={submissionFilePreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-xl object-contain shadow-sm border border-border"
                        />
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                        <span className="truncate max-w-[260px] font-medium text-foreground">
                          {submissionFile?.name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full"
                          onClick={() => {
                            setSubmissionFile(null);
                            setSubmissionFilePreview(null);
                          }}
                        >
                          Change File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-sm">
                        <Upload className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Click or drag file to upload</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        MP4, MOV, WebM, JPG, PNG, WebP up to 50MB
                      </span>
                      <input
                        type="file"
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error("File exceeds 50MB maximum size limit.");
                              return;
                            }
                            setSubmissionFile(file);
                            setSubmissionFilePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Optional Caption / Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Caption / Description / Submission Notes (Optional)
                </Label>
                <Textarea
                  placeholder="e.g. Here is the first draft of the Reel focusing on the product unboxing..."
                  value={submissionCaption}
                  onChange={(e) => setSubmissionCaption(e.target.value)}
                  className="text-xs min-h-[70px] rounded-xl resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                setSelectedCollabForSubmission(null);
                setSubmissionFile(null);
                setSubmissionFilePreview(null);
                setSubmissionCaption("");
              }}
              disabled={submittingDeliverable}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-full gradient-sunset text-white font-bold text-xs px-6 shadow-glow"
              disabled={!submissionDeliverableType || !submissionFile || submittingDeliverable}
              onClick={async () => {
                if (!selectedCollabForSubmission || !submissionDeliverableType || !submissionFile) {
                  toast.error("Please select deliverable type and upload a file.");
                  return;
                }

                setSubmittingDeliverable(true);
                try {
                  const formData = new FormData();
                  formData.append("deliverableType", submissionDeliverableType);
                  formData.append("file", submissionFile);
                  if (submissionCaption) {
                    formData.append("caption", submissionCaption);
                  }

                  await api.post(`/api/submissions/${selectedCollabForSubmission._id}/submit`, formData, {
                    headers: {
                      "Content-Type": "multipart/form-data",
                    },
                  });

                  toast.success("Deliverable submitted successfully! Brand has been notified.");
                  setSelectedCollabForSubmission(null);
                  setSubmissionFile(null);
                  setSubmissionFilePreview(null);
                  setSubmissionCaption("");
                  setRequestsRefreshKey((k) => k + 1);
                } catch (err) {
                  console.error("Submission error:", err);
                  toast.error(err?.response?.data?.message || err.message || "Failed to submit deliverable.");
                } finally {
                  setSubmittingDeliverable(false);
                }
              }}
            >
              {submittingDeliverable ? "Submitting Work..." : "Submit Deliverable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task 7: Submissions & Brand Review Feedback History Dialog for Creator */}
      <Dialog
        open={Boolean(selectedCollabForHistory)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCollabForHistory(null);
            setCreatorSubmissionsList([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Submissions & Brand Review Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review status and feedback from the brand for "{selectedCollabForHistory?.campaign?.title || "Campaign"}".
            </DialogDescription>
          </DialogHeader>

          {selectedCollabForHistory && (
            <div className="space-y-4 py-2">
              {/* Deliverables Overview Stats */}
              <div className="rounded-2xl border border-border/80 bg-secondary/20 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Brand</span>
                  <span className="font-bold text-foreground">{selectedCollabForHistory.brandProfile?.fullName || "Brand"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Campaign</span>
                  <span className="font-bold text-foreground truncate max-w-[200px] block">{selectedCollabForHistory.campaign?.title || "Campaign"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Approved Deliverables</span>
                  {(() => {
                    const totalReq = selectedCollabForHistory.deliverablesTracking?.reduce((sum, d) => sum + (d.requiredQuantity || 0), 0) || 0;
                    const totalComp = selectedCollabForHistory.deliverablesTracking?.reduce((sum, d) => sum + (d.completedQuantity || 0), 0) || 0;
                    return (
                      <span className="font-bold text-primary">
                        {totalComp} / {totalReq} Approved
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Submissions List */}
              {loadingCreatorSubmissions ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading submissions...
                </div>
              ) : creatorSubmissionsList.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-border p-6 space-y-1">
                  <p className="text-sm font-semibold text-foreground">No submissions yet</p>
                  <p className="text-xs text-muted-foreground">
                    You have not uploaded any deliverables for this collaboration.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creatorSubmissionsList.map((sub, idx) => {
                    const isVideo = sub.contentUrl?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || sub.deliverableType === "REEL" || sub.deliverableType === "VIDEO";
                    const formattedDate = new Date(sub.submittedAt || sub.createdAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div
                        key={sub._id || idx}
                        className={cn(
                          "rounded-2xl border p-4 space-y-3 transition",
                          sub.status === "APPROVED"
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : sub.status === "REJECTED"
                            ? "border-red-500/30 bg-red-500/5"
                            : "border-border/80 bg-card"
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold text-[10px] px-2 py-0.5">
                              {sub.deliverableType}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              Submission #{creatorSubmissionsList.length - idx}
                            </span>
                            {sub.version && sub.version > 1 && (
                              <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground border-border px-1.5 py-0">
                                v{sub.version}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {sub.status === "APPROVED" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> APPROVED
                              </Badge>
                            ) : sub.status === "REJECTED" ? (
                              <Badge variant="destructive" className="text-[10px] font-bold flex items-center gap-1">
                                <X className="h-3 w-3" /> REJECTED / CHANGES NEEDED
                              </Badge>
                            ) : sub.status === "RESUBMITTED" ? (
                              <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold">
                                RESUBMITTED · AWAITING REVIEW
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
                                AWAITING BRAND REVIEW
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Rejection Feedback Banner if Rejected */}
                        {sub.status === "REJECTED" && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 space-y-2">
                            <span className="font-bold text-[11px] text-red-600 uppercase flex items-center gap-1">
                              <X className="h-3.5 w-3.5" /> Brand Feedback / Reason:
                            </span>
                            <p className="text-xs text-foreground leading-relaxed">
                              {sub.rejectionReason || "Please review and adjust your work according to the campaign requirements."}
                            </p>

                            {/* Task 8: Rework & Resubmit Action Trigger */}
                            <div className="pt-1 flex items-center justify-between gap-2 border-t border-red-500/20">
                              <span className="text-[10px] text-red-500 font-semibold">
                                Corrected work can be uploaded & resubmitted for review.
                              </span>
                              <Button
                                size="sm"
                                className="h-7 text-xs font-bold rounded-full gradient-sunset text-white border-0 shadow-sm px-4 flex items-center gap-1.5"
                                onClick={() => {
                                  setReworkingSubmission(sub);
                                  setReworkFile(null);
                                  setReworkFilePreview(null);
                                  setReworkCaption(sub.caption || "");
                                }}
                              >
                                <Upload className="h-3 w-3" /> Rework & Resubmit
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Resubmitted info banner if RESUBMITTED */}
                        {sub.status === "RESUBMITTED" && (
                          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-700 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>Corrected work (v{sub.version || 2}) was submitted and is now awaiting Brand review.</span>
                          </div>
                        )}

                        {/* Content Preview */}
                        <div className="rounded-xl overflow-hidden bg-background border border-border/60 max-h-56 flex items-center justify-center">
                          {isVideo ? (
                            <video
                              src={resolveImageUrl(sub.contentUrl)}
                              controls
                              className="max-h-56 w-full object-contain"
                            />
                          ) : (
                            <img
                              src={resolveImageUrl(sub.contentUrl)}
                              alt="Deliverable"
                              className="max-h-56 w-full object-contain"
                            />
                          )}
                        </div>

                        {/* Caption if provided */}
                        {sub.caption && (
                          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-2.5 border border-border/40">
                            <span className="font-semibold text-foreground block text-[10px] uppercase mb-0.5">
                              Your Submission Notes:
                            </span>
                            "{sub.caption}"
                          </div>
                        )}

                        {/* Footer info */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>
                            {sub.status === "RESUBMITTED" ? "Resubmitted" : "Submitted"}: {formattedDate}
                          </span>
                          <a
                            href={resolveImageUrl(sub.contentUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="h-3 w-3" /> View Full File
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                setSelectedCollabForHistory(null);
                setCreatorSubmissionsList([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task 8: Creator Rework & Resubmission Dialog */}
      <Dialog
        open={Boolean(reworkingSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setReworkingSubmission(null);
            setReworkFile(null);
            setReworkFilePreview(null);
            setReworkCaption("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Rework & Resubmit Deliverable
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload your revised {reworkingSubmission?.deliverableType} addressing the Brand's feedback for "{selectedCollabForHistory?.campaign?.title || "Campaign"}".
            </DialogDescription>
          </DialogHeader>

          {reworkingSubmission && (
            <div className="space-y-4 py-2">
              {/* Previous Rejection Feedback Box */}
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 space-y-1 text-xs">
                <span className="font-bold text-[11px] text-red-600 uppercase flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> Previous Brand Feedback (v{reworkingSubmission.version || 1}):
                </span>
                <p className="text-foreground leading-relaxed">
                  "{reworkingSubmission.rejectionReason || "Please review and adjust according to campaign guidelines."}"
                </p>
              </div>

              {/* Corrected File Upload Area */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Upload Corrected Deliverable File <span className="text-red-500">*</span>
                </Label>
                <div className="rounded-2xl border-2 border-dashed border-border/80 bg-secondary/20 p-4 text-center hover:border-primary/50 transition">
                  {reworkFilePreview ? (
                    <div className="space-y-3">
                      {reworkFile?.type?.startsWith("video") ? (
                        <video
                          src={reworkFilePreview}
                          controls
                          className="max-h-48 mx-auto rounded-xl shadow-sm border border-border"
                        />
                      ) : (
                        <img
                          src={reworkFilePreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-xl object-contain shadow-sm border border-border"
                        />
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                        <span className="truncate max-w-[260px] font-medium text-foreground">
                          {reworkFile?.name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full"
                          onClick={() => {
                            setReworkFile(null);
                            setReworkFilePreview(null);
                          }}
                        >
                          Change File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-sm">
                        <Upload className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Click to upload corrected file</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        MP4, MOV, WebM, JPG, PNG, WebP up to 50MB
                      </span>
                      <input
                        type="file"
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error("File exceeds 50MB maximum size limit.");
                              return;
                            }
                            setReworkFile(file);
                            setReworkFilePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Rework Notes / Response */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Notes / Response to Brand (Optional)
                </Label>
                <Textarea
                  placeholder="e.g. Corrected the video to add the brand's required tag and updated the product intro..."
                  value={reworkCaption}
                  onChange={(e) => setReworkCaption(e.target.value)}
                  className="text-xs min-h-[70px] rounded-xl resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                setReworkingSubmission(null);
                setReworkFile(null);
                setReworkFilePreview(null);
                setReworkCaption("");
              }}
              disabled={submittingRework}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-full gradient-sunset text-white font-bold text-xs px-6 shadow-glow"
              disabled={!reworkFile || submittingRework}
              onClick={async () => {
                if (!reworkingSubmission || !reworkFile) {
                  toast.error("Please upload the corrected deliverable file.");
                  return;
                }

                setSubmittingRework(true);
                try {
                  const formData = new FormData();
                  formData.append("file", reworkFile);
                  if (reworkCaption) {
                    formData.append("caption", reworkCaption);
                  }

                  await api.post(`/api/submissions/${reworkingSubmission._id}/resubmit`, formData, {
                    headers: {
                      "Content-Type": "multipart/form-data",
                    },
                  });

                  toast.success(`Deliverable resubmitted successfully as v${(reworkingSubmission.version || 1) + 1}! Brand notified.`);
                  setReworkingSubmission(null);
                  setReworkFile(null);
                  setReworkFilePreview(null);
                  setReworkCaption("");

                  // Refresh history modal submissions
                  if (selectedCollabForHistory) {
                    const refreshed = await api.get(`/api/submissions/${selectedCollabForHistory._id}/submissions`);
                    setCreatorSubmissionsList(refreshed.data?.data?.submissions || []);
                  }
                  setRequestsRefreshKey((k) => k + 1);
                } catch (err) {
                  console.error("Resubmission error:", err);
                  toast.error(err?.response?.data?.message || err.message || "Failed to resubmit deliverable.");
                } finally {
                  setSubmittingRework(false);
                }
              }}
            >
              {submittingRework ? "Resubmitting..." : `Resubmit Deliverable (v${(reworkingSubmission?.version || 1) + 1})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WITHDRAW FUNDS DIALOG (TASK 14) */}
      <Dialog
        open={showWithdrawDialog}
        onOpenChange={(open) => !open && !requestingWithdrawal && setShowWithdrawDialog(false)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Withdraw Funds to Bank
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Request a payout transfer from your available wallet balance directly to your registered bank account.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const amt = Number(withdrawAmountInput);
              const available = Number(creatorWallet.availableBalance || 0);

              if (isNaN(amt) || amt <= 0) {
                toast.error("Please enter a valid withdrawal amount.");
                return;
              }
              if (amt < 100) {
                toast.error("Minimum withdrawal amount is ₹100.");
                return;
              }
              if (amt > available) {
                toast.error(`Amount exceeds available balance (₹${available.toLocaleString("en-IN")}).`);
                return;
              }
              if (!bankDetails || !bankDetails.accountNumber) {
                toast.error("Please configure your bank details in Payment Settings first.");
                return;
              }

              setRequestingWithdrawal(true);
              try {
                const res = await api.post("/api/wallet/withdraw", {
                  amount: amt,
                  withdrawalMethod: "BANK_TRANSFER",
                });

                if (res.data?.success) {
                  toast.success(res.data.message || `Withdrawal request for ₹${amt.toLocaleString("en-IN")} submitted!`);
                  setShowWithdrawDialog(false);
                  setWithdrawAmountInput("");
                  setWalletRefreshKey((k) => k + 1);
                }
              } catch (err) {
                console.error("Withdrawal request error:", err);
                toast.error(err?.response?.data?.message || err.message || "Failed to submit withdrawal request.");
              } finally {
                setRequestingWithdrawal(false);
              }
            }}
            className="space-y-4 pt-1 text-xs"
          >
            {/* Balance Card */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Available to Withdraw</span>
                <div className="text-2xl font-extrabold text-foreground font-display mt-0.5">
                  ₹{Number(creatorWallet.availableBalance || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-[10px] h-7 px-2.5 font-bold"
                onClick={() => setWithdrawAmountInput(String(creatorWallet.availableBalance || 0))}
              >
                Max Amount
              </Button>
            </div>

            {/* Destination Bank Snapshot */}
            <div className="rounded-2xl border border-border bg-secondary/20 p-3.5 space-y-1 text-[11px]">
              <div className="flex justify-between items-center font-semibold text-foreground">
                <span>Destination Bank:</span>
                <span>{bankDetails?.bankName || "Bank Account Not Found"}</span>
              </div>
              {bankDetails?.accountNumber ? (
                <div className="text-muted-foreground text-[10px] space-y-0.5">
                  <p>A/C Holder: <strong className="text-foreground">{bankDetails.accountHolderName || bankDetails.fullName}</strong></p>
                  <p>A/C Number: ••••••••{bankDetails.accountNumber.slice(-4)} | IFSC: {bankDetails.ifsc}</p>
                </div>
              ) : (
                <p className="text-amber-600 text-[10px] font-medium pt-1">
                  ⚠️ No bank details found. Please save your bank details in the Payment Settings section below first.
                </p>
              )}
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <Label htmlFor="withdraw-amt" className="text-xs font-semibold">
                Withdrawal Amount (₹) *
              </Label>
              <Input
                id="withdraw-amt"
                type="number"
                min={100}
                max={creatorWallet.availableBalance || 0}
                placeholder="Enter amount (min ₹100)"
                required
                value={withdrawAmountInput}
                onChange={(e) => setWithdrawAmountInput(e.target.value)}
                className="text-sm font-bold"
              />
              <p className="text-[10px] text-muted-foreground">
                Funds will be reserved immediately and disbursed upon admin review.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                disabled={requestingWithdrawal}
                onClick={() => setShowWithdrawDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-full gradient-sunset text-white font-bold text-xs px-6 shadow-glow"
                disabled={requestingWithdrawal || !bankDetails?.accountNumber || Number(creatorWallet.availableBalance || 0) <= 0}
              >
                {requestingWithdrawal ? "Submitting..." : "Confirm & Submit Withdrawal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CAMPAIGN ESCROW & EARNINGS BREAKDOWN DIALOG */}
      <Dialog
        open={showCampaignBreakdownDialog}
        onOpenChange={(open) => !open && setShowCampaignBreakdownDialog(false)}
      >
        <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Campaign Escrow & Earnings Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Real-time ledger of which brands have funded escrow, 20% platform cut breakdown, deliverables progress, and wallet release status.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2 custom-scrollbar text-xs">
            {/* Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-secondary/20 p-3.5 rounded-2xl border border-border/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Available in Wallet</span>
                <span className="text-base font-extrabold text-foreground font-display text-primary">
                  ₹{Number(creatorWallet.availableBalance || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pending Escrow / Review</span>
                <span className="text-base font-bold text-amber-600 font-display">
                  ₹{(() => {
                    const pendingCollabs = (myRequests || []).filter((c) => c.status === "accepted" && c.paymentStatus === "PAID" && c.paymentReleaseStatus !== "RELEASED");
                    const totalPending = pendingCollabs.reduce((acc, c) => acc + (c.creatorAmount || 0), 0);
                    return totalPending.toLocaleString("en-IN");
                  })()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Lifetime Earned</span>
                <span className="text-base font-bold text-emerald-600 font-display">
                  ₹{Number(creatorWallet.totalEarned || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Campaign-by-Campaign List */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                All Campaign Collaborations ({(myRequests || []).filter(c => c.status === "accepted").length})
              </h4>

              {(!myRequests || myRequests.filter(c => c.status === "accepted").length === 0) ? (
                <div className="py-8 text-center border border-dashed border-border rounded-2xl">
                  <Wallet className="h-8 w-8 mx-auto text-muted-foreground/30 mb-1" />
                  <p className="font-semibold text-foreground">No active campaign collaborations yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    When you apply and get accepted by brands, escrow details will appear here.
                  </p>
                </div>
              ) : (
                myRequests
                  .filter((c) => c.status === "accepted")
                  .map((collab) => {
                    const brandTotal = collab.brandTotal || collab.proposedAmount || (collab.creatorAmount ? Math.round(collab.creatorAmount / 0.8) : 0);
                    const pravixoFee = collab.pravixoFee || Math.round(brandTotal * 0.20);
                    const creatorNet = collab.creatorAmount || (brandTotal - pravixoFee);
                    const isBrandPaid = collab.paymentStatus === "PAID";
                    const isReleased = collab.paymentReleaseStatus === "RELEASED";

                    return (
                      <div
                        key={collab._id}
                        className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm hover:border-primary/40 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-foreground block truncate">
                              {collab.campaign?.title || "Campaign Collaboration"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Brand: <strong>{collab.brandProfile?.fullName || "Brand Partner"}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {isBrandPaid ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] font-bold">
                                ✓ Brand Paid Escrow
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px] font-semibold">
                                ⏳ Brand Payment Pending
                              </Badge>
                            )}

                            {isReleased ? (
                              <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 text-[10px] font-bold">
                                💰 Released to Wallet
                              </Badge>
                            ) : isBrandPaid ? (
                              <Badge variant="outline" className="bg-secondary text-muted-foreground text-[10px]">
                                Escrow Protected
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        {/* Financial Breakdown Table */}
                        <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-2.5 rounded-xl border border-border/50 text-[11px]">
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Brand Budget</span>
                            <span className="font-bold text-foreground">₹{brandTotal.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Pravixo Cut (20%)</span>
                            <span className="font-bold text-muted-foreground">- ₹{pravixoFee.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 block uppercase font-bold">Your Net Payout</span>
                            <span className="font-bold text-emerald-600">₹{creatorNet.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        {/* Deliverables & Actions */}
                        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                          <span>
                            Deliverables: {collab.deliverablesTracking?.filter(d => (d.completedQuantity || 0) >= (d.requiredQuantity || 1)).length || 0} / {collab.deliverablesTracking?.length || 1} Completed
                          </span>
                          <Link
                            to={collab.conversationId ? `/messages?conversationId=${collab.conversationId}` : `/messages?recipientId=${collab.brandId}`}
                            className="font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" /> View In Chat &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setShowCampaignBreakdownDialog(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="rounded-full gradient-sunset text-white font-bold text-xs px-5 shadow-glow"
              onClick={() => {
                setShowCampaignBreakdownDialog(false);
                setShowWithdrawDialog(true);
              }}
            >
              Withdraw Available Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FOLLOWERS / FOLLOWING LIST MODAL */}
      <Dialog
        open={!!followModalType}
        onOpenChange={(open) => {
          if (!open) setFollowModalType(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {followModalType === "followers" ? "Followers" : "Following"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {followModalType === "followers"
                ? "People and brands following your profile."
                : "People and brands you are currently following."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 max-h-80 overflow-y-auto space-y-3 pr-1">
            {loadingFollowList ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading accounts...
              </div>
            ) : followListUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No accounts found.
              </div>
            ) : (
              followListUsers.map((u) => {
                const userAvatar = resolveImageUrl(u.avatarUrl) || u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || "User")}&background=random`;
                return (
                  <div
                    key={u._id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={userAvatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback";
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">
                          {u.fullName || "User"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {u.handle ? `@${u.handle.replace("@", "")}` : (u.role ? u.role.toUpperCase() : "")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {u.role && u.role !== "creator" && (
                        <Link
                          to={`/messages?recipientId=${u._id}`}
                          onClick={() => setFollowModalType(null)}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
                            title="Send Message"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}

                      {followModalType === "following" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full text-[10px] px-2.5 border-border hover:border-destructive hover:text-destructive text-muted-foreground"
                          onClick={() => handleUnfollowUser(u._id)}
                        >
                          <UserMinus className="h-3 w-3 mr-1" /> Unfollow
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ===== SUBMIT TASK MODAL ===== */}
      <Dialog open={showSubmitTaskModal} onOpenChange={(open) => { setShowSubmitTaskModal(open); if (!open) { setSelectedTask(null); setTaskProofUrl(""); setTaskNotes(""); } }}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">Submit Task</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedTask ? `"${selectedTask.title}" — paste your live content link below.` : "Submit your deliverable proof."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Proof / Content URL *</label>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                placeholder="https://www.instagram.com/p/..."
                value={taskProofUrl}
                onChange={(e) => setTaskProofUrl(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Paste the public link to your published reel, post, story or video.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Additional Notes (optional)</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground resize-none"
                placeholder="Any notes for the brand..."
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowSubmitTaskModal(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-full gradient-sunset text-white border-0 shadow-glow font-semibold"
              disabled={submittingTaskProof || !taskProofUrl.trim()}
              onClick={handleSubmitTaskProof}
            >
              {submittingTaskProof ? "Submitting..." : "Submit Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== CAMPAIGN DETAIL MODAL ===== */}
      <Dialog open={!!selectedCampaignDetail} onOpenChange={(open) => { if (!open) setSelectedCampaignDetail(null); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
          {selectedCampaignDetail && (() => {
            const hasTiers = Array.isArray(selectedCampaignDetail.tiers) && selectedCampaignDetail.tiers.length > 0;
            const sortedTiers = hasTiers
              ? [...selectedCampaignDetail.tiers].sort((a, b) => (Number(a.minFollowers) || 0) - (Number(b.minFollowers) || 0))
              : [];
            const minRequiredAcrossTiers = hasTiers ? (sortedTiers[0]?.minFollowers || 0) : 0;
            const reqFollowers = Number(selectedCampaignDetail.minFollowers || 0);

            const meetsFollowerCriteria = hasTiers
              ? creatorTotalFollowers >= minRequiredAcrossTiers
              : (reqFollowers === 0 || creatorTotalFollowers >= reqFollowers);

            const matchedTier = hasTiers
              ? [...sortedTiers].reverse().find(t => creatorTotalFollowers >= (Number(t.minFollowers) || 0))
              : null;

            const minBudVal = selectedCampaignDetail.minBudgetPerCreator ?? selectedCampaignDetail.budget?.min ?? 0;
            const maxBudVal = selectedCampaignDetail.maxBudgetPerCreator ?? selectedCampaignDetail.budget?.max ?? 0;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-2 pr-6">
                    <div>
                      <DialogTitle className="font-display text-lg font-bold leading-tight">
                        {selectedCampaignDetail.title}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        by {selectedCampaignDetail.brand?.fullName || "Brand Partner"}
                      </DialogDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs h-8 px-3 shrink-0 flex items-center gap-1.5"
                      onClick={() => handleShareCampaign(selectedCampaignDetail)}
                      title="Share / Refer this Campaign"
                    >
                      <Share2 className="h-3.5 w-3.5 text-primary" /> Share Link
                    </Button>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Follower / Tier Requirement Criteria Tag */}
                  {hasTiers ? (
                    <div className={cn(
                      "p-3 rounded-2xl border text-xs flex items-center justify-between gap-3",
                      meetsFollowerCriteria
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                    )}>
                      <div className="flex items-center gap-2">
                        {meetsFollowerCriteria ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold">
                            {meetsFollowerCriteria
                              ? `You Qualify for ${matchedTier ? (matchedTier.minFollowers >= 1000 ? `${(matchedTier.minFollowers / 1000).toFixed(0)}k+ Tier` : `${matchedTier.minFollowers} Tier`) : 'Tiers'}!`
                              : `Requires Min ${minRequiredAcrossTiers >= 1000 ? `${(minRequiredAcrossTiers / 1000).toFixed(0)}k+` : minRequiredAcrossTiers} Followers`}
                          </p>
                          <p className="text-[11px] opacity-90">
                            {meetsFollowerCriteria
                              ? `Your profile has ${creatorTotalFollowers.toLocaleString()} followers. You can apply and claim the qualified perk options.`
                              : `Your profile has ${creatorTotalFollowers.toLocaleString()} followers. You can share this link with other creators.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : reqFollowers > 0 ? (
                    <div className={cn(
                      "p-3 rounded-2xl border text-xs flex items-center justify-between gap-3",
                      meetsFollowerCriteria
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                    )}>
                      <div className="flex items-center gap-2">
                        {meetsFollowerCriteria ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold">
                            Min {reqFollowers >= 1000 ? `${(reqFollowers / 1000).toFixed(0)}k+` : reqFollowers.toLocaleString()} Followers Required
                          </p>
                          <p className="text-[11px] opacity-90">
                            {meetsFollowerCriteria
                              ? `You have ${creatorTotalFollowers.toLocaleString()} followers and are eligible to apply!`
                              : `Your profile has ${creatorTotalFollowers.toLocaleString()} followers. You can refer this campaign to other creators.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Condition-Based Tiers / Perk Options Breakdown */}
                  {hasTiers && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Condition-Based Perk Options & Rewards
                      </p>
                      <div className="space-y-2">
                        {sortedTiers.map((tier, idx) => {
                          const isQualified = creatorTotalFollowers >= (Number(tier.minFollowers) || 0);
                          const isHighest = matchedTier && matchedTier.minFollowers === tier.minFollowers;

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-colors",
                                isHighest
                                  ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                                  : isQualified
                                  ? "bg-emerald-500/5 border-emerald-500/20"
                                  : "bg-secondary/15 border-border/40 opacity-70"
                              )}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">
                                    {tier.minFollowers >= 1000 ? `${(tier.minFollowers / 1000).toFixed(0)}k+` : tier.minFollowers} Followers Condition
                                  </span>
                                  {isHighest ? (
                                    <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/20">
                                      ✨ Your Best Match
                                    </span>
                                  ) : isQualified ? (
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                      Qualified ✓
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded">
                                      Need {((tier.minFollowers || 0) - creatorTotalFollowers).toLocaleString()} more
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-foreground/90 mt-1">
                                  🎁 {tier.reward || "Food Voucher / Product Perk"}
                                  {tier.cashAmount ? ` + 💵 ₹${Number(tier.cashAmount).toLocaleString("en-IN")} Cash` : ""}
                                </p>
                                {tier.perks && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Note: {tier.perks}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Brand info */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/20 border border-border/50">
                    <img
                      src={selectedCampaignDetail.brand?.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${selectedCampaignDetail.brand?.fullName}`}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover border border-border"
                      onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=brand"; }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{selectedCampaignDetail.brand?.fullName || "Brand Partner"}</p>
                      <p className="text-xs text-muted-foreground">{selectedCampaignDetail.brand?.category || "Brand"} • {selectedCampaignDetail.location || "Pan India"}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Campaign Brief</p>
                    <p className="text-xs text-muted-foreground leading-relaxed bg-background/50 p-3 rounded-xl border border-border/40 whitespace-pre-wrap">{selectedCampaignDetail.description}</p>
                  </div>

                  {/* Budget & Timeline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-secondary/10 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Creator Budget</p>
                      <p className="text-sm font-bold text-foreground">
                        ₹{minBudVal.toLocaleString()} – ₹{maxBudVal.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/10 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Timeline</p>
                      <p className="text-sm font-bold text-foreground">
                        {selectedCampaignDetail.startDate ? new Date(selectedCampaignDetail.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Any"} – {selectedCampaignDetail.endDate ? new Date(selectedCampaignDetail.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Open"}
                      </p>
                    </div>
                  </div>

                  {/* Deliverables */}
                  {selectedCampaignDetail.deliverables && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Required Deliverables</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(selectedCampaignDetail.deliverables) ? (
                          selectedCampaignDetail.deliverables.map((d, i) => (
                            <span key={i} className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                              {d.quantity}× {d.type}
                            </span>
                          ))
                        ) : (
                          <>
                            {selectedCampaignDetail.deliverables.reels > 0 && <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">{selectedCampaignDetail.deliverables.reels}x Reel</span>}
                            {selectedCampaignDetail.deliverables.posts > 0 && <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">{selectedCampaignDetail.deliverables.posts}x Post</span>}
                            {selectedCampaignDetail.deliverables.stories > 0 && <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">{selectedCampaignDetail.deliverables.stories}x Story</span>}
                            {selectedCampaignDetail.deliverables.videos > 0 && <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">{selectedCampaignDetail.deliverables.videos}x Video</span>}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Categories / niches */}
                  {selectedCampaignDetail.targetNiches?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Target Niches</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCampaignDetail.targetNiches.map((n, i) => (
                          <span key={i} className="text-xs bg-secondary/40 text-foreground px-2.5 py-0.5 rounded-full border border-border/60">{n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1 rounded-full text-xs" onClick={() => setSelectedCampaignDetail(null)}>
                    Close
                  </Button>
                  {userApprovedCampaignIds.has(String(selectedCampaignDetail._id)) ? (
                    <Button disabled className="flex-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">Approved ✓</Button>
                  ) : userRequestedCampaignIds.has(String(selectedCampaignDetail._id)) ? (
                    <Button disabled className="flex-1 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">Applied ✓</Button>
                  ) : !meetsFollowerCriteria ? (
                    <Button
                      className="flex-1 rounded-full gradient-sunset text-white border-0 shadow-glow font-semibold text-xs flex items-center justify-center gap-1.5"
                      onClick={() => {
                        handleShareCampaign(selectedCampaignDetail);
                        setSelectedCampaignDetail(null);
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Refer Another Creator
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 rounded-full gradient-sunset text-white border-0 shadow-glow font-semibold text-xs"
                      onClick={() => {
                        setSelectedCampaignForDiscovery(selectedCampaignDetail);
                        setSelectedTierForJoin(matchedTier || null);
                        setJoinProposedRate(matchedTier?.cashAmount ? String(matchedTier.cashAmount) : selectedCampaignDetail.minBudgetPerCreator ? String(selectedCampaignDetail.minBudgetPerCreator) : "");
                        setJoinPitch(`Hi ${selectedCampaignDetail.brand?.fullName || "there"}! I'm excited to collaborate on your "${selectedCampaignDetail.title}" campaign.`);
                        setSelectedCampaignDetail(null);
                      }}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 1. INSTAGRAM CREATE / PUBLISH DELIVERABLE MODAL */}
      {/* ========================================================= */}
      <Dialog open={showAddPortfolioModal} onOpenChange={setShowAddPortfolioModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <span className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white">
                <Camera className="h-4 w-4" />
              </span>
              Add to Creator Portfolio
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload past campaign deliverables (Posts, Reels, Stories) to showcase to brands.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Deliverable Format *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "post", label: "Post (1:1)", icon: Camera, color: "text-blue-500" },
                  { id: "reel", label: "Reel / Video", icon: Film, color: "text-pink-500" },
                  { id: "story", label: "Story", icon: Sparkles, color: "text-amber-500" },
                ].map((fmt) => {
                  const Icon = fmt.icon;
                  const isSelected = newPortfolioForm.type === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setNewPortfolioForm((f) => ({ ...f, type: fmt.id }))}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all",
                        isSelected
                          ? "border-pink-500 bg-pink-500/10 text-foreground ring-1 ring-pink-500/50"
                          : "border-border bg-card hover:bg-secondary/50 text-muted-foreground"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 mb-1.5", fmt.color)} />
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media Upload Box */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Media File (Photo or Video) *
              </label>
              {newPortfolioForm.filePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-black max-h-56 flex items-center justify-center group">
                  {newPortfolioForm.file?.type?.startsWith("video/") ? (
                    <video
                      src={newPortfolioForm.filePreview}
                      className="max-h-56 w-auto object-contain"
                      controls
                    />
                  ) : (
                    <img
                      src={newPortfolioForm.filePreview}
                      alt="Preview"
                      className="max-h-56 w-auto object-contain"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setNewPortfolioForm((f) => ({ ...f, file: null, filePreview: null }))}
                    className="absolute top-2 right-2 bg-destructive text-white p-1.5 rounded-full shadow-lg hover:opacity-90 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-semibold text-foreground">Click to upload photo or reel video</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WEBP, MP4, MOV (up to 50MB)</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const preview = URL.createObjectURL(file);
                      setNewPortfolioForm((f) => ({ ...f, file, filePreview: preview }));
                    }}
                  />
                </label>
              )}
            </div>

            {/* Brand Collaboration Tag */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Brand Collaborator / Handle (Optional)
              </label>
              <Input
                placeholder="e.g. @zara, @nike, @myntra"
                value={newPortfolioForm.brandTag}
                onChange={(e) => setNewPortfolioForm((f) => ({ ...f, brandTag: e.target.value }))}
                className="text-xs rounded-xl"
              />
            </div>

            {/* Caption & Hashtags */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Caption & Hashtags (Optional)
              </label>
              <Textarea
                placeholder="Write a caption... e.g. 'Loved working with @zara on their summer launch! ✨ #fashion #sponsored'"
                value={newPortfolioForm.caption}
                onChange={(e) => setNewPortfolioForm((f) => ({ ...f, caption: e.target.value }))}
                className="text-xs rounded-xl min-h-[70px]"
              />
            </div>

            {/* Engagement Metrics Showcase */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Likes Count
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newPortfolioForm.likesCount}
                  onChange={(e) => setNewPortfolioForm((f) => ({ ...f, likesCount: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Views / Reach Count
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newPortfolioForm.viewsCount}
                  onChange={(e) => setNewPortfolioForm((f) => ({ ...f, viewsCount: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddPortfolioModal(false)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={uploadingPortfolioItem || !newPortfolioForm.file}
              onClick={handleCreateInstagramPortfolioItem}
              className="rounded-full gradient-sunset text-white border-0 text-xs font-semibold"
            >
              {uploadingPortfolioItem ? "Publishing..." : "Publish to Portfolio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 2. INSTAGRAM-STYLE INTERACTIVE LIGHTBOX & POST VIEWER */}
      {/* ========================================================= */}
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
                  alt={selectedPortfolioPost.caption || "Portfolio post"}
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
                      src={resolveImageUrl(profile?.avatarUrl) || "https://api.dicebear.com/9.x/avataaars/svg?seed=Creator"}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold leading-tight truncate">{displayName}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">@{handle?.replace(/^@+/, "") || "creator"}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePortfolioImage(selectedPortfolioPost._id)}
                  className="text-destructive hover:bg-destructive/10 h-7 px-2 rounded-lg text-xs shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
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
                        src={resolveImageUrl(profile?.avatarUrl) || "https://api.dicebear.com/9.x/avataaars/svg?seed=Creator"}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed break-words">
                        <span className="font-bold mr-1.5">{displayName}</span>
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
                        <button
                          type="button"
                          onClick={() => handleDeletePortfolioComment(commentId)}
                          className="opacity-0 group-hover/comm:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                          title="Delete comment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
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
                      onClick={() => document.getElementById("portfolio-comment-input")?.focus()}
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
                    id="portfolio-comment-input"
                    placeholder="Add a comment..."
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

      {/* FULL-SIZE MEDIA PREVIEW MODAL (BANNER / AVATAR LIGHTBOX) */}
      {mediaPreviewModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setMediaPreviewModal(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 transition-colors rounded-full hover:bg-white/10 z-50 cursor-pointer"
            onClick={() => setMediaPreviewModal(null)}
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative max-w-4xl max-h-[90vh] bg-card/95 border border-border/80 rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-3 py-2 border-b border-border/50 text-xs font-semibold text-muted-foreground">
              <span>{mediaPreviewModal.title || "Image Preview"}</span>
              <div className="flex items-center gap-2">
                {mediaPreviewModal.type === "avatar" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMediaPreviewModal(null);
                      setIsAvatarPickerOpen(true);
                    }}
                    className="h-7 text-xs rounded-full"
                  >
                    <Sparkles className="h-3 w-3 mr-1 text-pink-500" /> Change Avatar
                  </Button>
                )}
                {mediaPreviewModal.type === "cover" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMediaPreviewModal(null);
                      coverFileRef.current?.click();
                    }}
                    className="h-7 text-xs rounded-full"
                  >
                    <Camera className="h-3 w-3 mr-1 text-blue-500" /> Change Banner
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={mediaPreviewModal.url}
                alt={mediaPreviewModal.title}
                className={cn(
                  "max-h-[75vh] w-auto object-contain rounded-xl shadow-lg",
                  mediaPreviewModal.type === "avatar" ? "max-w-[320px] rounded-full aspect-square border-4 border-primary/20" : "max-w-full"
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* ADD REAL LIVE SOCIAL FEED MODAL */}
      <Dialog open={showAddSocialFeedModal} onOpenChange={setShowAddSocialFeedModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border-border/80 text-foreground">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-center shadow-glow mb-1">
              <Film className="w-6 h-6" />
            </div>
            <DialogTitle className="font-outfit text-xl font-bold text-center">
              Add Real Reel / Post Link
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Paste the link to your live Instagram Reel or YouTube Short. Thumbnail and live metrics are auto-fetched instantly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomSocialFeed} className="space-y-4 pt-2 text-xs">
            {/* Post/Reel Direct URL with Auto-Fetch */}
            <div>
              <Label className="text-[11px] font-semibold flex items-center justify-between">
                <span>Post / Reel / Video Link *</span>
                {isFetchingPostMetadata && (
                  <span className="text-[10px] text-primary flex items-center gap-1 font-normal animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Auto-extracting details...
                  </span>
                )}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  placeholder="https://instagram.com/reel/C... or https://youtube.com/shorts/..."
                  required
                  value={newSocialFeedForm.postUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewSocialFeedForm({ ...newSocialFeedForm, postUrl: val });
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (pasted && (pasted.includes("instagram.com") || pasted.includes("youtube.com") || pasted.includes("youtu.be"))) {
                      setTimeout(() => handleAutoExtractPostMetadata(pasted), 100);
                    }
                  }}
                  onBlur={() => {
                    if (newSocialFeedForm.postUrl && (!newSocialFeedForm.thumbnail || newSocialFeedForm.thumbnail.includes("unsplash"))) {
                      handleAutoExtractPostMetadata(newSocialFeedForm.postUrl);
                    }
                  }}
                  className="h-9 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!newSocialFeedForm.postUrl?.trim() || isFetchingPostMetadata}
                  onClick={() => handleAutoExtractPostMetadata(newSocialFeedForm.postUrl)}
                  className="h-9 px-3 text-xs rounded-xl bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-medium"
                >
                  {isFetchingPostMetadata ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  {isFetchingPostMetadata ? "Fetching..." : "Auto Fetch"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Tip: Simply paste your Instagram Reel link. Thumbnail, views, likes & comments will load automatically.
              </p>
            </div>

            {/* Live Visual Preview Card */}
            {(newSocialFeedForm.thumbnail || newSocialFeedForm.caption || newSocialFeedForm.postUrl) && (
              <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 flex items-center gap-3.5">
                <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-black/40 border border-border/40 shrink-0 shadow-sm flex items-center justify-center">
                  {newSocialFeedForm.thumbnail ? (
                    <img
                      src={newSocialFeedForm.thumbnail}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <Film className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-[9px] px-1 py-0.5 rounded text-white font-mono uppercase">
                    {newSocialFeedForm.type}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {newSocialFeedForm.badge || "Viral Reel"}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {newSocialFeedForm.platform}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground line-clamp-1">
                    {newSocialFeedForm.caption || "Featured Reel / Post"}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1 text-pink-500 font-semibold">
                      ❤️ {newSocialFeedForm.likes || "25K"}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      💬 {newSocialFeedForm.comments || "450"}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      👁️ {newSocialFeedForm.views || "120K"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Platform & Format Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold">Platform</Label>
                <select
                  value={newSocialFeedForm.platform}
                  onChange={(e) =>
                    setNewSocialFeedForm({ ...newSocialFeedForm, platform: e.target.value })
                  }
                  className="w-full mt-1 bg-background border border-border text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Format</Label>
                <select
                  value={newSocialFeedForm.type}
                  onChange={(e) =>
                    setNewSocialFeedForm({
                      ...newSocialFeedForm,
                      type: e.target.value,
                      badge: e.target.value === "reel" || e.target.value === "short" ? "Viral Reel" : "Top Post",
                    })
                  }
                  className="w-full mt-1 bg-background border border-border text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="reel">Reel / Video</option>
                  <option value="post">Post / Photo</option>
                  <option value="short">Short</option>
                </select>
              </div>
            </div>

            {/* Caption */}
            <div>
              <Label className="text-[11px] font-semibold">Caption / Headline</Label>
              <Input
                placeholder="e.g. 5 Summer Outfits ✨ #OOTD Brand Collab"
                value={newSocialFeedForm.caption}
                onChange={(e) =>
                  setNewSocialFeedForm({ ...newSocialFeedForm, caption: e.target.value })
                }
                className="mt-1 h-9 text-xs"
              />
            </div>

            {/* Auto-extracted Metrics (Likes, Comments, Views) */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Likes Count</Label>
                <Input
                  placeholder="e.g. 25.4K"
                  value={newSocialFeedForm.likes}
                  onChange={(e) =>
                    setNewSocialFeedForm({ ...newSocialFeedForm, likes: e.target.value })
                  }
                  className="mt-1 h-8 text-xs font-medium"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Comments</Label>
                <Input
                  placeholder="e.g. 620"
                  value={newSocialFeedForm.comments}
                  onChange={(e) =>
                    setNewSocialFeedForm({ ...newSocialFeedForm, comments: e.target.value })
                  }
                  className="mt-1 h-8 text-xs font-medium"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Views / Reach</Label>
                <Input
                  placeholder="e.g. 180K"
                  value={newSocialFeedForm.views}
                  onChange={(e) =>
                    setNewSocialFeedForm({ ...newSocialFeedForm, views: e.target.value })
                  }
                  className="mt-1 h-8 text-xs font-medium"
                />
              </div>
            </div>

            {/* Custom Cover Thumbnail Image URL */}
            <div>
              <Label className="text-[11px] font-semibold">Cover / Thumbnail Image URL</Label>
              <Input
                type="url"
                placeholder="https://... extracted cover thumbnail"
                value={newSocialFeedForm.thumbnail}
                onChange={(e) =>
                  setNewSocialFeedForm({ ...newSocialFeedForm, thumbnail: e.target.value })
                }
                className="mt-1 h-8 text-xs text-muted-foreground font-mono"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddSocialFeedModal(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isFetchingPostMetadata}
                className="rounded-full gradient-sunset text-white font-bold text-xs px-6 shadow-glow"
              >
                Save & Publish to Media Kit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AVATAR PICKER MODAL */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        role="creator"
        currentAvatar={resolveImageUrl(profile?.avatarUrl) || profile?.avatar || getGenderAvatar(profile?.fullName || displayName, creatorGender, "creator")}
        onSelectAvatar={handleSelectAvatarPreset}
      />
    </div>
  );
}

export default DashboardInfluencer;
