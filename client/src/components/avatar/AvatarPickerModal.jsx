import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Check, Sparkles, User, Building2 } from "lucide-react";
import { AVATAR_PRESETS } from "@/utils/avatar";

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatar,
  role = "creator",
  onSelectAvatar,
}) {
  const [selectedUrl, setSelectedUrl] = useState(currentAvatar || "");
  const [activeTab, setActiveTab] = useState(role === "brand" ? "categories" : "boys");

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentAvatar || "");
    }
  }, [isOpen, currentAvatar]);

  const handleApply = () => {
    if (selectedUrl) {
      onSelectAvatar(selectedUrl);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border/70 rounded-3xl p-6 shadow-elevated">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-outfit">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Choose Your Avatar
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select from high quality creator personas, categories, or stylized faces.
          </DialogDescription>
        </DialogHeader>

        {role === "creator" ? (
          <div className="mt-4 w-full">
            <div className="grid grid-cols-3 bg-secondary/50 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("boys")}
                className={`rounded-xl text-xs font-semibold py-2 transition-all cursor-pointer ${
                  activeTab === "boys" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Men & Boys
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("girls")}
                className={`rounded-xl text-xs font-semibold py-2 transition-all cursor-pointer ${
                  activeTab === "girls" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Women & Girls
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("aged")}
                className={`rounded-xl text-xs font-semibold py-2 transition-all cursor-pointer ${
                  activeTab === "aged" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Senior & Mature
              </button>
            </div>

            {activeTab === "boys" && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                {AVATAR_PRESETS.creators.boys.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUrl(item.url)}
                    className={`relative flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedUrl === item.url
                        ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
                        : "border-border/60 bg-background/50 hover:bg-secondary/50 hover:border-border"
                    }`}
                  >
                    <div className="h-16 w-16 rounded-full overflow-hidden border border-border/80 bg-muted/30">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(item.name)}`;
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-center truncate w-full">
                      {item.name}
                    </span>
                    {selectedUrl === item.url && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "girls" && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                {AVATAR_PRESETS.creators.girls.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUrl(item.url)}
                    className={`relative flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedUrl === item.url
                        ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
                        : "border-border/60 bg-background/50 hover:bg-secondary/50 hover:border-border"
                    }`}
                  >
                    <div className="h-16 w-16 rounded-full overflow-hidden border border-border/80 bg-muted/30">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(item.name)}`;
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-center truncate w-full">
                      {item.name}
                    </span>
                    {selectedUrl === item.url && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "aged" && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVATAR_PRESETS.creators.aged.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUrl(item.url)}
                    className={`relative flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedUrl === item.url
                        ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
                        : "border-border/60 bg-background/50 hover:bg-secondary/50 hover:border-border"
                    }`}
                  >
                    <div className="h-16 w-16 rounded-full overflow-hidden border border-border/80 bg-muted/30">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(item.name)}`;
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-center truncate w-full">
                      {item.name}
                    </span>
                    {selectedUrl === item.url && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* BRAND TABS */
          <div className="mt-4 w-full">
            <div className="grid grid-cols-2 bg-secondary/50 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className={`rounded-xl text-xs font-semibold py-2 transition-all cursor-pointer ${
                  activeTab === "categories" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Industry & Products
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("brand_faces")}
                className={`rounded-xl text-xs font-semibold py-2 transition-all cursor-pointer ${
                  activeTab === "brand_faces" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Executive & Corporate
              </button>
            </div>

            {activeTab === "categories" && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVATAR_PRESETS.brands.categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUrl(item.url)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedUrl === item.url
                        ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
                        : "border-border/60 bg-background/50 hover:bg-secondary/50 hover:border-border"
                    }`}
                  >
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-border/80 bg-muted/30 shadow-inner">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(item.name)}`;
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-center truncate">
                        {item.name}
                      </span>
                    </div>
                    {selectedUrl === item.url && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "brand_faces" && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVATAR_PRESETS.brands.faces.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUrl(item.url)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedUrl === item.url
                        ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
                        : "border-border/60 bg-background/50 hover:bg-secondary/50 hover:border-border"
                    }`}
                  >
                    <div className="h-16 w-16 rounded-full overflow-hidden border border-border/80 bg-muted/30">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(item.name)}`;
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-center truncate w-full">
                      {item.name}
                    </span>
                    {selectedUrl === item.url && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Selected:</span>
            {selectedUrl ? (
              <div className="h-8 w-8 rounded-full overflow-hidden border border-primary">
                <img
                  src={selectedUrl}
                  alt="Selected"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/9.x/micah/svg?seed=selected`;
                  }}
                />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">None</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-full text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={!selectedUrl}
              className="rounded-full text-xs gradient-sunset text-white border-0 font-semibold"
            >
              Use Selected Avatar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
