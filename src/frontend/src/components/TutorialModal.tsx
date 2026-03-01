import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronRight, Lock, MessageCircle, Search, X } from "lucide-react";
import { useState } from "react";

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: string;
}

const steps: TutorialStep[] = [
  {
    icon: <Lock size={32} strokeWidth={1.5} />,
    title: "Sign in anonymously",
    description:
      "Linkr uses Internet Identity — a secure, password-free login. Your identity is cryptographically verified without sharing any personal data.",
    highlight: "No email. No password. No tracking.",
  },
  {
    icon: <MessageCircle size={32} strokeWidth={1.5} />,
    title: "Create your username",
    description:
      "After signing in, pick a unique username. This is how your friends will find you. You can also add a bio and profile picture.",
    highlight: "Your username is public — choose wisely!",
  },
  {
    icon: <Search size={32} strokeWidth={1.5} />,
    title: "Find & chat with friends",
    description:
      "Search any username to find friends. Start one-on-one chats, create groups, send voice messages, photos, and react to messages.",
    highlight: "Real-time delivery. No delays.",
  },
];

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialModal({ open, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      setStep(0);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleClose = () => {
    onClose();
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="rounded-3xl max-w-sm p-0 overflow-hidden border-0 shadow-2xl">
        {/* Background gradient */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, oklch(0.62 0.27 345 / 0.12), transparent 60%), radial-gradient(ellipse at 80% 100%, oklch(0.58 0.25 290 / 0.10), transparent 60%), oklch(var(--card))",
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>

        <div className="p-7 flex flex-col items-center gap-6">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {steps.map((_s, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: step count is fixed
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                      ? "w-3 bg-primary/40"
                      : "w-3 bg-muted",
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-primary"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.62 0.27 345 / 0.12), oklch(0.58 0.25 290 / 0.08))",
              border: "1px solid oklch(0.62 0.27 345 / 0.20)",
            }}
          >
            {current.icon}
          </div>

          {/* Content */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Step {step + 1} of {steps.length}
              </span>
            </div>
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {current.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Highlight pill */}
          <div
            className="px-4 py-2 rounded-full text-xs font-semibold text-center"
            style={{
              background: "oklch(0.62 0.27 345 / 0.10)",
              border: "1px solid oklch(0.62 0.27 345 / 0.20)",
              color: "oklch(0.62 0.20 345)",
            }}
          >
            {current.highlight}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            {step > 0 && (
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            <Button
              className={cn(
                "rounded-xl gradient-btn font-semibold",
                step === 0 ? "w-full" : "flex-1",
              )}
              onClick={handleNext}
            >
              <span className="text-white flex items-center gap-1.5">
                {isLast ? "Got it!" : "Next"}
                {!isLast && <ChevronRight size={16} />}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
