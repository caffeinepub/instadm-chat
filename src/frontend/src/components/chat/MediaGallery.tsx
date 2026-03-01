import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Image,
  Mic,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Message } from "../../types";

interface MediaGalleryProps {
  open: boolean;
  messages: Message[];
  onClose: () => void;
}

export function MediaGallery({ open, messages, onClose }: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mediaMessages = messages.filter(
    (m) =>
      !m.deletedForEveryone &&
      m.mediaUrl &&
      (m.messageType === "image" || m.messageType === "video"),
  );
  const audioMessages = messages.filter(
    (m) => !m.deletedForEveryone && m.mediaUrl && m.messageType === "voice",
  );
  const fileMessages = messages.filter(
    (m) => !m.deletedForEveryone && m.mediaUrl && m.messageType === "file",
  );

  const currentLightboxMsg =
    lightboxIndex !== null ? mediaMessages[lightboxIndex] : null;

  const prevLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(Math.max(0, lightboxIndex - 1));
  };

  const nextLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(Math.min(mediaMessages.length - 1, lightboxIndex + 1));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Image size={15} className="text-primary" />
              Shared Media
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* Images & Videos */}
              {mediaMessages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Image size={11} /> Photos & Videos
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {mediaMessages.map((msg, i) => (
                      <button
                        type="button"
                        key={msg.id}
                        onClick={() => setLightboxIndex(i)}
                        className="aspect-square rounded-lg overflow-hidden relative hover:opacity-90 transition-opacity group"
                      >
                        {msg.messageType === "image" ? (
                          <img
                            src={msg.mediaUrl}
                            alt="media"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Video
                              size={24}
                              className="text-muted-foreground"
                            />
                          </div>
                        )}
                        {msg.messageType === "video" && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Video size={20} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice messages */}
              {audioMessages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Mic size={11} /> Voice Messages
                  </p>
                  <div className="space-y-2">
                    {audioMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Mic size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">Voice message</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        {/* biome-ignore lint/a11y/useMediaCaption: gallery audio */}
                        <audio
                          controls
                          src={msg.mediaUrl}
                          className="h-8 max-w-[150px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {fileMessages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <FileText size={11} /> Files
                  </p>
                  <div className="space-y-2">
                    {fileMessages.map((msg) => (
                      <a
                        key={msg.id}
                        href={msg.mediaUrl}
                        download={msg.mediaName}
                        className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50 hover:bg-accent/60 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {msg.mediaName ?? "File"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty */}
              {mediaMessages.length === 0 &&
                audioMessages.length === 0 &&
                fileMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Image
                        size={24}
                        className="text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No shared media yet
                    </p>
                  </div>
                )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIndex !== null && currentLightboxMsg && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: lightbox dismiss overlay
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
          >
            <X size={18} />
          </button>
          {lightboxIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                prevLightbox();
              }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {lightboxIndex < mediaMessages.length - 1 && (
            <button
              type="button"
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                nextLightbox();
              }}
            >
              <ChevronRight size={20} />
            </button>
          )}
          {currentLightboxMsg.messageType === "image" ? (
            // biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation on image click in lightbox
            <img
              src={currentLightboxMsg.mediaUrl}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // biome-ignore lint/a11y/useMediaCaption: lightbox video
            // biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation on video click in lightbox
            <video
              src={currentLightboxMsg.mediaUrl}
              controls
              className="max-w-full max-h-full rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <p className="absolute bottom-4 text-white/60 text-xs">
            {lightboxIndex + 1} / {mediaMessages.length}
          </p>
        </div>
      )}
    </>
  );
}
