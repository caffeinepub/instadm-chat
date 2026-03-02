import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarChart2, EyeOff, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createPoll } from "../../services/featureService";

interface PollModalProps {
  open: boolean;
  chatId: string;
  createdBy: string;
  onClose: () => void;
  onPollCreated: (pollId: string) => void;
}

export function PollModal({
  open,
  chatId,
  createdBy,
  onClose,
  onPollCreated,
}: PollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleCreate = () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      toast.error("Please enter at least 2 options");
      return;
    }
    const poll = createPoll(
      chatId,
      question.trim(),
      validOptions,
      createdBy,
      isAnonymous,
    );
    onPollCreated(poll.id);
    setQuestion("");
    setOptions(["", ""]);
    setIsAnonymous(false);
    onClose();
    toast.success("Poll created!");
  };

  const addOption = () => {
    if (options.length >= 4) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, val: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BarChart2 size={16} className="text-primary" />
            Create Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Question */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Question
            </Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something..."
              className="rounded-xl text-sm"
              maxLength={200}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Options
            </Label>
            {options.map((opt, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: poll options are positional, index is appropriate
              <div key={`opt-${i}`} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                  {i + 1}
                </span>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="rounded-xl text-sm flex-1"
                  maxLength={100}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="w-7 h-7 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <Plus size={13} />
                Add option
              </button>
            )}
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <EyeOff size={13} className="text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold">Anonymous voting</p>
                <p className="text-[10px] text-muted-foreground">
                  Voters' identities are hidden
                </p>
              </div>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl gradient-btn"
            onClick={handleCreate}
          >
            <span className="text-white font-semibold">Create Poll</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
