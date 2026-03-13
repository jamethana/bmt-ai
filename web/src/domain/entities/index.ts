export type SessionStatus = "draft" | "active" | "completed" | "cancelled";
export type PairingStatus = "scheduled" | "in_progress" | "completed" | "voided";
export type WinnerTeam = "teamA" | "teamB";
/**
 * least_played   — fairness-first: prioritise players who have played fewest matches
 * longest_wait   — wait-time-first: prioritise players sitting out the longest
 * balanced       — blend fairness + wait time (default)
 */
export type PairingRule = "least_played" | "longest_wait" | "balanced";

export interface User {
  id: string;
  lineUserId: string | null;
  displayName: string;
  pictureUrl: string | null;
  skillLevel: number; // 1-10
  calculatedSkillRating: number | null;
  isModerator: boolean;
  trueskillMu: number | null;
  trueskillSigma: number | null;
  trueskillUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  name: string;
  date: string; // ISO date YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string | null;
  numCourts: number;
  maxPlayers: number;
  status: SessionStatus;
  createdBy: string | null;
  courtNames: Record<string, string>; // courtNumber → name
  notes: string | null;
  showSkillLevelPills: boolean;
  allowPlayerAssignEmptyCourt: boolean;
  allowPlayerRecordOwnResult: boolean;
  allowPlayerRecordAnyResult: boolean;
  allowPlayerAddRemoveCourts: boolean;
  allowPlayerAccessInviteQr: boolean;
  pairingRule: PairingRule;
  maxPartnerSkillLevelGap: number; // 1–10; 10 = no restriction
  createdAt: string;
  updatedAt: string;
}

export interface SessionPlayer {
  id: string;
  sessionId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  user?: User; // joined
}

export interface Pairing {
  id: string;
  sessionId: string;
  courtNumber: number;
  sequenceNumber: number;
  status: PairingStatus;
  teamAPlayer1: string | null;
  teamAPlayer2: string | null;
  teamBPlayer1: string | null;
  teamBPlayer2: string | null;
  createdAt: string;
  completedAt: string | null;
  result?: GameResult; // joined
}

export interface GameResult {
  id: string;
  pairingId: string;
  teamAScore: number;
  teamBScore: number;
  winnerTeam: WinnerTeam;
  recordedBy: string | null;
  recordedAt: string;
}

export interface ModeratorDefaultSettings {
  userId: string;
  name: string;
  startTime: string;
  endTime: string;
  location: string | null;
  numCourts: number;
  maxPlayers: number;
  showSkillLevelPills: boolean;
  allowPlayerAssignEmptyCourt: boolean;
  allowPlayerRecordOwnResult: boolean;
  allowPlayerRecordAnyResult: boolean;
  allowPlayerAddRemoveCourts: boolean;
  allowPlayerAccessInviteQr: boolean;
  pairingRule: PairingRule;
  maxPartnerSkillLevelGap: number; // 1–10; 10 = no restriction
  updatedAt: string;
}
