import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, ChevronRight, ChevronDown as ChevronDownExpand, Plus, BookOpen, HelpCircle, Trash, Clipboard, Check } from "lucide-react";
import { Module, ModuleItem } from "@/types/course";
import { QuizQuestion } from "@/types/quiz"; // Import from types instead
import CourseItemDialog from "@/components/CourseItemDialog";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import Tooltip from "@/components/Tooltip"; // Import the Tooltip component
import { TaskData } from "@/types";

// Use the local Module and ModuleItem types to match the page component exactly
export interface Quiz {
    id: string;
    title: string;
    position: number;
    type: 'quiz';
    questions: QuizQuestion[];
    status?: string;
}

export interface Exam {
    id: string;
    title: string;
    position: number;
    type: 'exam';
    questions: QuizQuestion[];
    status?: string;
}

export interface LearningMaterial {
    id: string;
    title: string;
    position: number;
    type: 'material';
    content?: any[];
    status?: string;
}

export type LocalModuleItem = LearningMaterial | Quiz | Exam;

export interface LocalModule {
    id: string;
    title: string;
    position: number;
    items: LocalModuleItem[];
    isExpanded?: boolean;
    backgroundColor?: string;
    isEditing?: boolean;
    progress?: number;
}

interface CourseModuleListProps {
    modules: LocalModule[];
    mode: 'edit' | 'view'; // 'edit' for teacher editing, 'view' for learner viewing
    onToggleModule?: (moduleId: string) => void;
    onOpenItem?: (moduleId: string, itemId: string) => void;
    onMoveItemUp?: (moduleId: string, itemId: string) => void;
    onMoveItemDown?: (moduleId: string, itemId: string) => void;
    onDeleteItem?: (moduleId: string, itemId: string) => void;
    onAddLearningMaterial?: (moduleId: string) => Promise<void>;
    onAddQuiz?: (moduleId: string) => Promise<void>;
    onAddExam?: (moduleId: string) => Promise<void>;
    onMoveModuleUp?: (moduleId: string) => void;
    onMoveModuleDown?: (moduleId: string) => void;
    onDeleteModule?: (moduleId: string) => void;
    onEditModuleTitle?: (moduleId: string) => void;
    expandedModules?: Record<string, boolean>; // For learner view
    saveModuleTitle?: (moduleId: string) => void; // Function to save module title
    cancelModuleEditing?: (moduleId: string) => void; // Function to cancel module title editing
    completedTaskIds?: Record<string, boolean>; // Added prop for completed task IDs
    completedQuestionIds?: Record<string, Record<string, boolean>>; // Add prop for partially completed quiz/exam questions
    schoolId?: string; // Add school ID for fetching scorecards

    // Dialog-related props
    isDialogOpen?: boolean;
    activeItem?: LocalModuleItem | null;
    activeModuleId?: string | null;
    isEditMode?: boolean;
    isPreviewMode?: boolean;
    showPublishConfirmation?: boolean;
    handleConfirmPublish?: () => void;
    handleCancelPublish?: () => void;
    closeDialog?: () => void;
    saveItem?: () => void;
    cancelEditMode?: () => void;
    enableEditMode?: () => void;
    handleDialogTitleChange?: (e: React.FormEvent<HTMLHeadingElement>) => void;
    handleQuizContentChange?: (questions: QuizQuestion[]) => void;
    setShowPublishConfirmation?: (show: boolean) => void;
}

