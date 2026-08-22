import { NavSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <NavSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <SkeletonBlock className="h-6 w-40" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32 w-full" />
          ))}
        </div>
      </main>
    </>
  );
}
