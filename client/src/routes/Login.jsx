import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Camera, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, login } = useAuth();

  const [role, setRole] = useState("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Login — Pravixo";
  }, []);

  // Read role from URL query param if present (?role=brand or ?role=creator)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const selectedRole = params.get("role");
    if (selectedRole === "brand" || selectedRole === "creator") {
      setRole(selectedRole);
    }
  }, [location.search]);

  useEffect(() => {
    if (user || profile) {
      const userRole = profile?.role || user?.role;
      navigate(
        userRole === "creator"
          ? "/dashboard/creator"
          : "/dashboard/brand",
        { replace: true }
      );
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const data = await login(email, password);

      const actualRole =
        data?.profile?.role ||
        data?.user?.role ||
        data?.data?.profile?.role ||
        data?.data?.user?.role ||
        role;

      toast.success(
        actualRole === "creator"
          ? "Welcome back, Creator!"
          : "Welcome back, Brand partner!"
      );

      navigate(
        actualRole === "creator"
          ? "/dashboard/creator"
          : "/dashboard/brand",
        { replace: true }
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-[calc(100vh-64px)] place-items-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-1/4 h-80 w-80 rounded-full gradient-warm opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full gradient-pink opacity-20 blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl gradient-sunset shadow-glow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>

          <h1 className="font-display text-2xl font-bold">
            Welcome back
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Sign in as <span className="font-semibold text-foreground capitalize">{role}</span> to access your dashboard.
          </p>
        </div>

        {/* ROLE SELECTOR TABS */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {/* CREATOR */}
          <button
            type="button"
            onClick={() => setRole("creator")}
            className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
              role === "creator"
                ? "border-primary bg-accent/40 shadow-sm ring-1 ring-primary/60"
                : "border-border hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  role === "creator"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <div
                  className={`text-sm font-semibold leading-tight ${
                    role === "creator" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Creator
                </div>
                <div className="text-[11px] text-muted-foreground">Influencer</div>
              </div>
            </div>
          </button>

          {/* BRAND */}
          <button
            type="button"
            onClick={() => setRole("brand")}
            className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
              role === "brand"
                ? "border-primary bg-accent/40 shadow-sm ring-1 ring-primary/60"
                : "border-border hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  role === "brand"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <div
                  className={`text-sm font-semibold leading-tight ${
                    role === "brand" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Brand
                </div>
                <div className="text-[11px] text-muted-foreground">Client / Agency</div>
              </div>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">
              {role === "brand" ? "Brand or Business Email" : "Creator Email"}
            </Label>

            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === "brand" ? "brand@company.com" : "creator@email.com"
                }
                className="pl-10"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>

              <Link
                to="/reset-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full gradient-sunset border-0 text-white shadow-glow"
          >
            {loading
              ? "Signing in..."
              : `Sign in as ${role === "creator" ? "Creator" : "Brand"}`}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to={`/register?role=${role}`}
            className="font-medium text-primary hover:underline"
          >
            Create {role === "creator" ? "Creator" : "Brand"} account
          </Link>
        </p>
      </div>
    </div>
  );
}