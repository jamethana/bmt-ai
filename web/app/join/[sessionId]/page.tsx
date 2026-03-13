"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/src/ui/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function JoinSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const { data } = await res.json();
        setSessionName(data.name);
      }
    }
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    // If not logged in, redirect to Line login
    if (!authLoading && !user) {
      const lineUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINE_CHANNEL_ID}&redirect_uri=${process.env.NEXT_PUBLIC_LINE_CALLBACK_URL}&state=join_${sessionId}&scope=profile`;
      window.location.href = lineUrl;
    }
  }, [authLoading, user, sessionId]);

  async function joinSession() {
    setStatus("joining");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/players`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        setErrorMsg(body.error?.message ?? "Failed to join session");
        setStatus("error");
        return;
      }
      setStatus("joined");
      setTimeout(() => router.push(`/sessions/${sessionId}/player`), 1200);
    } catch {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            {sessionName ?? "Join Session"}
          </h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re joining as <span className="text-foreground font-medium">{user.display_name}</span>
          </p>
        </div>

        {status === "joined" ? (
          <div className="rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-700">
            Joined! Redirecting to your match view…
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMsg}
              </div>
            )}
            <Button
              onClick={joinSession}
              disabled={status === "joining"}
              className="w-full"
            >
              {status === "joining" ? "Joining…" : "Join Session"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
