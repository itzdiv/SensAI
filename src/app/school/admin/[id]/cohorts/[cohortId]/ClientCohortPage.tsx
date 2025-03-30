"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Users, BookOpen, Layers, ArrowLeft, UsersRound, X, Plus, Trash2, Upload, Mail, ChevronDown, Check, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import Toast from "@/components/Toast";
import CoursePublishSuccessBanner from "@/components/CoursePublishSuccessBanner";
import ClientLeaderboardView from "@/app/school/[id]/cohort/[cohortId]/leaderboard/ClientLeaderboardView";

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

function InviteModal({
    isOpen,
    onClose,
    onSubmit,
    submitButtonText,
    isSubmitting,
    role
}: InviteModalProps) {
    const [emailInputs, setEmailInputs] = useState<EmailInput[]>([{ id: '1', email: '' }]);
    const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

    // Effect to focus and scroll to newly added inputs
    useEffect(() => {
        if (!newlyAddedId || !isOpen) return;

        // Focus the input
        const inputElement = inputRefs.current[newlyAddedId];
        if (inputElement) {
            setTimeout(() => {
                inputElement.focus();

                // Scroll the container to show the new input
                if (scrollContainerRef.current) {
                    const containerRect = scrollContainerRef.current.getBoundingClientRect();
                    const inputRect = inputElement.getBoundingClientRect();

                    // If the input is below the visible area, scroll to it
                    if (inputRect.bottom > containerRect.bottom) {
                        inputElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                }
            }, 50); // Small delay to ensure the DOM is updated
        }

        // Reset the newly added id
        setNewlyAddedId(null);
    }, [newlyAddedId, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const newInputs = emailInputs.map(input => ({
            ...input,
            error: !input.email.trim() ? 'Email is required' :
                !validateEmail(input.email.trim()) ? 'Invalid email' :
                    undefined
        }));
        setEmailInputs(newInputs);

        if (!newInputs.some(input => input.error)) {
            const validEmails = newInputs
                .filter(input => input.email.trim())
                .map(input => input.email.trim());

            try {
                await onSubmit(validEmails);
                setEmailInputs([{ id: '1', email: '' }]);
                onClose();
            } catch (error) {
                console.error(`Failed to add ${role}s:`, error);
                // Errors are now handled in the parent component through the rejected Promise
            }
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-lg bg-[#1A1A1A] rounded-lg shadow-2xl py-2`}
                onClick={e => e.stopPropagation()}
            >

                <div className="px-6 py-4">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-4 text-gray-400 hover:text-white transition-colors cursor-pointer w-full mb-4 bg-[#0A0A0A] rounded-lg p-4 pr-2 border border-dashed border-[#0A0A0A] hover:border-white hover:bg-[#111] focus:outline-none group`}
                    >
                        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                            <Upload size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className={`text-white text-base font-light`}>Import CSV</span>
                            <span className={`text-gray-400 text-sm`}>Upload a CSV file with one email per row</span>
                        </div>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const text = event.target?.result as string;
                                    const emails = text.split(/\r?\n/).filter(email => email.trim());
                                    const newInputs = emails.map((email, index) => ({
                                        id: Math.random().toString(),
                                        email: email.trim(),
                                        error: validateEmail(email.trim()) ? undefined : 'Invalid email'
                                    }));
                                    setEmailInputs(newInputs);
                                };
                                reader.readAsText(file);
                            }
                        }}
                    />

                    <div
                        ref={scrollContainerRef}
                        className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
                    >
                        {emailInputs.map((input, index) => (
                            <div key={input.id} className="flex items-center gap-2">
                                <div className="flex-1">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Mail
                                                size={18}
                                                className={`transition-colors ${focusedInputId === input.id ? 'text-white' : 'text-gray-500'}`}
                                            />
                                        </div>
                                        <input
                                            ref={el => {
                                                inputRefs.current[input.id] = el;
                                            }}
                                            type="email"
                                            value={input.email}
                                            onChange={(e) => {
                                                const newInputs = [...emailInputs];
                                                newInputs[index].email = e.target.value;
                                                newInputs[index].error = validateEmail(e.target.value) ? undefined : 'Invalid email';
                                                setEmailInputs(newInputs);
                                            }}
                                            onFocus={() => setFocusedInputId(input.id)}
                                            onBlur={() => setFocusedInputId(null)}
                                            placeholder="Enter email address"
                                            className={`w-full bg-[#0A0A0A] pl-10 pr-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none ${input.error && focusedInputId !== input.id
                                                ? 'border-2 border-red-500'
                                                : focusedInputId === input.id
                                                    ? 'border border-white'
                                                    : 'border-0'
                                                } focus:border focus:!border-white focus:ring-0 transition-all duration-0`}
                                        />
                                    </div>
                                    {input.error && focusedInputId !== input.id && (
                                        <p className="text-red-500 text-sm mt-1">{input.error}</p>
                                    )}
                                </div>
                                {emailInputs.length > 1 && (
                                    <button
                                        onClick={() => {
                                            setEmailInputs(emailInputs.filter(e => e.id !== input.id));
                                        }}
                                        className="text-gray-400 hover:text-white transition-colors p-2 cursor-pointer focus:outline-none self-start mt-1.5"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            const newId = Math.random().toString();
                            setEmailInputs([...emailInputs, { id: newId, email: '' }]);
                            setFocusedInputId(newId);
                            setNewlyAddedId(newId);
                        }}
                        className={`flex items-center gap-2 text-gray-400 hover:text-white w-full py-3 px-4 rounded-lg transition-colors mt-2 cursor-pointer focus:outline-none hover:bg-[#111]`}
                    >
                        <Plus size={20} />
                        <span>Add another email</span>
                    </button>
                </div>

                <div className={`flex justify-end gap-4 px-6 py-4`}>
                    <button
                        onClick={() => {
                            onClose();
                            setEmailInputs([{ id: '1', email: '' }]);
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-light cursor-pointer focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSubmitting ? (role === 'learner' ? 'Inviting...' : 'Adding...') : submitButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ClientCohortPage({ schoolId, cohortId }: ClientCohortPageProps) {
    const router = useRouter();
    const [tab, setTab] = useState<TabType>('learners');
    const [cohort, setCohort] = useState<Cohort | null>(null);
    const [isAddLearnersOpen, setIsAddLearnersOpen] = useState(false);
    const [isAddMentorsOpen, setIsAddMentorsOpen] = useState(false);
    const [emailInputs, setEmailInputs] = useState<EmailInput[]>([{ id: '1', email: '' }]);
    const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<{ id: number, email: string, role: 'learner' | 'mentor' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const [loading, setLoading] = useState(true);

    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [courseError, setCourseError] = useState<string | null>(null);
    const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
    const [courseSearchQuery, setCourseSearchQuery] = useState('');
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Add a new state for temporarily selected courses
    const [tempSelectedCourses, setTempSelectedCourses] = useState<Course[]>([]);

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

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            if (dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                !(target as Element).closest('[data-dropdown-toggle="true"]')) {
                setIsDropdownOpen(false);
            }
        }

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

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
                setFilteredCourses(coursesData);
                setIsLoadingCourses(false);
                return;
            }

            const cohortCoursesData: Course[] = await cohortCoursesResponse.json();
            const cohortCourseIds = cohortCoursesData.map(course => course.id);

            const availableCoursesData = coursesData.filter(course => !cohortCourseIds.includes(course.id));

            setAvailableCourses(availableCoursesData);
            setFilteredCourses(availableCoursesData);

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

    const handleCourseSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setCourseSearchQuery(query);

        if (availableCourses.length > 0) {
            if (query.trim() === '') {
                // Show all available courses that aren't temporarily selected
                setFilteredCourses(availableCourses.filter(course =>
                    !tempSelectedCourses.some(tc => tc.id === course.id)
                ));
            } else {
                // Filter by name AND exclude temp selected courses
                const filtered = availableCourses.filter(course =>
                    course.name.toLowerCase().includes(query.toLowerCase()) &&
                    !tempSelectedCourses.some(tc => tc.id === course.id)
                );
                setFilteredCourses(filtered);
            }
        }
    };

    // Update the selectCourse function to immediately filter out selected courses
    const selectCourse = (course: Course) => {
        // Check if already selected
        if (tempSelectedCourses.some(c => c.id === course.id)) {
            return; // Already selected, do nothing
        }

        // Add to temporary selection
        setTempSelectedCourses([...tempSelectedCourses, course]);

        // Remove from filtered courses immediately for better UX
        setFilteredCourses(prev => prev.filter(c => c.id !== course.id));
    };

    // Function to remove course from temporary selection and add it back to filtered list
    const removeTempCourse = (courseId: number) => {
        // Find the course to remove
        const courseToRemove = tempSelectedCourses.find(course => course.id === courseId);

        // Remove from temp selection
        setTempSelectedCourses(tempSelectedCourses.filter(course => course.id !== courseId));

        // Add back to filtered courses if it matches the current search
        if (courseToRemove &&
            (courseSearchQuery.trim() === '' ||
                courseToRemove.name.toLowerCase().includes(courseSearchQuery.toLowerCase()))) {
            setFilteredCourses(prev => [...prev, courseToRemove]);
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
                    // Add to filtered courses if it matches the current search
                    if (courseSearchQuery.trim() === '' || removedCourse.name.toLowerCase().includes(courseSearchQuery.toLowerCase())) {
                        setFilteredCourses(prev => [...prev, removedCourse]);
                    }
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

    // Function to handle the Add button click - this will make the API calls
    const handleAddSelectedCourses = async () => {
        // If no courses selected, just close the dropdown
        if (tempSelectedCourses.length === 0) {
            setIsDropdownOpen(false);
            return;
        }

        // Show loading state
        setIsLoadingCourses(true);

        try {
            // Extract all course IDs from the selected courses
            const courseIds = tempSelectedCourses.map(course => course.id);

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
                const newCourses = tempSelectedCourses.filter(c => !existingCourseIds.includes(c.id));

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
                prev.filter(c => !tempSelectedCourses.some(tc => tc.id === c.id))
            );

            setFilteredCourses(prev =>
                prev.filter(c => !tempSelectedCourses.some(tc => tc.id === c.id))
            );

            // Set course link details for success banner
            setCourseLinkDetails({
                courseCount: tempSelectedCourses.length,
                courseNames: tempSelectedCourses.map(course => course.name)
            });

            // Show success banner
            setShowCoursePublishBanner(true);

            // Clear temporary selection
            setTempSelectedCourses([]);

            // Close dropdown
            setIsDropdownOpen(false);

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

    const handleDeleteMember = (member: Member) => {
        setMemberToDelete(member);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteMember = async () => {
        if (!memberToDelete || !cohortId) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/members`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    member_ids: [memberToDelete.id]
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to delete member: ${response.status}`);
            }

            setCohort(prev => prev ? {
                ...prev,
                members: prev.members.filter(member => member.id !== memberToDelete.id)
            } : null);

            // Show success toast
            setToastTitle('Scaling it down');
            setToastDescription(`Removed ${memberToDelete.email} from the cohort`);
            setToastEmoji(memberToDelete.role === 'learner' ? '👋' : '👨‍🏫');
            setShowToast(true);
        } catch (error) {
            console.error('Error deleting member:', error);

            // Show error toast
            setToastTitle('Error');
            let errorMessage = 'Failed to remove member. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            setToastDescription(errorMessage);
            setToastEmoji('❌');
            setShowToast(true);

            throw error;
        } finally {
            setIsDeleteConfirmOpen(false);
            setMemberToDelete(null);
        }
    };

    const handleAddMembers = async (emails: string[], role: 'learner' | 'mentor') => {
        setIsSubmitting(true);
        try {
            await addMembers(emails, emails.map(() => role));

            setToastTitle('Bumping it up');

            // Show success toast based on role
            if (role === 'learner') {
                setToastDescription(`Added ${emails.length} learner${emails.length > 1 ? 's' : ''} to the cohort`);
                setToastEmoji('📧');
            } else {
                setToastDescription(`Added ${emails.length} mentor${emails.length > 1 ? 's' : ''} to the cohort`);
                setToastEmoji('👩‍🏫');
            }
            setShowToast(true);
        } catch (error) {
            console.error(`Failed to add ${role}s:`, error);

            // Show error toast
            setToastTitle('Error');
            // Extract error message from the error object
            let errorMessage = 'Failed to add members. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            setToastDescription(errorMessage);
            setToastEmoji('❌');
            setShowToast(true);

            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    const addMembers = async (emails: string[], roles: string[]) => {
        if (!cohortId) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emails,
                    roles,
                }),
            });

            if (!response.ok) {
                // Try to extract more detailed error message from response
                let errorText = 'Failed to add members. Please try again.';
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        // Use the specific detail message from the API
                        errorText = errorData.detail;
                    } else if (errorData.message) {
                        errorText = errorData.message;
                    } else if (errorData.error) {
                        errorText = errorData.error;
                    }
                } catch (parseError) {
                    // If parsing JSON fails, use default error message
                    console.error('Could not parse error response:', parseError);
                }
                throw new Error(errorText);
            }

            const cohortResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}`);
            const cohortData = await cohortResponse.json();
            setCohort({
                ...cohort!,
                members: cohortData.members || [],
            });

        } catch (error) {
            console.error('Error adding members:', error);
            throw error;
        }
    };

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

                                    {/* Link Course button moved to top right */}
                                    <div className="relative">
                                        <button
                                            data-dropdown-toggle="true"
                                            className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                                            onClick={() => {
                                                setIsDropdownOpen(!isDropdownOpen);
                                                if (!isDropdownOpen) {
                                                    // Reset the temporary selected courses when opening the dropdown
                                                    setTempSelectedCourses([]);
                                                    fetchAvailableCourses();
                                                }
                                            }}
                                        >
                                            <Plus size={16} />
                                            <span>Link Course</span>
                                        </button>

                                        {isDropdownOpen && (
                                            <div
                                                ref={dropdownRef}
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute top-full right-0 mt-2 py-2 w-[400px] bg-[#1A1A1A] rounded-lg shadow-xl z-50">
                                                <div className="p-4 pb-2">
                                                    {/* Only show search when there are available courses */}
                                                    {!(totalSchoolCourses === 0 || availableCourses.length === 0) && (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                placeholder="Search courses"
                                                                className="w-full bg-[#111] rounded-md px-3 py-2 text-white"
                                                                value={courseSearchQuery}
                                                                onChange={handleCourseSearch}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Show temporarily selected courses right below the search bar */}
                                                    {tempSelectedCourses.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {tempSelectedCourses.map(course => (
                                                                <div
                                                                    key={course.id}
                                                                    className="flex items-center bg-[#222] px-3 py-1 rounded-full"
                                                                >
                                                                    <span className="text-white text-sm font-light mr-2">{course.name}</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeTempCourse(course.id);
                                                                        }}
                                                                        className="text-gray-400 hover:text-white cursor-pointer"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="max-h-72 overflow-y-auto py-2 px-2">
                                                    {isLoadingCourses ? (
                                                        <div className="flex justify-center items-center py-6">
                                                            <div className="w-8 h-8 border-2 border-t-purple-500 border-r-purple-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    ) : courseError ? (
                                                        <div className="p-4 text-center">
                                                            <p className="text-red-400 mb-2">{courseError}</p>
                                                            <button
                                                                className="text-purple-400 hover:text-purple-300 cursor-pointer"
                                                                onClick={fetchAvailableCourses}
                                                            >
                                                                Try again
                                                            </button>
                                                        </div>
                                                    ) : filteredCourses.length === 0 ? (
                                                        <div className="p-4 text-center">
                                                            {totalSchoolCourses === 0 ? (
                                                                // School has no courses at all
                                                                <>
                                                                    <h3 className="text-lg font-light mb-1">No courses available</h3>
                                                                    <p className="text-gray-400 text-sm">Create courses in your school that you can publish to your cohort</p>
                                                                    <Link
                                                                        href={`/school/admin/${schoolId}#courses`}
                                                                        className="mt-4 inline-block px-4 py-3 text-sm bg-white text-black rounded-full hover:opacity-90 transition-opacity"
                                                                    >
                                                                        Go to School
                                                                    </Link>
                                                                </>
                                                            ) : availableCourses.length === 0 ? (
                                                                // All school courses are already in the cohort
                                                                <>
                                                                    <h3 className="text-lg font-light mb-1">No courses left</h3>
                                                                    <p className="text-gray-400 text-sm">All courses from your school have been added to this cohort</p>
                                                                    <Link
                                                                        href={`/school/admin/${schoolId}#courses`}
                                                                        className="mt-4 inline-block px-4 py-3 text-sm bg-white text-black rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                                                                    >
                                                                        Create more courses
                                                                    </Link>
                                                                </>
                                                            ) : tempSelectedCourses.length > 0 ? (
                                                                // All available courses have been temporarily selected
                                                                <>
                                                                    <h3 className="text-lg font-light mb-1">All courses selected</h3>
                                                                    <p className="text-gray-400 text-sm">You have selected all available courses</p>
                                                                </>
                                                            ) : (
                                                                // Search returned no results
                                                                <>
                                                                    <h3 className="text-lg font-light mb-1">No matching courses</h3>
                                                                    <p className="text-gray-400 text-sm">Try a different search term</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            {filteredCourses.map(course => (
                                                                <div
                                                                    key={course.id}
                                                                    className="flex items-center px-3 py-1.5 hover:bg-[#222] rounded-md cursor-pointer"
                                                                    onClick={() => selectCourse(course)}
                                                                >
                                                                    <div className="w-6 h-6 bg-purple-900 rounded-md flex items-center justify-center mr-2">
                                                                        <BookOpen size={14} className="text-white" />
                                                                    </div>
                                                                    <p className="text-white text-sm font-light">{course.name}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Add button at the end of the list */}
                                                    {(filteredCourses.length > 0 || tempSelectedCourses.length > 0) && (
                                                        <div className="px-2 pt-4 pb-1">
                                                            <button
                                                                className="w-full bg-white text-black py-3 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                                                                onClick={handleAddSelectedCourses}
                                                                disabled={isLoadingCourses}
                                                            >
                                                                {isLoadingCourses ? "Linking..." : "Link courses with cohort"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
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
                                        <Users size={16} className="mr-2" />
                                        Learners
                                    </div>
                                </button>
                                <button
                                    className={`flex-1 px-4 py-2 font-light cursor-pointer ${tab === 'mentors' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setTab('mentors')}
                                >
                                    <div className="flex items-center justify-center">
                                        <BookOpen size={16} className="mr-2" />
                                        Mentors
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Content sections with full width */}
                        {tab === 'dashboard' && (
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Left side - Empty for now */}
                                <div className="lg:w-2/3">
                                    {/* Dashboard content will be added later */}
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <h2 className="text-4xl font-light mb-4">Dashboard</h2>
                                        <p className="text-gray-400 mb-8">Dashboard content will be added soon</p>
                                    </div>
                                </div>

                                {/* Right side - Leaderboard */}
                                <div className="lg:w-1/2 space-y-6">
                                    {/* Use ClientLeaderboardView instead of TopPerformers */}
                                    <ClientLeaderboardView
                                        cohortId={cohortId}
                                        cohortName={cohort?.name}
                                        view='admin'
                                        topN={5}
                                    />
                                    {/* View All Leaderboard Button */}
                                    {cohort?.members?.length > 5 && <div className="flex justify-center mt-4">
                                        <Link
                                            href={`/school/${schoolId}/cohort/${cohortId}/leaderboard`}
                                            className="group px-4 py-2 font-light rounded-md transition-all duration-200 flex items-center 
                        bg-white/10 hover:bg-white/15 text-gray-200 cursor-pointer"
                                        >
                                            <span>View Full Leaderboard</span>
                                            <ChevronRight size={16} className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
                                        </Link>
                                    </div>}
                                </div>
                            </div>
                        )}

                        {tab === 'learners' && (
                            <div>
                                {cohort?.members?.filter(m => m.role === 'learner').length > 0 && (
                                    <div className="flex justify-start items-center mb-6">
                                        <button
                                            className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                                            onClick={() => setIsAddLearnersOpen(true)}
                                        >
                                            Add Learners
                                        </button>
                                    </div>
                                )}

                                {cohort?.members?.filter(m => m.role === 'learner').length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-gray-800">
                                        <table className="min-w-full divide-y divide-gray-800">
                                            <thead className="bg-gray-900">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-[#111] divide-y divide-gray-800">
                                                {cohort?.members?.filter(member => member.role === 'learner').map(learner => (
                                                    <tr key={learner.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 flex justify-between items-center">
                                                            {learner.email}
                                                            <button
                                                                onClick={() => handleDeleteMember(learner)}
                                                                className="text-gray-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <h2 className="text-4xl font-light mb-4">Start building your cohort</h2>
                                        <p className="text-gray-400 mb-8">Create a group of learners who will take your course together</p>
                                        <button
                                            className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                                            onClick={() => setIsAddLearnersOpen(true)}
                                        >
                                            Add Learners
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'mentors' && (
                            <div>
                                {cohort?.members?.filter(m => m.role === 'mentor').length > 0 && (
                                    <div className="flex justify-start items-center mb-6">
                                        <button
                                            className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                                            onClick={() => setIsAddMentorsOpen(true)}
                                        >
                                            Add Mentors
                                        </button>
                                    </div>
                                )}

                                {cohort?.members?.filter(m => m.role === 'mentor').length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-gray-800">
                                        <table className="min-w-full divide-y divide-gray-800">
                                            <thead className="bg-gray-900">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-[#111] divide-y divide-gray-800">
                                                {cohort?.members?.filter(member => member.role === 'mentor').map(mentor => (
                                                    <tr key={mentor.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 flex justify-between items-center">
                                                            {mentor.email}
                                                            <button
                                                                onClick={() => handleDeleteMember(mentor)}
                                                                className="text-gray-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <h2 className="text-4xl font-light mb-4">Guide your learners</h2>
                                        <p className="text-gray-400 mb-8">Add mentors to support and inspire your learners</p>
                                        <button
                                            className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                                            onClick={() => setIsAddMentorsOpen(true)}
                                        >
                                            Add Mentors
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    </main>
                </div>
            </div>

            <InviteModal
                isOpen={isAddLearnersOpen}
                onClose={() => setIsAddLearnersOpen(false)}
                onSubmit={(emails) => handleAddMembers(emails, 'learner')}
                submitButtonText="Invite Learners"
                isSubmitting={isSubmitting}
                role="learner"
            />

            <InviteModal
                isOpen={isAddMentorsOpen}
                onClose={() => setIsAddMentorsOpen(false)}
                onSubmit={(emails) => handleAddMembers(emails, 'mentor')}
                submitButtonText="Invite Mentors"
                isSubmitting={isSubmitting}
                role="mentor"
            />

            <ConfirmationDialog
                open={isDeleteConfirmOpen}
                title={`Remove ${memberToDelete?.role === 'learner' ? 'Learner' : 'Mentor'}`}
                message={`Are you sure you want to remove ${memberToDelete?.email} from this cohort?`}
                confirmButtonText="Remove"
                onConfirm={confirmDeleteMember}
                onCancel={() => setIsDeleteConfirmOpen(false)}
                type="delete"
            />

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

function validateEmail(email: string): boolean {
    if (!email) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
} 