import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Plus,
  Edit2,
  Sparkles,
  IndianRupee,
  Calendar,
  User,
  Mail,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Upload,
  Link2,
} from "lucide-react";

const resolveImageUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  if (url.startsWith("/avatars/") || url.startsWith("/icons/") || url.startsWith("/assets/") || url.startsWith("/favicon")) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const baseUrl = apiBase.replace(/\/api\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export function BookingsPage() {
  useEffect(() => {
    document.title = "Add-on Bookings — Pravixo Admin";
  }, []);

  const [activeTab, setActiveTab] = useState("bookings"); // "bookings" | "services"
  const [bookings, setBookings] = useState(null);
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // "pending" | "confirmed" | "cancelled" | "all"
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Selected Booking Modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Service Create/Edit Modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceImageMode, setServiceImageMode] = useState("upload"); // "upload" | "link"
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [serviceImagePreview, setServiceImagePreview] = useState("");
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    enabled: true,
  });
  const [serviceSaving, setServiceSaving] = useState(false);

  // Load Bookings & Services
  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, servicesRes] = await Promise.all([
        api.get("/addons/bookings", { params: { role: "admin" } }),
        api.get("/addons/services", { params: { role: "admin" } }),
      ]);

      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.data || []);
      }
      if (servicesRes.data.success) {
        setServices(servicesRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load bookings or services", err);
      toast.error("Failed to load booking data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      const matchesStatus =
        statusFilter === "all" ? true : b.status === statusFilter;

      const customerName = (
        b.profileId?.fullName ||
        b.profileId?.handle ||
        ""
      ).toLowerCase();
      const customerEmail = (b.profileId?.email || "").toLowerCase();
      const serviceName = (b.serviceId?.name || "").toLowerCase();
      const notes = (b.notes || "").toLowerCase();
      const sLower = search.toLowerCase();

      const matchesSearch =
        !search ||
        customerName.includes(sLower) ||
        customerEmail.includes(sLower) ||
        serviceName.includes(sLower) ||
        notes.includes(sLower);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, statusFilter, search]);

  // Pagination (10 bookings per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const totalItems = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedBookings = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, safeCurrentPage, itemsPerPage]);

  // Status counts
  const counts = useMemo(() => {
    if (!bookings) return { pending: 0, confirmed: 0, cancelled: 0, all: 0, revenue: 0 };
    return bookings.reduce(
      (acc, b) => {
        acc.all += 1;
        if (b.status === "pending") acc.pending += 1;
        if (b.status === "confirmed") {
          acc.confirmed += 1;
          acc.revenue += b.serviceId?.price || 0;
        }
        if (b.status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      { pending: 0, confirmed: 0, cancelled: 0, all: 0, revenue: 0 }
    );
  }, [bookings]);

  // Booking Actions
  const handleUpdateStatus = async (bookingId, newStatus) => {
    setActionLoadingId(bookingId);
    try {
      const res = await api.patch(`/addons/bookings/${bookingId}`, {
        status: newStatus,
      });
      if (res.data.success) {
        toast.success(`Booking status marked as ${newStatus}.`);
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b))
        );
        if (selectedBooking?._id === bookingId) {
          setSelectedBooking((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update booking status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to delete this booking request?"))
      return;
    setActionLoadingId(bookingId);
    try {
      const res = await api.delete(`/addons/bookings/${bookingId}`);
      if (res.data.success) {
        toast.success("Booking request deleted.");
        setBookings((prev) => prev.filter((b) => b._id !== bookingId));
        if (selectedBooking?._id === bookingId) {
          setSelectedBooking(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete booking.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Service Management Actions
  const handleOpenServiceModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name || "",
        description: service.description || "",
        price: service.price || "",
        imageUrl: service.imageUrl || "",
        enabled: service.enabled ?? true,
      });
      setServiceImageFile(null);
      setServiceImagePreview(resolveImageUrl(service.imageUrl) || "");
      setServiceImageMode(
        service.imageUrl?.startsWith("http") && !service.imageUrl.includes("/uploads/")
          ? "link"
          : "upload"
      );
    } else {
      setEditingService(null);
      setServiceForm({
        name: "",
        description: "",
        price: "",
        imageUrl: "",
        enabled: true,
      });
      setServiceImageFile(null);
      setServiceImagePreview("");
      setServiceImageMode("upload");
    }
    setServiceModalOpen(true);
  };

  const handleServiceImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image file size should be less than 15MB.");
      return;
    }

    setServiceImageFile(file);
    setServiceImagePreview(URL.createObjectURL(file));
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.price) {
      toast.error("Please enter a service name and price.");
      return;
    }

    setServiceSaving(true);
    try {
      let payload;
      let headers = {};

      if (serviceImageFile) {
        const formData = new FormData();
        formData.append("name", serviceForm.name.trim());
        formData.append("description", serviceForm.description.trim());
        formData.append("price", String(Number(serviceForm.price)));
        formData.append("enabled", String(serviceForm.enabled));
        formData.append("role", "admin");
        formData.append("image", serviceImageFile);
        payload = formData;
        headers = { "Content-Type": "multipart/form-data" };
      } else {
        payload = {
          ...serviceForm,
          imageUrl:
            serviceImageMode === "link"
              ? serviceForm.imageUrl.trim()
              : serviceForm.imageUrl.trim() || undefined,
          price: Number(serviceForm.price),
          role: "admin",
        };
      }

      if (editingService) {
        const res = await api.patch(
          `/addons/services/${editingService._id}`,
          payload,
          { headers }
        );
        if (res.data.success) {
          toast.success("Service updated successfully.");
          setServices((prev) =>
            prev.map((s) => (s._id === editingService._id ? res.data.data : s))
          );
          setServiceModalOpen(false);
        }
      } else {
        const res = await api.post("/addons/services", payload, { headers });
        if (res.data.success) {
          toast.success("New service added to catalog.");
          setServices((prev) => [res.data.data, ...prev]);
          setServiceModalOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save service.");
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this service? Existing bookings won't be deleted."
      )
    )
      return;
    try {
      const res = await api.delete(`/addons/services/${serviceId}`);
      if (res.data.success) {
        toast.success("Service deleted.");
        setServices((prev) => prev.filter((s) => s._id !== serviceId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete service.");
    }
  };

  const [serviceFilter, setServiceFilter] = useState("all"); // "all" | "approved" | "pending" | "rejected"
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [serviceToReject, setServiceToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionServiceId, setActionServiceId] = useState(null);

  const handleApproveService = async (serviceId) => {
    setActionServiceId(serviceId);
    try {
      const res = await api.patch(`/addons/services/${serviceId}`, {
        approvalStatus: "approved",
        enabled: true,
      });
      if (res.data.success) {
        toast.success("Add-on service approved and published live for brands!");
        setServices((prev) =>
          prev.map((s) =>
            s._id === serviceId
              ? { ...s, approvalStatus: "approved", enabled: true }
              : s
          )
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve service.");
    } finally {
      setActionServiceId(null);
    }
  };

  const handleRejectServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceToReject) return;
    setActionServiceId(serviceToReject._id);
    try {
      const res = await api.patch(`/addons/services/${serviceToReject._id}`, {
        approvalStatus: "rejected",
        rejectionReason: rejectReason.trim(),
        enabled: false,
      });
      if (res.data.success) {
        toast.success("Add-on service rejected.");
        setServices((prev) =>
          prev.map((s) =>
            s._id === serviceToReject._id
              ? { ...s, approvalStatus: "rejected", rejectionReason: rejectReason.trim(), enabled: false }
              : s
          )
        );
        setRejectModalOpen(false);
        setServiceToReject(null);
        setRejectReason("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject service.");
    } finally {
      setActionServiceId(null);
    }
  };

  const handleToggleServiceStatus = async (service) => {
    try {
      const res = await api.patch(`/addons/services/${service._id}`, {
        enabled: !service.enabled,
      });
      if (res.data.success) {
        toast.success(
          `Service marked as ${!service.enabled ? "Active" : "Disabled"}.`
        );
        setServices((prev) =>
          prev.map((s) =>
            s._id === service._id ? { ...s, enabled: !service.enabled } : s
          )
        );
      }
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  // Helper Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 font-medium">
            <XCircle className="h-3 w-3 mr-1" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl text-foreground">
                Add-on Bookings
              </h1>
              <p className="text-sm text-muted-foreground">
                Review and manage booking requests for platform services & studio deliverables.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="rounded-xl h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenServiceModal()}
            className="rounded-xl h-9 gradient-sunset text-white border-0 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Service
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Bookings</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {loading ? <Skeleton className="h-8 w-12" /> : counts.all}
          </p>
          <span className="text-[11px] text-muted-foreground">All requested services</span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600 font-medium">Pending Requests</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {loading ? <Skeleton className="h-8 w-12" /> : counts.pending}
          </p>
          <span className="text-[11px] text-muted-foreground">Requires admin action</span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-600 font-medium">Confirmed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? <Skeleton className="h-8 w-12" /> : counts.confirmed}
          </p>
          <span className="text-[11px] text-muted-foreground">Scheduled or delivered</span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Confirmed Value</span>
            <IndianRupee className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              `₹${counts.revenue.toLocaleString("en-IN")}`
            )}
          </p>
          <span className="text-[11px] text-muted-foreground">From confirmed bookings</span>
        </div>
      </div>

      {/* Main Mode Tabs (Bookings vs Service Catalog) */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "bookings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Customer Bookings ({counts.all})
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "services"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Services Catalog ({services?.length || 0})
        </button>
      </div>

      {/* VIEW: BOOKING REQUESTS */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          {/* Sub-filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "pending", label: `Pending (${counts.pending})` },
                { key: "confirmed", label: `Confirmed (${counts.confirmed})` },
                { key: "cancelled", label: `Cancelled (${counts.cancelled})` },
                { key: "all", label: `All (${counts.all})` },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="sm"
                  variant={statusFilter === tab.key ? "default" : "outline"}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-full text-xs h-8 px-3.5 ${
                    statusFilter === tab.key
                      ? "gradient-sunset border-0 text-white shadow-xs"
                      : ""
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Customer</TableHead>
                  <TableHead className="font-semibold text-xs">Requested Service</TableHead>
                  <TableHead className="font-semibold text-xs">Price</TableHead>
                  <TableHead className="font-semibold text-xs">Booking Date</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                      No bookings found for the selected status.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBookings.map((b) => (
                    <TableRow key={b._id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">
                            {b.profileId?.fullName || "Unnamed User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {b.profileId?.email || "No email"}
                          </span>
                          {b.profileId?.role && (
                            <span className="text-[10px] text-primary uppercase font-bold tracking-wider mt-0.5">
                              {b.profileId.role}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {b.serviceId?.imageUrl && (
                            <img
                              src={b.serviceId.imageUrl}
                              alt={b.serviceId.name}
                              className="h-9 w-9 rounded-lg object-cover border border-border"
                            />
                          )}
                          <div>
                            <span className="font-medium text-sm text-foreground block">
                              {b.serviceId?.name || "Service Unavailable"}
                            </span>
                            {b.notes && (
                              <span className="text-xs text-muted-foreground line-clamp-1 italic max-w-xs">
                                "{b.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-bold text-sm text-foreground">
                          ₹{Number(b.serviceId?.price || 0).toLocaleString("en-IN")}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-muted-foreground flex flex-col">
                          <span className="text-foreground font-medium">
                            {b.bookingDate ? format(new Date(b.bookingDate), "MMM dd, yyyy") : "TBD"}
                          </span>
                          <span className="text-[10px]">
                            Booked on {format(new Date(b.createdAt || Date.now()), "dd MMM yyyy")}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(b.status)}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBooking(b)}
                            className="h-8 px-2 text-xs rounded-lg hover:bg-secondary"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Details
                          </Button>

                          {b.status !== "confirmed" && (
                            <Button
                              size="sm"
                              disabled={actionLoadingId === b._id}
                              onClick={() => handleUpdateStatus(b._id, "confirmed")}
                              className="h-8 px-2.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
                            </Button>
                          )}

                          {b.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoadingId === b._id}
                              onClick={() => handleUpdateStatus(b._id, "cancelled")}
                              className="h-8 px-2 text-xs rounded-lg text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoadingId === b._id}
                            onClick={() => handleDeleteBooking(b._id)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="space-y-3 md:hidden">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-3">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            ) : paginatedBookings.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground rounded-2xl border border-border bg-card p-4">
                No bookings found.
              </div>
            ) : (
              paginatedBookings.map((b) => (
                <div key={b._id} className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {b.serviceId?.name || "Service Unavailable"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        by {b.profileId?.fullName || "User"} ({b.profileId?.email})
                      </p>
                    </div>
                    {getStatusBadge(b.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 border-y border-border/40">
                    <span className="text-muted-foreground">
                      Date: <b className="text-foreground">{b.bookingDate ? format(new Date(b.bookingDate), "dd MMM yyyy") : "TBD"}</b>
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{Number(b.serviceId?.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {b.notes && (
                    <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded-lg">
                      "{b.notes}"
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooking(b)}
                      className="h-8 text-xs rounded-lg"
                    >
                      Details
                    </Button>
                    {b.status !== "confirmed" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(b._id, "confirmed")}
                        className="h-8 text-xs rounded-lg bg-emerald-600 text-white"
                      >
                        Confirm
                      </Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(b._id, "cancelled")}
                        className="h-8 text-xs rounded-lg text-red-600"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {filteredBookings && filteredBookings.length > 0 && (
            <div className="rounded-2xl border border-border px-6 py-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10 shadow-xs">
              <div>
                Showing <strong className="text-foreground font-semibold">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong className="text-foreground font-semibold">{Math.min(safeCurrentPage * itemsPerPage, totalItems)}</strong> of{" "}
                <strong className="text-foreground font-semibold">{totalItems}</strong> booking{totalItems !== 1 && "s"}
                {bookings && totalItems !== bookings.length && ` (filtered from ${bookings.length})`}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="h-8 rounded-full px-2.5 text-xs gap-1 border-border hover:bg-secondary disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) =>
                      p === "..." ? (
                        <span key={`dots-${idx}`} className="px-1.5 text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`h-8 min-w-[32px] px-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            safeCurrentPage === p
                              ? "bg-primary text-white shadow-xs"
                              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="h-8 rounded-full px-2.5 text-xs gap-1 border-border hover:bg-secondary disabled:opacity-40 cursor-pointer"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: SERVICES CATALOG & CREATOR SERVICE APPROVALS */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: `All Services (${services?.length || 0})` },
                {
                  key: "pending",
                  label: `Pending Review (${services?.filter((s) => s.approvalStatus === "pending")?.length || 0})`,
                },
                {
                  key: "approved",
                  label: `Approved (${services?.filter((s) => s.approvalStatus === "approved" || !s.approvalStatus)?.length || 0})`,
                },
                {
                  key: "rejected",
                  label: `Rejected (${services?.filter((s) => s.approvalStatus === "rejected")?.length || 0})`,
                },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="sm"
                  variant={serviceFilter === tab.key ? "default" : "outline"}
                  onClick={() => setServiceFilter(tab.key)}
                  className={`rounded-full text-xs h-8 px-3.5 ${
                    serviceFilter === tab.key
                      ? "gradient-sunset border-0 text-white shadow-xs"
                      : ""
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <Button
              size="sm"
              onClick={() => handleOpenServiceModal()}
              className="rounded-xl h-8 gradient-sunset text-white text-xs border-0 shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Platform Service
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-3">
                  <Skeleton className="h-36 w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : (
              services
                ?.filter((svc) => {
                  if (serviceFilter === "all") return true;
                  if (serviceFilter === "approved") return svc.approvalStatus === "approved" || !svc.approvalStatus;
                  if (serviceFilter === "pending") return svc.approvalStatus === "pending";
                  if (serviceFilter === "rejected") return svc.approvalStatus === "rejected";
                  return true;
                })
                .map((svc) => {
                  const isCreatorSubmitted = Boolean(svc.creatorId);
                  const isPendingReview = svc.approvalStatus === "pending";
                  const isRejected = svc.approvalStatus === "rejected";
                  const isApproved = svc.approvalStatus === "approved" || !svc.approvalStatus;

                  return (
                    <div
                      key={svc._id}
                      className={`rounded-2xl border bg-card overflow-hidden shadow-xs flex flex-col justify-between transition-colors ${
                        isPendingReview
                          ? "border-amber-500/50 ring-1 ring-amber-500/20"
                          : isRejected
                          ? "border-red-500/30 opacity-80"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="relative">
                        {svc.imageUrl ? (
                          <img
                            src={resolveImageUrl(svc.imageUrl)}
                            alt={svc.name}
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1590608897129-79da98d15969?w=800";
                            }}
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <div className="h-40 w-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}

                        {/* Status Pills */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isPendingReview
                                ? "bg-amber-500 text-white shadow-sm"
                                : isRejected
                                ? "bg-red-500 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {isPendingReview ? "⏳ Pending Review" : isRejected ? "✕ Rejected" : "✓ Approved"}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-base text-foreground leading-tight">
                              {svc.name}
                            </h3>
                            <Badge
                              variant={svc.enabled ? "default" : "secondary"}
                              className={`text-[10px] cursor-pointer ${
                                svc.enabled
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                              onClick={() => handleToggleServiceStatus(svc)}
                              title="Click to toggle active status"
                            >
                              {svc.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </div>

                          {/* Creator Details if submitted by a creator */}
                          {isCreatorSubmitted ? (
                            <div className="mt-1.5 rounded-lg bg-secondary/30 p-2 text-xs flex items-center gap-2 border border-border/40">
                              <User className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate text-foreground font-medium">
                                Creator: {svc.creatorId?.fullName || "Creator"}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                ({svc.creatorId?.email})
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 text-[11px] text-muted-foreground font-medium">
                              Platform Official Service
                            </div>
                          )}

                          <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {svc.description}
                          </p>

                          {isRejected && svc.rejectionReason && (
                            <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-600">
                              <span className="font-bold">Rejection Note:</span> {svc.rejectionReason}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Price</span>
                              <span className="text-base font-bold text-foreground">
                                ₹{Number(svc.price || 0).toLocaleString("en-IN")}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenServiceModal(svc)}
                                className="h-8 px-2.5 text-xs rounded-lg"
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteService(svc._id)}
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                title="Delete service"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Admin Approval Action Buttons */}
                          {isPendingReview && (
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                              <Button
                                size="sm"
                                disabled={actionServiceId === svc._id}
                                onClick={() => handleApproveService(svc._id)}
                                className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionServiceId === svc._id}
                                onClick={() => {
                                  setServiceToReject(svc);
                                  setRejectReason("");
                                  setRejectModalOpen(true);
                                }}
                                className="h-8 text-xs rounded-lg text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* MODAL: REJECT SERVICE */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Reject Creator Add-on Service
            </DialogTitle>
            <DialogDescription>
              Please provide feedback or a reason why this service submission is being rejected. The creator will be notified.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectServiceSubmit} className="space-y-4 py-2">
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">
                Service: <span className="font-bold text-primary">{serviceToReject?.name}</span>
              </p>
              <Textarea
                placeholder="Explain what needs improvement (e.g., price is missing clear deliverables, image is low quality...)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                required
                className="rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionServiceId === serviceToReject?._id}
                className="rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: BOOKING DETAILS */}
      <Dialog open={!!selectedBooking} onOpenChange={(o) => !o && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Booking Request Details
            </DialogTitle>
            <DialogDescription>
              Full information on this customer add-on service order.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">
                    {selectedBooking.serviceId?.name}
                  </span>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedBooking.serviceId?.description}
                </p>
                <div className="text-xs font-bold text-primary pt-1">
                  Price: ₹{Number(selectedBooking.serviceId?.price || 0).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Customer
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedBooking.profileId?.fullName || "User"} ({selectedBooking.profileId?.role})
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" /> Contact Email
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedBooking.profileId?.email || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Target Date
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedBooking.bookingDate
                      ? format(new Date(selectedBooking.bookingDate), "MMMM dd, yyyy")
                      : "To be scheduled"}
                  </span>
                </div>

                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">
                    Customer Requirements / Notes:
                  </span>
                  <div className="p-3 rounded-lg bg-card border border-border text-foreground leading-relaxed">
                    {selectedBooking.notes || "No additional notes provided by customer."}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
                {selectedBooking.status !== "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedBooking._id, "confirmed")}
                    className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Confirm Booking
                  </Button>
                )}
                {selectedBooking.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedBooking._id, "cancelled")}
                    className="rounded-xl text-xs text-red-600"
                  >
                    Cancel Booking
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: CREATE / EDIT SERVICE */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Add-on Service" : "Add New Platform Service"}
            </DialogTitle>
            <DialogDescription>
              Configure the service details, pricing, and cover image displayed to clients.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Service Name *
              </label>
              <Input
                placeholder="e.g. Professional Videography Team"
                value={serviceForm.name}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, name: e.target.value })
                }
                required
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Price (₹ INR) *
              </label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={serviceForm.price}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, price: e.target.value })
                }
                required
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Image Upload or Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Service / Rental Photo
                </label>
                <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setServiceImageMode("upload")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                      serviceImageMode === "upload"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Upload className="h-3 w-3" /> Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceImageMode("link")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                      serviceImageMode === "link"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link2 className="h-3 w-3" /> Image Link
                  </button>
                </div>
              </div>

              {serviceImageMode === "upload" ? (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-3.5 cursor-pointer bg-muted/20 transition-colors group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleServiceImageFileChange}
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1.5 group-hover:scale-105 transition-transform">
                        <Upload className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        {serviceImageFile ? serviceImageFile.name : "Click to select or drop photo"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        JPG, PNG, WEBP (Max 15MB)
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    placeholder="https://images.unsplash.com/... or direct image URL"
                    value={serviceForm.imageUrl}
                    onChange={(e) => {
                      setServiceForm({ ...serviceForm, imageUrl: e.target.value });
                      setServiceImagePreview(e.target.value);
                    }}
                    className="h-9 rounded-xl text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Paste a direct image link from Unsplash, Cloudinary, etc.
                  </p>
                </div>
              )}

              {/* Preview */}
              {(serviceImagePreview || serviceForm.imageUrl) && (
                <div className="relative rounded-xl overflow-hidden border border-border h-24 bg-muted/30 flex items-center justify-center">
                  <img
                    src={serviceImagePreview || resolveImageUrl(serviceForm.imageUrl)}
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
                        setServiceImageFile(null);
                        setServiceImagePreview("");
                        setServiceForm({ ...serviceForm, imageUrl: "" });
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Description & Deliverables
              </label>
              <Textarea
                placeholder="Provide a detailed description of what is included in this service..."
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, description: e.target.value })
                }
                rows={4}
                className="rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="enabledService"
                checked={serviceForm.enabled}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, enabled: e.target.checked })
                }
                className="rounded border-border"
              />
              <label htmlFor="enabledService" className="text-xs text-foreground cursor-pointer font-medium">
                Make this service active and visible on the website immediately
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setServiceModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={serviceSaving}
                className="rounded-xl text-xs gradient-sunset text-white border-0"
              >
                {serviceSaving
                  ? "Saving..."
                  : editingService
                  ? "Update Service"
                  : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
