import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageSquare, UserPlus, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export function MessageRequestsPage() {
  const navigate = useNavigate();
  const {
    requests,
    users,
    acceptRequest,
    declineRequest,
    setActiveChatId,
    followRequests,
    acceptFollowRequest,
    declineFollowRequest,
    chats,
  } = useChat();
  const { currentUser } = useAuth();

  // Enable scrolling on sub-page
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  const pendingRequests = requests.filter(
    (r) => r.receiverId === currentUser?.uid && r.status === "pending",
  );

  // "Primary": accepted DM requests (active chats with non-followers)
  const acceptedRequests = requests.filter(
    (r) =>
      (r.receiverId === currentUser?.uid || r.senderId === currentUser?.uid) &&
      r.status === "accepted",
  );

  // "Requests" tab: pending follow requests
  const pendingFollowReqs = followRequests.filter(
    (r) => r.receiverId === currentUser?.uid && r.status === "pending",
  );

  const totalBadge = pendingRequests.length + pendingFollowReqs.length;

  const handleAccept = (requestId: string, chatId: string) => {
    acceptRequest(requestId);
    setActiveChatId(chatId);
    toast.success("Request accepted");
    navigate({ to: "/" });
  };

  const handleDecline = (requestId: string) => {
    declineRequest(requestId);
    toast.success("Request declined");
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
          className="font-bold text-lg tracking-tight flex-1"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Message Requests
        </h1>
        {totalBadge > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full text-xs font-bold min-w-[22px] h-5.5 px-1.5 flex items-center justify-center">
            {totalBadge}
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full mx-0 mt-0 grid grid-cols-3 h-10 bg-muted/60 rounded-none border-b border-border">
            <TabsTrigger value="primary" className="text-xs rounded-none gap-1">
              Primary
              {acceptedRequests.length > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full text-[9px] font-bold px-1.5 py-0.5">
                  {acceptedRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs rounded-none gap-1">
              General
              {pendingRequests.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-[9px] font-bold px-1.5 py-0.5">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="text-xs rounded-none gap-1"
            >
              Follow Reqs
              {pendingFollowReqs.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-[9px] font-bold px-1.5 py-0.5">
                  {pendingFollowReqs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Primary Tab */}
          <TabsContent value="primary" className="py-4">
            {acceptedRequests.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={26} strokeWidth={1.5} />}
                title="No accepted requests"
                description="Chats you've accepted will appear here"
              />
            ) : (
              <div className="space-y-1 px-2">
                {acceptedRequests.map((req) => {
                  const otherUid =
                    req.senderId === currentUser?.uid
                      ? req.receiverId
                      : req.senderId;
                  const other = users[otherUid];
                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => {
                        setActiveChatId(req.chatId);
                        navigate({ to: "/" });
                      }}
                      className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:bg-accent/50 transition-colors text-left"
                    >
                      <UserAvatar
                        src={other?.profilePicture}
                        username={other?.username ?? "?"}
                        isOnline={other?.onlineStatus}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {other?.username}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {chats.find((c) => c.id === req.chatId)
                            ?.lastMessage || "Open chat"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* General Tab (pending message requests) */}
          <TabsContent value="general" className="py-4">
            {pendingRequests.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={26} strokeWidth={1.5} />}
                title="No pending requests"
                description="Message requests from non-followers appear here"
              />
            ) : (
              <div className="space-y-1 px-2">
                <p className="text-sm text-muted-foreground px-2 pb-2">
                  {pendingRequests.length} pending{" "}
                  {pendingRequests.length === 1 ? "request" : "requests"}
                </p>
                {pendingRequests.map((req) => {
                  const sender = users[req.senderId];
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl"
                    >
                      <UserAvatar
                        src={sender?.profilePicture}
                        username={sender?.username ?? "?"}
                        size="md"
                        showOnline={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {sender?.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {req.previewMessage}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl gap-1"
                          onClick={() => handleDecline(req.id)}
                        >
                          <X size={12} />
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl gap-1"
                          onClick={() => handleAccept(req.id, req.chatId)}
                        >
                          <Check size={12} />
                          Accept
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab (follow requests) */}
          <TabsContent value="requests" className="py-4">
            {pendingFollowReqs.length === 0 ? (
              <EmptyState
                icon={<UserPlus size={26} strokeWidth={1.5} />}
                title="No follow requests"
                description="People who want to follow you appear here"
              />
            ) : (
              <div className="space-y-1 px-2">
                {pendingFollowReqs.map((req) => {
                  const sender = users[req.senderId];
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl"
                    >
                      <UserAvatar
                        src={sender?.profilePicture}
                        username={sender?.username ?? req.senderUsername ?? "?"}
                        size="md"
                        showOnline={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {sender?.username ?? req.senderUsername}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Wants to follow you
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl gap-1"
                          onClick={() => {
                            declineFollowRequest(req.id);
                            toast.success("Follow request declined");
                          }}
                        >
                          <X size={12} />
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl gradient-btn gap-1"
                          onClick={() => {
                            acceptFollowRequest(req.id);
                            toast.success("Follow request accepted");
                          }}
                        >
                          <span className="text-white text-xs flex items-center gap-1">
                            <Check size={12} />
                            Accept
                          </span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "oklch(var(--primary) / 0.08)",
          border: "1px solid oklch(var(--primary) / 0.12)",
        }}
      >
        <span className="text-primary/60">{icon}</span>
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-muted-foreground text-xs mt-1">{description}</p>
      </div>
    </div>
  );
}

// needed for React.ReactNode
import type React from "react";
