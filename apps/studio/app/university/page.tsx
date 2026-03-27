"use client";

import { useEffect, useState } from "react";
import { UniversityAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, Clock, CheckCircle, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const levelStyles: Record<string, string> = {
    beginner:     "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    intermediate: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    advanced:     "bg-rose-400/10 text-rose-400 border-rose-400/20",
};

export default function UniversityPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        UniversityAPI.getCourses()
            .then((data) => { if (Array.isArray(data)) setCourses(data); })
            .catch((err) => { console.error("[University] Failed to load courses:", err); })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in-up">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-violet-900/20 p-8">
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-300 text-xs font-medium mb-4">
                        <Sparkles className="h-3 w-3" />
                        Learn at your own pace
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-3 flex items-center gap-3">
                        <GraduationCap className="h-8 w-8 text-blue-400 shrink-0" />
                        OpenUniversity
                    </h1>
                    <p className="text-blue-200/80 text-sm max-w-lg leading-relaxed">
                        Master LoRA fine-tuning and LLM optimization through curated courses designed for all skill levels.
                    </p>
                </div>
                {/* Decorative gradient blob */}
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-500/[0.07] via-transparent to-transparent pointer-events-none" />
                <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
            </div>

            {/* Course Grid */}
            {loading ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="glass-card border-border/50 bg-card/50">
                            <div className="p-5 space-y-3">
                                <div className="skeleton h-5 w-20 rounded-full" />
                                <div className="skeleton h-5 w-full" />
                                <div className="skeleton h-3 w-full" />
                                <div className="skeleton h-3 w-3/4" />
                                <div className="skeleton h-8 w-full rounded-lg mt-4" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : courses.length === 0 ? (
                <EmptyState
                    icon={GraduationCap}
                    title="No courses available yet"
                    description="Check back soon — new courses are being added regularly."
                />
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => {
                        const level = (course.level || "beginner").toLowerCase();
                        return (
                            <Card
                                key={course.id}
                                className={cn(
                                    "glass-card border-border/50 bg-card/50 flex flex-col",
                                    "hover:border-blue-400/30 hover:shadow-glow-blue transition-all duration-200"
                                )}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-medium border capitalize",
                                            levelStyles[level] ?? "text-muted-foreground"
                                        )}>
                                            {level}
                                        </Badge>
                                        {course.enrolled && (
                                            <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400 bg-emerald-400/10 flex items-center gap-1">
                                                <CheckCircle className="h-2.5 w-2.5" />
                                                Enrolled
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-sm font-semibold text-foreground leading-snug">
                                        {course.title}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2 text-xs mt-1">
                                        {course.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-3 pb-0">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            {course.modules?.length || 0} modules
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            {course.duration || "2h 30m"}
                                        </span>
                                    </div>
                                    {course.progress > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Progress</span>
                                                <span className="text-blue-400 font-medium">{course.progress}%</span>
                                            </div>
                                            <Progress value={course.progress} className="h-1.5" />
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-4 pb-4 mt-4 border-t border-border/40">
                                    <Button
                                        className={cn(
                                            "w-full text-sm h-9",
                                            course.enrolled
                                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                : "bg-muted/60 hover:bg-muted text-foreground border border-border/60"
                                        )}
                                    >
                                        {course.enrolled ? "Continue Learning" : "Enroll Now"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
