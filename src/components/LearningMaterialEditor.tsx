"use client";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { MessageCircle, X, CheckCircle, HelpCircle } from "lucide-react";

// Add custom styles for dark mode
import "./editor-styles.css";

// Import the BlockNoteEditor component
import BlockNoteEditor from "./BlockNoteEditor";
import ConfirmationDialog from "./ConfirmationDialog";
import { TaskData } from "@/types";
import { safeLocalStorage } from "@/lib/utils/localStorage";

// Add import for ChatView
import ChatView from "./ChatView";
import { ChatMessage } from "../types/quiz";

// Define the editor handle with methods that can be called by parent components
export interface LearningMaterialEditorHandle {
    save: () => Promise<void>;
    cancel: () => void;
    hasContent: () => boolean;
}

interface LearningMaterialEditorProps {
    onChange?: (content: any[]) => void;
    isDarkMode?: boolean;
    className?: string;
    readOnly?: boolean;
    viewOnly?: boolean;
    isLearnerView?: boolean;
    showPublishConfirmation?: boolean;
    onPublishConfirm?: () => void;
    onPublishCancel?: () => void;
    taskId?: string;
    userId?: string;
    onPublishSuccess?: (updatedData?: TaskData) => void;
    onSaveSuccess?: (updatedData?: TaskData) => void;
    onAskDoubt?: () => void;
    onMarkComplete?: () => void;
}

