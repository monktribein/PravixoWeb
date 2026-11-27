import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Lock, Eye, EyeOff, CheckCircle, Mail, Key } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { authApi } from "@/services/authServices";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(!tokenParam);

  useEffect(() => {
    document.title = "Reset password — Pravixo";
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
    if (tokenParam) setIsForgotPasswordMode(false);
  }, [emailParam, tokenParam]);

  // =====================================================
  // FORGOT PASSWORD REQUEST (SEND RESET LINK)
  // =====================================================
  const handleRequestLink = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your account email address.");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      toast.success("Password reset link sent to your email!");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to send reset link. Please check the email address."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CONSUME RESET TOKEN & UPDATE PASSWORD
  // =====================================================
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Reset token is missing. Please check your reset link.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Invalid or expired reset token. Please request a new link."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-bold">Password Reset!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password has been successfully updated. Redirecting you to login...
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="mt-6 w-full rounded-full gradient-sunset border-0 text-white shadow-glow"
          >
            Continue to Sign In
          </Button>
        </div>
      </div>
    );
  }

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
            {isForgotPasswordMode ? "Forgot Password" : "Reset Password"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {isForgotPasswordMode
              ? "Enter your email to receive a password reset link."
              : "Enter your new password below."}
          </p>
        </div>

        {isForgotPasswordMode ? (
          <form onSubmit={handleRequestLink} className="mt-6 space-y-5">
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full gradient-sunset border-0 text-white shadow-glow"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-5">
            <div>
              <Label htmlFor="token">Reset Token</Label>
              <div className="relative mt-1.5">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter reset token from email"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full gradient-sunset border-0 text-white shadow-glow"
            >
              {loading ? "Resetting password..." : "Set New Password"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}