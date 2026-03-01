import { Loader2, Lock, MessageCircle, Sparkles } from "lucide-react";
import type React from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function LoginPage() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const isDisabled = isLoggingIn || isInitializing;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Large pink orb top-right */}
        <div
          className="float-orb absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full"
          style={
            {
              "--duration": "10s",
              background:
                "radial-gradient(circle at 40% 40%, oklch(0.62 0.27 345 / 0.35) 0%, oklch(0.58 0.25 330 / 0.15) 50%, transparent 70%)",
            } as React.CSSProperties
          }
        />
        {/* Violet orb left */}
        <div
          className="float-orb-reverse absolute top-[30%] left-[-15%] w-[500px] h-[500px] rounded-full"
          style={
            {
              "--duration": "13s",
              background:
                "radial-gradient(circle at 60% 40%, oklch(0.58 0.25 290 / 0.28) 0%, oklch(0.55 0.22 305 / 0.12) 50%, transparent 70%)",
            } as React.CSSProperties
          }
        />
        {/* Pink-violet orb bottom-right */}
        <div
          className="float-orb-slow absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full"
          style={
            {
              "--duration": "16s",
              background:
                "radial-gradient(circle at 50% 50%, oklch(0.60 0.26 310 / 0.25) 0%, oklch(0.62 0.24 325 / 0.10) 50%, transparent 70%)",
            } as React.CSSProperties
          }
        />
        {/* Subtle noise grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px",
          }}
        />
      </div>

      {/* ── Decorative floating chat bubbles ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
        <div
          className="bubble-float absolute top-[12%] left-[8%] px-4 py-2 rounded-2xl rounded-bl-sm text-xs font-medium hidden md:block"
          style={{
            background: "oklch(0.62 0.27 345 / 0.07)",
            border: "1px solid oklch(0.62 0.27 345 / 0.2)",
            color: "oklch(0.62 0.20 345 / 0.55)",
          }}
        >
          Hey, how are you? 👋
        </div>
        <div
          className="bubble-float-2 absolute top-[18%] right-[10%] px-4 py-2 rounded-2xl rounded-br-sm text-xs font-medium hidden md:block"
          style={{
            background: "oklch(0.58 0.25 290 / 0.07)",
            border: "1px solid oklch(0.58 0.25 290 / 0.2)",
            color: "oklch(0.60 0.18 290 / 0.55)",
          }}
        >
          Just joined Linkr! 🎉
        </div>
        <div
          className="bubble-float-3 absolute bottom-[25%] left-[10%] px-4 py-2 rounded-2xl rounded-bl-sm text-xs font-medium hidden md:block"
          style={{
            background: "oklch(0.60 0.26 310 / 0.07)",
            border: "1px solid oklch(0.60 0.26 310 / 0.2)",
            color: "oklch(0.62 0.20 310 / 0.55)",
          }}
        >
          ✓✓ Seen
        </div>
        <div
          className="bubble-float absolute bottom-[30%] right-[8%] px-4 py-2 rounded-2xl rounded-br-sm text-xs font-medium hidden md:block"
          style={
            {
              "--duration": "7s",
              background: "oklch(0.62 0.27 345 / 0.07)",
              border: "1px solid oklch(0.62 0.27 345 / 0.2)",
              color: "oklch(0.62 0.20 345 / 0.55)",
            } as React.CSSProperties
          }
        >
          🔒 End-to-end private
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="w-full max-w-sm mx-auto px-4 flex flex-col items-center gap-6 page-fade relative z-10">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Icon with glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl blur-2xl opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.62 0.27 345), oklch(0.58 0.25 290))",
              }}
            />
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center gradient-btn">
              <MessageCircle
                size={38}
                className="text-white relative z-10"
                strokeWidth={2}
              />
            </div>
          </div>

          {/* Brand name */}
          <div>
            <h1
              className="text-5xl font-bold tracking-tight gradient-text-vibrant"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Linkr
            </h1>
            <p className="text-base mt-2 font-medium text-muted-foreground">
              Private chats. Real-time. Decentralized.
            </p>
          </div>
        </div>

        {/* ── Login card ── */}
        <div className="glass-card w-full rounded-2xl p-6 flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">
              Welcome to Linkr
            </h2>
            <p className="text-sm mt-1 text-muted-foreground">
              Sign in to connect with your friends instantly
            </p>
          </div>

          {/* Main CTA button */}
          <button
            type="button"
            onClick={login}
            disabled={isDisabled}
            className="gradient-btn relative w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2.5 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <span className="relative z-10 flex items-center gap-2.5">
              {isDisabled ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>
                    {isInitializing ? "Initializing..." : "Connecting..."}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign in with Internet Identity</span>
                  <Sparkles className="h-4 w-4 opacity-80" />
                </>
              )}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-muted-foreground">
              New to Linkr?
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Tap{" "}
            <span className="font-semibold text-primary/90">
              Sign in with Internet Identity
            </span>{" "}
            above. New users can create an account in seconds — no password
            needed.
          </p>
        </div>

        {/* ── Feature pills ── */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <FeaturePill icon="🔒" label="No Passwords" hue={345} />
          <FeaturePill icon="⚡" label="Real-time" hue={310} />
          <FeaturePill icon="🌐" label="Decentralized" hue={290} />
          <FeaturePill icon="🛡️" label="Private" hue={325} />
        </div>

        {/* ── How it works ── */}
        <div className="flex flex-col gap-2 w-full">
          <StepItem
            step="1"
            text="Authenticate with Internet Identity — secure & anonymous"
            hue={345}
          />
          <StepItem
            step="2"
            text="Pick your username and personalize your profile"
            hue={310}
          />
          <StepItem
            step="3"
            text="Find friends by username and chat in real-time"
            hue={290}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="absolute bottom-4 left-0 right-0 text-center z-10">
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:text-muted-foreground"
          >
            Built with ❤️ using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeaturePill({
  icon,
  label,
  hue,
}: {
  icon: string;
  label: string;
  hue: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-transform duration-200 hover:scale-105 cursor-default"
      style={{
        background: `oklch(0.20 0.03 ${hue} / 0.7)`,
        border: `1px solid oklch(0.35 0.08 ${hue} / 0.45)`,
        color: `oklch(0.80 0.20 ${hue})`,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function StepItem({
  step,
  text,
  hue,
}: {
  step: string;
  text: string;
  hue: number;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/60 border border-border/50">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{
          background: `oklch(0.24 0.06 ${hue} / 0.8)`,
          color: `oklch(0.80 0.22 ${hue})`,
          border: `1px solid oklch(0.38 0.10 ${hue} / 0.4)`,
        }}
      >
        {step}
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        {text}
      </div>
    </div>
  );
}
