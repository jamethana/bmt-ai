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
        className="h-8 w-28 animate-pulse rounded-md bg-muted"
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
          className="h-11 min-h-[44px] px-4 text-xs"
        >
          Login with Line
        </Button>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">{user.display_name}</span>
      <Avatar className="h-7 w-7">
        <AvatarImage src={user.picture_url ?? undefined} />
        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
          {user.display_name[0]}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={logout}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center -m-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
