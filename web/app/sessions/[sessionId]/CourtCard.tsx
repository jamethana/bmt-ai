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
  scheduled: "bg-slate-700 text-slate-300",
  in_progress: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-slate-800 text-slate-500",
  voided: "bg-red-900/30 text-red-400",
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
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-200">{displayName}</CardTitle>
          {pairing && (
            <Badge className={`text-xs capitalize ${STATUS_BADGE[pairing.status] ?? STATUS_BADGE.scheduled}`}>
              {pairing.status.replace("_", " ")}
            </Badge>
          )}
          {!pairing && <span className="text-xs text-slate-600">empty</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {pairing && pairing.status !== "voided" ? (
          <>
            {/* Teams */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-slate-800/60 p-2">
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Team A</p>
                <p className="text-xs text-slate-300 truncate">{playerName(pairing.team_a_player1)}</p>
                <p className="text-xs text-slate-300 truncate">{playerName(pairing.team_a_player2)}</p>
              </div>
              <div className="rounded-md bg-slate-800/60 p-2">
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Team B</p>
                <p className="text-xs text-slate-300 truncate">{playerName(pairing.team_b_player1)}</p>
                <p className="text-xs text-slate-300 truncate">{playerName(pairing.team_b_player2)}</p>
              </div>
            </div>

            {/* Score display */}
            {pairing.result && (
              <div className="flex items-center justify-center gap-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm">
                <span className="font-semibold text-emerald-300">{pairing.result.team_a_score}</span>
                <span className="text-slate-500">–</span>
                <span className="font-semibold text-emerald-300">{pairing.result.team_b_score}</span>
                <span className="text-xs text-slate-400">
                  ({pairing.result.winner_team === "teamA" ? "Team A wins" : "Team B wins"})
                </span>
              </div>
            )}

            {/* Moderator actions */}
            {isModerator && pairing.status !== "completed" && (
              <div className="flex flex-wrap gap-1.5">
                {pairing.status === "scheduled" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-900/30" disabled={isLoading} onClick={() => updateStatus("in_progress")}>
                    <Play className="mr-1 h-3 w-3" /> Start
                  </Button>
                )}
                {pairing.status === "in_progress" && !pairing.result && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 text-slate-300" disabled={isLoading} onClick={() => setShowResultForm(true)}>
                    <CheckCircle className="mr-1 h-3 w-3" /> Record Result
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs border-red-900 text-red-400 hover:bg-red-900/20" disabled={isLoading} onClick={() => updateStatus("voided")}>
                  <X className="mr-1 h-3 w-3" /> Void
                </Button>
              </div>
            )}

            {/* Result form */}
            {showResultForm && (
              <div className="space-y-2 rounded-md border border-slate-700 bg-slate-800 p-3">
                <p className="text-xs text-slate-400 font-medium">Record Score</p>
                <div className="flex items-center gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-slate-500">Team A</Label>
                    <Input
                      type="number"
                      min={0}
                      value={scoreA}
                      onChange={e => setScoreA(e.target.value)}
                      className="h-7 border-slate-700 bg-slate-700 text-slate-100 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-slate-500 pt-4">–</span>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-slate-500">Team B</Label>
                    <Input
                      type="number"
                      min={0}
                      value={scoreB}
                      onChange={e => setScoreB(e.target.value)}
                      className="h-7 border-slate-700 bg-slate-700 text-slate-100 text-xs"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" disabled={isLoading} onClick={recordResult}>
                    Submit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={() => { setShowResultForm(false); setError(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-4">
            {isModerator && (
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:text-slate-200 text-xs" disabled={isLoading} onClick={autoPair}>
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                {isLoading ? "Pairing…" : "Auto-Pair"}
              </Button>
            )}
            {!isModerator && <span className="text-xs text-slate-600">Waiting for moderator</span>}
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}
