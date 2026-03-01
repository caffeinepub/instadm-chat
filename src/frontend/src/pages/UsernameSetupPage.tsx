import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AtSign, Loader2, MessageCircle } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export function UsernameSetupPage() {
  const { setupUsername, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isValidUsername = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername) return;
    setIsSaving(true);
    const result = await setupUsername(username, bio);
    setIsSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Welcome to Linkr!");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 page-fade overflow-auto">
      {/* Background decorative */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.56 0.22 255) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
            <MessageCircle size={28} className="text-white" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome to Linkr
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Choose a username to get started
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-2xl p-7 shadow-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">
                Username
              </Label>
              <div className="relative">
                <AtSign
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                  }
                  placeholder="your_username"
                  maxLength={20}
                  autoComplete="off"
                  autoFocus
                  className="pl-9 rounded-xl font-medium"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                3–20 characters. Letters, numbers, and underscores only.
              </p>
              {username && !isValidUsername && (
                <p className="text-xs text-destructive">
                  {username.length < 3
                    ? "Too short — at least 3 characters"
                    : "Invalid characters"}
                </p>
              )}
              {username && isValidUsername && (
                <p className="text-xs text-primary font-medium">
                  ✓ Looks good!
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-semibold">
                Bio{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people a bit about yourself..."
                rows={3}
                maxLength={160}
                className="rounded-xl resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/160
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold"
              disabled={!isValidUsername || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                "Continue to Linkr"
              )}
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={logout}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out and use a different identity
        </button>
      </div>
    </div>
  );
}
