"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateSessionForm } from "./CreateSessionForm";
import { useAuth } from "@/src/ui/auth/AuthContext";
import { useRouter } from "next/navigation";

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

export default function NewSessionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [defaults, setDefaults] = useState<DefaultSettings | undefined>(undefined);

  useEffect(() => {
    if (!isLoading && !user?.is_moderator) {
      router.push("/sessions");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    async function loadDefaults() {
      if (!user?.is_moderator) return;
      try {
        const res = await fetch("/api/moderator/defaults");
        if (res.ok) {
          const { data } = await res.json();
          setDefaults(data ?? undefined);
        }
      } catch {
        // defaults not available, proceed without
      }
    }
    loadDefaults();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user?.is_moderator) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Session</h1>
          <p className="text-sm text-muted-foreground">Create a new badminton session</p>
        </div>
      </div>
      <CreateSessionForm defaults={defaults} />
    </div>
  );
}
