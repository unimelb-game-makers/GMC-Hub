export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface ${className}`} />;
}

// Matches components/nav.tsx's shape so loading.tsx screens don't jump once
// the real nav (which needs the signed-in user) renders in.
export function NavSkeleton() {
  return (
    <header className="p-3 sm:p-4">
      <div className="mx-auto h-[52px] max-w-5xl animate-pulse rounded-full bg-nav" />
    </header>
  );
}
