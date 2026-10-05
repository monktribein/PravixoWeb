import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/TextArea";
import { toast } from "sonner";
import api from "../lib/api";

import {
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  ShoppingBag,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  User,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Link2,
  MessageSquare,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/Dialog";

import { addonApi } from "../services/addonServices";

// Change this import if your AuthProvider exports from another path
import { useAuth } from "../components/auth/AuthProvider";

const resolveImageUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const baseUrl = apiBase.replace(/\/api\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function Addons() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [activeTab, setActiveTab] = useState("services"); // "services" | "bookings"
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);

  const [showManageModal, setShowManageModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [bookingService, setBookingService] = useState(null);
  const [bookingNotes, setBookingNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form states
  const [imageMode, setImageMode] = useState("upload"); // "upload" | "link"
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState(0);
  const [formCover, setFormCover] = useState("");
  const [formImageFile, setFormImageFile] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);

  // =====================================================
  // ROLE CHECKS
  // =====================================================

  const isAdmin =
    profile?.role === "admin" ||
    user?.role === "admin" ||
    (profile?.role === "brand" && profile?.fullName?.toLowerCase() === "admin");

  const isCreator = profile?.role === "creator" || user?.role === "creator";
  const isBrand = profile?.role === "brand" || user?.role === "brand";

  // =====================================================
  // LOAD SERVICES & BOOKINGS
  // =====================================================

  const fetchServices = async () => {
    try {
      setLoading(true);

      const response = await addonApi.getServices({
        profileId: profile?._id,
        role: profile?.role || (isAdmin ? "admin" : isCreator ? "creator" : "brand"),
      });

      if (response?.success) {
        setServices(response.data || []);
      } else {
        toast.error(
          response?.message || "Failed to load addon services."
        );
      }
    } catch (error) {
      console.error("Fetch addon services error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to load addon services."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const response = await addonApi.getBookings(
        profile?._id,
        profile?.role || (isAdmin ? "admin" : isCreator ? "creator" : "brand")
      );

      if (response?.success) {
        setBookings(response.data || []);
      }
    } catch (error) {
      console.error("Fetch addon bookings error:", error);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [profile?._id, profile?.role]);

  useEffect(() => {
    if (profile?._id || isAdmin) {
      fetchBookings();
    }
  }, [profile?._id, profile?.role, isAdmin]);

  // Status update for bookings (Confirm / Cancel / Pending)
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      setUpdatingBookingId(bookingId);
      const res = await addonApi.updateBookingStatus(bookingId, newStatus);
      if (res?.success) {
        toast.success(res.message || `Booking status updated to ${newStatus}`);
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b))
        );
      } else {
        toast.error(res?.message || "Failed to update booking status");
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  // Delete booking request
  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to delete this booking request?")) {
      return;
    }
    try {
      setUpdatingBookingId(bookingId);
      const res = await addonApi.deleteBooking(bookingId);
      if (res?.success) {
        toast.success("Booking request deleted successfully.");
        setBookings((prev) => prev.filter((b) => b._id !== bookingId));
      } else {
        toast.error(res?.message || "Failed to delete booking.");
      }
    } catch (err) {
      console.error("Delete booking error:", err);
      toast.error(err?.response?.data?.message || "Failed to delete booking.");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  // =====================================================
  // OPEN CREATE MODAL
  // =====================================================

  const handleOpenCreate = () => {
    setEditingService(null);

    setFormName("");
    setFormDesc("");
    setFormPrice(0);
    setFormCover("");
    setFormImageFile(null);
    setFormImagePreview("");
    setImageMode("upload");
    setFormEnabled(true);

    setShowManageModal(true);
  };

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  const handleOpenEdit = (service) => {
    setEditingService(service);

    setFormName(service.name || "");
    setFormDesc(service.description || "");
    setFormPrice(service.price || 0);
    setFormCover(service.imageUrl || "");
    setFormImageFile(null);
    setFormImagePreview(resolveImageUrl(service.imageUrl) || "");
    setImageMode(service.imageUrl?.startsWith("http") && !service.imageUrl.includes("/uploads/") ? "link" : "upload");
    setFormEnabled(service.enabled ?? true);

    setShowManageModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image file size should be less than 15MB.");
      return;
    }

    setFormImageFile(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  // =====================================================
  // SAVE SERVICE
  // =====================================================

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error("Service name is required.");
      return;
    }

    if (!formDesc.trim()) {
      toast.error("Description is required.");
      return;
    }

    if (Number(formPrice) < 0) {
      toast.error("Price cannot be negative.");
      return;
    }

    try {
      setSaving(true);

      let payload;
      if (formImageFile) {
        const formData = new FormData();
        formData.append("name", formName.trim());
        formData.append("description", formDesc.trim());
        formData.append("price", String(Number(formPrice)));
        formData.append("enabled", String(formEnabled));
        if (isCreator && profile?._id) {
          formData.append("creatorId", profile._id);
        }
        formData.append("role", profile?.role || (isAdmin ? "admin" : isCreator ? "creator" : "brand"));
        formData.append("image", formImageFile);
        payload = formData;
      } else {
        payload = {
          name: formName.trim(),
          description: formDesc.trim(),
          price: Number(formPrice),
          imageUrl: imageMode === "link" ? formCover.trim() : (formCover.trim() || undefined),
          enabled: formEnabled,
          creatorId: isCreator ? profile?._id : undefined,
          role: profile?.role || (isAdmin ? "admin" : isCreator ? "creator" : "brand"),
        };
      }

      let response;

      if (editingService) {
        response = await addonApi.updateService(
          editingService._id,
          payload
        );

        if (response?.success) {
          setServices((prev) =>
            prev.map((service) =>
              service._id === editingService._id
                ? response.data
                : service
            )
          );

          toast.success(
            "Add-on service updated successfully!"
          );
        }
      } else {
        response = await addonApi.createService(payload);

        if (response?.success) {
          setServices((prev) => [
            response.data,
            ...prev,
          ]);

          toast.success(
            response.message ||
            (isCreator
              ? "Service submitted! Waiting for Admin approval."
              : "Add-on service created successfully!")
          );
        }
      }

      if (!response?.success) {
        toast.error(
          response?.message || "Failed to save service."
        );

        return;
      }

      setShowManageModal(false);
    } catch (error) {
      console.error("Save addon service error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to save addon service."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE SERVICE
  // =====================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this service?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await addonApi.deleteService(id);

      if (!response?.success) {
        toast.error(
          response?.message || "Failed to delete service."
        );

        return;
      }

      setServices((prev) =>
        prev.filter((service) => service._id !== id)
      );

      toast.success("Add-on service deleted!");
    } catch (error) {
      console.error("Delete addon service error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to delete addon service."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // BOOK SERVICE
  // =====================================================

  const handleBook = async (e) => {
    e.preventDefault();

    if (!profile) {
      toast.error(
        "Please login to book add-on services."
      );

      return;
    }

    if (!bookingService) return;

    try {
      setBookingLoading(true);

      const payload = {
        profileId: profile._id,
        serviceId: bookingService._id,
        notes: bookingNotes.trim() || undefined,
      };

      const response =
        await addonApi.createBooking(payload);

      if (!response?.success) {
        toast.error(
          response?.message ||
          "Failed to create booking request."
        );

        return;
      }

      const creatorName = bookingService.creatorId?.fullName || "Creator";
      toast.success(
        response.message ||
        `Booking placed successfully! You can now discuss requirements directly with ${creatorName} in chat.`
      );

      setBookingService(null);
      setBookingNotes("");
      fetchBookings();

      if (response?.conversationId) {
        navigate(`/messages?conversationId=${response.conversationId}`);
      }
    } catch (error) {
      console.error(
        "Create addon booking error:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
        "Failed to create booking request."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12">

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-10 left-1/4 h-80 w-80 rounded-full bg-primary/10 opacity-30 blur-3xl" />

        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-accent/10 opacity-40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">

        {/* =====================================================
            HERO
        ===================================================== */}

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-border/40">

          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Add-on Services &{" "}
              <span className="text-gradient-sunset">
                Rentals
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl">
              Rent high-end equipment, podcast recording studios, hire videographers, video editors, or dedicated support staff for your next campaign.
            </p>
          </div>

          <div className="flex flex-row items-center gap-1.5 sm:gap-3 w-full md:w-auto justify-start sm:justify-end overflow-x-auto no-scrollbar py-1">
            {/* Tab switch */}
            <div className="inline-flex items-center shrink-0 rounded-full bg-secondary/30 p-1 border border-border/40 text-[11px] sm:text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeTab === "services"
                    ? "gradient-sunset text-white shadow-glow border-0 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Services & Rentals
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("bookings");
                  fetchBookings();
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full transition-all duration-200 relative whitespace-nowrap ${
                  activeTab === "bookings"
                    ? "gradient-sunset text-white shadow-glow border-0 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ClipboardList className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {isAdmin ? "Bookings" : "My Bookings"}
                {bookings.length > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold ${
                      activeTab === "bookings"
                        ? "bg-white/25 text-white"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {bookings.length}
                  </span>
                )}
              </button>
            </div>

            {(isAdmin || isCreator) && activeTab === "services" && (
              <Button
                onClick={handleOpenCreate}
                className="btn-bouncy shrink-0 rounded-full gradient-sunset border-0 text-white font-semibold shadow-glow hover:opacity-95 text-[11px] sm:text-xs h-9 sm:h-10 px-3.5 sm:px-4 flex items-center whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                {isCreator ? "Offer My Add-on" : "Add Service"}
              </Button>
            )}
          </div>

        </div>

        {/* =====================================================
            SERVICES OR BOOKINGS
        ===================================================== */}

        {activeTab === "services" ? (
          services.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
              <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-sm text-muted-foreground">
                No add-on services or rentals available yet
              </p>
              {isCreator && (
                <p className="text-xs text-muted-foreground mt-1">
                  Click <strong className="text-primary">"Offer My Add-on Service"</strong> above to list equipment, studio space, or production services.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((service) => {
                const isMyService = isCreator && service.creatorId && (
                  String(service.creatorId?._id || service.creatorId) === String(profile?._id)
                );
                const isPending = service.approvalStatus === "pending";
                const isRejected = service.approvalStatus === "rejected";
                const isApproved = service.approvalStatus === "approved" || !service.approvalStatus;

                return (
                  <div
                    key={service._id}
                    className={`rounded-3xl border bg-card flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-elevated transition-all duration-200 group ${
                      isPending
                        ? "border-amber-500/50 ring-1 ring-amber-500/20"
                        : isRejected
                        ? "border-red-500/40 opacity-85"
                        : "border-border"
                    }`}
                  >
                    {/* Image */}
                    <div className="space-y-4">
                      <div className="h-48 w-full bg-secondary/50 relative overflow-hidden">
                        <img
                          src={
                            resolveImageUrl(service.imageUrl) ||
                            "https://images.unsplash.com/photo-1590608897129-79da98d15969?w=800"
                          }
                          alt={service.name}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1590608897129-79da98d15969?w=800";
                          }}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Creator status badge for their own service */}
                        {isMyService && (
                          <div className="absolute top-3 left-3 flex flex-col gap-1">
                            <span className="rounded-full bg-black/75 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white shadow-md border border-white/20">
                              👤 My Service
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase shadow-sm ${
                                isPending
                                  ? "bg-amber-500 text-white"
                                  : isRejected
                                  ? "bg-red-500 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {isPending
                                ? "⏳ Pending Admin Approval"
                                : isRejected
                                ? "✕ Rejected"
                                : "✓ Approved & Live for Brands"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-6 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display text-base font-bold text-foreground">
                            {service.name}
                          </h4>
                          <span className="text-sm font-bold text-gradient-sunset">
                            ₹
                            {Number(
                              service.price || 0
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* If created by creator, show creator info for admin / viewer */}
                        {service.creatorId?.fullName && !isMyService && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3 text-primary" />
                            <span>Offered by: <strong className="text-foreground">{service.creatorId.fullName}</strong></span>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {service.description}
                        </p>

                        {/* Rejection Note */}
                        {isMyService && isRejected && service.rejectionReason && (
                          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-600">
                            <span className="font-bold">Admin Feedback:</span> {service.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 pt-0 flex justify-between items-center">
                      {isMyService ? (
                        <div className="w-full flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {isPending
                              ? "Reviewing by Admin"
                              : isRejected
                              ? "Action required"
                              : "Live for brands"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full text-xs h-8 px-3"
                              onClick={() => handleOpenEdit(service)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDelete(service._id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="btn-bouncy rounded-full font-bold px-6 gradient-sunset text-white border-0 shadow-glow hover:opacity-95 transition-all disabled:opacity-50 disabled:shadow-none"
                          disabled={!service.enabled || service.approvalStatus === "pending" || service.approvalStatus === "rejected"}
                          onClick={() => {
                            if (!profile) {
                              toast.error(
                                "Please login to proceed with booking."
                              );
                              return;
                            }
                            setBookingService(service);
                          }}
                        >
                          {service.enabled
                            ? "Book Now"
                            : "Currently Unavailable"}
                        </Button>
                      )}

                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full"
                            onClick={() =>
                              handleOpenEdit(service)
                            }
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={
                              deletingId === service._id
                            }
                            className="h-8 w-8 rounded-full text-red-500 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() =>
                              handleDelete(service._id)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* =====================================================
              BOOKINGS LIST
          ===================================================== */
          <div>
            {bookingsLoading ? (
              <div className="rounded-3xl border border-border p-12 text-center bg-card">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
                <p className="text-xs text-muted-foreground font-medium">
                  Loading bookings...
                </p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
                <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="font-semibold text-sm text-muted-foreground">
                  {isAdmin
                    ? "No booking requests found"
                    : isCreator
                    ? "No bookings placed for your services or by you yet"
                    : "You have not made any booking requests yet"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm mx-auto">
                  {isCreator
                    ? "When brands book your add-on services or you rent equipment, the booking records appear here."
                    : "Browse available Add-ons and rentals above to submit a booking request."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                  <span>
                    Showing {bookings.length} {isAdmin ? "booking request(s)" : isCreator ? "booking(s) & order(s)" : "of your booking(s)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookings.map((booking) => {
                    const service = booking.serviceId;
                    const requester = booking.profileId;
                    const isServiceCreator = isCreator && service?.creatorId && (
                      String(service.creatorId?._id || service.creatorId) === String(profile?._id)
                    );
                    const isMyBooking = String(requester?._id || requester) === String(profile?._id);

                    const isPending = booking.status === "pending";
                    const isConfirmed = booking.status === "confirmed";
                    const isCancelled = booking.status === "cancelled";

                    return (
                      <div
                        key={booking._id}
                        className={`rounded-2xl border bg-card p-5 shadow-sm space-y-4 transition-all hover:border-primary/40 ${
                          isServiceCreator
                            ? "border-primary/30 ring-1 ring-primary/10"
                            : "border-border/80"
                        }`}
                      >
                        {/* Header: Service Name & Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                {isServiceCreator ? "🎉 Booked on Your Service" : "Add-on Request"}
                              </span>
                              {isServiceCreator && (
                                <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 px-1.5 py-0 font-bold">
                                  Your Service
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-display text-base font-bold text-foreground">
                              {service?.name || "Add-on Service"}
                            </h3>
                            {service?.price && (
                              <span className="inline-block text-xs font-semibold text-gradient-sunset">
                                ₹{Number(service.price).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                                isConfirmed
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : isCancelled
                                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              }`}
                            >
                              {isConfirmed && <CheckCircle2 className="h-3 w-3" />}
                              {isCancelled && <XCircle className="h-3 w-3" />}
                              {isPending && <Clock className="h-3 w-3" />}
                              {booking.status}
                            </span>

                            {/* Delete button (Admin or booking owner) */}
                            {(isAdmin || isMyBooking) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={updatingBookingId === booking._id}
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                title="Delete booking request"
                                onClick={() => handleDeleteBooking(booking._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Customer / Brand Details (Who made this booking) */}
                        {requester && (
                          <div className="rounded-xl bg-secondary/30 p-3 flex items-center justify-between gap-3 text-xs border border-border/40">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                                {requester.fullName?.[0] || "U"}
                              </div>
                              <div className="truncate">
                                <p className="font-semibold text-foreground truncate">
                                  {isServiceCreator ? `Booked by Brand: ${requester.fullName}` : `Booked by: ${requester.fullName}`}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {requester.email} {requester.role ? `• ${requester.role}` : ""}
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20 uppercase">
                              {requester.role || "Brand"}
                            </span>
                          </div>
                        )}

                        {/* Service Provider Info if brand is viewing */}
                        {!isServiceCreator && service?.creatorId?.fullName && (
                          <div className="text-[11px] text-muted-foreground px-1">
                            Service Provider: <strong className="text-foreground">{service.creatorId.fullName}</strong> ({service.creatorId.email})
                          </div>
                        )}

                        {/* Notes */}
                        {booking.notes && (
                          <div className="text-xs bg-background/50 rounded-xl p-3 border border-border/40 text-foreground/90">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                              Requirements / Instructions:
                            </p>
                            <p className="italic leading-relaxed">"{booking.notes}"</p>
                          </div>
                        )}

                        {/* Date and actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                          <span>
                            Booked on: {new Date(booking.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Chat button between Brand and Creator */}
                            {(isServiceCreator || isMyBooking) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-full px-2.5 bg-primary/5 text-primary border-primary/20 hover:bg-primary/15"
                                onClick={async () => {
                                  try {
                                    const targetUser = isServiceCreator
                                      ? requester?._id || requester
                                      : service?.creatorId?._id || service?.creatorId;

                                    if (!targetUser) {
                                      navigate("/messages");
                                      return;
                                    }

                                    const convRes = await api.post("/conversations", {
                                      creatorId: isServiceCreator ? profile._id : targetUser,
                                      brandId: isServiceCreator ? targetUser : profile._id,
                                      conversationType: "brand_creator",
                                    });

                                    if (convRes?.data?.conversation?._id || convRes?.data?.data) {
                                      const convId = convRes.data.conversation?._id || convRes.data.data;
                                      navigate(`/messages?conversationId=${convId}`);
                                    } else {
                                      navigate("/messages");
                                    }
                                  } catch (err) {
                                    navigate("/messages");
                                  }
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {isServiceCreator ? "Chat with Brand" : "Chat with Creator"}
                              </Button>
                            )}

                            {/* Admin or Service Creator Action Controls */}
                            {(isAdmin || isServiceCreator) && (
                              <>
                                {booking.status !== "confirmed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updatingBookingId === booking._id}
                                    className="h-7 text-xs rounded-full px-2.5 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                                    onClick={() => handleUpdateBookingStatus(booking._id, "confirmed")}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirm
                                  </Button>
                                )}

                                {booking.status !== "cancelled" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updatingBookingId === booking._id}
                                    className="h-7 text-xs rounded-full px-2.5 text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                                    onClick={() => handleUpdateBookingStatus(booking._id, "cancelled")}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      <Dialog
        open={showManageModal}
        onOpenChange={setShowManageModal}
      >

        <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6">

          <DialogHeader>

            <DialogTitle className="font-display text-lg font-bold">

              {editingService
                ? "Edit Service details"
                : "Create Add-on Service"}

            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground">

              Add products or rental spaces to the
              platform marketplace list.

            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={handleSave}
            className="space-y-4"
          >

            {/* Name */}

            <div className="space-y-1.5">

              <label className="text-xs font-semibold text-foreground">
                Service/Product Name *
              </label>

              <Input
                required
                placeholder="e.g. Gadget Rental"
                value={formName}
                onChange={(e) =>
                  setFormName(e.target.value)
                }
              />

            </div>

            {/* Price / Status */}

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-foreground">
                  Rate (Price in INR) *
                </label>

                <Input
                  type="number"
                  min="0"
                  required
                  placeholder="₹"
                  value={formPrice}
                  onChange={(e) =>
                    setFormPrice(
                      Number(e.target.value)
                    )
                  }
                />

              </div>

              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-foreground">
                  Status *
                </label>

                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                  value={
                    formEnabled
                      ? "enabled"
                      : "disabled"
                  }
                  onChange={(e) =>
                    setFormEnabled(
                      e.target.value === "enabled"
                    )
                  }
                >

                  <option value="enabled">
                    Enabled
                  </option>

                  <option value="disabled">
                    Disabled
                  </option>

                </select>

              </div>

            </div>

            {/* Image Source Selection: Upload Photo or Image Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Service / Product Photo
                </label>
                <div className="flex items-center rounded-lg bg-secondary/60 p-0.5 border border-border/50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setImageMode("upload")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                      imageMode === "upload"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Upload className="h-3 w-3" /> Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("link")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                      imageMode === "link"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link2 className="h-3 w-3" /> Image Link
                  </button>
                </div>
              </div>

              {imageMode === "upload" ? (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-4 cursor-pointer bg-secondary/15 transition-colors group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        {formImageFile ? formImageFile.name : "Click to browse or drop photo"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Supports JPG, PNG, WEBP (Max 15MB)
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    placeholder="https://images.unsplash.com/... or image link"
                    value={formCover}
                    onChange={(e) => {
                      setFormCover(e.target.value);
                      setFormImagePreview(e.target.value);
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Paste a direct image URL from web.
                  </p>
                </div>
              )}

              {/* Live Preview */}
              {(formImagePreview || formCover) && (
                <div className="relative rounded-xl overflow-hidden border border-border h-28 bg-secondary/30 flex items-center justify-center">
                  <img
                    src={formImagePreview || resolveImageUrl(formCover)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute top-1.5 right-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageFile(null);
                        setFormImagePreview("");
                        setFormCover("");
                      }}
                      className="rounded-full bg-black/70 text-white p-1 hover:bg-black text-[10px]"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}

            <div className="space-y-1.5">

              <label className="text-xs font-semibold text-foreground">
                Description *
              </label>

              <Textarea
                required
                placeholder="Write details..."
                value={formDesc}
                onChange={(e) =>
                  setFormDesc(e.target.value)
                }
              />

            </div>

            <DialogFooter className="pt-2">

              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  setShowManageModal(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saving}
                className="rounded-full gradient-sunset border-0 text-white font-semibold"
              >
                {saving
                  ? "Saving..."
                  : editingService
                    ? "Save Changes"
                    : "Save Product"}
              </Button>

            </DialogFooter>

          </form>

        </DialogContent>

      </Dialog>

      {/* =====================================================
          BOOKING MODAL
      ===================================================== */}

      <Dialog
        open={!!bookingService}
        onOpenChange={(open) => {
          if (!open) {
            setBookingService(null);
            setBookingNotes("");
          }
        }}
      >

        <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6">

          <DialogHeader>

            <DialogTitle className="font-display text-lg font-bold">
              Book Add-on Service
            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground">

              Submit scheduling requests. Payment details
              will be negotiated directly.

            </DialogDescription>

          </DialogHeader>

          {bookingService && (

            <form
              onSubmit={handleBook}
              className="space-y-4"
            >

              {/* Selected service */}

              <div className="space-y-1.5 bg-secondary/15 border border-border/40 rounded-2xl p-4">

                <span className="block text-[10px] font-bold text-primary uppercase tracking-wider">
                  Service Selected
                </span>

                <span className="block text-sm font-bold text-foreground mt-1">
                  {bookingService.name}
                </span>

                <span className="block text-xs font-semibold text-muted-foreground">
                  Price: ₹
                  {Number(
                    bookingService.price || 0
                  ).toLocaleString("en-IN")}
                </span>

              </div>

              {/* Notes */}

              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-foreground">
                  Scheduling Notes & Timing details
                </label>

                <Textarea
                  placeholder="Tell us about your timing preferences, location requirements, or specific requests..."
                  value={bookingNotes}
                  onChange={(e) =>
                    setBookingNotes(
                      e.target.value
                    )
                  }
                />

              </div>

              <DialogFooter className="pt-2">

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setBookingService(null);
                    setBookingNotes("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={bookingLoading}
                  className="rounded-full gradient-sunset border-0 text-white font-semibold"
                >
                  {bookingLoading
                    ? "Submitting..."
                    : "Confirm Booking Request"}
                </Button>

              </DialogFooter>

            </form>

          )}

        </DialogContent>

      </Dialog>

    </div>
  );
}