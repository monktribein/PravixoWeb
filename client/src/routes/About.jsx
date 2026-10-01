import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Zap,
  LineChart,
  RefreshCw,
  Headphones,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  Layers,
  Lock,
  Play,
  Users,
  Target,
  DollarSign,
  Check,
  Building2,
  Flame,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion } from "motion/react";

export function About() {
  const [activeTab, setActiveTab] = useState("all");

  const stats = [
    { value: "10,000+", label: "Verified Creators", change: "+140% YoY", icon: Users },
    { value: "2,500+", label: "Active Brands", change: "Fast Growing", icon: Building2 },
    { value: "₹25Cr+", label: "Campaigns Powered", change: "100% Escrow", icon: DollarSign },
    { value: "99.4%", label: "Satisfaction Rate", change: "Verified Reviews", icon: Award },
  ];

  const features = [
    {
      title: "Bank-Grade Escrow Vault",
      description:
        "Every single rupee stays locked in secure Razorpay escrow until brand deliverables are verified and approved.",
      icon: ShieldCheck,
      badge: "Financial Security",
      color: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
    },
    {
      title: "100% Verified Creator Metrics",
      description:
        "Real-time social sync, verified authentic followers, zero fake bots, and audited engagement benchmarks.",
      icon: UserCheck,
      badge: "Real Audiences",
      color: "from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30",
    },
    {
      title: "AI-Powered Smart Match",
      description:
        "Proprietary matching algorithms align brand briefs with creators who generate actual converted sales.",
      icon: Zap,
      badge: "High ROI",
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    },
    {
      title: "Real-Time Campaign Telemetry",
      description:
        "Live tracking of post links, reels, click rates, submission deadlines, and payout disbursements in one dashboard.",
      icon: LineChart,
      badge: "Analytics",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Zero-Friction Collaboration Hub",
      description:
        "Integrated messaging, contract agreements, in-app deliverables review, and multi-round revisions.",
      icon: RefreshCw,
      badge: "Automated",
      color: "from-violet-500/20 to-purple-500/20 text-purple-400 border-purple-500/30",
    },
    {
      title: "24/7 Dedicated Account Shield",
      description:
        "Dispute resolution agents and campaign specialists standing by to guarantee smooth execution.",
      icon: Headphones,
      badge: "Concierge",
      color: "from-blue-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30",
    },
  ];

  const workflowSteps = [
    {
      number: "01",
      title: "Campaign Brief",
      subtitle: "Brand Sets Scope",
      desc: "Brand defines campaign goals, platform channels, deliverable types, and set budget.",
      icon: Target,
      highlight: "Instant Setup",
    },
    {
      number: "02",
      title: "Escrow Deposit",
      subtitle: "Protected Funds",
      desc: "Funds are deposited securely into escrow before any work begins, assuring creators.",
      icon: Lock,
      highlight: "100% Safe",
    },
    {
      number: "03",
      title: "Creator Selection",
      subtitle: "Perfect Match",
      desc: "Top vetted creators connect or are invited directly through precision filters.",
      icon: Users,
      highlight: "Audited Metrics",
    },
    {
      number: "04",
      title: "Content Review",
      subtitle: "In-App Approval",
      desc: "Drafts, posts, and reels are reviewed, revised, and approved inside the dashboard.",
      icon: Play,
      highlight: "Full Transparency",
    },
    {
      number: "05",
      title: "Instant Release",
      subtitle: "Payout Completed",
      desc: "Upon delivery verification, funds are released directly to the creator's verified account.",
      icon: Zap,
      highlight: "Immediate Payout",
    },
  ];

  const comparison = [
    {
      feature: "Payment Protection",
      traditional: "Chasing invoices for 60-90 days with risk of non-payment",
      pravixo: "Automated Razorpay Escrow releasing immediately upon deliverable signoff",
    },
    {
      feature: "Creator Verification",
      traditional: "Manual inflated screenshots and unverified follower counts",
      pravixo: "Direct API-authenticated live engagement, demographic & audience audit",
    },
    {
      feature: "Contracts & Deliverables",
      traditional: "Messy PDFs, forgotten WhatsApp chats, lost deliverable links",
      pravixo: "One-click digital agreements with integrated in-app file/reel submission",
    },
    {
      feature: "Campaign Turnaround",
      traditional: "Weeks of back-and-forth email negotiation and delayed kickoffs",
      pravixo: "Match, negotiate, fund, and launch collaborations in under 24 hours",
    },
  ];

  const values = [
    {
      title: "Radical Transparency",
      description:
        "No hidden platform deductions, no inflated follower vanity numbers. Every metric and transaction fee is clearly shown.",
      icon: Globe2,
      gradient: "from-orange-500/10 via-pink-500/5 to-transparent",
    },
    {
      title: "Creator-First Monetization",
      description:
        "Creators are businesses. We eliminate late payments and ghosting by securing full compensation in escrow upfront.",
      icon: Flame,
      gradient: "from-pink-500/10 via-purple-500/5 to-transparent",
    },
    {
      title: "Data-Driven ROI for Brands",
      description:
        "Brands deserve real conversion impact. We provide verified audience analytics so every marketing rupee delivers measurable growth.",
      icon: TrendingUp,
      gradient: "from-cyan-500/10 via-blue-500/5 to-transparent",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/20">
      {/* BACKGROUND AMBIENT GLOWS */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-[750px] rounded-full bg-gradient-to-tr from-primary/15 via-pink-500/10 to-amber-500/10 blur-[130px] opacity-70" />
        <div className="absolute top-1/3 -left-48 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] opacity-40" />
        <div className="absolute bottom-1/4 -right-48 h-96 w-96 rounded-full bg-primary/10 blur-[120px] opacity-40" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-20 sm:space-y-28">
        {/* ======================================================== */}
        {/* HERO SECTION */}
        {/* ======================================================== */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-xs backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-pink-500" />
            <span>The Modern Creator & Brand Ecosystem</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]"
          >
            Where Authentic Stories Turn Into{" "}
            <span className="text-gradient-sunset drop-shadow-sm">Measurable Impact</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Pravixo bridges top tier brands and verified creators with built-in escrow protection, live audience audits, and automated campaign workflows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            <Button
              asChild
              className="rounded-full px-7 h-12 gradient-sunset border-0 text-white font-semibold shadow-glow hover:opacity-95 transition-all text-sm hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Link to="/browse" className="flex items-center gap-2">
                Explore Verified Creators
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full px-7 h-12 border-border/80 bg-card/60 backdrop-blur-md hover:bg-card text-foreground font-semibold text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Link to="/register">Register Your Brand</Link>
            </Button>
          </motion.div>

          {/* Quick Trust Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="pt-4 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 100% Escrow Protected
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Razorpay Certified
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero Fake Followers
            </span>
          </motion.div>
        </div>

        {/* ======================================================== */}
        {/* STATS BENTO ROW */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="group relative rounded-3xl border border-border/70 bg-card/60 p-5 sm:p-6 backdrop-blur-xl shadow-sm hover:shadow-elevated transition-all duration-300 hover:border-primary/40 card-3d"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {stat.change}
                  </span>
                </div>
                <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                  {stat.value}
                </h3>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ======================================================== */}
        {/* OUR STORY, MISSION & VISION (BENTO GRID) */}
        {/* ======================================================== */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              The Foundation
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-foreground">
              Built to Fix What was Broken in Creator Marketing
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Story Card */}
            <div className="relative rounded-3xl border border-border/80 bg-gradient-to-b from-card/80 via-card/50 to-card/90 p-7 sm:p-9 backdrop-blur-xl space-y-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                Our Genesis
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Influencer marketing was built on guesswork, opaque pricing, delayed payments, and unverified screenshots. We founded Pravixo to bring enterprise-level fintech precision, instant escrow checkouts, and true data integrity to every creator and brand.
              </p>
            </div>

            {/* Mission Card */}
            <div className="relative rounded-3xl border border-border/80 bg-gradient-to-b from-card/80 via-card/50 to-card/90 p-7 sm:p-9 backdrop-blur-xl space-y-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                Our Mission
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To automate all the exhausting operational details—contracts, escrow guarantees, deliverable audits, and payouts—so creators can focus entirely on craft, and brands can scale high-ROI partnerships with complete peace of mind.
              </p>
            </div>

            {/* Vision Card */}
            <div className="relative rounded-3xl border border-border/80 bg-gradient-to-b from-card/80 via-card/50 to-card/90 p-7 sm:p-9 backdrop-blur-xl space-y-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-md">
                <Globe2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                Our Vision
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To build India and the world's most trusted collaboration network where nano, micro, and celebrity influencers connect seamlessly with global brands under guaranteed contracts and transparent real-world analytics.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* HOW PRAVIXO WORKS (5-STEP INTERACTIVE TIMELINE) */}
        {/* ======================================================== */}
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Layers className="h-3.5 w-3.5" />
              Seamless Lifecycle
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-foreground">
              How Collaborations Flow on Pravixo
            </h2>
            <p className="text-sm text-muted-foreground">
              A 5-step automated escrow pipeline built for speed, safety, and guaranteed quality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="group relative rounded-3xl border border-border/70 bg-card/60 p-6 backdrop-blur-md flex flex-col justify-between hover:border-primary/50 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-black text-primary/40 group-hover:text-primary transition-colors">
                        {step.number}
                      </span>
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-500">
                        {step.title}
                      </span>
                      <h4 className="font-display text-sm sm:text-base font-bold text-foreground mt-0.5">
                        {step.subtitle}
                      </h4>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-2 border-t border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-500" />
                      {step.highlight}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* WHY CHOOSE PRAVIXO: PILLARS & FEATURES GRID */}
        {/* ======================================================== */}
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Engineered for Excellence
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-foreground">
              Why Brands & Creators Choose Pravixo
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to execute high-performing influencer campaigns in one unified suite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative rounded-3xl border border-border/80 bg-card/60 p-7 backdrop-blur-xl hover:border-primary/40 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-foreground" />
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border bg-gradient-to-r ${feature.color}`}>
                        {feature.badge}
                      </span>
                    </div>

                    <h4 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Learn feature specs <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TRADITIONAL AGENCY VS PRAVIXO COMPARISON */}
        {/* ======================================================== */}
        <div className="rounded-3xl border border-border/80 bg-card/40 p-6 sm:p-10 backdrop-blur-xl space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
              The Pravixo Advantage
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              See why leading companies and high-earning creators are migrating from legacy agencies to Pravixo.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground w-1/4">
                    Key Dimension
                  </th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-rose-500 w-3/8">
                    Traditional Agency / Manual DM
                  </th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-emerald-500 w-3/8">
                    Pravixo Platform
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs sm:text-sm">
                {comparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 font-bold text-foreground">
                      {row.feature}
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{row.traditional}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-foreground font-medium bg-primary/5 rounded-xl">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{row.pravixo}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CORE VALUES */}
        {/* ======================================================== */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Award className="h-3.5 w-3.5" />
              Core Principles
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
              What Drives Our Team Daily
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-3xl border border-border/80 bg-gradient-to-b ${val.gradient} p-7 sm:p-8 backdrop-blur-xl space-y-3 shadow-sm hover:border-primary/40 transition-colors`}
                >
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-display text-lg font-bold text-foreground">
                    {val.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {val.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* HIGH-IMPACT CALL TO ACTION CARD */}
        {/* ======================================================== */}
        <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/80 to-accent/15 p-8 sm:p-14 text-center space-y-6 max-w-4xl mx-auto backdrop-blur-2xl shadow-2xl overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />

          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Start Today
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            Ready to Accelerate Your Collaborations?
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join thousands of verified creators and leading brands already unlocking faster campaigns and protected payouts on Pravixo.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              className="rounded-full px-8 h-12 gradient-sunset border-0 font-bold text-white shadow-glow text-sm hover:opacity-95 transition-all"
            >
              <Link to="/register" className="flex items-center gap-2">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full px-7 h-12 border-border bg-card/80 backdrop-blur hover:bg-card text-foreground font-semibold text-sm"
            >
              <Link to="/reviews">
                Watch Partner Reviews
              </Link>
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground font-medium pt-2">
            Instant activation • Escrow protected • Razorpay verified
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;