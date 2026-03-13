"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Zap, X, CheckCircle } from "lucide-react";

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

interface PlayerMap {
  [userId: string]: { display_name: string; picture_url?: string | null };
}

interface CourtCardProps {
  courtNumber: number;
  courtName: string | undefined;
  pairing: Pairing | null;
  playerMap: PlayerMap;
  isModerator: boolean;
  sessionId: string;
  onRefresh: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-secondary text-secondary-foreground",
  in_progress: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40",
  completed: "bg-muted text-muted-foreground",
  voided: "bg-destructive/10 text-destructive",
};

export function CourtCard({ courtNumber, courtName, pairing, playerMap, isModerator, sessionId, onRefresh }: CourtCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [error, setError] = useState<string | null>(null);

  const displayName = courtName ?? `Court ${courtNumber}`;
  const isEmpty = !pairing || pairing.status === "completed" || pairing.status === "voided";

  function playerName(id: string | null): string {
    if (!id) return "—";
    return playerMap[id]?.display_name ?? "Unknown";
  }

  async function autoPair() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/pairings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto", courtNumber }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Auto-pair failed");
      } else {
        onRefresh();
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(status: string) {
    if (!pairing) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pairings/${pairing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Action failed");
      } else {
        onRefresh();
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function recordResult() {
    if (!pairing) return;
    const aScore = parseInt(scoreA, 10);
    const bScore = parseInt(scoreB, 10);
    if (isNaN(aScore) || isNaN(bScore)) {
      setError("Enter valid scores");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pairings/${pairing.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamAScore: aScore, teamBScore: bScore }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to record result");
      } else {
        setShowResultForm(false);
        setScoreA(""); setScoreB("");
        onRefresh();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">{displayName}</CardTitle>
          {pairing && (
            <Badge className={`text-xs capitalize ${STATUS_BADGE[pairing.status] ?? STATUS_BADGE.scheduled}`}>
              {pairing.status.replace("_", " ")}
            </Badge>
          )}
          {!pairing && <span className="text-xs text-muted-foreground/50">empty</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {pairing && pairing.status !== "voided" ? (
          <>
            {/* Teams */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-secondary p-2">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Team A</p>
                <p className="text-xs text-foreground truncate">{playerName(pairing.team_a_player1)}</p>
                <p className="text-xs text-foreground truncate">{playerName(pairing.team_a_player2)}</p>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Team B</p>
                <p className="text-xs text-foreground truncate">{playerName(pairing.team_b_player1)}</p>
                <p className="text-xs text-foreground truncate">{playerName(pairing.team_b_player2)}</p>
              </div>
            </div>

            {/* Score display */}
            {pairing.result && (
              <div className="flex items-center justify-center gap-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm">
                <span className="font-semibold text-emerald-700">{pairing.result.team_a_score}</span>
                <span className="text-muted-foreground">–</span>
                <span className="font-semibold text-emerald-700">{pairing.result.team_b_score}</span>
                <span className="text-xs text-muted-foreground">
                  ({pairing.result.winner_team === "teamA" ? "Team A wins" : "Team B wins"})
                </span>
              </div>
            )}

            {/* Moderator actions — 44px min touch targets for mobile */}
            {isModerator && pairing.status !== "completed" && (
              <div className="flex flex-wrap gap-2">
                {pairing.status === "scheduled" && (
                  <Button size="sm" variant="outline" className="min-h-[44px] h-11 text-xs border-primary/40 text-primary hover:bg-primary/10" disabled={isLoading} onClick={() => updateStatus("in_progress")}>
                    <Play className="mr-1 h-3 w-3" /> Start
                  </Button>
                )}
                {pairing.status === "in_progress" && !pairing.result && (
                  <Button size="sm" variant="outline" className="min-h-[44px] h-11 text-xs" disabled={isLoading} onClick={() => setShowResultForm(true)}>
                    <CheckCircle className="mr-1 h-3 w-3" /> Record Result
                  </Button>
                )}
                <Button size="sm" variant="outline" className="min-h-[44px] h-11 text-xs border-destructive/40 text-destructive hover:bg-destructive/10" disabled={isLoading} onClick={() => updateStatus("voided")}>
                  <X className="mr-1 h-3 w-3" /> Void
                </Button>
              </div>
            )}

            {/* Result form */}
            {showResultForm && (
              <div className="space-y-2 rounded-md border border-border bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground font-medium">Record Score</p>
                <div className="flex items-center gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">Team A</Label>
                    <Input
                      type="number"
                      min={0}
                      value={scoreA}
                      onChange={e => setScoreA(e.target.value)}
                      className="min-h-[44px] text-xs"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-muted-foreground pt-4">–</span>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">Team B</Label>
                    <Input
                      type="number"
                      min={0}
                      value={scoreB}
                      onChange={e => setScoreB(e.target.value)}
                      className="min-h-[44px] text-xs"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="min-h-[44px] h-11 text-xs" disabled={isLoading} onClick={recordResult}>
                    Submit
                  </Button>
                  <Button size="sm" variant="ghost" className="min-h-[44px] h-11 text-xs" onClick={() => { setShowResultForm(false); setError(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-4">
            {isModerator && (
              <Button size="sm" variant="outline" className="min-h-[44px] h-11 text-xs" disabled={isLoading} onClick={autoPair}>
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                {isLoading ? "Pairing…" : "Auto-Pair"}
              </Button>
            )}
            {!isModerator && <span className="text-xs text-muted-foreground/50">Waiting for moderator</span>}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
