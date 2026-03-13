import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SessionCardSkeleton() {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4 bg-slate-800" />
        <Skeleton className="h-4 w-1/2 bg-slate-800" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full bg-slate-800" />
        <Skeleton className="h-4 w-2/3 bg-slate-800" />
      </CardContent>
    </Card>
  );
}
