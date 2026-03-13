"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/ui/auth/AuthContext";
import { createClient } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Clock, Play } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

interface Pairing {
  id: string;
  court_number: number;
  sequence_number: number;
  status: string;
  team_a_player1: string | null;
  team_a_player2: string | null;
  team_b_player1: string | null;
  team_b_player2: string | null;
  result?: {
    team_a_score: number;
    team_b_score: number;
    winner_team: string;
  } | null;
}

interface SessionData {
  id: string;
  name: string;
  date: string;
  start_time: string;
  court_names: Record<string, string>;
  show_skill_level_pills: boolean;
}

interface PlayerInfo {
  id: string;
  display_name: string;
  picture_url: string | null;
  skill_level: number;
}

export default function PlayerSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [sessRes, pairRes, playRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}`),
      fetch(`/api/sessions/${sessionId}/pairings`),
      fetch(`/api/sessions/${sessionId}/players`),
    ]);
    if (sessRes.ok) setSession((await sessRes.json()).data);
    if (pairRes.ok) setPairings((await pairRes.json()).data ?? []);
    if (playRes.ok) {
      const { data } = await playRes.json();
      const map: Record<string, PlayerInfo> = {};
      for (const sp of data ?? []) {
        if (sp.user) map[sp.user_id] = sp.user;
      }
      setPlayerMap(map);
    }
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    const channel = supabase
      .channel(`player:${sessionId}:pairings`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pairings", filter: `session_id=eq.${sessionId}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_results" },
        () => loadData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, loadData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user || !session) return null;

  const userId = user.id;

  function playerName(id: string | null): string {
    if (!id) return "—";
    return playerMap[id]?.display_name ?? "Unknown";
  }

  function courtName(n: number): string {
    return session?.court_names?.[String(n)] ?? `Court ${n}`;
  }

  // My current/next match
  const myActivePairing = pairings.find(p =>
    (p.status === "scheduled" || p.status === "in_progress") &&
    [p.team_a_player1, p.team_a_player2, p.team_b_player1, p.team_b_player2].includes(userId)
  );

  // My recent completed matches
  const myCompletedPairings = pairings
    .filter(p =>
      p.status === "completed" &&
      [p.team_a_player1, p.team_a_player2, p.team_b_player1, p.team_b_player2].includes(userId)
    )
    .sort((a, b) => b.sequence_number - a.sequence_number)
    .slice(0, 5);

  function getMyTeam(p: Pairing): "A" | "B" | null {
    if ([p.team_a_player1, p.team_a_player2].includes(userId)) return "A";
    if ([p.team_b_player1, p.team_b_player2].includes(userId)) return "B";
    return null;
  }

  function didIWin(p: Pairing): boolean | null {
    if (!p.result) return null;
    const team = getMyTeam(p);
    if (!team) return null;
    return (team === "A" && p.result.winner_team === "teamA") ||
           (team === "B" && p.result.winner_team === "teamB");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{session.name}</h1>
          <p className="text-sm text-muted-foreground">{session.date} · {session.start_time}</p>
        </div>
      </div>

      {/* My next/current match */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">My Match</h2>
        {myActivePairing ? (
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground">
                  {courtName(myActivePairing.court_number)}
                </CardTitle>
                <Badge className={`text-xs capitalize ${myActivePairing.status === "in_progress" ? "bg-emerald-500/15 text-emerald-700 border-emerald-400/40" : "bg-secondary text-secondary-foreground"}`}>
                  {myActivePairing.status === "in_progress" ? (
                    <><Play className="mr-1 h-3 w-3 inline" /> Playing</>
                  ) : (
                    <><Clock className="mr-1 h-3 w-3 inline" /> Up next</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-emerald-500/10 p-2">
                  <p className="text-xs text-emerald-700 mb-1 font-medium">Team A {getMyTeam(myActivePairing) === "A" && "(You)"}</p>
                  <p className="text-xs text-foreground">{playerName(myActivePairing.team_a_player1)}</p>
                  <p className="text-xs text-foreground">{playerName(myActivePairing.team_a_player2)}</p>
                </div>
                <div className="rounded-md bg-secondary p-2">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Team B {getMyTeam(myActivePairing) === "B" && "(You)"}</p>
                  <p className="text-xs text-foreground">{playerName(myActivePairing.team_b_player1)}</p>
                  <p className="text-xs text-foreground">{playerName(myActivePairing.team_b_player2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">You&apos;re sitting out. Waiting for next match assignment…</p>
          </div>
        )}
      </div>

      {/* Recent matches */}
      {myCompletedPairings.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent Matches</h2>
          <div className="space-y-2">
            {myCompletedPairings.map(p => {
              const won = didIWin(p);
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${won === true ? "bg-emerald-500" : won === false ? "bg-destructive" : "bg-muted-foreground/40"}`} />
                  <span className="text-xs text-muted-foreground shrink-0">{courtName(p.court_number)}</span>
                  <span className="flex-1 text-xs text-foreground truncate">
                    {playerName(p.team_a_player1)} / {playerName(p.team_a_player2)} vs {playerName(p.team_b_player1)} / {playerName(p.team_b_player2)}
                  </span>
                  {p.result && (
                    <span className="shrink-0 text-xs font-medium text-foreground">
                      {p.result.team_a_score}–{p.result.team_b_score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
