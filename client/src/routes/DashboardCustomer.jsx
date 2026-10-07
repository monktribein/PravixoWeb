import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Bookmark,
  Clock,
  Filter,
  Heart,
  Search,
  Trash2,
  History,
  Save,
  Edit2,
  UserPlus,
  Check,
  X,
  CheckCircle2,
  Camera,
  ImageIcon,
  LayoutGrid,
  SlidersHorizontal,
  Upload,
  Plus,
  Star,
  Globe,
  Users,
  Building2,
  MessageCircle,
  Sparkles,
  Percent,
  ExternalLink,
  Activity,
  CreditCard,
  Eye,
  Megaphone,
  Share2,
  Gift,
  Copy,
  Film,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Shield,
  IndianRupee,
  Loader2,
  HelpCircle,
  AlertCircle,
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";


import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaYoutube,
  FaTwitter,
} from "react-icons/fa";

import { Button } from "@/components/ui/Button";
import { CreatorOffersSidebarWidget } from "@/components/offers/CreatorOffersSidebarWidget";
import { MultiRoleOfferForm } from "@/components/offers/CreatorOfferForm";
import { AvatarPickerModal } from "@/components/avatar/AvatarPickerModal";
import { getGenderAvatar, DEFAULT_BANNER_IMAGES, DEFAULT_BANNERS as DEFAULT_BANNER_FALLBACKS } from "@/utils/avatar";

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

import { Badge } from "@/components/ui/Badge";
import {
  formatFollowers,
  influencers,
  CATEGORY_OPTIONS,
} from "@/data/influencer";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { SubscriptionTab } from "../components/subscription/SubscriptionTab";
import axios from "axios";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/TextArea";
import { Switch } from "@/components/ui/Switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  "Jaipur",
  "Noida",
  "Gurugram",
  "Goa",
  "Kochi",
  "Other Location",
];

const COMPANY_SIZE_OPTIONS = [
  "1 - 10 employees",
  "11 - 50 employees",
  "50 - 200 employees",
  "200 - 500 employees",
  "500 - 1,000 employees",
  "1,000 - 5,000 employees",
  "5,000 - 10,000 employees",
  "10,000+ employees",
];

import api from "@/lib/api";

