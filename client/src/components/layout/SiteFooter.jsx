import { Link } from "react-router-dom";
import {
  FaInstagram,
  FaYoutube,
  FaFacebook,
  FaLinkedin,
} from "react-icons/fa";
import logoImg from "@/assets/log.png";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand Column */}
          <div className="max-w-xs shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src={logoImg}
                alt="Pravixo"
                className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105 dark:bg-white/90 dark:p-0.5 dark:rounded-md"
              />
              <span className="font-display text-xl font-bold tracking-tight text-foreground dark:text-white">
                Pravixo
              </span>
            </Link>

            <p className="mt-4 text-sm leading-6 text-muted-foreground font-medium">
              Connecting creators and brands for meaningful, authentic
              collaborations.
            </p>

            <div className="mt-6 flex items-center gap-2.5">
              <a
                href="#"
                aria-label="Instagram"
                className="rounded-full border border-border/80 bg-background/80 p-2.5 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:scale-110 shadow-xs"
              >
                <FaInstagram className="h-4 w-4" />
              </a>

              <a
                href="#"
                aria-label="YouTube"
                className="rounded-full border border-border/80 bg-background/80 p-2.5 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:scale-110 shadow-xs"
              >
                <FaYoutube className="h-4 w-4" />
              </a>

              <a
                href="#"
                aria-label="Facebook"
                className="rounded-full border border-border/80 bg-background/80 p-2.5 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:scale-110 shadow-xs"
              >
                <FaFacebook className="h-4 w-4" />
              </a>

              <a
                href="#"
                aria-label="LinkedIn"
                className="rounded-full border border-border/80 bg-background/80 p-2.5 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:scale-110 shadow-xs"
              >
                <FaLinkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Nav Links columns aligned across remaining width */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4 md:gap-8 lg:gap-12 text-left sm:justify-items-end">
            {/* Platform */}
            <div className="sm:justify-self-start">
              <h3 className="font-display text-sm font-bold tracking-wide uppercase text-foreground">
                Platform
              </h3>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/browse"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Browse Creators
                </Link>

                <Link
                  to="/browse?role=brand"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Featured Brands
                </Link>

                <Link
                  to="/addons"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Addons
                </Link>

                <Link
                  to="/referrals"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Referrals
                </Link>
              </div>
            </div>

            {/* Discover */}
            <div className="sm:justify-self-center">
              <h3 className="font-display text-sm font-bold tracking-wide uppercase text-foreground">
                Discover
              </h3>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/reviews"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Reviews
                </Link>

                <Link
                  to="/tips"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Creator Tips
                </Link>

                <Link
                  to="/blog"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Guides & Articles
                </Link>

                <Link
                  to="/collaborations"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Collaborations
                </Link>
              </div>
            </div>

            {/* Company */}
            <div className="sm:justify-self-center">
              <h3 className="font-display text-sm font-bold tracking-wide uppercase text-foreground">
                Company
              </h3>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/about"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  About
                </Link>

                <Link
                  to="/careers"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Careers
                </Link>

                <Link
                  to="/blog"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Blog
                </Link>

                <Link
                  to="/contact"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* Support */}
            <div className="sm:justify-self-end">
              <h3 className="font-display text-sm font-bold tracking-wide uppercase text-foreground">
                Support
              </h3>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/help"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Help Center
                </Link>

                <Link
                  to="/faq"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  FAQ
                </Link>

                <Link
                  to="/privacy"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Privacy Policy
                </Link>

                <Link
                  to="/terms"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Terms & Conditions
                </Link>

                <Link
                  to="/protection-info"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-1 duration-150 inline-block"
                >
                  Protection Info
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-border/80 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">
            © {new Date().getFullYear()} Pravixo. All rights reserved.
          </p>

          <div className="flex gap-6 font-medium">
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>

            <Link
              to="/privacy"
              className="hover:text-primary transition-colors"
            >
              Privacy
            </Link>

            <Link
              to="/contact"
              className="hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;