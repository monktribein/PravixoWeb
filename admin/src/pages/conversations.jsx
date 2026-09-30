import { useEffect, useState, useMemo } from "react";
import { resolveImageUrl } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { Eye, MessageSquare, Search, Plus, Shield, Sparkles, Building2, User, Send, ArrowRight, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/axios";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

export function ConversationsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Conversations & Chat — Pravixo Admin";
  }, []);

  const [typeFilter, setTypeFilter] = useState("all"); // all | admin_brand | admin_creator | brand_creator
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState(null);

  // New Chat Modal states
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [initialMsg, setInitialMsg] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get("/admin/conversations");
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/profiles");
      if (res.data.success) {
        setAllProfiles(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, []);

  const handleStartChat = async (e) => {
    e?.preventDefault();
    if (!selectedUser) {
      toast.error("Please select a user to start conversation.");
      return;
    }

    try {
      setIsStartingChat(true);
      const res = await api.post("/admin/conversations/open", {
        targetUserId: selectedUser._id,
        initialMessage: initialMsg.trim() || undefined,
      });

      if (res.data.success && res.data.conversationId) {
        toast.success(`Chat opened with ${selectedUser.fullName}!`);
        setIsNewChatOpen(false);
        setSelectedUser(null);
        setInitialMsg("");
        navigate(`/messages/${res.data.conversationId}`);
      }
    } catch (err) {
      console.error("Failed to start chat:", err);
      toast.error(err.response?.data?.message || "Failed to start chat.");
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm("Are you sure you want to permanently delete this entire conversation and all its messages from database?")) {
      return;
    }
    try {
      const res = await api.delete(`/admin/conversations/${conversationId}`);
      if (res.data.success) {
        toast.success("Conversation deleted successfully from database.");
        setConversations((prev) => prev ? prev.filter((c) => c._id !== conversationId) : []);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      toast.error(err.response?.data?.message || "Failed to delete conversation.");
    }
  };

  const filtered = useMemo(() => {
    if (!conversations) return null;
    return conversations.filter((c) => {
      const matchesStatus = !statusFilter || c.status === statusFilter;
      
      let matchesType = true;
      if (typeFilter === "admin_brand") {
        matchesType = c.conversationType === "admin_brand" || (!!c.admin && !!c.brand);
      } else if (typeFilter === "admin_creator") {
        matchesType = c.conversationType === "admin_creator" || (!!c.admin && !!c.creator);
      } else if (typeFilter === "brand_creator") {
        matchesType = c.conversationType === "brand_creator" || (!c.admin && !!c.creator && !!c.brand);
      }

      const creatorName = c.creator?.fullName?.toLowerCase() || "";
      const brandName = c.brand?.fullName?.toLowerCase() || "";
      const adminName = c.admin?.fullName?.toLowerCase() || "";
      const campaignTitle = c.campaign?.title?.toLowerCase() || "";
      const searchLower = search.toLowerCase();

      const matchesSearch = !search ||
        creatorName.includes(searchLower) ||
        brandName.includes(searchLower) ||
        adminName.includes(searchLower) ||
        campaignTitle.includes(searchLower);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [conversations, statusFilter, typeFilter, search]);

  // Pagination (10 conversations per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, search]);

  const totalItems = filtered ? filtered.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedConversations = useMemo(() => {
    if (!filtered) return null;
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, safeCurrentPage, itemsPerPage]);

  const statusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600";
      case "pending":
        return "bg-amber/10 text-amber";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "";
    }
  };

  const filteredUsersForModal = allProfiles.filter((u) => {
    if (u.isDeleted || u.role === "admin") return false;
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(s) ||
      u.handle?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Conversations & Chat
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directly message Brands and Creators or monitor platform communications
          </p>
        </div>

        <Button
          onClick={() => setIsNewChatOpen(true)}
          className="rounded-full gradient-sunset text-white border-0 shadow-glow font-semibold h-10 px-5 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Start New Chat
        </Button>
      </div>

      {/* Type Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        {[
          { id: "all", label: "All Chats" },
          { id: "admin_brand", label: "Admin ↔ Brands" },
          { id: "admin_creator", label: "Admin ↔ Creators" },
          { id: "brand_creator", label: "Brand ↔ Creator" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-200 shrink-0 ${
              typeFilter === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTypeFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {["", "pending", "active", "completed"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              className={`rounded-full capitalize ${statusFilter === s ? "gradient-sunset border-0 text-white" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "" ? "All Statuses" : s}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by participant, brand or campaign..."
            className="pl-9 rounded-full bg-secondary/50 border-0 text-xs h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Party A</TableHead>
              <TableHead>Party B</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Campaign Context</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : paginatedConversations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No conversations found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedConversations.map((c) => {
                const isAdminChat = !!c.admin || c.conversationType === "admin_brand" || c.conversationType === "admin_creator";
                const partyA = c.admin ? { ...c.admin, role: "admin", fullName: c.admin.fullName || "Pravixo Admin" } : c.creator;
                const partyB = c.brand || c.creator;

                return (
                  <TableRow key={c._id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            partyA?.role === "admin"
                              ? "/log.png"
                              : resolveImageUrl(partyA?.avatarUrl, partyA?.fullName || "User", partyA?.gender, partyA?.role)
                          }
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = partyA?.role === "admin" ? "/log.png" : resolveImageUrl("", partyA?.fullName || "User", partyA?.gender, partyA?.role);
                          }}
                          alt=""
                          className="h-10 w-10 rounded-full border border-border object-cover bg-background shrink-0"
                        />
                        <div>
                          <span className="text-sm font-semibold block">
                            {partyA?.fullName || "Admin"}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`rounded-full text-[9px] px-1.5 py-0 ${
                              partyA?.role === "admin"
                                ? "bg-primary/15 text-primary font-bold"
                                : partyA?.role === "creator"
                                ? "bg-violet/10 text-violet"
                                : "bg-amber/10 text-amber"
                            }`}
                          >
                            {partyA?.role || "user"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            partyB?.role === "admin"
                              ? "/log.png"
                              : resolveImageUrl(partyB?.avatarUrl, partyB?.fullName || "User", partyB?.gender, partyB?.role)
                          }
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = partyB?.role === "admin" ? "/log.png" : resolveImageUrl("", partyB?.fullName || "User", partyB?.gender, partyB?.role);
                          }}
                          alt=""
                          className="h-9 w-9 rounded-full border border-border object-cover bg-background shrink-0"
                        />
                        <div>
                          <span className="text-sm font-semibold block">
                            {partyB?.fullName || "Unknown"}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`rounded-full text-[9px] px-1.5 py-0 ${
                              partyB?.role === "creator"
                                ? "bg-violet/10 text-violet"
                                : "bg-amber/10 text-amber"
                            }`}
                          >
                            {partyB?.role || "user"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {isAdminChat ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] rounded-full font-bold">
                          🛡️ Admin Direct
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] rounded-full text-muted-foreground">
                          Collaboration
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="max-w-[180px]">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.campaign?.title || "Direct Communication"}
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`rounded-full text-[10px] capitalize ${statusColor(c.status)}`}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm font-medium">
                      {c.messageCount}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {c.lastMessage
                        ? format(new Date(c.lastMessage.createdAt), "MMM d, HH:mm")
                        : format(new Date(c.createdAt), "MMM d, yyyy")}
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/messages/${c._id}`}>
                          <Button
                            size="sm"
                            className="rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold h-8 px-3 flex items-center gap-1.5"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-primary" /> Open Chat
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteConversation(c._id)}
                          className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          title="Permanently Delete Conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filtered && filtered.length > 0 && (
          <div className="border-t border-border px-6 py-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10">
            <div>
              Showing <strong className="text-foreground font-semibold">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{" "}
              <strong className="text-foreground font-semibold">{Math.min(safeCurrentPage * itemsPerPage, totalItems)}</strong> of{" "}
              <strong className="text-foreground font-semibold">{totalItems}</strong> conversation{totalItems !== 1 && "s"}
              {conversations && totalItems !== conversations.length && ` (filtered from ${conversations.length})`}
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

      {/* START NEW CHAT MODAL */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Start Chat with Brand or Creator
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select any registered Brand or Creator to open a direct messaging channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* User Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search user by name, handle, or email..."
                className="pl-9 rounded-xl bg-secondary/40 border-border text-xs h-10"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            {/* Select User List */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 border border-border/50 rounded-2xl p-2 bg-secondary/10">
              {filteredUsersForModal.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching users found.
                </div>
              ) : (
                filteredUsersForModal.map((u) => {
                  const isSelected = selectedUser?._id === u._id;
                  return (
                    <div
                      key={u._id}
                      onClick={() => setSelectedUser(u)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/15 border border-primary/40"
                          : "hover:bg-secondary/40 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveImageUrl(u.avatarUrl, u.fullName || "User")}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || "User")}&background=random`;
                          }}
                          alt=""
                          className="h-8 w-8 rounded-full border border-border object-cover"
                        />
                        <div>
                          <span className="text-xs font-semibold block text-foreground">
                            {u.fullName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {u.handle ? `@${u.handle.replace(/^@+/, '')}` : u.email}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[9px] capitalize rounded-full ${
                          u.role === "creator" ? "bg-violet/10 text-violet" : "bg-amber/10 text-amber"
                        }`}
                      >
                        {u.role}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>

            {/* Optional Initial Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Initial Message (Optional)
              </label>
              <Textarea
                rows={3}
                placeholder="Type your message to send immediately upon opening the chat..."
                className="text-xs rounded-xl bg-background border-border resize-none"
                value={initialMsg}
                onChange={(e) => setInitialMsg(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full text-xs"
              onClick={() => {
                setIsNewChatOpen(false);
                setSelectedUser(null);
                setInitialMsg("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedUser || isStartingChat}
              onClick={handleStartChat}
              className="rounded-full gradient-sunset text-white border-0 shadow-glow text-xs font-semibold px-5"
            >
              {isStartingChat ? "Opening Chat..." : "Open Chat Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