export default function CourseModuleList({
    modules,
    mode,
    onToggleModule,
    onOpenItem,
    onMoveItemUp,
    onMoveItemDown,
    onDeleteItem,
    onAddLearningMaterial,
    onAddQuiz,
    onAddExam,
    onMoveModuleUp,
    onMoveModuleDown,
    onDeleteModule,
    onEditModuleTitle,
    expandedModules = {},
    saveModuleTitle = () => { }, // Default empty function
    cancelModuleEditing = () => { }, // Default empty function
    completedTaskIds = {}, // Default empty object for completed task IDs
    completedQuestionIds = {}, // Default empty object for completed question IDs
    schoolId,

    // Dialog-related props
    isDialogOpen = false,
    activeItem = null,
    activeModuleId = null,
    isEditMode = false,
    isPreviewMode = false,
    showPublishConfirmation = false,
    handleConfirmPublish = () => { },
    handleCancelPublish = () => { },
    closeDialog = () => { },
    saveItem = () => { },
    cancelEditMode = () => { },
    enableEditMode = () => { },
    handleDialogTitleChange = () => { },
    handleQuizContentChange = () => { },
    setShowPublishConfirmation = () => { },
}: CourseModuleListProps) {
    // For editor mode where we need to keep track of expanded modules internally
    const [internalExpandedModules, setInternalExpandedModules] = useState<Record<string, boolean>>({});

    // Track completed items - initialize with completedTaskIds prop
    const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(completedTaskIds);

    // State to track module deletion confirmation
    const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);

    // State to track deletion in progress
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

    // State to track module deletion in progress
    const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);

    // State to track task deletion confirmation
    const [taskToDelete, setTaskToDelete] = useState<{ moduleId: string, itemId: string, itemType?: string } | null>(null);

    // Update completedItems when completedTaskIds changes
    useEffect(() => {
        // Only update the state if the values are actually different
        // This prevents an infinite update loop
        const hasChanged = JSON.stringify(completedItems) !== JSON.stringify(completedTaskIds);
        if (hasChanged) {
            setCompletedItems(completedTaskIds);
        }
    }, [completedTaskIds, completedItems]);

    // Function to toggle item completion
    const toggleItemCompletion = (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCompletedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Refs for the dialog
    const dialogTitleRef = useRef<HTMLHeadingElement | null>(null);
    const dialogContentRef = useRef<HTMLDivElement | null>(null);

    // Function to focus the editor
    const focusEditor = () => {
        // First, blur the title element
        if (dialogTitleRef.current) {
            dialogTitleRef.current.blur();
        }

        // Then try to find and focus the editor
        setTimeout(() => {
            try {
                const selectors = [
                    '.bn-editor',
                    '.ProseMirror',
                    '.dialog-content-editor [contenteditable="true"]',
                    '.dialog-content-editor .bn-container',
                    '.dialog-content-editor [tabindex="0"]',
                    '.dialog-content-editor [role="textbox"]',
                    '.dialog-content-editor div[contenteditable]'
                ];

                for (const selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el instanceof HTMLElement) {
                        console.log('Found and focusing editor element:', selector);
                        el.focus();
                        return; // Exit once we've focused an element
                    }
                }
                console.log('Could not find editor element to focus');
            } catch (err) {
                console.error('Error focusing editor:', err);
            }
        }, 200);
    };

    // Get the appropriate expanded state based on mode
    const getIsExpanded = (moduleId: string) => {
        if (mode === 'edit') {
            return modules.find(m => m.id === moduleId)?.isExpanded || false;
        } else {
            return expandedModules[moduleId] || false;
        }
    };

    // Handle module click based on mode
    const handleModuleClick = (e: React.MouseEvent, moduleId: string) => {
        // Find the module
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        // If in edit mode and module is in editing mode, don't toggle expansion
        if (mode === 'edit' && module.isEditing) {
            return;
        }

        // Prevent toggling if clicking on buttons
        if (
            (e.target as HTMLElement).tagName === 'BUTTON' ||
            (e.target as HTMLElement).closest('button')
        ) {
            return;
        }

        if (onToggleModule) {
            onToggleModule(moduleId);
        } else {
            // If no handler provided, handle internally
            setInternalExpandedModules(prev => ({
                ...prev,
                [moduleId]: !prev[moduleId]
            }));
        }
    };

    // Function to handle task deletion with API call
    const handleDeleteTask = async (moduleId: string, itemId: string) => {
        try {
            setDeletingTaskId(itemId);

            // Make the API call to delete the task
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete task: ${response.statusText}`);
            }

            // If the API call was successful, update the UI
            if (onDeleteItem) {
                onDeleteItem(moduleId, itemId);
            }

        } catch (error) {
            console.error('Error deleting task:', error);
            // You could add a toast notification here for the error
        } finally {
            setDeletingTaskId(null);
        }
    };

    // Function to handle task delete confirmation
    const handleConfirmTaskDelete = () => {
        if (taskToDelete) {
            handleDeleteTask(taskToDelete.moduleId, taskToDelete.itemId);
        }
        setTaskToDelete(null);
    };

    // Function to cancel task deletion
    const handleCancelTaskDelete = () => {
        setTaskToDelete(null);
    };

    // Function to handle module delete confirmation
    const handleConfirmModuleDelete = async () => {
        if (moduleToDelete && onDeleteModule) {
            try {
                setDeletingModuleId(moduleToDelete);

                // Make the API call to delete the module (milestone)
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/milestones/${moduleToDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete module: ${response.statusText}`);
                }

                // If the API call was successful, update the UI
                onDeleteModule(moduleToDelete);

            } catch (error) {
                console.error('Error deleting module:', error);
                // Could add a toast notification here for the error
            } finally {
                setDeletingModuleId(null);
            }
        }
        setModuleToDelete(null);
    };

    // Function to cancel module deletion
    const handleCancelModuleDelete = () => {
        setModuleToDelete(null);
    };

    // Function to get item type name for display
    const getItemTypeName = (type?: string) => {
        switch (type) {
            case 'material': return 'learning material';
            case 'quiz': return 'quiz';
            case 'exam': return 'exam';
            default: return 'task';
        }
    };

    return (
        <>
            <div className="space-y-2">
                {modules.map((module, index) => (
                    <div
                        key={module.id}
                        className="border-none rounded-lg transition-colors"
                        style={{ backgroundColor: module.backgroundColor }}
                    >
                        <div className="flex flex-col">
                            {/* Module header with title and buttons */}
                            <div
                                className="flex items-center cursor-pointer p-4 pb-3"
                                onClick={(e) => handleModuleClick(e, module.id)}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onToggleModule) {
                                            onToggleModule(module.id);
                                        } else {
                                            setInternalExpandedModules(prev => ({
                                                ...prev,
                                                [module.id]: !prev[module.id]
                                            }));
                                        }
                                    }}
                                    className="mr-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    aria-label={getIsExpanded(module.id) ? "Collapse module" : "Expand module"}
                                >
                                    {getIsExpanded(module.id) ? <ChevronDownExpand size={18} /> : <ChevronRight size={18} />}
                                </button>
                                <div className="flex-1 mr-4">
                                    {mode === 'edit' && module.isEditing ? (
                                        <h2
                                            contentEditable
                                            suppressContentEditableWarning
                                            className="text-xl font-light text-white outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
                                            data-module-id={module.id}
                                            data-placeholder="New Module"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {module.title}
                                        </h2>
                                    ) : (
                                        <h2
                                            className="text-xl font-light text-white cursor-pointer"
                                        >
                                            {module.title || "New Module"}
                                        </h2>
                                    )}
                                </div>

                                {/* Module action buttons - only in edit mode */}
                                {mode === 'edit' && (
                                    <div className="flex items-center space-x-2">
                                        {module.isEditing ? (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        saveModuleTitle(module.id);
                                                    }}
                                                    className="px-3 py-1 text-sm text-black bg-gray-300 hover:bg-gray-400 border border-black hover:border-gray-600 rounded-md transition-colors cursor-pointer flex items-center"
                                                    aria-label="Save module title"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                        <polyline points="7 3 7 8 15 8"></polyline>
                                                    </svg>
                                                    Save
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelModuleEditing(module.id);
                                                    }}
                                                    className="px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors focus:outline-none cursor-pointer flex items-center"
                                                    aria-label="Cancel editing"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onEditModuleTitle) {
                                                            onEditModuleTitle(module.id);
                                                        }
                                                    }}
                                                    className="px-3 py-1 text-sm text-black bg-gray-300 hover:bg-gray-400 border border-black hover:border-gray-600 rounded-md transition-colors cursor-pointer flex items-center"
                                                    aria-label="Edit module title"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onMoveModuleUp) {
                                                            onMoveModuleUp(module.id);
                                                        }
                                                    }}
                                                    disabled={index === 0}
                                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                    aria-label="Move module up"
                                                >
                                                    <ChevronUp size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onMoveModuleDown) {
                                                            onMoveModuleDown(module.id);
                                                        }
                                                    }}
                                                    disabled={index === modules.length - 1}
                                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                    aria-label="Move module down"
                                                >
                                                    <ChevronDown size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModuleToDelete(module.id);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                                    aria-label="Delete module"
                                                    disabled={deletingModuleId === module.id}
                                                >
                                                    {deletingModuleId === module.id ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                                    ) : (
                                                        <Trash size={18} />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Add expand/collapse button on the right side for view mode */}
                                {mode === 'view' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onToggleModule) {
                                                onToggleModule(module.id);
                                            } else {
                                                setInternalExpandedModules(prev => ({
                                                    ...prev,
                                                    [module.id]: !prev[module.id]
                                                }));
                                            }
                                        }}
                                        className="flex items-center px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer rounded-full border border-gray-700 bg-gray-900"
                                        aria-label={getIsExpanded(module.id) ? "Collapse module" : "Expand module"}
                                    >
                                        {getIsExpanded(module.id) ? (
                                            <>
                                                <ChevronUp size={16} className="mr-1" />
                                                <span>Collapse</span>
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown size={16} className="mr-1" />
                                                <span>Expand</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Progress information and bar - shown differently based on expanded state */}
                            {mode === 'view' && module.progress !== undefined && (
                                <>
                                    {getIsExpanded(module.id) ? (
                                        <div className="px-4 pb-2">
                                            <div className="flex justify-end items-center mb-1">
                                                <div className="text-sm text-gray-400">
                                                    {module.progress}%
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-700 h-2 rounded-full">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${module.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-4 pb-4">
                                            <div className="flex justify-end items-center mb-1">
                                                <div className="text-sm text-gray-400">
                                                    {module.progress}%
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-700 h-2 rounded-full">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${module.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Module content - only visible when expanded */}
                        {getIsExpanded(module.id) && (
                            <div className="px-4 pb-4">
                                <div className="pl-6 border-l border-gray-400 ml-2 space-y-2">
                                    {module.items.map((item, itemIndex) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center group p-2 rounded-md cursor-pointer transition-all relative mt-2 hover:bg-gray-700/50 ${completedItems[item.id] ? "opacity-60" : ""}`}
                                            onClick={() => onOpenItem && onOpenItem(module.id, item.id)}
                                        >
                                            <div className={`flex items-center mr-2 ${completedItems[item.id]
                                                ? "text-gray-400"
                                                : (item.type === 'quiz' || item.type === 'exam') &&
                                                    completedQuestionIds[item.id] &&
                                                    Object.keys(completedQuestionIds[item.id]).some(qId => completedQuestionIds[item.id][qId] === true)
                                                    ? "text-yellow-500"
                                                    : "text-gray-400"
                                                }`}>
                                                {item.type === 'material' ? <BookOpen size={16} /> :
                                                    item.type === 'quiz' ? <HelpCircle size={16} /> :
                                                        <Clipboard size={16} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className={`text-base font-light text-white outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none ${completedItems[item.id]
                                                    ? "line-through"
                                                    : (item.type === 'quiz' || item.type === 'exam') &&
                                                        completedQuestionIds[item.id] &&
                                                        Object.keys(completedQuestionIds[item.id]).some(qId => completedQuestionIds[item.id][qId] === true)
                                                        ? "text-yellow-500"
                                                        : ""
                                                    }`}>
                                                    {item.title || (item.type === 'material' ? "New Learning Material" : item.type === 'quiz' ? "New Quiz" : "New Exam")}

                                                    {/* Display completion count for incomplete quizzes/exams */}
                                                    {mode === 'view' &&
                                                        (item.type === 'quiz' || item.type === 'exam') &&
                                                        !completedItems[item.id] && // Not fully completed
                                                        completedQuestionIds[item.id] &&
                                                        Object.keys(completedQuestionIds[item.id]).some(qId => completedQuestionIds[item.id][qId] === true) &&
                                                        (
                                                            <span className="ml-2 text-sm font-normal text-yellow-500">
                                                                ({Object.values(completedQuestionIds[item.id]).filter(Boolean).length} / {Object.keys(completedQuestionIds[item.id]).length})
                                                            </span>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Item action buttons - only in edit mode */}
                                            {mode === 'edit' && (
                                                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                    {item.status === 'draft' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500 text-white mr-2">
                                                            DRAFT
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onMoveItemUp) {
                                                                onMoveItemUp(module.id, item.id);
                                                            }
                                                        }}
                                                        disabled={itemIndex === 0}
                                                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                        aria-label="Move item up"
                                                    >
                                                        <ChevronUp size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onMoveItemDown) {
                                                                onMoveItemDown(module.id, item.id);
                                                            }
                                                        }}
                                                        disabled={itemIndex === module.items.length - 1}
                                                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                        aria-label="Move item down"
                                                    >
                                                        <ChevronDown size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onDeleteItem) {
                                                                setTaskToDelete({
                                                                    moduleId: module.id,
                                                                    itemId: item.id,
                                                                    itemType: item.type
                                                                });
                                                            }
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                                        aria-label="Delete item"
                                                        disabled={deletingTaskId === item.id}
                                                    >
                                                        {deletingTaskId === item.id ? (
                                                            <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                                        ) : (
                                                            <Trash size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Completion checkbox - only in view mode */}
                                            {mode === 'view' && (
                                                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => toggleItemCompletion(item.id, e)}
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${completedItems[item.id]
                                                            ? "bg-green-500 border-0"
                                                            : "border border-gray-500 hover:border-white"
                                                            }`}
                                                        aria-label={completedItems[item.id] ? "Mark as incomplete" : "Mark as completed"}
                                                    >
                                                        {completedItems[item.id] ? (
                                                            <Check size={12} className="text-white" />
                                                        ) : null}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add item buttons - only in edit mode */}
                                    {mode === 'edit' && (
                                        <div className="flex space-x-2 mt-4">
                                            <Tooltip content="Add learning material to teach a topic in the module" position="top">
                                                <button
                                                    onClick={async () => {
                                                        if (onAddLearningMaterial) {
                                                            try {
                                                                await onAddLearningMaterial(module.id);
                                                            } catch (error) {
                                                                console.error("Failed to add learning material:", error);
                                                            }
                                                        }
                                                    }}
                                                    className="flex items-center px-3 py-1.5 text-sm text-gray-300 hover:text-white border border-gray-400 rounded-full transition-colors cursor-pointer"
                                                >
                                                    <Plus size={14} className="mr-1" />
                                                    Learning Material
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Create a practice quiz where AI nudges learners to think and answer on their own" position="top">
                                                <button
                                                    onClick={async () => {
                                                        if (onAddQuiz) {
                                                            try {
                                                                await onAddQuiz(module.id);
                                                            } catch (error) {
                                                                console.error("Failed to add quiz:", error);
                                                            }
                                                        }
                                                    }}
                                                    className="flex items-center px-3 py-1.5 text-sm text-gray-300 hover:text-white border border-gray-400 rounded-full transition-colors cursor-pointer"
                                                >
                                                    <Plus size={14} className="mr-1" />
                                                    Quiz
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Create an exam where AI evaluates responses without giving any feedback" position="top">
                                                <button
                                                    onClick={async () => {
                                                        if (onAddExam) {
                                                            try {
                                                                await onAddExam(module.id);
                                                            } catch (error) {
                                                                console.error("Failed to add exam:", error);
                                                            }
                                                        }
                                                    }}
                                                    className="flex items-center px-3 py-1.5 text-sm text-gray-300 hover:text-white border border-gray-400 rounded-full transition-colors cursor-pointer"
                                                >
                                                    <Plus size={14} className="mr-1" />
                                                    Exam
                                                </button>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add CourseItemDialog inside the CourseModuleList component */}
            <CourseItemDialog
                isOpen={isDialogOpen}
                activeItem={activeItem}
                activeModuleId={activeModuleId}
                isEditMode={isEditMode}
                isPreviewMode={isPreviewMode}
                showPublishConfirmation={showPublishConfirmation}
                dialogTitleRef={dialogTitleRef}
                dialogContentRef={dialogContentRef}
                onClose={closeDialog}
                onPublishConfirm={handleConfirmPublish}
                onPublishCancel={handleCancelPublish}
                onSetShowPublishConfirmation={setShowPublishConfirmation}
                onSaveItem={saveItem}
                onCancelEditMode={cancelEditMode}
                onEnableEditMode={enableEditMode}
                onDialogTitleChange={handleDialogTitleChange}
                onQuizContentChange={handleQuizContentChange}
                focusEditor={focusEditor}
                schoolId={schoolId}
            />

            {/* Module deletion confirmation dialog */}
            <ConfirmationDialog
                open={moduleToDelete !== null}
                title="Are you sure you want to delete this module?"
                message="All tasks within this module will be permanently removed. This action cannot be undone."
                confirmButtonText="Delete Module"
                onConfirm={handleConfirmModuleDelete}
                onCancel={handleCancelModuleDelete}
                type="delete"
            />

            {/* Task deletion confirmation dialog */}
            {taskToDelete && (
                <ConfirmationDialog
                    open={taskToDelete !== null}
                    title={`Are you sure you want to delete this ${getItemTypeName(taskToDelete.itemType)}?`}
                    message={`This ${getItemTypeName(taskToDelete.itemType)} will be permanently removed. This action cannot be undone.`}
                    confirmButtonText={`Delete`}
                    onConfirm={handleConfirmTaskDelete}
                    onCancel={handleCancelTaskDelete}
                    type="delete"
                />
            )}
        </>
    );
} 