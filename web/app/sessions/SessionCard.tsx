import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Users } from "lucide-react";
import { format } from "date-fns";

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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export function SessionCard({ session }: { session: SessionRow }) {
  const dateLabel = (() => {
    try {
      return format(new Date(session.date + "T00:00:00"), "EEE, MMM d, yyyy");
    } catch {
      return session.date;
    }
  })();

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <Card className="border-border bg-card shadow-sm transition-shadow hover:shadow-md hover:border-primary/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              {session.name}
            </CardTitle>
            <Badge className={`shrink-0 text-xs capitalize ${STATUS_COLORS[session.status] ?? STATUS_COLORS.draft}`}>
              {session.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{session.start_time} – {session.end_time}</span>
          </div>
          {session.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{session.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{session.num_courts} courts · max {session.max_players} players</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
