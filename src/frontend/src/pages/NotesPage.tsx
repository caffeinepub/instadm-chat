import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit3, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  type Note,
  deleteNote,
  getNotes,
  saveNote,
} from "../services/featureService";

export function NotesPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uid = currentUser!.uid;

  const [notes, setNotes] = useState<Note[]>(() => getNotes(uid));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");
  const [showNew, setShowNew] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  const handleCreate = () => {
    if (!newText.trim()) return;
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: newText.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveNote(uid, note);
    setNotes(getNotes(uid));
    setNewText("");
    setShowNew(false);
    toast.success("Note saved");
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.text);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated: Note = {
      id: editingId,
      text: editText.trim(),
      createdAt: notes.find((n) => n.id === editingId)?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    saveNote(uid, updated);
    setNotes(getNotes(uid));
    setEditingId(null);
    setEditText("");
    toast.success("Note updated");
  };

  const handleDelete = (noteId: string) => {
    deleteNote(uid, noteId);
    setNotes(getNotes(uid));
    if (editingId === noteId) setEditingId(null);
    toast.success("Note deleted");
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
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
          Notes to Self
        </h1>
        <Button
          size="sm"
          className="rounded-xl gap-1.5 gradient-btn"
          onClick={() => {
            setShowNew(true);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }}
        >
          <Plus size={14} className="text-white" />
          <span className="text-white text-xs">New Note</span>
        </Button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* New note form */}
        {showNew && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3 note-card">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">
              New Note
            </p>
            <Textarea
              ref={textareaRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Write something private..."
              rows={4}
              className="rounded-xl resize-none text-sm bg-background"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => {
                  setShowNew(false);
                  setNewText("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-xl gap-1.5 gradient-btn text-xs"
                onClick={handleCreate}
                disabled={!newText.trim()}
              >
                <Save size={12} className="text-white" />
                <span className="text-white">Save</span>
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {notes.length === 0 && !showNew && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Edit3
                size={28}
                className="text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="font-semibold text-sm">No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Private thoughts, reminders, or anything you want to remember
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-xl gradient-btn gap-1.5"
              onClick={() => setShowNew(true)}
            >
              <Plus size={14} className="text-white" />
              <span className="text-white">Create your first note</span>
            </Button>
          </div>
        )}

        {/* Notes list */}
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-2 note-card hover:border-primary/30 transition-colors"
              >
                {editingId === note.id ? (
                  <>
                    <Textarea
                      ref={textareaRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="rounded-xl resize-none text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 gradient-btn text-xs"
                        onClick={handleSaveEdit}
                      >
                        <Save size={12} className="text-white" />
                        <span className="text-white">Save</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {note.text}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Created {formatDate(note.createdAt)}
                        </p>
                        {note.updatedAt !== note.createdAt && (
                          <p className="text-[10px] text-muted-foreground">
                            Edited {formatDate(note.updatedAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 rounded-lg text-muted-foreground hover:text-primary"
                          onClick={() => handleStartEdit(note)}
                        >
                          <Edit3 size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
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
