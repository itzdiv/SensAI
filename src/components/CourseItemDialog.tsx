"use client";

import { useRef, useEffect, useState } from "react";
import { Sparkles, Check, X, Pencil, Eye, Edit2 } from "lucide-react";
import dynamic from "next/dynamic";
import { QuizQuestion } from "../types";
import type { LearningMaterialEditorHandle } from "./LearningMaterialEditor";
import type { QuizEditorHandle } from "../types";
import Toast from "./Toast";
import ConfirmationDialog from "./ConfirmationDialog";

// Import TaskData from types
interface TaskData {
    id: string;
    title: string;
    blocks: any[];
    status: string;
}

// Dynamically import the editor components
const DynamicLearningMaterialEditor = dynamic(
    () => import("./LearningMaterialEditor"),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }
);

// Dynamically import the QuizEditor component
const DynamicQuizEditor = dynamic(
    () => import("./QuizEditor"),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }
);

// Define props interface for the component
interface CourseItemDialogProps {
    isOpen: boolean;
    activeItem: any; // Using any for now, should be properly typed
    activeModuleId: string | null;
    isEditMode: boolean;
    isPreviewMode: boolean;
    showPublishConfirmation: boolean;
    dialogTitleRef: React.RefObject<HTMLHeadingElement | null>;
    dialogContentRef: React.RefObject<HTMLDivElement | null>;
    onClose: () => void;
    onPublishConfirm: () => void;
    onPublishCancel: () => void;
    onSetShowPublishConfirmation: (show: boolean) => void;
    onSaveItem: () => void;
    onCancelEditMode: () => void;
    onEnableEditMode: () => void;
    onDialogTitleChange: (e: React.FormEvent<HTMLHeadingElement>) => void;
    onQuizContentChange: (questions: QuizQuestion[]) => void;
    focusEditor: () => void;
    schoolId?: string; // Add schoolId prop
}

