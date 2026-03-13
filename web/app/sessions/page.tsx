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
          <h1 className="text-xl font-semibold text-slate-100">Sessions</h1>
          <p className="text-sm text-slate-400">All badminton sessions</p>
        </div>
        {user?.is_moderator && (
          <Link href="/sessions/new">
            <Button size="sm" className="min-h-[44px] h-11 bg-emerald-600 px-4 hover:bg-emerald-700 text-white">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Session
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SessionCardSkeleton key={i} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-md border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-sm text-slate-400">No sessions yet.</p>
          {user?.is_moderator && (
            <Link href="/sessions/new">
              <Button size="sm" variant="outline" className="mt-3 min-h-[44px] h-11 border-slate-700">
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
