import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export function JoinGroupPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { groupChats, setActiveGroupChatId } = useChat();
  // Get groupId from URL path manually
  const pathParts = window.location.pathname.split("/");
  const groupId = pathParts[pathParts.length - 1] ?? "";

  const group = groupChats.find((g) => g.id === groupId);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate({ to: "/login" });
    }
  }, [currentUser, navigate]);

  const handleJoin = () => {
    if (group) {
      setActiveGroupChatId(group.id);
      setJoined(true);
      toast.success(`Joined ${group.name}!`);
      setTimeout(() => navigate({ to: "/" }), 800);
    } else {
      toast.info("Group not found. Ask the admin to add you directly.");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full rounded-3xl border border-border bg-card p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl group-icon-gradient flex items-center justify-center mx-auto">
          <Users size={28} className="text-white" />
        </div>

        {group ? (
          <>
            <div>
              <h1
                className="font-bold text-xl tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {group.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {group.members.length} members
              </p>
              {group.description && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {group.description}
                </p>
              )}
            </div>
            <Button
              className="w-full rounded-xl gradient-btn"
              onClick={handleJoin}
              disabled={joined}
            >
              <span className="text-white font-semibold">
                {joined ? "Joined! Redirecting..." : "Join Group"}
              </span>
            </Button>
          </>
        ) : (
          <>
            <div>
              <h1
                className="font-bold text-xl tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Group Invite
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                This group may be private or the link has expired. Ask the group
                admin to add you directly.
              </p>
            </div>
            <Button
              className="w-full rounded-xl"
              variant="outline"
              onClick={() => navigate({ to: "/" })}
            >
              Go to Linkr
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
