import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM
const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

type TimetableEntry = {
  id: string;
  user_id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
  professor: string | null;
  color: string;
};

type FormData = {
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  professor: string;
  color: string;
};

const defaultForm: FormData = {
  subject: "",
  day_of_week: 0,
  start_time: "09:00",
  end_time: "10:00",
  location: "",
  professor: "",
  color: COLORS[0],
};

export default function TimetablePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);

  const { data: entries = [] } = useQuery({
    queryKey: ["timetable", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_time");
      if (error) throw error;
      return data as TimetableEntry[];
    },
    enabled: !!user,
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: FormData & { id?: string }) => {
      const payload = {
        user_id: user!.id,
        subject: data.subject,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location || null,
        professor: data.professor || null,
        color: data.color,
      };
      if (data.id) {
        const { error } = await supabase.from("timetable_entries").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timetable_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      setDialogOpen(false);
      setEditingEntry(null);
      setForm(defaultForm);
      toast.success(editingEntry ? "Class updated" : "Class added");
    },
    onError: () => toast.error("Something went wrong"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      toast.success("Class removed");
    },
  });

  const openAdd = (day?: number, hour?: number) => {
    setEditingEntry(null);
    setForm({
      ...defaultForm,
      day_of_week: day ?? 0,
      start_time: hour ? `${String(hour).padStart(2, "0")}:00` : "09:00",
      end_time: hour ? `${String(hour + 1).padStart(2, "0")}:00` : "10:00",
    });
    setDialogOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setForm({
      subject: entry.subject,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      location: entry.location || "",
      professor: entry.professor || "",
      color: entry.color,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return toast.error("Subject is required");
    upsertMutation.mutate({ ...form, id: editingEntry?.id });
  };

  const getEntryStyle = (entry: TimetableEntry) => {
    const startHour = parseInt(entry.start_time.split(":")[0]);
    const startMin = parseInt(entry.start_time.split(":")[1]);
    const endHour = parseInt(entry.end_time.split(":")[0]);
    const endMin = parseInt(entry.end_time.split(":")[1]);
    const top = ((startHour - 7) * 60 + startMin) * (64 / 60);
    const height = ((endHour - startHour) * 60 + (endMin - startMin)) * (64 / 60);
    return { top: `${top}px`, height: `${Math.max(height, 28)}px` };
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Timetable</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your weekly class schedule</p>
          </div>
          <Button onClick={() => openAdd()} className="gradient-hero text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" /> Add Class
          </Button>
        </div>

        {/* Weekly grid */}
        <Card className="border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30">
                  <div className="p-2" />
                  {DAYS.map((day, i) => (
                    <div key={day} className="p-3 text-center text-sm font-semibold text-foreground border-l border-border">
                      <span className="hidden md:inline">{day}</span>
                      <span className="md:hidden">{day.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                  {/* Time labels */}
                  <div className="relative">
                    {HOURS.map((hour) => (
                      <div key={hour} className="h-16 border-b border-border flex items-start justify-end pr-2 pt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {DAYS.map((_, dayIndex) => (
                    <div key={dayIndex} className="relative border-l border-border">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="h-16 border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                          onClick={() => openAdd(dayIndex, hour)}
                        />
                      ))}

                      {/* Entries */}
                      {entries
                        .filter((e) => e.day_of_week === dayIndex)
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-white overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                            style={{ ...getEntryStyle(entry), backgroundColor: entry.color }}
                            onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                          >
                            <p className="text-xs font-semibold truncate leading-tight">{entry.subject}</p>
                            <p className="text-[10px] opacity-80 truncate">{entry.location}</p>
                            <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                              <button
                                className="p-0.5 rounded bg-black/20 hover:bg-black/40"
                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(entry.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">{editingEntry ? "Edit Class" : "Add Class"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
              </div>

              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room 101" />
                </div>
                <div className="space-y-2">
                  <Label>Professor</Label>
                  <Input value={form.professor} onChange={(e) => setForm({ ...form, professor: e.target.value })} placeholder="Dr. Smith" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {editingEntry && (
                  <Button type="button" variant="destructive" onClick={() => { deleteMutation.mutate(editingEntry.id); setDialogOpen(false); }}>
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
