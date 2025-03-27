"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, X, ChevronRight, ChevronDown as ChevronDownExpand, Plus, BookOpen, HelpCircle, Trash, Zap, Sparkles, Eye, Check, FileEdit, Clipboard, ArrowLeft, Pencil, Users, UsersRound } from "lucide-react";
import dynamic from "next/dynamic";
import { Block } from "@blocknote/core";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { useRouter, useParams } from "next/navigation";
import CourseModuleList, { LocalModule } from "@/components/CourseModuleList";
import CourseItemDialog from "@/components/CourseItemDialog";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import Toast from "@/components/Toast";
import CoursePublishSuccessBanner from "@/components/CoursePublishSuccessBanner";

// Dynamically import the editor components
const DynamicLearningMaterialEditor = dynamic(
    () => import("../../../../../../components/LearningMaterialEditor"),
    { ssr: false }
);

// Dynamically import the QuizEditor component
const DynamicQuizEditor = dynamic(
    () => import("../../../../../../components/QuizEditor"),
    { ssr: false }
);

// Import the QuizQuestion type
import { QuizQuestion, QuizQuestionConfig } from "../../../../../../types/quiz";

// Define interfaces
interface Milestone {
    id: number;
    name: string;
    color: string;
    ordering: number;
    tasks?: Task[];
}

interface Task {
    id: number;
    title: string;
    type: string;
    status: string;
    ordering: number;
}

interface CourseDetails {
    id: number;
    name: string;
    milestones?: Milestone[];
}

interface LearningMaterial {
    id: string;
    title: string;
    position: number;
    type: 'material';
    content?: any[]; // Using any[] instead of Block[] to avoid type issues
    status?: string; // Add status field to track draft/published state
}

interface Quiz {
    id: string;
    title: string;
    position: number;
    type: 'quiz';
    questions: QuizQuestion[];
    status?: string; // Add status field to track draft/published state
}

interface Exam {
    id: string;
    title: string;
    position: number;
    type: 'exam';
    questions: QuizQuestion[];
    status?: string; // Add status field to track draft/published state
}

type ModuleItem = LearningMaterial | Quiz | Exam;

interface Module {
    id: string;
    title: string;
    position: number;
    items: ModuleItem[];
    isExpanded: boolean;
    backgroundColor: string;
    isEditing: boolean;
}

// Default configuration for new questions
const defaultQuestionConfig: QuizQuestionConfig = {
    inputType: 'text',
    responseType: 'chat',
    questionType: 'objective',
};

// Add TaskData interface at the top of the file with the other interfaces
interface TaskData {
    id: string;
    title: string;
    blocks: any[];
    status: string;
}

// Define interface for CohortSelectionDialog props
interface CohortSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    originButtonRef: React.RefObject<HTMLButtonElement | null>;
    isPublishing: boolean;
    onConfirm: () => void;
    showLoading: boolean;
    hasError: boolean;
    errorMessage: string;
    onRetry: () => void;
    cohorts: any[]; // Using any[] for consistency with existing cohorts state
    tempSelectedCohorts: any[];
    onRemoveCohort: (cohortId: number) => void;
    onSelectCohort: (cohort: any) => void;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    searchQuery: string;
    filteredCohorts: any[];
    totalSchoolCohorts: number;
    schoolId: string;
}

