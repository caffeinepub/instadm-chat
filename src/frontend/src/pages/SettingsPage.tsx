import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  Calendar,
  ChevronRight,
  Globe,
  Link2,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Phone,
  Save,
  Shield,
  Sun,
  Trash2,
  User,
  UserX,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useTheme } from "../contexts/ThemeContext";

export function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, logout, deleteAccount, updateProfile } = useAuth();

  // Enable scrolling on sub-page
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);
  const { users, refreshChats } = useChat();
  const { theme, toggleTheme } = useTheme();

  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [profilePicture, setProfilePicture] = useState(
    currentUser?.profilePicture ?? "",
  );
  const [fullName, setFullName] = useState(currentUser?.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(
    currentUser?.phoneNumber ?? "",
  );
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate ?? "");
  const [timezone, setTimezone] = useState(currentUser?.timezone ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(currentUser?.websiteUrl ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const blockedUsers = Object.values(users).filter((u) =>
    currentUser?.blockedUsers?.includes(u.uid),
  );

  const handleUnblock = async (uid: string) => {
    if (!currentUser) return;
    await updateProfile({
      blockedUsers: currentUser.blockedUsers.filter((b) => b !== uid),
    });
    refreshChats();
    toast.success("User unblocked");
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    await updateProfile({
      bio: bio.trim(),
      profilePicture: profilePicture.trim(),
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      birthDate: birthDate.trim(),
      timezone: timezone.trim(),
      websiteUrl: websiteUrl.trim(),
    });
    setIsSaving(false);
    toast.success("Settings saved");
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Account deleted");
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Header */}
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
          className="font-bold text-lg flex-1 tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Settings
        </h1>
        <Button
          size="sm"
          className="rounded-xl gap-1.5 gradient-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 size={13} className="animate-spin text-white" />
          ) : (
            <Save size={13} className="text-white" />
          )}
          <span className="text-white text-xs">Save</span>
        </Button>
      </div>

      <div className="max-w-lg mx-auto pb-10">
        {/* Profile card */}
        <button
          type="button"
          onClick={() => navigate({ to: `/profile/${currentUser?.username}` })}
          className="flex items-center gap-4 px-5 py-4 w-full hover:bg-accent/60 transition-colors"
        >
          <div className="relative">
            <UserAvatar
              src={currentUser?.profilePicture}
              username={currentUser?.username ?? "?"}
              isOnline
              size="lg"
            />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-base truncate">
              @{currentUser?.username}
            </p>
            {currentUser?.fullName && (
              <p className="text-sm text-foreground/70 truncate">
                {currentUser.fullName}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {currentUser?.bio || "No bio yet — tap to edit"}
            </p>
          </div>
          <ChevronRight
            size={16}
            className="text-muted-foreground flex-shrink-0"
          />
        </button>

        {/* Stats mini bar */}
        <div className="flex mx-5 mb-3 rounded-xl bg-muted/30 border border-border overflow-hidden">
          <div className="flex-1 flex flex-col items-center py-3">
            <span className="text-base font-bold tabular-nums">
              {currentUser?.followers?.length ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Followers
            </span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 flex flex-col items-center py-3">
            <span className="text-base font-bold tabular-nums">
              {currentUser?.following?.length ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Following
            </span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 flex flex-col items-center py-3">
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Member since
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {currentUser?.createdAt
                ? new Date(currentUser.createdAt).toLocaleDateString([], {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </div>

        <Separator />

        {/* Personal Info section */}
        <SettingSection
          title="Personal Info"
          icon={<User size={13} />}
          description="Your public-facing profile information"
        >
          <div className="px-5 pb-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="settings-label">
                  <User size={10} /> Full Name
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="settings-label">
                  <Phone size={10} /> Phone Number
                </Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 234 567 890"
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="settings-label">
                  <Calendar size={10} /> Birth Date
                </Label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="settings-label">
                  <Globe size={10} /> Timezone
                </Label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="UTC, EST, PST..."
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="settings-label">
                <Link2 size={10} /> Website URL
              </Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="rounded-xl text-sm"
              />
            </div>
          </div>
        </SettingSection>

        <Separator />

        {/* Bio section */}
        <SettingSection
          title="Bio"
          icon={<MessageSquare size={13} />}
          description="A short description about yourself"
        >
          <div className="px-5 pb-4 space-y-2">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={3}
              maxLength={160}
              className="rounded-xl resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/160
            </p>
          </div>
        </SettingSection>

        <Separator />

        {/* Avatar section */}
        <SettingSection
          title="Profile Picture"
          icon={<User size={13} />}
          description="Your profile avatar URL"
        >
          <div className="px-5 pb-4 space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={profilePicture || currentUser?.profilePicture}
                username={currentUser?.username ?? "?"}
                size="md"
                showOnline={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">
                  Paste an image URL or upload from your profile page
                </p>
                <Input
                  value={profilePicture}
                  onChange={(e) => setProfilePicture(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        </SettingSection>

        <Separator />

        {/* Appearance */}
        <SettingSection title="Appearance" icon={<Sun size={13} />}>
          <SettingRow
            icon={
              theme === "dark" ? (
                <Moon size={15} className="text-primary" />
              ) : (
                <Sun size={15} className="text-amber-500" />
              )
            }
            label="Dark mode"
            description={
              theme === "dark" ? "Enjoying the dark side" : "Light mode active"
            }
            right={
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            }
          />
        </SettingSection>

        <Separator />

        {/* Privacy */}
        <SettingSection title="Privacy & Security" icon={<Shield size={13} />}>
          <SettingRow
            icon={<Lock size={15} className="text-primary" />}
            label="Private account"
            description="Only approved followers can message you"
            right={
              <Switch
                checked={currentUser?.isPrivate ?? false}
                onCheckedChange={(v) => updateProfile({ isPrivate: v })}
              />
            }
          />
          <SettingRow
            icon={<Bell size={15} className="text-primary" />}
            label="Notifications"
            description="Manage push notification preferences"
            right={<ChevronRight size={16} className="text-muted-foreground" />}
          />
          <SettingRow
            icon={<BellOff size={15} className="text-muted-foreground" />}
            label="Muted conversations"
            description="Chats you've silenced"
            right={<ChevronRight size={16} className="text-muted-foreground" />}
          />
        </SettingSection>

        <Separator />

        {/* Chats */}
        <SettingSection title="Chats" icon={<MessageSquare size={13} />}>
          <SettingRow
            icon={<Archive size={15} className="text-muted-foreground" />}
            label="Archived chats"
            description="Conversations you've hidden"
            right={<ChevronRight size={16} className="text-muted-foreground" />}
            onClick={() => navigate({ to: "/archive" })}
          />
          <SettingRow
            icon={<MessageSquare size={15} className="text-muted-foreground" />}
            label="Message requests"
            description="Pending incoming messages"
            right={<ChevronRight size={16} className="text-muted-foreground" />}
            onClick={() => navigate({ to: "/requests" })}
          />
          <SettingRow
            icon={<Zap size={15} className="text-primary" />}
            label="Vanish mode"
            description="Messages disappear after being seen"
            right={
              <Badge variant="outline" className="text-xs rounded-full">
                Per chat
              </Badge>
            }
          />
        </SettingSection>

        {/* Blocked users */}
        {blockedUsers.length > 0 && (
          <>
            <Separator />
            <SettingSection
              title={`Blocked Users (${blockedUsers.length})`}
              icon={<UserX size={13} />}
            >
              {blockedUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 transition-colors"
                >
                  <UserAvatar
                    src={user.profilePicture}
                    username={user.username}
                    size="sm"
                    showOnline={false}
                  />
                  <span className="flex-1 text-sm font-medium">
                    @{user.username}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={() => handleUnblock(user.uid)}
                  >
                    <UserX size={11} />
                    Unblock
                  </Button>
                </div>
              ))}
            </SettingSection>
          </>
        )}

        <Separator />

        {/* Account */}
        <SettingSection title="Account" icon={<User size={13} />}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-3 w-full hover:bg-accent/60 transition-colors text-destructive"
          >
            <LogOut size={16} className="text-destructive" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">
                @{currentUser?.username}
              </p>
            </div>
          </button>
        </SettingSection>

        <Separator />

        {/* Danger Zone */}
        <SettingSection title="Danger Zone" icon={<Trash2 size={13} />}>
          <div className="px-5 pb-4 pt-1">
            <div className="rounded-xl border border-destructive/30 p-4 space-y-3 bg-destructive/5">
              <div>
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <Trash2 size={13} />
                  Delete Account
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Permanently delete your account, profile, and all your data.
                  This action cannot be undone.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-xl gap-2 w-full sm:w-auto"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {isDeleting ? "Deleting..." : "Delete my account"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Trash2 size={18} className="text-destructive" />
                      Delete your account?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm leading-relaxed">
                      This will permanently delete your account, profile, and
                      all your data including all chats and messages. This
                      action{" "}
                      <span className="font-semibold text-foreground">
                        cannot be undone
                      </span>
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SettingSection>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
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

function SettingSection({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        {icon && (
          <span className="text-muted-foreground flex-shrink-0">{icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">
            {title}
          </p>
          {description && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const cls =
    "flex items-center gap-3 px-5 py-3 w-full hover:bg-accent/60 transition-colors";
  const inner = (
    <>
      <span className="flex-shrink-0 w-5 flex items-center justify-center">
        {icon}
      </span>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {right}
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
