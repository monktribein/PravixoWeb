// Avatar Collections and Helper Functions

export const AVATAR_PRESETS = {
  creators: {
    boys: [
      { id: "boy_1", name: "Alex (Smiling)", url: "/avatars/9434619.jpg" },
      { id: "boy_2", name: "Ryan (Cheerful)", url: "/avatars/9434937.jpg" },
      { id: "boy_3", name: "Leo (Cool)", url: "/avatars/9439727.jpg" },
      { id: "boy_4", name: "David (Friendly)", url: "/avatars/9439775.jpg" },
      { id: "boy_5", name: "Sam (Casual)", url: "/avatars/9442242.jpg" },
      { id: "boy_6", name: "Kabir (Modern)", url: "/avatars/10491829.jpg" },
    ],
    girls: [
      { id: "girl_1", name: "Emma (Joyful)", url: "/avatars/10491845.jpg" },
      { id: "girl_2", name: "Sophia (Sweet)", url: "/avatars/11475204.jpg" },
      { id: "girl_3", name: "Aanya (Vibrant)", url: "/avatars/11475205.jpg" },
      { id: "girl_4", name: "Mia (Delight)", url: "/avatars/11475215.jpg" },
      { id: "girl_5", name: "Chloe (Sunny)", url: "/avatars/11475221.jpg" },
      { id: "girl_6", name: "Zoya (Radiant)", url: "/avatars/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg" },
    ],
    aged: [
      { id: "aged_1", name: "Arthur (Senior Pro)", url: "/avatars/e67eb556-f125-4e24-95ad-8aff21b9926a.jpg" },
      { id: "aged_2", name: "Martha (Experienced)", url: "/avatars/9439775.jpg" },
      { id: "aged_3", name: "Sharma Ji (Veteran)", url: "/avatars/10491829.jpg" },
      { id: "aged_4", name: "Kalyani (Mentor)", url: "/avatars/11475204.jpg" },
    ]
  },
  brands: {
    faces: [
      { id: "bf_1", name: "Corporate Exec", url: "/avatars/9434619.jpg" },
      { id: "bf_2", name: "Creative Lead", url: "/avatars/10491845.jpg" },
      { id: "bf_3", name: "Brand Rep", url: "/avatars/9439727.jpg" },
      { id: "bf_4", name: "Official Emblem", url: "/avatars/e67eb556-f125-4e24-95ad-8aff21b9926a.jpg" },
    ],
    categories: [
      { id: "cat_shoes", name: "Shoes & Footwear", icon: "👟", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&h=300&q=80" },
      { id: "cat_fashion", name: "Fashion & Apparel", icon: "👗", url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&h=300&q=80" },
      { id: "cat_tech", name: "Tech & Gadgets", icon: "💻", url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=300&h=300&q=80" },
      { id: "cat_beauty", name: "Beauty & Cosmetics", icon: "💄", url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=300&h=300&q=80" },
      { id: "cat_food", name: "Food & Beverages", icon: "🍔", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&h=300&q=80" },
      { id: "cat_fitness", name: "Fitness & Gym", icon: "🏋️", url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=300&h=300&q=80" },
      { id: "cat_gaming", name: "Gaming & Esports", icon: "🎮", url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=300&h=300&q=80" },
      { id: "cat_travel", name: "Travel & Lifestyle", icon: "✈️", url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=300&h=300&q=80" },
    ]
  }
};

// Helper to resolve avatar and media URLs correctly across public/uploaded assets
export function resolveAvatarUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  // Public assets served by Vite frontend
  if (url.startsWith("/avatars/") || url.startsWith("/icons/") || url.startsWith("/assets/") || url.startsWith("/favicon")) {
    return url;
  }
  let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  if (apiUrl.endsWith("/api")) apiUrl = apiUrl.slice(0, -4);
  if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${apiUrl}${cleanPath}`;
}

// Helper to generate deterministic, gender-appropriate DiceBear avatars
export function getGenderAvatar(name = "User", gender = "", role = "creator") {
  const seed = encodeURIComponent((name || "User").trim());
  const cleanGender = (gender || "").toLowerCase().trim();

  if (role === "brand") {
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}`;
  }

  if (cleanGender === "female") {
    return `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`;
  }

  return `https://api.dicebear.com/9.x/micah/svg?seed=${seed}`;
}

export const DEFAULT_BANNERS = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=85",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1800&q=85",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1800&q=85",
];

export const DEFAULT_BANNER_IMAGES = DEFAULT_BANNERS;
export const DEFAULT_BANNER = DEFAULT_BANNERS[0];
