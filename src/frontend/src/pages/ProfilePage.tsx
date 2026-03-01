import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Clock,
  Edit2,
  Loader2,
  Lock,
  MessageCircle,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import {
  getPendingRequestsForUser,
  hasPendingRequest,
} from "../services/followService";

export function ProfilePage() {
  const { username } = useParams({ strict: false }) as { username?: string };
  const navigate = useNavigate();
  const { currentUser, updateProfile } = useAuth();
  const {
    users,
    openChat,
    setActiveChatId,
    sendFollowRequest,
    acceptFollowRequest,
    declineFollowRequest,
    followUser,
    unfollowUser,
    cancelFollowRequestFn,
  } = useChat();

  const isOwnProfile =
    !username ||
    username === currentUser?.username ||
    username === currentUser?.uid;

  const targetUser = isOwnProfile
    ? currentUser
    : Object.values(users).find((u) => u.username === username);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    bio: currentUser?.bio ?? "",
    isPrivate: currentUser?.isPrivate ?? false,
    profilePicture: currentUser?.profilePicture ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!targetUser) {
    return (
      <div className="min-h-dvh flex items-center justify-center page-fade bg-background">
        <p className="text-muted-foreground text-sm">User not found</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      bio: form.bio.trim(),
      isPrivate: form.isPrivate,
      profilePicture: form.profilePicture.trim(),
    });
    setSaving(false);
    setEditing(false);
    toast.success("Profile updated");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateProfile({ profilePicture: url });
    setForm((p) => ({ ...p, profilePicture: url }));
    toast.success("Avatar updated");
  };

  const handleMessageUser = async () => {
    if (!currentUser) return;
    try {
      const { chatId, isRequest } = await openChat(
        currentUser.uid,
        targetUser.uid,
      );
      if (!isRequest) {
        setActiveChatId(chatId);
        navigate({ to: "/" });
      } else {
        toast.info("Send a follow request first to start chatting");
      }
    } catch {
      toast.error("Failed to open chat");
    }
  };

  const handleFollow = async () => {
    if (!currentUser || isOwnProfile) return;
    setFollowLoading(true);
    try {
      if (targetUser.isPrivate) {
        // Private — send follow request
        sendFollowRequest(targetUser.uid, targetUser.username);
        toast.success("Follow request sent");
      } else {
        // Public — follow directly
        await followUser(targetUser.uid);
        toast.success(`Following @${targetUser.username}`);
      }
    } catch {
      toast.error("Failed to follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || isOwnProfile) return;
    setFollowLoading(true);
    try {
      await unfollowUser(targetUser.uid);
      toast.success(`Unfollowed @${targetUser.username}`);
    } catch {
      toast.error("Failed to unfollow");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCancelRequest = () => {
    cancelFollowRequestFn(targetUser.uid);
    toast.success("Follow request cancelled");
  };

  // Relationship status
  const isFollowing =
    currentUser && targetUser.followers.includes(currentUser.uid);
  const isPending =
    currentUser && hasPendingRequest(currentUser.uid, targetUser.uid);

  // Incoming follow requests to MY profile
  const incomingRequests =
    isOwnProfile && currentUser
      ? getPendingRequestsForUser(currentUser.uid)
      : [];

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={18} />
        </Button>
        <h1
          className="font-bold text-lg flex-1 tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          @{targetUser.username}
        </h1>
        {isOwnProfile && !editing && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => {
              setForm({
                bio: currentUser?.bio ?? "",
                isPrivate: currentUser?.isPrivate ?? false,
                profilePicture: currentUser?.profilePicture ?? "",
              });
              setEditing(true);
            }}
          >
            <Edit2 size={16} />
          </Button>
        )}
        {editing && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => setEditing(false)}
            >
              <X size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-5 mb-8">
          <div className="relative">
            <UserAvatar
              src={targetUser.profilePicture}
              username={targetUser.username}
              isOnline={targetUser.onlineStatus}
              size="xl"
            />
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Edit2 size={18} className="text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>

          {!editing ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">
                  @{targetUser.username}
                </h2>
                {targetUser.bio && (
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                    {targetUser.bio}
                  </p>
                )}
                {targetUser.isPrivate && (
                  <div className="flex items-center gap-1.5 justify-center mt-2 text-xs text-muted-foreground">
                    <Lock size={11} />
                    <span>Private account</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-10 text-center">
                <div>
                  <p className="font-bold text-xl">
                    {targetUser.followers.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Followers
                  </p>
                </div>
                <div className="w-px bg-border" />
                <div>
                  <p className="font-bold text-xl">
                    {targetUser.following.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Following
                  </p>
                </div>
              </div>

              {/* Actions */}
              {!isOwnProfile && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {isFollowing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleUnfollow}
                        disabled={followLoading}
                        className="rounded-xl gap-2 h-9 px-5 text-sm border-border"
                      >
                        {followLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UserCheck size={14} />
                        )}
                        Following
                      </Button>
                      <Button
                        onClick={handleMessageUser}
                        className="rounded-xl gap-2 h-9 px-5 text-sm gradient-btn"
                      >
                        <MessageCircle size={14} className="text-white" />
                        <span className="text-white">Message</span>
                      </Button>
                    </>
                  ) : isPending ? (
                    <Button
                      variant="outline"
                      onClick={handleCancelRequest}
                      className="rounded-xl gap-2 h-9 px-5 text-sm"
                    >
                      <Clock size={14} />
                      Requested · Cancel
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className="rounded-xl gap-2 h-9 px-5 text-sm gradient-btn"
                      >
                        {followLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UserPlus size={14} className="text-white" />
                        )}
                        <span className="text-white">
                          {targetUser.isPrivate ? "Request" : "Follow"}
                        </span>
                      </Button>
                      {!targetUser.isPrivate && (
                        <Button
                          variant="outline"
                          onClick={handleMessageUser}
                          className="rounded-xl gap-2 h-9 px-5 text-sm"
                        >
                          <MessageCircle size={14} />
                          Message
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Edit form */
            <div className="w-full space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bio: e.target.value }))
                  }
                  placeholder="Tell something about yourself..."
                  className="rounded-xl resize-none text-sm"
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.bio.length}/160
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Avatar URL</Label>
                <Input
                  value={form.profilePicture}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, profilePicture: e.target.value }))
                  }
                  placeholder="https://..."
                  className="rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Lock size={13} /> Private account
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only approved followers can message you
                  </p>
                </div>
                <Switch
                  checked={form.isPrivate}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, isPrivate: v }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Incoming follow requests — own profile only */}
        {isOwnProfile && incomingRequests.length > 0 && (
          <div className="mt-2 rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold flex items-center gap-2">
                <UserPlus size={14} className="text-primary" />
                Follow Requests
                <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-bold">
                  {incomingRequests.length}
                </span>
              </p>
            </div>
            <ScrollArea className="max-h-64">
              {incomingRequests.map((req) => {
                const sender = users[req.senderId];
                return (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                  >
                    <UserAvatar
                      src={sender?.profilePicture}
                      username={sender?.username ?? req.senderUsername ?? "?"}
                      size="sm"
                      showOnline={false}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        @
                        {sender?.username ??
                          req.senderUsername ??
                          req.senderId.slice(-8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Wants to follow you
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="rounded-xl h-7 px-3 text-xs gradient-btn"
                        onClick={() => {
                          acceptFollowRequest(req.id);
                          toast.success("Follow request accepted");
                        }}
                      >
                        <UserCheck size={11} className="text-white" />
                        <span className="text-white ml-1">Accept</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-7 px-3 text-xs"
                        onClick={() => {
                          declineFollowRequest(req.id);
                          toast.success("Request declined");
                        }}
                      >
                        <UserMinus size={11} />
                        <span className="ml-1">Decline</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
