import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Briefcase,
  Camera,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import api from "@/lib/api";

import { useAuth } from "@/components/auth/AuthProvider";
import { authApi } from "@/services/authServices";
import { getGenderAvatar } from "@/utils/avatar";
import { AvatarPickerModal } from "@/components/avatar/AvatarPickerModal";

// =====================================================
// TERMS
// =====================================================

const roleTerms = {
  creator: [
    "The Platform acts solely as an intermediary connecting Creators and Brands.",
    "All information submitted during registration must be true, accurate, and complete.",
    "Creators must communicate professionally and fulfill agreed campaign deliverables.",
    "Creators must not artificially inflate followers, likes, views, reach, or engagement.",
    "Creators must not bypass the Platform to avoid Platform processes or fees.",
    "Uploaded content must be original or properly licensed.",
    "Creators must not engage in fraud, harassment, impersonation, or illegal activities.",
    "The Platform does not guarantee sponsorships, campaigns, earnings, or future opportunities.",
    "The Platform may suspend or terminate accounts for violations.",
    "Terms are governed by the laws of India and applicable courts in Noida, Uttar Pradesh.",
    "By registering, the Creator confirms acceptance of these Terms and Conditions.",
  ],

  brand: [
    "The Platform acts solely as an intermediary connecting Brands and Creators.",
    "All submitted Brand information must be true, accurate, and complete.",
    "Brands are responsible for campaign details, timelines, deliverables, compensation, and expectations.",
    "Campaign payments must follow the Platform's payment requirements.",
    "Brands must not bypass the Platform to avoid Platform processes or fees.",
    "Brands must cooperate with agreed collaboration requirements.",
    "Uploaded logos, images, videos, and materials must be properly owned or licensed.",
    "Brands must not engage in fraud, harassment, fake campaigns, or illegal activities.",
    "The Platform does not guarantee campaign performance, sales, leads, reach, or ROI.",
    "The Platform may suspend or terminate accounts for violations.",
    "Terms are governed by the laws of India and applicable courts in Noida, Uttar Pradesh.",
    "By registering, the Brand confirms acceptance of these Terms and Conditions.",
  ],
};