const CourseItemDialog: React.FC<CourseItemDialogProps> = ({
    isOpen,
    activeItem,
    activeModuleId,
    isEditMode,
    isPreviewMode,
    showPublishConfirmation,
    dialogTitleRef,
    dialogContentRef,
    onClose,
    onPublishConfirm,
    onPublishCancel,
    onSetShowPublishConfirmation,
    onSaveItem,
    onCancelEditMode,
    onEnableEditMode,
    onDialogTitleChange,
    onQuizContentChange,
    focusEditor,
    schoolId,
}) => {
    // Add refs for the editor components
    const learningMaterialEditorRef = useRef<LearningMaterialEditorHandle>(null);
    const quizEditorRef = useRef<QuizEditorHandle>(null);

    // State to track preview mode for quizzes
    const [quizPreviewMode, setQuizPreviewMode] = useState(false);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastTitle, setToastTitle] = useState("Published");
    const [toastDescription, setToastDescription] = useState("");
    const [toastEmoji, setToastEmoji] = useState("🚀");

    // Add state for close confirmation dialog
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

    // Add a new state variable to track which type of confirmation is being shown
    const [confirmationType, setConfirmationType] = useState<'publish' | 'edit' | 'draft'>('draft');

    // Add state for save confirmation dialog
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

    // State to track if quiz/exam has questions (for publish/preview button visibility)
    const [hasQuizQuestions, setHasQuizQuestions] = useState(false);

    // Reset quiz preview mode when dialog is closed
    useEffect(() => {
        if (!isOpen) {
            setQuizPreviewMode(false);

            // Make sure to clear questions from active item when the dialog closes for draft quizzes/exams
            if (activeItem &&
                (activeItem.type === 'quiz' || activeItem.type === 'exam') &&
                activeItem.status === 'draft') {

                console.log('Cleaning up draft quiz questions on dialog close');
                activeItem.questions = [];
            }
        } else if (isOpen) {
            // When dialog opens, ensure hasQuizQuestions is correctly initialized
            // For draft quizzes, always start with false (no questions)
            if (activeItem &&
                (activeItem.type === 'quiz' || activeItem.type === 'exam') &&
                activeItem.status === 'draft') {

                // Reset to false when dialog opens for draft quizzes
                setHasQuizQuestions(false);

                // Also ensure activeItem.questions is cleared
                console.log('Clearing questions for draft quiz on dialog open');
                activeItem.questions = [];
            } else if (activeItem &&
                (activeItem.type === 'quiz' || activeItem.type === 'exam') &&
                activeItem.status === 'published') {

                // For published quizzes, initialize based on actual data
                // Will be updated when data is loaded by the QuizEditor
                setHasQuizQuestions(activeItem.questions && activeItem.questions.length > 0);
            } else {
                // For materials, always true
                setHasQuizQuestions(true);
            }
        }
    }, [isOpen, activeItem]);

    // Add a capture phase event listener for Escape key
    useEffect(() => {
        // Handler function for keydown events in the capture phase
        const handleKeyDown = (e: KeyboardEvent) => {
            // If Escape key is pressed
            if (e.key === 'Escape') {
                // Check for active dialog element to ensure dialog is actually open
                const dialogElement = dialogContentRef.current;
                if (!dialogElement) return;

                // If close confirmation is already showing, don't do anything
                if (showCloseConfirmation) {
                    return;
                }

                // For published items in view mode, close directly
                if (activeItem?.status === 'published' && !isEditMode) {
                    onClose();
                    return;
                }

                // Prevent the default behavior and stop propagation
                e.preventDefault();
                e.stopPropagation();

                // If we're in edit mode for a published item
                if (activeItem?.status === 'published') {
                    // Show the confirmation dialog instead
                    setConfirmationType('edit');
                    setShowCloseConfirmation(true);
                } else {
                    // Check if the editor/quiz has any content using the appropriate ref
                    const hasContent = activeItem.type === 'material'
                        ? learningMaterialEditorRef.current?.hasContent() || false
                        : quizEditorRef.current?.hasContent() || false;

                    // Check if the title has been changed from default
                    const titleElement = dialogTitleRef.current;
                    const currentTitle = titleElement?.textContent || '';

                    // Set default title based on item type
                    let defaultTitle = "New Learning Material";
                    if (activeItem.type === 'quiz') defaultTitle = "New Quiz";
                    if (activeItem.type === 'exam') defaultTitle = "New Exam";

                    const isTitleChanged = currentTitle !== defaultTitle && currentTitle.trim() !== '';

                    // If there's no content and title hasn't changed, close without confirmation   
                    if (!hasContent && !isTitleChanged) {
                        if (showPublishConfirmation) {
                            onSetShowPublishConfirmation(false);
                        }
                        onClose();
                        return;
                    }

                    // Set confirmation type for draft items
                    setConfirmationType('draft');
                    setShowCloseConfirmation(true);
                    return;
                }
            }
        };

        // Add the event listener in the capture phase to intercept before other handlers
        document.addEventListener('keydown', handleKeyDown, true);

        // Clean up the event listener when the component unmounts or when dependencies change
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [activeItem, isEditMode]);

    // Bail early if dialog isn't open or there's no active item
    if (!isOpen || !activeItem) return null;

    // Check if the quiz has questions using the local state variable
    // For non-quiz items, this is always true

    // Function to handle closing the dialog
    const handleCloseRequest = () => {
        // Case 1: Published learning material in edit mode 
        if (activeItem?.status === 'published' && isEditMode) {
            // For X button and backdrop click, we want to close the entire dialog after confirmation
            // Use a different confirmation type to differentiate from the Cancel button
            setConfirmationType('draft'); // Use 'draft' type since it already closes the dialog
            setShowCloseConfirmation(true);
            return;
        }

        // Case 2: Draft items (check for content)
        if (activeItem?.status === 'draft') {
            // Check if the editor/quiz has any content using the appropriate ref
            const hasContent = activeItem.type === 'material'
                ? learningMaterialEditorRef.current?.hasContent() || false
                : quizEditorRef.current?.hasContent() || false;

            // Check if the title has been changed from default
            const titleElement = dialogTitleRef.current;
            const currentTitle = titleElement?.textContent || '';

            // Set default title based on item type
            let defaultTitle = "New Learning Material";
            if (activeItem.type === 'quiz') defaultTitle = "New Quiz";
            if (activeItem.type === 'exam') defaultTitle = "New Exam";

            const isTitleChanged = currentTitle !== defaultTitle && currentTitle.trim() !== '';

            // If there's no content and title hasn't changed, close without confirmation
            if (!hasContent && !isTitleChanged) {
                if (showPublishConfirmation) {
                    onSetShowPublishConfirmation(false);
                }
                onClose();
                return;
            }

            // Set confirmation type for draft items
            setConfirmationType('draft');
            setShowCloseConfirmation(true);
            return;
        }

        // Case 3: Published items not in edit mode - just close
        if (showPublishConfirmation) {
            onSetShowPublishConfirmation(false);
        }
        onClose();
    };

    // Add a handler for the Cancel button in published items' edit mode
    const handleCancelEditClick = () => {
        // Show confirmation for published items in edit mode
        setConfirmationType('edit');
        setShowCloseConfirmation(true);
    };

    // Handle confirmed close action
    const handleConfirmClose = () => {
        setShowCloseConfirmation(false);

        if (confirmationType === 'edit') {
            // For published items in edit mode, just exit edit mode without closing the dialog
            if (activeItem?.type === 'material') {
                // Use the ref to call cancel directly to revert any changes
                learningMaterialEditorRef.current?.cancel();
            } else if (activeItem?.type === 'quiz' || activeItem?.type === 'exam') {
                // Use the ref to call cancel directly to revert any changes
                quizEditorRef.current?.cancel();
            }

            // Exit edit mode but keep the dialog open
            onCancelEditMode();
        } else {
            // For other confirmation types (draft items or X button click), close the entire dialog
            if (showPublishConfirmation) {
                onSetShowPublishConfirmation(false);
            }
            onClose();
        }
    };

    // Handle cancel close action
    const handleCancelClose = () => {
        setShowCloseConfirmation(false);
    };

    // Handle backdrop click to close dialog
    const handleDialogBackdropClick = (e: React.MouseEvent) => {
        // Only close if clicking directly on the backdrop, not on the dialog content
        if (dialogContentRef.current && !dialogContentRef.current.contains(e.target as Node)) {
            handleCloseRequest();
        }
    };

    // Toggle quiz preview mode
    const toggleQuizPreviewMode = () => {
        // If we're not already in preview mode and trying to enter it
        if (!quizPreviewMode && quizEditorRef.current) {
            // Check if current question has content
            const hasContent = quizEditorRef.current.hasQuestionContent();

            if (!hasContent) {
                // Show toast notification
                displayToast("Empty Question", "Please add details to the question before previewing.", "🚫");
                return; // Prevent entering preview mode
            }

            // Get the current question type and check for empty correct answer or missing scorecard
            const currentQuestionType = quizEditorRef.current.getCurrentQuestionType();

            if (currentQuestionType === 'objective') {
                // For objective questions, check if correct answer is empty
                const hasCorrectAnswer = quizEditorRef.current.hasCorrectAnswer();
                if (!hasCorrectAnswer) {
                    // Show toast notification for empty correct answer
                    displayToast("Empty Correct Answer", "Please set a correct answer for this question before previewing.", "🚫");
                    // Switch to answer tab
                    quizEditorRef.current.setActiveTab('answer');
                    return; // Prevent entering preview mode
                }
            } else if (currentQuestionType === 'subjective') {
                // For subjective questions, check if scorecard is set
                const hasScorecard = quizEditorRef.current.hasScorecard();
                if (!hasScorecard) {
                    // Show toast notification for missing scorecard
                    displayToast("Missing Scorecard", "Please set a scorecard for evaluating this question before previewing.", "🚫");
                    // Switch to scorecard tab
                    quizEditorRef.current.setActiveTab('scorecard');
                    return; // Prevent entering preview mode
                }
            }
        }

        // Toggle preview mode if content exists or we're exiting preview mode
        setQuizPreviewMode(!quizPreviewMode);
    };

    // Handle showing and hiding toast
    const displayToast = (title: string, description: string, emoji: string = "🚀") => {
        setToastTitle(title);
        setToastDescription(description);
        setToastEmoji(emoji);
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 3000); // Auto-hide after 3 seconds
    };

    // Handle save button click - show confirmation
    const handleSaveClick = () => {
        // For quizzes and exams, validate before showing save confirmation
        if ((activeItem?.type === 'quiz' || activeItem?.type === 'exam') && quizEditorRef.current) {
            // Run validation before opening the save confirmation
            const isValid = quizEditorRef.current.validateBeforePublish();
            if (!isValid) {
                return; // Don't show confirmation if validation fails
            }
        }

        // If validation passes or it's a learning material, show save confirmation
        setShowSaveConfirmation(true);
    };

    // Handle confirmed save action
    const handleConfirmSave = () => {
        setShowSaveConfirmation(false);

        // Execute the actual save action based on item type
        if (activeItem?.type === 'material') {
            // Use the ref to call save directly
            learningMaterialEditorRef.current?.save();
        } else if (activeItem?.type === 'quiz' || activeItem?.type === 'exam') {
            // Use the ref to call save directly
            quizEditorRef.current?.save();
        } else {
            // For other item types, use the original save function
            onSaveItem();
        }
    };

    // Handle cancel save action
    const handleCancelSave = () => {
        setShowSaveConfirmation(false);
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={handleDialogBackdropClick}
            >
                <div
                    ref={dialogContentRef}
                    style={{
                        backgroundColor: '#1A1A1A',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        borderColor: '#1A1A1A',
                        border: '1px solid #1A1A1A'
                    }}
                    className="w-full max-w-6xl h-[90vh] rounded-lg shadow-2xl flex flex-col transform transition-all duration-300 ease-in-out scale-100 translate-y-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Dialog Header */}
                    <div
                        className="flex items-center justify-between p-4 border-b border-gray-800"
                        style={{ backgroundColor: '#111111' }}
                    >
                        <div className="flex-1 flex items-center">
                            <h2
                                ref={dialogTitleRef}
                                contentEditable={(activeItem?.status !== 'published' || isEditMode)}
                                suppressContentEditableWarning
                                onInput={(e) => {
                                    // For both learning materials and quizzes/exams, allow editing title 
                                    // but don't propagate changes upward yet (will be handled during save)
                                    // The current title will be stored in the DOM element
                                    // and will be sent to the API during save/publish
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        // Blur the element to trigger save
                                        (e.target as HTMLElement).blur();
                                    }
                                }}
                                onClick={(e) => {
                                    // Prevent click from bubbling up
                                    e.stopPropagation();

                                    // If not editable, don't continue
                                    if ((activeItem?.status === 'published' && !isEditMode)) {
                                        return;
                                    }

                                    // Set a flag to indicate the title is being edited
                                    const titleElement = e.currentTarget as HTMLElement;
                                    titleElement.dataset.editing = "true";

                                    // Only set cursor at the end on first click (not on double-click)
                                    // This allows double-click to select text as expected
                                    if (!titleElement.dataset.clicked) {
                                        titleElement.dataset.clicked = "true";

                                        // Set cursor position at the end of text
                                        const range = document.createRange();
                                        const selection = window.getSelection();
                                        const textNode = titleElement.firstChild || titleElement;

                                        if (textNode) {
                                            const textLength = textNode.textContent?.length || 0;
                                            range.setStart(textNode, textLength);
                                            range.setEnd(textNode, textLength);
                                            selection?.removeAllRanges();
                                            selection?.addRange(range);
                                        }

                                        // Reset the clicked flag after a short delay
                                        setTimeout(() => {
                                            titleElement.dataset.clicked = "";
                                        }, 300);
                                    }
                                }}
                                className={`text-2xl font-light text-white outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none cursor-text ${(activeItem?.status !== 'published' || isEditMode) ? 'w-full min-w-[300px] mr-4' : ''}`}
                                data-placeholder={activeItem?.type === 'material' ? 'New Learning Material' : activeItem?.type === 'quiz' ? 'New Quiz' : 'New Exam'}
                            >
                                {activeItem?.title}
                            </h2>
                        </div>
                        <div className="flex items-center space-x-3">
                            {/* Preview Mode Toggle for Quizzes/Exams */}
                            {(activeItem?.type === 'quiz' || activeItem?.type === 'exam') && hasQuizQuestions && (
                                <button
                                    onClick={toggleQuizPreviewMode}
                                    className="flex items-center px-4 py-2 text-sm text-white bg-transparent border !border-blue-500 hover:bg-[#222222] focus:border-blue-500 active:border-blue-500 rounded-full transition-colors cursor-pointer"
                                    aria-label={quizPreviewMode ? "Exit preview" : "Preview quiz"}
                                >
                                    {quizPreviewMode ? (
                                        <>
                                            <Edit2 size={16} className="mr-2" />
                                            Exit Preview
                                        </>
                                    ) : (
                                        <>
                                            <Eye size={16} className="mr-2" />
                                            Preview
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Publish button for all item types */}
                            {activeItem?.status === 'draft' &&
                                ((activeItem?.type === 'quiz' && hasQuizQuestions) ||
                                    (activeItem?.type === 'exam' && hasQuizQuestions) ||
                                    activeItem?.type === 'material') && (
                                    <button
                                        onClick={() => {
                                            // For quizzes and exams, validate before showing publish confirmation
                                            if ((activeItem?.type === 'quiz' || activeItem?.type === 'exam') && quizEditorRef.current) {
                                                // Run validation before opening the publish confirmation
                                                const isValid = quizEditorRef.current.validateBeforePublish();
                                                if (!isValid) {
                                                    return; // Don't show confirmation if validation fails
                                                }
                                            }

                                            // If validation passes or it's a learning material, show publish confirmation
                                            onSetShowPublishConfirmation(true);
                                        }}
                                        className="flex items-center px-4 py-2 text-sm text-white bg-transparent border !border-green-500 hover:bg-[#222222] focus:border-green-500 active:border-green-500 rounded-full transition-colors cursor-pointer"
                                        aria-label={`Publish ${activeItem?.type}`}
                                    >
                                        <Sparkles size={16} className="mr-2" />
                                        Publish
                                    </button>
                                )}

                            {activeItem?.status === 'published' && isEditMode ? (
                                <>
                                    <button
                                        onClick={handleSaveClick}
                                        className="flex items-center px-4 py-2 text-sm text-white bg-transparent border !border-green-500 hover:bg-[#222222] focus:border-green-500 active:border-green-500 rounded-full transition-colors cursor-pointer"
                                        aria-label="Save changes"
                                    >
                                        <Check size={16} className="mr-2" />
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancelEditClick}
                                        className="flex items-center px-4 py-2 text-sm text-white bg-transparent border !border-gray-500 hover:bg-[#222222] focus:border-gray-500 active:border-gray-500 rounded-full transition-colors cursor-pointer"
                                        aria-label="Cancel editing"
                                    >
                                        <X size={16} className="mr-2" />
                                        Cancel
                                    </button>
                                </>
                            ) : activeItem?.status === 'published' && !isEditMode && !quizPreviewMode && (
                                <button
                                    onClick={onEnableEditMode}
                                    className="flex items-center px-4 py-2 text-sm text-white bg-transparent border !border-violet-600 hover:bg-[#222222] focus:border-violet-600 active:border-violet-600 rounded-full transition-colors cursor-pointer"
                                    aria-label="Edit item"
                                >
                                    <Pencil size={16} className="mr-2" />
                                    Edit
                                </button>
                            )}
                        </div>

                        {/* Close button */}
                        <button
                            onClick={handleCloseRequest}
                            className="ml-2 p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#333333] transition-colors cursor-pointer"
                            aria-label="Close dialog"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Dialog Content */}
                    <div
                        className="flex-1 overflow-y-auto dialog-content-editor"
                        onClick={(e) => {
                            // Ensure the click event doesn't bubble up
                            e.stopPropagation();

                            // Only focus the editor if in editable mode
                            if (activeItem?.status !== 'published' || isEditMode) {
                                // Focus the editor
                                focusEditor();
                            }
                        }}
                    >
                        {activeItem?.type === 'material' ? (
                            <DynamicLearningMaterialEditor
                                ref={learningMaterialEditorRef}
                                key={`material-${activeItem.id}-${isEditMode}`}
                                readOnly={activeItem.status === 'published' && !isEditMode}
                                showPublishConfirmation={showPublishConfirmation}
                                onPublishConfirm={onPublishConfirm}
                                onPublishCancel={onPublishCancel}
                                taskId={activeItem.id}
                                isEditMode={isEditMode}
                                isDarkMode={true}
                                onPublishSuccess={(updatedData?: TaskData) => {
                                    // Handle publish success
                                    if (updatedData) {
                                        // Properly update the UI state first
                                        // This will transform the publish button to edit button
                                        if (activeItem && updatedData.status === 'published') {
                                            activeItem.status = 'published';
                                            activeItem.title = updatedData.title;

                                            if (updatedData.blocks) {
                                                // @ts-ignore - types may not perfectly match
                                                activeItem.content = updatedData.blocks;
                                            }
                                        }

                                        // Update will be handled by the parent component
                                        onPublishConfirm();

                                        // Show toast notification
                                        displayToast("Published", `Your learning material has been published`);
                                    }
                                    // Hide the publish confirmation dialog
                                    onSetShowPublishConfirmation(false);
                                }}
                                onSaveSuccess={(updatedData?: TaskData) => {
                                    // Handle save success - similar to publish success but without status change
                                    if (updatedData) {
                                        // Update the activeItem with new title and content
                                        if (activeItem) {
                                            activeItem.title = updatedData.title;

                                            if (updatedData.blocks) {
                                                // @ts-ignore - types may not perfectly match
                                                activeItem.content = updatedData.blocks;
                                            }
                                        }

                                        // Call the parent's save function
                                        onSaveItem();

                                        // Show toast notification for save success
                                        displayToast("Saved", `Your learning material has been updated`);
                                    }
                                }}
                            />
                        ) : activeItem?.type === 'quiz' || activeItem?.type === 'exam' ? (
                            <DynamicQuizEditor
                                ref={quizEditorRef}
                                key={`quiz-${activeItem.id}-${isEditMode}`}
                                onChange={(questions) => {
                                    // Track if there are questions for publish/preview button visibility
                                    setHasQuizQuestions(questions.length > 0);

                                    // Keep activeItem.questions updated for component state consistency
                                    if (activeItem) {
                                        activeItem.questions = questions;
                                    }

                                    // Notify parent component
                                    onQuizContentChange(questions);
                                }}
                                isPreviewMode={quizPreviewMode}
                                isDarkMode={true}
                                readOnly={activeItem.status === 'published' && !isEditMode}
                                onPublish={onPublishConfirm}
                                taskId={activeItem.id}
                                status={activeItem.status}
                                taskType={activeItem.type as 'quiz' | 'exam'}
                                showPublishConfirmation={showPublishConfirmation}
                                onPublishCancel={onPublishCancel}
                                onValidationError={(message, description) => {
                                    // Display toast notification for validation errors during publishing
                                    displayToast(message, description, "🚫");
                                }}
                                onSaveSuccess={(updatedData) => {
                                    // Handle save success
                                    if (updatedData) {
                                        console.log("Received updated data in CourseItemDialog after save:", updatedData);

                                        // Update the activeItem with the updated title and questions
                                        if (activeItem) {
                                            activeItem.title = updatedData.title;

                                            if (updatedData.questions) {
                                                activeItem.questions = updatedData.questions;
                                            }
                                        }

                                        // Call onSaveItem to exit edit mode
                                        onSaveItem();

                                        // Show toast notification for save success
                                        displayToast("Saved", `Your ${activeItem.type} has been updated`);
                                    }
                                }}
                                onPublishSuccess={(updatedData) => {
                                    // Handle publish success
                                    if (updatedData) {
                                        console.log("Received updated data in CourseItemDialog:", updatedData);

                                        // Properly update the UI state first
                                        // This will transform the publish button to edit button
                                        if (activeItem && updatedData.status === 'published') {
                                            activeItem.status = 'published';
                                            activeItem.title = updatedData.title;

                                            if (updatedData.questions) {
                                                activeItem.questions = updatedData.questions;
                                            }
                                        }

                                        // Update will be handled by the parent component
                                        // Pass the updated data to the parent component
                                        onPublishConfirm();

                                        // Show toast notification
                                        const itemTypeName = activeItem.type === 'quiz' ? 'quiz' : 'exam';
                                        displayToast("Published", `Your ${itemTypeName} has been published`);

                                        // Log the updated state for debugging
                                        console.log("Quiz published successfully, updated activeItem:", activeItem);
                                    }

                                    // Hide the publish confirmation dialog
                                    onSetShowPublishConfirmation(false);
                                }}
                                schoolId={schoolId}
                            />
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Close confirmation dialog */}
            <ConfirmationDialog
                open={showCloseConfirmation}
                title={confirmationType === 'edit' ? "Unsaved Changes" : "Unsaved Changes"}
                message={
                    confirmationType === 'edit'
                        ? "All your unsaved changes will be lost if you leave without saving. Are you sure you want to leave?"
                        : "If you do not publish, all your progress will be lost. Are you sure you want to leave?"
                }
                confirmButtonText={confirmationType === 'edit' ? "Discard Changes" : "Discard Changes"}
                cancelButtonText={confirmationType === 'edit' ? "Continue Editing" : "Continue Editing"}
                onConfirm={handleConfirmClose}
                onCancel={handleCancelClose}
                type="delete"
            />

            {/* Save confirmation dialog */}
            <ConfirmationDialog
                open={showSaveConfirmation}
                title="Ready to save changes"
                message="These changes will be reflected to learners immediately after saving. Are you sure you want to proceed?"
                confirmButtonText="Save"
                cancelButtonText="Continue Editing"
                onConfirm={handleConfirmSave}
                onCancel={handleCancelSave}
                type="publish"
            />

            {/* Toast notification */}
            <Toast
                show={showToast}
                title={toastTitle}
                description={toastDescription}
                emoji={toastEmoji}
                onClose={() => setShowToast(false)}
            />
        </>
    );
};

export default CourseItemDialog; 