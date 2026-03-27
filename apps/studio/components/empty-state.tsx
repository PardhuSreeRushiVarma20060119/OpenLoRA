import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-16 px-4 text-center gap-3",
            className
        )}>
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/60 mb-1">
                <Icon className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description && (
                <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
            )}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
