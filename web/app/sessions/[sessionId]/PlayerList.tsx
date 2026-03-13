"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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

interface PlayerListProps {
  players: Player[];
  activePairingPlayerIds: Set<string>;
  showSkillLevelPills?: boolean;
}

export function PlayerList({ players, activePairingPlayerIds, showSkillLevelPills }: PlayerListProps) {
  const active = players.filter(p => p.is_active);

  if (active.length === 0) {
    return <p className="text-sm text-slate-500 italic">No players have joined yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      {active.map(p => {
        const u = p.user;
        if (!u) return null;
        const isPlaying = activePairingPlayerIds.has(p.user_id);
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${
              isPlaying ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-800/50"
            }`}
          >
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={u.picture_url ?? undefined} />
              <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                {u.display_name[0]}
              </AvatarFallback>
            </Avatar>
            <span className={`flex-1 truncate text-xs ${isPlaying ? "text-emerald-300" : "text-slate-300"}`}>
              {u.display_name}
            </span>
            {showSkillLevelPills && (
              <Badge className="shrink-0 bg-slate-700 text-slate-400 text-xs px-1.5 py-0">
                Lv{u.skill_level}
              </Badge>
            )}
            {isPlaying && (
              <span className="shrink-0 text-xs text-emerald-400">playing</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
