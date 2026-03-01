import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  addAnnouncement,
  getAnnouncements,
} from "../../services/featureService";

interface AnnouncementModalProps {
  open: boolean;
  groupId: string;
  isAdmin: boolean;
  onClose: () => void;
}

export function AnnouncementModal({
  open,
  groupId,
  isAdmin,
  onClose,
}: AnnouncementModalProps) {
  const [text, setText] = useState("");
  const [announcements, setAnnouncements] = useState(() =>
    getAnnouncements(groupId),
  );

  const handlePost = () => {
    if (!text.trim()) return;
    const updated = addAnnouncement(groupId, text.trim());
    setAnnouncements(updated);
    setText("");
    toast.success("Announcement posted!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl max-w-sm max-h-[70vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell size={15} className="text-yellow-500" />
            Group Announcements
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center py-8">
                <Bell
                  size={24}
                  className="text-muted-foreground mx-auto mb-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">
                  No announcements yet
                </p>
              </div>
            ) : (
              announcements.map((ann, i) => (
                <div
                  key={`ann-${ann.slice(0, 20)}-${i}`}
                  className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3"
                >
                  <p className="text-sm leading-relaxed">{ann}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {i === 0 ? "Latest" : `#${announcements.length - i}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {isAdmin && (
          <div className="p-4 border-t border-border flex-shrink-0 space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Post an announcement to the group..."
              className="rounded-xl text-sm resize-none min-h-[80px]"
              maxLength={500}
            />
            <Button
              size="sm"
              className="w-full rounded-xl gradient-btn"
              onClick={handlePost}
              disabled={!text.trim()}
            >
              <span className="text-white font-semibold">
                Post Announcement
              </span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
