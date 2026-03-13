"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DefaultSettings {
  name?: string;
  start_time?: string;
  end_time?: string;
  location?: string | null;
  num_courts?: number;
  max_players?: number;
  pairing_rule?: string;
  max_partner_skill_level_gap?: number;
  allow_player_assign_empty_court?: boolean;
  allow_player_record_own_result?: boolean;
  allow_player_record_any_result?: boolean;
  allow_player_add_remove_courts?: boolean;
  allow_player_access_invite_qr?: boolean;
  show_skill_level_pills?: boolean;
}

export function CreateSessionForm({ defaults }: { defaults?: DefaultSettings }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const [form, setForm] = useState({
    name: defaults?.name ?? "",
    date: today,
    startTime: defaults?.start_time ?? "09:00",
    endTime: defaults?.end_time ?? "12:00",
    location: defaults?.location ?? "",
    numCourts: defaults?.num_courts ?? 4,
    maxPlayers: defaults?.max_players ?? 24,
    notes: "",
    pairingRule: defaults?.pairing_rule ?? "balanced",
    maxPartnerSkillLevelGap: defaults?.max_partner_skill_level_gap ?? 2,
    allowPlayerAssignEmptyCourt: defaults?.allow_player_assign_empty_court ?? false,
    allowPlayerRecordOwnResult: defaults?.allow_player_record_own_result ?? false,
    allowPlayerRecordAnyResult: defaults?.allow_player_record_any_result ?? false,
    allowPlayerAddRemoveCourts: defaults?.allow_player_add_remove_courts ?? false,
    allowPlayerAccessInviteQr: defaults?.allow_player_access_invite_qr ?? true,
    showSkillLevelPills: defaults?.show_skill_level_pills ?? true,
    status: "active" as "draft" | "active",
  });

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          location: form.location || undefined,
          numCourts: form.numCourts,
          maxPlayers: form.maxPlayers,
          notes: form.notes || undefined,
          pairingRule: form.pairingRule,
          maxPartnerSkillLevelGap: form.maxPartnerSkillLevelGap,
          allowPlayerAssignEmptyCourt: form.allowPlayerAssignEmptyCourt,
          allowPlayerRecordOwnResult: form.allowPlayerRecordOwnResult,
          allowPlayerRecordAnyResult: form.allowPlayerRecordAnyResult,
          allowPlayerAddRemoveCourts: form.allowPlayerAddRemoveCourts,
          allowPlayerAccessInviteQr: form.allowPlayerAccessInviteQr,
          showSkillLevelPills: form.showSkillLevelPills,
          status: form.status,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to create session");
        return;
      }

      const { data } = await res.json();
      router.push(`/sessions/${data.id}`);
    } catch {
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium text-foreground">Basic Info</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-muted-foreground">Session Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={e => set("name", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor="date" className="text-xs text-muted-foreground">Date</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={e => set("date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startTime" className="text-xs text-muted-foreground">Start</Label>
            <Input
              id="startTime"
              type="time"
              value={form.startTime}
              onChange={e => set("startTime", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime" className="text-xs text-muted-foreground">End</Label>
            <Input
              id="endTime"
              type="time"
              value={form.endTime}
              onChange={e => set("endTime", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-xs text-muted-foreground">Location (optional)</Label>
          <Input
            id="location"
            value={form.location}
            onChange={e => set("location", e.target.value)}
            placeholder="e.g. Sports Hall A…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="numCourts" className="text-xs text-muted-foreground">Courts</Label>
            <Input
              id="numCourts"
              type="number"
              min={1}
              max={20}
              value={form.numCourts}
              onChange={e => set("numCourts", Number(e.target.value))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxPlayers" className="text-xs text-muted-foreground">Max Players</Label>
            <Input
              id="maxPlayers"
              type="number"
              min={2}
              max={100}
              value={form.maxPlayers}
              onChange={e => set("maxPlayers", Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      {/* Pairing Settings */}
      <div className="space-y-4 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Pairing Settings</h2>

        <fieldset className="space-y-2">
          <legend className="text-xs text-muted-foreground">
            Pairing rule
          </legend>
          <p className="text-[11px] text-muted-foreground/80">
            Choose how the system prioritises who plays next. Tap to switch.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Pairing rule options">
            {[
              {
                key: "balanced" as const,
                label: "Balanced",
                description: "Mix of wait time and fairness",
              },
              {
                key: "least_played" as const,
                label: "Least Played",
                description: "Give games to those with fewer matches",
              },
              {
                key: "longest_wait" as const,
                label: "Longest Wait",
                description: "Prioritise players waiting longest",
              },
            ].map(option => {
              const isActive = form.pairingRule === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => set("pairingRule", option.key)}
                  className={cn(
                    "min-h-[48px] rounded-lg border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "sm:min-h-[56px]",
                    isActive
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300"
                      : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className={cn("block font-medium", isActive ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")}>
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="skillGap" className="text-xs text-muted-foreground">
            Max Partner Skill Gap (1–10, 10 = no restriction)
          </Label>
          <Input
            id="skillGap"
            type="number"
            min={1}
            max={10}
            value={form.maxPartnerSkillLevelGap}
            onChange={e => set("maxPartnerSkillLevelGap", Number(e.target.value))}
          />
        </div>
      </div>

      {/* Player Permissions */}
      <div className="space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium text-foreground">Player Permissions</h2>
        <p className="text-[11px] text-muted-foreground/80">
          Decide what players can do themselves during a session. Tap a card to enable or disable each permission.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            {
              key: "allowPlayerAssignEmptyCourt" as const,
              label: "Assign to empty courts",
              description: "Players can put themselves onto any empty court.",
            },
            {
              key: "allowPlayerRecordOwnResult" as const,
              label: "Record their own result",
              description: "Players can submit scores for matches they played in.",
            },
            {
              key: "allowPlayerRecordAnyResult" as const,
              label: "Record any match result",
              description: "Players can record scores for any court, not just their own.",
            },
            {
              key: "allowPlayerAddRemoveCourts" as const,
              label: "Add/remove courts",
              description: "Players can change the number of active courts.",
            },
            {
              key: "allowPlayerAccessInviteQr" as const,
              label: "Access invite QR code",
              description: "Players can open the QR code / invite link screen.",
            },
            {
              key: "showSkillLevelPills" as const,
              label: "Show skill level pills",
              description: "Display each player’s skill level on their card.",
            },
          ].map(option => {
            const isEnabled = form[option.key];
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => set(option.key, !isEnabled)}
                aria-pressed={isEnabled}
                className={cn(
                  "min-h-[52px] rounded-lg border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "sm:min-h-[56px]",
                  isEnabled
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300"
                    : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "block font-medium",
                    isEnabled ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
                  )}
                >
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status + Submit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Save as Draft</Label>
          <Switch
            checked={form.status === "draft"}
            onCheckedChange={v => set("status", v ? "draft" : "active")}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : form.status === "draft" ? "Save Draft" : "Create & Activate"}
        </Button>
      </div>
    </form>
  );
}
