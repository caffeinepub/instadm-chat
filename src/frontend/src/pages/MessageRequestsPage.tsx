import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageSquare, X } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export function MessageRequestsPage() {
  const navigate = useNavigate();
  const { requests, users, acceptRequest, declineRequest, setActiveChatId } =
    useChat();
  const { currentUser } = useAuth();

  const pendingRequests = requests.filter(
    (r) => r.receiverId === currentUser?.uid && r.status === "pending",
  );

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
    <div className="min-h-dvh bg-background page-fade">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-bold text-lg">Message requests</h1>
      </div>

      <div className="max-w-lg mx-auto py-4">
        {pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No message requests</p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            <p className="text-sm text-muted-foreground px-2 pb-2">
              You have {pendingRequests.length} pending{" "}
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
                    <p className="font-semibold text-sm">{sender?.username}</p>
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
      </div>
    </div>
  );
}
