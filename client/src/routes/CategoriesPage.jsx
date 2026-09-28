import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Search,
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { categories } from "../data/influencer";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

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

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [liveCreators, setLiveCreators] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    document.title = "Explore All Categories — Pravixo";

    const fetchLiveProfiles = async () => {
      try {
        const res = await api.get("/profiles", { params: { role: "creator" } });
        const data = res.data?.data || res.data?.profiles || res.data || [];
        if (Array.isArray(data)) {
          setLiveCreators(data);
        }
      } catch (error) {
        console.error("Failed to load profiles for categories:", error);
      }
    };

    fetchLiveProfiles();
  }, []);

  const filteredCategories = categories.filter((c) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase().trim();
    const meta = CATEGORY_METADATA[c.name] || {};
    return (
      c.name.toLowerCase().includes(term) ||
      (meta.desc && meta.desc.toLowerCase().includes(term))
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Explore All <span className="text-gradient-sunset">Categories</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Browse creators and brands grouped by their specialized niche. Select any category to open and explore verified profiles in browse.
        </p>

        {/* Search within categories */}
        <div className="mt-6 flex max-w-md mx-auto items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="ml-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search category (e.g. Fashion, Tech, Food)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground font-medium"
          />
        </div>
      </div>

      {/* Grid of All Categories */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCategories.map((c, i) => {
          const meta = CATEGORY_METADATA[c.name] || {};
          const accent = ACCENTS[i % ACCENTS.length];
          const IconComp = meta.icon || Compass;

          const creatorCount = (liveCreators || []).filter((p) => {
            if (!p || p.isSuspended) return false;
            const cats = (p.category || "").toLowerCase();
            return cats.includes(c.name.toLowerCase());
          }).length;

          return (
            <Link
              key={c.name}
              to={`/browse?category=${encodeURIComponent(c.name)}`}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary card-3d",
                accent.ring
              )}
            >
              {/* Accent line along the top edge */}
              <span className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100", accent.bar)} />

              <div>
                <div className="flex items-start justify-between">
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm", accent.tile)}>
                    <IconComp className="h-7 w-7" strokeWidth={1.8} />
                  </div>
                  <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {creatorCount > 0
                      ? `${creatorCount} ${creatorCount === 1 ? "creator" : "creators"}`
                      : "Coming soon"}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {c.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {meta.desc || "Top tier creators & influencers"}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-border/80 pt-4 text-sm font-bold text-foreground">
                <span className="group-hover:text-primary transition-colors">Open in Browse</span>
                <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-xs">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No categories found matching "{searchFilter}".</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchFilter("")}
            className="mt-3 rounded-full"
          >
            Clear Filter
          </Button>
        </div>
      )}
    </div>
  );
}
