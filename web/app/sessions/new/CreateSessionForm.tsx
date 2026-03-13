"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    name: defaults?.name ?? "Badminton Session",
    date: today,
    startTime: defaults?.start_time ?? "09:00",
    endTime: defaults?.end_time ?? "12:00",
    location: defaults?.location ?? "",
    numCourts: defaults?.num_courts ?? 4,
    maxPlayers: defaults?.max_players ?? 24,
    notes: "",
    pairingRule: defaults?.pairing_rule ?? "balanced",
    maxPartnerSkillLevelGap: defaults?.max_partner_skill_level_gap ?? 10,
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
        <div className="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium text-slate-300">Basic Info</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-slate-400">Session Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={e => set("name", e.target.value)}
            className="border-slate-700 bg-slate-800 text-slate-100"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor="date" className="text-xs text-slate-400">Date</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={e => set("date", e.target.value)}
              className="border-slate-700 bg-slate-800 text-slate-100"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startTime" className="text-xs text-slate-400">Start</Label>
            <Input
              id="startTime"
              type="time"
              value={form.startTime}
              onChange={e => set("startTime", e.target.value)}
              className="border-slate-700 bg-slate-800 text-slate-100"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime" className="text-xs text-slate-400">End</Label>
            <Input
              id="endTime"
              type="time"
              value={form.endTime}
              onChange={e => set("endTime", e.target.value)}
              className="border-slate-700 bg-slate-800 text-slate-100"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-xs text-slate-400">Location (optional)</Label>
          <Input
            id="location"
            value={form.location}
            onChange={e => set("location", e.target.value)}
            placeholder="e.g. Sports Hall A"
            className="border-slate-700 bg-slate-800 text-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="numCourts" className="text-xs text-slate-400">Courts</Label>
            <Input
              id="numCourts"
              type="number"
              min={1}
              max={20}
              value={form.numCourts}
              onChange={e => set("numCourts", Number(e.target.value))}
              className="border-slate-700 bg-slate-800 text-slate-100"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxPlayers" className="text-xs text-slate-400">Max Players</Label>
            <Input
              id="maxPlayers"
              type="number"
              min={2}
              max={100}
              value={form.maxPlayers}
              onChange={e => set("maxPlayers", Number(e.target.value))}
              className="border-slate-700 bg-slate-800 text-slate-100"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs text-slate-400">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            rows={2}
            className="border-slate-700 bg-slate-800 text-slate-100 resize-none"
          />
        </div>
      </div>

      {/* Pairing Settings */}
      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium text-slate-300">Pairing Settings</h2>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Pairing Rule</Label>
          <Select value={form.pairingRule} onValueChange={v => v && set("pairingRule", v)}>
            <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              <SelectItem value="balanced">Balanced (wait + fairness)</SelectItem>
              <SelectItem value="least_played">Least Played (fairness-first)</SelectItem>
              <SelectItem value="longest_wait">Longest Wait (wait-time-first)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skillGap" className="text-xs text-slate-400">
            Max Partner Skill Gap (1–10, 10 = no restriction)
          </Label>
          <Input
            id="skillGap"
            type="number"
            min={1}
            max={10}
            value={form.maxPartnerSkillLevelGap}
            onChange={e => set("maxPartnerSkillLevelGap", Number(e.target.value))}
            className="border-slate-700 bg-slate-800 text-slate-100"
          />
        </div>
      </div>

      {/* Player Permissions */}
      <div className="space-y-3 rounded-md border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium text-slate-300">Player Permissions</h2>

        {[
          { key: "allowPlayerAssignEmptyCourt" as const, label: "Allow players to assign themselves to empty courts" },
          { key: "allowPlayerRecordOwnResult" as const, label: "Allow players to record their own match result" },
          { key: "allowPlayerRecordAnyResult" as const, label: "Allow players to record any match result" },
          { key: "allowPlayerAddRemoveCourts" as const, label: "Allow players to add/remove courts" },
          { key: "allowPlayerAccessInviteQr" as const, label: "Allow players to access the invite QR code" },
          { key: "showSkillLevelPills" as const, label: "Show skill level pills on player cards" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <Label htmlFor={key} className="text-xs text-slate-400 cursor-pointer">{label}</Label>
            <Switch
              id={key}
              checked={form[key]}
              onCheckedChange={v => set(key, v)}
            />
          </div>
        ))}
      </div>

      {/* Status + Submit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-xs text-slate-400">Save as Draft</Label>
          <Switch
            checked={form.status === "draft"}
            onCheckedChange={v => set("status", v ? "draft" : "active")}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSubmitting ? "Creating…" : form.status === "draft" ? "Save Draft" : "Create & Activate"}
        </Button>
      </div>
    </form>
  );
}