function useApiQuery(url, params = {}, enabled = true) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const query = JSON.stringify(params);
  useEffect(() => {
    if (!enabled || !url) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api.get(url, { params }).then((res) => {
      if (!cancelled) {
        const payload = res.data?.data ?? res.data;
        setData(payload !== null && payload !== undefined ? payload : undefined);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err);
        setData(undefined);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url, query, enabled]);
  return { data, error, loading };
}

export function DashboardCustomer() {
  const navigate = useNavigate();
  const { profile, user, loading, updateProfile: updateLocalProfile, fetchProfile } = useAuth();


  const fileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const coverFileRef = useRef(null);

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
    if (url.startsWith("/avatars/") || url.startsWith("/icons/") || url.startsWith("/assets/")) return url;
    let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
    if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${apiUrl}${cleanPath}`;
  };

  const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);
  const { data: pendingRequests = [] } = useApiQuery(`/connections/brand/${profile?._id}/requests?k=${requestsRefreshKey}`, {}, Boolean(profile));

  const { data: approvedCollabs = [] } = useApiQuery(`/connections/brand/${profile?._id}/approved?k=${requestsRefreshKey}`, {}, Boolean(profile));

  const { data: brandTasks = [] } = useApiQuery(`/tasks/brand/${profile?._id}`, {}, Boolean(profile));

  const { data: notifications = [] } = useApiQuery(`/tasks/notifications/${profile?._id}`, {}, Boolean(profile));

  // Campaign Requests Modal & Creator Details Modal States
  const [selectedCampaignForRequests, setSelectedCampaignForRequests] = useState(null);
  const [selectedCreatorForDetails, setSelectedCreatorForDetails] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // Task Assignment Modal States
  const [selectedCollabForTask, setSelectedCollabForTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDeliverables, setTaskDeliverables] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("23:59");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskNotes, setTaskNotes] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Task Review Modal States
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);
  const [reviewingTask, setReviewingTask] = useState(false);

  // Escrow Payments Queries, Mutations, and States
  const { data: brandPayments = [] } = useApiQuery(`/payments/brand/${profile?._id}`, {}, Boolean(profile));
  const [selectedAuditLogPayment, setSelectedAuditLogPayment] = useState(null);
  const [payingId, setPayingId] = useState(null);

  // Deliverables Submissions View & Review Modal (Task 6 & Task 7)
  const [selectedCollabForSubmissions, setSelectedCollabForSubmissions] = useState(null);
  const [collabSubmissionsList, setCollabSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState(null);
  const [rejectingSubmission, setRejectingSubmission] = useState(null);
  const [submissionRejectionReason, setSubmissionRejectionReason] = useState("");
  const [hiredCreatorsModalOpen, setHiredCreatorsModalOpen] = useState(false);
  const [campaignFilterStatus, setCampaignFilterStatus] = useState("ALL");
  const [showApprovedCollabsModal, setShowApprovedCollabsModal] = useState(false);

  // Followers & Following view modal state
  const [followModalType, setFollowModalType] = useState(null); // 'followers' | 'following' | null
  const [followListUsers, setFollowListUsers] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [mediaPreviewModal, setMediaPreviewModal] = useState(null); // { type: 'avatar'|'cover', url: string, title: string }

  const handleSelectAvatarPreset = async (avatarUrl) => {
    if (!profile?._id) return;
    try {
      const res = await api.patch(`/profiles/${profile._id}`, { avatarUrl });
      const updated = res?.data?.data || res?.data?.profile || res?.data;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      if (fetchProfile) fetchProfile();
      toast.success("Brand avatar updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update avatar");
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile?._id) return;
    if (!window.confirm("Are you sure you want to reset your brand logo to default?")) return;
    try {
      const res = await api.delete(`/profiles/${profile._id}/avatar`);
      const updated = res?.data?.data || res?.data?.profile || res?.data;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      if (fetchProfile) fetchProfile();
      toast.success("Brand logo reset to default!");
    } catch (err) {
      console.error("Failed to reset avatar:", err);
      toast.error("Failed to reset logo");
    }
  };

  const handleDeleteCover = async () => {
    if (!profile?._id) return;
    if (!window.confirm("Are you sure you want to remove the brand banner and reset to default?")) return;
    try {
      const res = await api.delete(`/profiles/${profile._id}/cover`);
      const updated = res?.data?.data || res?.data?.profile || res?.data;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      if (fetchProfile) fetchProfile();
      toast.success("Brand banner reset to default!");
    } catch (err) {
      console.error("Failed to reset banner:", err);
      toast.error("Failed to reset banner");
    }
  };

  const fetchFollowCounts = async () => {
    if (!profile?._id) return;
    try {
      const res = await api.get(`/follows/status?targetProfileId=${profile._id}`);
      if (res.data?.data || res.data) {
        const d = res.data?.data || res.data;
        setFollowCounts({
          followers: d.followersCount || 0,
          following: d.followingCount || 0,
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
      const res = await api.get(`/follows/${type}/${profile?._id}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setFollowListUsers(list);
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err);
      toast.error(`Failed to load ${type}`);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const handleUnfollowUser = async (targetId) => {
    try {
      const res = await api.post("/follows/toggle", {
        followerId: profile?._id,
        targetProfileId: targetId,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Unfollowed");
        setFollowListUsers((prev) => prev.filter((u) => u._id !== targetId));
        setFollowCounts((prev) => ({
          ...prev,
          following: Math.max(0, prev.following - 1),
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to unfollow");
    }
  };

  useEffect(() => {
    if (profile?._id) {
      fetchFollowCounts();
    }
  }, [profile?._id]);

  const [searchParams] = useSearchParams();
  // Tab State
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "dashboard");
  // Sub-section quick selector to eliminate excessive scrolling
  const [brandSubSection, setBrandSubSection] = useState(() => searchParams.get("section") || "all");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    setActiveTab(tabParam || "dashboard");
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      setBrandSubSection(sectionParam);
    }
  }, [searchParams]);


  // Popup & Banner State
  const [showOfferPopup, setShowOfferPopup] = useState(false);
  const [activeOffer, setActiveOffer] = useState(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const popupSettings = null; // No popup-settings Express route shared yet
  const { data: offers = [] } = useApiQuery(`/subscriptions/offers`);
  const { data: packages = [] } = useApiQuery(`/subscriptions/packages`);
  const { data: currentSub = null } = useApiQuery(`/subscriptions/user/${profile?._id}`, {}, Boolean(profile));

  const [upgradingId, setUpgradingId] = useState(null);

  const handleUpgradeFromPopup = async (packageId, offerId) => {
    setUpgradingId(packageId);
    try {
      await upgradeSubscription({
        profileId: profile._id,
        packageId,
        offerId,
      });
      toast.success("Package upgraded successfully! Enjoy your new features.");
      setShowOfferPopup(false);
    } catch (err) {
      console.error(err);
      toast.error((err ).message || "Failed to upgrade package");
    } finally {
      setUpgradingId(null);
    }
  };

  useEffect(() => {
    if (profile) {
      checkSubscriptionStatus({ profileId: profile._id }).catch(console.error);
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

    const hasSeenKey = `popup_seen_${profile._id}_${activeOfferRecord?._id || "no_offer"}`;
    const lastSeenTimeKey = `popup_last_seen_${profile._id}`;
    const dontShowUntilKey = `popup_dont_show_until_${profile._id}`;

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

  const [referralRefreshKey, setReferralRefreshKey] = useState(0);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  // Brand Wallet Query
  const { data: brandWalletData = null } = useApiQuery(
    `/wallet/my-wallet?k=${walletRefreshKey}`,
    {},
    Boolean(profile)
  );

  const brandWallet = (brandWalletData && typeof brandWalletData === "object" && !Array.isArray(brandWalletData))
    ? (brandWalletData.wallet || {})
    : {};
  const brandTransactionsList = (brandWalletData && Array.isArray(brandWalletData.recentTransactions))
    ? brandWalletData.recentTransactions
    : [];

  const handleAddFunds = async (e) => {
    e?.preventDefault();
    const amountNum = Number(addFundsAmount);
    if (!amountNum || amountNum < 10) {
      toast.error("Please enter a valid deposit amount of at least ₹10");
      return;
    }

    try {
      setIsAddingFunds(true);
      const res = await api.post("/api/wallet/deposit/order", { amount: amountNum });
      const orderData = res.data?.data || res.data;

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to initialize wallet deposit order.");
      }

      const options = {
        key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Pravixo Platform",
        description: `Add Funds to Brand Wallet (₹${amountNum.toLocaleString()})`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            setIsAddingFunds(true);
            await api.post("/api/wallet/deposit/verify", {
              amount: amountNum,
              gatewayOrderId: response.razorpay_order_id,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature,
            });

            toast.success(`Successfully added ₹${amountNum.toLocaleString()} to your wallet!`);
            setShowAddFundsModal(false);
            setAddFundsAmount("");
            setWalletRefreshKey((k) => k + 1);
          } catch (verifyErr) {
            console.error("Wallet deposit verification failed:", verifyErr);
            toast.error(verifyErr?.response?.data?.message || verifyErr.message || "Payment verification failed.");
          } finally {
            setIsAddingFunds(false);
          }
        },
        prefill: {
          name: profile.fullName || "",
          email: profile.email || "",
          contact: profile.phone || "",
        },
        theme: {
          color: "#EC4899",
        },
        modal: {
          ondismiss: () => {
            setIsAddingFunds(false);
            toast.info("Add funds cancelled.");
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
    } catch (err) {
      console.error("Deposit order error:", err);
      toast.error(err?.response?.data?.message || err.message || "Failed to create deposit order.");
      setIsAddingFunds(false);
    }
  };

  const { data: referralCodeData = null } = useApiQuery(
    `/referrals/my-code?k=${referralRefreshKey}`,
    {},
    Boolean(profile)
  );
  const { data: referralEarnings = { total_earned: 0, active_referrals_count: 0, earnings: [] } } = useApiQuery(
    `/referrals/earnings?page=1&limit=20&k=${referralRefreshKey}`,
    {},
    Boolean(profile)
  );
  const { data: referredListQuery = { total: 0, users: [], totalCommissionEarned: 0 } } = useApiQuery(
    `/referrals/list?limit=100&k=${referralRefreshKey}`,
    {},
    Boolean(profile)
  );

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReferredModal, setShowReferredModal] = useState(false);
  const [isRefreshingReferral, setIsRefreshingReferral] = useState(false);

  // Accordion Section States (one-by-one opening)
  const [openBasicSection, setOpenBasicSection] = useState(true);
  const [openKycSection, setOpenKycSection] = useState(false);
  const [openSocialSection, setOpenSocialSection] = useState(false);
  const [activeSocialTab, setActiveSocialTab] = useState("instagram");
  const [openPortfolioSection, setOpenPortfolioSection] = useState(false);

  // Campaign Pagination State
  const [campaignPage, setCampaignPage] = useState(1);
  const campaignsPerPage = 3;

  // Portfolio tab & view states
  const [portfolioTab, setPortfolioTab] = useState("all");
  const [portfolioLayout, setPortfolioLayout] = useState("carousel"); // "carousel" (scroll x) or "grid"
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState(null);
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
  const [uploadingPortfolioItem, setUploadingPortfolioItem] = useState(false);
  const [newPortfolioForm, setNewPortfolioForm] = useState({
    type: "post",
    file: null,
    filePreview: null,
    caption: "",
    brandTag: "",
    likesCount: 120,
    viewsCount: 1500,
  });
  const [selectedPortfolioPost, setSelectedPortfolioPost] = useState(null);
  const [portfolioCommentText, setPortfolioCommentText] = useState("");
  const [submittingPortfolioComment, setSubmittingPortfolioComment] = useState(false);

  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  const { data: portfolioImages = [] } = useApiQuery(`/portfolio/profile/${profile?._id}?k=${galleryRefreshKey}`, {}, Boolean(profile));

  const [campaignsRefreshKey, setCampaignsRefreshKey] = useState(0);
  const { data: campaigns = [] } = useApiQuery(`/campaigns/brand/${profile?._id}?k=${campaignsRefreshKey}`, {}, Boolean(profile));
  const brandCampaigns = campaigns;

  const { data: reviews = [] } = useApiQuery(`/reviews/creator/${profile?._id}`, {}, Boolean(profile));

  const { data: favsQuery = [] } = useApiQuery(`/favorites`, { brandId: profile?._id }, Boolean(profile));

  const { data: conversations = [] } = useApiQuery(
    `/conversations?profileId=${profile?._id}&role=${profile?.role || "brand"}`,
    {},
    Boolean(profile)
  );

  const { data: allLiveCreators = [] } = useApiQuery(`/profiles`, { role: "creator" });

  // Mutations

  // Campaigns Mutations

const updateProfile = async (payload) => { const res = await api.put(`/profiles/${payload.id}`, payload); return res.data?.data ?? res.data; };
const acceptConnection = async ({ connectionId }) => api.patch(`/connections/${connectionId}/accept`);
const rejectConnection = async ({ connectionId }) => api.patch(`/connections/${connectionId}/reject`);
const toggleFavorite = async ({ brandId, creatorId, remove = true }) => remove ? api.delete(`/favorites`, { data: { brandId, creatorId } }) : api.post(`/favorites`, { brandId, creatorId });
const addPortfolioImage = async ({ profileId, imageFile, sortOrder, metadata }) => {
  const fd = new FormData();
  fd.append("image", imageFile);
  fd.append("profileId", profileId);
  if (sortOrder != null) fd.append("sortOrder", String(sortOrder));
  if (metadata) {
    if (metadata.type) fd.append("type", metadata.type);
    if (metadata.caption) fd.append("caption", metadata.caption);
    if (metadata.brandTag) fd.append("brandTag", metadata.brandTag);
    if (metadata.likesCount != null) fd.append("likesCount", String(metadata.likesCount));
    if (metadata.viewsCount != null) fd.append("viewsCount", String(metadata.viewsCount));
    if (metadata.mediaType) fd.append("mediaType", metadata.mediaType);
    if (metadata.aspectRatio) fd.append("aspectRatio", metadata.aspectRatio);
  }
  return (await api.post(`/portfolio`, fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
};
const removePortfolioImage = async ({ id }) => {
  return (await api.delete(`/portfolio/${id}`)).data;
};
const togglePortfolioLike = async (id) => {
  return (await api.post(`/portfolio/${id}/like`)).data;
};
const addPortfolioComment = async (id, data) => {
  return (await api.post(`/portfolio/${id}/comments`, data)).data;
};
const deletePortfolioComment = async (id, commentId) => {
  return (await api.delete(`/portfolio/${id}/comments/${commentId}`)).data;
};
const setAvatarImage = async ({ file, profileId }) => { const fd = new FormData(); fd.append("image", file); return (await api.post(`/profiles/${profileId || profile._id}/avatar`, fd, { headers: { "Content-Type": "multipart/form-data" } })).data; };
const setCoverImage = async ({ file, profileId }) => { const fd = new FormData(); fd.append("image", file); return (await api.post(`/profiles/${profileId || profile._id}/cover`, fd, { headers: { "Content-Type": "multipart/form-data" } })).data; };

const toggleVisibility = async ({ reviewId, creatorId }) => { const res = await api.patch(`/reviews/${reviewId}/visibility`, { creatorId }); return res.data?.data ?? res.data; };
const submitBrandVerification = async (payload) => api.post(`/profiles/brand-verification`, payload);
const createCampaign = async (payload) => api.post(`/campaigns`, payload);
const updateCampaign = async ({ id, ...payload }) => api.patch(`/campaigns/${id}`, payload);
const removeCampaign = async ({ id }) => api.delete(`/campaigns/${id}`);
const createTask = async (payload) => api.post(`/tasks`, payload);
const reviewTask = async ({ taskId, action }) => api.patch(`/tasks/${taskId}/review`, { action });
const markRead = async ({ notificationId }) => api.patch(`/tasks/notifications/${notificationId}/read`);
const initiatePaymentOrder = async ({ paymentId }) => { const res = await api.post(`/payments/${paymentId}/order`); return res.data?.data ?? res.data; };
const verifyPaymentSignature = async ({ paymentId, ...payload }) => { const res = await api.post(`/payments/${paymentId}/verify`, payload); return res.data?.data ?? res.data; };
const raiseDispute = async ({ paymentId, ...payload }) => api.post(`/payments/${paymentId}/dispute`, payload);
const trackAnalytics = async () => {};
const checkSubscriptionStatus = async () => {};
const upgradeSubscription = async ({ profileId, packageId, offerId }) => api.post(`/subscriptions`, { profileId, packageId, offerId });

const openCollaborationPayment = async (connectionId, userProfile) => {
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
          name: userProfile?.fullName || "",
          email: userProfile?.email || "",
          contact: userProfile?.phone || "",
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

      const triggerVerification = async (payId, ordId, sig) => {
        try {
          await api.post(`/api/payments/collaboration/${connectionId}/verify`, {
            gatewayOrderId: ordId,
            gatewayPaymentId: payId,
            gatewaySignature: sig,
          });
          toast.success("Payment successful! ₹" + ((orderData.amount / 100) || orderData.brandTotal || 0).toLocaleString() + " Escrow secured with Pravixo.");
          resolve(true);
        } catch (verifyErr) {
          console.error("Verification error:", verifyErr);
          toast.error(verifyErr?.response?.data?.message || "Payment verification failed.");
          reject(verifyErr);
        }
      };

      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => {
          try {
            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (response) {
              console.warn("Razorpay payment failed:", response.error);
            });
            rzp.open();
          } catch (rzpInitErr) {
            // Fallback to test simulated instant payment
            console.warn("Razorpay init error in test mode, running simulation:", rzpInitErr);
            const mockPayId = `pay_mock_${Date.now()}`;
            triggerVerification(mockPayId, orderData.orderId, "mock_signature");
          }
        };
        script.onerror = () => {
          // If script blocked or offline, run test verification
          const mockPayId = `pay_mock_${Date.now()}`;
          triggerVerification(mockPayId, orderData.orderId, "mock_signature");
        };
        document.body.appendChild(script);
      } else {
        try {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch (rzpErr) {
          const mockPayId = `pay_mock_${Date.now()}`;
          triggerVerification(mockPayId, orderData.orderId, "mock_signature");
        }
      }
    });
  } catch (err) {
    console.error("Payment error:", err);
    toast.error(err?.response?.data?.message || err?.message || "Payment initiation failed.");
  }
};

  // State variables for profile form
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [startingPrice, setStartingPrice] = useState(0);
  const [isBarterAllowed, setIsBarterAllowed] = useState(false);

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

  // State for preferences
  const [niches, setNiches] = useState("");
  const [budget, setBudget] = useState("");
  const [reach, setReach] = useState("");
  const [regions, setRegions] = useState("");

  // Loading / Action states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Campaign Modal / Form states
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campTitle, setCampTitle] = useState("");
  const [campDescription, setCampDescription] = useState("");
  const [campStartDate, setCampStartDate] = useState("");
  const [campEndDate, setCampEndDate] = useState("");
  const [campCategory, setCampCategory] = useState("");
  const [campLocation, setCampLocation] = useState("Pan India");
  const [campTotalBudget, setCampTotalBudget] = useState("");
  const [campMinBudget, setCampMinBudget] = useState("");
  const [campMaxBudget, setCampMaxBudget] = useState("");
  const [campMinFollowers, setCampMinFollowers] = useState("");
  const [campTiers, setCampTiers] = useState([]);
  const [campReels, setCampReels] = useState(0);
  const [campPosts, setCampPosts] = useState(0);
  const [campStories, setCampStories] = useState(0);
  const [campVideos, setCampVideos] = useState(0);
  const [campActive, setCampActive] = useState(true);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);

  // AI Smart Matchmaker State
  const [aiMatchesModalOpen, setAiMatchesModalOpen] = useState(false);
  const [selectedCampaignForAiMatches, setSelectedCampaignForAiMatches] = useState(null);
  const [aiMatchedCreators, setAiMatchedCreators] = useState([]);
  const [loadingAiMatches, setLoadingAiMatches] = useState(false);
  
  // Accept & Payment Dialog State (Escrow Protection)
  const [acceptPaymentModalReq, setAcceptPaymentModalReq] = useState(null);
  const [acceptingAndOpeningPayment, setAcceptingAndOpeningPayment] = useState(false);
  const [openingSupportChat, setOpeningSupportChat] = useState(false);

  const [showVerificationDialog, setShowVerificationDialog] =
  useState(false);

const [gstNumber, setGstNumber] = useState("");

const [gstCertificateStorageId, setGstCertificateStorageId] =
  useState("");

const [gstFileName, setGstFileName] = useState("");




const [submittingVerification, setSubmittingVerification] =
  useState(false);

  useEffect(() => {
    document.title = "Brand dashboard —  Pravixo";
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && profile && profile.role === "creator") {
      navigate("/dashboard/influencer", { replace: true });
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setHandle(profile.handle || "");
      setCategory(profile.category || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setWebsite(profile.website || "");
      setCompanySize(profile.companySize || "");
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

      // Preferences
      setNiches(profile.prefNiches || "");
      setBudget(profile.prefBudget || "");
      setReach(profile.prefReach || "");
      setRegions(profile.prefRegions || "");
    }
  }, [profile]);

  // Handle category and location lists
  const selectedCategories = category
    ? category
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  const handleSelectCategory = (val) => {
    let updated = [];
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
    let updated =[];
    if (selectedLocations.includes(val)) {
      updated = selectedLocations.filter((c) => c !== val);
    } else {
      updated = [...selectedLocations, val];
    }
    setLocation(updated.join(", "));
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    try {
      const res = await updateProfile({
        id: profile._id,
        fullName,
        handle: handle || undefined,
        category: category || undefined,
        location: location || undefined,
        bio: bio || undefined,
        website: website || undefined,
        companySize: companySize || undefined,
        startingPrice: startingPrice || 0,
        isBarterAllowed: isBarterAllowed,
        // Socials
        instagramHandle: instaHandle || undefined,
        instagramFollowers: instaFollowers,
        facebookHandle: fbHandle || undefined,
        facebookFollowers: fbFollowers,
        linkedinHandle: liHandle || undefined,
        linkedinFollowers: liFollowers,
        youtubeHandle: ytHandle || undefined,
        youtubeFollowers: ytFollowers,
        quoraHandle: quoraHandle || undefined,
        quoraFollowers: quoraFollowers,
        twitterHandle: twHandle || undefined,
        twitterFollowers: twFollowers,
      });
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Brand profile updated successfully!");
    } catch (err) {
      const error = err ;
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Preferences Save
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSavingPrefs(true);
    try {
      const res = await updateProfile({
        id: profile._id,
        prefNiches: niches,
        prefBudget: budget,
        prefReach: reach,
        prefRegions: regions,
      });
      const updated = res?.data || res?.profile || res;
      if (updated && updateLocalProfile) {
        updateLocalProfile(updated);
      }
      toast.success("Hiring preferences updated successfully!");
    } catch (err) {
      const error = err ;
      toast.error(error.message || "Failed to update preferences");
    } finally {
      setSavingPrefs(false);
    }
  };


  // Image uploads (Avatar, Cover, Portfolio)
  const onAvatarUpload = async (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await api.post(`/profiles/${profile._id}/avatar`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = res.data?.data || res.data?.profile || res.data;
      if (updatedProfile && updateLocalProfile) {
        updateLocalProfile(updatedProfile);
      }
      if (fetchProfile) fetchProfile();
      toast.success("Brand logo updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const onCoverUpload = async (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];

    // Quick file check
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      if (coverFileRef.current) coverFileRef.current.value = "";
      return;
    }

    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await api.post(`/profiles/${profile._id}/cover`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = res.data?.data || res.data?.profile || res.data;
      if (updatedProfile && updateLocalProfile) {
        updateLocalProfile(updatedProfile);
      }
      if (fetchProfile) fetchProfile();
      toast.success("Cover banner updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload cover banner");
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const onGalleryUpload = async (e) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadingGallery(true);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("profileId", profile._id);
      form.append("sortOrder", String(portfolioImages?.length || 0));
      await api.post("/portfolio", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGalleryRefreshKey((k) => k + 1);
      toast.success("Gallery image uploaded!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload gallery image");
    } finally {
      setUploadingGallery(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const [gstFile, setGstFile] = useState(null);

  const uploadVerificationFile = (file) => {
    setGstFile(file);
    setGstFileName(file.name);
    setGstCertificateStorageId("selected");
    toast.success(`GST Certificate selected: ${file.name}`);
  };

  const handleVerificationSubmit = async () => {
    if (!profile || !gstNumber || !gstFile) {
      toast.error("Please enter GST number and select GST certificate file.");
      return;
    }

    setSubmittingVerification(true);

    try {
      const form = new FormData();
      form.append("gstCertificate", gstFile);
      form.append("gstNumber", gstNumber);

      const res = await api.post(`/profiles/${profile._id}/kyc-documents`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = res.data?.data || res.data?.profile || res.data;
      if (updatedProfile && updateProfile) {
        updateProfile(updatedProfile);
      }
      toast.success("Verification documents submitted! Under review.");
      setShowVerificationDialog(false);
      setGstFile(null);
      setGstFileName("");
      setGstCertificateStorageId("");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit verification request");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleRemoveGalleryImage = async (id) => {
    try {
      await api.delete(`/portfolio/${id}`);
      setGalleryRefreshKey((k) => k + 1);
      toast.success("Gallery image removed");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove image");
    }
  };

  // Campaigns Handlers
  const openAddCampaignModal = () => {
    setEditingCampaign(null);
    setCampTitle("");
    setCampDescription("");
    setCampStartDate(new Date().toISOString().split("T")[0]);
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setCampEndDate(nextMonth.toISOString().split("T")[0]);
    setCampCategory(CATEGORY_OPTIONS[0] || "General");
    setCampLocation("Pan India");
    setCampTotalBudget("");
    setCampMinBudget("");
    setCampMaxBudget("");
    setCampMinFollowers("");
    setCampTiers([]);
    setCampReels(0);
    setCampPosts(0);
    setCampStories(0);
    setCampVideos(0);
    setCampActive(true);
    setIsCampaignModalOpen(true);
  };

  const openEditCampaignModal = (camp) => {
    setEditingCampaign(camp);
    setCampTitle(camp.title || "");
    setCampDescription(camp.description || "");
    setCampStartDate(camp.startDate ? new Date(camp.startDate).toISOString().split("T")[0] : "");
    setCampEndDate(camp.endDate ? new Date(camp.endDate).toISOString().split("T")[0] : "");
    setCampCategory(camp.category || "");
    setCampLocation(camp.location || "Pan India");
    setCampTotalBudget(camp.totalBudget ? String(camp.totalBudget) : "");
    setCampMinBudget(camp.minBudgetPerCreator ? String(camp.minBudgetPerCreator) : "");
    setCampMaxBudget(camp.maxBudgetPerCreator ? String(camp.maxBudgetPerCreator) : "");
    setCampMinFollowers(camp.minFollowers ? String(camp.minFollowers) : "");
    setCampTiers(Array.isArray(camp.tiers) ? camp.tiers : []);
    setCampReels(camp.deliverables?.reels || 0);
    setCampPosts(camp.deliverables?.posts || 0);
    setCampStories(camp.deliverables?.stories || 0);
    setCampVideos(camp.deliverables?.videos || 0);
    setCampActive(camp.active !== undefined ? camp.active : true);
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!profile) return;

    if (!campTitle.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!campEndDate) {
      toast.error("End date is required");
      return;
    }
    if (!campTotalBudget || Number(campTotalBudget) <= 0) {
      toast.error("Total campaign budget is required");
      return;
    }

    setSavingCampaign(true);
    try {
      const payload = {
        title: campTitle.trim(),
        description: campDescription.trim(),
        startDate: campStartDate ? new Date(campStartDate).getTime() : Date.now(),
        endDate: new Date(campEndDate).getTime(),
        category: campCategory.trim(),
        location: campLocation.trim(),
        totalBudget: Number(campTotalBudget),
        minBudgetPerCreator: Number(campMinBudget) || 0,
        maxBudgetPerCreator: Number(campMaxBudget) || 0,
        minFollowers: Number(campMinFollowers) || 0,
        tiers: Array.isArray(campTiers)
          ? campTiers.filter((t) => t.reward?.trim() || t.minFollowers > 0 || t.cashAmount > 0)
          : [],
        deliverables: {
          reels: Number(campReels) || 0,
          posts: Number(campPosts) || 0,
          stories: Number(campStories) || 0,
          videos: Number(campVideos) || 0,
        },
        active: campActive,
      };

      if (editingCampaign) {
        await updateCampaign({
          id: editingCampaign._id,
          ...payload,
        });
        toast.success("Campaign updated successfully!");
      } else {
        await createCampaign({
          brandId: profile._id,
          ...payload,
        });
        toast.success("Campaign submitted for Admin verification!");
      }
      setIsCampaignModalOpen(false);
      setCampaignsRefreshKey((k) => k + 1);
    } catch (err) {
      const e = err?.response?.data?.message || err?.message || "Failed to save campaign";
      toast.error(e);
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await removeCampaign({ id });
      setCampaignsRefreshKey((k) => k + 1);
      toast.success("Campaign deleted");
    } catch (err) {
      const e = err ;
      toast.error(e.message || "Failed to delete campaign");
    }
  };

  // Reviews Toggles
  const handleToggleVisibility = async (reviewId) => {
    if (!profile) return;
    try {
      const res = await toggleVisibility({
        reviewId,
        creatorId: profile._id,
      });
      if (res.visible) {
        toast.success("Review is now visible on your brand profile");
      } else {
        toast.info("Review is now hidden from your brand profile");
      }
    } catch (err) {
      const e = err ;
      toast.error(e.message || "Failed to update visibility");
    }
  };

  const saved = useMemo(() => {
    if (!favsQuery) return [];
    return favsQuery
      .map((fav) => {
        if (fav.isLive) {
          return {
            id: fav.id,
            name: fav.name,
            avatar: fav.avatarUrl || fav.avatar,
            category: fav.category,
            followers: fav.followers,
            gender: fav.gender || "",
            role: fav.role || "creator",
          };
        } else {
          const staticInf = influencers.find((i) => i.id === fav.id);
          return staticInf
            ? {
                id: staticInf.id,
                name: staticInf.name,
                avatar: staticInf.avatar,
                category: staticInf.category,
                followers: staticInf.followers,
                gender: staticInf.gender || "",
                role: staticInf.role || "creator",
              }
            : null;
        }
      })
      .filter((item) => item !== null);
  }, [favsQuery]);

  const recommendedCreators = useMemo(() => {
    const liveMapped = Array.isArray(allLiveCreators) ? allLiveCreators.map(p => ({
      id: p._id,
      name: p.fullName || p.name,
      avatar: p.avatarUrl || p.avatar,
      category: p.category || "Creator",
      followers: p.followers || "0",
      niches: p.niches || [],
      budget: p.budget || 0,
      region: p.region || "",
      gender: p.gender || "",
      role: p.role || "creator",
    })) : [];

    const allAvailable = [...influencers, ...liveMapped];

    if (!profile) return allAvailable.slice(0, 4);

    const { prefNiches = [], prefRegions = [] } = profile;

    let filtered = allAvailable.filter(c => {
      if (prefNiches.length === 0 && prefRegions.length === 0) return true;
      let matches = false;
      if (prefNiches.length > 0 && Array.isArray(c.niches) && c.niches.some(n => prefNiches.includes(n))) {
         matches = true;
      }
      return matches;
    });

    if (filtered.length === 0) {
      filtered = allAvailable;
    }

    return filtered.slice(0, 4);
  }, [allLiveCreators, profile]);

  const handleCreateBrandPortfolioItem = async () => {
    if (!profile || !newPortfolioForm.file) {
      toast.error("Please choose an image or video file to publish.");
      return;
    }
    setUploadingPortfolioItem(true);
    try {
      await addPortfolioImage({
        profileId: profile._id,
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

      setGalleryRefreshKey((c) => c + 1);
      toast.success(`Published ${newPortfolioForm.type.toUpperCase()} to your showcase!`);
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
      toast.error(err?.response?.data?.message || err?.message || "Failed to publish media item");
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

      if (selectedPortfolioPost?._id === post._id) {
        setSelectedPortfolioPost((prev) => ({
          ...prev,
          likesCount,
          isLiked,
        }));
      }
      setGalleryRefreshKey((c) => c + 1);
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
        userName: fullName || profile?.fullName || "Brand Rep",
        userAvatar: resolveImageUrl(profile?.avatarUrl) || "",
      });

      const updatedComments = res?.data || [];
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: Array.isArray(updatedComments) ? updatedComments : [...(prev.comments || []), {
          userName: fullName || "Brand Rep",
          text: portfolioCommentText.trim(),
          createdAt: new Date(),
        }],
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
      setPortfolioCommentText("");
      setGalleryRefreshKey((c) => c + 1);
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
      const res = await deletePortfolioComment(selectedPortfolioPost._id, commentId);
      const updatedComments = res?.data || (selectedPortfolioPost.comments || []).filter(c => (c._id || c.id) !== commentId);
      setSelectedPortfolioPost((prev) => ({
        ...prev,
        comments: updatedComments,
        commentsCount: Math.max(0, (prev.commentsCount || 1) - 1),
      }));
      setGalleryRefreshKey((c) => c + 1);
      toast.success("Comment deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    }
  };

  const handleSharePortfolioItem = (post) => {
    const url = `${window.location.origin}/dashboard/customer`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Showcase link copied to clipboard!");
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
      setGalleryRefreshKey((current) => current + 1);
      toast.success("Item removed from showcase");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove item");
    }
  };

  const handleRemoveFavorite = async (creatorId) => {
    if (!profile) return;
    try {
      await toggleFavorite({ brandId: profile._id, creatorId });
      toast.success("Removed from favorites");
    } catch (e) {
      toast.error("Failed to remove from favorites");
    }
  };

  // Deliverable Submissions Load & Review Handlers (Feature 6)
  const loadCollabSubmissions = async (collabId) => {
    if (!collabId) return;
    setLoadingSubmissions(true);
    try {
      const res = await api.get(`/api/submissions/${collabId}/submissions`);
      if (res.data?.success && res.data.data) {
        setCollabSubmissionsList(res.data.data.submissions || []);
      }
    } catch (err) {
      console.error("Load submissions error:", err);
      toast.error(err.response?.data?.message || "Failed to load deliverable submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (selectedCollabForSubmissions?._id) {
      loadCollabSubmissions(selectedCollabForSubmissions._id);
    }
  }, [selectedCollabForSubmissions]);

  const handleApproveSubmission = async (submissionId) => {
    if (!submissionId) return;
    setReviewingSubmissionId(submissionId);
    try {
      const res = await api.patch(`/api/submissions/${submissionId}/approve`);
      if (res.data?.success) {
        toast.success(res.data.message || "Deliverable approved successfully!");
        if (selectedCollabForSubmissions?._id) {
          loadCollabSubmissions(selectedCollabForSubmissions._id);
        }
        setRequestsRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Approve submission error:", err);
      toast.error(err.response?.data?.message || "Failed to approve deliverable.");
    } finally {
      setReviewingSubmissionId(null);
    }
  };

  const handleRejectSubmission = async () => {
    if (!rejectingSubmission?._id) return;
    if (!submissionRejectionReason.trim()) {
      toast.error("Please enter a constructive rework reason for the creator.");
      return;
    }
    setReviewingSubmissionId(rejectingSubmission._id);
    try {
      const res = await api.patch(`/api/submissions/${rejectingSubmission._id}/reject`, {
        rejectionReason: submissionRejectionReason.trim(),
      });
      if (res.data?.success) {
        toast.success("Rework feedback sent to creator!");
        setRejectingSubmission(null);
        setSubmissionRejectionReason("");
        if (selectedCollabForSubmissions?._id) {
          loadCollabSubmissions(selectedCollabForSubmissions._id);
        }
        setRequestsRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Reject submission error:", err);
      toast.error(err.response?.data?.message || "Failed to request rework.");
    } finally {
      setReviewingSubmissionId(null);
    }
  };

  const stats = useMemo(() => {
    const totalCamps = campaigns?.length || 0;
    const activeCamps = campaigns?.filter((c) => c.active).length || 0;
    const hiredCount =
      conversations?.filter(
        (c) => c.status === "completed" || c.status === "active",
      ).length || 0;
    return [
      { label: "Campaigns Posted", value: totalCamps.toString() },
      { label: "Creators Hired", value: hiredCount.toString() },
      { label: "Active Campaigns", value: activeCamps.toString() },
      { label: "Success Rate", value: "98%" },
    ];
  }, [campaigns, conversations]);

  const recent = [
    "fashion creators in Mumbai",
    "fitness reels under ₹40,000",
    "tech reviewers 1M+",
    "food bloggers Delhi",
  ];

  const displayName =
    fullName?.split(" ")[0] ||
    profile?.fullName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";
  const bannerList = DEFAULT_BANNER_IMAGES || DEFAULT_BANNER_FALLBACKS;
  const defaultBannerIndex = [...(profile?._id || profile?.userId || "brand")]
    .reduce((total, character) => total + character.charCodeAt(0), 0) % bannerList.length;
  const bannerUrl = resolveImageUrl(profile?.coverUrl) || bannerList[defaultBannerIndex];
  const brandAvatarUrl = resolveImageUrl(profile?.avatarUrl) || profile?.avatar || getGenderAvatar(profile?.fullName || fullName || displayName, "male", "brand");
  const status = profile?.verificationStatus || user?.verificationStatus || "unverified";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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

      {/* COVER BANNER PREVIEW & BRAND PROFILE HEADER (Visible ONLY on Overview Dashboard) */}
      {activeTab === "dashboard" ? (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <section className="relative group h-44 sm:h-56 md:h-64 overflow-hidden bg-muted w-full rounded-b-2xl sm:rounded-b-3xl rounded-t-none shadow-sm border border-border/50">
              <img
                src={bannerUrl}
                alt="Brand profile banner"
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
                    onClick={() => setMediaPreviewModal({ type: "cover", url: bannerUrl, title: "Brand Banner" })}
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

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:py-6">
            <div className="flex flex-row items-start justify-between gap-3 sm:gap-4 relative">
              <div className="flex items-center gap-3 sm:gap-5 -mt-10 sm:-mt-20 z-10 min-w-0">
                {/* AVATAR WITH INSTA-STYLE HOVER/CLICK ACTIONS */}
                <div className="relative group shrink-0">
                  <img
                    src={brandAvatarUrl}
                    alt={displayName}
                    className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-4 border-card bg-muted object-cover shadow-elevated"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getGenderAvatar(profile?.fullName || fullName || displayName, "male", "brand");
                    }}
                  />

                  {/* Logo Quick Hover Menu Trigger Overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-[2px] p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setMediaPreviewModal({ type: "avatar", url: brandAvatarUrl, title: `${fullName || displayName}'s Logo` })}
                      className="hover:scale-110 transition-transform p-1 text-white hover:text-amber-300"
                      title="View full logo"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => avatarFileRef.current?.click()}
                        className="hover:scale-110 transition-transform p-1 text-white hover:text-blue-300"
                        title="Upload custom logo"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAvatarPickerOpen(true)}
                        className="hover:scale-110 transition-transform p-1 text-white hover:text-pink-300"
                        title="Choose Avatar Preset"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                      {profile?.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleDeleteAvatar}
                          className="hover:scale-110 transition-transform p-1 text-white hover:text-rose-400"
                          title="Reset logo to default"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-8 sm:pt-14 min-w-0">
                  <h1 className="font-display text-xl font-bold sm:text-3xl lg:text-4xl flex items-center gap-1.5 sm:gap-2 truncate">
                    {fullName || profile?.fullName || displayName}
                    {status === "verified" && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 shadow-xs" title="Verified Brand">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </h1>
                  {profile && (category || companySize || website) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {category && (
                        <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
                          {category}
                        </Badge>
                      )}
                      {companySize && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Building2 className="h-3 w-3" /> {companySize}
                        </span>
                      )}
                      {website && (
                        <a
                          href={website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-[11px]"
                        >
                          <Globe className="h-3 w-3" /> {website.replace(/https?:\/\/(www\.)?/, "")}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Clean Three-Dots Action Menu - Positioned Right under the banner across all screens */}
              <div className="flex items-center shrink-0 pt-2.5 sm:pt-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-9 w-9 border-border/80 bg-card/80 backdrop-blur-sm hover:bg-secondary cursor-pointer shadow-xs transition-all hover:scale-105"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4 text-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/60 bg-popover/95 backdrop-blur-md">
                    <div className="flex flex-col gap-1">
                      <Link
                        to={`/c/${(profile?.handle || profile?._id || "brand").replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer font-medium text-xs rounded-xl hover:bg-secondary transition-colors text-foreground"
                      >
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>Media Kit</span>
                      </Link>

                      <Link
                        to={`/c/${(profile?.handle || profile?._id || "brand").replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer font-medium text-xs rounded-xl hover:bg-secondary transition-colors text-foreground"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>View Profile</span>
                      </Link>

                      <div className="my-1 h-px bg-border/50" />

                      <button
                        type="button"
                        onClick={() => openFollowModal("followers")}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer text-xs rounded-xl hover:bg-secondary transition-colors text-left w-full"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">Followers</span>
                        </div>
                        <span className="font-bold text-xs bg-secondary/80 px-2 py-0.5 rounded-full text-foreground">
                          {followCounts.followers}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openFollowModal("following")}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer text-xs rounded-xl hover:bg-secondary transition-colors text-left w-full"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">Following</span>
                        </div>
                        <span className="font-bold text-xs bg-secondary/80 px-2 py-0.5 rounded-full text-foreground">
                          {followCounts.following}
                        </span>
                      </button>

                      <div className="my-1 h-px bg-border/50" />

                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/influencer/${profile?._id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Brand profile link copied to clipboard!");
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer font-medium text-xs rounded-xl hover:bg-secondary transition-colors text-left w-full text-foreground"
                      >
                        <Share2 className="h-4 w-4 text-purple-500" />
                        <span>Share Profile Link</span>
                      </button>

                      {status === "pending" && (
                        <div className="px-3 py-2 text-[11px] text-amber-600 bg-amber-500/10 rounded-xl font-medium">
                          Verification Pending
                        </div>
                      )}

                      {status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => setShowVerificationDialog(true)}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer font-medium text-xs rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-left w-full"
                        >
                          <span>Retry Verification</span>
                        </button>
                      )}

                      {status !== "verified" && status !== "pending" && status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => setShowVerificationDialog(true)}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer font-medium text-xs rounded-xl text-primary hover:bg-primary/10 transition-colors text-left w-full"
                        >
                          <Check className="h-4 w-4 text-primary" />
                          <span>Get Verified</span>
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

        {/* CONNECTION REQUESTS AT TOP */}
        {pendingRequests && pendingRequests.length > 0 && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">
                Pending Connection Requests ({pendingRequests.length})
              </h2>
            </div>
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div
                  key={req._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border p-4 bg-secondary/10 hover:bg-secondary/20 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <img src={
                        resolveImageUrl(req.creatorProfile?.avatarUrl) ||
                        getGenderAvatar(req.creatorProfile?.fullName || "Creator", req.creatorProfile?.gender, "creator")
                      }
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover aspect-square border border-border/50 shadow-sm flex-shrink-0"
                     onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(req.creatorProfile?.fullName || "Creator", req.creatorProfile?.gender, "creator"); }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/influencer/${req.creatorId}`}
                          className="font-display text-sm font-semibold hover:text-primary truncate"
                        >
                          {req.creatorProfile?.fullName}
                        </Link>
                        {req.creatorProfile?.handle && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {req.creatorProfile.handle}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          · {new Date(req.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                        <span><strong>Followers:</strong> {req.creatorProfile?.followersCount?.toLocaleString() || "0"}</span>
                        <span>·</span>
                        <span><strong>Platform:</strong> {req.creatorProfile?.platformStr || "Instagram"}</span>
                        <span>·</span>
                        <span><strong>Category:</strong> {req.creatorProfile?.category || "N/A"}</span>
                      </div>
                      {req.campaign && (
                        <div className="mt-2 text-xs bg-background border border-border/40 rounded-xl px-3 py-2">
                          <span className="font-semibold text-foreground block truncate">Campaign: {req.campaign.title}</span>
                          <span className="text-[11px] text-muted-foreground">Budget: {req.campaign.budget} · Status: <span className="capitalize">{req.status}</span></span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground/95 bg-background border border-border/40 rounded-xl p-2.5 mt-2 italic line-clamp-3">
                        "{req.pitch}"
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 flex-shrink-0 self-stretch sm:justify-center">
                    <Link
                      to={`/c/${(req.creatorProfile?.handle || req.creatorId || req.creatorProfile?._id || "creator").replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-initial"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-full border-border hover:border-primary/50 hover:bg-primary/10 hover:text-primary px-4 h-9 flex items-center justify-center gap-1.5 text-xs font-semibold"
                      >
                        <Eye className="h-4 w-4 text-primary" /> View Profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-initial rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-4 h-9 flex items-center justify-center gap-1.5 font-bold shadow-sm cursor-pointer"
                      onClick={() => {
                        setAcceptPaymentModalReq(req);
                      }}
                    >
                      <Check className="h-4 w-4" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-initial rounded-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 px-4 h-9 flex items-center justify-center gap-1.5"
                      onClick={async () => {
                        try {
                          await rejectConnection({ connectionId: req._id });
                          toast.success("Request declined");
                        } catch (err) {
                          toast.error("Failed to decline request");
                        }
                      }}
                    >
                      <X className="h-4 w-4" /> Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

         {/* APPROVED COLLABORATIONS BUTTON BANNER */}
        {approvedCollabs && approvedCollabs.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl border border-border/80 bg-gradient-to-r from-emerald-500/10 via-card to-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-outfit text-base font-bold text-foreground">
                  Approved Collaborations
                </h3>
                <p className="text-xs text-muted-foreground">
                  You have <strong className="text-foreground">{approvedCollabs.length}</strong> active collaboration{approvedCollabs.length > 1 ? "s" : ""} in progress.
                </p>
              </div>
            </div>

            <Button
              className="btn-bouncy rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 shadow-sm flex items-center gap-1.5 shrink-0"
              onClick={() => navigate("/collaborations")}
            >
              <Eye className="h-3.5 w-3.5" /> View Collaborations & Deliverables ({approvedCollabs.length})
            </Button>
          </div>
        )}
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
      {/* MAIN TAB CONTENT */}
      <div className="mt-4 w-full min-w-0">
        {activeTab === "dashboard" ? (
            <div className="w-full space-y-8 font-jakarta">
              {/* EDIT SECTIONS */}
              <div className="space-y-6 w-full min-w-0">
            {/* STATS PREVIEW CARDS */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => {
                const isClickable =
                  s.label === "Creators Hired" ||
                  s.label === "Campaigns Posted" ||
                  s.label === "Active Campaigns";

                const handleClick = () => {
                  if (s.label === "Creators Hired") {
                    setHiredCreatorsModalOpen(true);
                  } else if (s.label === "Campaigns Posted") {
                    setCampaignFilterStatus("ALL");
                    setActiveTab("campaigns");
                  } else if (s.label === "Active Campaigns") {
                    setCampaignFilterStatus("ACTIVE");
                    setActiveTab("campaigns");
                  }
                };

                  return (
                    <div
                      key={s.label}
                      onClick={isClickable ? handleClick : undefined}
                      className={cn(
                        "stat-card-3d flex h-28 flex-col items-center justify-center rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/70 p-4 text-center shadow-soft transition-all duration-200",
                        isClickable &&
                          "cursor-pointer hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 group active:scale-95"
                      )}
                      title={
                        isClickable
                          ? `Click to view ${s.label.toLowerCase()}`
                          : undefined
                      }
                    >
                      <div className="font-outfit text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {s.value}
                      </div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1.5 font-jakarta flex items-center gap-1 group-hover:text-foreground">
                        {s.label}
                        {isClickable && (
                          <span className="text-primary text-[10px] opacity-70 group-hover:opacity-100 font-normal">
                            ↗
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            {/* BRAND PROFILE FORM & ACCORDIONS */}
            <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-outfit text-xl font-bold mb-5 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Edit Brand Details
              </h2>

              <div className="mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img src={
                      resolveImageUrl(profile?.avatarUrl) ||
                      `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile?.fullName || user?.email || "brand"}`
                    }
                    alt=""
                    className="h-20 w-20 rounded-full border border-border object-cover bg-muted"
                   onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback"; }} />
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      {uploadingAvatar ? "Uploading..." : "Upload logo"}
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
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-primary" />
                      Choose Brand Avatar
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

              {/* 1. BASIC DETAILS ACCORDION */}
              <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/60 transition-all mb-4">
                <button
                  type="button"
                  onClick={() => setOpenBasicSection(!openBasicSection)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <div>
                    <h3 className="font-display text-base font-bold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> Basic Information
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Company name, handle, category, HQ location, website, and company size
                    </p>
                  </div>
                  <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", openBasicSection && "rotate-90 text-primary")} />
                </button>

                {openBasicSection && (
                  <div className="p-4 pt-2 border-t border-border/40">
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="fullName">Company Name</Label>
                          <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g., Nike India"
                            className="mt-1.5 rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="handle">Handle</Label>
                          <Input
                            id="handle"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            placeholder="e.g., nikeindia"
                            className="mt-1.5 rounded-xl"
                          />
                        </div>

                        {/* CATEGORY & LOCATION POPOVER SELECTORS */}
                        <div className="flex flex-col gap-1.5">
                          <Label>Industry Category</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
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
                                          className="rounded-full p-0.5 hover:bg-muted cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectCategory(cat);
                                          }}
                                        >
                                          <X className="h-3 w-3 text-muted-foreground" />
                                        </span>
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[var(--radix-popover-trigger-width)] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Search categories..."
                                  className="h-9"
                                />
                                <CommandList className="max-h-[200px] overflow-y-auto">
                                  <CommandEmpty>No category found.</CommandEmpty>
                                  <CommandGroup>
                                    {CATEGORY_OPTIONS.map((cat) => {
                                      const isSelected =
                                        selectedCategories.includes(cat);
                                      return (
                                        <CommandItem
                                          key={cat}
                                          onSelect={() => handleSelectCategory(cat)}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <div
                                            className={cn(
                                              "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                              isSelected
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50",
                                            )}
                                          >
                                            {isSelected && (
                                              <Check className="h-3 w-3" />
                                            )}
                                          </div>
                                          {cat}
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
                          <Label>HQ Location</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
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
                                          className="rounded-full p-0.5 hover:bg-muted cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectLocation(loc);
                                          }}
                                        >
                                          <X className="h-3 w-3 text-muted-foreground" />
                                        </span>
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[var(--radix-popover-trigger-width)] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Search locations..."
                                  className="h-9"
                                />
                                <CommandList className="max-h-[200px] overflow-y-auto">
                                  <CommandEmpty>No location found.</CommandEmpty>
                                  <CommandGroup>
                                    {LOCATION_OPTIONS.map((loc) => {
                                      const isSelected =
                                        selectedLocations.includes(loc);
                                      return (
                                        <CommandItem
                                          key={loc}
                                          onSelect={() => handleSelectLocation(loc)}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <div
                                            className={cn(
                                              "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                              isSelected
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50",
                                            )}
                                          >
                                            {isSelected && (
                                              <Check className="h-3 w-3" />
                                            )}
                                          </div>
                                          {loc}
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
                          <Label htmlFor="website">Website Link</Label>
                          <Input
                            id="website"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="e.g., https://www.nike.com/in"
                            className="mt-1.5 rounded-xl"
                          />
                        </div>

                        <div>
                          <Label htmlFor="companySize">Company Size</Label>
                          <select
                            id="companySize"
                            value={companySize}
                            onChange={(e) => setCompanySize(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring mt-1.5 rounded-xl cursor-pointer"
                          >
                            <option value="">Select size...</option>
                            {COMPANY_SIZE_OPTIONS.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="brandStartingPrice">Starting Campaign Budget / Price (₹)</Label>
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
                            id="brandStartingPrice"
                            type="text"
                            value={startingPrice}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setStartingPrice(val === "" ? "" : Number(val));
                            }}
                            placeholder={isBarterAllowed ? "0 (Barter / Products provided)" : "e.g. 10000"}
                            className="mt-1.5 rounded-xl"
                          />
                          {isBarterAllowed && (
                            <p className="text-[11px] text-emerald-600 font-medium mt-1">
                              ✓ Open to product sponsorship, gifting, or food voucher exchanges with creators.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="bio">About Brand</Label>
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Provide a detailed description of your brand, values, and products..."
                          className="mt-1.5 rounded-xl resize-none"
                          rows={4}
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={savingProfile}
                          className="btn-bouncy rounded-full gradient-sunset border-0 text-white shadow-glow px-7 font-bold text-xs h-9"
                        >
                          {savingProfile ? "Saving Details..." : "Save Basic Details"}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* 2. KYC DOCUMENTS ACCORDION */}
              <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/60 transition-all mb-4">
                <button
                  type="button"
                  onClick={() => setOpenKycSection(!openKycSection)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <div>
                    <h3 className="font-display text-base font-bold flex items-center gap-2">
                      KYC Documents
                      {(profile?.gstCertificateUrl || profile?.verificationStatus === "verified") && (
                        <Badge variant="secondary" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20">
                          Uploaded ✓
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      GST Number and Official Certificate for verified brand badge
                    </p>
                  </div>
                  <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", openKycSection && "rotate-90 text-pink-500")} />
                </button>

                {openKycSection && (
                  <div className="p-4 pt-2 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-4">
                      Update your GST Number and Certificate for official platform verification.
                    </p>
                    <div className="grid gap-6 sm:grid-cols-2 bg-muted/10 p-4 rounded-2xl border border-border">
                      <div className="space-y-2">
                        <Label htmlFor="gstNumberInline" className="text-sm font-semibold">GST Number</Label>
                        <Input
                          id="gstNumberInline"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                          placeholder="Enter GST Number"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">GST Certificate (PDF, JPG, PNG)</Label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-secondary/40 px-4 py-2.5 text-sm font-medium transition-colors">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground truncate">
                              {gstFileName || (profile?.gstCertificateUrl ? "Certificate Uploaded ✓" : "Upload File")}
                            </span>
                            <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => { if (e.target.files?.length) uploadVerificationFile(e.target.files[0]); }} />
                          </label>
                          {(profile?.gstCertificateUrl || gstFile) && (
                            <Button type="button" variant="outline" size="icon" className="shrink-0 h-11 w-11 rounded-xl"
                              onClick={() => profile?.gstCertificateUrl ? window.open(resolveImageUrl(profile.gstCertificateUrl), "_blank") : toast.info("File selected but not yet uploaded")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <Button onClick={handleVerificationSubmit} disabled={submittingVerification || (!gstNumber && !gstFile)} className="rounded-full bg-primary text-primary-foreground px-6 font-semibold h-9 text-xs">
                          {submittingVerification ? "Uploading..." : "Save Documents & Request Verification"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. SOCIAL PRESENCE ACCORDION */}
              <div className="rounded-3xl border border-border/80 overflow-hidden bg-card/70 backdrop-blur-md shadow-sm transition-all mb-5 hover:border-pink-500/30">
                <button
                  type="button"
                  onClick={() => setOpenSocialSection(!openSocialSection)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-foreground">
                          Social Presence & Handles
                        </h3>
                        <Badge variant="secondary" className="text-[10px] font-semibold bg-pink-500/10 text-pink-500 border border-pink-500/20 rounded-full px-2">
                          6 Platforms
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage your official Instagram, Facebook, LinkedIn, YouTube, X, and Quora presence
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
                    {/* Interactive Platform Selector Pills */}
                    {(() => {
                      const platformsList = [
                        {
                          id: "instagram",
                          name: "Instagram",
                          icon: FaInstagram,
                          gradient: "from-pink-500/15 via-purple-500/10 to-transparent",
                          badgeColor: "text-pink-500 bg-pink-500/10 border-pink-500/20",
                          iconColor: "text-pink-500",
                          handle: instaHandle,
                          setHandle: setInstaHandle,
                          placeholder: "@brandname",
                          followers: instaFollowers,
                          setFollowers: setInstaFollowers,
                          prefix: "@",
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
                          placeholder: "brandpage",
                          followers: fbFollowers,
                          setFollowers: setFbFollowers,
                          prefix: "/",
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
                          placeholder: "company/brand",
                          followers: liFollowers,
                          setFollowers: setLiFollowers,
                          prefix: "in/",
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
                          placeholder: "@brandchannel",
                          followers: ytFollowers,
                          setFollowers: setYtFollowers,
                          prefix: "@",
                        },
                        {
                          id: "twitter",
                          name: "X / Twitter",
                          icon: FaTwitter,
                          gradient: "from-slate-400/15 via-slate-500/10 to-transparent",
                          badgeColor: "text-foreground bg-foreground/10 border-foreground/20",
                          iconColor: "text-sky-400",
                          handle: twHandle,
                          setHandle: setTwHandle,
                          placeholder: "@brandhandle",
                          followers: twFollowers,
                          setFollowers: setTwFollowers,
                          prefix: "@",
                        },
                        {
                          id: "quora",
                          name: "Quora",
                          icon: QuoraIcon,
                          gradient: "from-rose-700/15 via-red-600/10 to-transparent",
                          badgeColor: "text-rose-600 bg-rose-600/10 border-rose-600/20",
                          iconColor: "text-rose-600",
                          handle: quoraHandle,
                          setHandle: setQuoraHandle,
                          placeholder: "brand-profile",
                          followers: quoraFollowers,
                          setFollowers: setQuoraFollowers,
                          prefix: "q/",
                        },
                      ];

                      const currentPlat = platformsList.find((p) => p.id === activeSocialTab) || platformsList[0];
                      const Icon = currentPlat.icon;
                      const hasData = Boolean(currentPlat.handle || currentPlat.followers > 0);

                      return (
                        <div className="space-y-4">
                          {/* Horizontal Platform Selector Tabs */}
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {platformsList.map((plat) => {
                              const PIcon = plat.icon;
                              const isSelected = activeSocialTab === plat.id;
                              const isPlatSet = Boolean((plat.handle && plat.handle.trim()) || Number(plat.followers) > 0);

                              return (
                                <button
                                  key={plat.id}
                                  type="button"
                                  onClick={() => setActiveSocialTab(plat.id)}
                                  className={cn(
                                    "flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border cursor-pointer",
                                    isSelected
                                      ? "gradient-sunset text-white border-transparent shadow-glow font-bold scale-[1.02]"
                                      : isPlatSet
                                      ? "bg-card border-border/80 text-foreground"
                                      : "bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  )}
                                >
                                  <PIcon className={cn("h-3.5 w-3.5", isSelected ? "text-white" : plat.iconColor)} />
                                  <span>{plat.name}</span>
                                  {isPlatSet && (
                                    <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-white" : "bg-primary")} />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Platform Detail Form Card */}
                          <div className="relative rounded-3xl border border-border/80 p-5 sm:p-6 transition-all overflow-hidden bg-card/90 shadow-sm">
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", currentPlat.gradient)} />

                            <div className="relative z-10 space-y-4">
                              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-2xl bg-background/90 border border-border/80 shadow-xs flex items-center justify-center shrink-0">
                                    <Icon className={cn("h-5 w-5", currentPlat.iconColor)} />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-bold text-foreground tracking-tight">
                                      {currentPlat.name} Profile
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      Enter your official {currentPlat.name} handle and audience reach
                                    </p>
                                  </div>
                                </div>
                                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0", currentPlat.badgeColor)}>
                                  {hasData ? "Connected" : "Not Set"}
                                </span>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                    <span>Handle / Username</span>
                                  </Label>
                                  <Input
                                    value={currentPlat.handle}
                                    onChange={(e) => currentPlat.setHandle(e.target.value)}
                                    placeholder={currentPlat.placeholder}
                                    className="h-10 text-sm rounded-2xl bg-background/70 border-border/80 focus:bg-background focus:border-primary transition-all font-medium"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                    <span>Followers / Audience Count</span>
                                    {Number(currentPlat.followers) > 0 && (
                                      <span className="text-primary font-bold lowercase">
                                        {Number(currentPlat.followers).toLocaleString()} fans
                                      </span>
                                    )}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={currentPlat.followers || ""}
                                    onChange={(e) => currentPlat.setFollowers(Number(e.target.value))}
                                    placeholder="0"
                                    className="h-10 text-sm rounded-2xl bg-background/70 border-border/80 focus:bg-background focus:border-primary transition-all font-medium"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40">
                      <p className="text-xs text-muted-foreground text-center sm:text-left">
                        ✨ Social stats help creators understand your brand's reach and audience presence.
                      </p>
                      <Button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="btn-bouncy rounded-full gradient-sunset border-0 text-white shadow-glow px-6 font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
                      >
                        {savingProfile ? "Saving..." : "Save Social Handles"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. CREATIVE PORTFOLIO & REELS ACCORDION */}
              <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/60 transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenPortfolioSection(!openPortfolioSection)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <div>
                    <h3 className="font-display text-base font-bold flex items-center gap-2">
                      Brand Creative Showcase & Feed
                      {portfolioImages?.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20">
                          {portfolioImages.length} {portfolioImages.length > 1 ? "media items" : "media item"}
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Showcase past campaigns, Posts, Reels, and product advertisements to creators
                    </p>
                  </div>
                  <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", openPortfolioSection && "rotate-90 text-primary")} />
                </button>

                {openPortfolioSection && (
                  <div className="p-4 pt-2 border-t border-border/40">
                    {/* Format Tabs, View Switcher & Action Buttons */}
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
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Media / Reel / Story
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
                            <h4 className="font-semibold text-sm">No {portfolioTab === "all" ? "media items" : portfolioTab + "s"} added yet</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                              Upload your campaign creatives, promotional reels, and brand assets to showcase your brand to creators.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setShowAddPortfolioModal(true)}
                              className="mt-4 rounded-full gradient-sunset text-white text-xs cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add Media
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
                                alt={item.caption || "Showcase item"}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://api.dicebear.com/9.x/shapes/svg?seed=BrandCreative";
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
                              id="portfolio-carousel-container"
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
                                const container = document.getElementById("portfolio-carousel-container");
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
                                const container = document.getElementById("portfolio-carousel-container");
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
            </div>

            {/* RECOMMENDED CREATORS */}
            <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 shadow-sm mb-6">
              <div className="mb-4">
                <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" /> Recommended Creators
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creators curated for you based on your Hiring Preferences.
                </p>
              </div>
              
              {recommendedCreators.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
                  No creators found matching your preferences.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {recommendedCreators.map((creator) => {
                    const fallbackSrc = getGenderAvatar(creator.name || "Creator", creator.gender, creator.role || "creator");
                    const avatarSrc = resolveImageUrl(creator.avatar) || fallbackSrc;
                    return (
                      <div
                        key={creator.id}
                        className="card-3d flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 p-3.5 hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-border">
                            <img
                              src={avatarSrc}
                              alt={creator.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = fallbackSrc;
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-outfit text-sm font-bold text-foreground">
                              {creator.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {creator.category} • {creator.followers}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-bouncy h-7 rounded-full text-[10px] px-3 font-bold"
                          onClick={() => navigate(`/influencer/${creator.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* REVIEWS VISIBILITY SETTINGS */}
            <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-outfit text-xl font-bold mb-2">
                Reviews from Creators
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Toggle display visibility of feedback and ratings left by creators.
              </p>

              {!reviews ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading reviews...
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border rounded-xl">
                  <Star className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold text-sm text-muted-foreground">
                    No creator reviews received yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reviews from completed creator collaborations will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review._id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border rounded-2xl p-4 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <img src={
                              review.brandAvatar ||
                              `https://api.dicebear.com/9.x/avataaars/svg?seed=${review.brandName}`
                            }
                            alt=""
                            className="h-8 w-8 rounded-full object-cover border border-border shadow-sm aspect-square"
                           onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback"; }} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">
                                {review.brandName}
                              </h4>
                              {review.campaignRef && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] rounded-full"
                                >
                                  {review.campaignRef}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-2.5 w-2.5 ${
                                      star <= review.rating
                                        ? "fill-amber text-amber"
                                        : "text-muted-foreground/30"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(
                                  review.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs">
                          <p className="font-semibold text-foreground">
                            {review.title}
                          </p>
                          <p className="text-muted-foreground mt-0.5">
                            {review.text}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center pt-2 md:pt-0 w-full md:w-auto justify-between border-t md:border-t-0 border-border/40">
                        <div className="text-left md:text-right">
                          <span className="block text-xs font-semibold text-foreground">
                            Public Display
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {review.visible
                              ? "Shown on profile"
                              : "Hidden from profile"}
                          </span>
                        </div>
                        <Switch
                          checked={review.visible}
                          onCheckedChange={() =>
                            handleToggleVisibility(review._id)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HIRING & SAVED PREFERENCES */}
          <div className="grid gap-6 md:grid-cols-2 w-full min-w-0">
            {/* HIRING PREFERENCES PANEL */}
            <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-outfit text-xl font-bold mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" /> Hiring Preferences
              </h2>
              <form
                onSubmit={handleSavePreferences}
                className="space-y-4 text-sm"
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="prefNiches"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Target Niches
                  </Label>
                  <Input
                    id="prefNiches"
                    value={niches}
                    onChange={(e) => setNiches(e.target.value)}
                    placeholder="e.g. Sports, Fitness, Running"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="prefBudget"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Campaign Budget Range
                  </Label>
                  <Input
                    id="prefBudget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. ₹20K - ₹100K per post"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="prefReach"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Target Creator Reach
                  </Label>
                  <Input
                    id="prefReach"
                    value={reach}
                    onChange={(e) => setReach(e.target.value)}
                    placeholder="e.g. 50K+ followers"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="prefRegions"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Preferred Regions
                  </Label>
                  <Input
                    id="prefRegions"
                    value={regions}
                    onChange={(e) => setRegions(e.target.value)}
                    placeholder="e.g. India (Metros)"
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingPrefs}
                  className="w-full rounded-full gradient-sunset border-0 text-white shadow-glow mt-4"
                >
                  <Save className="mr-1.5 h-4 w-4" />{" "}
                  {savingPrefs
                    ? "Updating Preferences..."
                    : "Update Preferences"}
                </Button>
              </form>
            </div>

            {/* SAVED CREATORS (KEPT FROM ORIGINAL) */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-base font-semibold">
                    Saved Creators
                  </h2>
                </div>
                <Link
                  to="/browse"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Browse
                </Link>
              </div>

              {saved.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-8 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    No saved creators yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {saved.map((inf) => {
                    const fallbackSrc = getGenderAvatar(inf.name || "User", inf.gender, inf.role || "creator");
                    const avatarSrc = resolveImageUrl(inf.avatar) || fallbackSrc;
                    return (
                      <div
                        key={inf.id}
                        className="flex items-center gap-3 rounded-2xl border border-border p-3"
                      >
                        <img
                          src={avatarSrc}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover aspect-square flex-shrink-0 border border-border"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = fallbackSrc;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/influencer/${inf.id}`}
                            className="block truncate font-display text-xs font-semibold hover:text-primary"
                          >
                            {inf.name}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">
                            {inf.category} · {formatFollowers(inf.followers || 0)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFavorite(inf.id)}
                          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* HIRING HISTORY (KEPT FROM ORIGINAL) */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  Collaboration History
                </h2>
              </div>

              {!conversations || conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-8 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    No collaborations initiated
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((c) => {
                    const creator = c.otherProfile;
                    if (!creator) return null;
                    return (
                      <div
                        key={c._id}
                        className="flex items-center gap-3 rounded-2xl border border-border p-3"
                      >
                        <img src={
                            resolveImageUrl(creator.avatarUrl) ||
                            getGenderAvatar(creator.fullName, creator.gender, "creator")
                          }
                          alt=""
                          className="h-10 w-10 rounded-full object-cover aspect-square flex-shrink-0 border border-border"
                         onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(creator.fullName, creator.gender, "creator"); }} />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/influencer/${creator._id}`}
                            className="block truncate font-display text-xs font-semibold hover:text-primary"
                          >
                            {creator.fullName}
                          </Link>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {creator.category || "General"} ·{" "}
                            {creator.location || "India"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[9px] capitalize rounded-full px-2"
                        >
                          {c.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

              {/* RECENT SEARCHES */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-base font-semibold">
                    Recent searches
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((q) => (
                    <Link key={q} to="/browse">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2.5 py-1 text-[10px] hover:bg-accent flex items-center gap-1"
                      >
                        <Search className="h-2.5 w-2.5" /> {q}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "campaigns" ? (
          <div className="space-y-6">
{/* OPEN CAMPAIGNS */}
            <div id="brand-campaigns-section" className="card-3d rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <h2 className="font-outfit text-xl font-bold">
                    Open Campaigns
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create and manage active campaign listings visible to creators.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="btn-bouncy rounded-full gradient-sunset border-0 text-white shadow-glow text-xs h-9 px-4 font-bold flex items-center gap-1.5 self-start sm:self-auto"
                  onClick={openAddCampaignModal}
                >
                  <Plus className="h-4 w-4" /> Create Campaign
                </Button>
              </div>

              {/* Status Filter Tabs (All / Active / Inactive) */}
              <div className="flex items-center gap-1.5 mt-3 mb-4 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: "ALL", label: "All Campaigns", count: brandCampaigns?.length || 0 },
                  { id: "ACTIVE", label: "Active", count: brandCampaigns?.filter((c) => c.active).length || 0 },
                  { id: "INACTIVE", label: "Inactive", count: brandCampaigns?.filter((c) => !c.active).length || 0 },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCampaignFilterStatus(f.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                      campaignFilterStatus === f.id
                        ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/30"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40"
                    )}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground/80 mb-5">
                Note: Created campaigns undergo a short Admin Verification before becoming visible to creators.
              </p>

              {!brandCampaigns ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading campaigns...
                </div>
              ) : (() => {
                const displayedCampaigns = brandCampaigns.filter((c) => {
                  if (campaignFilterStatus === "ACTIVE") return Boolean(c.active);
                  if (campaignFilterStatus === "INACTIVE") return !c.active;
                  return true;
                });

                if (displayedCampaigns.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center">
                      <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="font-semibold text-sm text-foreground font-outfit">
                        {campaignFilterStatus === "ACTIVE"
                          ? "No active campaigns found"
                          : campaignFilterStatus === "INACTIVE"
                          ? "No inactive campaigns found"
                          : "No campaigns created yet"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                        {campaignFilterStatus === "ACTIVE"
                          ? "None of your campaigns are currently marked as active."
                          : "Create your first campaign listing to attract creators and receive proposals."}
                      </p>
                      <Button
                        size="sm"
                        className="btn-bouncy mt-4 rounded-full gradient-sunset border-0 text-white shadow-glow text-xs font-bold px-4"
                        onClick={openAddCampaignModal}
                      >
                        Create Campaign
                      </Button>
                    </div>
                  );
                }

                const totalCampaignPages = Math.ceil(displayedCampaigns.length / campaignsPerPage) || 1;
                const safeCurrentPage = Math.min(campaignPage, totalCampaignPages);
                const startIndex = (safeCurrentPage - 1) * campaignsPerPage;
                const paginatedCampaigns = displayedCampaigns.slice(startIndex, startIndex + campaignsPerPage);

                return (
                  <div className="space-y-4">
                    {paginatedCampaigns.map((camp) => (
                    <div
                      key={camp._id}
                      className="card-3d rounded-2xl border border-border/60 bg-background/70 p-4 transition-all hover:border-primary/40"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-outfit text-base font-bold text-foreground">
                              {camp.title}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "rounded-full text-[10px] uppercase px-2 py-0.5 font-bold",
                                camp.status === "APPROVED" && "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
                                camp.status === "PENDING_VERIFICATION" && "bg-amber/10 text-amber border border-amber/20",
                                camp.status === "REJECTED" && "bg-red-500/10 text-red-500 border border-red-500/20"
                              )}
                            >
                              {camp.status === "PENDING_VERIFICATION"
                                ? "Under Review"
                                : camp.status}
                            </Badge>
                            {camp.active ? (
                              <Badge variant="outline" className="rounded-full text-[10px] text-emerald-600 border-emerald-600/30">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {camp.description}
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-xs font-bold text-primary font-outfit">
                            ₹{camp.totalBudget?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Total Budget
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                        <div>
                          <span className="block font-semibold text-foreground font-outfit">
                            {camp.category || "General"}
                          </span>
                          Category
                        </div>
                        <div>
                          <span className="block font-semibold text-foreground font-outfit">
                            {camp.location || "Pan India"}
                          </span>
                          Location
                        </div>
                        <div>
                          <span className="block font-semibold text-foreground font-outfit">
                            ₹{camp.minBudgetPerCreator?.toLocaleString()} - ₹{camp.maxBudgetPerCreator?.toLocaleString()}
                          </span>
                          Per Creator
                        </div>
                        <div>
                          <span className="block font-semibold text-foreground font-outfit">
                            {camp.endDate ? new Date(camp.endDate).toLocaleDateString() : "No deadline"}
                          </span>
                          End Date
                        </div>
                      </div>

                      {/* Deliverables summary */}
                      <div className="mt-2.5 pt-2 border-t border-border/30">
                        {camp.deliverables && (
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {camp.deliverables.reels > 0 && (
                              <span className="bg-secondary/60 px-2 py-0.5 rounded-full border border-border/40">
                                {camp.deliverables.reels} Reels
                              </span>
                            )}
                            {camp.deliverables.posts > 0 && (
                              <span className="bg-secondary/60 px-2 py-0.5 rounded-full border border-border/40">
                                {camp.deliverables.posts} Posts
                              </span>
                            )}
                            {camp.deliverables.stories > 0 && (
                              <span className="bg-secondary/60 px-2 py-0.5 rounded-full border border-border/40">
                                {camp.deliverables.stories} Stories
                              </span>
                            )}
                            {camp.deliverables.videos > 0 && (
                              <span className="bg-secondary/60 px-2 py-0.5 rounded-full border border-border/40">
                                {camp.deliverables.videos} Videos
                              </span>
                            )}
                          </div>
                        )}
                        {camp.status === "REJECTED" && camp.verificationFeedback && (
                          <p className="text-[11px] text-red-500 bg-red-500/10 p-2 rounded-lg mt-2">
                            Reason: {camp.verificationFeedback}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border/40 justify-between">
                        {(() => {
                          const reqsCount = (pendingRequests || []).filter(
                            (r) => String(r.campaignId?._id || r.campaignId) === String(camp._id)
                          ).length;
                          return (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={reqsCount > 0 ? "default" : "outline"}
                                className={cn(
                                  "btn-bouncy h-8 rounded-full text-xs px-3.5 flex items-center gap-1.5 font-bold",
                                  reqsCount > 0
                                    ? "gradient-sunset border-0 text-white shadow-glow"
                                    : "border-border text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => setSelectedCampaignForRequests(camp)}
                              >
                                <Users className="h-3.5 w-3.5" />
                                Requests {reqsCount > 0 && <span className="ml-0.5 px-1.5 py-0.2 bg-white text-black rounded-full text-[10px] font-bold">{reqsCount}</span>}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-bouncy h-8 rounded-full text-xs px-3 flex items-center gap-1 font-bold border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 shadow-xs"
                                onClick={async () => {
                                  setSelectedCampaignForAiMatches(camp);
                                  setAiMatchesModalOpen(true);
                                  setLoadingAiMatches(true);
                                  try {
                                    const res = await api.get("/ai/smart-matches", {
                                      params: {
                                        campaignId: camp._id,
                                        category: camp.category,
                                        maxBudget: camp.maxBudgetPerCreator || camp.totalBudget,
                                        minFollowers: camp.minFollowers,
                                        location: camp.location,
                                        isBarter: camp.isBarterAllowed,
                                      },
                                    });
                                    setAiMatchedCreators(res?.data?.data || []);
                                  } catch (err) {
                                    console.error("Failed to load AI matches:", err);
                                    toast.error("Failed to fetch smart matches");
                                  } finally {
                                    setLoadingAiMatches(false);
                                  }
                                }}
                              >
                                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                                AI Matches
                              </Button>
                            </div>
                          );
                        })()}

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="btn-bouncy h-8 rounded-full text-xs hover:bg-secondary px-3 flex items-center gap-1.5 font-semibold"
                            onClick={() => openEditCampaignModal(camp)}
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="btn-bouncy h-8 rounded-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-3 flex items-center gap-1.5 font-semibold"
                            onClick={() => handleDeleteCampaign(camp._id)}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                    {/* Numeric Pagination Bar (1, 2, 3...) */}
                    {totalCampaignPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
                        <p className="text-xs text-muted-foreground">
                          Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
                          <span className="font-semibold text-foreground">{Math.min(startIndex + campaignsPerPage, displayedCampaigns.length)}</span> of{" "}
                          <span className="font-semibold text-foreground">{displayedCampaigns.length}</span> campaigns
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/70"
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCampaignPage((prev) => Math.max(1, prev - 1))}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" /> Prev
                          </Button>
                          {Array.from({ length: totalCampaignPages }, (_, idx) => idx + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCampaignPage(pageNum)}
                              className={cn(
                                "h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center",
                                safeCurrentPage === pageNum
                                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/40"
                              )}
                            >
                              {pageNum}
                            </button>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/70"
                            disabled={safeCurrentPage === totalCampaignPages}
                            onClick={() => setCampaignPage((prev) => Math.min(totalCampaignPages, prev + 1))}
                          >
                            Next <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* BRAND OFFERS & INCENTIVES LAUNCH */}
            <MultiRoleOfferForm profileId={profile?._id} role="brand" />

            {/* ESCROW PAYMENTS */}
            <div className="card-3d rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div>
                <h2 className="font-outfit text-xl font-bold">
                  Escrow Payments
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                  Manage campaign milestones, pay invoices, or flag dispute requests.
                </p>
              </div>

              {!brandPayments ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading payments...
                </div>
              ) : brandPayments.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-secondary/5">
                  <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold text-sm text-muted-foreground">
                    No payment invoices generated yet
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] mx-auto">
                    Invoices appear here once you approve a creator's completed campaign task.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground font-semibold">
                        <th className="pb-3 pr-2">Invoice / Ref</th>
                        <th className="pb-3 px-2">Campaign</th>
                        <th className="pb-3 px-2">Creator</th>
                        <th className="pb-3 px-2">Deal Amount (Escrow)</th>
                        <th className="pb-3 px-2">Status</th>
                        <th className="pb-3 px-2">Holding Ends</th>
                        <th className="pb-3 pl-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {brandPayments.map((pay) => (
                        <tr key={pay._id} className="hover:bg-secondary/10">
                          <td className="py-3 pr-2 font-mono text-[10px] text-muted-foreground">
                            <span className="block font-semibold text-foreground">{pay.invoiceNumber}</span>
                            {pay.payoutReference && <span className="block text-[9px]">{pay.payoutReference}</span>}
                          </td>
                          <td className="py-3 px-2 font-medium max-w-[110px] truncate">
                            {pay.campaign?.title || "General"}
                          </td>
                          <td className="py-3 px-2 max-w-[90px] truncate">
                            {pay.creator?.fullName || "Creator"}
                          </td>
                          <td className="py-3 px-2 font-bold text-foreground">
                            ₹{pay.grossAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "rounded-full text-[9px] uppercase px-2 py-0.5 font-bold shrink-0",
                                pay.paymentStatus === "completed" && "bg-emerald-500/10 text-emerald-600",
                                pay.paymentStatus === "holding" && "bg-blue-500/10 text-blue-500",
                                pay.paymentStatus === "invoice_generated" && "bg-amber/10 text-amber",
                                pay.paymentStatus === "disputed" && "bg-red-500/10 text-red-500",
                                pay.paymentStatus === "refunded" && "bg-slate-500/10 text-slate-500",
                                pay.paymentStatus === "pending" && "bg-amber/10 text-amber"
                              )}
                            >
                              {pay.paymentStatus.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 max-w-[140px]">
                            {pay.paymentStatus === "holding" && pay.holdingEndsAt ? (
                              <div className="flex flex-col gap-0.5">
                                <CountdownTimer dueDate={pay.holdingEndsAt} />
                                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                  Until {new Date(pay.holdingEndsAt).toLocaleString()}
                                </span>
                              </div>
                            ) : pay.paymentStatus === "disputed" ? (
                              <span className="text-red-500 font-semibold text-[10px]">
                                Payout Frozen
                              </span>
                            ) : pay.paymentStatus === "completed" ? (
                              <span className="text-emerald-600 font-semibold text-[10px]">
                                Released
                              </span>
                            ) : pay.paymentStatus === "refunded" ? (
                              <span className="text-slate-500 font-semibold text-[10px]">
                                Refunded to Brand
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">
                                —
                              </span>
                            )}
                          </td>
                          <td className="py-3 pl-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-full text-[10px] px-2.5"
                                onClick={() => setSelectedAuditLogPayment(pay)}
                              >
                                View Logs
                              </Button>

                              {(pay.paymentStatus === "invoice_generated" || pay.paymentStatus === "pending") && (
                                <Button
                                  size="sm"
                                  className="rounded-full gradient-sunset border-0 text-white shadow-glow text-[10px] px-3.5 h-8 font-semibold"
                                  disabled={payingId === pay._id}
                                  onClick={async () => {
                                    setPayingId(pay._id);
                                    try {
                                      const order = await initiatePaymentOrder({ paymentId: pay._id });
                                      
                                      const options = {
                                        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
                                        amount: order.amount,
                                        currency: order.currency,
                                        name: "Lemen Platform",
                                        description: `Payment for Invoice #${pay.invoiceNumber}`,
                                        order_id: order.id,
                                        handler: async (response) => {
                                          try {
                                            setPayingId(pay._id);
                                            await verifyPaymentSignature({
                                              paymentId: pay._id,
                                              gatewayOrderId: response.razorpay_order_id,
                                              gatewayPaymentId: response.razorpay_payment_id,
                                              gatewaySignature: response.razorpay_signature,
                                            });
                                            toast.success("Checkout payment secured in holding!");
                                          } catch (err) {
                                            toast.error((err ).message || "Signature verification failed");
                                          } finally {
                                            setPayingId(null);
                                          }
                                        },
                                        prefill: {
                                          name: profile.fullName || "",
                                          email: profile.email || "",
                                        },
                                        theme: {
                                          color: "#EC4899",
                                        },
                                        modal: {
                                          ondismiss: () => {
                                            setPayingId(null);
                                            toast.error("Payment dismissed by user");
                                          }
                                        }
                                      };

                                      const rzp = new (window ).Razorpay(options);
                                      rzp.open();
                                    } catch (e) {
                                      toast.error((e ).message);
                                      setPayingId(null);
                                    }
                                  }}
                                >
                                  {payingId === pay._id ? "Paying..." : "Pay Now"}
                                </Button>
                              )}
                              {pay.paymentStatus === "holding" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full border-red-500/20 text-red-500 hover:bg-red-500/10 text-[10px] px-3.5 h-8 font-semibold"
                                  onClick={async () => {
                                    try {
                                      await raiseDispute({ paymentId: pay._id });
                                      toast.success("Dispute raised! Payout frozen.");
                                    } catch (e) {
                                      toast.error((e ).message);
                                    }
                                  }}
                                >
                                  Raise Dispute
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "offers" ? (
          <div className="space-y-6">
            <MultiRoleOfferForm profileId={profile?._id} role="brand" />

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" /> Creator Deals & Flash Discounts
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Explore limited-time promotional deals and discounts created by verified creators for your brand campaigns.
              </p>
              <div className="mt-6">
                <CreatorOffersSidebarWidget audience="brand" />
              </div>
            </div>
          </div>
        ) : (activeTab === "wallet" || activeTab === "referrals") ? (
          <div className="space-y-6">
            {/* BRAND WALLET & FUNDS CARD */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary" /> Brand Wallet & Funds
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add funds in advance to instantly pay creators for collaborations, and receive direct platform referral earnings.
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
                      setReferralRefreshKey((k) => k + 1);
                      toast.info("Refreshing wallet balance & transactions...");
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
                      setAddFundsAmount("");
                      setShowAddFundsModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add Funds to Wallet
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Available Balance Card */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                      Available Balance
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <IndianRupee className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-foreground font-display">
                    ₹{Number(brandWallet.availableBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ready for 1-click escrow payments
                  </p>
                </div>

                {/* Total Referral Commission Earned */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Referral Income</span>
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <Gift className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-bold text-foreground font-display text-emerald-600">
                    ₹{Number(referralEarnings?.total_earned || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Credited directly to this wallet
                  </p>
                </div>

                {/* Active Referrals Count */}
                <div
                  onClick={() => setShowReferredModal(true)}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm cursor-pointer hover:border-primary/50 hover:bg-secondary/20 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary">Active Referrals</span>
                    <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="text-3xl font-bold text-foreground font-display">
                      {referralEarnings?.active_referrals_count ?? (referredListQuery?.total || 0)}
                    </div>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-0.5">
                      View list <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Referred creators & brand partners
                  </p>
                </div>

                {/* Protection Policy Notice */}
                <div className="rounded-2xl border border-border bg-secondary/30 p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="text-xs font-bold text-foreground">1-Click Escrow Protection</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                    Use your wallet balance to lock collaboration escrow instantly without repeating card/UPI authorization on every deal.
                  </p>
                </div>
              </div>
            </div>

            {/* REFERRAL HERO CARD */}
            <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <div className="max-w-3xl relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Tiered Referral Income (5% - 10%) • Auto-Credited to Brand Wallet</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Invite creators & brands. <span className="text-gradient-sunset">Earn up to 10% on every deal.</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Share your unique referral code or link. Whenever a creator or brand you refer completes a collaboration on Pravixo, you receive a recurring referral commission directly from our platform fees with zero extra cost.
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
                                title: "Join Pravixo Network",
                                text: `Join Pravixo using my referral code ${refCode} to connect with creators and brands!`,
                                url: link,
                              }).catch(() => {});
                            } else {
                              const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join Pravixo with my referral code ${refCode}: ${link}`)}`;
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
                  <p className="text-xs text-muted-foreground">Earnings credited from referred users' completed collaboration payouts</p>
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
                    Share your referral code with fellow brands and creators. When they complete collaborations, your referral commissions will appear right here!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="pb-3 pl-2 font-semibold">Referred User</th>
                        <th className="pb-3 px-2 font-semibold">Project / Payout</th>
                        <th className="pb-3 px-2 font-semibold">Date</th>
                        <th className="pb-3 px-2 font-semibold">Commission</th>
                        <th className="pb-3 pr-2 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {referralEarnings.earnings.map((item, idx) => (
                        <tr key={item._id || item.project_id || idx} className="hover:bg-secondary/10 transition-colors">
                          <td className="py-3.5 pl-2 font-semibold text-foreground flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {item.referred_user_name?.[0] || "U"}
                            </div>
                            <div>
                              <span>{item.referred_user_name || "Referred User"}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-muted-foreground font-mono text-[11px]">
                            {item.project_id ? (item.project_id.length > 12 ? `${item.project_id.slice(0, 10)}...` : item.project_id) : "Completed Collaboration"}
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

            {/* WALLET TRANSACTIONS & ACTIVITY LEDGER */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" /> Wallet Activity & Transaction Ledger
                  </h3>
                  <p className="text-xs text-muted-foreground">Detailed history of all deposits, referral credits, and campaign escrow payments</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="rounded-full text-xs font-bold px-4 gradient-sunset text-white shadow-glow border-0 flex items-center gap-1.5"
                    onClick={() => {
                      setAddFundsAmount("");
                      setShowAddFundsModal(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Funds
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs flex items-center gap-1.5"
                    disabled={isRefreshingWallet}
                    onClick={() => {
                      setIsRefreshingWallet(true);
                      setWalletRefreshKey((k) => k + 1);
                      toast.info("Refreshing ledger...");
                      setTimeout(() => {
                        setIsRefreshingWallet(false);
                        toast.success("Ledger updated!");
                      }, 700);
                    }}
                  >
                    <History className={`h-3.5 w-3.5 ${isRefreshingWallet ? "animate-spin text-primary" : ""}`} />
                    {isRefreshingWallet ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </div>

              {(!brandTransactionsList || brandTransactionsList.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-2xl bg-secondary/5">
                  <Wallet className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold text-sm text-foreground">No wallet transactions recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[340px]">
                    Deposit funds to pay for campaigns instantly or invite peers to earn referral bonuses directly into your wallet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground font-semibold">
                        <th className="pb-3 pl-2">Type</th>
                        <th className="pb-3 px-2">Description / Note</th>
                        <th className="pb-3 px-2">Date</th>
                        <th className="pb-3 px-2">Amount</th>
                        <th className="pb-3 pr-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {brandTransactionsList.map((tx, idx) => {
                        const isCredit = tx.amount > 0 && tx.transaction_type !== "escrow_payment" && tx.transaction_type !== "withdrawal";
                        return (
                          <tr key={tx._id || idx} className="hover:bg-secondary/10 transition-colors">
                            <td className="py-3.5 pl-2 font-semibold text-foreground flex items-center gap-2">
                              <div className={cn(
                                "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                isCredit ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                              )}>
                                {isCredit ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                              </div>
                              <span className="capitalize font-medium">
                                {tx.transaction_type === "referral_earning" ? "Referral Bonus" :
                                 tx.transaction_type === "deposit" ? "Wallet Deposit" :
                                 tx.transaction_type === "escrow_payment" ? "Campaign Escrow" :
                                 tx.transaction_type?.replace(/_/g, " ") || "Transaction"}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-muted-foreground max-w-[280px] truncate">
                              {tx.notes || tx.description || (tx.source_model ? `Ref: ${tx.source_model}` : "Wallet transaction")}
                            </td>
                            <td className="py-3.5 px-2 text-muted-foreground whitespace-nowrap">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              }) : "-"}
                            </td>
                            <td className={cn(
                              "py-3.5 px-2 font-bold text-sm whitespace-nowrap",
                              isCredit ? "text-emerald-600" : "text-foreground"
                            )}>
                              {isCredit ? "+" : "-"}₹{Math.abs(Number(tx.amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 pr-2 text-right">
                              <Badge className={cn(
                                "rounded-full text-[9px] font-bold px-2 py-0.5 border capitalize",
                                tx.status === "completed" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" :
                                tx.status === "pending" ? "bg-amber-500/15 text-amber-700 border-amber-500/30" :
                                "bg-secondary text-muted-foreground border-border"
                              )}>
                                {tx.status || "Completed"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ADD FUNDS MODAL DIALOG */}
            <Dialog open={showAddFundsModal} onOpenChange={setShowAddFundsModal}>
              <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-border">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="font-display text-lg sm:text-xl font-bold text-foreground">
                        Add Funds to Brand Wallet
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Top up your wallet balance securely via Razorpay (UPI, Netbanking, Cards).
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <form onSubmit={handleAddFunds} className="space-y-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="addFundsAmount" className="text-xs font-semibold">Deposit Amount (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="addFundsAmount"
                        type="number"
                        min="10"
                        step="1"
                        placeholder="e.g. 5000"
                        value={addFundsAmount}
                        onChange={(e) => setAddFundsAmount(e.target.value)}
                        className="pl-9 text-sm font-bold rounded-xl"
                        required
                        autoFocus
                      />
                    </div>
                    {/* Quick Amount Suggestion Pills */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {[1000, 2500, 5000, 10000, 25000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAddFundsAmount(String(amt))}
                          className="px-2.5 py-1 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                        >
                          +₹{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-secondary/20 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Current Balance:</span>
                      <span className="font-bold text-foreground">₹{Number(brandWallet.availableBalance || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>New Balance After Top-up:</span>
                      <span className="font-bold text-emerald-600">
                        ₹{(Number(brandWallet.availableBalance || 0) + (Number(addFundsAmount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <DialogFooter className="mt-4 pt-3 border-t border-border/40 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-bold"
                      onClick={() => setShowAddFundsModal(false)}
                      disabled={isAddingFunds}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isAddingFunds || !addFundsAmount || Number(addFundsAmount) < 10}
                      className="rounded-full gradient-sunset text-white text-xs font-bold px-6 shadow-glow"
                    >
                      {isAddingFunds ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing...
                        </>
                      ) : (
                        `Pay & Add ₹${Number(addFundsAmount || 0).toLocaleString()}`
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* REFERRED USERS DIALOG */}
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
                        Creators and brands registered using your referral code. You earn a recurring commission on their completed projects.
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
                    <span className="font-bold text-base text-amber-500 font-display">
                      5% - 10% Tiered
                    </span>
                  </div>
                </div>

                {/* Referred Users List */}
                <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-2.5 max-h-[400px]">
                  {(!referredListQuery?.users || referredListQuery.users.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-2xl">
                      <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-semibold text-foreground">No referred users registered yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                        Share your referral link or code with creators and brand partners to start earning recurring commissions.
                      </p>
                    </div>
                  ) : (
                    referredListQuery.users.map((u, idx) => (
                      <div
                        key={u._id || idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              resolveImageUrl(u.avatarUrl) ||
                              `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.fullName || "User"}`
                            }
                            alt=""
                            className="h-10 w-10 rounded-full object-cover border border-border aspect-square shrink-0"
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/9.x/avataaars/svg?seed=Fallback"; }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              {u.fullName || "Registered User"}
                            </h4>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              {u.handle && <span>@{u.handle.replace("@", "")}</span>}
                              <span>•</span>
                              <span className="capitalize">{u.role || "Creator"}</span>
                              <span>•</span>
                              <span>Joined {new Date(u.createdAt || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-600 block">
                            ₹{Number(u.commissionEarned || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {u.dealsCompleted || 0} deals completed
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <DialogFooter className="mt-3 pt-3 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-full text-xs font-bold"
                    onClick={() => setShowReferredModal(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <SubscriptionTab role="brand" profile={profile} />
        )}
      </div>
    </div>

      {/* CAMPAIGN DIALOG (CREATE/EDIT) */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-hidden rounded-3xl border border-border bg-card p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl font-bold">
              {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the collaboration campaign specifics. Newly created campaigns will be reviewed by Admin before being shown to creators.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCampaign} className="space-y-4 mt-2 overflow-y-auto pr-1 flex-1">
            <div className="space-y-1.5">
              <Label htmlFor="campTitle">Campaign Name *</Label>
              <Input
                id="campTitle"
                value={campTitle}
                onChange={(e) => setCampTitle(e.target.value)}
                placeholder="e.g. Summer Fitness Brand Ambassador Campaign"
                className="rounded-xl border-border bg-background"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campDescription">Campaign Description</Label>
              <Textarea
                id="campDescription"
                value={campDescription}
                onChange={(e) => setCampDescription(e.target.value)}
                placeholder="Describe your brand goals, target audience, and expectations..."
                className="rounded-xl border-border bg-background text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="campStartDate">Start Date</Label>
                <Input
                  id="campStartDate"
                  type="date"
                  value={campStartDate}
                  onChange={(e) => setCampStartDate(e.target.value)}
                  className="rounded-xl border-border bg-background text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campEndDate">End Date *</Label>
                <Input
                  id="campEndDate"
                  type="date"
                  value={campEndDate}
                  onChange={(e) => setCampEndDate(e.target.value)}
                  className="rounded-xl border-border bg-background text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="campCategory">Category *</Label>
                <select
                  id="campCategory"
                  value={campCategory}
                  onChange={(e) => setCampCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  required
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campLocation">Location</Label>
                <select
                  id="campLocation"
                  value={campLocation}
                  onChange={(e) => setCampLocation(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {LOCATION_OPTIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-border/40">
              <Label className="text-xs font-semibold">Budget Details (INR)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block font-medium">Total Campaign Budget *</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 10000"
                    value={campTotalBudget}
                    onChange={(e) => setCampTotalBudget(e.target.value)}
                    className="rounded-xl border-border bg-background text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block font-medium">Min per Creator</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 2000"
                    value={campMinBudget}
                    onChange={(e) => setCampMinBudget(e.target.value)}
                    className="rounded-xl border-border bg-background text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block font-medium">Max per Creator</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={campMaxBudget}
                    onChange={(e) => setCampMaxBudget(e.target.value)}
                    className="rounded-xl border-border bg-background text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[10px] text-muted-foreground block font-medium">Baseline Minimum Followers Required (e.g. 10000 for 10k+)</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 10000 (or configure tiered brackets below)"
                  value={campMinFollowers}
                  onChange={(e) => setCampMinFollowers(e.target.value)}
                  className="rounded-xl border-border bg-background text-xs"
                />
              </div>

              {/* Dynamic Tiered Perks / Compensation Builder */}
              <div className="mt-3 p-3.5 rounded-2xl border border-primary/20 bg-secondary/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Condition-Based Options & Perks (By Followers)
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Define custom rewards per follower tier (e.g. 10k+ ➜ ₹2k Food, 25k+ ➜ ₹2k Food + ₹2k Cash, 100k+ ➜ ₹2k Food + ₹3k Cash).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {campTiers.length === 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full text-[10px] h-7 px-2.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => {
                          setCampTiers([
                            { minFollowers: 10000, reward: "₹2,000 Food Voucher", cashAmount: 0, perks: "Food Voucher" },
                            { minFollowers: 25000, reward: "₹2,000 Food Voucher + ₹2,000 Cash", cashAmount: 2000, perks: "Food Voucher + Cash" },
                            { minFollowers: 100000, reward: "₹2,000 Food Voucher + ₹3,000 Cash", cashAmount: 3000, perks: "Food Voucher + Cash" },
                          ]);
                          if (!campMinFollowers) setCampMinFollowers("10000");
                        }}
                      >
                        + Load Sample Tiers
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full text-[10px] h-7 px-3 font-semibold gradient-sunset text-white border-0 shadow-sm flex items-center gap-1"
                      onClick={() => {
                        const lastFollowers = campTiers.length > 0 ? (Number(campTiers[campTiers.length - 1].minFollowers) || 0) * 2 : 10000;
                        setCampTiers([
                          ...campTiers,
                          { minFollowers: lastFollowers || 10000, reward: "", cashAmount: 0, perks: "" },
                        ]);
                      }}
                    >
                      <Plus className="h-3 w-3" /> Add Option / Tier
                    </Button>
                  </div>
                </div>

                {campTiers.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {campTiers.map((tier, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-border bg-card p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-muted-foreground w-12">
                            Option {idx + 1}:
                          </span>
                          <div className="w-28 space-y-0.5">
                            <span className="text-[9px] text-muted-foreground block">Min Followers</span>
                            <Input
                              type="number"
                              min="0"
                              placeholder="e.g. 10000"
                              value={tier.minFollowers}
                              onChange={(e) => {
                                const updated = [...campTiers];
                                updated[idx].minFollowers = Math.max(0, parseInt(e.target.value) || 0);
                                setCampTiers(updated);
                              }}
                              className="h-7 text-xs rounded-lg font-bold"
                            />
                          </div>
                        </div>

                        <div className="flex-1 w-full space-y-0.5">
                          <span className="text-[9px] text-muted-foreground block">Reward / Perks Description *</span>
                          <Input
                            placeholder="e.g. ₹2,000 Food Voucher + ₹2,000 Cash"
                            value={tier.reward}
                            onChange={(e) => {
                              const updated = [...campTiers];
                              updated[idx].reward = e.target.value;
                              setCampTiers(updated);
                            }}
                            className="h-7 text-xs rounded-lg"
                          />
                        </div>

                        <div className="w-24 shrink-0 space-y-0.5">
                          <span className="text-[9px] text-muted-foreground block">Cash (₹)</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={tier.cashAmount || ""}
                            onChange={(e) => {
                              const updated = [...campTiers];
                              updated[idx].cashAmount = Math.max(0, parseInt(e.target.value) || 0);
                              setCampTiers(updated);
                            }}
                            className="h-7 text-xs rounded-lg"
                          />
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-destructive self-end sm:self-center shrink-0 mt-3 sm:mt-0"
                          onClick={() => {
                            setCampTiers(campTiers.filter((_, i) => i !== idx));
                          }}
                          title="Remove Tier"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground mt-1">
                Creators matching the respective follower brackets can apply for that specific option. Creators with fewer followers than required will see the campaign in view-only mode with a Share / Refer button.
              </p>
            </div>

            <div className="space-y-2 pt-1 border-t border-border/40">
              <Label className="text-xs font-semibold">Deliverables Quantity (Optional)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">🎬 Reels</span>
                  <Input
                    type="number"
                    min="0"
                    value={campReels}
                    onChange={(e) => setCampReels(Math.max(0, parseInt(e.target.value) || 0))}
                    className="rounded-xl border-border bg-background text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">📸 Posts</span>
                  <Input
                    type="number"
                    min="0"
                    value={campPosts}
                    onChange={(e) => setCampPosts(Math.max(0, parseInt(e.target.value) || 0))}
                    className="rounded-xl border-border bg-background text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">📱 Stories</span>
                  <Input
                    type="number"
                    min="0"
                    value={campStories}
                    onChange={(e) => setCampStories(Math.max(0, parseInt(e.target.value) || 0))}
                    className="rounded-xl border-border bg-background text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">🎥 Videos</span>
                  <Input
                    type="number"
                    min="0"
                    value={campVideos}
                    onChange={(e) => setCampVideos(Math.max(0, parseInt(e.target.value) || 0))}
                    className="rounded-xl border-border bg-background text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border border-border rounded-2xl p-3 bg-background/50">
              <div>
                <Label className="text-xs font-semibold">Active Status</Label>
                <span className="block text-[10px] text-muted-foreground">
                  If inactive, creators will not be able to apply.
                </span>
              </div>
              <Switch checked={campActive} onCheckedChange={setCampActive} />
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full flex-1"
                onClick={() => setIsCampaignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingCampaign}
                className="rounded-full flex-1 gradient-sunset border-0 text-white shadow-glow"
              >
                {savingCampaign
                  ? "Saving..."
                  : editingCampaign
                    ? "Save Changes"
                    : "Submit for Verification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
      >
        <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Brand Verification
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter GST Number and upload GST Certificate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="Enter GST Number"
                className="rounded-xl border-border bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstCertificate">GST Certificate</Label>
              <Input
                id="gstCertificate"
                type="file"
                accept="image/*,.pdf"
                className="rounded-xl border-border bg-background cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadVerificationFile(file);
                  }
                }}
              />
              {gstFileName && (
                <p className="text-xs mt-2 text-muted-foreground">
                  Selected: {gstFileName}
                </p>
              )}
            </div>

            <Button
              className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-4 shadow-glow"
              onClick={handleVerificationSubmit}
              disabled={
                !gstNumber ||
                !gstCertificateStorageId ||
                submittingVerification
              }
            >
              {submittingVerification
                ? "Submitting..."
                : "Submit Verification"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog
        open={!!selectedCollabForTask}
        onOpenChange={(open) => !open && setSelectedCollabForTask(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Assign Task
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Define the task deliverables, due date, priority, and notes for the creator.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!taskTitle.trim() || !taskDesc.trim() || !taskDeliverables.trim() || !taskDueDate) {
                toast.error("Please fill all required fields");
                return;
              }
              setSavingTask(true);
              try {
                // Combine Due Date and Due Time into a timestamp
                const combinedDueString = `${taskDueDate}T${taskDueTime || "23:59"}:00`;
                const dueTimestamp = new Date(combinedDueString).getTime();

                await createTask({
                  campaignId: selectedCollabForTask.campaignId,
                  creatorId: selectedCollabForTask.creatorId,
                  brandId: selectedCollabForTask.brandId,
                  connectionId: selectedCollabForTask._id,
                  conversationId: selectedCollabForTask.conversationId,
                  title: taskTitle.trim(),
                  description: taskDesc.trim(),
                  deliverables: taskDeliverables.trim(),
                  priority: taskPriority,
                  dueDate: dueTimestamp,
                  notes: taskNotes.trim(),
                });
                toast.success("Task assigned successfully!");
                setSelectedCollabForTask(null);
              } catch (err) {
                toast.error((err ).message);
              } finally {
                setSavingTask(false);
              }
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="taskTitle">Task Title *</Label>
              <Input
                id="taskTitle"
                placeholder="e.g. 1 Instagram Reel and 1 Story"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="rounded-xl border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskDesc">Task Description *</Label>
              <Textarea
                id="taskDesc"
                placeholder="Describe what the creator needs to do..."
                required
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="rounded-xl border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskDeliverables">Deliverables *</Label>
              <Input
                id="taskDeliverables"
                placeholder="e.g. 1 High Quality video file, 1 tag link"
                required
                value={taskDeliverables}
                onChange={(e) => setTaskDeliverables(e.target.value)}
                className="rounded-xl border-border bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="taskDueDate">Due Date *</Label>
                <Input
                  id="taskDueDate"
                  type="date"
                  required
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="rounded-xl border-border bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taskDueTime">Due Time *</Label>
                <Input
                  id="taskDueTime"
                  type="time"
                  required
                  value={taskDueTime}
                  onChange={(e) => setTaskDueTime(e.target.value)}
                  className="rounded-xl border-border bg-background"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskPriority">Priority *</Label>
              <select
                id="taskPriority"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value )}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskNotes">Notes (Optional)</Label>
              <Textarea
                id="taskNotes"
                placeholder="Any special remarks or references..."
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                className="rounded-xl border-border bg-background"
              />
            </div>
            <DialogFooter className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full flex-1"
                onClick={() => setSelectedCollabForTask(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingTask}
                className="rounded-full flex-1 gradient-sunset border-0 text-white shadow-glow"
              >
                {savingTask ? "Assigning..." : "Assign Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Task Dialog */}
      <Dialog
        open={!!selectedTaskForReview}
        onOpenChange={(open) => !open && setSelectedTaskForReview(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Review Submitted Deliverable
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Review the submission details sent by the creator.
            </DialogDescription>
          </DialogHeader>
          {selectedTaskForReview && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1 bg-secondary/10 border border-border/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                  Task Title
                </p>
                <p className="text-sm font-semibold">{selectedTaskForReview.title}</p>
              </div>

              <div className="space-y-1 bg-secondary/10 border border-border/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                  Submission Link
                </p>
                <a
                  href={selectedTaskForReview.submissionLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline font-medium break-all flex items-center gap-1"
                >
                  {selectedTaskForReview.submissionLink} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {selectedTaskForReview.notes && (
                <div className="space-y-1 bg-secondary/10 border border-border/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Creator's Notes
                  </p>
                  <p className="text-xs text-foreground italic whitespace-pre-wrap">
                    "{selectedTaskForReview.notes}"
                  </p>
                </div>
              )}

              {selectedTaskForReview.attachmentLink && (
                <div className="space-y-1 bg-secondary/10 border border-border/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Optional Attachment Link
                  </p>
                  <a
                    href={selectedTaskForReview.attachmentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline font-medium break-all flex items-center gap-1"
                  >
                    {selectedTaskForReview.attachmentLink} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              <DialogFooter className="pt-4 flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full flex-1 border-border text-red-500 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 text-xs h-9 font-semibold"
                  disabled={reviewingTask}
                  onClick={async () => {
                    setReviewingTask(true);
                    try {
                      await reviewTask({
                        taskId: selectedTaskForReview._id,
                        action: "revision",
                      });
                      toast.success("Revision requested! Creator notified.");
                      setSelectedTaskForReview(null);
                    } catch (e) {
                      toast.error((e ).message);
                    } finally {
                      setReviewingTask(false);
                    }
                  }}
                >
                  Request Revision
                </Button>
                <Button
                  type="button"
                  className="rounded-full flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-glow border-0 text-xs h-9"
                  disabled={reviewingTask}
                  onClick={async () => {
                    setReviewingTask(true);
                    try {
                      await reviewTask({
                        taskId: selectedTaskForReview._id,
                        action: "approve",
                      });
                      toast.success("Task approved successfully! Creator notified.");
                      setSelectedTaskForReview(null);
                    } catch (e) {
                      toast.error((e ).message);
                    } finally {
                      setReviewingTask(false);
                    }
                  }}
                >
                  {reviewingTask ? "Approving..." : "Approve Task"}
                </Button>
              </DialogFooter>
            </div>
          )}
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

      {/* CAMPAIGN REQUESTS MODAL */}
      <Dialog
        open={Boolean(selectedCampaignForRequests)}
        onOpenChange={(open) => !open && setSelectedCampaignForRequests(null)}
      >
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Creator Requests
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedCampaignForRequests ? (
                <>Managing applications for campaign <strong className="text-foreground">{selectedCampaignForRequests.title}</strong></>
              ) : "Manage campaign applications."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {(() => {
              if (!selectedCampaignForRequests) return null;
              const campRequests = (pendingRequests || []).filter(
                (r) => String(r.campaignId?._id || r.campaignId) === String(selectedCampaignForRequests._id)
              );

              if (campRequests.length === 0) {
                return (
                  <div className="py-10 text-center border border-dashed border-border rounded-2xl">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-sm text-foreground">No pending requests for this campaign</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When creators request to join this campaign, their pitches will appear here.
                    </p>
                  </div>
                );
              }

              return campRequests.map((req) => (
                <div
                  key={req._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border p-4 bg-secondary/10 hover:bg-secondary/20 transition-all"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <img
                      src={
                        resolveImageUrl(req.creatorProfile?.avatarUrl) ||
                        getGenderAvatar(req.creatorProfile?.fullName || "Creator", req.creatorProfile?.gender, "creator")
                      }
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover border border-border shrink-0 cursor-pointer"
                      onClick={() => setSelectedCreatorForDetails(req)}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getGenderAvatar(req.creatorProfile?.fullName || "Creator", req.creatorProfile?.gender, "creator");
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="font-display text-sm font-bold hover:text-primary cursor-pointer truncate"
                          onClick={() => setSelectedCreatorForDetails(req)}
                        >
                          {req.creatorProfile?.fullName || "Creator"}
                        </span>
                        {req.creatorProfile?.handle && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {req.creatorProfile.handle}
                          </span>
                        )}
                        {req.creatorProfile?.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber font-semibold">
                            <Star className="h-3 w-3 fill-amber" /> {req.creatorProfile.rating}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                        <span><strong>Followers:</strong> {req.creatorProfile?.followersCount?.toLocaleString() || "0"}</span>
                        <span>·</span>
                        <span><strong>Niche:</strong> {req.creatorProfile?.category || "General"}</span>
                        <span>·</span>
                        <span><strong>Location:</strong> {req.creatorProfile?.location || "India"}</span>
                      </div>

                      <p className="text-xs text-muted-foreground bg-background border border-border/40 rounded-xl p-2.5 mt-2 italic line-clamp-2">
                        "{req.pitch}"
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0 self-stretch sm:justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs h-8 px-3 flex items-center justify-center gap-1 border-border"
                      onClick={() => setSelectedCreatorForDetails(req)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Details
                    </Button>
                    <Button
                      size="sm"
                      disabled={processingRequestId === req._id}
                      className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs h-8 px-3.5 flex items-center justify-center gap-1 font-semibold"
                      onClick={async () => {
                        setProcessingRequestId(req._id);
                        try {
                          await acceptConnection({ connectionId: req._id });
                          toast.success(`Approved request from ${req.creatorProfile?.fullName || "Creator"}! Opening payment gateway...`);
                          setRequestsRefreshKey((k) => k + 1);
                          // Trigger direct payment gateway for brand to fund escrow to Pravixo
                          await openCollaborationPayment(req._id, profile);
                        } catch (err) {
                          toast.error(err?.response?.data?.message || "Failed to approve request");
                        } finally {
                          setProcessingRequestId(null);
                        }
                      }}
                    >
                      <Check className="h-3.5 w-3.5" /> Approve & Pay Escrow
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingRequestId === req._id}
                      className="rounded-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-xs h-8 px-3 flex items-center justify-center gap-1 font-semibold"
                      onClick={async () => {
                        setProcessingRequestId(req._id);
                        try {
                          await rejectConnection({ connectionId: req._id });
                          toast.info("Request declined");
                          setRequestsRefreshKey((k) => k + 1);
                        } catch (err) {
                          toast.error(err?.response?.data?.message || "Failed to decline request");
                        } finally {
                          setProcessingRequestId(null);
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* CREATOR PROFILE DETAILS REVIEW DIALOG */}
      <Dialog
        open={Boolean(selectedCreatorForDetails)}
        onOpenChange={(open) => !open && setSelectedCreatorForDetails(null)}
      >
        <DialogContent className="max-w-xl rounded-3xl p-6">
          {selectedCreatorForDetails && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3.5">
                  <img
                    src={
                      resolveImageUrl(selectedCreatorForDetails.creatorProfile?.avatarUrl) ||
                      getGenderAvatar(selectedCreatorForDetails.creatorProfile?.fullName || "Creator", selectedCreatorForDetails.creatorProfile?.gender, "creator")
                    }
                    alt=""
                    className="h-14 w-14 rounded-2xl object-cover border border-border shadow-sm shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getGenderAvatar(selectedCreatorForDetails.creatorProfile?.fullName || "Creator", selectedCreatorForDetails.creatorProfile?.gender, "creator");
                    }}
                  />
                  <div>
                    <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                      {selectedCreatorForDetails.creatorProfile?.fullName || "Creator Profile"}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{selectedCreatorForDetails.creatorProfile?.handle || "@creator"}</span>
                      <span>·</span>
                      <span>{selectedCreatorForDetails.creatorProfile?.location || "India"}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Creator Meta Stats */}
              <div className="grid grid-cols-3 gap-2.5 bg-secondary/15 rounded-2xl p-3 text-center border border-border/40">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Total Reach</span>
                  <span className="font-bold text-sm text-foreground">
                    {selectedCreatorForDetails.creatorProfile?.followersCount?.toLocaleString() || "0"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Rating</span>
                  <span className="font-bold text-sm text-amber flex items-center justify-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber" />
                    {selectedCreatorForDetails.creatorProfile?.rating || "5.0"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Category</span>
                  <span className="font-bold text-xs text-foreground truncate block">
                    {selectedCreatorForDetails.creatorProfile?.category || "General"}
                  </span>
                </div>
              </div>

              {/* Bio & Details */}
              {selectedCreatorForDetails.creatorProfile?.bio && (
                <div>
                  <span className="text-xs font-semibold text-foreground block mb-1">About Creator</span>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background border border-border/40 rounded-xl p-3">
                    {selectedCreatorForDetails.creatorProfile.bio}
                  </p>
                </div>
              )}

              {/* Campaign & Pitch */}
              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">
                  Pitch for Campaign {selectedCreatorForDetails.campaign?.title ? `("${selectedCreatorForDetails.campaign.title}")` : ""}
                </span>
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 text-xs italic text-foreground leading-relaxed">
                  "{selectedCreatorForDetails.pitch}"
                </div>
                <span className="block text-[10px] text-muted-foreground mt-1.5">
                  Applied on {new Date(selectedCreatorForDetails.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-border/40">
                <Link
                  to={
                    selectedCreatorForDetails.creatorProfile?.handle
                      ? `/c/${selectedCreatorForDetails.creatorProfile.handle.replace("@", "")}`
                      : `/influencer/${selectedCreatorForDetails.creatorId}`
                  }
                  target="_blank"
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full rounded-full text-xs h-9 font-semibold">
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" /> Media Kit
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processingRequestId === selectedCreatorForDetails._id}
                  className="flex-1 rounded-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-xs h-9 font-semibold"
                  onClick={async () => {
                    setProcessingRequestId(selectedCreatorForDetails._id);
                    try {
                      await rejectConnection({ connectionId: selectedCreatorForDetails._id });
                      toast.info("Request declined");
                      setSelectedCreatorForDetails(null);
                      setRequestsRefreshKey((k) => k + 1);
                    } catch (err) {
                      toast.error(err?.response?.data?.message || "Failed to decline request");
                    } finally {
                      setProcessingRequestId(null);
                    }
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Decline
                </Button>
                <Button
                  size="sm"
                  disabled={processingRequestId === selectedCreatorForDetails._id}
                  className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs h-9 font-semibold"
                  onClick={async () => {
                    const connId = selectedCreatorForDetails._id;
                    const creatorName = selectedCreatorForDetails.creatorProfile?.fullName || "Creator";
                    setProcessingRequestId(connId);
                    try {
                      await acceptConnection({ connectionId: connId });
                      toast.success(`Approved request from ${creatorName}! Opening payment gateway...`);
                      setSelectedCreatorForDetails(null);
                      setRequestsRefreshKey((k) => k + 1);
                      // Trigger direct payment gateway for brand to fund escrow to Pravixo
                      await openCollaborationPayment(connId, profile);
                    } catch (err) {
                      toast.error(err?.response?.data?.message || "Failed to approve request");
                    } finally {
                      setProcessingRequestId(null);
                    }
                  }}
                >
                  <Check className="h-4 w-4 mr-1" /> Approve & Pay Escrow
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task 6: Deliverable Submissions View Dialog for Brand */}
      <Dialog
        open={Boolean(selectedCollabForSubmissions)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCollabForSubmissions(null);
            setCollabSubmissionsList([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Submitted Deliverables
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review submitted campaign deliverables from {selectedCollabForSubmissions?.creatorProfile?.fullName || "Creator"} for "{selectedCollabForSubmissions?.campaign?.title || "Campaign"}".
            </DialogDescription>
          </DialogHeader>

          {selectedCollabForSubmissions && (
            <div className="space-y-4 py-2">
              {/* Deliverables Overview Stats */}
              <div className="rounded-2xl border border-border/80 bg-secondary/20 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Creator</span>
                  <span className="font-bold text-foreground">{selectedCollabForSubmissions.creatorProfile?.fullName || "Creator"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Campaign</span>
                  <span className="font-bold text-foreground truncate max-w-[200px] block">{selectedCollabForSubmissions.campaign?.title || "Campaign"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Approved Deliverables</span>
                  {(() => {
                    const totalReq = selectedCollabForSubmissions.deliverablesTracking?.reduce((sum, d) => sum + (d.requiredQuantity || 0), 0) || 0;
                    const totalComp = selectedCollabForSubmissions.deliverablesTracking?.reduce((sum, d) => sum + (d.completedQuantity || 0), 0) || 0;
                    const isAllApproved = totalReq > 0 && totalComp >= totalReq;
                    return (
                      <span className={cn("font-bold flex items-center gap-1", isAllApproved ? "text-emerald-600" : "text-primary")}>
                        {totalComp} / {totalReq} Approved
                        {isAllApproved && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0 font-bold">✓ 100% Completed</Badge>}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Submissions List */}
              {loadingSubmissions ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading submitted deliverables...
                </div>
              ) : collabSubmissionsList.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-border p-6 space-y-1">
                  <p className="text-sm font-semibold text-foreground">No deliverables submitted yet</p>
                  <p className="text-xs text-muted-foreground">
                    The creator has not yet uploaded content for this campaign.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collabSubmissionsList.map((sub, idx) => {
                    const isVideo = sub.contentUrl?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || sub.deliverableType === "REEL" || sub.deliverableType === "VIDEO";
                    const formattedDate = new Date(sub.submittedAt || sub.createdAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div
                        key={sub._id || idx}
                        className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 hover:border-border transition"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold text-[10px] px-2 py-0.5">
                              {sub.deliverableType}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              Submission #{collabSubmissionsList.length - idx}
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
                                <X className="h-3 w-3" /> REJECTED
                              </Badge>
                            ) : sub.status === "RESUBMITTED" ? (
                              <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold">
                                RESUBMITTED · AWAITING REVIEW
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
                                SUBMITTED · AWAITING REVIEW
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Content Preview */}
                        <div className="rounded-xl overflow-hidden bg-background border border-border/60 max-h-64 flex items-center justify-center">
                          {isVideo ? (
                            <video
                              src={resolveImageUrl(sub.contentUrl)}
                              controls
                              className="max-h-64 w-full object-contain"
                            />
                          ) : (
                            <img
                              src={resolveImageUrl(sub.contentUrl)}
                              alt="Deliverable submission"
                              className="max-h-64 w-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://api.dicebear.com/9.x/shapes/svg?seed=Content";
                              }}
                            />
                          )}
                        </div>

                        {/* Caption / Description if present */}
                        {sub.caption && (
                          <div className="text-xs text-foreground bg-secondary/30 rounded-xl p-2.5 border border-border/40 leading-relaxed">
                            <span className="font-semibold text-muted-foreground block text-[10px] uppercase mb-0.5">
                              {sub.status === "RESUBMITTED" ? "Creator Rework Notes:" : "Creator Caption / Notes:"}
                            </span>
                            "{sub.caption}"
                          </div>
                        )}

                        {/* Footer Metadata & Review Actions (Task 7 & 8) */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {sub.status === "RESUBMITTED" ? "Resubmitted on:" : "Submitted on:"} {formattedDate}
                            </span>
                            <a
                              href={resolveImageUrl(sub.contentUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="h-3 w-3" /> View Original
                            </a>
                          </div>

                          {/* Rejection reason display if rejected */}
                          {sub.status === "REJECTED" && sub.rejectionReason && (
                            <div className="text-[11px] text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                              <strong>Previous Rejection Feedback:</strong> {sub.rejectionReason}
                            </div>
                          )}

                          {/* Brand Review Actions: Approve / Reject (Enabled for SUBMITTED and RESUBMITTED) */}
                          {(sub.status === "SUBMITTED" || sub.status === "RESUBMITTED") && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs h-8 font-semibold flex items-center justify-center gap-1"
                                disabled={reviewingSubmissionId === sub._id}
                                onClick={() => {
                                  setRejectingSubmission(sub);
                                  setSubmissionRejectionReason("");
                                }}
                              >
                                <X className="h-3.5 w-3.5" /> Reject / Request Changes
                              </Button>

                              <Button
                                size="sm"
                                className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs h-8 font-semibold flex items-center justify-center gap-1 shadow-sm"
                                disabled={reviewingSubmissionId === sub._id}
                                onClick={async () => {
                                  setReviewingSubmissionId(sub._id);
                                  try {
                                    const res = await api.patch(`/api/submissions/${sub._id}/approve`);
                                    toast.success(`Approved ${sub.deliverableType} (v${sub.version || 1}) submission!`);
                                    
                                    // Refresh modal submissions
                                    const refreshed = await api.get(`/api/submissions/${selectedCollabForSubmissions._id}/submissions`);
                                    setCollabSubmissionsList(refreshed.data?.data?.submissions || []);
                                    setRequestsRefreshKey((k) => k + 1);
                                  } catch (err) {
                                    console.error("Approve submission error:", err);
                                    toast.error(err?.response?.data?.message || err.message || "Failed to approve deliverable.");
                                  } finally {
                                    setReviewingSubmissionId(null);
                                  }
                                }}
                              >
                                <Check className="h-3.5 w-3.5" /> {reviewingSubmissionId === sub._id ? "Approving..." : "Approve Deliverable"}
                              </Button>
                            </div>
                          )}

                          {sub.status === "APPROVED" && (
                            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approved on {new Date(sub.approvedAt || sub.updatedAt).toLocaleDateString()}
                            </div>
                          )}
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
                setSelectedCollabForSubmissions(null);
                setCollabSubmissionsList([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task 7: Rejection Reason Dialog */}
      <Dialog
        open={Boolean(rejectingSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingSubmission(null);
            setSubmissionRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" /> Reject Deliverable & Request Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide feedback for the creator explaining why this {rejectingSubmission?.deliverableType} was rejected and what changes are needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Rejection Reason / Required Changes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="e.g. Please ensure the campaign hashtag #BrandSummer is included in the video caption and product packaging is clearly visible."
                value={submissionRejectionReason}
                onChange={(e) => setSubmissionRejectionReason(e.target.value)}
                className="text-xs min-h-[90px] rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                setRejectingSubmission(null);
                setSubmissionRejectionReason("");
              }}
              disabled={reviewingSubmissionId !== null}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full text-xs font-bold px-5"
              disabled={!submissionRejectionReason.trim() || reviewingSubmissionId !== null}
              onClick={async () => {
                if (!rejectingSubmission || !submissionRejectionReason.trim()) {
                  toast.error("Please enter a rejection reason.");
                  return;
                }

                setReviewingSubmissionId(rejectingSubmission._id);
                try {
                  await api.patch(`/api/submissions/${rejectingSubmission._id}/reject`, {
                    reason: submissionRejectionReason.trim(),
                  });

                  toast.info("Deliverable rejected. Feedback sent to creator.");
                  setRejectingSubmission(null);
                  setSubmissionRejectionReason("");

                  // Refresh submissions
                  if (selectedCollabForSubmissions) {
                    const refreshed = await api.get(`/api/submissions/${selectedCollabForSubmissions._id}/submissions`);
                    setCollabSubmissionsList(refreshed.data?.data?.submissions || []);
                  }
                  setRequestsRefreshKey((k) => k + 1);
                } catch (err) {
                  console.error("Reject submission error:", err);
                  toast.error(err?.response?.data?.message || err.message || "Failed to reject deliverable.");
                } finally {
                  setReviewingSubmissionId(null);
                }
              }}
            >
              {reviewingSubmissionId !== null ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Hired Creators Modal */}
      <Dialog
        open={hiredCreatorsModalOpen}
        onOpenChange={(open) => setHiredCreatorsModalOpen(open)}
      >
        <DialogContent className="sm:max-w-2xl rounded-3xl p-6 bg-card border-border">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Hired Creators ({approvedCollabs?.length || 0})
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Creators you have successfully hired and collaborated with on your campaigns.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {!approvedCollabs || approvedCollabs.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border p-6 bg-secondary/10">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-sm text-foreground">No creators hired yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When you accept creator pitches or approve collaborations, they will appear here.
                </p>
              </div>
            ) : (
              approvedCollabs.map((collab) => {
                const creator = collab.creatorProfile;
                const creatorId = collab.creatorId?._id || collab.creatorId;
                return (
                  <div
                    key={collab._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-secondary/15 hover:bg-secondary/25 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          resolveImageUrl(creator?.avatarUrl) ||
                          getGenderAvatar(creator?.fullName || "Creator", creator?.gender, "creator")
                        }
                        alt=""
                        className="h-12 w-12 rounded-2xl object-cover border border-border shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getGenderAvatar(creator?.fullName || "Creator", creator?.gender, "creator");
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate block">
                            {creator?.fullName || "Creator"}
                          </span>
                          {creator?.category && (
                            <Badge variant="secondary" className="text-[10px] rounded-md font-medium px-2 py-0.5">
                              {creator.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {creator?.handle || creator?.email || "Creator Partner"}
                        </p>
                        {collab.campaign && (
                          <p className="text-[11px] text-primary font-medium mt-0.5 truncate">
                            Campaign: {collab.campaign.title}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {collab.conversationId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full text-xs px-3 font-semibold"
                          onClick={() => {
                            setHiredCreatorsModalOpen(false);
                            navigate(`/messages?conversationId=${collab.conversationId}`);
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
                        </Button>
                      )}
                      {creatorId && (
                        <Button
                          size="sm"
                          className="h-8 rounded-full gradient-sunset border-0 text-white text-xs font-bold px-3.5 shadow-sm"
                          onClick={() => {
                            setHiredCreatorsModalOpen(false);
                            navigate(`/influencer/${creatorId}`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View Profile
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setHiredCreatorsModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approved Collaborations Modal */}
      <Dialog
        open={showApprovedCollabsModal}
        onOpenChange={(open) => setShowApprovedCollabsModal(open)}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col rounded-3xl p-6 bg-card border-border">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                Approved Collaborations ({approvedCollabs?.length || 0})
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Active creator collaborations, assigned tasks, deliverable progress, and payments.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
            {!approvedCollabs || approvedCollabs.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border p-6 bg-secondary/10">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-sm text-foreground">No approved collaborations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When creators accept your campaign terms or pitch approvals, they will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedCollabs.map((collab) => {
                  const creator = collab.creatorProfile;
                  const creatorId = collab.creatorId?._id || collab.creatorId;
                  const payment = collab.payment;
                  const isPaid = payment?.paymentStatus === "held_in_escrow" || payment?.paymentStatus === "released" || payment?.paymentStatus === "payout_released";
                  const task = collab.task;

                  return (
                    <div
                      key={collab._id}
                      className="rounded-2xl border border-border/70 bg-secondary/15 p-4 flex flex-col justify-between gap-3 hover:border-border transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={
                                resolveImageUrl(creator?.avatarUrl) ||
                                getGenderAvatar(creator?.fullName || "Creator", creator?.gender, "creator")
                              }
                              alt=""
                              className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getGenderAvatar(creator?.fullName || "Creator", creator?.gender, "creator");
                              }}
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate">
                                {creator?.fullName || "Creator"}
                              </h4>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {creator?.handle || creator?.email || "Creator"}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                              isPaid ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            )}
                          >
                            {isPaid ? "Paid (Escrow)" : "Payment Pending"}
                          </Badge>
                        </div>

                        {collab.campaign && (
                          <div className="rounded-xl bg-background/50 border border-border/40 p-2.5 text-xs">
                            <p className="font-semibold text-foreground truncate">{collab.campaign.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Budget: ₹{collab.agreedAmount?.toLocaleString() || collab.campaign.totalBudget?.toLocaleString() || "N/A"}
                            </p>
                          </div>
                        )}

                        {collab.campaign?.deliverables && (
                          <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary">Campaign Deliverables</span>
                              <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 border-primary/30 text-primary">
                                {collab.allDeliverablesCompleted ? "All Completed" : "In Progress"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {Number(collab.campaign.deliverables.reels || 0) > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 text-[10px] font-bold">
                                  🎬 {collab.campaign.deliverables.reels} Reel{collab.campaign.deliverables.reels > 1 ? "s" : ""}
                                </span>
                              )}
                              {Number(collab.campaign.deliverables.posts || 0) > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-bold">
                                  📸 {collab.campaign.deliverables.posts} Post{collab.campaign.deliverables.posts > 1 ? "s" : ""}
                                </span>
                              )}
                              {Number(collab.campaign.deliverables.stories || 0) > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 text-[10px] font-bold">
                                  📱 {collab.campaign.deliverables.stories} Stor{collab.campaign.deliverables.stories > 1 ? "ies" : "y"}
                                </span>
                              )}
                              {Number(collab.campaign.deliverables.videos || 0) > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                                  📹 {collab.campaign.deliverables.videos} Video{collab.campaign.deliverables.videos > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {collab.campaign.deliverables.notes && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 italic">
                                Note: {collab.campaign.deliverables.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {task && !collab.campaign?.deliverables && (
                          <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary">Task: {task.title}</span>
                              <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                                {task.status}
                              </Badge>
                            </div>
                            {task.deliverables && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                {task.deliverables}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 mt-1">
                        <div className="flex items-center gap-1.5">
                          {collab.conversationId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-full text-xs px-2.5 font-semibold"
                              onClick={() => {
                                setShowApprovedCollabsModal(false);
                                navigate(`/messages?conversationId=${collab.conversationId}`);
                              }}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" /> Chat
                            </Button>
                          )}
                          {creatorId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 rounded-full text-xs px-2.5 font-semibold hover:bg-secondary"
                              onClick={() => {
                                setShowApprovedCollabsModal(false);
                                navigate(`/influencer/${creatorId}`);
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" /> Profile
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 rounded-full gradient-sunset text-white text-xs font-bold px-3 shadow-xs"
                            onClick={() => {
                              setSelectedCollabForSubmissions(collab);
                              setShowApprovedCollabsModal(false);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View Deliverables
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold px-5"
              onClick={() => setShowApprovedCollabsModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Followers & Following List Modal */}
      <Dialog
        open={!!followModalType}
        onOpenChange={(open) => !open && setFollowModalType(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 capitalize">
              <Users className="h-5 w-5 text-primary" />
              {followModalType === "followers" ? "Followers" : "Following"} (
              {followModalType === "followers"
                ? followCounts.followers
                : followCounts.following}
              )
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {loadingFollowList ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading list...
              </div>
            ) : followListUsers.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-border p-4 bg-secondary/10">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {followModalType === "followers"
                    ? "No followers yet."
                    : "Not following anyone yet."}
                </p>
              </div>
            ) : (
              followListUsers.map((u) => {
                const uId = u._id || u.profileId;
                const avatar =
                  resolveImageUrl(u.avatarUrl) ||
                  resolveImageUrl(u.profilePicture) ||
                  getGenderAvatar(u.fullName || u.handle || "User", u.gender, u.role || "creator");

                return (
                  <div
                    key={uId}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-secondary/15 hover:bg-secondary/25 transition-all"
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                      onClick={() => {
                        setFollowModalType(null);
                        navigate(`/influencer/${uId}`);
                      }}
                    >
                      <img
                        src={avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getGenderAvatar(u.fullName || u.handle || "User", u.gender, u.role || "creator");
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate hover:text-primary transition-colors">
                          {u.fullName || u.handle || "User"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {u.handle ? `@${u.handle.replace("@", "")}` : u.role || "Creator"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {followModalType === "following" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full text-[11px] font-semibold text-destructive hover:bg-destructive/10 px-3"
                          onClick={() => handleUnfollowUser(uId)}
                        >
                          Unfollow
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full text-[11px] font-semibold px-3"
                          onClick={() => {
                            setFollowModalType(null);
                            navigate(`/influencer/${uId}`);
                          }}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setFollowModalType(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULL-SIZE MEDIA PREVIEW MODAL (BANNER / LOGO LIGHTBOX) */}
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
                    <Sparkles className="h-3 w-3 mr-1 text-pink-500" /> Change Brand Avatar
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

      {/* BRAND AVATAR PICKER MODAL */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        role="brand"
        currentAvatar={resolveImageUrl(profile?.avatarUrl) || `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile?.fullName || user?.email || "brand"}`}
        onSelectAvatar={handleSelectAvatarPreset}
      />

      {/* ========================================================= */}
      {/* 1. ADD TO BRAND SHOWCASE MODAL (IMAGE 2 MATCHING) */}
      {/* ========================================================= */}
      <Dialog open={showAddPortfolioModal} onOpenChange={setShowAddPortfolioModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <span className="p-1 rounded-md bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white">
                <Camera className="h-4 w-4" />
              </span>
              Add to Brand Creative Showcase
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload past campaign creatives, promotional reels, and brand assets to showcase to creators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Format Selection Buttons */}
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
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
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
                placeholder="Write a caption... e.g. 'Excited to launch our new collection! ✨ #brand #campaign'"
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
              onClick={handleCreateBrandPortfolioItem}
              className="rounded-full gradient-sunset text-white border-0 text-xs font-semibold cursor-pointer"
            >
              {uploadingPortfolioItem ? "Publishing..." : "Publish to Showcase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 2. INSTAGRAM-STYLE INTERACTIVE LIGHTBOX & POST VIEWER */}
      {/* ========================================================= */}
      {selectedPortfolioPost && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedPortfolioPost(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 transition-colors rounded-full hover:bg-white/10 z-50 cursor-pointer"
            onClick={() => setSelectedPortfolioPost(null)}
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative w-full max-w-4xl bg-card border border-border/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Side: Media Display */}
            <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px]">
              {selectedPortfolioPost.mediaType === "video" || /\.(mp4|mov|avi|webm)$/i.test(selectedPortfolioPost.imageUrl || selectedPortfolioPost.url || "") ? (
                <video
                  src={resolveImageUrl(selectedPortfolioPost.imageUrl || selectedPortfolioPost.url)}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] w-auto max-w-full object-contain"
                />
              ) : (
                <img
                  src={resolveImageUrl(selectedPortfolioPost.imageUrl || selectedPortfolioPost.url)}
                  alt={selectedPortfolioPost.caption || "Showcase post"}
                  className="max-h-[70vh] w-auto max-w-full object-contain"
                />
              )}

              {/* Format Badge Overlay */}
              <div className="absolute top-3 left-3">
                {selectedPortfolioPost.type === "reel" ? (
                  <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-pink-400 text-xs font-bold px-2.5 py-1 rounded-full border border-pink-500/30">
                    <Film className="h-3 w-3" /> Reel
                  </span>
                ) : selectedPortfolioPost.type === "story" ? (
                  <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                    <Sparkles className="h-3 w-3" /> Story
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
                    <Camera className="h-3 w-3" /> Post
                  </span>
                )}
              </div>
            </div>

            {/* Right Side: Brand info, Brand tag, Caption, Live Comments & Actions */}
            <div className="md:w-2/5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border bg-card">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-border bg-muted">
                    <img
                      src={resolveImageUrl(profile?.avatarUrl) || `https://api.dicebear.com/9.x/identicon/svg?seed=${fullName || "Brand"}`}
                      alt={fullName || "Brand"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{fullName || profile?.fullName || "Brand"}</h4>
                    <p className="text-[10px] text-muted-foreground">@{handle?.replace(/^@+/, "") || "brand"}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePortfolioImage(selectedPortfolioPost._id)}
                  className="text-destructive hover:bg-destructive/10 h-7 px-2 rounded-lg text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Scrollable Caption & Comments List */}
              <div className="flex-1 p-4 overflow-y-auto max-h-[300px] md:max-h-[360px] space-y-3.5 text-xs">
                {/* Brand Collab Partnership Tag */}
                {selectedPortfolioPost.brandTag && (
                  <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-500 font-semibold flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>In partnership with <span className="underline">{selectedPortfolioPost.brandTag.startsWith("@") ? selectedPortfolioPost.brandTag : `@${selectedPortfolioPost.brandTag}`}</span></span>
                  </div>
                )}

                {/* Main Creator/Brand Caption */}
                {selectedPortfolioPost.caption ? (
                  <div className="flex gap-2.5">
                    <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-border">
                      <img
                        src={resolveImageUrl(profile?.avatarUrl) || `https://api.dicebear.com/9.x/identicon/svg?seed=${fullName || "Brand"}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="leading-relaxed">
                        <span className="font-bold mr-1.5">{fullName || "Brand"}</span>
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
                <div className="border-t border-border/50 pt-3 space-y-2.5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Comments ({selectedPortfolioPost.comments?.length || selectedPortfolioPost.commentsCount || 0})
                  </p>

                  {(selectedPortfolioPost.comments || []).map((comm, cIdx) => {
                    const commentId = comm._id || comm.id || cIdx;
                    return (
                      <div key={cIdx} className="group/comm flex gap-2.5 items-start justify-between">
                        <div className="flex gap-2.5 items-start flex-1">
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
                          <div className="flex-1 bg-secondary/30 p-2 rounded-xl">
                            <p className="font-bold text-[11px] leading-none mb-1">{comm.userName || "Pravixo User"}</p>
                            <p className="text-[11px] text-foreground leading-tight">{comm.text}</p>
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
              <div className="p-4 border-t border-border bg-card space-y-2.5">
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
                      onClick={() => document.getElementById("brand-portfolio-comment-input")?.focus()}
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
                    {selectedPortfolioPost.viewsCount ? `${Number(selectedPortfolioPost.viewsCount).toLocaleString()} views` : ""}
                  </span>
                </div>

                <p className="text-xs font-bold text-foreground">
                  {(Number(selectedPortfolioPost.likesCount) || 0).toLocaleString()} likes
                </p>

                {/* Add Comment Input */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    id="brand-portfolio-comment-input"
                    placeholder="Add a comment..."
                    value={portfolioCommentText}
                    onChange={(e) => setPortfolioCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddPortfolioComment();
                      }
                    }}
                    className="text-xs rounded-full h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={submittingPortfolioComment || !portfolioCommentText.trim()}
                    onClick={handleAddPortfolioComment}
                    className="h-8 rounded-full px-3 text-xs gradient-sunset text-white border-0 font-semibold cursor-pointer"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AI SMART MATCHES MODAL */}
      <Dialog open={aiMatchesModalOpen} onOpenChange={setAiMatchesModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" /> AI Smart Matched Creators
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  AI-ranked creators tailored for &quot;
                  <span className="font-semibold text-foreground">{selectedCampaignForAiMatches?.title || "Campaign"}</span>&quot;
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {loadingAiMatches ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-xs font-semibold text-foreground">Analyzing creator synergies & niches...</p>
                <p className="text-[11px] text-muted-foreground mt-1">Ranking by engagement, budget compatibility, and audience relevance.</p>
              </div>
            ) : aiMatchedCreators.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl p-6">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No creators found matching this specific criteria.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Try broadening your campaign budget or category filters.</p>
              </div>
            ) : (
              aiMatchedCreators.map((creator) => {
                const avatarSrc = resolveImageUrl(creator.avatarUrl || creator.avatar) || getGenderAvatar(creator.fullName, creator.gender, "creator");
                const followersCount = (creator.followers || 0).toLocaleString();

                return (
                  <div
                    key={creator._id}
                    className="p-4 rounded-2xl border border-border/80 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <img
                        src={avatarSrc}
                        alt={creator.fullName}
                        className="h-12 w-12 rounded-full object-cover border border-border aspect-square shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getGenderAvatar(creator.fullName, creator.gender, "creator");
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition">
                            {creator.fullName}
                          </h4>
                          <span className="text-[10px] font-mono text-muted-foreground">{creator.handle}</span>
                          {creator.isBarterAllowed && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                              🤝 Barter
                            </Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {creator.category || "Creator"} · {followersCount} followers · {creator.location || "India"}
                        </p>

                        {/* Match Reasons */}
                        {creator.matchReasons && creator.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {creator.matchReasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center text-[9px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
                              >
                                ✓ {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                      {/* Match Score Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        <Sparkles className="h-3 w-3" />
                        <span className="text-xs font-black">{creator.matchScore}% Match</span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          navigate(`/messages?recipientId=${creator._id}`);
                        }}
                        className="rounded-full gradient-sunset text-white text-xs font-bold px-4 h-8 shadow-glow"
                      >
                        Invite & Chat
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiMatchesModalOpen(false)}
              className="rounded-full text-xs h-9 w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELIVERABLES SUBMISSIONS & PROOF REVIEW MODAL (Feature 6) */}
      <Dialog
        open={Boolean(selectedCollabForSubmissions)}
        onOpenChange={(open) => !open && setSelectedCollabForSubmissions(null)}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader className="shrink-0 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                  <Film className="h-5 w-5 text-primary" /> Deliverables Tracker & Proof Review
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Review submitted videos, posts, reels, and stories with approval & rework controls.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
            {loadingSubmissions ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" />
                <p>Loading creator deliverables...</p>
              </div>
            ) : collabSubmissionsList.length === 0 ? (
              <div className="py-14 text-center rounded-2xl border border-dashed border-border p-6 bg-secondary/10">
                <Film className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-xs text-foreground">No Deliverables Uploaded Yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  The creator has not yet uploaded proof for this collaboration. Submissions will appear here once uploaded.
                </p>
              </div>
            ) : (
              collabSubmissionsList.map((sub) => {
                const isApproved = sub.status === "APPROVED";
                const isRejected = sub.status === "REJECTED";
                const isVideo = sub.deliverableType === "REEL" || sub.deliverableType === "VIDEO" || sub.contentUrl?.match(/\.(mp4|mov|webm|avi|mkv)$/i);

                return (
                  <div
                    key={sub._id}
                    className="p-4 rounded-2xl border border-border/80 bg-secondary/15 hover:border-border transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                          {sub.deliverableType} · Version {sub.version || 1}
                        </span>
                        <Badge
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-bold border",
                            isApproved
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : isRejected
                              ? "bg-red-500/10 text-red-500 border-red-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          )}
                        >
                          {isApproved ? "✓ Approved" : isRejected ? "Rework Needed" : "⏳ Under Review"}
                        </Badge>
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono">
                        Submitted: {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Media Preview Box */}
                    {sub.contentUrl && (
                      <div className="rounded-xl overflow-hidden bg-black/90 border border-border flex items-center justify-center max-h-[360px]">
                        {isVideo ? (
                          <video
                            src={resolveImageUrl(sub.contentUrl)}
                            controls
                            playsInline
                            className="max-h-[340px] w-auto object-contain rounded-xl"
                          />
                        ) : (
                          <img
                            src={resolveImageUrl(sub.contentUrl)}
                            alt="Submission"
                            className="max-h-[340px] w-auto object-contain rounded-xl cursor-pointer"
                            onClick={() => window.open(resolveImageUrl(sub.contentUrl), "_blank")}
                          />
                        )}
                      </div>
                    )}

                    {sub.caption && (
                      <div className="p-2.5 rounded-xl bg-background/60 border border-border/50 text-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Creator Notes</span>
                        <p className="whitespace-pre-wrap">{sub.caption}</p>
                      </div>
                    )}

                    {isRejected && sub.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600">
                        <span className="text-[10px] uppercase font-bold block mb-0.5">Your Feedback to Creator:</span>
                        <p>{sub.rejectionReason}</p>
                      </div>
                    )}

                    {/* Brand Action Buttons */}
                    {(!isApproved && !isRejected) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewingSubmissionId === sub._id}
                          onClick={() => {
                            setRejectingSubmission(sub);
                            setSubmissionRejectionReason("");
                          }}
                          className="rounded-full text-xs font-semibold h-8 border-red-500/30 text-red-600 hover:bg-red-500/10 px-4"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Request Rework
                        </Button>
                        <Button
                          size="sm"
                          disabled={reviewingSubmissionId === sub._id}
                          onClick={() => handleApproveSubmission(sub._id)}
                          className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-5 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {reviewingSubmissionId === sub._id ? "Approving..." : "Approve Work"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCollabForSubmissions(null)}
              className="rounded-full text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rework Reason Dialog */}
      <Dialog
        open={Boolean(rejectingSubmission)}
        onOpenChange={(open) => !open && setRejectingSubmission(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Request Deliverable Rework
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide clear, constructive feedback on what the creator needs to change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Explain required changes (e.g., 'Please highlight the product logo clearly in the first 3 seconds, and fix the caption tag...')"
              value={submissionRejectionReason}
              onChange={(e) => setSubmissionRejectionReason(e.target.value)}
              className="text-xs min-h-[100px] rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingSubmission(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={reviewingSubmissionId === rejectingSubmission?._id || !submissionRejectionReason.trim()}
              onClick={handleRejectSubmission}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4"
            >
              Send Rework Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Brand Escrow Acceptance & Payment Required Dialog */}
      <Dialog
        open={Boolean(acceptPaymentModalReq)}
        onOpenChange={(open) => !open && !acceptingAndOpeningPayment && setAcceptPaymentModalReq(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-primary">
                <ShieldCheck className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  Secure Collaboration with Pravixo Escrow
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  100% Buyer Protection & Milestones Guarantee
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {acceptPaymentModalReq && (
            <div className="space-y-4 py-2">
              {/* Creator & Campaign Card Summary */}
              <div className="rounded-2xl border border-border/80 bg-secondary/20 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      resolveImageUrl(acceptPaymentModalReq.creatorProfile?.avatarUrl) ||
                      getGenderAvatar(acceptPaymentModalReq.creatorProfile?.fullName || "Creator", acceptPaymentModalReq.creatorProfile?.gender, "creator")
                    }
                    alt=""
                    className="h-11 w-11 rounded-xl object-cover border border-border shrink-0"
                    onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(acceptPaymentModalReq.creatorProfile?.fullName || "Creator", acceptPaymentModalReq.creatorProfile?.gender, "creator"); }}
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">
                      {acceptPaymentModalReq.creatorProfile?.fullName}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Campaign: <span className="font-semibold text-foreground">{acceptPaymentModalReq.campaign?.title || "Campaign Collaboration"}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Deal Budget</span>
                  <span className="font-display text-sm font-black text-gradient-sunset">
                    ₹{Number(acceptPaymentModalReq.proposedAmount || acceptPaymentModalReq.brandTotal || acceptPaymentModalReq.campaign?.budget || acceptPaymentModalReq.campaign?.minBudgetPerCreator || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Escrow Notice Box */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-foreground">
                    <strong className="block font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                      Pravixo Escrow Payment Required Before Work Starts
                    </strong>
                    Brand ko pehle payment <strong>Pravixo Escrow</strong> me deposit karna hoga. Payment safe rahega aur creator ko release tabhi hoga jab aap unke uploaded deliverables ko review karke approve karenge.
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground bg-background/60 rounded-xl p-2.5 border border-border/50 flex items-center justify-between">
                  <span>🔒 100% Refundable if deliverables are not delivered.</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Razorpay Verified</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {/* Pay Button */}
                <Button
                  className="w-full h-11 rounded-2xl gradient-sunset hover:opacity-95 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 border-0 cursor-pointer"
                  disabled={acceptingAndOpeningPayment}
                  onClick={async () => {
                    const req = acceptPaymentModalReq;
                    if (!req?._id) return;
                    setAcceptingAndOpeningPayment(true);
                    try {
                      // 1. Accept the connection request first if still pending
                      if (req.status === "pending") {
                        await acceptConnection({ connectionId: req._id });
                      }
                      setRequestsRefreshKey((k) => k + 1);

                      // 2. Open Razorpay Escrow payment gateway
                      toast.info("Opening Razorpay payment gateway...");
                      await openCollaborationPayment(req._id, profile || user);
                      setAcceptPaymentModalReq(null);
                      setRequestsRefreshKey((k) => k + 1);
                    } catch (err) {
                      console.error("Accept & Pay error:", err);
                      toast.error(err?.response?.data?.message || err?.message || "Failed to process payment");
                    } finally {
                      setAcceptingAndOpeningPayment(false);
                    }
                  }}
                >
                  {acceptingAndOpeningPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing Escrow Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Click to Pay & Start Collaboration
                    </>
                  )}
                </Button>

                {/* Contact Pravixo Team Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-2xl border-border hover:bg-secondary/60 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  disabled={openingSupportChat}
                  onClick={async () => {
                    setOpeningSupportChat(true);
                    try {
                      const res = await api.post("/api/conversations", {
                        support: true,
                        contactTeam: true,
                        initialMessage: `Hi Pravixo Team, I am discussing the collaboration for "${acceptPaymentModalReq.campaign?.title || "Campaign"}" with ${acceptPaymentModalReq.creatorProfile?.fullName || "Creator"} and would like assistance regarding the campaign & payment terms.`,
                      });
                      const convId = res.data?.data || res.data?.conversation?._id;
                      setAcceptPaymentModalReq(null);
                      if (convId) {
                        navigate(`/messages?conversationId=${convId}`);
                      } else {
                        navigate("/messages");
                      }
                      toast.success("Connecting with Pravixo Support Team...");
                    } catch (err) {
                      console.error("Support chat error:", err);
                      navigate("/messages");
                    } finally {
                      setOpeningSupportChat(false);
                    }
                  }}
                >
                  {openingSupportChat ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening Chat...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-3.5 w-3.5 text-primary" /> Contact Pravixo Team / Ask Queries
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DashboardCustomer;
