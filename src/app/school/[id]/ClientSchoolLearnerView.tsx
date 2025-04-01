"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Building, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import CohortCard from "@/components/CohortCard";
import { useAuth } from "@/lib/auth";
import LearnerCohortView from "@/components/LearnerCohortView";
import { Module, ModuleItem } from "@/types/course";
import { getCompletionData } from "@/lib/api";
import { Cohort, Task, Milestone } from "@/types";

interface School {
    id: number;
    name: string;
    slug: string;
}

interface Course {
    id: number;
    name: string;
    milestones?: Milestone[];
}

export default function ClientSchoolLearnerView({ slug }: { slug: string }) {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [school, setSchool] = useState<School | null>(null);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [activeCohort, setActiveCohort] = useState<Cohort | null>(null);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [activeCourseIndex, setActiveCourseIndex] = useState(0);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [courseError, setCourseError] = useState<string | null>(null);
    const [courseModules, setCourseModules] = useState<Module[]>([]);

    // Add state for completion data
    const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});
    const [completedQuestionIds, setCompletedQuestionIds] = useState<Record<string, Record<string, boolean>>>({});

    // Fetch school data
    useEffect(() => {
        const fetchSchool = async () => {
            // Don't fetch if auth is still loading or user is not authenticated
            if (authLoading || !isAuthenticated || !user?.id) {
                return;
            }

            setLoading(true);
            try {
                // Fetch basic school info using slug
                const schoolResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/organizations/slug/${slug}`);
                if (!schoolResponse.ok) {
                    throw new Error(`API error: ${schoolResponse.status}`);
                }
                const schoolData = await schoolResponse.json();

                // Transform the API response to match the School interface
                const transformedSchool: School = {
                    id: parseInt(schoolData.id),
                    name: schoolData.name,
                    slug: schoolData.slug
                };

                setSchool(transformedSchool);

                // After getting school data, fetch user's cohorts for this school
                const cohortsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${user.id}/org/${transformedSchool.id}/cohorts`);
                if (!cohortsResponse.ok) {
                    throw new Error(`API error: ${cohortsResponse.status}`);
                }
                const cohortsData = await cohortsResponse.json();

                // Transform cohorts data
                const transformedCohorts: Cohort[] = cohortsData.map((cohort: any) => ({
                    id: cohort.id,
                    name: cohort.name,
                    courseCount: cohort.courseCount || 0,
                    memberCount: cohort.memberCount || 0,
                    description: cohort.description || ''
                }));

                setCohorts(transformedCohorts);

                // Set the active cohort
                if (transformedCohorts.length > 0) {
                    setActiveCohort(transformedCohorts[0]);
                }

                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        fetchSchool();
    }, [slug, router, user?.id, isAuthenticated, authLoading]);

    // Function to fetch cohort courses
    const fetchCohortCourses = async (cohortId: number) => {
        if (!cohortId) return;

        setLoadingCourses(true);
        setCourseError(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/courses?include_tree=true`);

            if (!response.ok) {
                throw new Error(`Failed to fetch courses: ${response.status}`);
            }

            const coursesData = await response.json();
            setCourses(coursesData);

            // Reset active course index when cohort changes
            setActiveCourseIndex(0);

            // Transform the first course's milestones to modules if available
            if (coursesData.length > 0) {
                transformCourseToModules(coursesData[0]);
            } else {
                setCourseModules([]);
            }

            setLoadingCourses(false);
        } catch (error) {
            console.error("Error fetching cohort courses:", error);
            setCourseError("Failed to load courses. Please try again.");
            setLoadingCourses(false);
        }
    };

    // Function to fetch completion data
    const fetchCompletionData = async (cohortId: number, userId: string) => {
        if (!cohortId || !userId) return;

        try {
            const { taskCompletions, questionCompletions } = await getCompletionData(cohortId, userId);

            // Update state with processed completion data
            setCompletedTaskIds(taskCompletions);
            setCompletedQuestionIds(questionCompletions);
        } catch (error) {
            console.error("Error fetching completion data:", error);
            // We don't set an error state as this is not critical functionality
            // Just log the error and continue
        }
    };

    // Fetch courses when active cohort changes
    useEffect(() => {
        if (activeCohort) {
            fetchCohortCourses(activeCohort.id);

            // Also fetch completion data when cohort changes
            if (user?.id) {
                fetchCompletionData(activeCohort.id, user.id.toString());
            }
        }
    }, [activeCohort, user?.id]);

    // Transform course data to modules format for LearnerCohortView
    const transformCourseToModules = (course: Course) => {
        if (!course.milestones || !Array.isArray(course.milestones)) {
            setCourseModules([]);
            return;
        }

        const transformedModules = course.milestones.map((milestone: Milestone) => {
            // Map tasks to module items if they exist
            const moduleItems: ModuleItem[] = [];

            if (milestone.tasks && Array.isArray(milestone.tasks)) {
                milestone.tasks.forEach((task: Task) => {
                    if (task.type === 'learning_material') {
                        moduleItems.push({
                            id: task.id.toString(),
                            title: task.title,
                            position: task.ordering,
                            type: 'material',
                            content: [], // Empty content initially
                            status: task.status
                        });
                    } else if (task.type === 'quiz') {
                        moduleItems.push({
                            id: task.id.toString(),
                            title: task.title,
                            position: task.ordering,
                            type: 'quiz',
                            questions: [], // Empty questions initially
                            status: task.status
                        });
                    } else if (task.type === 'exam') {
                        moduleItems.push({
                            id: task.id.toString(),
                            title: task.title,
                            position: task.ordering,
                            type: 'exam',
                            questions: [], // Empty questions initially
                            status: task.status
                        });
                    }
                });

                // Sort items by position/ordering
                moduleItems.sort((a, b) => a.position - b.position);
            }

            return {
                id: milestone.id.toString(),
                title: milestone.name,
                position: milestone.ordering,
                items: moduleItems,
                isExpanded: false,
                backgroundColor: `${milestone.color}80`, // Add 50% opacity for UI display
            };
        });

        // Sort modules by position/ordering
        transformedModules.sort((a, b) => a.position - b.position);
        setCourseModules(transformedModules);
    };

    // Handle course tab selection
    const handleCourseSelect = (index: number) => {
        setActiveCourseIndex(index);
        transformCourseToModules(courses[index]);
    };

    // Handle cohort selection
    const handleCohortSelect = (cohort: Cohort) => {
        setActiveCohort(cohort);
    };

    // Show loading state while auth is loading
    if (authLoading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Header showCreateCourseButton={false} />
                <div className="flex justify-center items-center py-12">
                    <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated && !authLoading) {
        // Use client-side redirect
        router.push('/login');
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Header showCreateCourseButton={false} />
                <div className="flex justify-center items-center py-12">
                    <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!school) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p>School not found</p>
            </div>
        );
    }

    return (
        <>
            <Header
                showCreateCourseButton={false}
                cohorts={cohorts}
                activeCohort={activeCohort}
                onCohortSelect={handleCohortSelect}
            />
            <div className="min-h-screen bg-black text-white">
                <div className="container mx-auto px-4 py-8">
                    <main>
                        {cohorts.length === 0 && (
                            <div className="mt-24">
                                <div className="flex flex-col items-center justify-center py-12 rounded-lg">
                                    <h3 className="text-xl font-light mb-2">No cohorts available</h3>
                                    <p className="text-gray-400">You are not enrolled in any cohorts for this school</p>
                                </div>
                            </div>
                        )}

                        {cohorts.length > 0 && activeCohort && (
                            <>
                                {loadingCourses ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                                    </div>
                                ) : courseError ? (
                                    <div className="mt-12 text-center">
                                        <p className="text-red-400 mb-4">{courseError}</p>
                                        <button
                                            onClick={() => {
                                                if (activeCohort) {
                                                    fetchCohortCourses(activeCohort.id);
                                                }
                                            }}
                                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : courses.length === 0 ? (
                                    <div className="mt-12 text-center">
                                        <h3 className="text-xl font-light mb-2">No courses available</h3>
                                        <p className="text-gray-400">There are no courses in this cohort yet</p>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        {/* Course Content using LearnerCohortView */}
                                        <div className="w-full">
                                            {courses.length > 0 && (
                                                <div className="w-full">
                                                    <LearnerCohortView
                                                        courseTitle={courses.length > 1 ? "" : courses[activeCourseIndex].name}
                                                        modules={courseModules}
                                                        schoolId={school.id.toString()}
                                                        cohortId={activeCohort?.id.toString()}
                                                        streakDays={2}
                                                        activeDays={["M", "T"]}
                                                        completedTaskIds={completedTaskIds}
                                                        completedQuestionIds={completedQuestionIds}
                                                        courses={courses}
                                                        onCourseSelect={handleCourseSelect}
                                                        activeCourseIndex={activeCourseIndex}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
} 