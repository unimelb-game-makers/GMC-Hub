import { NavSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <NavSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="mt-2 h-4 w-64" />
        <SkeletonBlock className="mt-6 h-9 w-48" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24 w-full" />
          ))}
        </div>
      </main>
    </>
  );
}
