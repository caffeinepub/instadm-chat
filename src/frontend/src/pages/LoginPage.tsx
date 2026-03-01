import { Loader2, Lock, MessageCircle } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { TutorialModal } from "../components/TutorialModal";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function LoginPage() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const isDisabled = isLoggingIn || isInitializing;
  const [showTutorial, setShowTutorial] = useState(false);

  // Force light mode on login page, restore user's theme on unmount
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    document.body.classList.add("page-login");
    document.getElementById("root")?.classList.add("page-login");
    return () => {
      if (wasDark) html.classList.add("dark");
      document.body.classList.remove("page-login");
      document.getElementById("root")?.classList.remove("page-login");
    };
  }, []);

  return (
    <div
      className="min-h-dvh flex flex-col items-start justify-start relative overflow-y-auto"
      style={{ background: "oklch(0.99 0.002 350)" }}
    >
      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
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

      {/* ── Main hero section ── */}
      <div className="w-full flex flex-col items-center justify-center min-h-dvh px-4 py-12 relative z-10">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-7 page-fade">
          {/* Logo + Brand */}
          <div className="flex flex-col items-center gap-4 text-center">
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
            <div>
              <h1
                className="text-5xl font-bold tracking-tight gradient-text-vibrant"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Linkr
              </h1>
              <p className="text-sm mt-1.5 text-muted-foreground font-medium">
                Private chats. Real-time. Decentralized.
              </p>
            </div>
          </div>

          {/* ── Login card — bare essentials only ── */}
          <div className="glass-card w-full rounded-2xl p-6 flex flex-col gap-4">
            {/* Main CTA button */}
            <button
              type="button"
              onClick={login}
              disabled={isDisabled}
              className="gradient-btn relative w-full h-13 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2.5 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed disabled:pointer-events-none py-3"
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
                  </>
                )}
              </span>
            </button>

            {/* Tutorial link */}
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors text-center font-medium"
            >
              New here? Learn how it works →
            </button>
          </div>
        </div>
      </div>

      {/* ── Features Section (below the fold) ── */}
      <div
        className="w-full relative z-10 border-t"
        style={{
          background: "oklch(0.98 0.004 345 / 0.9)",
          borderColor: "oklch(0.90 0.01 340)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Discover Linkr
            </h2>
            <p
              className="text-sm mt-2 max-w-xs mx-auto"
              style={{ color: "oklch(0.50 0.025 340)" }}
            >
              Everything you need for private, real-time messaging
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="py-6 text-center"
          style={{ borderTop: "1px solid oklch(0.90 0.01 340)" }}
        >
          <p className="text-xs" style={{ color: "oklch(0.60 0.02 340)" }}>
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
        </div>
      </div>

      {/* Tutorial modal */}
      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
}

const features = [
  {
    icon: "💬",
    title: "Real-time Chat",
    description: "Messages delivered in under a second via ICP polling",
    hue: 345,
  },
  {
    icon: "👥",
    title: "Group Chats",
    description: "Create groups with friends and chat together",
    hue: 310,
  },
  {
    icon: "❤️",
    title: "Reactions",
    description: "React to any message with emoji expressions",
    hue: 345,
  },
  {
    icon: "🎤",
    title: "Voice Messages",
    description: "Record and send audio messages instantly",
    hue: 290,
  },
  {
    icon: "🔒",
    title: "Private Accounts",
    description: "Control who can message you with follow requests",
    hue: 325,
  },
  {
    icon: "⚡",
    title: "Vanish Mode",
    description: "Messages disappear after being read",
    hue: 310,
  },
  {
    icon: "🔔",
    title: "Notifications",
    description: "Get notified instantly when friends message you",
    hue: 300,
  },
  {
    icon: "🌙",
    title: "Dark Mode",
    description: "Easy on the eyes, day or night",
    hue: 280,
  },
  {
    icon: "🔐",
    title: "No Password",
    description: "Powered by Internet Identity — secure & anonymous",
    hue: 345,
  },
];

function FeatureCard({
  icon,
  title,
  description,
  hue,
}: {
  icon: string;
  title: string;
  description: string;
  hue: number;
}) {
  return (
    <div
      className="feature-card flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-200 cursor-default"
      style={{
        background: `oklch(0.96 0.008 ${hue})`,
        borderColor: `oklch(0.88 0.03 ${hue} / 0.60)`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
        style={{
          background: `oklch(0.90 0.02 ${hue})`,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-sm font-bold"
          style={{ color: `oklch(0.20 0.02 ${hue})` }}
        >
          {title}
        </p>
        <p
          className="text-xs mt-1 leading-relaxed"
          style={{ color: `oklch(0.42 0.025 ${hue})` }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
