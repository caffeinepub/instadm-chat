import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import React, { useState } from "react";
import type { AppUser, Chat } from "../../types";
import { UserAvatar } from "./UserAvatar";

interface ForwardModalProps {
  open: boolean;
  onClose: () => void;
  chats: Chat[];
  users: Record<string, AppUser>;
  currentUid: string;
  onForward: (chatId: string) => void;
}

export function ForwardModal({
  open,
  onClose,
  chats,
  users,
  currentUid,
  onForward,
}: ForwardModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = chats.filter((c) => {
    const other = c.participants.find((p) => p !== currentUid);
    if (!other) return false;
    const user = users[other];
    return (
      user?.username.toLowerCase().includes(search.toLowerCase()) &&
      !c.archived[currentUid]
    );
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Forward to...</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl"
        />
        <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
          {filtered.map((chat) => {
            const otherUid = chat.participants.find((p) => p !== currentUid)!;
            const user = users[otherUid];
            return (
              <button
                type="button"
                key={chat.id}
                onClick={() => setSelected(chat.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                  selected === chat.id
                    ? "bg-primary/10 ring-1 ring-primary"
                    : "hover:bg-accent"
                }`}
              >
                <UserAvatar
                  src={user?.profilePicture}
                  username={user?.username ?? "?"}
                  size="sm"
                  showOnline={false}
                />
                <span className="font-medium text-sm">{user?.username}</span>
              </button>
            );
          })}
        </div>
        <Button
          disabled={!selected}
          onClick={() => {
            if (selected) {
              onForward(selected);
              onClose();
            }
          }}
          className="w-full rounded-xl"
        >
          Forward
        </Button>
      </DialogContent>
    </Dialog>
  );
}
