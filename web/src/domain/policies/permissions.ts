interface SessionFlags {
  allowPlayerAssignEmptyCourt: boolean;
  allowPlayerRecordOwnResult: boolean;
  allowPlayerRecordAnyResult: boolean;
}

interface PairingPlayers {
  teamAPlayer1: string | null;
  teamAPlayer2: string | null;
  teamBPlayer1: string | null;
  teamBPlayer2: string | null;
}

export function canAssignCourt(ctx: { isModerator: boolean; session: SessionFlags }): boolean {
  return ctx.isModerator || ctx.session.allowPlayerAssignEmptyCourt;
}

export function canRecordAnyResult(ctx: { isModerator: boolean; session: SessionFlags }): boolean {
  return ctx.isModerator || ctx.session.allowPlayerRecordAnyResult;
}

export function canRecordOwnResult(ctx: {
  isModerator: boolean;
  session: SessionFlags;
  pairing: PairingPlayers;
  userId: string;
}): boolean {
  if (ctx.isModerator || ctx.session.allowPlayerRecordAnyResult) return true;
  if (!ctx.session.allowPlayerRecordOwnResult) return false;
  const { teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2 } = ctx.pairing;
  return [teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2].includes(ctx.userId);
}
