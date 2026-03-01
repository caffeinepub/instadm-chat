import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckSquare, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  type TodoItem,
  addTodo,
  deleteTodo,
  getTodos,
  toggleTodo,
} from "../../services/featureService";

interface TodoListPanelProps {
  chatId: string;
  currentUid: string;
  onClose: () => void;
}

export function TodoListPanel({
  chatId,
  currentUid,
  onClose,
}: TodoListPanelProps) {
  const [todos, setTodos] = useState<TodoItem[]>(() => getTodos(chatId));
  const [inputText, setInputText] = useState("");

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text) return;
    const updated = addTodo(chatId, text, currentUid);
    setTodos(updated);
    setInputText("");
  };

  const handleToggle = (id: string) => {
    const updated = toggleTodo(chatId, id);
    setTodos(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteTodo(chatId, id);
    setTodos(updated);
  };

  const doneTodos = todos.filter((t) => t.done);
  const pendingTodos = todos.filter((t) => !t.done);

  return (
    <div className="fixed inset-y-0 right-0 w-72 bg-background border-l border-border z-30 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <CheckSquare size={16} className="text-primary" />
        <h3 className="font-semibold text-sm flex-1">Shared To-Do List</h3>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={onClose}
        >
          <X size={14} />
        </Button>
      </div>

      {/* Add item */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task..."
          className="rounded-xl h-8 text-sm flex-1"
        />
        <Button
          size="icon"
          onClick={handleAdd}
          disabled={!inputText.trim()}
          className="w-8 h-8 rounded-xl gradient-btn flex-shrink-0"
        >
          <Plus size={14} className="text-white" />
        </Button>
      </div>

      {/* Todos */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-2">
          {todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckSquare size={28} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground text-center">
                No tasks yet. Add one above!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-accent/40 group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(todo.id)}
                    className="w-4 h-4 rounded border border-border flex-shrink-0 hover:border-primary transition-colors flex items-center justify-center"
                  />
                  <span className="flex-1 text-sm min-w-0 break-words">
                    {todo.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(todo.id)}
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}

              {doneTodos.length > 0 && (
                <>
                  <div className="pt-2 pb-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Completed ({doneTodos.length})
                    </p>
                  </div>
                  {doneTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-accent/40 group"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggle(todo.id)}
                        className="w-4 h-4 rounded border border-primary/50 bg-primary/10 flex-shrink-0 flex items-center justify-center"
                      >
                        <span className="text-[10px] text-primary">✓</span>
                      </button>
                      <span className="flex-1 text-sm min-w-0 line-through text-muted-foreground break-words">
                        {todo.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(todo.id)}
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
