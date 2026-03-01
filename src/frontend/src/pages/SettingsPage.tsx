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
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Save,
  Sun,
  Trash2,
  UserX,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useTheme } from "../contexts/ThemeContext";

export function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, logout, deleteAccount, updateProfile } = useAuth();
  const { users, refreshChats } = useChat();
  const { theme, toggleTheme } = useTheme();

  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [profilePicture, setProfilePicture] = useState(
    currentUser?.profilePicture ?? "",
  );
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
          className="rounded-xl w-9 h-9"
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
          className="rounded-xl gap-1.5"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save
        </Button>
      </div>

      <div className="max-w-lg mx-auto py-4">
        {/* Profile card */}
        <button
          type="button"
          onClick={() => navigate({ to: `/profile/${currentUser?.username}` })}
          className="flex items-center gap-4 px-5 py-4 w-full hover:bg-accent transition-colors"
        >
          <UserAvatar
            src={currentUser?.profilePicture}
            username={currentUser?.username ?? "?"}
            isOnline
            size="lg"
          />
          <div className="flex-1 text-left">
            <p className="font-bold">@{currentUser?.username}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentUser?.bio || "No bio yet"}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>

        <Separator />

        {/* Profile editing */}
        <SettingSection title="Profile">
          <div className="px-5 pb-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Bio</Label>
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
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Avatar URL</Label>
              <Input
                value={profilePicture}
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="https://..."
                className="rounded-xl text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Paste a URL for your profile picture
              </p>
            </div>
          </div>
        </SettingSection>

        <Separator />

        {/* Appearance */}
        <SettingSection title="Appearance">
          <SettingRow
            icon={theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            label="Dark mode"
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
        <SettingSection title="Privacy">
          <SettingRow
            icon={<Lock size={16} />}
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
            icon={<Bell size={16} />}
            label="Notifications"
            right={<ChevronRight size={16} className="text-muted-foreground" />}
          />
        </SettingSection>

        <Separator />

        {/* Chats */}
        <SettingSection title="Chats">
          <SettingRow
            icon={<Archive size={16} />}
            label="Archived chats"
            right={<ChevronRight size={16} className="text-muted-foreground" />}
            onClick={() => navigate({ to: "/archive" })}
          />
          <SettingRow
            icon={<MessageSquare size={16} />}
            label="Message requests"
            right={<ChevronRight size={16} className="text-muted-foreground" />}
            onClick={() => navigate({ to: "/requests" })}
          />
        </SettingSection>

        {/* Blocked users */}
        {blockedUsers.length > 0 && (
          <>
            <Separator />
            <SettingSection title="Blocked users">
              {blockedUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 px-5 py-3"
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
                    className="rounded-xl text-xs gap-1"
                    onClick={() => handleUnblock(user.uid)}
                  >
                    <UserX size={12} />
                    Unblock
                  </Button>
                </div>
              ))}
            </SettingSection>
          </>
        )}

        <Separator />

        {/* Account */}
        <SettingSection title="Account">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-3 w-full hover:bg-accent transition-colors text-destructive rounded-lg"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </SettingSection>

        <Separator />

        {/* Danger Zone */}
        <SettingSection title="Danger Zone">
          <div className="px-5 pb-4 pt-1">
            <div className="rounded-xl border border-destructive/30 p-4 space-y-3 bg-destructive/5">
              <div>
                <p className="text-sm font-semibold text-destructive">
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
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground px-5 pt-4 pb-2 font-semibold uppercase tracking-widest">
        {title}
      </p>
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
    "flex items-center gap-3 px-5 py-3 w-full hover:bg-accent transition-colors rounded-lg";
  const inner = (
    <>
      <span className="text-muted-foreground flex-shrink-0 w-5 flex items-center justify-center">
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
