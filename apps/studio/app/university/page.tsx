"use client";

import { useEffect, useState } from "react";
import { UniversityAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, Clock, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function UniversityPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await UniversityAPI.getCourses();
                if (Array.isArray(data)) {
                    setCourses(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load courses", error);
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading course catalog...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 border border-white/10">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-white flex items-center gap-3">
                        <GraduationCap className="h-8 w-8 text-blue-400" />
                        OpenUniversity
                    </h1>
                    <p className="text-blue-200 max-w-2xl">
                        Master the art of LoRA fine-tuning and LLM optimization. Enroll in curated courses designed for all skill levels.
                    </p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No courses available at the moment.
                    </div>
                ) : (
                    courses.map((course) => (
                        <Card key={course.id} className="glass-card border-border/50 bg-card/50 flex flex-col hover:border-primary/50 transition-colors group">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={course.level === 'advanced' ? "destructive" : "secondary"}>
                                        {course.level || "Beginner"}
                                    </Badge>
                                    {course.enrolled && <Badge variant="outline" className="border-emerald-500 text-emerald-500">Enrolled</Badge>}
                                </div>
                                <CardTitle className="group-hover:text-primary transition-colors">{course.title}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {course.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <BookOpen className="h-4 w-4" />
                                        <span>{course.modules?.length || 0} Modules</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{course.duration || "2h 30m"}</span>
                                    </div>
                                </div>
                                {course.progress > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>Progress</span>
                                            <span>{course.progress}%</span>
                                        </div>
                                        <Progress value={course.progress} className="h-1.5" />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" variant={course.enrolled ? "secondary" : "default"}>
                                    {course.enrolled ? "Continue Learning" : "Enroll Now"}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
