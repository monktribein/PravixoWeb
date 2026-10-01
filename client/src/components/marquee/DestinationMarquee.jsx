import React from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export const SAMPLE_DESTINATIONS = [
  {
    id: "dest_1",
    name: "Mathura",
    subtitle: "Birthplace of Lord Krishna",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80",
    tags: ["Verified Stays", "Temples", "Parking"],
    link: "/browse?category=Travel&search=Mathura",
  },
  {
    id: "dest_2",
    name: "Vrindavan",
    subtitle: "Land of Divine Leelas",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1561361066-6147493a5a78?auto=format&fit=crop&w=600&q=80",
    tags: ["Dharamshalas", "Banke Bihari", "Safe Stays"],
    link: "/browse?category=Travel&search=Vrindavan",
  },
  {
    id: "dest_3",
    name: "Burja Road",
    subtitle: "Peaceful Ashram Retreats",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=600&q=80",
    tags: ["Secure Parking", "Ashrams"],
    link: "/browse?category=Travel&search=Burja",
  },
  {
    id: "dest_4",
    name: "Barsana",
    subtitle: "Shri Radha Rani Dham",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80",
    tags: ["Hill Temple", "Verified Guides"],
    link: "/browse?category=Travel&search=Barsana",
  },
  {
    id: "dest_5",
    name: "Govardhan",
    subtitle: "Sacred Parikrama Marg",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=600&q=80",
    tags: ["Parikrama Stays", "Dharamshala"],
    link: "/browse?category=Travel&search=Govardhan",
  },
  {
    id: "dest_6",
    name: "Gokul",
    subtitle: "Charming Childhood of Krishna",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80",
    tags: ["River Ghats", "Temple Tours"],
    link: "/browse?category=Travel&search=Gokul",
  },
  {
    id: "dest_7",
    name: "Ayodhya",
    subtitle: "Shri Ram Janmabhoomi",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    tags: ["Grand Temples", "VIP Dharamshala"],
    link: "/browse?category=Travel&search=Ayodhya",
  },
  {
    id: "dest_8",
    name: "Kashi (Varanasi)",
    subtitle: "Eternal City of Mahadev",
    state: "Uttar Pradesh",
    image: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80",
    tags: ["Ganga Aarti", "Heritage Stays"],
    link: "/browse?category=Travel&search=Varanasi",
  },
];

/**
 * DestinationMarquee Component
 * - Pure CSS smooth infinite marquee
 * - Seamless loop (tracks rendered twice: 0% -> -50%)
 * - Pause on hover
 * - Responsive with fade masks
 */
export function DestinationMarquee({
  items = SAMPLE_DESTINATIONS,
  speed = 55, // duration in seconds (default ~55s for calm, linear speed)
  className = "",
}) {
  return (
    <div
      className={`relative w-full overflow-hidden marquee-mask py-4 ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div
        className="flex w-max gap-6 marquee-track will-change-transform"
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {/* Render twice for seamless infinite loop */}
        {[...items, ...items].map((dest, idx) => (
          <div
            key={`${dest.id}-${idx}`}
            className="w-[220px] sm:w-[260px] flex-shrink-0 group select-none"
          >
            <Link
              to={dest.link || "/browse"}
              className="flex flex-col h-full overflow-hidden rounded-3xl border border-orange-200/80 bg-card shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-orange-400/80 cursor-pointer text-left"
            >
              {/* Image Area (~65% height) */}
              <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-muted">
                <img
                  src={dest.image}
                  alt={dest.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-medium">
                  <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                    <MapPin className="h-3 w-3 text-orange-400 shrink-0" />
                    <span className="truncate max-w-[130px]">{dest.state}</span>
                  </span>
                </div>
              </div>

              {/* Bottom Area (White, Centered Content) */}
              <div className="p-4 sm:p-5 flex flex-col items-center justify-center text-center bg-card flex-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-display group-hover:text-orange-500 transition-colors">
                  {dest.name}
                </h3>
                <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400 line-clamp-1">
                  {dest.subtitle || dest.state}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * DestinationSection: Section Layout above the carousel
 */
export function SpiritualDestinationsSection({
  items = SAMPLE_DESTINATIONS,
  speed = 55,
}) {
  return (
    <section className="relative w-full py-16 sm:py-24 bg-orange-50/50 dark:bg-background/80 overflow-hidden border-y border-orange-100/60 dark:border-border/40">
      {/* Background Soft Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4 mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20 uppercase tracking-wider">
          Sacred Pilgrimages & Spiritual Stays
        </div>

        <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
          Discover sacred holy destinations across India with verified stays, dharamshalas, secure parking, and divine temples.
        </h2>

        <div className="pt-3">
          <Link
            to="/browse?category=Travel"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-sm px-6 py-2.5 shadow-lg shadow-orange-500/25 transition-all duration-200 cursor-pointer"
          >
            <span>Explore All Destinations</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Infinite Auto-scrolling Marquee */}
      <DestinationMarquee items={items} speed={speed} />
    </section>
  );
}

export default SpiritualDestinationsSection;
