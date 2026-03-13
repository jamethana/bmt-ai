"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { CourtCard } from "./CourtCard";
import { PlayerList } from "./PlayerList";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/src/ui/auth/AuthContext";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

interface SessionData {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  num_courts: number;
  status: string;
  court_names: Record<string, string>;
  show_skill_level_pills: boolean;
}

interface Pairing {
  id: string;
  court_number: number;
  sequence_number: number;
  status: string;
  team_a_player1: string | null;
  team_a_player2: string | null;
  team_b_player1: string | null;
  team_b_player2: string | null;
  completed_at: string | null;
  result?: {
    team_a_score: number;
    team_b_score: number;
    winner_team: string;
  } | null;
}

interface Player {
  id: string;
  user_id: string;
  is_active: boolean;
  user?: {
    id: string;
    display_name: string;
    picture_url: string | null;
    skill_level: number;
    is_moderator: boolean;
  };
}

export function CourtDashboard({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayers, setShowPlayers] = useState(false);

  const loadData = useCallback(async () => {
    const [sessRes, pairRes, playRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}`),
      fetch(`/api/sessions/${sessionId}/pairings`),
      fetch(`/api/sessions/${sessionId}/players`),
    ]);
    if (sessRes.ok) setSession((await sessRes.json()).data);
    if (pairRes.ok) setPairings((await pairRes.json()).data ?? []);
    if (playRes.ok) setPlayers((await playRes.json()).data ?? []);
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    // Realtime: pairings
    const pairingsChannel = supabase
      .channel(`session:${sessionId}:pairings`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pairings", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPairings(prev => [...prev, payload.new as Pairing]);
          } else if (payload.eventType === "UPDATE") {
            setPairings(prev => prev.map(p => p.id === (payload.new as Pairing).id ? payload.new as Pairing : p));
          } else if (payload.eventType === "DELETE") {
            setPairings(prev => prev.filter(p => p.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    // Realtime: game_results (reload pairings to get joined results)
    const resultsChannel = supabase
      .channel(`session:${sessionId}:results`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_results" },
        () => loadData()
      )
      .subscribe();

    // Realtime: session_players
    const playersChannel = supabase
      .channel(`session:${sessionId}:players`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_players", filter: `session_id=eq.${sessionId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pairingsChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [sessionId, loadData]);

  // Build player map for quick lookup
  const playerMap = Object.fromEntries(
    players
      .filter(p => p.user)
      .map(p => [p.user_id, { display_name: p.user!.display_name, picture_url: p.user!.picture_url }])
  );

  // Find active pairing player IDs
  const activePairingPlayerIds = new Set<string>(
    pairings
      .filter(p => p.status === "in_progress" || p.status === "scheduled")
      .flatMap(p => [p.team_a_player1, p.team_a_player2, p.team_b_player1, p.team_b_player2])
      .filter((id): id is string => id !== null)
  );

  // Get the most recent non-completed/non-voided pairing per court
  function getActivePairingForCourt(courtNumber: number): Pairing | null {
    const courtPairings = pairings
      .filter(p => p.court_number === courtNumber && p.status !== "voided")
      .sort((a, b) => b.sequence_number - a.sequence_number);
    return courtPairings[0] ?? null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 bg-slate-800" />)}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
        Session not found.
      </div>
    );
  }

  const courts = Array.from({ length: session.num_courts }, (_, i) => i + 1);
  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-slate-700 text-slate-200",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    completed: "bg-slate-800 text-slate-400",
    cancelled: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/sessions" className="mt-1 text-slate-400 hover:text-slate-200">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-100 truncate">{session.name}</h1>
            <Badge className={`text-xs capitalize ${STATUS_COLORS[session.status] ?? STATUS_COLORS.draft}`}>
              {session.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            {session.date} · {session.start_time}–{session.end_time}
            {session.location ? ` · ${session.location}` : ""}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] h-11 shrink-0 border-slate-700 text-slate-400 hover:text-slate-200"
          onClick={() => setShowPlayers(true)}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          {players.filter(p => p.is_active).length}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {courts.map(n => (
          <CourtCard
            key={n}
            courtNumber={n}
            courtName={session.court_names?.[String(n)]}
            pairing={getActivePairingForCourt(n)}
            playerMap={playerMap}
            isModerator={user?.is_moderator ?? false}
            sessionId={sessionId}
            onRefresh={loadData}
          />
        ))}
      </div>

      <Sheet open={showPlayers} onOpenChange={setShowPlayers}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto border-slate-800 bg-slate-900">
          <SheetHeader>
            <SheetTitle className="text-slate-200">
              Players ({players.filter(p => p.is_active).length})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PlayerList
              players={players}
              activePairingPlayerIds={activePairingPlayerIds}
              showSkillLevelPills={session.show_skill_level_pills}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
