import { CourtDashboard } from "./CourtDashboard";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <CourtDashboard sessionId={sessionId} />;
}
