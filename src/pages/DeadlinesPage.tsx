import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Plus, CalendarIcon, Trash2, Edit2, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Deadline = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: string;
  subject: string | null;
  due_date: string;
  priority: string;
  completed: boolean;
  completed_at: string | null;
};

type FormData = {
  title: string;
  description: string;
  type: string;
  subject: string;
  due_date: Date | undefined;
  priority: string;
};

const defaultForm: FormData = {
  title: "",
  description: "",
  type: "assignment",
  subject: "",
  due_date: undefined,
  priority: "medium",
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "bg-destructive text-destructive-foreground", icon: AlertTriangle },
  medium: { label: "Medium", color: "bg-warning text-warning-foreground", icon: Clock },
  low: { label: "Low", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

const TYPE_OPTIONS = [
  { value: "assignment", label: "Assignment" },
  { value: "exam", label: "Exam" },
  { value: "project", label: "Project" },
  { value: "quiz", label: "Quiz" },
  { value: "other", label: "Other" },
];

function getDueLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Due today";
  if (isTomorrow(date)) return "Due tomorrow";
  if (isPast(date)) return "Overdue";
  const days = differenceInDays(date, new Date());
  return `${days} day${days !== 1 ? "s" : ""} left`;
}

function getDueColor(dateStr: string, completed: boolean) {
  if (completed) return "text-muted-foreground";
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return "text-destructive";
  if (isToday(date) || isTomorrow(date)) return "text-warning";
  return "text-muted-foreground";
}

export default function DeadlinesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [tab, setTab] = useState("upcoming");

  const { data: deadlines = [] } = useQuery({
    queryKey: ["deadlines", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deadlines")
        .select("*")
        .eq("user_id", user!.id)
        .order("due_date");
      if (error) throw error;
      return data as Deadline[];
    },
    enabled: !!user,
  });

  const upcoming = deadlines.filter((d) => !d.completed);
  const completed = deadlines.filter((d) => d.completed);

  const upsertMutation = useMutation({
    mutationFn: async (data: FormData & { id?: string }) => {
      if (!data.due_date) throw new Error("Due date required");
      const payload = {
        user_id: user!.id,
        title: data.title,
        description: data.description || null,
        type: data.type,
        subject: data.subject || null,
        due_date: data.due_date.toISOString(),
        priority: data.priority,
      };
      if (data.id) {
        const { error } = await supabase.from("deadlines").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deadlines").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      setDialogOpen(false);
      setEditingDeadline(null);
      setForm(defaultForm);
      toast.success(editingDeadline ? "Deadline updated" : "Deadline added");
    },
    onError: () => toast.error("Something went wrong"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("deadlines")
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deadlines"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deadlines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      toast.success("Deadline removed");
    },
  });

  const openEdit = (d: Deadline) => {
    setEditingDeadline(d);
    setForm({
      title: d.title,
      description: d.description || "",
      type: d.type,
      subject: d.subject || "",
      due_date: new Date(d.due_date),
      priority: d.priority,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.due_date) return toast.error("Due date is required");
    upsertMutation.mutate({ ...form, id: editingDeadline?.id });
  };

  const renderDeadlineCard = (d: Deadline) => {
    const priorityCfg = PRIORITY_CONFIG[d.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
    const PriorityIcon = priorityCfg.icon;

    return (
      <div
        key={d.id}
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-all",
          d.completed && "opacity-60"
        )}
      >
        <Checkbox
          checked={d.completed}
          onCheckedChange={(checked) => toggleMutation.mutate({ id: d.id, completed: !!checked })}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("font-medium text-sm", d.completed && "line-through text-muted-foreground")}>
              {d.title}
            </p>
            <Badge variant="outline" className="text-[10px] capitalize">{d.type}</Badge>
            <Badge className={cn("text-[10px]", priorityCfg.color)}>
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priorityCfg.label}
            </Badge>
          </div>
          {d.subject && <p className="text-xs text-muted-foreground mt-0.5">{d.subject}</p>}
          {d.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>}
          <p className={cn("text-xs mt-1.5 font-medium", getDueColor(d.due_date, d.completed))}>
            {d.completed ? `Completed ${d.completed_at ? format(new Date(d.completed_at), "MMM d") : ""}` : getDueLabel(d.due_date)}
            {!d.completed && ` · ${format(new Date(d.due_date), "MMM d, yyyy 'at' h:mm a")}`}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(d.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Deadlines</h1>
            <p className="text-muted-foreground text-sm mt-1">Track assignments, exams, and projects</p>
          </div>
          <Button onClick={() => { setEditingDeadline(null); setForm(defaultForm); setDialogOpen(true); }} className="gradient-hero text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" /> Add Deadline
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Upcoming", count: upcoming.length, color: "text-primary" },
            { label: "Overdue", count: upcoming.filter((d) => isPast(new Date(d.due_date)) && !isToday(new Date(d.due_date))).length, color: "text-destructive" },
            { label: "Completed", count: completed.length, color: "text-success" },
          ].map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4 text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-2 mt-4">
            {upcoming.length > 0 ? upcoming.map(renderDeadlineCard) : (
              <p className="text-center text-muted-foreground py-12 text-sm">No upcoming deadlines. Add one to get started!</p>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-2 mt-4">
            {completed.length > 0 ? completed.map(renderDeadlineCard) : (
              <p className="text-center text-muted-foreground py-12 text-sm">No completed deadlines yet.</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">{editingDeadline ? "Edit Deadline" : "Add Deadline"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Math Assignment 3" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.due_date ? format(form.due_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.due_date} onSelect={(d) => setForm({ ...form, due_date: d })} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes..." rows={3} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {editingDeadline && (
                  <Button type="button" variant="destructive" onClick={() => { deleteMutation.mutate(editingDeadline.id); setDialogOpen(false); }}>
                    Delete
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
