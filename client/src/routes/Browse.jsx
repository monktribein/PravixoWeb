import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  MapPin,
  Check,
  Sparkles,
  Handshake,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

import { useAuth } from "@/components/auth/AuthProvider";

import {
  categories,
  formatFollowers,
  influencers,
  mockBrands,
  locations,
} from "../data/influencer";
import { getGenderAvatar, DEFAULT_BANNER } from "../utils/avatar";

import { formatINR } from "@/lib/format";
import api from "@/lib/api";

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* =========================
     ROLE
  ========================= */

  const roleParam = searchParams.get("role");

  const role = roleParam === "brand" ? "brand" : "creator";

  /* =========================
     FILTER STATES
  ========================= */

  const [query, setQuery] = useState(
    searchParams.get("q") || ""
  );

  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All"
  );

  const [selectedLocation, setSelectedLocation] =
    useState("All");

  const [minFollowers, setMinFollowers] = useState(0);

  const [maxPrice, setMaxPrice] = useState(200000);

  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [open, setOpen] = useState(false);

  /* =========================
     AUTH MODAL
  ========================= */

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [pendingRedirectUrl, setPendingRedirectUrl] =
    useState("");

  /* =========================
     API DATA
  ========================= */

  const [liveProfiles, setLiveProfiles] = useState([]);

  const [loading, setLoading] = useState(true);

  /* =========================
     PAGE TITLE
  ========================= */

  useEffect(() => {
    document.title =
      role === "brand"
        ? "Browse Brands — Pravixo"
        : "Browse Creators — Pravixo";
  }, [role]);

  /* =========================
     FETCH PROFILES
  ========================= */

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);

        const res = await api.get("/profiles", {
          params: {
            role,
          },
        });

        const data =
          res.data?.data ||
          res.data?.profiles ||
          res.data ||
          [];

        if (Array.isArray(data)) {
          setLiveProfiles(data);
        } else {
          setLiveProfiles([]);
        }
      } catch (err) {
        console.error(
          "Failed to load profiles in browse:",
          err
        );

        setLiveProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [role]);

  /* =========================
     SYNC URL -> FILTERS
  ========================= */

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    const queryFromUrl = searchParams.get("q");

    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    } else if (queryFromUrl) {
      // If query matches a known category name (e.g. "fashion" -> "Fashion")
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === queryFromUrl.trim().toLowerCase()
      );
      if (matchedCat) {
        setSelectedCategory(matchedCat.name);
      } else {
        setSelectedCategory("All");
      }
    } else {
      setSelectedCategory("All");
    }

    setQuery(queryFromUrl || "");
  }, [searchParams]);

  const resolveImageUrl = (url) => {
    if (!url || url === "undefined" || url === "null" || typeof url !== "string") return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    if (url.startsWith("/avatars/") || url.startsWith("/icons/") || url.startsWith("/assets/")) {
      return url;
    }
    let base = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    if (base.endsWith("/api")) base = base.slice(0, -4);
    const cleanBase = base.replace(/\/$/, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  };

  const formattedLiveProfiles = useMemo(() => {
    return (liveProfiles || [])
      .filter((p) => {
        if (!p || p.isSuspended) return false;
        const name = (p.fullName || p.name || "").toLowerCase().trim();
        const email = (p.email || "").toLowerCase().trim();
        if (email.includes("@pravixo.test") || email.includes("@test.com")) return false;
        return !/task20|impostor|suspended|test brand|alice referrer|bob creator|charlie creator|^test$|^ppp$|^llalla$/i.test(name);
      })
      .map((p) => {
        const name =
          p.fullName ||
          p.name ||
          (role === "brand" ? "Brand" : "Creator");

        const followers =
          Number(p.instagramFollowers || 0) +
          Number(p.facebookFollowers || 0) +
          Number(p.linkedinFollowers || 0) +
          Number(p.youtubeFollowers || 0) +
          Number(p.quoraFollowers || 0) +
          Number(p.twitterFollowers || 0);

        const createdTimestamp = p.createdAt ? new Date(p.createdAt).getTime() : 0;
        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const isRecent = createdTimestamp > 0 && (now - createdTimestamp) <= threeDaysMs;

        const isVerified =
          p.verificationStatus === "verified" ||
          p.isVerified === true;

        return {
          id: p._id || p.id,
          name,
          handle:
            p.handle ||
            `@${name
              .toLowerCase()
              .replace(/\s+/g, "")}`,
          category:
            p.category ||
            "Other",
          followers,
          startingPrice:
            Number(p.startingPrice || 0),
          isBarterAllowed:
            Boolean(p.isBarterAllowed),
          location:
            p.location ||
            "India",
          rating:
            p.rating ?? 5.0,
          reviews:
            p.reviewsCount ?? 0,
          available: true,
          gender: p.gender || "",
          createdAt: p.createdAt,
          isRecentlyJoined: isRecent,
          avatar:
            resolveImageUrl(p.avatarUrl || p.avatar || p.profileImage) ||
            getGenderAvatar(name, p.gender, p.role || role),
          cover:
            resolveImageUrl(p.coverUrl || p.cover || p.bannerUrl) ||
            DEFAULT_BANNER,
          bio:
            p.bio || "",
          verificationStatus: isVerified ? "verified" : "unverified",
          role:
            p.role ||
            role,
        };
      });
  }, [liveProfiles, role]);

  /* =========================
     ALL ITEMS & AVAILABLE LOCATIONS
  ========================= */

  const allItems = useMemo(() => {
    const mockItems =
      role === "brand"
        ? mockBrands
        : influencers;

    return formattedLiveProfiles.length > 0 ? formattedLiveProfiles : mockItems;
  }, [formattedLiveProfiles, role]);

  const availableLocations = useMemo(() => {
    const locSet = new Set();
    // Add default predefined locations
    locations.forEach((loc) => {
      if (loc) locSet.add(loc.trim());
    });
    // Add any location found on active profiles
    allItems.forEach((item) => {
      if (item.location) {
        String(item.location)
          .split(",")
          .forEach((locPart) => {
            const clean = locPart.trim();
            if (clean && clean.toLowerCase() !== "pan india" && clean.toLowerCase() !== "india") {
              // If not already in set as a specific city
              const existingMatch = Array.from(locSet).find(
                (l) => l.toLowerCase().startsWith(clean.toLowerCase()) || clean.toLowerCase().startsWith(l.toLowerCase().split(",")[0].trim())
              );
              if (!existingMatch) {
                locSet.add(clean.includes("India") ? clean : `${clean}, India`);
              }
            }
          });
      }
    });
    return Array.from(locSet).sort();
  }, [allItems]);

  /* =========================
     FILTERED ITEMS
  ========================= */

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      /* =========================
         SEARCH
      ========================= */

      if (query.trim()) {
        const q = query
          .trim()
          .toLowerCase();

        const matchesName =
          item.name
            ?.toLowerCase()
            .includes(q);

        const matchesHandle =
          item.handle
            ?.toLowerCase()
            .includes(q);

        const matchesCategory =
          item.category
            ?.toLowerCase()
            .includes(q);

        const matchesLocation =
          item.location
            ?.toLowerCase()
            .includes(q);

        const matchesBio =
          item.bio
            ?.toLowerCase()
            .includes(q);

        const matchesBarter =
          (q === "barter" || q === "barter deals" || q === "barter deal" || q.includes("barter")) &&
          Boolean(item.isBarterAllowed);

        if (
          !matchesName &&
          !matchesHandle &&
          !matchesCategory &&
          !matchesLocation &&
          !matchesBio &&
          !matchesBarter
        ) {
          return false;
        }
      }

      /* =========================
         CATEGORY
      ========================= */

      if (
        selectedCategory &&
        selectedCategory !== "All"
      ) {
        const filterCategory = String(selectedCategory).trim().toLowerCase();
        const itemCategories = String(item.category || "")
          .split(",")
          .map((c) => c.trim().toLowerCase())
          .filter(Boolean);

        const matchesCategory = itemCategories.some(
          (cat) =>
            cat === filterCategory ||
            cat.includes(filterCategory) ||
            filterCategory.includes(cat)
        );

        if (!matchesCategory) {
          return false;
        }
      }

      /* =========================
         LOCATION
      ========================= */

      if (
        selectedLocation &&
        selectedLocation !== "All"
      ) {
        const itemLocation = String(
          item.location || ""
        ).toLowerCase();

        const filterLocation = String(
          selectedLocation
        ).toLowerCase();

        const cityName = filterLocation.split(",")[0].trim();

        const matchesLocation =
          itemLocation.includes(filterLocation) ||
          itemLocation.includes(cityName) ||
          (itemLocation.includes("pan india") && cityName !== "");

        if (!matchesLocation) {
          return false;
        }
      }

      /* =========================
         FOLLOWERS
      ========================= */

      if (
        role === "creator" &&
        Number(item.followers || 0) <
          Number(minFollowers)
      ) {
        return false;
      }

      /* =========================
         PRICE
      ========================= */

      if (
        Number(item.startingPrice || 0) >
        Number(maxPrice)
      ) {
        return false;
      }

      /* =========================
         VERIFIED
      ========================= */

      if (
        verifiedOnly &&
        item.verificationStatus !==
          "verified"
      ) {
        return false;
      }

      return true;
    });
  }, [
    allItems,
    query,
    selectedCategory,
    selectedLocation,
    minFollowers,
    maxPrice,
    verifiedOnly,
    role,
  ]);

  /* =========================
     CATEGORY CLICK
  ========================= */

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);

    const params = {};

    if (role) {
      params.role = role;
    }

    if (category === "All") {
      // Clear query if user selects All
      setQuery("");
    } else {
      params.category = category;
      // If previous query was category-related or free search, we can clear query or preserve it
      // Clear free search query when explicitly selecting a category so there is no conflict
      setQuery("");
    }

    setSearchParams(params);
  };

  /* =========================
     SEARCH CHANGE
  ========================= */

  const handleSearchChange = (value) => {
    setQuery(value);

    const params = {};

    if (role) {
      params.role = role;
    }

    if (value.trim()) {
      params.q = value.trim();
      // Check if search value matches a category
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === value.trim().toLowerCase()
      );
      if (matchedCat) {
        setSelectedCategory(matchedCat.name);
      }
    } else {
      // When search input is cleared, keep or reset category
    }

    if (
      selectedCategory &&
      selectedCategory !== "All" &&
      !value.trim()
    ) {
      params.category = selectedCategory;
    }

    setSearchParams(params);
  };

  /* =========================
     ROLE CHANGE
  ========================= */

  const handleRoleChange = (newRole) => {
    const params = {
      role: newRole,
    };

    if (
      selectedCategory &&
      selectedCategory !== "All"
    ) {
      params.category =
        selectedCategory;
    }

    if (query.trim()) {
      params.q = query.trim();
    }

    setSearchParams(params);
  };

  /* =========================
     CARD CLICK
  ========================= */

  const handleCardClick = (id, itemRole) => {
    const targetUrl =
      itemRole === "brand"
        ? `/brand/${id}`
        : `/influencer/${id}`;

    if (!user) {
      setPendingRedirectUrl(
        targetUrl
      );

      setShowAuthModal(true);
    }
  };

  /* =========================
     RESET
  ========================= */

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("All");
    setSelectedLocation("All");
    setMinFollowers(0);
    setMaxPrice(200000);
    setVerifiedOnly(false);

    setSearchParams({
      role,
    });
  };

  /* =========================
     FILTER CONTENT
  ========================= */

  const FiltersContent = (
    <div className="space-y-6">

      {/* FILTER HEADER */}

      <div className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="font-display font-semibold text-foreground">
          Filters
        </h3>

        <button
          onClick={resetFilters}
          className="text-xs font-bold text-gradient-sunset hover:opacity-80 transition-opacity cursor-pointer"
        >
          Reset all
        </button>
      </div>

      {/* ROLE */}

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Looking for
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">

          <Button
            type="button"
            variant={
              role === "creator"
                ? "default"
                : "outline"
            }
            size="sm"
            className={
              role === "creator"
                ? "rounded-xl gradient-sunset border-0 text-white font-semibold shadow-glow"
                : "rounded-xl"
            }
            onClick={() =>
              handleRoleChange("creator")
            }
          >
            Creators
          </Button>

          <Button
            type="button"
            variant={
              role === "brand"
                ? "default"
                : "outline"
            }
            size="sm"
            className={
              role === "brand"
                ? "rounded-xl gradient-sunset border-0 text-white font-semibold shadow-glow"
                : "rounded-xl"
            }
            onClick={() =>
              handleRoleChange("brand")
            }
          >
            Brands
          </Button>

        </div>
      </div>

      {/* CATEGORY */}

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Category
        </label>

        <div className="mt-2 flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">

          {/* ALL */}

          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer text-xs transition-all duration-200",
              selectedCategory === "All"
                ? "gradient-sunset text-white border-0 shadow-glow font-bold scale-105"
                : "hover:bg-muted"
            )}
            onClick={() =>
              handleCategoryChange("All")
            }
          >
            All
          </Badge>

          {/* CATEGORIES */}

          {categories.map((cat) => {
            const isSelected =
              selectedCategory
                .toLowerCase()
                .trim() ===
              cat.name
                .toLowerCase()
                .trim();

            return (
              <Badge
                key={cat.id}
                variant="outline"
                className={cn(
                  "cursor-pointer text-xs transition-all duration-200 hover:scale-105",
                  isSelected
                    ? "gradient-sunset text-white border-0 shadow-glow font-bold scale-105"
                    : "hover:bg-muted"
                )}
                onClick={() =>
                  handleCategoryChange(
                    cat.name
                  )
                }
              >
                {cat.name}
              </Badge>
            );
          })}

        </div>
      </div>

      {/* FOLLOWERS */}

      {role === "creator" && (
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground">
              Min. Followers
            </span>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={10000000}
                step={100}
                value={minFollowers === 0 ? "" : minFollowers}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                  setMinFollowers(val);
                }}
                className="w-20 rounded-lg border border-border bg-background px-2 py-0.5 text-right text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                ({formatFollowers(minFollowers)})
              </span>
            </div>
          </div>

          <Slider
            value={[minFollowers]}
            onValueChange={(val) =>
              setMinFollowers(val[0])
            }
            max={500000}
            step={500}
            className="mt-3"
          />

          <div className="mt-2 flex flex-wrap gap-1">
            {[0, 1000, 5000, 10000, 50000, 100000].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setMinFollowers(count)}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-all cursor-pointer",
                  minFollowers === count
                    ? "gradient-sunset border-0 text-white shadow-glow scale-105"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {count === 0 ? "Any" : `${formatFollowers(count)}+`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PRICE */}

      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-muted-foreground">
            Max. Budget / Starting Price
          </span>

          <span className="font-bold text-gradient-sunset">
            {formatINR(maxPrice)}
          </span>
        </div>

        <Slider
          value={[maxPrice]}
          onValueChange={(val) =>
            setMaxPrice(val[0])
          }
          max={200000}
          step={5000}
          className="mt-3"
        />
      </div>

      {/* LOCATION */}

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Location
        </label>

        <select
          value={selectedLocation}
          onChange={(e) =>
            setSelectedLocation(
              e.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="All">
            All Locations
          </option>

          {availableLocations.map((loc) => (
            <option
              key={loc}
              value={loc}
            >
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* VERIFIED */}

      <div className="flex items-center gap-2 border-t border-border pt-2">
        <input
          type="checkbox"
          id="verifiedOnly"
          checked={verifiedOnly}
          onChange={(e) =>
            setVerifiedOnly(
              e.target.checked
            )
          }
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />

        <label
          htmlFor="verifiedOnly"
          className="cursor-pointer text-xs font-semibold text-foreground"
        >
          Verified Profiles Only
        </label>
      </div>

    </div>
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Browse{" "}
            {role === "brand"
              ? "Brands"
              : "Creators"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading..."
              : `${filtered.length} ${
                  role === "brand"
                    ? "brands"
                    : "creators"
                } available for collaboration`}
          </p>

          {/* SHOW ACTIVE CATEGORY */}

          {selectedCategory !== "All" && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Category:
              </span>

              <Badge
                variant="outline"
                className="rounded-full gradient-sunset text-white border-0 shadow-glow font-bold pl-3 pr-2 py-1 text-xs"
              >
                {selectedCategory}

                <button
                  type="button"
                  onClick={() =>
                    handleCategoryChange(
                      "All"
                    )
                  }
                  className="ml-1.5 hover:opacity-75 transition-opacity cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            </div>
          )}
        </div>

        {/* SEARCH */}

        <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm sm:w-80">

          <Search className="ml-2.5 h-4 w-4 text-muted-foreground" />

          <input
            type="text"
            value={query}
            onChange={(e) =>
              handleSearchChange(
                e.target.value
              )
            }
            placeholder={`Search ${
              role === "brand"
                ? "brands"
                : "creators"
            }...`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full lg:hidden"
            onClick={() =>
              setOpen(true)
            }
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

        </div>

      </div>

      {/* MAIN GRID */}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">

        {/* DESKTOP FILTER */}

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-card">
            {FiltersContent}
          </div>
        </aside>

        {/* MOBILE FILTER */}

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">

            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() =>
                setOpen(false)
              }
            />

            <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm overflow-y-auto bg-card p-6 shadow-elevated">

              <div className="mb-4 flex items-center justify-between">

                <h3 className="font-display text-lg font-bold">
                  Filters
                </h3>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>

              </div>

              {FiltersContent}

            </div>

          </div>
        )}

        {/* RESULTS */}

        <div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-sm text-muted-foreground">
                Loading profiles...
              </div>
            </div>
          ) : filtered.length === 0 ? (

            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">

              <Search className="mb-3 h-10 w-10 text-muted-foreground" />

              <h3 className="font-display text-lg font-bold text-foreground">
                No{" "}
                {role === "brand"
                  ? "brands"
                  : "creators"}{" "}
                found
              </h3>

              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Try another category or reset
                your filters.
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-4 rounded-full"
              >
                Reset Filters
              </Button>

            </div>

          ) : (

            <motion.div
              layout
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
            >

              {filtered.map((item, idx) => {

                const itemRole =
                  item.role || role;

                const targetUrl =
                  itemRole === "brand"
                    ? `/brand/${item.id}`
                    : `/influencer/${item.id}`;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min((idx % 12) * 0.04, 0.3),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="h-full"
                  >
                    <Link
                      to={targetUrl}
                      className="group flex flex-col h-full overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-elevated hover:border-primary/40 card-3d"
                    >

                      {/* COVER */}

                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">

                        <img
                          src={item.cover}
                          alt={item.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_BANNER;
                          }}
                        />

                        {item.isRecentlyJoined && (
                          <Badge className="absolute left-3 top-3 rounded-full border-0 gradient-sunset px-2.5 py-0.5 text-[11px] font-bold text-white shadow-glow flex items-center gap-1 z-10">
                            <Sparkles className="h-3 w-3" /> Recent Joined
                          </Badge>
                        )}

                        <Badge
                          variant="secondary"
                          className="absolute right-3 top-3 border-0 bg-background/90 text-xs font-semibold backdrop-blur z-10"
                        >
                          {item.category}
                        </Badge>

                      </div>

                      {/* CONTENT */}

                      <div className="-mt-8 flex flex-1 flex-col px-5 pb-5">

                        <img src={item.avatar}
                          alt={item.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="relative z-10 h-16 w-16 rounded-full border-4 border-card bg-muted object-cover shadow-elevated transition-transform duration-300 group-hover:scale-105"
                         onError={(e) => { e.target.onerror = null; e.target.src = getGenderAvatar(item.name, item.gender, itemRole); }} />

                        <div className="mt-3 flex items-start justify-between gap-2">

                          <div className="min-w-0">

                            <h3 className="truncate font-display font-semibold text-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                              <span>{item.name}</span>
                              {item.verificationStatus === "verified" && (
                                <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 inline-block fill-blue-500/15" title="Verified Profile" />
                              )}
                            </h3>

                            <p className="truncate text-xs text-muted-foreground">
                              {item.handle}
                            </p>

                          </div>

                          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">

                            <Star className="h-3.5 w-3.5 fill-current" />

                            {item.rating || 5.0}

                          </span>

                        </div>

                        <div className="mt-auto pt-4">

                          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">

                            <span className="flex items-center gap-1 truncate">

                              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />

                              {item.location?.split(",")[0] ||
                                "India"}

                            </span>

                            {role === "creator" && (
                              <span>
                                <strong className="text-foreground">
                                  {formatFollowers(
                                    item.followers ||
                                      0
                                  )}
                                </strong>{" "}
                                followers
                              </span>
                            )}

                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {item.isBarterAllowed && (!item.startingPrice || item.startingPrice === 0)
                                ? "Deal Type"
                                : "Starting from"}
                            </span>

                            {item.isBarterAllowed && (!item.startingPrice || item.startingPrice === 0) ? (
                              <span className="inline-flex items-center gap-1 font-display text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-xs">
                                <Handshake className="h-3.5 w-3.5" /> Barter Available
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-display text-sm font-bold text-gradient-sunset">
                                  {formatINR(item.startingPrice || 0)}
                                </span>
                                {item.isBarterAllowed && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md">
                                    <Handshake className="h-2.5 w-2.5" /> Barter
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                        </div>

                      </div>

                    </Link>
                  </motion.div>
                );
              })}

            </motion.div>
          )}

        </div>

      </div>

      {/* AUTH MODAL */}

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() =>
              setShowAuthModal(false)
            }
          />

          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-elevated">

            <h3 className="font-display text-lg font-bold text-foreground">
              Sign In Required
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in to view detailed
              profile information, rates and
              collaboration options.
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <Button
                variant="outline"
                onClick={() =>
                  setShowAuthModal(false)
                }
                className="rounded-full"
              >
                Cancel
              </Button>

              <Button
                onClick={() => {
                  setShowAuthModal(false);

                  navigate("/login", {
                    state: {
                      from: pendingRedirectUrl,
                    },
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