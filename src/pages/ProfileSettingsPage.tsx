import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, Mail, Building2, IdCard } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: "",
    rollNumber: "",
    institution: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name ?? "",
        rollNumber: profile.roll_number ?? "",
        institution: profile.institution ?? "",
      });
      return;
    }

    if (user) {
      setForm({
        fullName: String(user.user_metadata?.full_name ?? ""),
        rollNumber: String(user.user_metadata?.roll_number ?? ""),
        institution: "",
      });
    }
  }, [profile, user]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");

      const payload = {
        user_id: user.id,
        full_name: form.fullName.trim(),
        roll_number: form.rollNumber.trim(),
        institution: form.institution.trim() || null,
      };

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("user_id", user.id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("profiles").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to save profile", description: error.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Keep your academic profile up to date for collaboration and reminders.</p>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-display text-foreground">
              <UserRound className="h-5 w-5 text-primary" />
              Personal details
            </CardTitle>
            <CardDescription>These details are used across your dashboard, study groups, and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    className="pl-9"
                    placeholder="Your full name"
                    disabled={isLoading || saveProfileMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll number</Label>
                <div className="relative">
                  <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="rollNumber"
                    value={form.rollNumber}
                    onChange={(event) => setForm((current) => ({ ...current, rollNumber: event.target.value }))}
                    className="pl-9"
                    placeholder="2024CS001"
                    disabled={isLoading || saveProfileMutation.isPending}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" value={user?.email ?? ""} className="pl-9" disabled readOnly />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="institution"
                  value={form.institution}
                  onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))}
                  className="pl-9"
                  placeholder="Your college or university"
                  disabled={isLoading || saveProfileMutation.isPending}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveProfileMutation.mutate()}
                disabled={!form.fullName.trim() || !form.rollNumber.trim() || saveProfileMutation.isPending}
              >
                {saveProfileMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
