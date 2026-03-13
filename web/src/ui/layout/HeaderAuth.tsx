"use client";
import { useAuth } from "@/src/ui/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const LINE_LOGIN_URL = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINE_CHANNEL_ID}&redirect_uri=${process.env.NEXT_PUBLIC_LINE_CALLBACK_URL}&state=xxx&scope=profile`;

export function HeaderAuth() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div
        className="h-8 w-28 animate-pulse rounded-md bg-slate-800"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <a href={LINE_LOGIN_URL} className="inline-flex min-h-[44px] items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-11 min-h-[44px] border-slate-600 bg-slate-800/80 px-4 text-slate-200 hover:bg-slate-700 hover:text-white text-xs"
        >
          Login with Line
        </Button>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-slate-400 sm:inline">{user.display_name}</span>
      <Avatar className="h-7 w-7">
        <AvatarImage src={user.picture_url ?? undefined} />
        <AvatarFallback className="bg-emerald-500 text-xs text-slate-950">
          {user.display_name[0]}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={logout}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center -m-2 text-xs text-slate-400 hover:text-slate-200"
      >
        Logout
      </button>
    </div>
  );
}