// =====================================================
// REGISTER
// =====================================================

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    profile,
    register:registerUser,
  } = useAuth();

  // =====================================================
  // FORM STATE
  // =====================================================

  const [role, setRole] = useState("creator");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [touched, setTouched] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  // =====================================================
  // OTP STATE
  // =====================================================

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const [resendCooldown, setResendCooldown] =
    useState(0);

  const [verifying, setVerifying] =
    useState(false);

  // =====================================================
  // PAGE TITLE
  // =====================================================

  useEffect(() => {
    document.title = "Create account — Pravixo";
  }, []);

  // =====================================================
  // READ ROLE FROM URL
  // =====================================================

  useEffect(() => {
    const params = new URLSearchParams(
      location.search
    );

    const selectedRole = params.get("role");

    if (
      selectedRole === "brand" ||
      selectedRole === "creator"
    ) {
      setRole(selectedRole);
    }
  }, [location.search]);

  // =====================================================
  // REFERRAL CODE STATE & URL DETECTION
  // =====================================================

  const [referralCode, setReferralCode] = useState(() => {
    return localStorage.getItem("previxo_ref_code") || "";
  });
  const [referralInfo, setReferralInfo] = useState(null);
  const [validatingRef, setValidatingRef] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get("ref") || params.get("referral") || params.get("referralCode");
    if (codeFromUrl) {
      const upper = codeFromUrl.trim().toUpperCase();
      setReferralCode(upper);
      localStorage.setItem("previxo_ref_code", upper);
      validateCode(upper);
    } else {
      const stored = localStorage.getItem("previxo_ref_code");
      if (stored) {
        validateCode(stored);
      }
    }
  }, [location.search]);

  const validateCode = async (code) => {
    if (!code) return;
    try {
      setValidatingRef(true);
      const res = await api.post("/referrals/validate", { code });
      if (res.data?.success && res.data?.data) {
        setReferralInfo(res.data.data);
      }
    } catch {
      setReferralInfo(null);
    } finally {
      setValidatingRef(false);
    }
  };

  // =====================================================
  // REDIRECT IF ALREADY LOGGED IN
  // =====================================================

  useEffect(() => {
    if (!user) return;

    if (profile?.role === "creator") {
      navigate("/dashboard/influencer", {
        replace: true,
      });
      return;
    }

    if (profile?.role === "brand") {
      navigate("/dashboard/customer", {
        replace: true,
      });
    }
  }, [user, profile, navigate]);

  // =====================================================
  // OTP RESEND TIMER
  // =====================================================

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendCooldown(
        (previous) => previous - 1
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // =====================================================
  // VALIDATION
  // =====================================================

  const valid =
    name.trim().length > 1 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    password.length >= 6 &&
    password === confirmPassword &&
    acceptedTerms;

  // =====================================================
  // SEND OTP
  // =====================================================

  const handleRequestOtp = async (e) => {
    e.preventDefault();

    setTouched(true);

    if (!valid) {
      toast.error(
        "Please fill all fields correctly and accept the terms."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await authApi.sendOtp(
          email.trim().toLowerCase()
        );

      if (response?.success === false) {
        throw new Error(
          response?.message ||
            "Failed to send OTP."
        );
      }

      toast.success(
        `Verification code sent to ${email}`
      );

      setShowOtp(true);
      setOtp("");
      setResendCooldown(30);
    } catch (error) {
      console.error(
        "Send OTP error:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to send verification code."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // RESEND OTP
  // =====================================================

  const handleResendOtp = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await authApi.sendOtp(
          email.trim().toLowerCase()
        );

      if (response?.success === false) {
        throw new Error(
          response?.message ||
            "Failed to resend OTP."
        );
      }

      toast.success(
        `A new verification code has been sent to ${email}`
      );

      setOtp("");
      setResendCooldown(30);
    } catch (error) {
      console.error(
        "Resend OTP error:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to resend verification code."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // VERIFY OTP + REGISTER
  // =====================================================

  const verifyAndRegister = async (code) => {
    if (verifying) {
      return;
    }

    setVerifying(true);

    try {
      // =====================================
      // STEP 1: VERIFY OTP
      // =====================================

      const verifyResponse =
        await authApi.verifyOtp(
          email.trim().toLowerCase(),
          code
        );

      if (!verifyResponse?.success) {
        throw new Error(
          verifyResponse?.message ||
            "Invalid verification code."
        );
      }

      toast.success(
        "Email verified successfully!"
      );

      // =====================================
      // STEP 2: REGISTER
      // =====================================

  const registerResponse = await registerUser({
    role,
    email,
    name,
    gender: role === "creator" ? gender : undefined,
    avatarUrl: selectedAvatar || undefined,
    password,
    otp: code,
    referralCode: role === "creator" ? referralCode : undefined,
  });

  localStorage.removeItem("previxo_ref_code");

      if (!registerResponse?.success) {
        throw new Error(
          registerResponse?.message ||
            "Registration failed."
        );
      }

      toast.success(
        "Account created successfully!"
      );

      // =====================================
      // DASHBOARD REDIRECT
      // =====================================

      if (role === "creator") {
        navigate(
          "/dashboard/influencer",
          {
            replace: true,
          }
        );
      } else {
        navigate(
          "/dashboard/customer",
          {
            replace: true,
          }
        );
      }
    } catch (error) {
      console.error(
        "Verify/Register error:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Verification failed. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  // =====================================================
  // OTP INPUT
  // =====================================================

  const handleOtpChange = (value) => {
    const cleanValue = value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(cleanValue);
  };

  // =====================================================
  // OTP SCREEN
  // =====================================================

  if (showOtp) {
    return (
      <div className="relative grid min-h-[calc(100vh-64px)] place-items-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated">

          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl gradient-sunset shadow-glow">
              <Mail className="h-6 w-6 text-white" />
            </div>

            <h1 className="font-display text-2xl font-bold">
              Verify your email
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              We sent a 6-digit verification
              code to{" "}
              <span className="font-semibold text-foreground">
                {email}
              </span>
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();

              if (otp.length !== 6) {
                toast.error(
                  "Please enter the 6-digit code."
                );
                return;
              }

              verifyAndRegister(otp);
            }}
            className="mt-8 space-y-6"
          >
            <div>
              <Label htmlFor="otp">
                Verification Code
              </Label>

              <Input
                id="otp"
                value={otp}
                onChange={(e) =>
                  handleOtpChange(
                    e.target.value
                  )
                }
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                maxLength={6}
                className="mt-2 text-center text-xl tracking-[0.5em]"
                disabled={verifying}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={
                verifying ||
                otp.length !== 6
              }
              className="w-full rounded-full gradient-sunset border-0 text-white shadow-glow"
            >
              {verifying
                ? "Creating account..."
                : "Verify & Register"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-full"
              disabled={verifying}
              onClick={() => {
                setShowOtp(false);
                setOtp("");
              }}
            >
              Back to registration
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}

            {resendCooldown > 0 ? (
              <span>
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={submitting}
                className="font-medium text-primary hover:underline"
              >
                Resend Code
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // REGISTRATION SCREEN
  // =====================================================

  return (
    <div className="relative grid min-h-[calc(100vh-64px)] place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated">

        {/* HEADER */}

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl gradient-sunset shadow-glow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>

          <h1 className="font-display text-2xl font-bold">
            Create your account
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Pick your path — you can always switch later.
          </p>
        </div>

        {/* ROLE SELECTOR */}

        <div className="mt-6 grid grid-cols-2 gap-3">

          {/* CREATOR */}

          <button
            type="button"
            onClick={() => {
              setRole("creator");
              setAcceptedTerms(false);
            }}
            className={`rounded-2xl border p-4 text-left ${
              role === "creator"
                ? "border-primary bg-accent/40"
                : "border-border"
            }`}
          >
            <Camera className="h-5 w-5" />

            <div className="mt-2 text-sm font-semibold">
              I'm a creator
            </div>

            <div className="text-xs text-muted-foreground">
              Build profile, get hired
            </div>
          </button>

          {/* BRAND */}

          <button
            type="button"
            onClick={() => {
              setRole("brand");
              setAcceptedTerms(false);
            }}
            className={`rounded-2xl border p-4 text-left ${
              role === "brand"
                ? "border-primary bg-accent/40"
                : "border-border"
            }`}
          >
            <Briefcase className="h-5 w-5" />

            <div className="mt-2 text-sm font-semibold">
              I'm a brand
            </div>

            <div className="text-xs text-muted-foreground">
              Discover & hire creators
            </div>
          </button>
        </div>

        {/* REGISTRATION FORM */}

        <form
          onSubmit={handleRequestOtp}
          className="mt-6 space-y-4"
        >

          {/* NAME */}

          <div>
            <Label htmlFor="name">
              {role === "brand"
                ? "Brand name"
                : "Full name"}
            </Label>

            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder={
                  role === "brand"
                    ? "Adidas"
                    : "Your full name"
                }
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* GENDER SELECTION (for creators) */}
          {role === "creator" && (
            <div>
              <Label>Gender</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setGender(item.value);
                      setSelectedAvatar("");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      gender === item.value
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                        : "border-border bg-card/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CHOOSE AVATAR PRESET / PERSONA */}
          <div className="rounded-2xl border border-border/70 bg-card/40 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-border bg-muted overflow-hidden shrink-0">
                <img
                  src={selectedAvatar || getGenderAvatar(name || "User", gender, role)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {role === "brand" ? "Brand Identity / Avatar" : "Profile Avatar"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedAvatar ? "Custom avatar selected" : "Auto-generated default"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAvatarModalOpen(true)}
              className="rounded-full text-xs h-8 px-3 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Choose
            </Button>
          </div>

          {/* EMAIL */}

          <div>
            <Label htmlFor="register-email">
              Email
            </Label>

            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}

          <div>
            <Label htmlFor="register-password">
              Password
            </Label>

            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="register-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="At least 6 characters"
                className="pl-10 pr-10"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}

          <div>
            <Label htmlFor="confirm-password">
              Confirm Password
            </Label>

            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Repeat your password"
                className="pl-10 pr-10"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (prev) => !prev
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* REFERRAL CODE (Optional for creators) */}
          {role === "creator" && (
            <div>
              <Label htmlFor="referral-code" className="flex items-center justify-between">
                <span>Referral Code <span className="text-xs text-muted-foreground font-normal">(Optional)</span></span>
                {referralInfo && (
                  <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    ✓ Referred by {referralInfo.referrerName}
                  </span>
                )}
              </Label>

              <div className="relative mt-1.5">
                <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="referral-code"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setReferralCode(val);
                    if (val.length >= 4) {
                      validateCode(val);
                    } else {
                      setReferralInfo(null);
                    }
                  }}
                  placeholder="e.g. PVX89K2L"
                  className="pl-10 uppercase tracking-wider"
                  maxLength={12}
                />
              </div>

              {referralInfo && (
                <div className="mt-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    Referral code applied! You and your referrer qualify for rewards upon profile verification.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TERMS */}

          <div className="rounded-2xl border border-border bg-accent/20 p-4">

            <p className="text-sm font-semibold">
              {role === "creator"
                ? "Creator"
                : "Brand"}{" "}
              terms and conditions
            </p>

            <ul className="mt-2 max-h-44 list-disc space-y-1 overflow-y-auto pl-4 text-xs text-muted-foreground">
              {roleTerms[role].map(
                (term, index) => (
                  <li key={index}>
                    {term}
                  </li>
                )
              )}
            </ul>

            <div className="mt-3 flex items-start gap-2">
              <Checkbox
                id="register-terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) =>
                  setAcceptedTerms(
                    checked === true
                  )
                }
              />

              <Label
                htmlFor="register-terms"
                className="cursor-pointer text-xs leading-5"
              >
                I agree to the{" "}
                {role === "creator"
                  ? "Creator"
                  : "Brand"}{" "}
                terms and conditions.
              </Label>
            </div>
          </div>

          {/* VALIDATION ERROR */}

          {touched && !valid && (
            <p className="text-xs text-destructive">
              Please fill all fields correctly
              and accept the terms.
            </p>
          )}

          {/* SEND OTP */}

          <Button
            type="submit"
            disabled={
              submitting ||
              !acceptedTerms
            }
            className="w-full rounded-full gradient-sunset border-0 text-white shadow-glow"
          >
            {submitting
              ? "Sending code..."
              : "Create account"}
          </Button>
        </form>

        {/* LOGIN LINK */}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}

          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* AVATAR PICKER MODAL */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        role={role}
        currentAvatar={selectedAvatar || getGenderAvatar(name || "User", gender, role)}
        onSelectAvatar={(avatarUrl) => setSelectedAvatar(avatarUrl)}
      />
    </div>
  );
}