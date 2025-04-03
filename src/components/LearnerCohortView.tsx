import React, { useState, useEffect, useCallback, useRef } from "react";
import LearnerCourseView from "./LearnerCourseView";
import LearningStreak from "./LearningStreak";
import TopPerformers from "./TopPerformers";
import { Module } from "@/types/course";
import { useAuth } from "@/lib/auth";
import { Course, Cohort } from "@/types";
import { ChevronDown } from "lucide-react";
import MobileDropdown, { DropdownOption } from "./MobileDropdown";

// Constants for localStorage keys
const LAST_INCREMENT_DATE_KEY = 'streak_last_increment_date';
const LAST_STREAK_COUNT_KEY = 'streak_last_count';

interface LearnerCohortViewProps {
    courseTitle: string;
    modules: Module[];
    schoolId?: string;
    cohortId?: string;
    streakDays?: number;
    activeDays?: string[];
    completedTaskIds?: Record<string, boolean>;
    completedQuestionIds?: Record<string, Record<string, boolean>>;
    courses?: Course[];
    onCourseSelect?: (index: number) => void;
    activeCourseIndex?: number;
}

interface StreakData {
    streak_count: number;
    active_days: string[]; // Format: YYYY-MM-DD
}

export default function LearnerCohortView({
    courseTitle,
    modules,
    schoolId,
    cohortId,
    streakDays = 0,
    activeDays = [],
    completedTaskIds = {},
    completedQuestionIds = {},
    courses = [],
    onCourseSelect,
    activeCourseIndex = 0,
}: LearnerCohortViewProps) {
    // Add state to manage completed tasks and questions
    const [localCompletedTaskIds, setLocalCompletedTaskIds] = useState<Record<string, boolean>>(completedTaskIds);
    const [localCompletedQuestionIds, setLocalCompletedQuestionIds] = useState<Record<string, Record<string, boolean>>>(completedQuestionIds);

    // State to track whether to show the TopPerformers component
    const [showTopPerformers, setShowTopPerformers] = useState<boolean>(true);

    // State for mobile course dropdown
    const [mobileDropdownOpen, setMobileDropdownOpen] = useState<boolean>(false);
    const courseDropdownRef = useRef<HTMLDivElement>(null);

    // Add useEffect to monitor showTopPerformers changes
    useEffect(() => {
        console.log("showTopPerformers changed to:", showTopPerformers);
    }, [showTopPerformers]);

    // Add useEffect to update local state when props change
    useEffect(() => {
        setLocalCompletedTaskIds(completedTaskIds);
    }, [completedTaskIds]);

    useEffect(() => {
        setLocalCompletedQuestionIds(completedQuestionIds);
    }, [completedQuestionIds]);

    // Add state for streak data
    const [streakCount, setStreakCount] = useState<number>(streakDays);
    const [activeWeekDays, setActiveWeekDays] = useState<string[]>(activeDays);
    const [isLoadingStreak, setIsLoadingStreak] = useState<boolean>(false);

    // Get user from auth context
    const { user } = useAuth();
    const userId = user?.id || '';

    // Use refs for last increment tracking to avoid dependency cycles
    const lastIncrementDateRef = useRef<string | null>(null);
    const lastStreakCountRef = useRef<number>(streakDays);
    const isInitialLoadRef = useRef(true);

    // Load persisted values from localStorage when component mounts
    useEffect(() => {
        if (typeof window === 'undefined' || !userId || !cohortId) return;

        const storageKeyDate = `${LAST_INCREMENT_DATE_KEY}_${userId}_${cohortId}`;
        const storageKeyCount = `${LAST_STREAK_COUNT_KEY}_${userId}_${cohortId}`;

        const storedDate = localStorage.getItem(storageKeyDate);
        if (storedDate) {
            lastIncrementDateRef.current = storedDate;
        }

        const storedCount = localStorage.getItem(storageKeyCount);
        if (storedCount) {
            lastStreakCountRef.current = parseInt(storedCount, 10);
        }
    }, [userId, cohortId]);

    // Function to convert date to day of week abbreviation (S, M, T, W, T, F, S)
    const convertDateToDayOfWeek = useCallback((dateString: string): string => {
        const date = new Date(dateString);
        const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday, etc.

        // Return unique identifiers for each day, with position index to distinguish Sunday (0) and Saturday (6)
        // This allows us to still show "S" for both Saturday and Sunday in the UI,
        // but have a way to uniquely identify them internally
        const dayIdentifiers = ["S_0", "M", "T", "W", "T", "F", "S_6"];
        return dayIdentifiers[dayIndex];
    }, []);

    // Get today's date in YYYY-MM-DD format
    const getTodayDateString = useCallback((): string => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }, []);

    // Check if we already incremented streak today
    const isStreakIncrementedToday = useCallback((): boolean => {
        return lastIncrementDateRef.current === getTodayDateString();
    }, [getTodayDateString]);

    // Create a fetchStreakData function that can be reused
    const fetchStreakData = useCallback(async () => {
        // Only fetch if we have both user ID and cohort ID
        if (!userId || !cohortId) return;

        // Don't fetch if streak was already incremented today
        if (isStreakIncrementedToday() && !isInitialLoadRef.current) {
            console.log("Streak already incremented today, skipping fetch");
            return;
        }

        // Clear the initial load flag
        isInitialLoadRef.current = false;

        setIsLoadingStreak(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${userId}/streak?cohort_id=${cohortId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch streak data: ${response.status}`);
            }

            const data: StreakData = await response.json();

            // Check if streak count has increased since last fetch
            const hasStreakIncremented = data.streak_count > lastStreakCountRef.current;

            // If streak has increased, save today as the last increment date
            if (hasStreakIncremented) {

                const today = getTodayDateString();
                lastIncrementDateRef.current = today;

                // Save to localStorage
                localStorage.setItem(
                    `${LAST_INCREMENT_DATE_KEY}_${userId}_${cohortId}`,
                    today
                );

                console.log("Streak incremented! New streak:", data.streak_count);
                console.log("showTopPerformers", showTopPerformers);

                if (!showTopPerformers) {
                    // If streak has been incremented today, show the TopPerformers component
                    setShowTopPerformers(true);
                }
            }

            // Update last streak count
            lastStreakCountRef.current = data.streak_count;
            localStorage.setItem(
                `${LAST_STREAK_COUNT_KEY}_${userId}_${cohortId}`,
                data.streak_count.toString()
            );

            // Set streak count and active days in state
            setStreakCount(data.streak_count);
            const dayAbbreviations = data.active_days.map(convertDateToDayOfWeek);
            setActiveWeekDays(dayAbbreviations);

        } catch (error) {
            console.error("Error fetching streak data:", error);
            // Keep existing values on error
        } finally {
            setIsLoadingStreak(false);
        }
    }, [userId, cohortId, convertDateToDayOfWeek, getTodayDateString, isStreakIncrementedToday, showTopPerformers]);

    // Fetch streak data when component mounts or when dependencies change
    useEffect(() => {
        if (userId && cohortId) {
            fetchStreakData();
        }
    }, [userId, cohortId, fetchStreakData]);

    // Handle dialog close event to refresh streak data
    const handleDialogClose = useCallback(() => {
        console.log("LearnerCourseView dialog closed, checking if streak needs update");
        if (!isStreakIncrementedToday()) {
            fetchStreakData();
        } else {
            console.log("Streak already incremented today, no need to fetch");
        }
    }, [fetchStreakData, isStreakIncrementedToday]);

    // Handler for task completion updates
    const handleTaskComplete = useCallback((taskId: string, isComplete: boolean) => {
        setLocalCompletedTaskIds(prev => ({
            ...prev,
            [taskId]: isComplete
        }));

        // If a task was completed, check for streak update after a small delay
        if (isComplete && !isStreakIncrementedToday()) {
            setTimeout(() => {
                fetchStreakData();
            }, 500);
        }
    }, [fetchStreakData, isStreakIncrementedToday]);

    // Handler for question completion updates
    const handleQuestionComplete = useCallback((taskId: string, questionId: string, isComplete: boolean) => {
        setLocalCompletedQuestionIds(prev => {
            const updatedQuestionIds = { ...prev };

            // Initialize the object for this task if it doesn't exist
            if (!updatedQuestionIds[taskId]) {
                updatedQuestionIds[taskId] = {};
            }

            // Mark this question as complete
            updatedQuestionIds[taskId] = {
                ...updatedQuestionIds[taskId],
                [questionId]: isComplete
            };

            return updatedQuestionIds;
        });

        // If a question was completed, check for streak update after a small delay
        if (isComplete && !isStreakIncrementedToday()) {
            setTimeout(() => {
                fetchStreakData();
            }, 500);
        }
    }, [fetchStreakData, isStreakIncrementedToday]);

    // Determine if sidebar should be shown
    const showSidebar = cohortId ? true : false;

    // Convert courses to dropdown options
    const courseOptions: DropdownOption<number>[] = courses.map((course, index) => ({
        id: course.id,
        label: course.name,
        value: index
    }));

    // Handle course selection
    const handleCourseSelect = (index: number) => {
        if (onCourseSelect) {
            onCourseSelect(index);
        }
    };

    // Handle course selection from dropdown
    const handleCourseDropdownSelect = (option: DropdownOption<number>) => {
        if (onCourseSelect) {
            onCourseSelect(option.value);
        }
    };

    // Callback for when TopPerformers has no data
    const handleEmptyPerformersData = useCallback((isEmpty: boolean) => {
        console.log("handleEmptyPerformersData called with isEmpty:", isEmpty);
        setShowTopPerformers(!isEmpty);
        console.log("setShowTopPerformers called with:", !isEmpty);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setMobileDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const getActiveCourse = () => {
        return courses[activeCourseIndex] || null;
    };

    // Clean up event listeners when component unmounts
    useEffect(() => {
        return () => {
            if (typeof document !== 'undefined') {
                document.body.style.overflow = '';
            }
        };
    }, []);

    return (
        <div className="bg-black">
            <div className="lg:flex lg:flex-row lg:justify-between">
                {/* Left Column: Course Tabs and Course Content */}
                <div className="lg:w-2/3 lg:pr-8">
                    {/* Course Selector */}
                    {courses.length > 1 && (
                        <div className="mb-6 sm:mb-8">
                            {/* Desktop Tabs - Hidden on Mobile */}
                            <div className="hidden sm:inline-block border-b border-gray-800 w-full overflow-hidden">
                                <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
                                    {courses.map((course, index) => (
                                        <button
                                            key={course.id}
                                            className={`px-4 py-2 rounded-t-lg text-sm font-light whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 ${index === activeCourseIndex
                                                ? 'bg-gray-800 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-900'
                                                }`}
                                            onClick={() => handleCourseSelect(index)}
                                        >
                                            {course.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Course Selector - Visible only on small screens */}
                            <div className="sm:hidden">
                                {/* Current course indicator */}
                                <button
                                    onClick={() => setMobileDropdownOpen(true)}
                                    className="w-full text-left py-3 px-1 border-b border-gray-800 flex items-center justify-between cursor-pointer group transition-opacity"
                                    aria-haspopup="true"
                                >
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Current Course</div>
                                        <div className="text-white font-light">{getActiveCourse()?.name || "Select Course"}</div>
                                    </div>
                                    <div className="bg-gray-800 rounded-full p-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <ChevronDown size={16} className="text-white transition-colors" />
                                    </div>
                                </button>
                            </div>

                            {/* Mobile Dropdown using MobileDropdown component */}
                            <MobileDropdown
                                isOpen={mobileDropdownOpen}
                                onClose={() => setMobileDropdownOpen(false)}
                                title="Select Course"
                                options={courseOptions}
                                selectedId={getActiveCourse()?.id}
                                onSelect={handleCourseDropdownSelect}
                                contentClassName="bg-[#0f0f0f]"
                                selectedOptionClassName="text-white"
                                optionClassName="text-gray-400 hover:text-white"
                            />
                        </div>
                    )}

                    {/* Course Content */}
                    <div>
                        {courseTitle && (
                            <h1 className="text-2xl md:text-3xl font-light text-white mb-4 md:mb-6 px-1 sm:px-0">
                                {courseTitle}
                            </h1>
                        )}

                        <LearnerCourseView
                            modules={modules}
                            completedTaskIds={localCompletedTaskIds}
                            completedQuestionIds={localCompletedQuestionIds}
                            onTaskComplete={handleTaskComplete}
                            onQuestionComplete={handleQuestionComplete}
                            onDialogClose={handleDialogClose}
                        />
                    </div>
                </div>

                {/* Right Column: Streak and Performers */}
                {showSidebar && (
                    <div className="w-full lg:w-1/3 space-y-6 mt-6 lg:mt-0">
                        {/* Streak component when not loading and cohort ID exists */}
                        {!isLoadingStreak && cohortId && (
                            <LearningStreak
                                streakDays={streakCount}
                                activeDays={activeWeekDays}
                            />
                        )}

                        {/* Only show TopPerformers if showTopPerformers is true */}
                        {showTopPerformers && (
                            <TopPerformers
                                schoolId={schoolId}
                                cohortId={cohortId}
                                view='learner'
                                onEmptyData={handleEmptyPerformersData}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
} 