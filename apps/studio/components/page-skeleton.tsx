export function PageSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Page header skeleton */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="skeleton h-7 w-40" />
                    <div className="skeleton h-4 w-56" />
                </div>
                <div className="skeleton h-9 w-32 rounded-lg" />
            </div>
            {/* Content skeleton */}
            <div className="skeleton rounded-xl overflow-hidden">
                <div className="p-4 space-y-3">
                    <div className="skeleton h-8 w-full rounded-lg opacity-60" />
                    {[...Array(rows)].map((_, i) => (
                        <div key={i} className="flex gap-4 py-3 border-t border-border/40">
                            <div className="skeleton h-4 w-[15%]" />
                            <div className="skeleton h-4 w-[30%]" />
                            <div className="skeleton h-4 w-[15%]" />
                            <div className="skeleton h-4 w-[20%]" />
                            <div className="skeleton h-4 w-[10%] ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
