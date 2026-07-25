import { NavSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <NavSkeleton />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <SkeletonBlock className="h-6 w-64" />
        <SkeletonBlock className="mt-2 h-4 w-48" />
        <SkeletonBlock className="mt-4 h-20 w-full" />
        <SkeletonBlock className="mt-3 h-10 w-full max-w-sm" />
        <SkeletonBlock className="mt-6 h-32 w-full" />
      </main>
    </>
  );
}
