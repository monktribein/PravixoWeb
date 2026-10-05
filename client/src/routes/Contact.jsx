import { useState } from "react";
import {
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
} from "lucide-react";

import {
  FaLinkedin,
  FaInstagram,
  FaTwitter,
  FaFacebook,
} from "react-icons/fa";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";
import { toast } from "sonner";
import api from "@/lib/api";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const contacts = [
    {
      title: "Support Email",
      value: "support@pravixo.com",
      desc: "For general inquiries, account issues, and billing support.",
      icon: Mail,
    },
    {
      title: "Phone Support",
      value: "+91 (80) 4567-8901",
      desc: "Available Monday to Friday, 9:00 AM - 6:00 PM IST.",
      icon: Phone,
    },
    {
      title: "Headquarters",
      value:
        "Level 14, Pravixo Tower, MG Road, Bengaluru, Karnataka, 560001",
      desc: "Corporate office & registered documents here.",
      icon: MapPin,
    },
    {
      title: "Working Hours",
      value: "9:00 AM - 6:00 PM IST",
      desc: "Weekend response times may vary.",
      icon: Clock,
    },
  ];

  const socials = [
    {
      name: "LinkedIn",
      href: "https://linkedin.com",
      icon: FaLinkedin,
    },
    {
      name: "Instagram",
      href: "https://instagram.com",
      icon: FaInstagram,
    },
    {
      name: "Twitter / X",
      href: "https://twitter.com",
      icon: FaTwitter,
    },
    {
      name: "Facebook",
      href: "https://facebook.com",
      icon: FaFacebook,
    },
  ];

  const socialLinks = [
    {
      name: "LinkedIn",
      href: "https://linkedin.com",
      icon: FaLinkedin,
    },
    {
      name: "Instagram",
      href: "https://instagram.com",
      icon: FaInstagram,
    },
    {
      name: "Twitter",
      href: "https://twitter.com",
      icon: FaTwitter,
    },
    {
      name: "Facebook",
      href: "https://facebook.com",
      icon: FaFacebook,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.message
    ) {
      toast.error("Please fill in all form fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/contact", formData);
      toast.success(
        res.data?.message || "Message sent! Our customer support team will contact you shortly."
      );

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to send inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background py-12">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-10 h-80 w-80 rounded-full bg-primary/10 opacity-30 blur-3xl" />
        <div className="absolute bottom-10 right-1/3 h-72 w-72 rounded-full bg-accent/10 opacity-40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
        {/* HERO SECTION */}
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_-4px] shadow-primary/40 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-primary/60 hover:shadow-[0_0_28px_-2px] hover:shadow-primary/60">
            {/* Shine sweep effect on hover */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

            {/* Pulsing dot */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>

            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span className="relative">Contact Us</span>
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Get in Touch with{" "}
            <span className="text-gradient-sunset">Our Team</span>
          </h1>

          <p className="text-base leading-relaxed text-muted-foreground">
            Have questions about campaign verification, Razorpay payments,
            custom enterprise plans, or platform security? Reach out, and
            we'll reply shortly.
          </p>
        </div>

        {/* CONTACT CARDS GRID */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {contacts.map((contact, index) => {
            const Icon = contact.icon;

            return (
              <div
                key={index}
                className="flex flex-col justify-between space-y-3 rounded-2xl border border-border bg-card p-6"
              >
                <div className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h4 className="font-display text-sm font-bold text-foreground">
                    {contact.title}
                  </h4>

                  <span className="block break-all text-xs font-semibold text-primary">
                    {contact.value}
                  </span>

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {contact.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* FORM & MAP */}
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          {/* CONTACT FORM */}
          <div className="space-y-6 rounded-3xl border border-border bg-card p-8">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Send a Message
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Fill in the form below, and an agent will follow up.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* NAME + EMAIL */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Your Name *
                  </label>

                  <Input
                    required
                    placeholder="e.g. Kashish"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Email Address *
                  </label>

                  <Input
                    required
                    type="email"
                    placeholder="e.g. contact@pravixo.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* SUBJECT */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Subject *
                </label>

                <Input
                  required
                  placeholder="How can we help you?"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subject: e.target.value,
                    })
                  }
                />
              </div>

              {/* MESSAGE */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Message *
                </label>

                <Textarea
                  required
                  rows={5}
                  placeholder="Detail your inquiry, and include any transaction or campaign IDs if applicable..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      message: e.target.value,
                    })
                  }
                />
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                className="w-full rounded-full border-0 gradient-sunset text-white shadow-glow"
              >
                Send Inquiry
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-8">
            {/* LOCATION */}
            <div className="space-y-4 rounded-3xl border border-border bg-card/60 p-6">
              <h3 className="font-display text-lg font-bold text-foreground">
                Our Location
              </h3>

              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 p-4 text-center">
                <MapPin className="mb-2 h-8 w-8 animate-bounce text-primary" />

                <span className="block text-xs font-semibold text-foreground">
                  MG Road Corporate District
                </span>

                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  Bengaluru, Karnataka, 560001
                </span>

                <span className="mt-3 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
                  Google Map Integration Mock
                </span>
              </div>
            </div>

            {/* SOCIAL MEDIA */}
            <div className="space-y-4 rounded-3xl border border-border bg-card/60 p-6">
              <h3 className="font-display text-sm font-bold text-foreground">
                Connect On Social Media
              </h3>

              <div className="flex flex-wrap gap-4">
                {socials.map((social, index) => {
                  const Icon = social.icon;

                  return (
                    <a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {social.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;