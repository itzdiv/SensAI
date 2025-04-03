"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Building, ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import CohortCard from "@/components/CohortCard";
import { useAuth } from "@/lib/auth";
import LearnerCohortView from "@/components/LearnerCohortView";
import { Module, ModuleItem } from "@/types/course";
import { getCompletionData } from "@/lib/api";
import { Cohort, Task, Milestone } from "@/types";
import { transformCourseToModules } from "@/lib/course";

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
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [courseError, setCourseError] = useState<string | null>(null);
    const [courseModules, setCourseModules] = useState<Module[]>([]);
    const [showCohortSelector, setShowCohortSelector] = useState<boolean>(false);

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

                console.log("cohortsData", cohortsData);

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
                const modules = transformCourseToModules(coursesData[0]);
                setCourseModules(modules);
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

    // Handle course tab selection
    const handleCourseSelect = (index: number) => {
        setActiveCourseIndex(index);
        const modules = transformCourseToModules(courses[index]);
        setCourseModules(modules);
    };

    // Handle cohort selection
    const handleCohortSelect = (cohort: Cohort) => {
        setActiveCohort(cohort);
        setShowCohortSelector(false);
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
                <div className="container mx-auto py-4 md:py-8">
                    <main>
                        {cohorts.length === 0 && (
                            <div className="mt-24 px-4">
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
                                    <div className="mt-12 text-center px-4">
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
                                    <div className="mt-12 text-center px-4">
                                        <h3 className="text-xl font-light mb-2">No courses available</h3>
                                        <p className="text-gray-400">There are no courses in this cohort yet</p>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        {/* Mobile Cohort Banner - Only show on mobile when multiple cohorts exist */}
                                        {cohorts.length > 1 && activeCohort && (
                                            <div className="w-full bg-gray-900 p-4 mb-6">
                                                <div className="flex justify-between items-center">
                                                    <h2 className="text-white font-light text-lg truncate mr-2">
                                                        {activeCohort.name}
                                                    </h2>
                                                    <button
                                                        className="bg-transparent text-white font-light text-sm border border-gray-700 rounded-full px-3 py-1 hover:bg-gray-800 transition-colors cursor-pointer"
                                                        onClick={() => setShowCohortSelector(true)}
                                                    >
                                                        Switch
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mobile Cohort Selector Bottom Sheet */}
                                        {showCohortSelector && (
                                            <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col justify-end">
                                                <div className="bg-black border-t border-gray-800 rounded-t-xl max-h-[80vh] overflow-hidden">
                                                    <div className="flex justify-between items-center p-4 border-b border-gray-800">
                                                        <h3 className="text-white font-light text-lg">Switch Cohort</h3>
                                                        <button
                                                            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                                            onClick={() => setShowCohortSelector(false)}
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                    <div className="overflow-y-auto p-1 max-h-[calc(80vh-60px)]">
                                                        {cohorts.map(cohort => (
                                                            <button
                                                                key={cohort.id}
                                                                className={`flex w-full items-center p-4 text-left hover:bg-gray-800 cursor-pointer ${activeCohort && activeCohort.id === cohort.id ? 'bg-gray-800' : ''}`}
                                                                onClick={() => handleCohortSelect(cohort)}
                                                            >
                                                                <span className="text-white font-light">{cohort.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Course Content using LearnerCohortView */}
                                        <div className="w-full px-4">
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