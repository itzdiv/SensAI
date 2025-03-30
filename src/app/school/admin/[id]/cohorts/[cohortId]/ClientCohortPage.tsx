"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Users, BookOpen, Layers, ArrowLeft, UsersRound, X, Plus, Trash2, Upload, Mail, ChevronDown, Check, FileText, ChevronRight, GraduationCap, School, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import Toast from "@/components/Toast";
import CoursePublishSuccessBanner from "@/components/CoursePublishSuccessBanner";
import ClientLeaderboardView from "@/app/school/[id]/cohort/[cohortId]/leaderboard/ClientLeaderboardView";
import Tooltip from "@/components/Tooltip";
import CohortMemberManagement from "@/components/CohortMemberManagement";
import CohortDashboard from "@/components/CohortDashboard";
import CohortCoursesLinkerDropdown from "@/components/CohortCoursesLinkerDropdown";

interface Course {
    id: number;
    name: string;
    description?: string;
    moduleCount?: number;
}

interface Member {
    id: number;
    email: string;
    role: 'learner' | 'mentor';
}

interface Cohort {
    id: number;
    org_id: number;
    name: string;
    members: Member[];
    groups: any[];
    courses?: Course[];
}

interface EmailInput {
    id: string;
    email: string;
    error?: string;
}

type TabType = 'dashboard' | 'learners' | 'mentors';

interface ClientCohortPageProps {
    schoolId: string;
    cohortId: string;
}

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (emails: string[]) => Promise<void>;
    submitButtonText: string;
    isSubmitting: boolean;
    role: 'learner' | 'mentor';
}

// Add new interface for course metrics
interface CourseMetrics {
    average_completion: number;
    num_tasks: number;
    num_active_learners: number;
    task_type_metrics: {
        quiz?: {
            completion_rate: number;
            count: number;
        };
        learning_material?: {
            completion_rate: number;
            count: number;
        };
        exam?: {
            completion_rate: number;
            count: number;
        };
    };
}

