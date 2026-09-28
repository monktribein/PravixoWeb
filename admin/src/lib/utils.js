import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function resolveImageUrl(url, fallbackName = "User", gender = "", role = "creator") {
  const seed = encodeURIComponent((fallbackName || "User").trim());
  const cleanGender = (gender || "").toLowerCase().trim();

  // Helper to build gender-specific avatar
  const getFallbackAvatar = () => {
    if (role === "brand") {
      return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}`;
    }
    if (cleanGender === "female") {
      return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=bigHair,bob,bun,curly,curvy,longButNotTooLong,miaWallace,straight01,straight02,straightAndStrand&accessoriesProbability=15&facialHairProbability=0`;
    }
    // Default male / male tops
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=shortFlat,shortRound,shortCurly,shortWaved,theCaesar,theCaesarAndSidePart,sides&accessoriesProbability=0&facialHairProbability=20`;
  };

  if (!url || url === "undefined" || url === "null" || typeof url !== "string") {
    return getFallbackAvatar();
  }

  // If it's a generic DiceBear avataaars link without top styling, override with gender-specific styles
  if (url.includes("api.dicebear.com/9.x/avataaars") && !url.includes("top=")) {
    return getFallbackAvatar();
  }

  if (url.startsWith("http")) return url;
  let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
  return `${apiUrl}${url}`;
}

export function resolveFrontendUrl(path = "") {
  // If explicitly configured, use it
  if (import.meta.env.VITE_FRONTEND_URL) {
    const base = import.meta.env.VITE_FRONTEND_URL.replace(/\/$/, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  // If running locally in browser, default to port 5173 (standard Vite client port)
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return `http://localhost:5173${path.startsWith("/") ? path : `/${path}`}`;
  }

  // Fallback to production url
  return `https://www.pravixo.com${path.startsWith("/") ? path : `/${path}`}`;
}

