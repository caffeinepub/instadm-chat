import { Loader2, Lock, MessageCircle, Sparkles } from "lucide-react";
import type React from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function LoginPage() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const isDisabled = isLoggingIn || isInitializing;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden bg-[oklch(0.07_0.018_270)]">
      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Large purple orb top-right */}
        <div
          className="float-orb absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full"
          style={
            {
              "--duration": "10s",
              background:
                "radial-gradient(circle at 40% 40%, oklch(0.60 0.28 280 / 0.35) 0%, oklch(0.55 0.25 300 / 0.15) 50%, transparent 70%)",
            } as React.CSSProperties
          }
        />
        {/* Pink orb left */}
        <div
          className="float-orb-reverse absolute top-[30%] left-[-15%] w-[500px] h-[500px] rounded-full"
          style={
            {
              "--duration": "13s",
              background:
                "radial-gradient(circle at 60% 40%, oklch(0.68 0.25 330 / 0.28) 0%, oklch(0.65 0.22 310 / 0.12) 50%, transparent 70%)",
            } as React.CSSProperties
          }
        />
        {/* Cyan orb bottom-right */}
        <div
          className="float-orb-slow absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full"
          style={
            {
              "--duration": "16s",
              background:
                "radial-gradient(circle at 50% 50%, oklch(0.72 0.18 195 / 0.25) 0%, oklch(0.70 0.15 210 / 0.10) 50%, transparent 70%)",
            } as React.CSSProperties
          }
        />
        {/* Small bright orb center */}
        <div
          className="float-orb absolute top-[50%] left-[50%] w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={
            {
              "--duration": "8s",
              background:
                "radial-gradient(circle at 50% 50%, oklch(0.58 0.28 260 / 0.12) 0%, transparent 60%)",
            } as React.CSSProperties
          }
        />
      </div>

      {/* ── Decorative floating chat bubbles ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
        <div
          className="bubble-float absolute top-[12%] left-[8%] px-4 py-2 rounded-2xl rounded-bl-sm text-xs font-medium hidden md:block"
          style={{
            background: "oklch(0.60 0.28 280 / 0.08)",
            border: "1px solid oklch(0.60 0.28 280 / 0.18)",
            color: "oklch(0.65 0.15 280 / 0.5)",
          }}
        >
          Hey, how are you? 👋
        </div>
        <div
          className="bubble-float-2 absolute top-[18%] right-[10%] px-4 py-2 rounded-2xl rounded-br-sm text-xs font-medium hidden md:block"
          style={{
            background: "oklch(0.68 0.25 330 / 0.08)",
            border: "1px solid oklch(0.68 0.25 330 / 0.18)",
            color: "oklch(0.68 0.15 330 / 0.5)",
          }}
        >
          Just joined Linkr! 🎉
        </div>
        <div
          className="bubble-float-3 absolute bottom-[25%] left-[10%] px-4 py-2 rounded-2xl rounded-bl-sm text-xs font-medium hidden md:block"
          style={{
            background: "oklch(0.72 0.18 195 / 0.08)",
            border: "1px solid oklch(0.72 0.18 195 / 0.18)",
            color: "oklch(0.68 0.12 195 / 0.5)",
          }}
        >
          ✓✓ Seen
        </div>
        <div
          className="bubble-float absolute bottom-[30%] right-[8%] px-4 py-2 rounded-2xl rounded-br-sm text-xs font-medium hidden md:block"
          style={
            {
              "--duration": "7s",
              background: "oklch(0.60 0.28 280 / 0.08)",
              border: "1px solid oklch(0.60 0.28 280 / 0.18)",
              color: "oklch(0.65 0.15 280 / 0.5)",
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
              className="absolute inset-0 rounded-2xl blur-xl opacity-70"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.55 0.28 290), oklch(0.60 0.25 260), oklch(0.65 0.22 220))",
              }}
            />
            <div
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.55 0.28 290), oklch(0.60 0.25 260), oklch(0.65 0.22 220))",
                boxShadow:
                  "0 8px 32px oklch(0.55 0.28 285 / 0.45), 0 2px 8px oklch(0.55 0.28 285 / 0.3)",
              }}
            >
              <MessageCircle size={38} className="text-white" strokeWidth={2} />
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
            <p
              className="text-base mt-2 font-medium"
              style={{ color: "oklch(0.60 0.015 270)" }}
            >
              Private chats. Real-time. Decentralized.
            </p>
          </div>
        </div>

        {/* ── Login card ── */}
        <div
          className="w-full rounded-2xl p-6 flex flex-col gap-5"
          style={{
            background: "oklch(0.12 0.018 268 / 0.85)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid oklch(0.30 0.025 268 / 0.5)",
            boxShadow:
              "0 4px 32px oklch(0.05 0.015 270 / 0.8), inset 0 1px 0 oklch(0.35 0.03 268 / 0.3)",
          }}
        >
          <div className="text-center">
            <h2
              className="text-lg font-bold"
              style={{ color: "oklch(0.92 0.006 270)" }}
            >
              Welcome to Linkr
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.55 0.012 270)" }}
            >
              Sign in to connect with your friends instantly
            </p>
          </div>

          {/* Main CTA button */}
          <button
            type="button"
            onClick={login}
            disabled={isDisabled}
            className="relative w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2.5 overflow-hidden transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.28 290), oklch(0.60 0.25 260), oklch(0.65 0.22 220))",
              boxShadow:
                "0 4px 20px oklch(0.55 0.28 285 / 0.4), 0 1px 4px oklch(0.55 0.28 285 / 0.2)",
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow =
                  "0 8px 32px oklch(0.55 0.28 285 / 0.55), 0 2px 8px oklch(0.55 0.28 285 / 0.3)";
                el.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow =
                "0 4px 20px oklch(0.55 0.28 285 / 0.4), 0 1px 4px oklch(0.55 0.28 285 / 0.2)";
              el.style.transform = "translateY(0)";
            }}
          >
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
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ background: "oklch(0.22 0.02 268)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.42 0.015 270)" }}
            >
              New to Linkr?
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "oklch(0.22 0.02 268)" }}
            />
          </div>

          <p
            className="text-center text-xs leading-relaxed"
            style={{ color: "oklch(0.48 0.012 270)" }}
          >
            Tap{" "}
            <span
              className="font-semibold"
              style={{ color: "oklch(0.70 0.15 280)" }}
            >
              Sign in with Internet Identity
            </span>{" "}
            above. New users can create an account in seconds — no password
            needed.
          </p>
        </div>

        {/* ── Feature pills ── */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <FeaturePill icon="🔒" label="No Passwords" hue={280} />
          <FeaturePill icon="⚡" label="Real-time" hue={220} />
          <FeaturePill icon="🌐" label="Decentralized" hue={195} />
          <FeaturePill icon="🛡️" label="Private" hue={310} />
        </div>

        {/* ── How it works ── */}
        <div className="flex flex-col gap-2 w-full">
          <StepItem
            step="1"
            text="Authenticate with Internet Identity — secure & anonymous"
            hue={280}
          />
          <StepItem
            step="2"
            text="Pick your username and personalize your profile"
            hue={220}
          />
          <StepItem
            step="3"
            text="Find friends by username and chat in real-time"
            hue={195}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="absolute bottom-4 left-0 right-0 text-center z-10">
        <p className="text-xs" style={{ color: "oklch(0.32 0.012 270)" }}>
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.50 0.015 280)" }}
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
        background: `oklch(0.18 0.025 ${hue} / 0.7)`,
        border: `1px solid oklch(0.32 0.04 ${hue} / 0.5)`,
        color: `oklch(0.70 0.18 ${hue})`,
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
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: "oklch(0.12 0.018 268 / 0.5)",
        border: "1px solid oklch(0.20 0.02 268 / 0.5)",
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{
          background: `oklch(0.22 0.04 ${hue} / 0.8)`,
          color: `oklch(0.72 0.18 ${hue})`,
          border: `1px solid oklch(0.35 0.06 ${hue} / 0.4)`,
        }}
      >
        {step}
      </div>
      <div
        style={{ color: "oklch(0.52 0.012 270)" }}
        className="text-xs leading-relaxed"
      >
        {text}
      </div>
    </div>
  );
}
