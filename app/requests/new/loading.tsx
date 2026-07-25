import { NavSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <NavSkeleton />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <SkeletonBlock className="h-6 w-48" />
        <SkeletonBlock className="mt-2 h-4 w-full max-w-sm" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-full" />
          ))}
        </div>
      </main>
    </>
  );
}
