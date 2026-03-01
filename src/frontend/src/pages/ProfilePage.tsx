import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  Clock,
  Edit2,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  MessageCircle,
  Phone,
  Star,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
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

  // Enable scrolling on sub-page
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

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
    fullName: currentUser?.fullName ?? "",
    phoneNumber: currentUser?.phoneNumber ?? "",
    birthDate: currentUser?.birthDate ?? "",
    timezone: currentUser?.timezone ?? "",
    websiteUrl: currentUser?.websiteUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!targetUser) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center page-fade bg-background gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <User size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">User not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This profile doesn't exist or hasn't been loaded yet.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={14} className="mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      bio: form.bio.trim(),
      isPrivate: form.isPrivate,
      profilePicture: form.profilePicture.trim(),
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      birthDate: form.birthDate.trim(),
      timezone: form.timezone.trim(),
      websiteUrl: form.websiteUrl.trim(),
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
        sendFollowRequest(targetUser.uid, targetUser.username);
        toast.success("Follow request sent");
      } else {
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

  const isFollowing =
    currentUser && targetUser.followers.includes(currentUser.uid);
  const isPending =
    currentUser && hasPendingRequest(currentUser.uid, targetUser.uid);

  const incomingRequests =
    isOwnProfile && currentUser
      ? getPendingRequestsForUser(currentUser.uid)
      : [];

  const memberSince = targetUser.createdAt
    ? new Date(targetUser.createdAt).toLocaleDateString([], {
        month: "long",
        year: "numeric",
      })
    : null;

  const birthDateFormatted = targetUser.birthDate
    ? (() => {
        try {
          return new Date(targetUser.birthDate).toLocaleDateString([], {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
        } catch {
          return targetUser.birthDate;
        }
      })()
    : null;

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Sticky header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9 flex-shrink-0"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={18} />
        </Button>
        <h1
          className="font-bold text-lg flex-1 tracking-tight truncate"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          @{targetUser.username}
        </h1>
        {isOwnProfile && !editing && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 text-xs"
            onClick={() => {
              setForm({
                bio: currentUser?.bio ?? "",
                isPrivate: currentUser?.isPrivate ?? false,
                profilePicture: currentUser?.profilePicture ?? "",
                fullName: currentUser?.fullName ?? "",
                phoneNumber: currentUser?.phoneNumber ?? "",
                birthDate: currentUser?.birthDate ?? "",
                timezone: currentUser?.timezone ?? "",
                websiteUrl: currentUser?.websiteUrl ?? "",
              });
              setEditing(true);
            }}
          >
            <Edit2 size={12} />
            Edit Profile
          </Button>
        )}
        {editing && (
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl w-8 h-8 text-muted-foreground"
              onClick={() => setEditing(false)}
            >
              <X size={15} />
            </Button>
            <Button
              size="sm"
              className="rounded-xl gradient-btn gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <Check size={13} className="text-white" />
              )}
              <span className="text-white text-xs">Save</span>
            </Button>
          </div>
        )}
      </div>

      {/* Cover banner */}
      <div
        className="h-36 sm:h-44 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.62 0.27 345 / 0.8), oklch(0.60 0.26 320 / 0.7), oklch(0.58 0.25 290 / 0.8))",
        }}
      >
        {/* Decorative pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/40" />
      </div>

      {/* Avatar overlapping cover */}
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between -mt-12 sm:-mt-14 mb-4">
          <div className="relative">
            <div
              className="rounded-full p-0.5 shadow-lg"
              style={{
                background: targetUser.onlineStatus
                  ? "linear-gradient(135deg, oklch(0.62 0.27 345), oklch(0.58 0.25 290))"
                  : "oklch(var(--border))",
              }}
            >
              <div className="rounded-full overflow-hidden bg-background w-20 h-20 sm:w-24 sm:h-24">
                <UserAvatar
                  src={targetUser.profilePicture}
                  username={targetUser.username}
                  isOnline={false}
                  size="xl"
                />
              </div>
            </div>
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
                >
                  <Camera size={12} className="text-foreground" />
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

          {/* Action buttons (non-editing, non-own profile) */}
          {!isOwnProfile && !editing && (
            <div className="flex gap-2 flex-wrap mb-1">
              {isFollowing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnfollow}
                    disabled={followLoading}
                    className="rounded-xl gap-1.5 h-9 px-4 text-sm"
                  >
                    {followLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <UserCheck size={13} />
                    )}
                    Following
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleMessageUser}
                    className="rounded-xl gap-1.5 h-9 px-4 text-sm gradient-btn"
                  >
                    <MessageCircle size={13} className="text-white" />
                    <span className="text-white">Message</span>
                  </Button>
                </>
              ) : isPending ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelRequest}
                  className="rounded-xl gap-1.5 h-9 px-4 text-sm"
                >
                  <Clock size={13} />
                  Requested · Cancel
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={handleFollow}
                    disabled={followLoading}
                    className="rounded-xl gap-1.5 h-9 px-4 text-sm gradient-btn"
                  >
                    {followLoading ? (
                      <Loader2 size={13} className="animate-spin text-white" />
                    ) : (
                      <UserPlus size={13} className="text-white" />
                    )}
                    <span className="text-white">
                      {targetUser.isPrivate ? "Request" : "Follow"}
                    </span>
                  </Button>
                  {!targetUser.isPrivate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMessageUser}
                      className="rounded-xl gap-1.5 h-9 px-4 text-sm"
                    >
                      <MessageCircle size={13} />
                      Message
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Profile info */}
        {!editing ? (
          <div className="space-y-4">
            {/* Name + username */}
            <div className="space-y-1">
              {targetUser.fullName && (
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {targetUser.fullName}
                </h2>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold gradient-text">
                  @{targetUser.username}
                </span>
                {targetUser.isPrivate && (
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full text-xs h-5 px-2"
                  >
                    <Lock size={9} />
                    Private
                  </Badge>
                )}
                {targetUser.onlineStatus && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-online-dot inline-block online-pulse" />
                    Active now
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {targetUser.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed max-w-sm">
                {targetUser.bio}
              </p>
            )}

            {/* Website */}
            {targetUser.websiteUrl && (
              <a
                href={
                  targetUser.websiteUrl.startsWith("http")
                    ? targetUser.websiteUrl
                    : `https://${targetUser.websiteUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink size={13} />
                {targetUser.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {memberSince && (
                <span className="flex items-center gap-1">
                  <Star size={11} />
                  Joined {memberSince}
                </span>
              )}
              {birthDateFormatted && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {birthDateFormatted}
                </span>
              )}
              {targetUser.timezone && (
                <span className="flex items-center gap-1">
                  <Globe size={11} />
                  {targetUser.timezone}
                </span>
              )}
            </div>

            {/* Stats bar */}
            <div className="flex gap-6 py-3 border-t border-b border-border">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-bold leading-tight tabular-nums">
                  {targetUser.followers.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Followers
                </span>
              </div>
              <div className="w-px bg-border" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-bold leading-tight tabular-nums">
                  {targetUser.following.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Following
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Edit form ── */
          <div className="space-y-5">
            <h2 className="font-bold text-base text-foreground">
              Edit Profile
            </h2>

            {/* Avatar URL */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Profile Picture URL
              </Label>
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={form.profilePicture || targetUser.profilePicture}
                  username={targetUser.username}
                  size="sm"
                  showOnline={false}
                />
                <Input
                  value={form.profilePicture}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, profilePicture: e.target.value }))
                  }
                  placeholder="https://..."
                  className="rounded-xl text-sm flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User size={11} /> Full Name
                </Label>
                <Input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fullName: e.target.value }))
                  }
                  placeholder="Your full name"
                  className="rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Phone size={11} /> Phone
                </Label>
                <Input
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phoneNumber: e.target.value }))
                  }
                  placeholder="+1 234 567 890"
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar size={11} /> Birth Date
                </Label>
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, birthDate: e.target.value }))
                  }
                  className="rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Globe size={11} /> Timezone
                </Label>
                <Input
                  value={form.timezone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, timezone: e.target.value }))
                  }
                  placeholder="UTC, EST, PST..."
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Link2 size={11} /> Website URL
              </Label>
              <Input
                value={form.websiteUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, websiteUrl: e.target.value }))
                }
                placeholder="https://yoursite.com"
                className="rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Bio
              </Label>
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

            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
              <div>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Lock size={13} />
                  Private account
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

        {/* Incoming follow requests — own profile only */}
        {isOwnProfile && incomingRequests.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <UserPlus size={14} className="text-primary" />
                Follow Requests
              </p>
              <Badge className="text-xs rounded-full gradient-btn text-white border-0">
                {incomingRequests.length}
              </Badge>
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

        {/* Bio/detail cards visible on profile */}
        {!editing && isOwnProfile && (
          <div className="mt-6 mb-8 space-y-3">
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pt-1">
              Account Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {targetUser.email && (
                <InfoCard
                  icon={<User size={13} />}
                  label="Email"
                  value={targetUser.email}
                />
              )}
              {targetUser.phoneNumber && (
                <InfoCard
                  icon={<Phone size={13} />}
                  label="Phone"
                  value={targetUser.phoneNumber}
                />
              )}
              {birthDateFormatted && (
                <InfoCard
                  icon={<Calendar size={13} />}
                  label="Birthday"
                  value={birthDateFormatted}
                />
              )}
              {targetUser.timezone && (
                <InfoCard
                  icon={<Globe size={13} />}
                  label="Timezone"
                  value={targetUser.timezone}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center mt-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
      <span className="text-primary flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
