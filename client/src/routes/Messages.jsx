import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Search,
  Archive,
  ArchiveRestore,
  Send,
  ArrowLeft,
  Trash2,
  Ban,
  IndianRupee,
  Check,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Info,
  FileText,
  ChevronDown,
  ChevronUp,
  Upload,
  Play,
  Film,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  Paperclip,
  ExternalLink,
  MoreVertical,
  CheckCheck,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  X,
  Truck,
  Package,
  MapPin,
  Mic,
  Square,
  Volume2,
  Clock,
  MessageSquareQuote,
  CornerDownRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { formatINR } from "@/lib/format";
import { AgreementModal } from "@/components/collaboration/AgreementModal";

import { useAuth } from "@/components/auth/AuthProvider";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/log.png";

const resolveImageUrl = (url) => {
  if (!url || url === "undefined" || url === "null") return null;
  if (url.startsWith("http")) return url;
  let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
  return `${apiUrl}${url}`;
};

export default function Messages() {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryConversationId = searchParams.get("conversationId");
  const queryRecipientId = searchParams.get("recipientId");
  const [recipientHandling, setRecipientHandling] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);

  const [activeConversation, setActiveConversation] = useState(null);

  // Negotiation & Collaboration Header states
  const [negotiationAmount, setNegotiationAmount] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [isAgreeingOffer, setIsAgreeingOffer] = useState(false);
  const [isReopeningNegotiation, setIsReopeningNegotiation] = useState(false);
  const [viewAgreementOpen, setViewAgreementOpen] = useState(false);
  const [isNegotiationExpanded, setIsNegotiationExpanded] = useState(false);

  // Direct In-Chat Deliverables Sharing States
  const [shareWorkModalOpen, setShareWorkModalOpen] = useState(false);
  const [deliverableFile, setDeliverableFile] = useState(null);
  const [deliverableFilePreview, setDeliverableFilePreview] = useState(null);
  const [deliverableType, setDeliverableType] = useState("REEL");
  const [deliverableCaption, setDeliverableCaption] = useState("");
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  // Deliverable Review & Rework Modal States (Brand & Creator)
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [selectedSubmissionForRework, setSelectedSubmissionForRework] = useState(null);
  const [reworkFeedbackText, setReworkFeedbackText] = useState("");
  const [actionProcessingId, setActionProcessingId] = useState(null);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Media Attachment States (Photos & Videos for every chat: Brand, Creator, Admin)
  const [attachedMedia, setAttachedMedia] = useState(null);
  const [attachedMediaPreview, setAttachedMediaPreview] = useState(null);
  const [attachedMediaType, setAttachedMediaType] = useState(null);
  const mediaFileInputRef = useRef(null);

  // Modal states for Unsend / Delete Message and Delete Chat
  const [unsendModalOpen, setUnsendModalOpen] = useState(false);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const [deleteChatModalOpen, setDeleteChatModalOpen] = useState(false);
  const [selectedConversationForDelete, setSelectedConversationForDelete] = useState(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  // AI Pitch Generator Assistant States
  const [aiPitchModalOpen, setAiPitchModalOpen] = useState(false);
  const [aiPitchTone, setAiPitchTone] = useState("professional");
  const [aiPitchCustomPoints, setAiPitchCustomPoints] = useState("");
  const [isGeneratingAiPitch, setIsGeneratingAiPitch] = useState(false);
  const [generatedAiPitch, setGeneratedAiPitch] = useState("");

  // Barter Shipment & Tracking States
  const [shippingAddressModalOpen, setShippingAddressModalOpen] = useState(false);
  const [creatorAddressForm, setCreatorAddressForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [brandShipmentModalOpen, setBrandShipmentModalOpen] = useState(false);
  const [brandShipmentForm, setBrandShipmentForm] = useState({
    productName: "",
    productValue: "",
    productDescription: "",
    courierPartner: "BlueDart",
    trackingNumber: "",
    trackingUrl: "",
    shippingStatus: "DISPATCHED",
  });
  const [isSavingShipment, setIsSavingShipment] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);

  // Voice Recording States (Audio Note in Chat)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Video Timestamp Review Feedback States
  const [timestampModalOpen, setTimestampModalOpen] = useState(false);
  const [targetVideoSubmission, setTargetVideoSubmission] = useState(null);
  const [timestampSeconds, setTimestampSeconds] = useState(0);
  const [timestampFeedbackComment, setTimestampFeedbackComment] = useState("");
  const [isSubmittingTimestampComment, setIsSubmittingTimestampComment] = useState(false);
  const videoReviewPlayerRef = useRef(null);

  // Touch handling for mobile Unsend / Delete Chat
  const touchTimer = useRef(null);
  const [pressedMessageId, setPressedMessageId] = useState(null);
  const [pressedConversationId, setPressedConversationId] = useState(null);

  const handleTouchStartMessage = (msgId) => {
    touchTimer.current = setTimeout(() => {
      setPressedMessageId(msgId);
    }, 500); // 500ms long press
  };

  const handleTouchStartConversation = (convId) => {
    touchTimer.current = setTimeout(() => {
      setPressedConversationId(convId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    document.title = "Messages — Pravixo";
  }, []);

  /*
   * ----------------------------------------------------
   * GET CONVERSATIONS
   * ----------------------------------------------------
   */
  const fetchConversations = async () => {
    if (!profile?._id || !profile?.role) return;

    try {
      setLoading(true);

      const response = await api(
        `/api/conversations?profileId=${profile._id}&role=${profile.role}`,
        {
          method: "GET",
        }
      );

      const data =
        response?.data?.data ||
        response?.data ||
        [];

      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch conversations error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load conversations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchConversations();
    }
  }, [profile]);

  const activeConvIdRef = useRef(null);
  activeConvIdRef.current = activeConversation?._id;

  /*
   * ----------------------------------------------------
   * OPEN CONVERSATION
   * ----------------------------------------------------
   */
  const openConversation = async (conversation) => {
    if (!conversation?._id) return;
    const isNewSelection = activeConvIdRef.current !== conversation._id;

    // Sync active ID ref immediately to block re-triggering
    activeConvIdRef.current = conversation._id;

    // Keep URL in sync with selected conversation
    if (queryConversationId !== conversation._id) {
      setSearchParams({ conversationId: conversation._id }, { replace: true });
    }

    if (isNewSelection) {
      setActiveConversation(conversation);
      setMessages([]);
    }

    await fetchMessages(conversation._id, isNewSelection);
    await markConversationAsRead(conversation._id);

    // Update unread count locally without triggering full re-selection
    setConversations((prev) =>
      prev.map((item) =>
        item._id === conversation._id
          ? {
              ...item,
              unreadCount: 0,
            }
          : item
      )
    );
  };

  /*
   * ----------------------------------------------------
   * OPEN CONVERSATION FROM URL
   * ----------------------------------------------------
   */
  useEffect(() => {
    if (!queryConversationId || !profile?._id) return;

    // Prevent re-opening already active conversation
    if (activeConvIdRef.current === queryConversationId) return;

    const conversation = conversations.find(
      (item) => item._id === queryConversationId
    );

    if (conversation) {
      openConversation(conversation);
    } else {
      // If conversation is not yet in conversations list (e.g. newly created without messages or direct URL), fetch its details
      api.get(`/api/conversations/${queryConversationId}?profileId=${profile._id}`)
        .then((res) => {
          const convData = res?.data?.data;
          if (convData && convData._id) {
            openConversation(convData);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch conversation details from URL:", err);
        });
    }
  }, [queryConversationId, conversations, profile?._id]);

  /*
   * ----------------------------------------------------
   * OPEN CONVERSATION FROM recipientId QUERY PARAM
   * Finds existing conversation or creates new one and opens it
   * ----------------------------------------------------
   */
  useEffect(() => {
    if (!queryRecipientId || !profile?._id || recipientHandling) return;

    const handleRecipient = async () => {
      setRecipientHandling(true);
      try {
        // 1. Check if there's already a conversation with this recipient in existing list
        let existing = conversations.find((conv) => {
          const otherId =
            conv.otherProfile?._id ||
            conv.creatorId?._id || conv.creatorId ||
            conv.brandId?._id || conv.brandId ||
            conv.adminId?._id || conv.adminId;
          return String(otherId) === String(queryRecipientId);
        });

        if (existing) {
          // Already have a conversation — open it
          setSearchParams({ conversationId: existing._id }, { replace: true });
          openConversation(existing);
        } else {
          // No existing conversation in state — create or find one via backend API
          const myRole = profile.role; // 'creator' or 'brand'
          const payload =
            myRole === "creator"
              ? { creatorId: profile._id, brandId: queryRecipientId }
              : { brandId: profile._id, creatorId: queryRecipientId };

          const res = await api.post("/api/conversations", payload);
          const targetConv = res?.data?.conversation;
          const convId = res?.data?.data || targetConv?._id;

          // Reload fresh conversations list
          const convListRes = await api.get(`/api/conversations?profileId=${profile._id}&role=${profile.role}`);
          const freshList = convListRes?.data?.data || convListRes?.data || [];
          setConversations(Array.isArray(freshList) ? freshList : []);

          if (convId) {
            setSearchParams({ conversationId: convId }, { replace: true });
            const matched = Array.isArray(freshList) ? freshList.find((c) => String(c._id) === String(convId)) : null;
            if (matched) {
              openConversation(matched);
            } else if (targetConv) {
              openConversation(targetConv);
            }
          }
        }
      } catch (err) {
        console.error("recipientId conversation open error:", err);
        toast.error("Could not open conversation.");
      } finally {
        setRecipientHandling(false);
      }
    };

    handleRecipient();
  }, [queryRecipientId, profile?._id, conversations.length]);

  /*
   * ----------------------------------------------------
   * GET MESSAGES
   * ----------------------------------------------------
   */
  const fetchMessages = async (conversationId, showLoading = true) => {
    try {
      if (showLoading) setMessagesLoading(true);

      const response = await api(
        `/api/messages/${conversationId}`,
        {
          method: "GET",
        }
      );

      const data =
        response?.data?.data ||
        response?.data ||
        [];

      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch messages error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load messages."
      );
    } finally {
      if (showLoading) setMessagesLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };



  /*
   * ----------------------------------------------------
   * REAL-TIME POLLING
   * ----------------------------------------------------
   */
  useEffect(() => {
    let interval;
    if (activeConversation?._id && profile?._id) {
      interval = setInterval(() => {
        // Silently fetch new messages without triggering loading state
        api(`/api/messages/${activeConversation._id}`)
          .then((response) => {
            const data = response?.data?.data || response?.data || [];
            const newMessages = Array.isArray(data) ? data : [];
            setMessages((prev) => {
              if (prev.length !== newMessages.length || (prev.length > 0 && prev[prev.length - 1]?._id !== newMessages[newMessages.length - 1]?._id)) {
                setTimeout(scrollToBottom, 100);
                return newMessages;
              }
              return prev;
            });
          })
          .catch(console.error);

        // Also fetch conversations quietly to update unread counts, last message, and collaboration status
        api(`/api/conversations?profileId=${profile._id}&role=${profile.role}`)
          .then((response) => {
            const data = response?.data?.data || response?.data || [];
            const list = Array.isArray(data) ? data : [];
            setConversations((prev) => {
              const prevStr = JSON.stringify(prev);
              const nextStr = JSON.stringify(list);
              if (prevStr !== nextStr) {
                return list;
              }
              return prev;
            });
            if (activeConversation?._id) {
              const currentUpdated = list.find((c) => c._id === activeConversation._id);
              if (currentUpdated && currentUpdated.connection) {
                setActiveConversation((prev) => {
                  if (
                    prev?.connection?.status !== currentUpdated.connection.status ||
                    prev?.connection?.proposedRate !== currentUpdated.connection.proposedRate ||
                    prev?.connection?.agreedRate !== currentUpdated.connection.agreedRate
                  ) {
                    return {
                      ...prev,
                      connection: currentUpdated.connection,
                    };
                  }
                  return prev;
                });
              }
            }
          })
          .catch(console.error);
      }, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeConversation?._id, profile?._id, profile?.role]);

  /*
   * ----------------------------------------------------
   * MARK AS READ
   * ----------------------------------------------------
   */
  const markConversationAsRead = async (conversationId) => {
    if (!profile?._id) return;

    try {
      await api(
        `/api/conversations/${conversationId}/read`,
        {
          method: "PATCH",
          data: {
            profileId: profile._id,
          },
        }
      );
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  };

  /*
   * ----------------------------------------------------
   * NEGOTIATION HANDLERS
   * ----------------------------------------------------
   */
  const handleProposeAmount = async (e) => {
    e?.preventDefault();
    const connId = activeConversation?.connection?._id;
    if (!connId) {
      toast.error("No active collaboration connection found.");
      return;
    }

    const num = Number(negotiationAmount);
    if (!num || num <= 0) {
      toast.error("Please enter a valid amount greater than ₹0.");
      return;
    }

    try {
      setIsSubmittingOffer(true);
      const res = await api.patch(`/api/connections/${connId}/propose-amount`, {
        amount: num,
      });

      const updatedConn = res?.data?.data || res?.data;
      if (updatedConn) {
        setActiveConversation((prev) => ({
          ...prev,
          connection: updatedConn,
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConversation._id
              ? { ...c, connection: updatedConn }
              : c
          )
        );
      }

      toast.success(`Proposed creator amount ₹${num.toLocaleString()} successfully!`);
      setNegotiationAmount("");
      setIsReopeningNegotiation(false);
      await fetchConversations();
    } catch (error) {
      console.error("Propose offer error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to propose payment amount."
      );
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleAgreeAmount = async () => {
    const connId = activeConversation?.connection?._id;
    if (!connId) {
      toast.error("No active collaboration connection found.");
      return;
    }

    try {
      setIsAgreeingOffer(true);
      const res = await api.patch(`/api/connections/${connId}/agree-amount`);

      const updatedConn = res?.data?.data || res?.data;
      if (updatedConn) {
        setActiveConversation((prev) => ({
          ...prev,
          connection: updatedConn,
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConversation._id
              ? { ...c, connection: updatedConn }
              : c
          )
        );
      }

      toast.success("Payment amount agreed successfully!");
      setIsReopeningNegotiation(false);
      await fetchConversations();
    } catch (error) {
      console.error("Agree offer error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to agree on payment amount."
      );
    } finally {
      setIsAgreeingOffer(false);
    }
  };

  /*
   * ----------------------------------------------------
   * TASK 4: COLLABORATION PAYMENT HANDLER (BRAND -> PRAVIXO)
   * ----------------------------------------------------
   */
  const [isPayingCollaboration, setIsPayingCollaboration] = useState(false);

  const handlePayCollaboration = async () => {
    const connId = activeConversation?.connection?._id;
    if (!connId) {
      toast.error("No active collaboration connection found.");
      return;
    }

    try {
      setIsPayingCollaboration(true);

      // Step 1: Request Order from backend
      const res = await api.post(`/api/payments/collaboration/${connId}/order`);
      const orderData = res.data?.data || res.data;

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to generate payment order.");
      }

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Pravixo Platform",
        description: `Payment for Campaign Collaboration (${activeConversation.campaign?.title || "Campaign"})`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            setIsPayingCollaboration(true);
            // Step 3: Server-side signature verification
            const verifyRes = await api.post(`/api/payments/collaboration/${connId}/verify`, {
              gatewayOrderId: response.razorpay_order_id,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature,
            });

            const updatedConn = verifyRes.data?.data?.connection || {
              ...activeConversation.connection,
              paymentStatus: "PAID",
            };

            setActiveConversation((prev) => ({
              ...prev,
              connection: updatedConn,
            }));

            setConversations((prev) =>
              prev.map((c) =>
                c._id === activeConversation._id
                  ? { ...c, connection: updatedConn }
                  : c
              )
            );

            toast.success("Payment successful! Funds secured with Pravixo.");
            await fetchConversations();
          } catch (verifyErr) {
            console.error("Verification error:", verifyErr);
            toast.error(verifyErr?.response?.data?.message || verifyErr.message || "Payment verification failed.");
          } finally {
            setIsPayingCollaboration(false);
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
            setIsPayingCollaboration(false);
            toast.info("Payment window closed.");
          },
        },
      };

      if (!window.Razorpay) {
        // Dynamically load Razorpay script if not loaded
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
    } catch (error) {
      console.error("Initiate payment error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to initiate payment."
      );
      setIsPayingCollaboration(false);
    }
  };

  /*
   * ----------------------------------------------------
   * DELIVERABLES SHARING & REVIEW HANDLERS (IN CHAT)
   * ----------------------------------------------------
   */
  const handleShareDeliverable = async (e) => {
    e?.preventDefault();
    const connId = activeConversation?.connection?._id;
    if (!connId || !deliverableFile) {
      toast.error("Please select a photo or video to share.");
      return;
    }

    try {
      setSubmittingDeliverable(true);
      const formData = new FormData();
      formData.append("deliverableType", deliverableType);
      formData.append("file", deliverableFile);
      if (deliverableCaption) formData.append("caption", deliverableCaption);

      const res = await api.post(`/api/submissions/${connId}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Deliverable submitted and shared to chat!");
        setShareWorkModalOpen(false);
        setDeliverableFile(null);
        setDeliverableFilePreview(null);
        setDeliverableCaption("");
        await fetchMessages(activeConversation._id, false);
      }
    } catch (err) {
      console.error("Submit deliverable error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit deliverable.");
    } finally {
      setSubmittingDeliverable(false);
    }
  };

  const handleApproveSubmission = async (submissionId) => {
    if (!submissionId) return;
    try {
      setActionProcessingId(submissionId);
      const res = await api.patch(`/api/submissions/${submissionId}/approve`);
      if (res.data.success) {
        toast.success("Deliverable approved!");
        await fetchMessages(activeConversation._id, false);
      }
    } catch (err) {
      console.error("Approve deliverable error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to approve deliverable.");
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleRejectSubmission = async (e) => {
    e?.preventDefault();
    if (!selectedSubmissionForRework || !reworkFeedbackText.trim()) {
      toast.error("Please provide feedback notes for the rework request.");
      return;
    }

    try {
      setActionProcessingId(selectedSubmissionForRework);
      const res = await api.patch(`/api/submissions/${selectedSubmissionForRework}/reject`, {
        feedbackNotes: reworkFeedbackText.trim(),
      });
      if (res.data.success) {
        toast.success("Rework requested with feedback!");
        setReworkModalOpen(false);
        setSelectedSubmissionForRework(null);
        setReworkFeedbackText("");
        await fetchMessages(activeConversation._id, false);
      }
    } catch (err) {
      console.error("Reject deliverable error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to request rework.");
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleMediaFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size cannot exceed 50MB.");
      return;
    }

    setAttachedMedia(file);
    const isVid = file.type.startsWith("video/");
    setAttachedMediaType(isVid ? "video" : "image");
    setAttachedMediaPreview(URL.createObjectURL(file));
  };

  const removeAttachedMedia = () => {
    if (attachedMediaPreview) {
      URL.revokeObjectURL(attachedMediaPreview);
    }
    setAttachedMedia(null);
    setAttachedMediaPreview(null);
    setAttachedMediaType(null);
    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = "";
    }
  };

  /*
   * ----------------------------------------------------
   * SEND MESSAGE (Supports text and photo/video attachments)
   * ----------------------------------------------------
   */
  const sendMessage = async (e) => {
    e.preventDefault();

    const text = message.trim();

    if ((!text && !attachedMedia) || sending || !activeConversation || !profile?._id) {
      return;
    }

    try {
      setSending(true);

      let response;
      if (attachedMedia) {
        const formData = new FormData();
        formData.append("conversationId", activeConversation._id);
        formData.append("senderId", profile._id);
        if (text) formData.append("text", text);
        formData.append("file", attachedMedia);

        response = await api.post("/api/messages", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await api("/api/messages", {
          method: "POST",
          data: {
            conversationId: activeConversation._id,
            senderId: profile._id,
            text,
          },
        });
      }

      const newMessage =
        response?.data?.data ||
        response?.data;

      if (newMessage) {
        setMessages((prev) => [
          ...prev,
          newMessage,
        ]);
      }

      setMessage("");
      removeAttachedMedia();

      // Refresh conversation list so lastMessage updates
      await fetchConversations();
    } catch (error) {
      console.error("Send message error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  };

  /*
   * ----------------------------------------------------
   * VOICE AUDIO NOTE RECORDING HANDLERS
   * ----------------------------------------------------
   */
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone permission required to record voice notes.");
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setRecordingDuration(0);
  };

  const handleSendVoiceNote = async () => {
    if (!mediaRecorderRef.current || !activeConversation?._id || !profile?._id) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    mediaRecorderRef.current.onstop = async () => {
      try {
        setSending(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("conversationId", activeConversation._id);
        formData.append("senderId", profile._id);
        formData.append("messageType", "voice_note");
        formData.append("text", `🎤 Voice Note (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, "0")})`);
        formData.append("file", audioFile);
        formData.append(
          "metadata",
          JSON.stringify({
            duration: recordingDuration,
            mediaType: "audio",
          })
        );

        const response = await api.post("/api/messages", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const newMessage = response?.data?.data || response?.data;
        if (newMessage) {
          setMessages((prev) => [...prev, newMessage]);
        }

        setIsRecordingVoice(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
        await fetchConversations();
        toast.success("Voice note sent!");
      } catch (err) {
        console.error("Voice note send error:", err);
        toast.error("Failed to send voice note.");
      } finally {
        setSending(false);
        mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      }
    };

    mediaRecorderRef.current.stop();
  };

  /*
   * ----------------------------------------------------
   * VIDEO TIMESTAMP REVIEW FEEDBACK HANDLERS
   * ----------------------------------------------------
   */
  const handleOpenTimestampReview = (submissionMeta) => {
    setTargetVideoSubmission(submissionMeta);
    setTimestampSeconds(0);
    setTimestampFeedbackComment("");
    setTimestampModalOpen(true);
  };

  const handleSendTimestampFeedback = async (e) => {
    e.preventDefault();
    if (!activeConversation?._id || !profile?._id || !targetVideoSubmission || !timestampFeedbackComment.trim()) {
      return;
    }

    try {
      setIsSubmittingTimestampComment(true);
      const minutes = Math.floor(timestampSeconds / 60);
      const seconds = Math.floor(timestampSeconds % 60);
      const formattedTimestamp = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      const response = await api.post("/api/messages", {
        conversationId: activeConversation._id,
        senderId: profile._id,
        messageType: "timestamp_feedback",
        text: `⏱️ [${formattedTimestamp}] ${timestampFeedbackComment.trim()}`,
        metadata: {
          timestampSeconds: Math.floor(timestampSeconds),
          formattedTimestamp,
          feedbackText: timestampFeedbackComment.trim(),
          videoUrl: targetVideoSubmission.contentUrl,
          submissionId: targetVideoSubmission.submissionId,
          deliverableType: targetVideoSubmission.deliverableType || "REEL",
        },
      });

      const newMessage = response?.data?.data || response?.data;
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
      }

      toast.success(`Timestamp feedback placed at ${formattedTimestamp}!`);
      setTimestampModalOpen(false);
      setTimestampFeedbackComment("");
      await fetchConversations();
    } catch (err) {
      console.error("Timestamp feedback error:", err);
      toast.error("Failed to post timestamp review feedback.");
    } finally {
      setIsSubmittingTimestampComment(false);
    }
  };

  /*
   * ----------------------------------------------------
   * UNSEND / DELETE MESSAGE HANDLER
   * ----------------------------------------------------
   */
  const handleUnsend = async (messageId, mode = "for_everyone", deleteFromDb = false) => {
    if (!messageId || !profile?._id) return;

    try {
      setIsDeletingMessage(true);
      const res = await api.patch(`/api/messages/${messageId}/unsend`, {
        profileId: profile._id,
        mode,
        deleteFromDb,
      });

      if (res.data.success) {
        if (deleteFromDb) {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
          toast.success("Message deleted from database.");
        } else {
          setMessages((prev) =>
            prev.map((m) => {
              if (m._id !== messageId) return m;
              if (mode === "for_everyone") return { ...m, unsent: true };
              if (mode === "for_creator") return { ...m, deletedForCreator: true };
              if (mode === "for_brand") return { ...m, deletedForBrand: true };
              return { ...m, unsent: true };
            })
          );
          toast.success(
            mode === "for_everyone"
              ? "Message unsent for everyone"
              : "Message deleted for you"
          );
        }
        setUnsendModalOpen(false);
        setSelectedMessageForAction(null);
        await fetchConversations();
      }
    } catch (error) {
      console.error("Unsend message error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to unsend message."
      );
    } finally {
      setIsDeletingMessage(false);
    }
  };

  /*
   * ----------------------------------------------------
   * DELETE CONVERSATION (PERMANENT DB DELETE OR ARCHIVE)
   * ----------------------------------------------------
   */
  const handleDeleteConversationInDb = async (conversation, deleteFromDb = true) => {
    if (!conversation?._id) return;

    try {
      setIsDeletingConversation(true);

      if (deleteFromDb) {
        // Hard delete conversation & its messages from DB
        await api.delete(`/api/conversations/${conversation._id}`, {
          data: {
            profileId: profile._id,
            role: profile.role,
            deleteFromDb: true,
          },
        });

        setConversations((prev) => prev.filter((c) => c._id !== conversation._id));
        if (activeConversation?._id === conversation._id) {
          setActiveConversation(null);
          setMessages([]);
        }
        toast.success("Conversation deleted permanently from database.");
      } else {
        // Soft delete/archive
        await toggleArchive(conversation);
      }
      setDeleteChatModalOpen(false);
      setSelectedConversationForDelete(null);
    } catch (error) {
      console.error("Delete conversation error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete conversation."
      );
    } finally {
      setIsDeletingConversation(false);
    }
  };

  /*
   * ----------------------------------------------------
   * ARCHIVE / UNARCHIVE (Now "Delete Chat")
   * ----------------------------------------------------
   */
  const toggleArchive = async (conversation) => {
    if (!conversation?._id) return;

    try {
      const response = await api(
        `/api/conversations/${conversation._id}/archive`,
        {
          method: "PATCH",
        }
      );

      const updatedConversation =
        response?.data?.data ||
        response?.data;

      setConversations((prev) =>
        prev.map((item) =>
          item._id === conversation._id
            ? {
                ...item,
                archived:
                  updatedConversation?.archived ??
                  !item.archived,
              }
            : item
        )
      );

      // If currently open conversation is archived
      if (
        activeConversation?._id === conversation._id
      ) {
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                archived:
                  updatedConversation?.archived ??
                  !prev.archived,
              }
            : null
        );
      }

      toast.success(
        conversation.archived
          ? "Conversation unarchived"
          : "Conversation archived"
      );
    } catch (error) {
      console.error("Archive error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update conversation."
      );
    }
  };

  /*
   * ----------------------------------------------------
   * FILTER CONVERSATIONS
   * ----------------------------------------------------
   */
  const filteredConversations = conversations.filter(
    (conversation) => {
      const name =
        conversation?.otherProfile?.fullName || "";

      const matchesSearch = name
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "all") {
        return !conversation.archived;
      }

      if (activeFilter === "unread") {
        return (
          !conversation.archived &&
          conversation.unreadCount > 0
        );
      }

      if (activeFilter === "archived") {
        return conversation.archived;
      }

      return true;
    }
  );

  /*
   * ----------------------------------------------------
   * OTHER PROFILE
   * ----------------------------------------------------
   */
  const otherProfile =
    activeConversation?.otherProfile;

  /*
   * ----------------------------------------------------
   * NOT LOGGED IN
   * ----------------------------------------------------
   */
  if (!profile) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">
          Please log in to view messages.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-[1700px] flex-col px-3 sm:px-6 py-2 sm:py-3">

      {/* PAGE HEADER */}
      <div className="mb-2 sm:mb-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">
            Messages
          </h1>

          <p className="text-xs text-muted-foreground">
            Manage your collaborations and inquiries.
          </p>
        </div>
      </div>

      {/* MAIN CHAT CONTAINER */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[330px_1fr] xl:grid-cols-[360px_1fr]">

        {/* ==================================================
            LEFT SIDEBAR
        ================================================== */}
        <div
          className={`flex flex-col min-h-0 h-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm ${
            activeConversation
              ? "hidden lg:flex"
              : "flex"
          }`}
        >

          {/* SEARCH + FILTER */}
          <div className="space-y-4 border-b border-border p-4">

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />

              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-full border-0 bg-secondary/50 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* FILTERS */}
            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  setActiveFilter("all")
                }
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  activeFilter === "all"
                    ? "gradient-sunset text-white"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter("unread")
                }
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  activeFilter === "unread"
                    ? "gradient-sunset text-white"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                Unread
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter("archived")
                }
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  activeFilter === "archived"
                    ? "gradient-sunset text-white"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                Deleted
              </button>

            </div>
          </div>

          {/* CONVERSATIONS */}
          <div className="flex-1 min-h-0 overflow-y-auto">

            {loading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Loading conversations...
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                <p className="text-sm text-muted-foreground">
                  No conversations found.
                </p>
              </div>
            ) : (
              filteredConversations.map(
                (conversation) => {
                  const other =
                    conversation?.otherProfile;

                  return (
                    <div
                      key={conversation._id}
                      onClick={() =>
                        openConversation(conversation)
                      }
                      onTouchStart={() => handleTouchStartConversation(conversation._id)}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      className={`relative flex cursor-pointer items-center gap-3 border-b border-border/50 p-4 transition hover:bg-secondary/50 ${
                        activeConversation?._id ===
                        conversation._id
                          ? "border-l-4 border-l-primary bg-accent/40"
                          : ""
                      }`}
                    >
                      {/* Mobile Delete Chat Popup */}
                      {pressedConversationId === conversation._id && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchive(conversation);
                              setPressedConversationId(null);
                            }}
                            className="rounded-full bg-red-500 px-6 py-2 text-sm font-medium text-white shadow-lg"
                          >
                            {conversation.archived ? "Restore Chat" : "Delete Chat"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPressedConversationId(null);
                            }}
                            className="ml-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground shadow-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* AVATAR */}
                      <div className="relative shrink-0">

                        <img src={
                            (other?.role === "admin" || conversation.conversationType?.startsWith("admin_"))
                              ? logoImg
                              : (resolveImageUrl(other?.avatarUrl) ||
                                `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
                                  other?.fullName ||
                                    "User"
                                )}`)
                          }
                          alt={
                            (other?.role === "admin" || conversation.conversationType?.startsWith("admin_"))
                              ? "Pravixo Admin"
                              : (other?.fullName || "User")
                          }
                          className="h-12 w-12 rounded-2xl object-contain bg-white/95 p-1 border border-border/50 shadow-soft"
                         onError={(e) => { e.target.onerror = null; e.target.src = logoImg; }} />

                        {conversation.unreadCount >
                          0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-card">
                            {conversation.unreadCount}
                          </span>
                        )}

                      </div>

                      {/* INFO */}
                      <div className="min-w-0 flex-1">

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="truncate font-display font-semibold">
                              {other?.role === "admin" || conversation.conversationType?.startsWith("admin_")
                                ? "Pravixo Admin"
                                : other?.fullName || "Unknown User"}
                            </h4>
                            {(other?.role === "admin" || conversation.conversationType?.startsWith("admin_")) && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
                                🛡️ Admin
                              </span>
                            )}
                          </div>

                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {conversation.lastMessage
                              ?.createdAt
                              ? new Date(
                                  conversation.lastMessage.createdAt
                                ).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : ""}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between">

                          <p className="flex-1 truncate pr-2 text-xs text-muted-foreground">
                            {conversation
                              .lastMessage
                              ?.text ||
                              "No messages"}
                          </p>

                          {/* DELETE / ARCHIVE CONVERSATION */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConversationForDelete(conversation);
                              setDeleteChatModalOpen(true);
                            }}
                            className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-red-500"
                            title="Chat Options (Delete / Archive)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                        </div>
                      </div>
                    </div>
                  );
                }
              )
            )}

          </div>
        </div>

        {/* ==================================================
            RIGHT CHAT AREA
        ================================================== */}
        <div
          className={`flex flex-col min-h-0 h-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm ${
            activeConversation
              ? "flex"
              : "hidden lg:flex"
          }`}
        >

          {activeConversation ? (() => {
            const otherProfile =
              activeConversation.otherProfile ||
              (activeConversation.creatorId && typeof activeConversation.creatorId === "object" && String(activeConversation.creatorId._id) !== String(profile?._id)
                ? activeConversation.creatorId
                : activeConversation.brandId && typeof activeConversation.brandId === "object" && String(activeConversation.brandId._id) !== String(profile?._id)
                ? activeConversation.brandId
                : activeConversation.creatorId || activeConversation.brandId);

            const isOtherAdmin = otherProfile?.role === "admin" || activeConversation.conversationType?.startsWith("admin_");

            return (
              <>
                {/* CHAT HEADER */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">

                  {/* MOBILE BACK */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveConversation(null)
                    }
                    className="rounded-xl p-2 hover:bg-secondary lg:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {/* AVATAR */}
                  <img src={
                      isOtherAdmin
                        ? logoImg
                        : (resolveImageUrl(otherProfile?.avatarUrl) ||
                          `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
                            otherProfile?.fullName ||
                              "User"
                          )}`)
                    }
                    alt={
                      isOtherAdmin
                        ? "Pravixo Admin"
                        : (otherProfile?.fullName || "User")
                    }
                    className="h-11 w-11 rounded-2xl object-contain bg-white/95 p-1 border border-border/50"
                   onError={(e) => { e.target.onerror = null; e.target.src = logoImg; }} />

                  {/* NAME */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-display font-semibold">
                        {isOtherAdmin
                          ? "Pravixo Admin"
                          : otherProfile?.fullName || "Unknown User"}
                      </h2>
                      {isOtherAdmin && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                          🛡️ Pravixo Team
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {isOtherAdmin
                        ? "Official Support & Platform Coordination"
                        : activeConversation.status === "active"
                        ? "Active conversation"
                        : activeConversation.status}
                    </p>
                  </div>

                  {/* DELETE / CHAT OPTIONS */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConversationForDelete(activeConversation);
                      setDeleteChatModalOpen(true);
                    }}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-red-500"
                    title="Delete or Archive Chat"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>

                </div>

              {/* COLLABORATION & PAYMENT NEGOTIATION BAR (CLEAN & COLLAPSIBLE) */}
              {activeConversation.connection && (
                <div className="border-b border-border bg-card/70 backdrop-blur-md shrink-0 transition-all duration-300">
                  {(() => {
                    const conn = activeConversation.connection;
                    const camp = activeConversation.campaign;
                    const isAgreed = conn.collaborationStatus === "AMOUNT_AGREED" && !isReopeningNegotiation;
                    const hasPendingProposal = conn.proposedAmount > 0 && conn.collaborationStatus === "NEGOTIATING";
                    const isProposedByMe = String(conn.proposedBy) === String(profile._id);

                    // Calculations (Brand pays total amount, Pravixo cuts 20% fee, Creator receives 80%)
                    const displayBrandTotal = isAgreed ? conn.brandTotal : (conn.proposedAmount || 0);
                    const displayFee = isAgreed ? conn.pravixoFee : Math.round(displayBrandTotal * 0.20);
                    const displayCreatorAmount = isAgreed ? conn.creatorAmount : (displayBrandTotal - displayFee);

                    return (
                      <div>
                        {/* COMPACT TOP BAR */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-display text-xs font-bold text-foreground truncate">
                                  {camp?.title || "Campaign Collaboration"}
                                </span>
                                {isAgreed ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] py-0 px-2 font-bold flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3" /> ₹{conn.creatorAmount?.toLocaleString()} Agreed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0 px-2 font-semibold">
                                    Negotiating Rate
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Propose / Counter Quick Button */}
                            {!isAgreed && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsNegotiationExpanded(!isNegotiationExpanded)}
                                className="h-7 rounded-full border-primary/30 text-primary hover:bg-primary/10 text-[11px] font-semibold px-2.5 flex items-center gap-1 cursor-pointer"
                              >
                                <IndianRupee className="h-3 w-3" />
                                <span>{hasPendingProposal ? (isProposedByMe ? "Counter Offer" : "Review Offer") : "Propose Rate"}</span>
                              </Button>
                            )}

                            {/* Payment Status / Action */}
                            {isAgreed && (
                              <>
                                {conn.paymentStatus === "PAID" ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] py-0 px-2 font-bold flex items-center gap-1">
                                    ✓ Escrow Funded
                                  </Badge>
                                ) : profile.role === "brand" ? (
                                  <Button
                                    size="sm"
                                    onClick={handlePayCollaboration}
                                    disabled={isPayingCollaboration}
                                    className="h-7 rounded-full gradient-sunset text-white font-bold text-[11px] px-3 shadow-glow flex items-center gap-1 cursor-pointer"
                                  >
                                    <IndianRupee className="h-3 w-3" />
                                    {isPayingCollaboration ? "Paying..." : `Pay ₹${conn.brandTotal?.toLocaleString()}`}
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0 px-2 font-medium">
                                    Payment Pending
                                  </Badge>
                                )}
                              </>
                            )}

                            {isAgreed && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewAgreementOpen(true)}
                                className="h-7 rounded-full border-border hover:bg-secondary text-[11px] font-medium px-2.5 flex items-center gap-1"
                              >
                                <FileText className="h-3 w-3 text-primary" /> Agreement
                              </Button>
                            )}

                            {/* Creator Share Work Quick Button in Header */}
                            {profile.role === "creator" && conn.paymentStatus === "PAID" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setDeliverableFile(null);
                                  setDeliverableFilePreview(null);
                                  setDeliverableCaption("");
                                  setShareWorkModalOpen(true);
                                }}
                                className="h-7 rounded-full gradient-sunset border-0 text-white text-[11px] font-bold px-3 shadow-glow flex items-center gap-1 cursor-pointer"
                              >
                                <Upload className="h-3 w-3" /> Share Work
                              </Button>
                            )}

                            {/* Quick Barter Shipping Action Button in Top Header */}
                            {(conn.barterDetails?.isBarter || conn.appliedTier?.reward?.toLowerCase().includes("barter") || conn.appliedTier?.perks?.toLowerCase().includes("product") || conn.appliedTier?.cashAmount === 0 || camp?.isBarterAllowed) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (profile.role === "creator") {
                                    if (conn.barterDetails?.creatorShippingAddress) {
                                      setCreatorAddressForm({ ...conn.barterDetails.creatorShippingAddress });
                                    }
                                    setShippingAddressModalOpen(true);
                                  } else {
                                    if (conn.barterDetails) {
                                      setBrandShipmentForm({
                                        productName: conn.barterDetails.productName || "",
                                        productValue: conn.barterDetails.productValue || "",
                                        productDescription: conn.barterDetails.productDescription || "",
                                        courierPartner: conn.barterDetails.courierPartner || "BlueDart",
                                        trackingNumber: conn.barterDetails.trackingNumber || "",
                                        trackingUrl: conn.barterDetails.trackingUrl || "",
                                        shippingStatus: conn.barterDetails.shippingStatus || "DISPATCHED",
                                      });
                                    }
                                    setBrandShipmentModalOpen(true);
                                  }
                                }}
                                className="h-7 rounded-full bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20 text-[11px] font-semibold px-2.5 flex items-center gap-1 cursor-pointer"
                                title="Barter Product Seeding & Tracking"
                              >
                                <Package className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{profile.role === "creator" ? (conn.barterDetails?.creatorShippingAddress?.addressLine1 ? "📦 Address Saved" : "📍 Add Address") : "🚚 Dispatch Product"}</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsNegotiationExpanded(!isNegotiationExpanded)}
                              className="h-7 rounded-full text-muted-foreground hover:text-foreground text-[11px] px-2 flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{isNegotiationExpanded ? "Hide" : "Details"}</span>
                              {isNegotiationExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>

                        {/* EXPANDABLE DETAILS DRAWER */}
                        {isNegotiationExpanded && (
                          <div className="border-t border-border/50 bg-background/95 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            {camp && (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pb-2 border-b border-border/40">
                                <span><strong>Campaign:</strong> {camp.title}</span>
                                {profile?.role !== "creator" && (
                                  <>
                                    <span>•</span>
                                    <span><strong>Total Budget:</strong> ₹{camp.totalBudget?.toLocaleString() || "0"}</span>
                                  </>
                                )}
                                {camp.maxBudgetPerCreator > 0 && (
                                  <>
                                    <span>•</span>
                                    <span><strong>Max/Creator:</strong> ₹{camp.maxBudgetPerCreator?.toLocaleString()}</span>
                                  </>
                                )}
                              </div>
                            )}

                            {isAgreed ? (
                              <div className="space-y-3">
                                {profile?.role === "creator" ? (
                                  <div className="rounded-xl bg-secondary/30 p-3 border border-border/60">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
                                      Creator Payout
                                    </span>
                                    <span className="text-base font-bold text-emerald-600">
                                      ₹{conn.creatorAmount?.toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-secondary/30 p-3 border border-border/60">
                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
                                        Creator Payout
                                      </span>
                                      <span className="text-sm font-bold text-emerald-600">
                                        ₹{conn.creatorAmount?.toLocaleString()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
                                        Pravixo Fee (20%)
                                      </span>
                                      <span className="text-sm font-bold text-foreground">
                                        ₹{conn.pravixoFee?.toLocaleString()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
                                        Brand Total
                                      </span>
                                      <span className="text-sm font-bold text-primary">
                                        ₹{conn.brandTotal?.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Deliverables Progress Grid */}
                                {conn.deliverablesTracking && conn.deliverablesTracking.length > 0 && (
                                  <div className="rounded-xl border border-border/80 bg-secondary/10 p-3 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                      <span className="uppercase tracking-wider text-muted-foreground text-[10px]">
                                        Campaign Deliverables Status
                                      </span>
                                      {conn.paymentStatus === "PAID" && (() => {
                                        const totalReq = conn.deliverablesTracking.reduce((acc, d) => acc + (d.requiredQuantity || 0), 0);
                                        const totalComp = conn.deliverablesTracking.reduce((acc, d) => acc + (d.completedQuantity || 0), 0);
                                        const pct = totalReq > 0 ? Math.round((totalComp / totalReq) * 100) : 0;
                                        return (
                                          <span className="text-primary text-xs font-bold">
                                            {totalComp}/{totalReq} Approved ({pct}%)
                                          </span>
                                        );
                                      })()}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {conn.deliverablesTracking.map((deliv, dIdx) => {
                                        const typeLabels = { REEL: "Reels", POST: "Posts", STORY: "Stories", VIDEO: "Videos" };
                                        const isCompleted = (deliv.completedQuantity || 0) >= (deliv.requiredQuantity || 1);
                                        return (
                                          <div
                                            key={dIdx}
                                            className={cn(
                                              "flex flex-col p-2 rounded-lg border text-xs",
                                              isCompleted
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                                                : conn.paymentStatus === "PAID"
                                                ? "bg-secondary/50 border-border"
                                                : "bg-muted/30 border-border/40 opacity-60"
                                            )}
                                          >
                                            <div className="flex items-center justify-between text-[11px] font-medium">
                                              <span>{typeLabels[deliv.type] || deliv.type}</span>
                                              {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                                            </div>
                                            <div className="mt-1 flex items-baseline justify-between text-xs">
                                              <span className="font-bold">
                                                {deliv.completedQuantity || 0} / {deliv.requiredQuantity}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Barter / Product Seeding Tracking Section */}
                                {(conn.barterDetails?.isBarter || conn.appliedTier?.reward?.toLowerCase().includes("barter") || conn.appliedTier?.perks?.toLowerCase().includes("product") || conn.appliedTier?.cashAmount === 0) && (
                                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-emerald-600" />
                                        <span className="text-xs font-bold text-foreground">
                                          Barter Product Seeding & Tracking
                                        </span>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] uppercase font-bold px-2 py-0.5",
                                          conn.barterDetails?.shippingStatus === "CONFIRMED_BY_CREATOR" && "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
                                          conn.barterDetails?.shippingStatus === "DELIVERED" && "bg-blue-500/20 text-blue-700 border-blue-500/40",
                                          conn.barterDetails?.shippingStatus === "DISPATCHED" && "bg-amber-500/20 text-amber-700 border-amber-500/40",
                                          (!conn.barterDetails?.shippingStatus || conn.barterDetails?.shippingStatus === "NOT_SHIPPED") && "bg-secondary text-muted-foreground"
                                        )}
                                      >
                                        {conn.barterDetails?.shippingStatus ? conn.barterDetails.shippingStatus.replace(/_/g, " ") : "NOT SHIPPED"}
                                      </Badge>
                                    </div>

                                    {/* Shipping Info Card */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-background/80 p-3 rounded-xl border border-border/60">
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Product Gifted</p>
                                        <p className="font-bold text-foreground mt-0.5">
                                          {conn.barterDetails?.productName || "Collaboration Product Box"}
                                          {conn.barterDetails?.productValue ? ` (Est. ₹${conn.barterDetails.productValue.toLocaleString()})` : ""}
                                        </p>
                                        {conn.barterDetails?.productDescription && (
                                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{conn.barterDetails.productDescription}</p>
                                        )}
                                      </div>

                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Shipping / Tracking</p>
                                        {conn.barterDetails?.trackingNumber ? (
                                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                            <span className="font-mono font-bold text-foreground">{conn.barterDetails.courierPartner}: {conn.barterDetails.trackingNumber}</span>
                                            {conn.barterDetails?.trackingUrl && (
                                              <a
                                                href={conn.barterDetails.trackingUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                                              >
                                                Track <ExternalLink className="h-2.5 w-2.5" />
                                              </a>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-muted-foreground italic mt-0.5">Tracking not yet provided by brand.</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Actions for Creator and Brand */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      {/* Creator Action: Provide Address or Confirm Received */}
                                      {profile?.role === "creator" ? (
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              if (conn.barterDetails?.creatorShippingAddress) {
                                                setCreatorAddressForm({ ...conn.barterDetails.creatorShippingAddress });
                                              }
                                              setShippingAddressModalOpen(true);
                                            }}
                                            className="h-8 rounded-full text-xs font-semibold gap-1"
                                          >
                                            <MapPin className="h-3.5 w-3.5 text-primary" />
                                            {conn.barterDetails?.creatorShippingAddress?.addressLine1 ? "Update Address" : "Provide Shipping Address"}
                                          </Button>

                                          {conn.barterDetails?.shippingStatus !== "CONFIRMED_BY_CREATOR" && (
                                            <Button
                                              type="button"
                                              size="sm"
                                              disabled={isConfirmingDelivery}
                                              onClick={async () => {
                                                try {
                                                  setIsConfirmingDelivery(true);
                                                  await api.patch(`/connections/${conn._id}/confirm-product-received`);
                                                  toast.success("Product marked as received!");
                                                  await fetchConversations();
                                                } catch (err) {
                                                  toast.error("Failed to confirm product");
                                                } finally {
                                                  setIsConfirmingDelivery(false);
                                                }
                                              }}
                                              className="h-8 rounded-full gradient-sunset text-white text-xs font-bold px-3.5 shadow-glow"
                                            >
                                              {isConfirmingDelivery ? "Confirming..." : "✓ Confirm Product Received"}
                                            </Button>
                                          )}
                                        </div>
                                      ) : (
                                        /* Brand Action: Dispatch & Update Tracking */
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                              if (conn.barterDetails) {
                                                setBrandShipmentForm({
                                                  productName: conn.barterDetails.productName || "",
                                                  productValue: conn.barterDetails.productValue || "",
                                                  productDescription: conn.barterDetails.productDescription || "",
                                                  courierPartner: conn.barterDetails.courierPartner || "BlueDart",
                                                  trackingNumber: conn.barterDetails.trackingNumber || "",
                                                  trackingUrl: conn.barterDetails.trackingUrl || "",
                                                  shippingStatus: conn.barterDetails.shippingStatus || "DISPATCHED",
                                                });
                                              }
                                              setBrandShipmentModalOpen(true);
                                            }}
                                            className="h-8 rounded-full gradient-sunset text-white text-xs font-bold px-3.5 shadow-glow gap-1"
                                          >
                                            <Truck className="h-3.5 w-3.5" />
                                            Update Shipping & Tracking
                                          </Button>

                                          {conn.barterDetails?.creatorShippingAddress?.addressLine1 ? (
                                            <Badge variant="outline" className="text-[10px] text-foreground bg-secondary/50">
                                              📍 Ship to: {conn.barterDetails.creatorShippingAddress.city}, {conn.barterDetails.creatorShippingAddress.pincode}
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">
                                              Waiting for creator's address
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                  <span>
                                    Agreed at: {conn.agreedAt ? new Date(conn.agreedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recently"}
                                  </span>
                                  {conn.paymentStatus !== "PAID" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => setIsReopeningNegotiation(true)}
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" /> Re-negotiate Amount
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* NEGOTIATION FORM */
                              <div className="space-y-3">
                                {hasPendingProposal && (
                                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <IndianRupee className="h-3.5 w-3.5 text-primary" />
                                        <span>
                                          {isProposedByMe
                                            ? `You proposed a total budget of ₹${conn.proposedAmount?.toLocaleString()}`
                                            : `${otherProfile?.fullName || "Partner"} proposed a total budget of ₹${conn.proposedAmount?.toLocaleString()}`}
                                        </span>
                                      </div>
                                      {profile?.role === "creator" ? (
                                        <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                                          <span><strong>Brand pays:</strong> ₹{displayBrandTotal?.toLocaleString()}</span>
                                          <span>•</span>
                                          <span><strong>Pravixo fee (20%):</strong> ₹{displayFee?.toLocaleString()}</span>
                                          <span>•</span>
                                          <span className="text-emerald-600 font-semibold"><strong>You will receive:</strong> ₹{displayCreatorAmount?.toLocaleString()}</span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                                          <span><strong>Brand total:</strong> ₹{displayBrandTotal?.toLocaleString()}</span>
                                          <span>•</span>
                                          <span><strong>Pravixo fee (20%):</strong> ₹{displayFee?.toLocaleString()}</span>
                                          <span>•</span>
                                          <span className="text-emerald-600 font-semibold"><strong>Creator receives:</strong> ₹{displayCreatorAmount?.toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>

                                    {!isProposedByMe && (
                                      <Button
                                        size="sm"
                                        onClick={handleAgreeAmount}
                                        disabled={isAgreeingOffer}
                                        className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 h-8 shrink-0 flex items-center gap-1.5"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        {isAgreeingOffer ? "Agreeing..." : "Accept & Agree"}
                                      </Button>
                                    )}
                                  </div>
                                )}

                                <form onSubmit={handleProposeAmount} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <div className="relative flex-1">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder={hasPendingProposal ? "Enter counter offer for creator payment..." : "Enter proposed creator payment amount (₹)..."}
                                      value={negotiationAmount}
                                      onChange={(e) => setNegotiationAmount(e.target.value)}
                                      className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-4 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>

                                  <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!negotiationAmount || isSubmittingOffer}
                                    className="rounded-xl gradient-sunset text-white text-xs font-semibold px-4 h-9 shrink-0"
                                  >
                                    {isSubmittingOffer ? "Sending..." : hasPendingProposal ? "Send Counter Offer" : "Propose Amount"}
                                  </Button>
                                </form>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* MESSAGES FEED */}
              <div className="flex-1 min-h-0 space-y-3.5 overflow-y-auto p-4 sm:p-6">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-semibold text-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Send a message to start communicating.</p>
                  </div>
                ) : (
                  messages.map((item) => {
                    const itemSenderId = (item.senderId?._id || item.senderId)?.toString();
                    const currentProfileId = profile?._id?.toString();
                    const currentUserId = (user?._id || user?.id || user?.userId || profile?.userId)?.toString();
                    const isMine = Boolean(
                      itemSenderId && (
                        (currentProfileId && itemSenderId === currentProfileId) ||
                        (currentUserId && itemSenderId === currentUserId)
                      )
                    );

                    return (
                      <div
                        key={item._id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        {item.unsent || item.deletedByAdmin || (profile?.role === "creator" && item.deletedForCreator) || (profile?.role === "brand" && item.deletedForBrand) ? (
                          <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm italic text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <Ban className="h-4 w-4" />
                              <span>This message was {item.unsent ? "unsent" : item.deletedByAdmin ? "deleted by Admin" : "deleted"}</span>
                            </div>
                          </div>


    
                        ) : (
                          <div className="flex items-end gap-1.5 group relative max-w-[85%] sm:max-w-[75%]">
                            {/* MESSAGE ACTION BUTTON (More / Unsend options) */}
                            {isMine && item.messageType !== "system" && item.messageType !== "agreement_document" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMessageForAction(item);
                                  setUnsendModalOpen(true);
                                }}
                                className="p-1.5 rounded-full text-slate-400 hover:text-foreground bg-secondary/40 hover:bg-secondary transition opacity-90 hover:opacity-100 shrink-0 shadow-sm"
                                title="Message options (Unsend / Delete)"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* DELIVERABLE SUBMISSION INTERACTIVE CARD IN CHAT */}
                            {item.messageType === "deliverable_submission" && item.metadata ? (
                              <div
                                className={cn(
                                  "w-full rounded-2xl p-4 text-xs border shadow-md space-y-3 transition-all",
                                  isMine
                                    ? "rounded-br-md bg-card/95 border-primary/30 text-foreground"
                                    : "rounded-bl-md bg-card/95 border-border text-foreground"
                                )}
                              >
                                {/* Card Header */}
                                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                                  <div className="flex items-center gap-1.5">
                                    <Film className="h-4 w-4 text-primary" />
                                    <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                                      {item.metadata.deliverableType || "Deliverable"} Submission
                                    </span>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "text-[10px] px-2 py-0.5 font-bold border",
                                      item.metadata.status === "APPROVED"
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                        : item.metadata.status === "REJECTED"
                                        ? "bg-red-500/10 text-red-500 border-red-500/30"
                                        : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    )}
                                  >
                                    {item.metadata.status === "APPROVED" ? "✓ Approved" : item.metadata.status === "REJECTED" ? "Rework Needed" : "⏳ Under Review"}
                                  </Badge>
                                </div>

                                {/* Video / Image Media Player Preview */}
                                {item.metadata.contentUrl && (
                                  <div className="rounded-xl overflow-hidden bg-black/90 border border-border flex items-center justify-center">
                                    {item.metadata.contentUrl?.match(/\.(mp4|mov|webm|avi|mkv|m4v)$/i) || item.metadata.deliverableType === "REEL" || item.metadata.deliverableType === "VIDEO" ? (
                                      <video
                                        src={resolveImageUrl(item.metadata.contentUrl)}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="w-full max-h-[340px] object-contain rounded-xl"
                                      />
                                    ) : (
                                      <img
                                        src={resolveImageUrl(item.metadata.contentUrl)}
                                        alt="Deliverable work"
                                        className="w-full max-h-[340px] object-contain rounded-xl cursor-pointer"
                                        onClick={() => window.open(resolveImageUrl(item.metadata.contentUrl), "_blank")}
                                      />
                                    )}
                                  </div>
                                )}

                                {/* Caption & Notes */}
                                {item.metadata.caption && (
                                  <div className="rounded-xl bg-secondary/30 p-2.5 text-xs text-foreground">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Caption / Notes</span>
                                    <p className="whitespace-pre-wrap">{item.metadata.caption}</p>
                                  </div>
                                )}

                                {/* Rejection Feedback if any */}
                                {item.metadata.status === "REJECTED" && item.metadata.feedbackNotes && (
                                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600">
                                    <span className="font-bold block text-[10px] uppercase mb-0.5">Brand Changes Requested:</span>
                                    <p>{item.metadata.feedbackNotes}</p>
                                  </div>
                                )}

                                {/* BRAND DIRECT APPROVAL / REJECT / TIMESTAMP REVIEW CONTROLS */}
                                <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2 justify-end">
                                  {/* Timestamp Review Button for Videos/Reels */}
                                  {(item.metadata.deliverableType === "REEL" || item.metadata.deliverableType === "VIDEO" || item.metadata.contentUrl?.match(/\.(mp4|mov|webm|avi|mkv|m4v)$/i)) && (
                                    <Button
                                      size="sm"
                                      type="button"
                                      variant="secondary"
                                      onClick={() => handleOpenTimestampReview(item.metadata)}
                                      className="h-8 rounded-full bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold px-3 gap-1 border border-border/80"
                                    >
                                      <Clock className="h-3.5 w-3.5 text-primary" /> Timestamp Note
                                    </Button>
                                  )}

                                  {profile.role === "brand" && (item.metadata.status === "SUBMITTED" || item.metadata.status === "RESUBMITTED" || !item.metadata.status) && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={actionProcessingId === item.metadata.submissionId}
                                        onClick={() => {
                                          setSelectedSubmissionForRework(item.metadata.submissionId);
                                          setReworkFeedbackText("");
                                          setReworkModalOpen(true);
                                        }}
                                        className="h-8 rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-semibold px-3"
                                      >
                                        <XCircle className="h-3.5 w-3.5 mr-1" /> Request Rework
                                      </Button>

                                      <Button
                                        size="sm"
                                        disabled={actionProcessingId === item.metadata.submissionId}
                                        onClick={() => handleApproveSubmission(item.metadata.submissionId)}
                                        className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 shadow-sm"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                        {actionProcessingId === item.metadata.submissionId ? "Approving..." : "Approve Deliverable"}
                                      </Button>
                                    </>
                                  )}
                                </div>

                                {/* Card Footer Timestamp & Link */}
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                  <span>
                                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                  </span>
                                  {item.metadata.contentUrl && (
                                    <a
                                      href={resolveImageUrl(item.metadata.contentUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                                    >
                                      <span>Open full size</span> <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : item.messageType === "voice_note" || (item.metadata && item.metadata.mediaType === "audio") ? (
                              /* VOICE AUDIO NOTE BUBBLE */
                              <div
                                onTouchStart={() => isMine && handleTouchStartMessage(item._id)}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchEnd}
                                className={`rounded-2xl p-3 text-sm shadow-md space-y-2 min-w-[240px] sm:min-w-[280px] ${
                                  isMine
                                    ? "rounded-br-md gradient-sunset text-white"
                                    : "rounded-bl-md bg-secondary/90 text-foreground border border-border/60"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-full ${isMine ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                                    <Mic className="h-4 w-4 animate-pulse" />
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-xs font-bold block">{isMine ? "You sent a voice note" : "Voice Note"}</span>
                                    <span className={`text-[10px] ${isMine ? "text-white/80" : "text-muted-foreground"}`}>
                                      {item.metadata?.duration ? `${Math.floor(item.metadata.duration / 60)}:${(item.metadata.duration % 60).toString().padStart(2, "0")}` : "Voice message"}
                                    </span>
                                  </div>
                                </div>

                                {item.metadata?.contentUrl && (
                                  <audio
                                    src={resolveImageUrl(item.metadata.contentUrl)}
                                    controls
                                    className="w-full h-8 rounded-lg outline-none"
                                  />
                                )}

                                <div
                                  className={`flex items-center gap-1.5 text-[10px] ${
                                    isMine ? "text-white/80 justify-end" : "text-muted-foreground justify-start"
                                  }`}
                                >
                                  <span>
                                    {item.createdAt
                                      ? new Date(item.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : ""}
                                  </span>
                                  {isMine && (
                                    item.read ? (
                                      <CheckCheck className="h-3 w-3 text-cyan-200" title="Read" />
                                    ) : (
                                      <Check className="h-3 w-3 text-white/60" title="Sent" />
                                    )
                                  )}
                                </div>
                              </div>
                            ) : item.messageType === "timestamp_feedback" || (item.metadata && item.metadata.timestampSeconds !== undefined) ? (
                              /* VIDEO TIMESTAMP REVIEW FEEDBACK BUBBLE */
                              <div
                                onTouchStart={() => isMine && handleTouchStartMessage(item._id)}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchEnd}
                                className={`rounded-2xl p-3.5 text-sm shadow-md space-y-2 max-w-[340px] sm:max-w-[420px] ${
                                  isMine
                                    ? "rounded-br-md bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-500/30"
                                    : "rounded-bl-md bg-secondary/95 text-foreground border border-border/80"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Video Review Note</span>
                                  </div>
                                  <span className="bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs px-2 py-0.5 rounded-full border border-indigo-500/30">
                                    ⏱️ {item.metadata?.formattedTimestamp || "0:00"}
                                  </span>
                                </div>

                                <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">
                                  {item.metadata?.feedbackText || item.text}
                                </p>

                                {item.metadata?.videoUrl && (
                                  <div className="rounded-xl overflow-hidden bg-black/80 border border-border/40 p-1.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
                                      <Film className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="truncate">{item.metadata.deliverableType || "Deliverable Video"}</span>
                                    </div>
                                    <a
                                      href={resolveImageUrl(item.metadata.videoUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary hover:underline text-[10px] font-bold shrink-0 flex items-center gap-0.5"
                                    >
                                      <span>Watch</span> <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  </div>
                                )}

                                <div
                                  className={`flex items-center gap-1.5 text-[10px] ${
                                    isMine ? "text-white/60 justify-end" : "text-muted-foreground justify-start"
                                  }`}
                                >
                                  <span>
                                    {item.createdAt
                                      ? new Date(item.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : ""}
                                  </span>
                                </div>
                              </div>
                            ) : item.messageType === "media" || (item.metadata && item.metadata.contentUrl) ? (
                              /* MEDIA MESSAGE BUBBLE (PHOTOS & VIDEOS FOR ADMIN, BRAND, CREATOR) */
                              <div
                                onTouchStart={() => isMine && handleTouchStartMessage(item._id)}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchEnd}
                                className={`rounded-2xl p-2.5 text-sm shadow-md space-y-2 max-w-[320px] sm:max-w-[420px] ${
                                  isMine
                                    ? "rounded-br-md gradient-sunset text-white"
                                    : "rounded-bl-md bg-secondary/90 text-foreground border border-border/60"
                                }`}
                              >
                                {item.metadata?.contentUrl && (
                                  <div className="rounded-xl overflow-hidden bg-black/60 border border-border/40 flex items-center justify-center">
                                    {item.metadata.mediaType === "video" || item.metadata.contentUrl?.match(/\.(mp4|mov|webm|avi|mkv|m4v)$/i) ? (
                                      <video
                                        src={resolveImageUrl(item.metadata.contentUrl)}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="w-full max-h-[300px] object-contain rounded-xl"
                                      />
                                    ) : (
                                      <img
                                        src={resolveImageUrl(item.metadata.contentUrl)}
                                        alt={item.metadata.fileName || "Chat media"}
                                        className="w-full max-h-[300px] object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                                        onClick={() => window.open(resolveImageUrl(item.metadata.contentUrl), "_blank")}
                                      />
                                    )}
                                  </div>
                                )}
                                {item.text && item.text !== "📷 Photo" && item.text !== "🎥 Video" && (
                                  <p className="whitespace-pre-wrap leading-relaxed px-1 text-xs">{item.text}</p>
                                )}
                                <div
                                  className={`flex items-center gap-1.5 text-[10px] px-1 ${
                                    isMine ? "text-white/80 justify-end" : "text-muted-foreground justify-start"
                                  }`}
                                >
                                  <span>
                                    {item.createdAt
                                      ? new Date(item.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : ""}
                                  </span>
                                  {isMine && (
                                    item.read ? (
                                      <CheckCheck className="h-3 w-3 text-cyan-200" title="Read" />
                                    ) : (
                                      <Check className="h-3 w-3 text-white/60" title="Sent" />
                                    )
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* STANDARD TEXT MESSAGE BUBBLE */
                              <div
                                onTouchStart={() => isMine && handleTouchStartMessage(item._id)}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchEnd}
                                className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                  isMine
                                    ? "rounded-br-md gradient-sunset text-white"
                                    : "rounded-bl-md bg-secondary/80 text-foreground border border-border/50"
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>
                                <div
                                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                                    isMine ? "text-white/80 justify-end" : "text-muted-foreground justify-start"
                                  }`}
                                >
                                  <span>
                                    {item.createdAt
                                      ? new Date(item.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : ""}
                                  </span>
                                  {isMine && (
                                    item.read ? (
                                      <CheckCheck className="h-3 w-3 text-cyan-200" title="Read" />
                                    ) : (
                                      <Check className="h-3 w-3 text-white/60" title="Sent" />
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* MESSAGE INPUT BAR WITH ATTACH / SHARE WORK BUTTON */}
              <form onSubmit={sendMessage} className="border-t border-border p-3 bg-card/60 backdrop-blur-md space-y-2 shrink-0">
                {/* Media Attachment Preview before sending */}
                {attachedMediaPreview && (
                  <div className="flex items-center gap-3 p-2 rounded-2xl bg-secondary/70 border border-border/80 max-w-sm">
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-black/80 shrink-0 border border-border flex items-center justify-center">
                      {attachedMediaType === "video" ? (
                        <video src={attachedMediaPreview} className="h-full w-full object-cover" />
                      ) : (
                        <img src={attachedMediaPreview} alt="Preview" className="h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        {attachedMediaType === "video" ? (
                          <VideoIcon className="h-4 w-4 text-white drop-shadow" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-white drop-shadow" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-foreground">{attachedMedia?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {attachedMedia?.size ? `${(attachedMedia.size / (1024 * 1024)).toFixed(2)} MB` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachedMedia}
                      className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition"
                      title="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-2xl border border-input bg-background p-1.5 shadow-sm">
                  {/* Hidden media file input for photos/videos */}
                  <input
                    ref={mediaFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaFileSelect}
                    className="hidden"
                  />

                  {/* Photo & Video Attachment Button for All Users (Brand, Creator, Admin) */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => mediaFileInputRef.current?.click()}
                    disabled={sending}
                    className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 transition"
                    title="Send Photo or Video"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* AI Pitch & Proposal Generator Button for Creators */}
                  {profile?.role === "creator" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGeneratedAiPitch("");
                        setAiPitchModalOpen(true);
                      }}
                      className="h-8 px-2 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 shrink-0 flex items-center gap-1 font-semibold text-xs transition"
                      title="AI Pitch Generator Assistant"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                      <span className="hidden sm:inline">AI Pitch</span>
                    </Button>
                  )}

                  {/* Creator Direct Work Submission Action (For verified deliverables) */}
                  {profile?.role === "creator" && activeConversation.connection && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeliverableFile(null);
                        setDeliverableFilePreview(null);
                        setDeliverableCaption("");
                        setShareWorkModalOpen(true);
                      }}
                      className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                      title="Submit Deliverable (Reel/Post)"
                    >
                      <Film className="h-4 w-4" />
                    </Button>
                  )}

                  {isRecordingVoice ? (
                    /* LIVE RECORDING STATE CONTROLS */
                    <div className="flex-1 flex items-center justify-between px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-xl animate-pulse">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                        <span className="text-xs font-bold text-red-600">
                          Recording Voice Note: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelRecording}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive rounded-lg"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSendVoiceNote}
                          disabled={sending}
                          className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
                        >
                          <Send className="h-3 w-3" /> Send
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={attachedMedia ? "Add a caption..." : "Type a message..."}
                        disabled={sending}
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                      />

                      {/* Microphone Voice Note Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleStartRecording}
                        disabled={sending}
                        className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0 transition"
                        title="Record Voice Note"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>

                      <button
                        type="submit"
                        disabled={(!message.trim() && !attachedMedia) || sending}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-sunset text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-glow cursor-pointer"
                        aria-label="Send message"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </>
          );
        })() : (
            /* EMPTY STATE */
            <div className="flex h-full flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-semibold">Your Inbox</h2>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Select a conversation from the left to start communicating.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Agreement Viewer Modal */}
      {viewAgreementOpen && activeConversation?.connection?._id && (
        <AgreementModal
          isOpen={viewAgreementOpen}
          onClose={() => setViewAgreementOpen(false)}
          connectionId={activeConversation.connection._id}
        />
      )}

      {/* CREATOR IN-CHAT SHARE WORK / DELIVERABLE MODAL */}
      <Dialog open={shareWorkModalOpen} onOpenChange={setShareWorkModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" /> Share Deliverable Work
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload your video or photo deliverable so the brand can review and approve it directly in chat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleShareDeliverable} className="space-y-4 pt-2">
            {/* Deliverable Type Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Deliverable Type</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "REEL", label: "🎬 Reel" },
                  { id: "POST", label: "📸 Post" },
                  { id: "STORY", label: "📱 Story" },
                  { id: "VIDEO", label: "🎥 Video" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDeliverableType(item.id)}
                    className={cn(
                      "py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center",
                      deliverableType === item.id
                        ? "gradient-sunset text-white border-0 shadow-glow"
                        : "bg-secondary/40 border-border text-foreground hover:bg-secondary"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload Zone */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Upload Media File (Video / Photo)</label>
              <div className="relative rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 p-4 transition-all text-center">
                {deliverableFilePreview ? (
                  <div className="space-y-2">
                    {deliverableFile?.type?.startsWith("video") || deliverableType === "REEL" || deliverableType === "VIDEO" ? (
                      <video
                        src={deliverableFilePreview}
                        controls
                        className="max-h-48 w-full object-contain rounded-xl bg-black"
                      />
                    ) : (
                      <img
                        src={deliverableFilePreview}
                        alt="Preview"
                        className="max-h-48 w-full object-contain rounded-xl mx-auto"
                      />
                    )}
                    <p className="text-[11px] font-medium text-foreground truncate">{deliverableFile?.name}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeliverableFile(null);
                        setDeliverableFilePreview(null);
                      }}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                    <Upload className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <span className="text-xs font-bold text-foreground">Click to select Video or Photo</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">MP4, MOV, WEBM, JPG, PNG up to 100MB</span>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDeliverableFile(file);
                          setDeliverableFilePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Optional Caption */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Caption & Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Add any context, links, or notes for the brand..."
                value={deliverableCaption}
                onChange={(e) => setDeliverableCaption(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShareWorkModalOpen(false)}
                className="rounded-full text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!deliverableFile || submittingDeliverable}
                className="rounded-full gradient-sunset text-white text-xs font-bold px-5 h-9 shadow-glow"
              >
                {submittingDeliverable ? "Uploading..." : "Submit & Send to Chat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BRAND REQUEST REWORK MODAL */}
      <Dialog open={reworkModalOpen} onOpenChange={setReworkModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Request Deliverable Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide clear feedback notes for the creator explaining what needs revision.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectSubmission} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Feedback Notes</label>
              <textarea
                rows={4}
                required
                placeholder="Describe what changes you need the creator to make (e.g., sound volume, lighting, product placement)..."
                value={reworkFeedbackText}
                onChange={(e) => setReworkFeedbackText(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReworkModalOpen(false)}
                className="rounded-full text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!reworkFeedbackText.trim() || Boolean(actionProcessingId)}
                className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 h-9 shadow-sm"
              >
                {actionProcessingId ? "Submitting..." : "Send Rework Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MESSAGE UNSEND / DELETE MODAL */}
      <Dialog open={unsendModalOpen} onOpenChange={setUnsendModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <Trash2 className="h-5 w-5 text-red-500" /> Message Options
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose how you want to remove or unsend this message.
            </DialogDescription>
          </DialogHeader>

          {selectedMessageForAction && (
            <div className="my-2 rounded-xl bg-secondary/50 p-3 text-xs border border-border/50 text-foreground/80 italic line-clamp-2">
              &quot;{selectedMessageForAction.text}&quot;
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            {/* Option 1: Unsend for Everyone */}
            <button
              type="button"
              disabled={isDeletingMessage}
              onClick={() => handleUnsend(selectedMessageForAction?._id, "for_everyone", false)}
              className="w-full flex items-center justify-between p-3 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 text-left transition group"
            >
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition">Unsend for Everyone</p>
                <p className="text-[11px] text-muted-foreground">Removes message text for both you and the recipient.</p>
              </div>
              <Ban className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
            </button>

            {/* Option 2: Delete for Me Only */}
            <button
              type="button"
              disabled={isDeletingMessage}
              onClick={() => handleUnsend(selectedMessageForAction?._id, profile?.role === "creator" ? "for_creator" : "for_brand", false)}
              className="w-full flex items-center justify-between p-3 rounded-2xl border border-border hover:border-amber-500/50 hover:bg-amber-500/5 text-left transition group"
            >
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-amber-600 transition">Delete for Me Only</p>
                <p className="text-[11px] text-muted-foreground">Hides this message from your chat only.</p>
              </div>
              <Eye className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 transition shrink-0" />
            </button>

            {/* Option 3: Permanently Delete from Database */}
            <button
              type="button"
              disabled={isDeletingMessage}
              onClick={() => handleUnsend(selectedMessageForAction?._id, "for_everyone", true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl border border-red-500/20 hover:border-red-500/60 hover:bg-red-500/10 text-left transition group"
            >
              <div>
                <p className="text-xs font-bold text-red-600">Permanently Delete from Database</p>
                <p className="text-[11px] text-muted-foreground">Completely erases the message record from the DB.</p>
              </div>
              <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
            </button>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnsendModalOpen(false)}
              className="w-full rounded-full text-xs h-9"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONVERSATION DELETE / ARCHIVE MODAL */}
      <Dialog open={deleteChatModalOpen} onOpenChange={setDeleteChatModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5 text-red-500" /> Manage Conversation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an action for this conversation with{" "}
              <span className="font-semibold text-foreground">
                {selectedConversationForDelete?.otherProfile?.fullName || "this user"}
              </span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            {/* Action 1: Delete Permanently from Database */}
            <button
              type="button"
              disabled={isDeletingConversation}
              onClick={() => handleDeleteConversationInDb(selectedConversationForDelete, true)}
              className="w-full flex items-start gap-3 p-3.5 rounded-2xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-left transition"
            >
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600 mt-0.5 shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-600">Delete Entirely from Database</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Permanently deletes this chat and all sent messages from the database. This action cannot be undone.
                </p>
              </div>
            </button>

            {/* Action 2: Archive / Hide Chat */}
            <button
              type="button"
              disabled={isDeletingConversation}
              onClick={() => handleDeleteConversationInDb(selectedConversationForDelete, false)}
              className="w-full flex items-start gap-3 p-3.5 rounded-2xl border border-border hover:border-primary/50 hover:bg-secondary/40 text-left transition"
            >
              <div className="p-2 rounded-xl bg-secondary text-foreground mt-0.5 shrink-0">
                <Archive className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {selectedConversationForDelete?.archived ? "Unarchive Chat" : "Archive Chat"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {selectedConversationForDelete?.archived
                    ? "Restore this conversation back to your active inbox."
                    : "Move this conversation to the archived/deleted tab without deleting messages."}
                </p>
              </div>
            </button>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingConversation}
              onClick={() => setDeleteChatModalOpen(false)}
              className="w-full rounded-full text-xs h-9"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI PITCH & PROPOSAL ASSISTANT MODAL */}
      <Dialog open={aiPitchModalOpen} onOpenChange={setAiPitchModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" /> AI Pitch & Proposal Assistant
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generate a high-converting, professional pitch tailored to this brand in seconds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tone Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">Select Pitch Tone</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "professional", label: "💼 Professional" },
                  { id: "creative", label: "✨ Creative" },
                  { id: "high_energy", label: "🔥 High-Energy" },
                  { id: "barter_focus", label: "🤝 Barter Deal" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAiPitchTone(t.id)}
                    className={cn(
                      "py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center",
                      aiPitchTone === t.id
                        ? "gradient-sunset text-white border-0 shadow-glow"
                        : "bg-secondary/40 border-border text-foreground hover:bg-secondary"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Custom Highlights */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Key Deliverables or Highlights (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 1 dedicated reel + 2 story sequence, delivered in 3 days"
                value={aiPitchCustomPoints}
                onChange={(e) => setAiPitchCustomPoints(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>

            {/* Generate Button */}
            <Button
              type="button"
              disabled={isGeneratingAiPitch}
              onClick={async () => {
                try {
                  setIsGeneratingAiPitch(true);
                  const brandName = activeConversation?.otherProfile?.fullName || "Brand";
                  const res = await api.post("/ai/pitch", {
                    brandName,
                    brandNiche: activeConversation?.otherProfile?.category || "",
                    creatorName: profile?.fullName || "Creator",
                    creatorCategory: profile?.category || "Content Creation",
                    creatorFollowers: (profile?.instagramFollowers || 0) + (profile?.youtubeFollowers || 0),
                    tone: aiPitchTone,
                    customPoints: aiPitchCustomPoints,
                  });
                  if (res?.data?.data?.pitch) {
                    setGeneratedAiPitch(res.data.data.pitch);
                    toast.success("AI Pitch drafted!");
                  }
                } catch (err) {
                  console.error("AI pitch error:", err);
                  toast.error("Failed to generate AI pitch");
                } finally {
                  setIsGeneratingAiPitch(false);
                }
              }}
              className="w-full rounded-2xl gradient-sunset text-white text-xs font-bold h-10 shadow-glow flex items-center justify-center gap-2 hover:opacity-95"
            >
              {isGeneratingAiPitch ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Drafting Pitch...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Pitch
                </>
              )}
            </Button>

            {/* Generated Output Preview */}
            {generatedAiPitch && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <CheckCheck className="h-3.5 w-3.5" /> Generated Pitch
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedAiPitch);
                      toast.success("Copied to clipboard!");
                    }}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{generatedAiPitch}</p>
                <Button
                  type="button"
                  onClick={() => {
                    setMessage(generatedAiPitch);
                    setAiPitchModalOpen(false);
                    toast.success("Pitch inserted into message box!");
                  }}
                  className="w-full rounded-xl bg-primary text-primary-foreground text-xs font-bold h-8"
                >
                  Use this Pitch in Chat
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiPitchModalOpen(false)}
              className="w-full rounded-full text-xs h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATOR SHIPPING ADDRESS MODAL */}
      <Dialog open={shippingAddressModalOpen} onOpenChange={setShippingAddressModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary" /> Delivery / Shipping Address
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide your delivery address so the brand can dispatch your barter package.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!activeConversation?.connection?._id) return;
              try {
                setIsSavingAddress(true);
                await api.patch(`/connections/${activeConversation.connection._id}/shipping-address`, creatorAddressForm);
                toast.success("Shipping address saved and shared with brand!");
                setShippingAddressModalOpen(false);
                await fetchConversations();
              } catch (err) {
                toast.error("Failed to save shipping address");
              } finally {
                setIsSavingAddress(false);
              }
            }}
            className="space-y-3 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Full Name / Receiver Name</label>
              <input
                required
                type="text"
                placeholder="Receiver full name"
                value={creatorAddressForm.fullName}
                onChange={(e) => setCreatorAddressForm({ ...creatorAddressForm, fullName: e.target.value })}
                className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Phone Number</label>
              <input
                required
                type="tel"
                placeholder="Mobile number for delivery"
                value={creatorAddressForm.phone}
                onChange={(e) => setCreatorAddressForm({ ...creatorAddressForm, phone: e.target.value })}
                className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Street Address / House No.</label>
              <input
                required
                type="text"
                placeholder="Flat / House No, Street, Landmark"
                value={creatorAddressForm.addressLine1}
                onChange={(e) => setCreatorAddressForm({ ...creatorAddressForm, addressLine1: e.target.value })}
                className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">City</label>
                <input
                  required
                  type="text"
                  placeholder="City"
                  value={creatorAddressForm.city}
                  onChange={(e) => setCreatorAddressForm({ ...creatorAddressForm, city: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">State</label>
                <input
                  required
                  type="text"
                  placeholder="State"
                  value={creatorAddressForm.state}
                  onChange={(e) => setCreatorAddressForm({ ...creatorAddressForm, state: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Pincode</label>
                <input
                  required
                  type="text"
                  placeholder="Pincode"
                  value={creatorAddressForm.pincode}
                  onChange={(e) => setCreatorAddressForm({ ...creatorAddressForm, pincode: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShippingAddressModalOpen(false)}
                className="rounded-full text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingAddress}
                className="rounded-full gradient-sunset text-white text-xs font-bold px-5 h-9 shadow-glow"
              >
                {isSavingAddress ? "Saving..." : "Save Delivery Address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BRAND SHIPMENT & TRACKING UPDATE MODAL */}
      <Dialog open={brandShipmentModalOpen} onOpenChange={setBrandShipmentModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <Truck className="h-5 w-5 text-primary" /> Product Dispatch & Tracking
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update shipment status and tracking details for the creator.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!activeConversation?.connection?._id) return;
              try {
                setIsSavingShipment(true);
                await api.patch(`/connections/${activeConversation.connection._id}/barter-shipping`, brandShipmentForm);
                toast.success("Shipment details updated!");
                setBrandShipmentModalOpen(false);
                await fetchConversations();
              } catch (err) {
                toast.error("Failed to update shipment");
              } finally {
                setIsSavingShipment(false);
              }
            }}
            className="space-y-3 pt-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Skin Care Starter Kit"
                  value={brandShipmentForm.productName}
                  onChange={(e) => setBrandShipmentForm({ ...brandShipmentForm, productName: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Product Value (MRP ₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 4500"
                  value={brandShipmentForm.productValue}
                  onChange={(e) => setBrandShipmentForm({ ...brandShipmentForm, productValue: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Courier Partner</label>
              <select
                value={brandShipmentForm.courierPartner}
                onChange={(e) => setBrandShipmentForm({ ...brandShipmentForm, courierPartner: e.target.value })}
                className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="BlueDart">BlueDart</option>
                <option value="Delhivery">Delhivery</option>
                <option value="Shiprocket">Shiprocket</option>
                <option value="DTDC">DTDC</option>
                <option value="IndiaPost">IndiaPost</option>
                <option value="Shadowfax">Shadowfax</option>
                <option value="XpressBees">XpressBees</option>
                <option value="Other">Other Courier</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">AWB / Tracking No.</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 1284918239"
                  value={brandShipmentForm.trackingNumber}
                  onChange={(e) => setBrandShipmentForm({ ...brandShipmentForm, trackingNumber: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Shipment Status</label>
                <select
                  value={brandShipmentForm.shippingStatus}
                  onChange={(e) => setBrandShipmentForm({ ...brandShipmentForm, shippingStatus: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="DISPATCHED">Dispatched 📦</option>
                  <option value="IN_TRANSIT">In Transit 🚚</option>
                  <option value="DELIVERED">Delivered 🏠</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Tracking URL (Optional)</label>
              <input
                type="url"
                placeholder="https://track.courier.com/..."
                value={brandShipmentForm.trackingUrl}
                onChange={(e) => setBrandShipmentForm({ ...brandShipmentForm, trackingUrl: e.target.value })}
                className="w-full rounded-xl border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBrandShipmentModalOpen(false)}
                className="rounded-full text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingShipment}
                className="rounded-full gradient-sunset text-white text-xs font-bold px-5 h-9 shadow-glow"
              >
                {isSavingShipment ? "Saving..." : "Update Tracking Info"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIDEO TIMESTAMP REVIEW & MARKER MODAL */}
      <Dialog open={timestampModalOpen} onOpenChange={setTimestampModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-indigo-500" /> Video Timestamp Review
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pause or scrub to the exact second in the deliverable video and leave actionable revision notes.
            </DialogDescription>
          </DialogHeader>

          {targetVideoSubmission?.contentUrl && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl overflow-hidden bg-black border border-border/80 relative">
                <video
                  ref={videoReviewPlayerRef}
                  src={resolveImageUrl(targetVideoSubmission.contentUrl)}
                  controls
                  playsInline
                  onTimeUpdate={(e) => setTimestampSeconds(e.target.currentTime)}
                  className="w-full max-h-56 object-contain rounded-xl"
                />
              </div>

              {/* Current Timestamp Indicator */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-foreground">Target Timestamp Marker:</span>
                </div>
                <span className="font-mono font-bold text-sm bg-indigo-600 text-white px-3 py-1 rounded-xl shadow-sm">
                  {Math.floor(timestampSeconds / 60)}:{(Math.floor(timestampSeconds % 60)).toString().padStart(2, "0")}
                </span>
              </div>

              <form onSubmit={handleSendTimestampFeedback} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Feedback / Timestamp Note</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Please zoom in on the product label at this moment, or adjust background audio volume..."
                    value={timestampFeedbackComment}
                    onChange={(e) => setTimestampFeedbackComment(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTimestampModalOpen(false)}
                    className="rounded-full text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!timestampFeedbackComment.trim() || isSubmittingTimestampComment}
                    className="rounded-full gradient-sunset hover:opacity-90 text-white text-xs font-bold px-5 h-9 shadow-glow border-0"
                  >
                    {isSubmittingTimestampComment ? "Posting..." : "Post Timestamp Note to Chat"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}