import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";

import api from "@/lib/api";

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("processing");
  const [errorMsg, setErrorMsg] = useState("");

  const executionStarted = useRef(false);

  useEffect(() => {
    document.title = "Verifying social account — Pravixo";

    const processOAuth = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      /*
        Expected state format:

        platform:profileId:ownerType

        Example:

        instagram:665abc123:creator
        twitter:665abc123:brand
      */

      if (!code || !state) {
        setStatus("error");
        setErrorMsg(
          "Missing OAuth authorization code or state parameters."
        );
        return;
      }

      const parts = state.split(":");

      if (parts.length !== 3) {
        setStatus("error");
        setErrorMsg(
          "Invalid OAuth state validation string format."
        );
        return;
      }

      const [platform, profileId, ownerType] = parts;

      if (!platform || !profileId || !ownerType) {
        setStatus("error");
        setErrorMsg("Invalid OAuth callback information.");
        return;
      }

      try {
        const redirectUri =
          `${window.location.origin}${window.location.pathname}`;

        /*
          Twitter PKCE support
        */
        const codeVerifier =
          sessionStorage.getItem("twitter_code_verifier") ||
          undefined;

        const response = await api.post(
          "/api/social/oauth/exchange",
          {
            code,
            platform,
            profileId,
            ownerType,
            redirectUri,
            codeVerifier,
          }
        );

        if (!response?.data?.success) {
          throw new Error(
            response?.data?.message ||
              "OAuth authorization failed."
          );
        }

        setStatus("success");

        sessionStorage.removeItem(
          "twitter_code_verifier"
        );

        toast.success(
          `${platform.toUpperCase()} account successfully linked and verified!`
        );

        setTimeout(() => {
          navigate(
            ownerType === "creator"
              ? "/dashboard/influencer"
              : "/dashboard/customer",
            {
              replace: true,
            }
          );
        }, 1500);
      } catch (error) {
        console.error(
          "OAuth callback error:",
          error
        );

        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "OAuth credentials exchange failed.";

        setStatus("error");
        setErrorMsg(message);

        toast.error(message);
      }
    };

    if (!executionStarted.current) {
      executionStarted.current = true;
      processOAuth();
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">

        {/* PROCESSING */}
        {status === "processing" && (
          <div className="space-y-6">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-secondary">
              <div className="absolute inset-0 m-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Verifying Account
              </h1>

              <p className="text-sm text-muted-foreground">
                Please wait while we securely connect
                your social account...
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {status === "success" && (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Connection Verified!
              </h1>

              <p className="text-sm text-muted-foreground">
                Your social account has been successfully
                connected. Redirecting you to your dashboard...
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {status === "error" && (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Verification Failed
              </h1>

              <p className="rounded-xl bg-secondary p-3.5 text-left font-mono text-xs text-destructive">
                {errorMsg}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard/influencer",
                  {
                    replace: true,
                  }
                )
              }
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/95"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OAuthCallback;