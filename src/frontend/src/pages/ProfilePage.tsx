import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Edit2,
  Loader2,
  Lock,
  MessageCircle,
  X,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export function ProfilePage() {
  const { username } = useParams({ strict: false }) as { username?: string };
  const navigate = useNavigate();
  const { currentUser, updateProfile } = useAuth();
  const { users, openChat, setActiveChatId } = useChat();

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
        toast.info("Message request sent");
      }
    } catch {
      toast.error("Failed to open chat");
    }
  };

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="font-bold text-lg flex-1">@{targetUser.username}</h1>
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
                <Button
                  onClick={handleMessageUser}
                  className="rounded-xl gap-2 h-10 px-6"
                >
                  <MessageCircle size={16} />
                  Send message
                </Button>
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
      </div>
    </div>
  );
}