// Uploads a file and returns the URL to the uploaded file
// You can replace this with your own implementation that uploads to your server or cloud storage
async function uploadFile(file: File) {
    // This is a simple example using a temporary file hosting service
    // For production, you should use your own server or a service like AWS S3
    const body = new FormData();
    body.append("file", file);

    try {
        const response = await fetch("https://tmpfiles.org/api/v1/upload", {
            method: "POST",
            body: body,
        });

        const data = await response.json();
        // Transform the URL to directly access the file
        return data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
}

// Use forwardRef to pass the ref from parent to this component
const LearningMaterialEditor = forwardRef<LearningMaterialEditorHandle, LearningMaterialEditorProps>(({
    onChange,
    isDarkMode = true, // Default to dark mode
    className = "",
    readOnly = false,
    viewOnly = false,
    isLearnerView = false,
    showPublishConfirmation = false,
    onPublishConfirm,
    onPublishCancel,
    taskId,
    userId = '',
    onPublishSuccess,
    onSaveSuccess,
    onAskDoubt,
    onMarkComplete,
}, ref) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [taskData, setTaskData] = useState<TaskData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editorContent, setEditorContent] = useState<any[]>([]);
    const [containerHeight, setContainerHeight] = useState<string>("auto");

    // Reference to the editor instance
    const editorRef = useRef<any>(null);

    // Reference for the ResizeObserver
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    // Add a ref to store the original data for reverting on cancel
    const originalDataRef = useRef<TaskData | null>(null);

    // Add state for button animation
    const [showButtonEntrance, setShowButtonEntrance] = useState(true);
    const [showButtonPulse, setShowButtonPulse] = useState(false);

    // Check if user has clicked the button before
    const [hasClickedFabButton, setHasClickedFabButton] = useState(false);

    // Add state for mobile menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Add state for chat view
    const [showChatView, setShowChatView] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isAiResponding, setIsAiResponding] = useState(false);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Add state to track viewport size
    const [isMobileView, setIsMobileView] = useState(false);
    // Add state for chat exit animation
    const [isChatClosing, setIsChatClosing] = useState(false);

    // Function to set the editor reference
    const setEditorInstance = (editor: any) => {
        editorRef.current = editor;
    };

    // Function to adjust the height of the editor container
    const adjustEditorHeight = useCallback(() => {
        if (!editorContainerRef.current) return;

        // Find the content element within the editor
        const editorElement = editorContainerRef.current.querySelector('.bn-container');
        if (!editorElement) return;

        // Get the current viewport height
        const viewportHeight = window.innerHeight;

        // Get the current content height
        const contentHeight = editorElement.scrollHeight;

        // Get the current visible height of the container
        const containerVisibleHeight = editorContainerRef.current.clientHeight;

        // If content height is more than half of the visible container height,
        // add extra space equal to half of the viewport height
        if (!readOnly) {
            if (contentHeight > containerVisibleHeight / 2) {
                const newHeight = contentHeight + (viewportHeight / 2);
                setContainerHeight(`${newHeight}px`);
            } else {
                // Ensure minimum height is at least the viewport height
                setContainerHeight(`${Math.max(viewportHeight, contentHeight + (viewportHeight / 2))}px`);
            }
        } else {
            setContainerHeight(`${Math.max(viewportHeight, contentHeight)}px`);
        }
    }, [readOnly]);

    // Set up the resize observer to monitor content changes
    useEffect(() => {
        // Clean up previous observer if it exists
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
        }

        if (editorContainerRef.current) {
            // Initial height adjustment
            adjustEditorHeight();

            // Create new ResizeObserver
            resizeObserverRef.current = new ResizeObserver(() => {
                adjustEditorHeight();
            });

            // Observe the editor container
            resizeObserverRef.current.observe(editorContainerRef.current);

            // Also observe editor content if we can find it
            const editorElement = editorContainerRef.current.querySelector('.bn-container');
            if (editorElement) {
                resizeObserverRef.current.observe(editorElement);
            }
        }

        // Handle window resize events
        window.addEventListener('resize', adjustEditorHeight);

        return () => {
            // Clean up the observer when component unmounts
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
            window.removeEventListener('resize', adjustEditorHeight);
        };
    }, [adjustEditorHeight]);

    // Re-adjust height when content changes
    useEffect(() => {
        // Add a small delay to ensure the content has been rendered
        const timer = setTimeout(() => {
            adjustEditorHeight();
        }, 100);

        return () => clearTimeout(timer);
    }, [editorContent, adjustEditorHeight]);

    // Function to open the slash menu
    const openSlashMenu = () => {
        // Function intentionally left empty - we're not programmatically opening the slash menu
    };

    // Remove the advanced blocks from the schema
    // Extract only the blocks we don't want
    const { image, table, video, audio, file, ...basicBlockSpecs } = defaultBlockSpecs;

    // Create a schema with only the basic blocks
    const schema = BlockNoteSchema.create({
        blockSpecs: basicBlockSpecs,
    });

    const initialContent = taskData?.blocks && taskData.blocks.length > 0 ? taskData.blocks : undefined;

    // Creates a new editor instance with the custom schema
    const editor = useCreateBlockNote({
        initialContent,
        uploadFile,
        schema, // Use our custom schema with limited blocks
    });

    // Handle editor changes and trigger height adjustment
    const handleEditorChange = (content: any[]) => {
        // Avoid unnecessary state updates if content hasn't changed
        if (JSON.stringify(content) !== JSON.stringify(editorContent)) {
            setEditorContent(content);
            if (onChange && !isPublishing) {
                onChange(content);
            }
            // Trigger height adjustment after content change
            setTimeout(adjustEditorHeight, 0);
        }
    };

    // Fetch task data when taskId changes
    useEffect(() => {
        if (taskId) {
            setIsLoading(true);

            // Use AbortController to cancel any in-flight requests
            const controller = new AbortController();

            console.log("Fetching task data for taskId:", taskId);
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}`, {
                signal: controller.signal
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch task: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // We only use the data fetched from our own API call
                    // Title updates only happen after publishing, not during editing
                    if (!data.blocks || data.blocks.length === 0) {
                        data.blocks = [
                            {
                                type: "heading",
                                props: { level: 2 },
                                content: [{ "text": "Welcome to the Learning Material Editor!", "type": "text", styles: {} }],
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "This is where you will create your learning material. You can either modify this template or remove it entirely to start from scratch.", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "", "type": "text", styles: {} }]
                            },
                            {
                                type: "heading",
                                props: { level: 3 },
                                content: [{ "text": "Key Features", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Add new blocks by clicking the + icon that appears between blocks", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Reorder blocks using the side menu (hover near the left edge of any block and drag the button with 6 dots to reorder)", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Format text using the toolbar that appears when you select text", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "", "type": "text", styles: {} }]
                            },
                            {
                                type: "heading",
                                props: { level: 3 },
                                content: [{ "text": "Available Block Types", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "Here are some examples of the different types of blocks you can use:", "type": "text", styles: {} }]
                            },
                            {
                                type: "heading",
                                props: { level: 2 },
                                content: [{ "text": "Headings (like this one)", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Bullet lists (like this)", "type": "text", styles: {} }]
                            },
                            {
                                type: "numberedListItem",
                                content: [{ "text": "Numbered lists (like this)", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "Regular paragraphs for your main content", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "", "type": "text", styles: {} }]
                            },
                            {
                                type: "heading",
                                props: { level: 3 },
                                content: [{ "text": "Creating Nested Content", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "You can create nested content in two ways:", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Using the Tab key: Simply press Tab while your cursor is on a block to indent it", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Using the side menu: Hover near the left edge of a block, click the menu icon (the button with 6 dots), and drag the block to the desired nested position inside another block", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "Here are examples of nested content:", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "Nested Lists Example", "type": "text", styles: { "bold": true } }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Main topic 1", "type": "text", styles: {} }],
                                children: [
                                    {
                                        type: "bulletListItem",
                                        props: { indent: 1 },
                                        content: [{ "text": "Subtopic 1.1 (indented using Tab or side menu)", "type": "text", styles: {} }]
                                    },
                                    {
                                        type: "bulletListItem",
                                        props: { indent: 1 },
                                        content: [{ "text": "Subtopic 1.2", "type": "text", styles: {} }],
                                        children: [{
                                            type: "bulletListItem",
                                            props: { indent: 2 },
                                            content: [{ "text": "Further nested item (press Tab again to create deeper nesting)", "type": "text", styles: {} }]
                                        }]
                                    }
                                ]
                            },

                            {
                                type: "bulletListItem",
                                content: [{ "text": "Main topic 2", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "Nested Numbered Lists", "type": "text", styles: { "bold": true } }],
                            },

                            {
                                type: "numberedListItem",
                                content: [{ "text": "First step", "type": "text", styles: {} }],
                                children: [
                                    {
                                        type: "numberedListItem",
                                        props: { indent: 1 },
                                        content: [{ "text": "Substep 1.1 (indented with Tab)", "type": "text", styles: {} }]
                                    },
                                    {
                                        type: "numberedListItem",
                                        props: { indent: 1 },
                                        content: [{ "text": "Substep 1.2", "type": "text", styles: {} }]
                                    },
                                ]
                            },
                            {
                                type: "numberedListItem",
                                content: [{ "text": "Second step", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "Tips for working with nested content:", "type": "text", styles: { "bold": true } }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "To unnest/outdent an item, press Shift+Tab", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "You can mix bullet and numbered lists in your nesting hierarchy", "type": "text", styles: {} }]
                            },
                            {
                                type: "bulletListItem",
                                content: [{ "text": "Nesting helps create a clear organizational structure for complex topics", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "", "type": "text", styles: {} }]
                            },
                            {
                                type: "heading",
                                props: { level: 3 },
                                content: [{ "text": "Publishing Your Content", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "When you are ready to make your content available to learners, click the Publish button. You can always edit and republish your content later.", "type": "text", styles: {} }]
                            },
                            {
                                type: "paragraph",
                                content: [{ "text": "Feel free to delete or modify this template to create your own learning material!", "type": "text", styles: {} }]
                            }
                        ];
                    }

                    setTaskData(data);

                    // Store the original data for reverting on cancel
                    originalDataRef.current = { ...data };

                    // Initialize editorContent with the blocks from taskData
                    if (data.blocks && data.blocks.length > 0) {
                        setEditorContent(data.blocks);
                    }

                    setIsLoading(false);
                })
                .catch(error => {
                    // Ignore AbortError as it's expected when navigating away
                    if (error.name !== 'AbortError') {
                        console.error("Error fetching task data:", error);
                    }
                    setIsLoading(false);
                });

            // Clean up function will abort the fetch if the component unmounts
            // or if the effect runs again (i.e., taskId changes)
            return () => {
                controller.abort();
            };
        }
    }, [taskId]);

    useEffect(() => {
        if (editor && taskData && taskData.blocks && taskData.blocks.length > 0) {
            // Optionally use setTimeout to delay update until editor is fully ready
            setTimeout(() => {
                try {
                    editor.replaceBlocks(editor.document, taskData.blocks);
                    // Also update the editorContent state to ensure hasContent works correctly
                    setEditorContent(taskData.blocks);
                } catch (error) {
                    console.error("Error updating editor content:", error);
                }
            }, 0);
        }
    }, [editor, taskData]);

    // Handle cancel in edit mode - revert to original data
    const handleCancel = () => {
        if (!originalDataRef.current) return;

        // Restore the original data
        setTaskData(originalDataRef.current);

        // Return the original title to the dialog header
        const dialogTitleElement = document.querySelector('.dialog-content-editor')?.parentElement?.querySelector('h2');
        if (dialogTitleElement && originalDataRef.current.title) {
            dialogTitleElement.textContent = originalDataRef.current.title;
        }
    };

    const handleConfirmPublish = async () => {
        if (!taskId) {
            console.error("Cannot publish: taskId is not provided");
            setPublishError("Cannot publish: Task ID is missing");
            return;
        }

        setIsPublishing(true);
        setPublishError(null);

        try {
            // Get the current title from the dialog - it may have been edited
            // We'll use the dialog title element ref which is passed from CourseItemDialog
            // This allows us to capture any title changes made in the dialog
            const dialogTitleElement = document.querySelector('.dialog-content-editor')?.parentElement?.querySelector('h2');
            const currentTitle = dialogTitleElement?.textContent || taskData?.title || "";

            // Use the current editor content
            const currentContent = editorContent.length > 0 ? editorContent : (taskData?.blocks || []);

            console.log("currentContent", currentContent);

            // Make POST request to publish the learning material content
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}/learning_material`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: currentTitle,
                    blocks: currentContent
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to publish learning material: ${response.status}`);
            }

            // Get the updated task data from the response
            const updatedTaskData = await response.json();

            // Ensure the status is set to 'published' and use the title we just set
            const publishedTaskData = {
                ...updatedTaskData,
                status: 'published',  // Force status to 'published' to ensure UI update
                title: currentTitle   // Use the current title from the dialog
            };

            // Update our local state with the data from the API
            setTaskData(publishedTaskData);

            console.log("Learning material published successfully");

            // First set publishing to false to avoid state updates during callbacks
            setIsPublishing(false);

            // Call the original onPublishConfirm callback if provided
            if (onPublishConfirm) {
                onPublishConfirm();
            }

            // Call the onPublishSuccess callback if provided
            // This is where we emit the updated title and content to parent components
            // This should be the last operation as it might trigger UI changes
            if (onPublishSuccess) {
                // Use setTimeout to break the current render cycle
                setTimeout(() => {
                    onPublishSuccess(publishedTaskData);
                }, 0);
            }
        } catch (error) {
            console.error("Error publishing learning material:", error);
            setPublishError(error instanceof Error ? error.message : "Failed to publish learning material");
            setIsPublishing(false);
        }
    };

    const handleCancelPublish = () => {
        setPublishError(null);
        if (onPublishCancel) {
            onPublishCancel();
        }
    };

    // Handle saving changes when in edit mode
    const handleSave = async () => {
        if (!taskId) {
            console.error("Cannot save: taskId is not provided");
            return;
        }

        try {
            // Get the current title from the dialog - it may have been edited
            const dialogTitleElement = document.querySelector('.dialog-content-editor')?.parentElement?.querySelector('h2');
            const currentTitle = dialogTitleElement?.textContent || taskData?.title || "";

            // Use the current editor content
            const currentContent = editorContent.length > 0 ? editorContent : (taskData?.blocks || []);

            // Make POST request to update the learning material content, keeping the same status
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}/learning_material`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: currentTitle,
                    blocks: currentContent
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save learning material: ${response.status}`);
            }

            // Get the updated task data from the response
            const updatedTaskData = await response.json();

            // Create updated data with the current title
            const updatedData = {
                ...updatedTaskData,
                title: currentTitle // Use the current title from the dialog
            };

            // Update our local state with the data from the API
            setTaskData(updatedData);

            console.log("Learning material saved successfully");

            // Call the onSaveSuccess callback if provided
            // This is where we emit the updated title and content to parent components
            if (onSaveSuccess) {
                // Use setTimeout to break the current render cycle
                setTimeout(() => {
                    onSaveSuccess(updatedData);
                }, 0);
            }
        } catch (error) {
            console.error("Error saving learning material:", error);
        }
    };

    // Update the content when it changes
    useEffect(() => {
        if (onChange && taskData?.blocks) {
            onChange(taskData.blocks);
        }
    }, [taskData?.blocks, onChange]);

    // Expose methods via the forwarded ref
    useImperativeHandle(ref, () => ({
        save: handleSave,
        cancel: handleCancel,
        hasContent: () => {
            console.log("Checking if editor has content");

            // First check the editorContent state
            const checkContent = (content: any[] | undefined) => {
                if (!content || content.length === 0) return false;

                // Check if there are any blocks beyond the first default paragraph
                if (content.length > 1) return true;

                // If there's only one block, check if it has actual content
                if (content.length === 1) {
                    const block = content[0];
                    // Use stringify to check if there's actual content
                    const blockContent = JSON.stringify(block.content);
                    // Check if it's not just an empty paragraph
                    if (blockContent &&
                        blockContent !== '{}' &&
                        blockContent !== '[]' &&
                        blockContent !== 'null' &&
                        blockContent !== '{"text":[]}' &&
                        blockContent !== '{"text":""}') {
                        return true;
                    }
                }

                return false;
            };

            // First check editorContent (which might be updated if user made changes)
            if (checkContent(editorContent)) {
                return true;
            }

            // If editorContent is empty but we have taskData, check that as a fallback
            // This helps when the editor just loaded and editorContent hasn't updated yet
            if (taskData?.blocks) {
                return checkContent(taskData.blocks);
            }

            return false;
        }
    }));

    // Check localStorage on component mount
    useEffect(() => {
        const hasClicked = safeLocalStorage.getItem('hasClickedFabButton') === 'true';
        setHasClickedFabButton(hasClicked);
    }, []);

    // Add effect to manage button animation
    useEffect(() => {
        if (isLearnerView) {
            // Start entrance animation
            setShowButtonEntrance(true);

            // After entrance animation completes, only start pulse if user hasn't clicked before
            const timer = setTimeout(() => {
                setShowButtonEntrance(false);
                // Only show pulse animation if user hasn't clicked the button before
                if (!hasClickedFabButton) {
                    setShowButtonPulse(true);
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isLearnerView, hasClickedFabButton]);

    // Function to toggle mobile menu
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(prev => !prev);

        // If opening the menu, stop pulse animation and save to localStorage
        if (!isMobileMenuOpen) {
            setShowButtonPulse(false);

            // If this is the first time clicking, save to localStorage
            if (!hasClickedFabButton) {
                setHasClickedFabButton(true);
                safeLocalStorage.setItem('hasClickedFabButton', 'true');
            }
        }
    };

    // Add effect to handle clicks outside the mobile menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest('.mobile-action-toggle-button')
            ) {
                setIsMobileMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Add effect to handle viewport size changes
    useEffect(() => {
        const checkMobileView = () => {
            setIsMobileView(window.innerWidth <= 1024);
        };

        // Initial check
        checkMobileView();

        // Set up event listener for window resize
        window.addEventListener('resize', checkMobileView);

        // Clean up event listener
        return () => {
            window.removeEventListener('resize', checkMobileView);
        };
    }, []);

    // Handle chat input change
    const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCurrentAnswer(e.target.value);
    };

    // Handle chat key press
    const handleChatKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // This is handled by the ChatView component's internal handler
    };

    // Create a handle retry function to resubmit the last user message
    const handleRetry = () => {
        // Find the last user message
        const lastUserMessage = [...chatHistory].reverse().find(msg => msg.sender === 'user');
        if (lastUserMessage) {
            // Remove both the error message and the last user message
            setChatHistory(prev => {
                // Start by filtering out error messages
                const withoutErrors = prev.filter(msg => !msg.isError);

                // Then remove the last user message 
                // (comparing by ID to ensure we only remove the exact last message)
                return withoutErrors.filter(msg => msg.id !== lastUserMessage.id);
            });

            // Call handleChatSubmit with the message content directly
            handleChatSubmit(
                lastUserMessage.messageType === 'code' ? 'code' : 'text',
                lastUserMessage.content
            );
        }
    };

    // Handle chat submit
    const handleChatSubmit = async (responseType: 'text' | 'code' = 'text', messageOverride?: string) => {
        // Use messageOverride if provided (for retry), otherwise use currentAnswer
        const messageContent = messageOverride || currentAnswer;

        if (!messageContent.trim() || !taskId) return;

        // Add user message to chat history
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            content: messageContent,
            sender: 'user',
            timestamp: new Date(),
            messageType: responseType
        };

        setChatHistory(prev => [...prev, newMessage]);

        // Only clear currentAnswer if we're not using an override
        if (!messageOverride) {
            setCurrentAnswer('');
        }

        // Set AI responding state
        setIsAiResponding(true);
        setIsSubmitting(true);

        try {
            // Prepare the request body
            const responseContent = messageContent.trim();
            const requestBody = {
                user_response: responseContent,
                response_type: 'text',
                task_id: parseInt(taskId),
                user_id: parseInt(userId),
                task_type: 'learning_material'
            };

            let receivedAnyResponse = false;

            // Make the API call
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            // Get the response body as a readable stream
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('ReadableStream not supported');
            }

            // Create a unique ID for the AI message
            const aiMessageId = Date.now().toString();

            // Add initial empty AI message to chat history
            const aiMessage: ChatMessage = {
                id: aiMessageId,
                content: '',
                sender: 'ai',
                timestamp: new Date(),
                messageType: 'text'
            }

            // Process the stream
            let accumulatedContent = '';
            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            break;
                        }

                        // Decode the value to text
                        const text = new TextDecoder().decode(value);

                        // Split the text into chunks (assuming each chunk is a JSON object)
                        const chunks = text.split('\n').filter(chunk => chunk.trim() !== '');

                        for (const chunk of chunks) {
                            try {
                                const data = JSON.parse(chunk);

                                // Process the response field if it exists
                                if (data.response) {
                                    // Replace content instead of accumulating it
                                    accumulatedContent = data.response;

                                    if (!receivedAnyResponse) {
                                        receivedAnyResponse = true;

                                        // Stop showing the animation
                                        setIsAiResponding(false);

                                        setChatHistory(prev => [...prev, {
                                            ...aiMessage,
                                            content: accumulatedContent
                                        }]);

                                    } else {

                                        // Update the AI message with the latest content
                                        setChatHistory(prev =>
                                            prev.map(msg =>
                                                msg.id === aiMessageId
                                                    ? { ...msg, content: accumulatedContent }
                                                    : msg
                                            )

                                        );
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing JSON chunk:', e);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error reading stream:', error);
                } finally {
                    // If we never received any feedback, also reset the AI responding state
                    if (!receivedAnyResponse) {
                        setIsAiResponding(false);
                    }

                    setIsSubmitting(false);
                }
            };

            // Start processing the stream
            await processStream();

        } catch (error) {
            console.error('Error in chat submission:', error);

            // Add error message to chat history
            const errorMessage: ChatMessage = {
                id: Date.now().toString(),
                content: 'There was an error while processing your response. Please try again.',
                sender: 'ai',
                timestamp: new Date(),
                messageType: 'text',
                isError: true
            };

            setChatHistory(prev => [...prev, errorMessage]);

            // Reset states
            setIsAiResponding(false);
            setIsSubmitting(false);
        }
    };

    // Function to handle audio submission (placeholder)
    const handleAudioSubmit = (audioBlob: Blob) => {
        // Placeholder for audio submission
        console.log("Audio submission received", audioBlob);
    };

    // Function to handle viewing scorecard (placeholder)
    const handleViewScorecard = (scorecard: any[]) => {
        // Placeholder for viewing scorecard
        console.log("View scorecard", scorecard);
    };

    // Update the onAskDoubt handler to toggle the chat view
    const handleAskDoubt = () => {
        if (showChatView && isMobileView) {
            // For mobile view, start closing animation first
            setIsChatClosing(true);
            // Wait for animation to complete before hiding chat
            setTimeout(() => {
                setShowChatView(false);
                setIsChatClosing(false);
            }, 300); // Match this with animation duration
        } else {
            setShowChatView(prev => !prev);
        }

        // Call the original onAskDoubt if provided
        if (onAskDoubt) {
            onAskDoubt();
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full ${className}`}>
            {/* Add split view styles EXACTLY copied from LearnerQuizView */}
            <style jsx>{`
                .two-column-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    height: 100%;
                    
                    @media (max-width: 1024px) {
                        grid-template-columns: 1fr;
                        grid-template-rows: 50% 50%;
                        height: 100%;
                        overflow: hidden;
                    }
                }
                
                /* Make sure the editor and chat containers properly fit their content */
                @media (max-width: 1024px) {
                    .split-view-container {
                        height: 100% !important;
                        max-height: 100% !important;
                        overflow: hidden !important;
                        display: grid !important;
                        grid-template-rows: 50% 50% !important;
                        grid-template-columns: 1fr !important;
                    }
                    
                    .question-container {
                        height: 100% !important;
                        max-height: 100% !important;
                        overflow-y: auto !important;
                        grid-row: 1 !important;
                    }
                    
                    .chat-container {
                        height: 100% !important;
                        max-height: 100% !important;
                        overflow: hidden !important;
                        display: flex !important;
                        flex-direction: column !important;
                        grid-row: 2 !important;
                    }
                    
                    /* Ensure the messages area scrolls but input stays fixed */
                    .chat-container .messages-container {
                        flex: 1 !important;
                        overflow-y: auto !important;
                        min-height: 0 !important;
                    }
                    
                    /* Ensure the input area stays at the bottom and doesn't scroll */
                    .chat-container .input-container {
                        flex-shrink: 0 !important;
                        position: sticky !important;
                        bottom: 0 !important;
                        background-color: #111111 !important;
                        z-index: 10 !important;
                        padding-top: 0.5rem !important;
                        border-top: 1px solid #222222 !important;
                    }
                }

                /* Mobile view animation styles - EXACTLY copied from LearnerQuizView */
                @keyframes pulse-ring {
                    0% {
                        box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 10px rgba(147, 51, 234, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(147, 51, 234, 0);
                    }
                }

                /* Animation for the inner pulse */
                @keyframes pulse-dot {
                    0% {
                        transform: scale(0.95);
                    }
                    70% {
                        transform: scale(1.05);
                    }
                    100% {
                        transform: scale(0.95);
                    }
                }
                
                /* Entrance animation for the button */
                @keyframes button-entrance {
                    0% {
                        opacity: 0;
                        transform: scale(0.5) translateY(20px);
                    }
                    60% {
                        transform: scale(1.1) translateY(-5px);
                    }
                    80% {
                        transform: scale(0.95) translateY(2px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                /* Slide up animation for mobile chat */
                @keyframes slide-up {
                    0% {
                        transform: translateY(100%);
                    }
                    100% {
                        transform: translateY(0);
                    }
                }

                /* Slide down animation for mobile chat */
                @keyframes slide-down {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(100%);
                    }
                }
                
                .button-entrance {
                    animation: button-entrance 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
                }

                .button-pulse {
                    animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
                }

                .button-pulse:after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    border-radius: 50%;
                    box-shadow: 0 0 8px 4px rgba(147, 51, 234, 0.5);
                    animation: pulse-dot 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
                }
                
                /* Responsive styles for the action button */
                .mobile-action-button {
                    /* Default mobile styles */
                    width: 3.5rem;
                    height: 3.5rem;
                    border-radius: 50%;
                    bottom: 1.5rem; /* Keep bottom-6 (1.5rem) for mobile */
                }

                /* Center the icon in mobile view */
                .mobile-icon {
                    margin-right: 0;
                }
                
                @media (min-width: 769px) {
                    .mobile-action-button {
                        /* Desktop styles */
                        padding: 0 1.5rem;
                        width: auto;
                        height: 3rem;
                        border-radius: 1.5rem;
                        bottom: 6rem; /* Move button higher (from bottom-6 to bottom-12) in desktop view */
                    }
                    
                    /* In desktop view, add margin to the icon */
                    .mobile-icon {
                        margin-right: 0.5rem;
                    }
                }

                /* Ensure the editor stays within the question container on mobile */
                @media (max-width: 1024px) {
                    .question-container .dark-editor {
                        max-height: calc(100% - 80px) !important;
                        overflow: auto !important;
                    }

                    /* Mobile-specific styles for the chat container */
                    .mobile-chat-container {
                        position: fixed !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        top: 0 !important;
                        z-index: 50 !important;
                        background-color: #111111 !important;
                        animation: slide-up 0.3s ease-out forwards !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                    }

                    .mobile-chat-container.slide-down {
                        animation: slide-down 0.3s ease-out forwards !important;
                    }
                }
            `}</style>

            {showChatView ? (
                <div className={`two-column-grid bg-[#111111] ${!isMobileView ? 'rounded-md overflow-hidden split-view-container' : ''}`}>
                    {/* Left side - Editor (only shows in desktop view when chat is open) */}
                    {!isMobileView && (
                        <div className="p-6 border-r border-[#222222] flex flex-col bg-[#1A1A1A] lg:border-r lg:border-b-0 sm:border-b sm:border-r-0 question-container"
                            style={{ overflow: 'auto' }}
                            ref={editorContainerRef}
                        >
                            <div className={`flex-1`}>
                                <BlockNoteEditor
                                    initialContent={initialContent}
                                    onChange={handleEditorChange}
                                    isDarkMode={isDarkMode}
                                    readOnly={readOnly}
                                    className="dark-editor"
                                    onEditorReady={setEditorInstance}
                                />
                            </div>
                        </div>
                    )}

                    {/* Right side - Chat View */}
                    <div className={`${isMobileView ? `mobile-chat-container ${isChatClosing ? 'slide-down' : ''}` : 'flex flex-col bg-[#111111] h-full overflow-hidden lg:border-l lg:border-t-0 sm:border-t sm:border-l-0 border-[#222222]'} chat-container`}>
                        <div className="chat-header flex justify-between items-center px-4 py-2 border-b border-[#222222]">
                            <h3 className="text-white text-sm font-light">Ask your doubts</h3>

                            <button
                                onClick={handleAskDoubt}
                                className="text-white hover:bg-[#222222] rounded-full p-1 transition-colors cursor-pointer"
                                aria-label="Close chat"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <ChatView
                            currentChatHistory={chatHistory}
                            isAiResponding={isAiResponding}
                            showPreparingReport={false}
                            isChatHistoryLoaded={true}
                            isTestMode={false}
                            taskType="learning_material"
                            isSubmitting={isSubmitting}
                            currentAnswer={currentAnswer}
                            handleInputChange={handleChatInputChange}
                            handleKeyPress={handleChatKeyPress}
                            handleSubmitAnswer={handleChatSubmit}
                            handleAudioSubmit={handleAudioSubmit}
                            handleViewScorecard={handleViewScorecard}
                            readOnly={false}
                            completedQuestionIds={{}}
                            handleRetry={handleRetry}
                        />
                    </div>
                </div>
            ) : (
                <div
                    className="editor-container mt-4"
                    ref={editorContainerRef}
                    style={{
                        height: containerHeight,
                        overflowY: 'auto',
                    }}
                >
                    <BlockNoteEditor
                        initialContent={initialContent}
                        onChange={handleEditorChange}
                        isDarkMode={isDarkMode}
                        readOnly={readOnly}
                        className="dark-editor"
                        onEditorReady={setEditorInstance}
                    />
                </div>
            )}

            {/* Floating button for desktop and mobile with different layouts */}
            {
                isLearnerView && !showChatView && !viewOnly && (
                    <>
                        {/* Floating action button - behavior changes based on screen size */}
                        <button
                            onClick={() => {
                                // For desktop view OR mobile view with no onMarkComplete, directly trigger handleAskDoubt
                                if (!isMobileView || !onMarkComplete) {
                                    // For desktop view direct click
                                    if (!hasClickedFabButton) {
                                        setHasClickedFabButton(true);
                                        safeLocalStorage.setItem('hasClickedFabButton', 'true');
                                    }
                                    handleAskDoubt();
                                } else {
                                    // Only toggle menu in mobile view when onMarkComplete exists
                                    toggleMobileMenu();
                                }
                            }}
                            className={`fixed right-6 bottom-6 mobile-action-toggle-button mobile-action-button rounded-full bg-purple-700 text-white flex items-center justify-center shadow-lg z-20 cursor-pointer transition-transform duration-300 focus:outline-none ${showButtonEntrance ? 'button-entrance' : ''} ${showButtonPulse ? 'button-pulse' : ''}`}
                            aria-label={isMobileMenuOpen ? "Close menu" : "Ask a doubt"}
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <>
                                    {/* 
                                  In mobile view:
                                  - Show MessageCircle directly if onMarkComplete is not defined
                                  - Show HelpCircle as toggle icon if onMarkComplete exists
                                */}
                                    <span className="lg:hidden">
                                        {!onMarkComplete ? (
                                            <MessageCircle className="h-6 w-6" />
                                        ) : (
                                            <HelpCircle className="h-6 w-6" strokeWidth={2.5} fill="rgba(147, 51, 234, 0.1)" />
                                        )}
                                    </span>
                                    <span className="hidden lg:flex lg:items-center">
                                        <MessageCircle className="h-5 w-5 mobile-icon" />
                                        <span className="lg:ml-2">Ask a doubt</span>
                                    </span>
                                </>
                            )}
                        </button>

                        {/* Only show mobile menu overlay and options when onMarkComplete exists */}
                        {isMobileMenuOpen && onMarkComplete && (
                            <div
                                className="fixed inset-0 z-10"
                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
                                aria-hidden="true"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                        )}

                        {/* Mobile menu - only shown on smaller screens and when onMarkComplete exists */}
                        {isMobileMenuOpen && onMarkComplete && (
                            <div className="lg:hidden fixed right-6 flex flex-col gap-4 items-end z-20" style={{ bottom: '100px' }} ref={mobileMenuRef}>
                                {/* Ask a doubt button */}
                                <div className="flex items-center gap-3">
                                    <span className="bg-black text-white py-2 px-4 rounded-full text-sm shadow-md">
                                        Ask a doubt
                                    </span>
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            handleAskDoubt();
                                        }}
                                        className="mobile-action-button rounded-full bg-purple-700 text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-purple-600 transition-colors"
                                        aria-label="Ask a doubt"
                                    >
                                        <MessageCircle className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Mark as complete button */}
                                <div className="flex items-center gap-3">
                                    <span className="bg-black text-white py-2 px-4 rounded-full text-sm shadow-md">
                                        Mark as complete
                                    </span>
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            onMarkComplete();
                                        }}
                                        className="mobile-action-button rounded-full bg-purple-700 text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-purple-600 transition-colors"
                                        aria-label="Mark as complete"
                                    >
                                        <CheckCircle className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )
            }

            {/* Publish Confirmation Dialog */}
            <ConfirmationDialog
                show={showPublishConfirmation}
                title="Ready to publish?"
                message="Make sure your content is complete and reviewed for errors before publishing"
                onConfirm={handleConfirmPublish}
                onCancel={handleCancelPublish}
                isLoading={isPublishing}
                errorMessage={publishError}
                type="publish"
            />
        </div>
    );
});

// Add display name for better debugging
LearningMaterialEditor.displayName = 'LearningMaterialEditor';

export default LearningMaterialEditor;