// Add CohortSelectionDialog component
const CohortSelectionDialog = ({
    isOpen,
    onClose,
    originButtonRef,
    isPublishing,
    onConfirm,
    showLoading,
    hasError,
    errorMessage,
    onRetry,
    cohorts,
    tempSelectedCohorts,
    onRemoveCohort,
    onSelectCohort,
    onSearchChange,
    searchQuery,
    filteredCohorts,
    totalSchoolCohorts,
    schoolId,
}: CohortSelectionDialogProps) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Calculate position when button or isOpen changes
    useEffect(() => {
        if (isOpen && originButtonRef.current) {
            const buttonRect = originButtonRef.current.getBoundingClientRect();
            const buttonWidth = buttonRect.width;
            const windowWidth = window.innerWidth;

            // Position dropdown below button
            const top = buttonRect.bottom + window.scrollY;

            // Calculate left position to avoid going off-screen
            // Default to aligning with left edge of button
            let left = buttonRect.left + window.scrollX;

            // If dropdown would go off right edge, align with right edge of button instead
            const dropdownWidth = 400; // Width of dropdown from CSS
            if (left + dropdownWidth > windowWidth) {
                left = buttonRect.right - dropdownWidth + window.scrollX;
            }

            setPosition({ top, left });
        }
    }, [isOpen, originButtonRef]);

    // Handle clicks outside of the dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            if (dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                !(target as Element).closest('[data-dropdown-toggle="true"]')) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const buttonText = isPublishing
        ? showLoading
            ? "Publishing..."
            : "Publish course to cohorts"
        : showLoading
            ? "Adding..."
            : "Add course to cohorts";

    return (
        <div
            ref={dropdownRef}
            className="fixed z-50 py-2 w-[400px] bg-[#1A1A1A] rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`
            }}
        >
            <div className="p-4 pb-2">
                {/* Only show search and selected cohorts when not loading */}
                {!showLoading && (
                    <>
                        {/* Only show search when there are available cohorts AND not all cohorts are selected */}
                        {!hasError && cohorts.length > 0 && cohorts.length > tempSelectedCohorts.length && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search cohorts"
                                    className="w-full bg-[#111] rounded-md px-3 py-2 text-white"
                                    value={searchQuery}
                                    onChange={onSearchChange}
                                />
                            </div>
                        )}

                        {/* Show temporarily selected cohorts */}
                        {tempSelectedCohorts.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {tempSelectedCohorts.map(cohort => (
                                    <div
                                        key={cohort.id}
                                        className="flex items-center bg-[#222] px-3 py-1 rounded-full"
                                    >
                                        <span className="text-white text-sm font-light mr-2">{cohort.name}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveCohort(cohort.id);
                                            }}
                                            className="text-gray-400 hover:text-white cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="max-h-72 overflow-y-auto py-2 px-2">
                {showLoading ? (
                    <div className="flex justify-center items-center py-6">
                        <div className="w-8 h-8 border-2 border-t-green-500 border-r-green-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                ) : hasError ? (
                    <div className="p-4 text-center">
                        <p className="text-red-400 mb-2">{errorMessage}</p>
                        <button
                            className="text-green-400 hover:text-green-300 cursor-pointer"
                            onClick={onRetry}
                        >
                            Try again
                        </button>
                    </div>
                ) : filteredCohorts.length === 0 ? (
                    <div className="p-4 text-center">
                        {totalSchoolCohorts === 0 ? (
                            // School has no cohorts at all
                            <>
                                <h3 className="text-lg text-white font-light mb-1">No cohorts available</h3>
                                <p className="text-gray-400 text-sm">Create cohorts in your school that you can publish courses to</p>
                                <Link
                                    href={`/school/admin/${schoolId}#cohorts`}
                                    className="mt-4 inline-block px-4 py-2 text-sm bg-white text-black rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    Go to School
                                </Link>
                            </>
                        ) : totalSchoolCohorts > 0 && cohorts.length === 0 ? (
                            // All cohorts have been assigned to the course already
                            <>
                                <h3 className="text-lg text-white font-light mb-1">All cohorts selected</h3>
                                <p className="text-gray-400 text-sm">You have selected all available cohorts</p>
                                <Link
                                    href={`/school/admin/${schoolId}#cohorts`}
                                    className="mt-4 inline-block px-4 py-2 text-sm bg-white text-black rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    Create more cohorts
                                </Link>
                            </>
                        ) : filteredCohorts.length === 0 && tempSelectedCohorts.length > 0 && tempSelectedCohorts.length === cohorts.length ? (
                            // All available cohorts have been temporarily selected
                            <>
                                <h3 className="text-lg text-white font-light mb-1">All cohorts selected</h3>
                                <p className="text-gray-400 text-sm">You have selected all available cohorts</p>
                            </>
                        ) : (
                            // Search returned no results
                            <>
                                <h3 className="text-lg text-white font-light mb-1">No matching cohorts</h3>
                                <p className="text-gray-400 text-sm">Try a different search term</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filteredCohorts.map(cohort => (
                            <div
                                key={cohort.id}
                                className="flex items-center px-3 py-1.5 hover:bg-[#222] rounded-md cursor-pointer"
                                onClick={() => onSelectCohort(cohort)}
                            >
                                <div className="w-6 h-6 bg-green-900 rounded-md flex items-center justify-center mr-2">
                                    <UsersRound size={14} className="text-white" />
                                </div>
                                <p className="text-white text-sm font-light">{cohort.name}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Publish/Add button at the end of the list */}
                {(filteredCohorts.length > 0 || tempSelectedCohorts.length > 0) && (
                    <div className="px-2 pt-4 pb-1">
                        <button
                            className="w-full bg-[#016037] text-white py-3 rounded-full text-sm hover:bg-[#017045] transition-colors cursor-pointer"
                            onClick={onConfirm}
                            disabled={showLoading}
                        >
                            {buttonText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function CreateCourse() {
    const router = useRouter();
    const params = useParams();
    const schoolId = params.id as string;
    const courseId = params.courseId as string;

    const [courseTitle, setCourseTitle] = useState("Loading course...");
    const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [activeItem, setActiveItem] = useState<ModuleItem | null>(null);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [lastUsedColorIndex, setLastUsedColorIndex] = useState<number>(-1);
    const [isCourseTitleEditing, setIsCourseTitleEditing] = useState(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [isLoadingCohorts, setIsLoadingCohorts] = useState(false);
    const [cohortSearchQuery, setCohortSearchQuery] = useState('');
    const [filteredCohorts, setFilteredCohorts] = useState<any[]>([]);
    const [cohortError, setCohortError] = useState<string | null>(null);
    // Add state for temporarily selected cohorts
    const [tempSelectedCohorts, setTempSelectedCohorts] = useState<any[]>([]);
    // Add state for course cohorts
    const [courseCohorts, setCourseCohorts] = useState<any[]>([]);
    const [isLoadingCourseCohorts, setIsLoadingCourseCohorts] = useState(false);
    // Add state to track total cohorts in the school
    const [totalSchoolCohorts, setTotalSchoolCohorts] = useState<number>(0);
    // Add refs for both buttons to position the dropdown
    const publishButtonRef = useRef<HTMLButtonElement>(null);
    const addCohortButtonRef = useRef<HTMLButtonElement>(null);
    // Add state to track which button opened the dialog
    const [dialogOrigin, setDialogOrigin] = useState<'publish' | 'add' | null>(null);
    // Add state for toast notifications
    const [toast, setToast] = useState({
        show: false,
        title: '',
        description: '',
        emoji: ''
    });
    // Add state for cohort removal confirmation
    const [cohortToRemove, setCohortToRemove] = useState<{ id: number, name: string } | null>(null);
    const [showRemoveCohortConfirmation, setShowRemoveCohortConfirmation] = useState(false);

    // Add state for celebratory banner
    const [showCelebratoryBanner, setShowCelebratoryBanner] = useState(false);
    const [celebrationDetails, setCelebrationDetails] = useState({
        cohortCount: 0,
        cohortNames: [] as string[]
    });

    // Fetch course details from the backend
    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch course details: ${response.status}`);
                }

                const data = await response.json();
                setCourseDetails(data);
                setCourseTitle(data.name);

                // Check if milestones are available in the response
                if (data.milestones && Array.isArray(data.milestones)) {
                    // Transform milestones to match our Module interface
                    const transformedModules = data.milestones.map((milestone: Milestone) => {
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
                                        status: task.status // Add status from API response
                                    });
                                } else if (task.type === 'quiz') {
                                    moduleItems.push({
                                        id: task.id.toString(),
                                        title: task.title,
                                        position: task.ordering,
                                        type: 'quiz',
                                        questions: [], // Empty questions initially
                                        status: task.status // Add status from API response
                                    });
                                } else if (task.type === 'exam') {
                                    moduleItems.push({
                                        id: task.id.toString(),
                                        title: task.title,
                                        position: task.ordering,
                                        type: 'exam',
                                        questions: [], // Empty questions initially
                                        status: task.status // Add status from API response
                                    });
                                }
                            });

                            // Sort items by position/ordering
                            moduleItems.sort((a: ModuleItem, b: ModuleItem) => a.position - b.position);
                        }

                        return {
                            id: milestone.id.toString(),
                            title: milestone.name,
                            position: milestone.ordering,
                            items: moduleItems,
                            isExpanded: false,
                            backgroundColor: `${milestone.color}80`, // Add 50% opacity for UI display
                            isEditing: false
                        };
                    });

                    // Sort modules by position/ordering if needed
                    transformedModules.sort((a: Module, b: Module) => a.position - b.position);

                    // Set the modules state
                    setModules(transformedModules);
                }

                setIsLoading(false);
            } catch (err) {
                console.error("Error fetching course details:", err);
                setError("Failed to load course details. Please try again later.");
                setIsLoading(false);
            }
        };

        fetchCourseDetails();

        // Also fetch cohorts assigned to this course
        fetchCourseCohorts();
    }, [courseId]);

    // Check for dark mode
    useEffect(() => {
        setIsDarkMode(true);
        // setIsDarkMode(document.documentElement.classList.contains('dark'));

        // Optional: Listen for changes to the dark mode
        // const observer = new MutationObserver((mutations) => {
        //     mutations.forEach((mutation) => {
        //         if (mutation.attributeName === 'class') {
        //             setIsDarkMode(document.documentElement.classList.contains('dark'));
        //         }
        //     });
        // });

        // observer.observe(document.documentElement, { attributes: true });

        // return () => {
        //     observer.disconnect();
        // };
    }, []);

    // Set initial content and focus on newly added modules and items
    useEffect(() => {
        // Focus the newly added module
        if (activeModuleId) {
            const moduleElement = document.querySelector(`[data-module-id="${activeModuleId}"]`) as HTMLHeadingElement;

            if (moduleElement) {
                moduleElement.focus();
            }
        }

        // Focus the newly added item
        if (activeItem && activeItem.id) {
            const itemElement = document.querySelector(`[data-item-id="${activeItem.id}"]`) as HTMLHeadingElement;

            if (itemElement) {
                itemElement.focus();
            }
        }
    }, [modules, activeModuleId, activeItem]);

    // Handle Escape key to close dialog
    useEffect(() => {
        const handleEscKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDialogOpen) {
                closeDialog();
            }
        };

        window.addEventListener('keydown', handleEscKey);
        return () => {
            window.removeEventListener('keydown', handleEscKey);
        };
    }, [isDialogOpen]);

    // Handle clicks outside of the dropdown for the publish dialog

    const addModule = async () => {
        // Generate a diverse set of theme-compatible colors for dark mode
        const getRandomPastelColor = () => {
            // Predefined set of diverse dark mode friendly colors in hex format
            const themeColors = [
                '#2d3748',    // Slate blue
                '#433c4c',    // Deep purple
                '#4a5568',    // Cool gray
                '#312e51',    // Indigo
                '#364135',    // Forest green
                '#4c393a',    // Burgundy
                '#334155',    // Navy blue
                '#553c2d',    // Rust brown
                '#37303f',    // Plum
                '#3c4b64',    // Steel blue
                '#463c46',    // Mauve
                '#3c322d',    // Coffee
            ];

            // Ensure we don't pick a color similar to the last one
            let newColorIndex;
            do {
                newColorIndex = Math.floor(Math.random() * themeColors.length);
                // If we have more than 6 colors, make sure the new color is at least 3 positions away
                // from the last one to ensure greater visual distinction
            } while (
                lastUsedColorIndex !== -1 &&
                (Math.abs(newColorIndex - lastUsedColorIndex) < 3 ||
                    newColorIndex === lastUsedColorIndex)
            );

            // Update the last used color index
            setLastUsedColorIndex(newColorIndex);

            return themeColors[newColorIndex];
        };

        // Select a random color for the module
        const backgroundColor = getRandomPastelColor();

        try {
            // Make POST request to create a new milestone (module)
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/milestones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: "New Module",
                    color: backgroundColor, // Now sending color as hex with # symbol
                    org_id: parseInt(schoolId)
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create module: ${response.status}`);
            }

            // Get the module ID from the response
            const data = await response.json();
            console.log("Module created successfully:", data);

            // Create the new module with the ID from the API
            const newModule: Module = {
                id: data.id.toString(), // Convert to string to match our Module interface
                title: "New Module",
                position: modules.length,
                items: [],
                isExpanded: true,
                backgroundColor: `${backgroundColor}80`, // Add 50% opacity for UI display
                isEditing: false
            };

            setModules([...modules, newModule]);
            setActiveModuleId(newModule.id);
        } catch (error) {
            console.error("Error creating module:", error);

            // Fallback to client-side ID generation if the API call fails
            const newModule: Module = {
                id: `module-${Date.now()}`,
                title: "New Module",
                position: modules.length,
                items: [],
                isExpanded: true,
                backgroundColor: `${backgroundColor}80`, // Add 50% opacity for UI display
                isEditing: false
            };

            setModules([...modules, newModule]);
            setActiveModuleId(newModule.id);
        }
    };

    // Add back the handleKeyDown function for module titles
    const handleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
        // Prevent creating a new line when pressing Enter
        if (e.key === "Enter") {
            e.preventDefault();

            // Remove focus
            (e.currentTarget as HTMLHeadingElement).blur();
        }
    };

    const updateModuleTitle = (id: string, title: string) => {
        setModules(modules.map(module =>
            module.id === id ? { ...module, title } : module
        ));
    };

    const toggleModuleEditing = (id: string, isEditing: boolean) => {
        setModules(modules.map(module =>
            module.id === id ? { ...module, isEditing } : module
        ));
    };

    const deleteModule = (id: string) => {
        setModules(prevModules => {
            const filteredModules = prevModules.filter(module => module.id !== id);
            // Update positions after deletion
            return filteredModules.map((module, index) => ({
                ...module,
                position: index
            }));
        });
    };

    const moveModuleUp = (id: string) => {
        setModules(prevModules => {
            const index = prevModules.findIndex(module => module.id === id);
            if (index <= 0) return prevModules;

            const newModules = [...prevModules];
            // Swap with previous module
            [newModules[index - 1], newModules[index]] = [newModules[index], newModules[index - 1]];

            // Update positions
            return newModules.map((module, idx) => ({
                ...module,
                position: idx
            }));
        });
    };

    const moveModuleDown = (id: string) => {
        setModules(prevModules => {
            const index = prevModules.findIndex(module => module.id === id);
            if (index === -1 || index === prevModules.length - 1) return prevModules;

            const newModules = [...prevModules];
            // Swap with next module
            [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];

            // Update positions
            return newModules.map((module, idx) => ({
                ...module,
                position: idx
            }));
        });
    };

    const toggleModule = (id: string) => {
        setModules(modules.map(module =>
            module.id === id ? { ...module, isExpanded: !module.isExpanded } : module
        ));
    };

    const addLearningMaterial = async (moduleId: string) => {
        try {
            // Make API request to create a new learning material
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    org_id: parseInt(schoolId),
                    course_id: parseInt(courseId),
                    milestone_id: parseInt(moduleId),
                    type: "learning_material",
                    title: "New Learning Material",
                    status: "draft" // Add status to API request
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create learning material: ${response.status}`);
            }

            // Get the learning material ID from the response
            const data = await response.json();
            console.log("Learning material created successfully:", data);

            // Update the UI only after the API request is successful
            setModules(modules.map(module => {
                if (module.id === moduleId) {
                    const newItem: LearningMaterial = {
                        id: data.id.toString(), // Use the ID from the API
                        title: "New Learning Material",
                        position: module.items.length,
                        type: 'material',
                        content: [], // Empty content, the editor will initialize with default content
                        status: 'draft' // Create as draft instead of published
                    };

                    setActiveItem(newItem);
                    setActiveModuleId(moduleId);

                    return {
                        ...module,
                        items: [...module.items, newItem]
                    };
                }
                return module;
            }));
        } catch (error) {
            console.error("Error creating learning material:", error);
            // You might want to show an error message to the user here
        }
    };

    const addQuiz = async (moduleId: string) => {
        try {
            // Make API request to create a new quiz
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    org_id: parseInt(schoolId),
                    course_id: parseInt(courseId),
                    milestone_id: parseInt(moduleId),
                    type: "quiz",
                    title: "New Quiz",
                    status: "draft"
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create quiz: ${response.status}`);
            }

            // Get the quiz ID from the response
            const data = await response.json();
            console.log("Quiz created successfully:", data);

            // Update the UI only after the API request is successful
            setModules(modules.map(module => {
                if (module.id === moduleId) {
                    const newItem: Quiz = {
                        id: data.id.toString(), // Use the ID from the API
                        title: "New Quiz",
                        position: module.items.length,
                        type: 'quiz',
                        questions: [{
                            id: `question-${Date.now()}`,
                            content: [],
                            config: { ...defaultQuestionConfig }
                        }],
                        status: 'draft'
                    };

                    setActiveItem(newItem);
                    setActiveModuleId(moduleId);

                    return {
                        ...module,
                        items: [...module.items, newItem]
                    };
                }
                return module;
            }));
        } catch (error) {
            console.error("Error creating quiz:", error);
            // You might want to show an error message to the user here
        }
    };

    const addExam = async (moduleId: string) => {
        try {
            // Make API request to create a new exam
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    org_id: parseInt(schoolId),
                    course_id: parseInt(courseId),
                    milestone_id: parseInt(moduleId),
                    type: "exam",
                    title: "New Exam",
                    status: "draft"
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create exam: ${response.status}`);
            }

            // Get the exam ID from the response
            const data = await response.json();
            console.log("Exam created successfully:", data);

            // Update the UI only after the API request is successful
            setModules(modules.map(module => {
                if (module.id === moduleId) {
                    const newItem: Exam = {
                        id: data.id.toString(), // Use the ID from the API
                        title: "New Exam",
                        position: module.items.length,
                        type: 'exam',
                        questions: [],
                        status: 'draft'
                    };

                    setActiveItem(newItem);
                    setActiveModuleId(moduleId);

                    return {
                        ...module,
                        items: [...module.items, newItem]
                    };
                }
                return module;
            }));
        } catch (error) {
            console.error("Error creating exam:", error);
            // You might want to show an error message to the user here
        }
    };

    const updateItemTitle = (moduleId: string, itemId: string, title: string) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                return {
                    ...module,
                    items: module.items.map(item =>
                        item.id === itemId ? { ...item, title } : item
                    )
                };
            }
            return module;
        }));

        // Also update active item title if it's currently being edited
        if (activeItem && activeItem.id === itemId) {
            setActiveItem({
                ...activeItem,
                title
            });
        }
    };

    const updateItemContent = (moduleId: string, itemId: string, content: any[]) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                return {
                    ...module,
                    items: module.items.map(item => {
                        if (item.id === itemId) {
                            if (item.type === 'material') {
                                return { ...item, content } as LearningMaterial;
                            } else if (item.type === 'quiz') {
                                return { ...item } as Quiz;
                            } else if (item.type === 'exam') {
                                return { ...item } as Exam;
                            }
                        }
                        return item;
                    })
                };
            }
            return module;
        }));

        // Also update active item content if it's currently being edited
        if (activeItem && activeItem.id === itemId && activeItem.type === 'material') {
            setActiveItem({
                ...activeItem,
                content
            });
        }
    };

    const deleteItem = (moduleId: string, itemId: string) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                const filteredItems = module.items.filter(item => item.id !== itemId);
                return {
                    ...module,
                    items: filteredItems.map((item, index) => ({
                        ...item,
                        position: index
                    }))
                };
            }
            return module;
        }));
    };

    const moveItemUp = (moduleId: string, itemId: string) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                const index = module.items.findIndex(item => item.id === itemId);
                if (index <= 0) return module;

                const newItems = [...module.items];
                [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];

                return {
                    ...module,
                    items: newItems.map((item, idx) => ({
                        ...item,
                        position: idx
                    }))
                };
            }
            return module;
        }));
    };

    const moveItemDown = (moduleId: string, itemId: string) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                const index = module.items.findIndex(item => item.id === itemId);
                if (index === -1 || index === module.items.length - 1) return module;

                const newItems = [...module.items];
                [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];

                return {
                    ...module,
                    items: newItems.map((item, idx) => ({
                        ...item,
                        position: idx
                    }))
                };
            }
            return module;
        }));
    };

    // Handle click on module header area to toggle expansion
    const handleModuleClick = (e: React.MouseEvent, moduleId: string) => {
        // Find the module
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        // If module is in editing mode, don't toggle expansion
        if (module.isEditing) {
            return;
        }

        // Prevent toggling if clicking on buttons
        if (
            (e.target as HTMLElement).tagName === 'BUTTON' ||
            (e.target as HTMLElement).closest('button')
        ) {
            return;
        }

        toggleModule(moduleId);
    };

    // Open the dialog for editing a learning material or quiz
    const openItemDialog = (moduleId: string, itemId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const item = module.items.find(i => i.id === itemId);
        if (!item) return;

        // Ensure quiz items have questions property initialized
        if (item.type === 'quiz' && !item.questions) {
            const updatedItem = {
                ...item,
                questions: [{ id: `question-${Date.now()}`, content: [], config: { ...defaultQuestionConfig } }]
            } as Quiz;

            // Update the module with the fixed item
            setModules(prevModules =>
                prevModules.map(m =>
                    m.id === moduleId
                        ? {
                            ...m,
                            items: m.items.map(i => i.id === itemId ? updatedItem : i)
                        }
                        : m
                ) as Module[]
            );

            setActiveItem(updatedItem);
            setActiveModuleId(moduleId);
            setIsPreviewMode(false);
            setIsDialogOpen(true);
        } else if (item.type === 'material') {
            // For learning materials, we don't need to fetch content here
            // The LearningMaterialEditor will fetch its own data using the taskId
            setActiveItem(item);
            setActiveModuleId(moduleId);
            setIsPreviewMode(false);
            setIsDialogOpen(true);
        } else {
            // For other types like exams, just open the dialog
            setActiveItem(item);
            setActiveModuleId(moduleId);
            setIsPreviewMode(false);
            setIsDialogOpen(true);
        }
    };

    // Close the dialog
    const closeDialog = () => {
        // Dialog confirmation is handled by CourseItemDialog component
        setIsDialogOpen(false);
        setActiveItem(null);
        setActiveModuleId(null);
        setIsEditMode(false);
    };

    // Cancel edit mode and revert to original state
    const cancelEditMode = () => {
        // For learning materials, the LearningMaterialEditor has already reverted the changes
        // We need to revert the activeItem object to reflect the original state
        if (activeItem && activeModuleId && activeItem.type === 'material') {
            // Find the original module item from modules state
            const module = modules.find(m => m.id === activeModuleId);
            if (module) {
                const originalItem = module.items.find(i => i.id === activeItem.id);
                if (originalItem) {
                    // Reset activeItem to match the original state
                    setActiveItem({
                        ...originalItem
                    });
                }
            }
        }

        // Exit edit mode without saving changes
        setIsEditMode(false);
    };

    // Handle dialog title change
    const handleDialogTitleChange = (e: React.FormEvent<HTMLHeadingElement>) => {
        if (!activeItem || !activeModuleId) return;

        // Skip title updates for learning materials - they manage their own titles
        // and only emit changes after publishing
        if (activeItem.type === 'material') return;

        const newTitle = e.currentTarget.textContent || "";

        // Update the title in the API - only for quizzes and exams
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${activeItem.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: newTitle
            }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to update title: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Update the active item
                setActiveItem({
                    ...activeItem,
                    title: newTitle
                });

                // Update the modules state
                setModules(prevModules =>
                    prevModules.map(module => {
                        if (module.id === activeModuleId) {
                            return {
                                ...module,
                                items: module.items.map(item => {
                                    if (item.id === activeItem.id) {
                                        return {
                                            ...item,
                                            title: newTitle
                                        };
                                    }
                                    return item;
                                })
                            };
                        }
                        return module;
                    })
                );
            })
            .catch(error => {
                console.error("Error updating title:", error);
            });
    };

    // Handle quiz content changes
    const handleQuizContentChange = (questions: QuizQuestion[]) => {
        if (activeItem && activeModuleId && activeItem.type === 'quiz') {
            updateQuizQuestions(activeModuleId, activeItem.id, questions);
        }
    };

    // Add a function to update quiz questions
    const updateQuizQuestions = (moduleId: string, itemId: string, questions: QuizQuestion[]) => {
        setModules(prevModules =>
            prevModules.map(module => {
                if (module.id === moduleId) {
                    return {
                        ...module,
                        items: module.items.map(item => {
                            if (item.id === itemId && item.type === 'quiz') {
                                return {
                                    ...item,
                                    questions
                                } as Quiz;
                            }
                            return item;
                        })
                    };
                }
                return module;
            })
        );
    };

    // Modify the publishItem function to first show the confirmation dialog
    const publishItem = async (moduleId: string, itemId: string) => {
        // Store the current module and item IDs for use when confirmed
        setActiveModuleId(moduleId);

        // Find the item to get its type
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const item = module.items.find(i => i.id === itemId);
        if (!item) return;

        // Set the active item
        setActiveItem(item);

        // Show the confirmation dialog
        setShowPublishConfirmation(true);
    };

    // Add a new function to handle the actual publishing after confirmation
    const handleConfirmPublish = async () => {
        if (!activeItem || !activeModuleId) {
            console.error("Cannot publish: activeItem or activeModuleId is missing");
            setShowPublishConfirmation(false);
            return;
        }

        console.log("handleConfirmPublish called with activeItem:", activeItem);

        // For learning materials and quizzes, the API call is now handled in their respective components
        // We need to update the modules list to reflect the status change
        // The title update is handled in the CourseItemDialog's onPublishSuccess callback

        // Update the module item in the modules list with the updated status and title
        updateModuleItemStatusAndTitle(activeModuleId, activeItem.id, 'published', activeItem.title);

        console.log("Module item updated with status 'published' and title:", activeItem.title);

        // Hide the confirmation dialog
        setShowPublishConfirmation(false);
    };

    // Add a function to update a module item's status and title
    const updateModuleItemStatusAndTitle = (moduleId: string, itemId: string, status: string, title: string) => {
        setModules(prevModules =>
            prevModules.map(module => {
                if (module.id === moduleId) {
                    return {
                        ...module,
                        items: module.items.map(item => {
                            if (item.id === itemId) {
                                return {
                                    ...item,
                                    status,
                                    title
                                };
                            }
                            return item;
                        })
                    };
                }
                return module;
            })
        );
    };

    // Add a function to handle canceling the publish action
    const handleCancelPublish = () => {
        setShowPublishConfirmation(false);
    };

    const handleModuleTitleInput = (e: React.FormEvent<HTMLHeadingElement>, moduleId: string) => {
        // Just store the current text content, but don't update the state yet
        // This prevents React from re-rendering and resetting the cursor
        const newTitle = e.currentTarget.textContent || "";

        // We'll update the state when the user finishes editing (on blur or when save is clicked)
    };

    const saveModuleTitle = async (moduleId: string) => {
        // Find the heading element by data attribute
        const headingElement = document.querySelector(`[data-module-id="${moduleId}"]`) as HTMLHeadingElement;
        if (headingElement) {
            // Get the current content
            const newTitle = headingElement.textContent || "";

            try {
                // Make API call to update the milestone on the server
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/milestones/${moduleId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: newTitle
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to update module title: ${response.status}`);
                }

                // If successful, update the state
                updateModuleTitle(moduleId, newTitle);
                console.log("Module title updated successfully");

                // Show toast notification
                setToast({
                    show: true,
                    title: 'A makeover',
                    description: `Module name updated successfully`,
                    emoji: '✨'
                });

                // Auto-hide toast after 3 seconds
                setTimeout(() => {
                    setToast(prev => ({ ...prev, show: false }));
                }, 3000);
            } catch (error) {
                console.error("Error updating module title:", error);

                // Still update the local state even if the API call fails
                // This provides a better user experience while allowing for retry later
                updateModuleTitle(moduleId, newTitle);

                // Show error toast
                setToast({
                    show: true,
                    title: 'Update Failed',
                    description: 'Failed to update module title, but changes were saved locally',
                    emoji: '⚠️'
                });

                // Auto-hide toast after 3 seconds
                setTimeout(() => {
                    setToast(prev => ({ ...prev, show: false }));
                }, 3000);
            }
        }

        // Turn off editing mode
        toggleModuleEditing(moduleId, false);
    };

    const cancelModuleEditing = (moduleId: string) => {
        // Find the heading element
        const headingElement = document.querySelector(`[data-module-id="${moduleId}"]`) as HTMLHeadingElement;
        if (headingElement) {
            // Reset the content to the original title from state
            const module = modules.find(m => m.id === moduleId);
            if (module) {
                headingElement.textContent = module.title;
            }
        }
        // Turn off editing mode
        toggleModuleEditing(moduleId, false);
    };

    // Add this helper function before the return statement
    const hasAnyItems = () => {
        return modules.some(module =>
            module.items.some(item => item.status !== 'draft')
        );
    };

    // Add these functions for course title editing
    const handleCourseTitleInput = (e: React.FormEvent<HTMLHeadingElement>) => {
        // Just store the current text content, but don't update the state yet
        // This prevents React from re-rendering and resetting the cursor
        const newTitle = e.currentTarget.textContent || "";

        // We'll update the state when the user finishes editing
    };

    const saveCourseTitle = () => {
        if (titleRef.current) {
            const newTitle = titleRef.current.textContent || "";

            // Make a PUT request to update the course name
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newTitle
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to update course: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Update the course title in the UI
                    setCourseTitle(newTitle);
                    console.log("Course updated successfully:", data);
                })
                .catch(err => {
                    console.error("Error updating course:", err);
                    // Revert to the original title in case of error
                    if (titleRef.current) {
                        titleRef.current.textContent = courseTitle;
                    }
                });

            setIsCourseTitleEditing(false);
        }
    };

    const cancelCourseTitleEditing = () => {
        if (titleRef.current) {
            titleRef.current.textContent = courseTitle;
        }
        setIsCourseTitleEditing(false);
    };

    // Helper function to set cursor at the end of a contentEditable element
    const setCursorToEnd = (element: HTMLElement) => {
        if (!element) return;

        const range = document.createRange();
        const selection = window.getSelection();

        // Clear any existing selection first
        selection?.removeAllRanges();

        // Set range to end of content
        range.selectNodeContents(element);
        range.collapse(false); // false means collapse to end

        // Apply the selection
        selection?.addRange(range);
        element.focus();
    };

    // For course title editing
    const enableCourseTitleEditing = () => {
        setIsCourseTitleEditing(true);

        // Need to use setTimeout to ensure the element is editable before focusing
        setTimeout(() => {
            if (titleRef.current) {
                setCursorToEnd(titleRef.current);
            }
        }, 0);
    };

    // For module title editing
    const enableModuleEditing = (moduleId: string) => {
        toggleModuleEditing(moduleId, true);

        // More reliable method to set cursor at end with a sufficient delay
        setTimeout(() => {
            const moduleElement = document.querySelector(`h2[contenteditable="true"]`) as HTMLElement;
            if (moduleElement && moduleElement.textContent) {
                // Create a text node at the end for more reliable cursor placement
                const textNode = moduleElement.firstChild;
                if (textNode) {
                    const selection = window.getSelection();
                    const range = document.createRange();

                    // Place cursor at the end of the text
                    range.setStart(textNode, textNode.textContent?.length || 0);
                    range.setEnd(textNode, textNode.textContent?.length || 0);

                    selection?.removeAllRanges();
                    selection?.addRange(range);
                }
                moduleElement.focus();
            }
        }, 100); // Increased delay for better reliability
    };

    // Modified function to enable edit mode
    const enableEditMode = () => {
        setIsEditMode(true);

        // Focus the title for editing is now handled in CourseModuleList
    };

    // Save the current item
    const saveItem = async () => {
        if (!activeItem || !activeModuleId) return;

        // Update the modules state to reflect any changes in the UI
        setModules(prevModules =>
            prevModules.map(module => {
                if (module.id === activeModuleId) {
                    return {
                        ...module,
                        items: module.items.map(item => {
                            if (item.id === activeItem.id) {
                                // Create updated items based on type with proper type assertions
                                if (item.type === 'material' && activeItem.type === 'material') {
                                    return {
                                        ...item,
                                        title: activeItem.title,
                                        content: activeItem.content
                                    };
                                } else if (item.type === 'quiz' && activeItem.type === 'quiz') {
                                    return {
                                        ...item,
                                        title: activeItem.title,
                                        questions: activeItem.questions
                                    };
                                } else if (item.type === 'exam' && activeItem.type === 'exam') {
                                    return {
                                        ...item,
                                        title: activeItem.title,
                                        questions: activeItem.questions
                                    };
                                }

                                // Default case - just update the title
                                return {
                                    ...item,
                                    title: activeItem.title
                                };
                            }
                            return item;
                        })
                    };
                }
                return module;
            })
        );

        // Exit edit mode
        setIsEditMode(false);
    };

    const handleCohortSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setCohortSearchQuery(query);

        // Always filter the existing cohorts client-side
        if (cohorts.length > 0) {
            if (query.trim() === '') {
                // Filter out temporarily selected cohorts
                setFilteredCohorts(cohorts.filter(cohort =>
                    !tempSelectedCohorts.some(tc => tc.id === cohort.id)
                ));
            } else {
                // Filter by search query and exclude temporarily selected cohorts
                const filtered = cohorts.filter(cohort =>
                    cohort.name.toLowerCase().includes(query.toLowerCase()) &&
                    !tempSelectedCohorts.some(tc => tc.id === cohort.id)
                );
                setFilteredCohorts(filtered);
            }
        }
    };

    // Update fetchCohorts to only be called once when dialog opens
    const fetchCohorts = async () => {
        try {
            setIsLoadingCohorts(true);
            setCohortError(null);

            // First, fetch cohorts that are already assigned to this course
            const courseCohortResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`);
            let assignedCohortIds: number[] = [];

            if (courseCohortResponse.ok) {
                const courseCohortData = await courseCohortResponse.json();
                assignedCohortIds = courseCohortData.map((cohort: { id: number }) => cohort.id);
                setCourseCohorts(courseCohortData);
            }

            // Then, fetch all cohorts for the organization
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/?org_id=${schoolId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch cohorts: ${response.status}`);
            }

            const data = await response.json();

            // Store the total number of cohorts in the school
            setTotalSchoolCohorts(data.length);

            // Filter out cohorts that are already assigned to the course
            const availableCohorts = data.filter((cohort: { id: number }) =>
                !assignedCohortIds.includes(cohort.id)
            );

            setCohorts(availableCohorts);

            // Filter out any temporarily selected cohorts
            setFilteredCohorts(availableCohorts.filter((cohort: { id: number; name: string }) =>
                !tempSelectedCohorts.some(tc => tc.id === cohort.id)
            ));

            setIsLoadingCohorts(false);
        } catch (error) {
            console.error("Error fetching cohorts:", error);
            setCohortError("Failed to load cohorts. Please try again later.");
            setIsLoadingCohorts(false);
        }
    };

    // Function to select a cohort
    const selectCohort = (cohort: any) => {
        // Check if already selected
        if (tempSelectedCohorts.some(c => c.id === cohort.id)) {
            return; // Already selected, do nothing
        }

        // Add to temporary selection
        setTempSelectedCohorts([...tempSelectedCohorts, cohort]);

        // Remove from filtered cohorts immediately for better UX
        setFilteredCohorts(prev => prev.filter(c => c.id !== cohort.id));
    };

    // Function to remove cohort from temporary selection
    const removeTempCohort = (cohortId: number) => {
        // Find the cohort to remove
        const cohortToRemove = tempSelectedCohorts.find(cohort => cohort.id === cohortId);

        // Remove from temp selection
        setTempSelectedCohorts(tempSelectedCohorts.filter(cohort => cohort.id !== cohortId));

        // Add back to filtered cohorts if it matches the current search
        if (cohortToRemove &&
            (cohortSearchQuery.trim() === '' ||
                cohortToRemove.name.toLowerCase().includes(cohortSearchQuery.toLowerCase()))) {
            setFilteredCohorts(prev => [...prev, cohortToRemove]);
        }
    };

    // Update to publish to all selected cohorts with a single API call
    const publishCourseToSelectedCohorts = async () => {
        if (tempSelectedCohorts.length === 0) {
            setShowPublishDialog(false);
            return;
        }

        try {
            setCohortError(null);

            // Show loading state
            setIsLoadingCohorts(true);

            // Extract all cohort IDs from the selected cohorts
            const cohortIds = tempSelectedCohorts.map(cohort => cohort.id);
            // Extract cohort names for the celebration banner
            const cohortNames = tempSelectedCohorts.map(cohort => cohort.name);

            // Make a single API call with all cohort IDs
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cohort_ids: cohortIds
                }),
            });

            // Check if the request failed
            if (!response.ok) {
                throw new Error(`Failed to publish course: ${response.status}`);
            }

            // Close the dialog and update cohort details for the celebration
            setShowPublishDialog(false);
            setCelebrationDetails({
                cohortCount: tempSelectedCohorts.length,
                cohortNames: cohortNames
            });

            // Show the celebratory banner instead of a toast
            setShowCelebratoryBanner(true);

            // Clear temp selection
            setTempSelectedCohorts([]);

            // Refresh the displayed cohorts
            fetchCourseCohorts();
        } catch (error) {
            console.error("Error publishing course:", error);
            setCohortError("Failed to publish course. Please try again later.");
        } finally {
            setIsLoadingCohorts(false);
        }
    };

    // Function to fetch cohorts assigned to this course
    const fetchCourseCohorts = async () => {
        try {
            setIsLoadingCourseCohorts(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`);

            if (!response.ok) {
                throw new Error(`Failed to fetch course cohorts: ${response.status}`);
            }

            const data = await response.json();
            setCourseCohorts(data);
        } catch (error) {
            console.error("Error fetching course cohorts:", error);
            // Silently fail - don't show an error message to the user
        } finally {
            setIsLoadingCourseCohorts(false);
        }
    };

    // Add a new function to initiate cohort removal with confirmation
    const initiateCohortRemoval = (cohortId: number, cohortName: string) => {
        setCohortToRemove({ id: cohortId, name: cohortName });
        setShowRemoveCohortConfirmation(true);
    };

    // Modify the existing removeCohortFromCourse function to handle the actual removal
    const removeCohortFromCourse = async (cohortId: number) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cohort_ids: [cohortId]
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to remove cohort from course: ${response.status}`);
            }

            // Show success toast
            setToast({
                show: true,
                title: 'Cohort unlinked',
                description: `This course has been removed from "${cohortToRemove?.name}"`,
                emoji: '🔓'
            });

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 5000);

            // Refresh the displayed cohorts
            fetchCourseCohorts();

            // Reset the confirmation state
            setShowRemoveCohortConfirmation(false);
            setCohortToRemove(null);
        } catch (error) {
            console.error("Error removing cohort from course:", error);

            // Show error toast
            setToast({
                show: true,
                title: 'Error',
                description: 'Failed to unlink cohort. Please try again.',
                emoji: '❌'
            });

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 5000);

            // Reset the confirmation state even on error
            setShowRemoveCohortConfirmation(false);
            setCohortToRemove(null);
        }
    };

    // Add toast close handler
    const handleCloseToast = () => {
        setToast(prev => ({ ...prev, show: false }));
    };

    // Add handler for closing the celebratory banner
    const closeCelebratoryBanner = () => {
        setShowCelebratoryBanner(false);
    };

    // Update to handle dialog opening from either button
    const openCohortDialog = (origin: 'publish' | 'add') => {
        setDialogOrigin(origin);
        setShowPublishDialog(true);
        setTempSelectedCohorts([]); // Reset selected cohorts
        fetchCohorts();
    };

    // Update to handle dialog closing
    const closeCohortDialog = () => {
        setShowPublishDialog(false);
        setDialogOrigin(null);
    };

    return (
        <div className="min-h-screen bg-black">
            {/* Use the reusable Header component with showCreateCourseButton set to false */}
            <Header showCreateCourseButton={false} />

            {/* Show spinner when loading */}
            {isLoading ? (
                <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                    <div className="w-16 h-16 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                </div>
            ) : (
                /* Main content area - only shown after loading */
                <div className="py-12 grid grid-cols-5 gap-6">
                    <div className="max-w-5xl ml-24 col-span-4">
                        {/* Back to Courses button */}
                        <Link
                            href={`/school/admin/${schoolId}#courses`}
                            className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
                        >
                            <ArrowLeft size={16} className="mr-2 text-sm" />
                            Back To Courses
                        </Link>

                        <div className="flex items-center justify-between mb-8">
                            {error ? (
                                <h1 className="text-4xl font-light text-red-400 w-3/4 mr-8">
                                    {error}
                                </h1>
                            ) : (
                                <div className="flex items-center w-3/4 mr-8">
                                    <h1
                                        ref={titleRef}
                                        contentEditable={isCourseTitleEditing}
                                        suppressContentEditableWarning
                                        onInput={handleCourseTitleInput}
                                        onKeyDown={handleKeyDown}
                                        className={`text-4xl font-light text-white outline-none ${isCourseTitleEditing ? 'border-b border-gray-700 pb-1' : ''}`}
                                        autoFocus={isCourseTitleEditing}
                                    >
                                        {courseTitle}
                                    </h1>

                                    {/* Add published pill when course is in at least one cohort */}
                                    {!isCourseTitleEditing && courseCohorts.length > 0 && (
                                        <div className="ml-4 px-3 py-1 bg-green-800/70 text-white text-xs rounded-full">
                                            Published
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center space-x-3 ml-auto">
                                {isCourseTitleEditing ? (
                                    <>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#4F46E5] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={saveCourseTitle}
                                        >
                                            <span className="mr-2 text-base">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                    <polyline points="7 3 7 8 15 8"></polyline>
                                                </svg>
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Save</span>
                                        </button>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#6B7280] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={cancelCourseTitleEditing}
                                        >
                                            <span className="mr-2 text-base">
                                                <X size={16} />
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Cancel</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#4F46E5] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={enableCourseTitleEditing}
                                        >
                                            <span className="mr-2 text-base">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Edit</span>
                                        </button>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#EF4444] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={() => {
                                                // Open preview in a new tab
                                                window.open(`/school/admin/${schoolId}/courses/${courseId}/preview`, '_blank');
                                            }}
                                        >
                                            <span className="mr-2 text-base">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Preview</span>
                                        </button>
                                        {hasAnyItems() && courseCohorts.length === 0 && (
                                            <div className="relative">
                                                <button
                                                    ref={publishButtonRef}
                                                    data-dropdown-toggle="true"
                                                    className="flex items-center px-6 py-2 text-sm font-medium text-white bg-[#016037] border-0 hover:bg-[#017045] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                                    onClick={() => openCohortDialog('publish')}
                                                >
                                                    <span className="mr-2 text-base">🚀</span>
                                                    <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Publish</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={addModule}
                            className="mb-6 px-6 py-2 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-100 cursor-pointer"
                        >
                            Add Module
                        </button>

                        <CourseModuleList
                            modules={modules}
                            mode="edit"
                            onToggleModule={toggleModule}
                            onOpenItem={openItemDialog}
                            onMoveItemUp={moveItemUp}
                            onMoveItemDown={moveItemDown}
                            onDeleteItem={deleteItem}
                            onAddLearningMaterial={addLearningMaterial}
                            onAddQuiz={addQuiz}
                            onAddExam={addExam}
                            onMoveModuleUp={moveModuleUp}
                            onMoveModuleDown={moveModuleDown}
                            onDeleteModule={deleteModule}
                            onEditModuleTitle={enableModuleEditing}
                            saveModuleTitle={saveModuleTitle}
                            cancelModuleEditing={cancelModuleEditing}
                            isDialogOpen={isDialogOpen}
                            activeItem={activeItem}
                            activeModuleId={activeModuleId}
                            isEditMode={isEditMode}
                            isPreviewMode={isPreviewMode}
                            showPublishConfirmation={showPublishConfirmation}
                            handleConfirmPublish={handleConfirmPublish}
                            handleCancelPublish={handleCancelPublish}
                            closeDialog={closeDialog}
                            saveItem={saveItem}
                            cancelEditMode={cancelEditMode}
                            enableEditMode={enableEditMode}
                            handleDialogTitleChange={handleDialogTitleChange}
                            handleQuizContentChange={handleQuizContentChange}
                            setShowPublishConfirmation={setShowPublishConfirmation}
                            schoolId={schoolId}
                            courseId={courseId}
                        />
                    </div>

                    {/* Display cohorts assigned to this course */}
                    {!isLoadingCourseCohorts && courseCohorts.length > 0 && (
                        <div>
                            <div className="relative">
                                <button
                                    ref={addCohortButtonRef}
                                    data-dropdown-toggle="true"
                                    className="flex items-center px-6 py-2 text-sm font-medium text-white bg-[#016037] border-0 hover:bg-[#017045] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                    onClick={() => openCohortDialog('add')}
                                >
                                    <span className="mr-2 text-base"><UsersRound size={16} /></span>
                                    <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Add to Cohorts</span>
                                </button>
                            </div>
                            <div className="mt-10">
                                <h2 className="text-sm font-light text-gray-400 mb-3 ">Cohorts</h2>
                                <div className="flex flex-wrap gap-3">
                                    {courseCohorts.map((cohort: { id: number; name: string }) => (
                                        <div
                                            key={cohort.id}
                                            className="flex items-center bg-[#222] px-4 py-2 rounded-full group hover:bg-[#333] transition-colors"
                                        >
                                            <span className="text-white text-sm font-light mr-3">{cohort.name}</span>
                                            <button
                                                onClick={() => initiateCohortRemoval(cohort.id, cohort.name)}
                                                className="text-gray-400 hover:text-white cursor-pointer"
                                                aria-label="Remove cohort from course"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Render the CohortSelectionDialog */}
            <CohortSelectionDialog
                isOpen={showPublishDialog}
                onClose={closeCohortDialog}
                originButtonRef={dialogOrigin === 'publish' ? publishButtonRef : addCohortButtonRef}
                isPublishing={dialogOrigin === 'publish'}
                onConfirm={publishCourseToSelectedCohorts}
                showLoading={isLoadingCohorts}
                hasError={!!cohortError}
                errorMessage={cohortError || ''}
                onRetry={fetchCohorts}
                cohorts={cohorts}
                tempSelectedCohorts={tempSelectedCohorts}
                onRemoveCohort={removeTempCohort}
                onSelectCohort={selectCohort}
                onSearchChange={handleCohortSearch}
                searchQuery={cohortSearchQuery}
                filteredCohorts={filteredCohorts}
                totalSchoolCohorts={totalSchoolCohorts}
                schoolId={schoolId}
            />

            {/* Confirmation Dialog for Cohort Removal */}
            <ConfirmationDialog
                open={showRemoveCohortConfirmation}
                title="Remove Course From Cohort"
                message={`Are you sure you want to remove this course from "${cohortToRemove?.name}"? Learners in that cohort will no longer have access to this course`}
                onConfirm={() => cohortToRemove && removeCohortFromCourse(cohortToRemove.id)}
                onCancel={() => {
                    setShowRemoveCohortConfirmation(false);
                    setCohortToRemove(null);
                }}
                confirmButtonText="Remove"
                type="delete"
            />

            {/* Toast notification */}
            <Toast
                show={toast.show}
                title={toast.title}
                description={toast.description}
                emoji={toast.emoji}
                onClose={handleCloseToast}
            />

            {/* Celebratory Banner for course publication */}
            <CoursePublishSuccessBanner
                isOpen={showCelebratoryBanner}
                onClose={closeCelebratoryBanner}
                cohortCount={celebrationDetails.cohortCount}
                cohortNames={celebrationDetails.cohortNames}
            />
        </div>
    );
}