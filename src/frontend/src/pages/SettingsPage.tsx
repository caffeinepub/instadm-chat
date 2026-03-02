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
  Clock,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  Globe,
  Link2,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  NotebookPen,
  Palette,
  Phone,
  Plus,
  Save,
  Shield,
  Smile,
  Sun,
  TextCursor,
  Trash2,
  User,
  UserX,
  X,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useTheme } from "../contexts/ThemeContext";
import { extractPlainBio } from "../services/bioStorageService";
import {
  ACCENT_COLORS,
  type ChatFolder,
  type LastSeenPrivacy,
  type MoodOption,
  applyAccentColor,
  applyBubbleStyle,
  applyFontSize,
  createChatFolder,
  deleteChatFolder,
  formatScreenTime,
  getAccentColor,
  getBubbleStyle,
  getChatFolders,
  getCustomReactions,
  getFontSize,
  getLastSeenPrivacy,
  getMood,
  getNote,
  getTodayScreenTime,
  getWeekScreenTime,
  saveCustomReactions,
  setAccentColorPref,
  setBubbleStylePref,
  setFontSizePref,
  setLastSeenPrivacy,
  setMood,
  setNote,
} from "../services/featureService";

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

  const [bio, setBio] = useState(() => extractPlainBio(currentUser?.bio ?? ""));
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

  // Note / short status
  const [noteText, setNoteText] = useState(() =>
    currentUser ? getNote(currentUser.uid) : "",
  );

  const handleNoteSave = () => {
    if (!currentUser) return;
    setNote(currentUser.uid, noteText);
    toast.success(noteText.trim() ? "Note updated" : "Note cleared");
  };

  const [currentMood, setCurrentMoodState] = useState<MoodOption>(() =>
    currentUser ? getMood(currentUser.uid) : "",
  );

  // Appearance prefs
  const [fontSize, setFontSizeState] = useState(() => getFontSize());
  const [bubbleStyle, setBubbleStyleState] = useState(() => getBubbleStyle());
  const [accentColor, setAccentColorState] = useState(() => getAccentColor());
  const todayTime = getTodayScreenTime();
  const weekTime = getWeekScreenTime();

  const handleFontSizeChange = (size: "small" | "medium" | "large") => {
    setFontSizeState(size);
    setFontSizePref(size);
    applyFontSize();
  };
  const handleBubbleStyleChange = (style: "classic" | "sharp" | "round") => {
    setBubbleStyleState(style);
    setBubbleStylePref(style);
    applyBubbleStyle();
  };
  const handleAccentColorChange = (oklch: string) => {
    setAccentColorState(oklch);
    setAccentColorPref(oklch);
    applyAccentColor();
  };

  const MOOD_OPTIONS: MoodOption[] = [
    "🟢 Available",
    "🔴 Busy",
    "🎮 Gaming",
    "💼 At work",
    "🌙 Away",
    "🎵 Listening",
    "✈️ Traveling",
    "",
  ];
  const handleMoodChange = (mood: MoodOption) => {
    if (!currentUser) return;
    setMood(currentUser.uid, mood);
    setCurrentMoodState(mood);
  };

  // Custom reactions
  const [customReactions, setCustomReactionsState] = useState<string[]>(() =>
    currentUser ? getCustomReactions(currentUser.uid) : [],
  );
  const [newCustomEmoji, setNewCustomEmoji] = useState("");

  // Last seen privacy
  const [lastSeenPrivacy, setLastSeenPrivacyState] = useState<LastSeenPrivacy>(
    () => (currentUser ? getLastSeenPrivacy(currentUser.uid) : "everyone"),
  );

  // Chat folders
  const [chatFolders, setChatFoldersState] = useState<ChatFolder[]>(() =>
    currentUser ? getChatFolders(currentUser.uid) : [],
  );
  const [newFolderName, setNewFolderName] = useState("");

  const handleLastSeenPrivacyChange = (privacy: LastSeenPrivacy) => {
    if (!currentUser) return;
    setLastSeenPrivacy(currentUser.uid, privacy);
    setLastSeenPrivacyState(privacy);
  };

  const handleCreateFolder = () => {
    if (!currentUser || !newFolderName.trim()) return;
    const colors = ["#E1306C", "#833AB4", "#0083B0", "#11998e", "#F7971E"];
    const color = colors[chatFolders.length % colors.length];
    createChatFolder(currentUser.uid, newFolderName.trim(), color);
    setChatFoldersState(getChatFolders(currentUser.uid));
    setNewFolderName("");
    toast.success("Folder created");
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!currentUser) return;
    deleteChatFolder(currentUser.uid, folderId);
    setChatFoldersState(getChatFolders(currentUser.uid));
    toast.success("Folder deleted");
  };

  const handleAddCustomReaction = () => {
    if (!currentUser || !newCustomEmoji.trim()) return;
    const emoji = newCustomEmoji.trim();
    if (customReactions.includes(emoji)) {
      toast.error("Emoji already added");
      return;
    }
    if (customReactions.length >= 5) {
      toast.error("Maximum 5 custom reactions allowed");
      return;
    }
    const updated = [...customReactions, emoji];
    saveCustomReactions(currentUser.uid, updated);
    setCustomReactionsState(updated);
    setNewCustomEmoji("");
    toast.success("Custom reaction added");
  };

  const handleRemoveCustomReaction = (emoji: string) => {
    if (!currentUser) return;
    const updated = customReactions.filter((e) => e !== emoji);
    saveCustomReactions(currentUser.uid, updated);
    setCustomReactionsState(updated);
  };

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
              {extractPlainBio(currentUser?.bio || "") ||
                "No bio yet — tap to edit"}
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

        {/* Note section */}
        <SettingSection
          title="Note"
          icon={<NotebookPen size={13} />}
          description="A short status visible on your profile (60 chars)"
        >
          <div className="px-5 pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value.slice(0, 60))}
                placeholder="What's on your mind?"
                className="rounded-xl text-sm flex-1"
                maxLength={60}
              />
              <Button
                size="sm"
                className="rounded-xl gradient-btn flex-shrink-0"
                onClick={handleNoteSave}
              >
                <span className="text-white text-xs">Save</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {noteText.length}/60
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

        {/* Theme — Accent Color */}
        <SettingSection
          title="Theme"
          icon={<Palette size={13} />}
          description="Customize app accent color"
        >
          <div className="px-5 pb-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Accent Color
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((ac) => (
                  <button
                    key={ac.oklch}
                    type="button"
                    title={ac.name}
                    onClick={() => handleAccentColorChange(ac.oklch)}
                    className={`accent-swatch ${accentColor === ac.oklch ? "selected" : ""}`}
                    style={{
                      background: `oklch(${ac.oklch})`,
                      color: `oklch(${ac.oklch})`,
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Current:{" "}
                <span
                  className="font-semibold"
                  style={{ color: `oklch(${accentColor})` }}
                >
                  {ACCENT_COLORS.find((c) => c.oklch === accentColor)?.name ??
                    "Custom"}
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Font Size
              </p>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleFontSizeChange(size)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                      fontSize === size
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Chat Bubble Style
              </p>
              <div className="flex gap-2">
                {(["classic", "sharp", "round"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => handleBubbleStyleChange(style)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                      bubbleStyle === style
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SettingSection>

        <Separator />

        {/* Screen Time */}
        <SettingSection
          title="Screen Time"
          icon={<Clock size={13} />}
          description="Track your time spent on Linkr"
        >
          <div className="px-5 pb-4">
            <div className="flex rounded-xl bg-muted/30 border border-border overflow-hidden">
              <div className="flex-1 flex flex-col items-center py-4">
                <span className="text-xl font-bold tabular-nums text-primary">
                  {formatScreenTime(todayTime)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  Today
                </span>
              </div>
              <div className="w-px bg-border" />
              <div className="flex-1 flex flex-col items-center py-4">
                <span className="text-xl font-bold tabular-nums text-primary">
                  {formatScreenTime(weekTime)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  This week
                </span>
              </div>
            </div>
          </div>
        </SettingSection>

        <Separator />

        {/* Status / Mood */}
        <SettingSection
          title="Status / Mood"
          icon={<Zap size={13} />}
          description="Let friends know what you're up to"
        >
          <div className="px-5 pb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood || "clear"}
                  type="button"
                  onClick={() => handleMoodChange(mood)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    currentMood === mood
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {mood || "Clear status"}
                </button>
              ))}
            </div>
            {currentMood && (
              <p className="text-xs text-muted-foreground">
                Current:{" "}
                <span className="font-medium text-foreground">
                  {currentMood}
                </span>
              </p>
            )}
          </div>
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

        {/* Last Seen Privacy */}
        <SettingSection
          title="Last Seen"
          icon={<Eye size={13} />}
          description="Control who can see your last active status"
        >
          <div className="px-5 pb-4 space-y-2">
            {(
              [
                {
                  value: "everyone",
                  label: "Everyone",
                  icon: <Eye size={14} />,
                },
                {
                  value: "followers",
                  label: "My Followers",
                  icon: <Shield size={14} />,
                },
                {
                  value: "nobody",
                  label: "Nobody",
                  icon: <EyeOff size={14} />,
                },
              ] as {
                value: LastSeenPrivacy;
                label: string;
                icon: React.ReactNode;
              }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleLastSeenPrivacyChange(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                  lastSeenPrivacy === opt.value
                    ? "border-primary bg-primary/8 text-primary"
                    : "border-border text-foreground hover:border-primary/30"
                }`}
              >
                <span
                  className={
                    lastSeenPrivacy === opt.value
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {opt.icon}
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
                {lastSeenPrivacy === opt.value && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </SettingSection>

        <Separator />

        {/* Chat Folders */}
        <SettingSection
          title="Chat Folders"
          icon={<Folder size={13} />}
          description="Organize your chats into custom folders"
        >
          <div className="px-5 pb-4 space-y-3">
            {chatFolders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No folders yet</p>
            ) : (
              <div className="space-y-1.5">
                {chatFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: folder.color }}
                    />
                    <span className="text-sm font-medium flex-1">
                      {folder.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {folder.chatIds.length} chat
                      {folder.chatIds.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder="New folder name..."
                className="flex-1 rounded-xl h-9 text-sm"
                maxLength={20}
              />
              <Button
                size="sm"
                className="rounded-xl h-9 px-3 gradient-btn gap-1.5"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                <FolderPlus size={13} className="text-white" />
                <span className="text-white text-xs">Add</span>
              </Button>
            </div>
          </div>
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

        {/* Custom Reactions */}
        <SettingSection
          title="Custom Reactions"
          icon={<Smile size={13} />}
          description="Add up to 5 custom emoji for quick reactions"
        >
          <div className="px-5 pb-4 pt-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              {customReactions.map((emoji) => (
                <div
                  key={emoji}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted/70 border border-border/60 group"
                >
                  <span className="text-lg">{emoji}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomReaction(emoji)}
                    className="text-muted-foreground hover:text-destructive ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {customReactions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No custom reactions yet
                </p>
              )}
            </div>
            {customReactions.length < 5 && (
              <div className="flex items-center gap-2">
                <Input
                  value={newCustomEmoji}
                  onChange={(e) => setNewCustomEmoji(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddCustomReaction()
                  }
                  placeholder="Paste emoji here..."
                  className="flex-1 rounded-xl h-9 text-sm"
                  maxLength={4}
                />
                <Button
                  size="sm"
                  className="rounded-xl h-9 px-3 gradient-btn gap-1.5"
                  onClick={handleAddCustomReaction}
                  disabled={!newCustomEmoji.trim()}
                >
                  <Plus size={13} className="text-white" />
                  <span className="text-white text-xs">Add</span>
                </Button>
              </div>
            )}
          </div>
        </SettingSection>

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