export default function ClientCohortPage({ schoolId, cohortId }: ClientCohortPageProps) {
    const [tab, setTab] = useState<TabType>('dashboard');
    const [cohort, setCohort] = useState<Cohort | null>(null);
    const [loading, setLoading] = useState(true);

    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [courseError, setCourseError] = useState<string | null>(null);
    const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

    // Add state to track total courses in the school
    const [totalSchoolCourses, setTotalSchoolCourses] = useState<number>(0);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastTitle, setToastTitle] = useState('');
    const [toastDescription, setToastDescription] = useState('');
    const [toastEmoji, setToastEmoji] = useState('');

    // Add two new state variables, below existing state variables like isDeleteConfirmOpen
    const [isCourseUnlinkConfirmOpen, setIsCourseUnlinkConfirmOpen] = useState(false);
    const [courseToUnlink, setCourseToUnlink] = useState<Course | null>(null);

    // Add state for course publish success banner
    const [showCoursePublishBanner, setShowCoursePublishBanner] = useState(false);
    const [courseLinkDetails, setCourseLinkDetails] = useState({
        courseCount: 0,
        courseNames: [] as string[]
    });

    // Add useEffect to automatically hide toast after 5 seconds
    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 5000);

            // Cleanup the timer when component unmounts or showToast changes
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    const fetchAvailableCourses = async () => {
        setIsLoadingCourses(true);
        setCourseError(null);
        try {
            const coursesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/?org_id=${schoolId}`);
            if (!coursesResponse.ok) {
                throw new Error(`Failed to fetch courses: ${coursesResponse.status}`);
            }
            const coursesData: Course[] = await coursesResponse.json();

            // Store the total number of courses in the school
            setTotalSchoolCourses(coursesData.length);

            const cohortCoursesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/courses`);
            if (!cohortCoursesResponse.ok) {
                setAvailableCourses(coursesData);
                setIsLoadingCourses(false);
                return;
            }

            const cohortCoursesData: Course[] = await cohortCoursesResponse.json();
            const cohortCourseIds = cohortCoursesData.map(course => course.id);

            const availableCoursesData = coursesData.filter(course => !cohortCourseIds.includes(course.id));

            setAvailableCourses(availableCoursesData);

            if (cohort) {
                setCohort(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        courses: cohortCoursesData
                    };
                });
                setSelectedCourseIds(cohortCoursesData.map(course => course.id));
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            setCourseError("Failed to load courses. Please try again.");
        } finally {
            setIsLoadingCourses(false);
        }
    };

    // Function to handle removing a course from the cohort
    const removeCourseFromCohort = async (courseId: number) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/courses`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course_ids: [courseId]
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to remove course from cohort: ${response.status}`);
            }

            setSelectedCourseIds(prev => prev.filter(id => id !== courseId));

            if (cohort?.courses) {
                const removedCourse = cohort.courses.find(course => course.id === courseId);

                setCohort(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        courses: prev.courses?.filter(course => course.id !== courseId) || []
                    };
                });

                if (removedCourse) {
                    setAvailableCourses(prev => [...prev, removedCourse]);
                }

                // Show success toast
                setToastTitle('Course unlinked');
                setToastDescription(`"${removedCourse?.name}" has been removed from this cohort`);
                setToastEmoji('📚');
                setShowToast(true);
            }
        } catch (error) {
            console.error("Error removing course from cohort:", error);

            // Show error toast
            setToastTitle('Error');
            let errorMessage = 'Failed to unlink course. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            setToastDescription(errorMessage);
            setToastEmoji('❌');
            setShowToast(true);
        } finally {
            // Reset state
            setCourseToUnlink(null);
            setIsCourseUnlinkConfirmOpen(false);
        }
    };

    // New function to initiate the course unlinking process with confirmation
    const initiateCourseUnlink = (course: Course) => {
        setCourseToUnlink(course);
        setIsCourseUnlinkConfirmOpen(true);
    };

    // Add a function to handle the course linking from the dropdown component
    const handleCoursesLinked = async (selectedCourses: Course[]) => {
        // Show loading state
        setIsLoadingCourses(true);

        try {
            // Extract all course IDs from the selected courses
            const courseIds = selectedCourses.map(course => course.id);

            // Make a single API call with all selected course IDs
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course_ids: courseIds
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to link courses to cohort: ${response.status}`);
            }

            // Update the cohort with added courses
            setCohort(prev => {
                if (!prev) return prev;

                // Get existing course IDs to avoid duplicates
                const existingCourseIds = prev.courses?.map(c => c.id) || [];

                // Filter out any courses that are already in the cohort
                const newCourses = selectedCourses.filter(c => !existingCourseIds.includes(c.id));

                return {
                    ...prev,
                    courses: [...(prev.courses || []), ...newCourses]
                };
            });

            // Update selected course IDs
            setSelectedCourseIds(prev => {
                return [...prev, ...courseIds];
            });

            // Remove added courses from available courses
            setAvailableCourses(prev =>
                prev.filter(c => !selectedCourses.some(tc => tc.id === c.id))
            );

            // Set course link details for success banner
            setCourseLinkDetails({
                courseCount: selectedCourses.length,
                courseNames: selectedCourses.map(course => course.name)
            });

            // Show success banner
            setShowCoursePublishBanner(true);

        } catch (error) {
            console.error("Error linking courses to cohort:", error);
            setCourseError("Failed to link courses. Please try again.");
        } finally {
            setIsLoadingCourses(false);
        }
    };

    // Add a function to close the course publish banner
    const closeCoursePublishBanner = () => {
        setShowCoursePublishBanner(false);
    };

    useEffect(() => {
        console.log("useEffect running with cohortId:", cohortId);

        const fetchCohort = async () => {
            if (!cohortId || cohortId === 'undefined') {
                console.error("Invalid cohortId:", cohortId);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                console.log("Fetching cohort with ID:", cohortId);
                const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}`;
                console.log("Fetch URL:", url);

                const cohortResponse = await fetch(url);
                console.log("Response status:", cohortResponse.status);

                if (!cohortResponse.ok) {
                    throw new Error(`API error: ${cohortResponse.status}`);
                }

                const cohortData = await cohortResponse.json();
                console.log("Cohort data received:", cohortData);

                setCohort(cohortData);
                setLoading(false);

                // Fetch courses in cohort
                try {
                    const cohortCoursesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/courses`);
                    if (cohortCoursesResponse.ok) {
                        const cohortCoursesData = await cohortCoursesResponse.json();
                        setCohort(prev => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                courses: cohortCoursesData
                            };
                        });
                        setSelectedCourseIds(cohortCoursesData.map((course: Course) => course.id));

                        // Set default tab to dashboard if courses exist
                        if (cohortCoursesData.length > 0) {
                            setTab('dashboard');
                        }
                    }

                    // Fetch available courses
                    fetchAvailableCourses();
                } catch (error) {
                    console.error("Error fetching cohort courses:", error);
                }
            } catch (error) {
                console.error("Error fetching cohort:", error);
                setCohort({
                    id: parseInt(cohortId),
                    name: "Cohort (Data Unavailable)",
                    org_id: 0,
                    members: [],
                    groups: []
                });
                setLoading(false);
            }
        };

        fetchCohort();
    }, [cohortId, schoolId]);

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

    if (!cohort) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p>Cohort not found</p>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
                button:focus, 
                input:focus, 
                a:focus,
                div:focus,
                *:focus {
                    outline: none !important;
                    box-shadow: none !important;
                }
                
                input::placeholder {
                    color: #666666 !important;
                }
            `}</style>
            <Header showCreateCourseButton={false} />
            <div className="min-h-screen bg-black text-white">
                <div className="container mx-auto px-4 py-8">
                    <main>
                        <div className="mb-4">
                            <div className="flex flex-col">
                                <Link
                                    href={`/school/admin/${schoolId}#cohorts`}
                                    className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
                                >
                                    <ArrowLeft size={16} className="mr-2" />
                                    Back To Cohorts
                                </Link>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center flex-1">
                                        <div className="w-12 h-12 bg-purple-700 rounded-lg flex items-center justify-center mr-4">
                                            <Layers size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-light outline-none">
                                                {cohort.name}
                                            </h1>
                                        </div>
                                    </div>

                                    {/* Link Course button and dropdown */}
                                    <div className="relative">
                                        <button
                                            data-dropdown-toggle="true"
                                            className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                                            onClick={() => {
                                                setIsDropdownOpen(!isDropdownOpen);
                                                if (!isDropdownOpen) {
                                                    fetchAvailableCourses();
                                                }
                                            }}
                                        >
                                            <Plus size={16} />
                                            <span>Link Course</span>
                                        </button>

                                        {/* Use the new dropdown component */}
                                        <CohortCoursesLinkerDropdown
                                            isOpen={isDropdownOpen}
                                            onClose={() => setIsDropdownOpen(false)}
                                            availableCourses={availableCourses}
                                            totalSchoolCourses={totalSchoolCourses}
                                            isLoadingCourses={isLoadingCourses}
                                            courseError={courseError}
                                            schoolId={schoolId}
                                            cohortId={cohortId}
                                            onCoursesLinked={handleCoursesLinked}
                                            onFetchAvailableCourses={fetchAvailableCourses}
                                        />
                                    </div>
                                </div>

                                {/* Display linked courses below cohort name */}
                                {cohort?.courses && cohort.courses.length > 0 && (
                                    <div className="mt-6">
                                        <h2 className="mb-3 text-sm font-light">Courses</h2>
                                        <div className="flex flex-wrap gap-3">
                                            {cohort.courses.map(course => (
                                                <div
                                                    key={course.id}
                                                    className="flex items-center bg-[#222] px-4 py-2 rounded-full group hover:bg-[#333] transition-colors"
                                                >
                                                    <span className="text-white text-sm font-light mr-3">{course.name}</span>
                                                    <button
                                                        onClick={() => initiateCourseUnlink(course)}
                                                        className="text-gray-400 hover:text-white cursor-pointer"
                                                        aria-label="Remove course from cohort"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Full-width tabs */}
                        <div className="mb-8">
                            <div className="flex border-b border-gray-800">
                                {/* Show Dashboard tab only when courses exist */}
                                {cohort?.courses && cohort.courses.length > 0 && (
                                    <button
                                        className={`flex-1 px-4 py-2 font-light cursor-pointer ${tab === 'dashboard' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                        onClick={() => setTab('dashboard')}
                                    >
                                        <div className="flex items-center justify-center">
                                            <FileText size={16} className="mr-2" />
                                            Dashboard
                                        </div>
                                    </button>
                                )}
                                <button
                                    className={`flex-1 px-4 py-2 font-light cursor-pointer ${tab === 'learners' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setTab('learners')}
                                >
                                    <div className="flex items-center justify-center">
                                        <GraduationCap size={16} className="mr-2" />
                                        Learners
                                    </div>
                                </button>
                                <button
                                    className={`flex-1 px-4 py-2 font-light cursor-pointer ${tab === 'mentors' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setTab('mentors')}
                                >
                                    <div className="flex items-center justify-center">
                                        <School size={16} className="mr-2" />
                                        Mentors
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Content sections with full width */}
                        {tab === 'dashboard' && (
                            <CohortDashboard
                                cohort={cohort}
                                cohortId={cohortId}
                                schoolId={schoolId}
                            />
                        )}

                        {tab === 'learners' && (
                            <CohortMemberManagement
                                cohort={cohort}
                                role="learner"
                                cohortId={cohortId}
                                onShowToast={(title, description, emoji) => {
                                    setToastTitle(title);
                                    setToastDescription(description);
                                    setToastEmoji(emoji);
                                    setShowToast(true);
                                }}
                                updateCohort={(updatedMembers) => {
                                    setCohort(prev => prev ? {
                                        ...prev,
                                        members: updatedMembers
                                    } : null);
                                }}
                            />
                        )}

                        {tab === 'mentors' && (
                            <CohortMemberManagement
                                cohort={cohort}
                                role="mentor"
                                cohortId={cohortId}
                                onShowToast={(title, description, emoji) => {
                                    setToastTitle(title);
                                    setToastDescription(description);
                                    setToastEmoji(emoji);
                                    setShowToast(true);
                                }}
                                updateCohort={(updatedMembers) => {
                                    setCohort(prev => prev ? {
                                        ...prev,
                                        members: updatedMembers
                                    } : null);
                                }}
                            />
                        )}

                    </main>
                </div>
            </div>

            {/* Add the course unlinking confirmation dialog near the other dialog components
            at the end of the component, before the final Toast component */}
            <ConfirmationDialog
                open={isCourseUnlinkConfirmOpen}
                title="Remove Course From Cohort"
                message={`Are you sure you want to remove "${courseToUnlink?.name}" from this cohort? Learners will no longer have access to this course`}
                confirmButtonText="Remove"
                onConfirm={() => courseToUnlink && removeCourseFromCohort(courseToUnlink.id)}
                onCancel={() => setIsCourseUnlinkConfirmOpen(false)}
                type="delete"
            />

            {/* Toast notification */}
            <Toast
                show={showToast}
                title={toastTitle}
                description={toastDescription}
                emoji={toastEmoji}
                onClose={() => setShowToast(false)}
            />

            {/* Add CoursePublishSuccessBanner component before the final closing tag */}
            <CoursePublishSuccessBanner
                isOpen={showCoursePublishBanner}
                onClose={closeCoursePublishBanner}
                cohortCount={1}
                cohortNames={[cohort?.name || '']}
                courseCount={courseLinkDetails.courseCount}
                courseNames={courseLinkDetails.courseNames}
                source="cohort"
            />
        </>
    );
} 