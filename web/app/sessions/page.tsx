"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SessionCard } from "./SessionCard";
import { SessionCardSkeleton } from "./SessionCardSkeleton";
import { useAuth } from "@/src/ui/auth/AuthContext";
import { Plus } from "lucide-react";

interface SessionRow {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  num_courts: number;
  max_players: number;
  status: string;
}

export default function SessionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) {
          const body = await res.json();
          setError(body.error?.message ?? "Failed to load sessions");
          return;
        }
        const { data } = await res.json();
        setSessions(data ?? []);
      } catch {
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    }
    if (!authLoading) load();
  }, [authLoading]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground">All badminton sessions</p>
        </div>
        {user?.is_moderator && (
          <Link href="/sessions/new">
            <Button size="sm" className="min-h-[44px] h-11 px-4">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Session
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SessionCardSkeleton key={i} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
          {user?.is_moderator && (
            <Link href="/sessions/new" className="inline-block mt-4">
              <Button size="sm" className="min-h-[44px] h-11 px-4">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create your first session
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}
