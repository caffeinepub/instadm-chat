import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Users, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import { awardBadge, initGroupRoles } from "../../services/featureService";
import type { AppUser, GroupChat } from "../../types";
import { UserAvatar } from "./UserAvatar";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated: (group: GroupChat) => void;
}

export function CreateGroupModal({
  open,
  onClose,
  onGroupCreated,
}: CreateGroupModalProps) {
  const { searchUsers, createGroupChat } = useChat();
  const { currentUser } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AppUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUid = currentUser!.uid;

  const handleMemberSearch = useCallback(
    (q: string) => {
      setMemberSearch(q);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (!q.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await searchUsers(q.trim(), currentUid);
          // Filter out already selected members
          setSearchResults(
            results.filter(
              (u) => !selectedMembers.some((m) => m.uid === u.uid),
            ),
          );
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 350);
    },
    [searchUsers, currentUid, selectedMembers],
  );

  const addMember = (user: AppUser) => {
    setSelectedMembers((prev) => [...prev, user]);
    setSearchResults((prev) => prev.filter((u) => u.uid !== user.uid));
    setMemberSearch("");
  };

  const removeMember = (uid: string) => {
    setSelectedMembers((prev) => prev.filter((u) => u.uid !== uid));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Add at least one member");
      return;
    }

    setIsCreating(true);
    try {
      const memberIds = selectedMembers.map((m) => m.uid);
      const group = await createGroupChat(
        name.trim(),
        description.trim(),
        memberIds,
      );
      if (group) {
        toast.success(`Group "${name}" created!`);
        // Award badge and init roles
        const awarded = awardBadge(currentUid, "group_creator");
        if (awarded) toast.success("👑 Badge Earned: Group Creator!");
        initGroupRoles(group.id, currentUid, [...memberIds, currentUid]);
        onGroupCreated(group);
        // Reset form
        setName("");
        setDescription("");
        setSelectedMembers([]);
        setMemberSearch("");
        onClose();
      } else {
        toast.error("Failed to create group. Try again.");
      }
    } catch {
      toast.error("Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedMembers([]);
    setMemberSearch("");
    setSearchResults([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="rounded-2xl max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl group-icon-gradient flex items-center justify-center">
              <Users size={16} className="text-white" />
            </div>
            Create Group
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Group name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Group Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study Group, Friends..."
              className="rounded-xl text-sm"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Description (optional)
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="rounded-xl text-sm"
              maxLength={200}
            />
          </div>

          {/* Add members */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Add Members *
            </Label>

            {/* Selected member chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/40 rounded-xl">
                {selectedMembers.map((member) => (
                  <Badge
                    key={member.uid}
                    variant="secondary"
                    className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 h-auto rounded-full text-xs"
                  >
                    <UserAvatar
                      src={member.profilePicture}
                      username={member.username}
                      size="xs"
                      showOnline={false}
                    />
                    <span>@{member.username}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(member.uid)}
                      className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Member search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                value={memberSearch}
                onChange={(e) => handleMemberSearch(e.target.value)}
                placeholder="Search by username..."
                className="pl-8 rounded-xl text-sm"
              />
              {isSearching && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
                />
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <ScrollArea className="max-h-40 rounded-xl border border-border bg-card">
                {searchResults.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => addMember(user)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left"
                  >
                    <UserAvatar
                      src={user.profilePicture}
                      username={user.username}
                      isOnline={user.onlineStatus}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl gradient-btn"
            onClick={handleCreate}
            disabled={
              isCreating || !name.trim() || selectedMembers.length === 0
            }
          >
            {isCreating ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin text-white" />
                <span className="text-white">Creating...</span>
              </>
            ) : (
              <span className="text-white">Create Group</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
