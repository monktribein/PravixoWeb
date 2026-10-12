import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling down 280px
      const currentScrollY = window.__lenis
        ? window.__lenis.scroll
        : window.scrollY || document.documentElement.scrollTop;

      if (currentScrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Also listen to Lenis scroll event if available
    if (window.__lenis) {
      window.__lenis.on("scroll", handleScroll);
    }

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (window.__lenis) {
        window.__lenis.off("scroll", handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: 1.15 });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center p-2 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 select-none group"
        >
          {/* Outer soft ring matching Pravixo icon glow & screenshot */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/25 via-pink-500/30 to-rose-500/25 dark:from-purple-500/35 dark:via-pink-500/40 dark:to-rose-500/35 backdrop-blur-sm border border-pink-500/25 shadow-[0_4px_20px_rgba(219,39,119,0.25)] group-hover:shadow-[0_6px_28px_rgba(219,39,119,0.45)] transition-all duration-300 pointer-events-none" />

          {/* Inner solid Pravixo icon gradient circle */}
          <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#7c3aed] via-[#db2777] to-[#f97316] text-white shadow-md group-hover:brightness-110 transition-all duration-300">
            <ArrowUp className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.75] transition-transform duration-300 group-hover:-translate-y-0.5" />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default ScrollToTopButton;
