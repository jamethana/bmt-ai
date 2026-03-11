---
name: supabase-realtime
description: Supabase Realtime subscription patterns for this badminton session app. Use when implementing live court dashboards, session player lists, match status updates, or any feature where multiple users need to see changes instantly.
---

# Supabase Realtime

## When to use realtime vs one-time fetch

| Data | Strategy |
|---|---|
| Session list (moderator's dashboard) | One-time fetch + realtime for status changes |
| Active session court view | Realtime required — multiple users watching |
| Player list in a session | Realtime required — players join/leave live |
| Pairings / match assignments | Realtime required — court dashboard |
| Game results | Realtime required — scores update live |
| User profile | One-time fetch (not shared mutable state) |
| Moderator settings | One-time fetch |

## Standard subscription hook pattern

```ts
function useSessionPairings(sessionId: string) {
  const [pairings, setPairings] = useState<Pairing[]>([]);

  useEffect(() => {
    // 1. Initial fetch
    supabase
      .from("pairings")
      .select("*")
      .eq("session_id", sessionId)
      .then(({ data }) => { if (data) setPairings(data); });

    // 2. Realtime subscription
    const channel = supabase
      .channel(`session:${sessionId}:pairings`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pairings", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPairings(prev => [...prev, payload.new as Pairing]);
          } else if (payload.eventType === "UPDATE") {
            setPairings(prev => prev.map(p => p.id === payload.new.id ? payload.new as Pairing : p));
          } else if (payload.eventType === "DELETE") {
            setPairings(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return pairings;
}
```

## Channel naming

```
session:{sessionId}:{tableName}
```

Use unique, scoped channel names. Avoid generic names like `"pairings"` — they conflict across sessions.

## Debouncing for court dashboard

The court dashboard can receive many rapid events. Debounce re-renders to avoid thrashing:

```ts
const debouncedRefetch = useMemo(
  () => debounce(() => refetchPairings(), 150),
  []
);

// Use debouncedRefetch instead of direct state update in the subscription handler
```

## `postgres_changes` vs `broadcast`

| Use `postgres_changes` | Use `broadcast` |
|---|---|
| DB table mutations you need in multiple clients | Ephemeral signals (e.g. "user is typing") |
| Persistent data (pairings, results) | Presence (who is online) |

## Presence (who is viewing a session)

```ts
const channel = supabase.channel(`session:${sessionId}:presence`, {
  config: { presence: { key: userId } },
});

channel.on("presence", { event: "sync" }, () => {
  const state = channel.presenceState();
  setViewers(Object.keys(state));
});

await channel.track({ userId, displayName });
```

## RLS + REPLICA IDENTITY

For `UPDATE` and `DELETE` events to include the old row in `payload.old`, run once per table:

```sql
ALTER TABLE pairings REPLICA IDENTITY FULL;
ALTER TABLE session_players REPLICA IDENTITY FULL;
ALTER TABLE game_results REPLICA IDENTITY FULL;
```

Without this, `payload.old` is `{}` for UPDATE/DELETE events.

## Debugging

- Subscription not receiving events → check RLS policies allow `SELECT` for the subscribing user
- `payload.old` is empty → run `REPLICA IDENTITY FULL` migration
- Duplicate events → ensure channel is only created once; `useEffect` dependency array must be stable
