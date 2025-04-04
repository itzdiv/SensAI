import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, ScorecardItem, QuizQuestion } from '../types/quiz';
import ChatPlaceholderView from './ChatPlaceholderView';
import ChatHistoryView from './ChatHistoryView';
import AudioInputComponent from './AudioInputComponent';
import CodeEditorView from './CodeEditorView';
import { MessageCircle, Code } from 'lucide-react';
import isEqual from 'lodash/isEqual';

// Export interface for code view state to be used by parent components
export interface CodeViewState {
    isViewingCode: boolean;
    isRunning: boolean;
    previewContent: string;
    output: string;
    hasWebLanguages: boolean;
    executionTime?: string;
}

// Define MobileViewChangeEvent interface for the parent component
export interface MobileViewChangeEvent {
    mode: 'question-full' | 'chat-full' | 'split';
}

interface ChatViewProps {
    currentChatHistory: ChatMessage[];
    isAiResponding: boolean;
    showPreparingReport: boolean;
    isChatHistoryLoaded: boolean;
    isTestMode: boolean;
    taskType: 'quiz' | 'exam';
    currentQuestionConfig?: any;
    isSubmitting: boolean;
    currentAnswer: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmitAnswer: (responseType?: 'text' | 'code') => void;
    handleAudioSubmit: (audioBlob: Blob) => void;
    handleViewScorecard: (scorecard: ScorecardItem[]) => void;
    readOnly: boolean;
    viewOnly?: boolean;
    completedQuestionIds: Record<string, boolean>;
    currentQuestionId?: string;
    handleRetry?: () => void;
    onCodeStateChange?: (state: CodeViewState) => void;
    initialIsViewingCode?: boolean;
    onMobileViewChange?: (event: MobileViewChangeEvent) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
    currentChatHistory,
    isAiResponding,
    showPreparingReport,
    isChatHistoryLoaded,
    isTestMode,
    taskType,
    currentQuestionConfig,
    isSubmitting,
    currentAnswer,
    handleInputChange,
    handleKeyPress,
    handleSubmitAnswer,
    handleAudioSubmit,
    handleViewScorecard,
    readOnly,
    viewOnly = false,
    completedQuestionIds,
    currentQuestionId = '',
    handleRetry,
    onCodeStateChange,
    initialIsViewingCode = false,
    onMobileViewChange
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Add state for code editor toggle and preview
    const [isViewingCode, setIsViewingCode] = useState(initialIsViewingCode);
    const [codeContent, setCodeContent] = useState<Record<string, string>>({});
    const [previewContent, setPreviewContent] = useState('');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [executionTime, setExecutionTime] = useState('');

    // Determine if this is a coding question
    const isCodingQuestion = currentQuestionConfig?.questionType === 'coding';

    // Get coding languages from question config
    const codingLanguages = currentQuestionConfig?.codingLanguages || ['javascript'];

    // Check if web preview is available (HTML, CSS, JS)
    const hasWebLanguages = codingLanguages.some((lang: string) =>
        ['html', 'css', 'javascript', 'js', 'sql', 'react'].includes(lang?.toLowerCase())
    );

    // Determine if this question is completed
    const isQuestionCompleted = currentQuestionId ? completedQuestionIds[currentQuestionId] : false;

    // Store the previous state for comparison
    const prevStateRef = useRef<CodeViewState | null>(null);

    // Update view state when question config changes
    useEffect(() => {
        // Don't set viewing code in viewOnly mode
        if (isCodingQuestion && !viewOnly) {
            setIsViewingCode(true);
        } else {
            setIsViewingCode(false);
        }
    }, [currentQuestionConfig, isCodingQuestion, viewOnly]);

    // Extract code from chat history for coding questions
    useEffect(() => {
        if (!isCodingQuestion) {
            return;
        }

        if (currentChatHistory.length === 0) {
            setCodeContent({});
            return;
        }

        // Filter messages to find code type messages
        const codeMessages = currentChatHistory.filter(
            message => message.messageType === 'code' && message.sender === 'user'
        );

        // Use the most recent code message if any exists
        if (codeMessages.length > 0) {
            const lastCodeMessage = codeMessages[codeMessages.length - 1];
            const codeContent = lastCodeMessage.content;
            const codeByLanguage: Record<string, string> = {};

            try {
                // Try to parse code sections based on language markers
                const languagePattern = /\/\/ ([A-Z]+)\n([\s\S]*?)(?=\/\/ [A-Z]+\n|$)/g;
                let match;
                let foundAnyMatches = false;

                while ((match = languagePattern.exec(codeContent)) !== null) {
                    foundAnyMatches = true;
                    const lang = match[1].toLowerCase();
                    const code = match[2].trim();

                    // Map common language variations
                    const normalizedLang =
                        lang === 'javascript' || lang === 'js' ? 'javascript' :
                            lang === 'html' ? 'html' :
                                lang === 'css' ? 'css' :
                                    lang === 'python' || lang === 'py' ? 'python' :
                                        lang === 'typescript' || lang === 'ts' ? 'typescript' :
                                            lang;

                    codeByLanguage[normalizedLang] = code;
                }

                // If no language headers were found, use the content as the first language
                if (!foundAnyMatches && codingLanguages.length > 0) {
                    codeByLanguage[codingLanguages[0].toLowerCase()] = codeContent;
                }

                // Ensure all configured languages have an entry
                codingLanguages.forEach((lang: string) => {
                    const normalizedLang = lang.toLowerCase();
                    if (!codeByLanguage[normalizedLang]) {
                        // If a language doesn't have code yet, initialize with empty string
                        codeByLanguage[normalizedLang] = '';
                    }
                });

                // Set the code content for the editor
                setCodeContent(codeByLanguage);
            } catch (error) {
                console.error('Error parsing code from chat history:', error);
            }
        }
    }, [currentChatHistory, isCodingQuestion, codingLanguages]);

    // Notify parent of code state changes
    useEffect(() => {
        if (onCodeStateChange && isCodingQuestion) {
            const currentState = {
                isViewingCode,
                isRunning,
                previewContent,
                output,
                hasWebLanguages: hasWebLanguages,
                executionTime
            };

            // Only call onCodeStateChange if the state has actually changed
            if (!prevStateRef.current || !isEqual(prevStateRef.current, currentState)) {
                prevStateRef.current = currentState;
                onCodeStateChange(currentState);
            }
        }
    }, [isViewingCode, isRunning, previewContent, output, hasWebLanguages, isCodingQuestion, onCodeStateChange, executionTime]);

    // Toggle between chat and code views
    const toggleCodeView = () => {
        setIsViewingCode(prev => !prev);
        // No need to call onMobileViewChange here
        // This ensures the mobile view mode stays the same when toggling between code and chat
    };

    // Handle code run
    const handleCodeRun = (newPreviewContent: string, newOutput: string, newExecutionTime?: string, newIsRunning?: boolean) => {
        setPreviewContent(newPreviewContent);
        setOutput(newOutput);

        // Update isRunning based on the parameter if provided, otherwise use previous logic
        if (newIsRunning !== undefined) {
            setIsRunning(newIsRunning);
        } else if (newPreviewContent) {
            // Only set isRunning to false for web preview
            setIsRunning(false);
        }

        if (newExecutionTime !== undefined) {
            setExecutionTime(newExecutionTime);
        }

        // Update parent component with current state
        if (onCodeStateChange) {
            onCodeStateChange({
                isViewingCode,
                isRunning: newIsRunning !== undefined ? newIsRunning : (newPreviewContent ? false : isRunning),
                previewContent: newPreviewContent,
                output: newOutput,
                hasWebLanguages: hasWebLanguages,
                executionTime: newExecutionTime || executionTime
            });
        }
    };

    // Handle code submission
    const handleCodeSubmit = (code: Record<string, string>) => {
        // Add code to chat history as a user message
        if (Object.values(code).some(content => content.trim())) {
            // Format the code for display in the chat
            // You could display just the active language or all languages
            // For simplicity, we'll combine all languages with headers
            let formattedCode = '';

            // Create a formatted version of the code with language headers
            Object.entries(code).forEach(([lang, content]) => {
                if (content.trim()) {
                    formattedCode += `// ${lang.toUpperCase()}\n${content}\n\n`;
                }
            });

            // Use the existing handleSubmitAnswer, but first set the currentAnswer to the code
            // This is a workaround to reuse existing logic
            handleInputChange({
                target: { value: formattedCode.trim() }
            } as React.ChangeEvent<HTMLTextAreaElement>);

            // Then call the submit function
            handleSubmitAnswer('code');

            // Switch back to chat view
            setIsViewingCode(false);
        }
    };

    // Function to adjust textarea height based on content
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate new height (capped at approximately 6 lines)
        const lineHeight = 24; // Approximate line height in pixels
        const maxHeight = lineHeight * 6; // Max height for 6 lines
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        // Set the new height
        textarea.style.height = `${newHeight}px`;

        // Add scrolling if content exceeds maxHeight - ensure this isn't overridden by CSS
        if (textarea.scrollHeight > maxHeight) {
            textarea.style.overflowY = 'scroll';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    };

    // Adjust height when content changes
    useEffect(() => {
        adjustTextareaHeight();
    }, [currentAnswer]);

    // Reset textarea height when messages are sent
    useEffect(() => {
        if (currentAnswer === '' && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.overflowY = 'hidden';
        }
    }, [currentAnswer]);

    // Focus the textarea when the component mounts
    useEffect(() => {
        if (textareaRef.current && !readOnly && !isViewingCode) {
            textareaRef.current.focus();
        }
    }, [readOnly, isViewingCode]);

    // Modified handleKeyPress for textarea
    const handleTextareaKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter key without shift key
        if (e.key === 'Enter' && !e.shiftKey && currentAnswer.trim() && !readOnly) {
            e.preventDefault(); // Prevent new line
            handleSubmitAnswer();
        }
    };

    // Render the code editor or chat view based on state
    const renderMainContent = () => {
        // If viewing code and not in viewOnly mode, show the code editor
        if (isViewingCode && isCodingQuestion && !viewOnly) {
            return (
                <CodeEditorView
                    initialCode={codeContent}
                    languages={codingLanguages}
                    handleCodeSubmit={handleCodeSubmit}
                    onCodeRun={handleCodeRun}
                />
            );
        } else {
            return (
                <>
                    {currentChatHistory.length === 0 ? (
                        <ChatPlaceholderView
                            taskType={taskType}
                            isChatHistoryLoaded={isChatHistoryLoaded}
                            isTestMode={isTestMode}
                            inputType={currentQuestionConfig?.inputType}
                            viewOnly={viewOnly}
                        />
                    ) : (
                        <div className="flex-1 overflow-y-auto messages-container">
                            <ChatHistoryView
                                chatHistory={currentChatHistory}
                                onViewScorecard={handleViewScorecard}
                                isAiResponding={isAiResponding}
                                showPreparingReport={showPreparingReport}
                                currentQuestionConfig={currentQuestionConfig}
                                onRetry={handleRetry}
                            />
                        </div>
                    )}

                    {/* Input area with fixed position at bottom */}
                    {!viewOnly && (
                        <div className="pt-2 bg-[#111111] input-container">
                            {!(taskType === 'exam' && isQuestionCompleted) && (
                                /* Input area - conditional render based on input type */
                                <>
                                    {currentQuestionConfig?.inputType === 'audio' ? (
                                        <div className="w-full sm:w-auto">
                                            <AudioInputComponent
                                                onAudioSubmit={handleAudioSubmit}
                                                isSubmitting={isSubmitting || isAiResponding}
                                                maxDuration={currentQuestionConfig?.audioMaxDuration || 120}
                                            />
                                        </div>
                                    ) : (
                                        /* Completely restructured textarea container */
                                        <div className="relative flex items-center bg-[#111111] rounded-3xl py-1 overflow-hidden border border-[#222222]">
                                            <div className="flex-1 flex items-center">
                                                <textarea
                                                    id="no-border-textarea"
                                                    ref={textareaRef}
                                                    placeholder="Type your answer here"
                                                    className="ml-2 w-full bg-transparent text-white auto-expanding-textarea"
                                                    value={currentAnswer}
                                                    onChange={handleInputChange as any}
                                                    onKeyPress={handleTextareaKeyPress}
                                                    autoFocus={!readOnly}
                                                    disabled={false}
                                                    rows={1}
                                                    style={{
                                                        border: "none",
                                                        outline: "none",
                                                        boxShadow: "none",
                                                        padding: "12px 24px",
                                                        resize: "none"
                                                    }}
                                                />
                                            </div>
                                            <button
                                                className={`bg-white rounded-full w-10 h-10 mr-2 cursor-pointer flex items-center justify-center ${isSubmitting || isAiResponding ? 'opacity-50' : ''}`}
                                                onClick={() => handleSubmitAnswer('text')}
                                                disabled={!currentAnswer.trim() || isSubmitting || isAiResponding}
                                                aria-label="Submit answer"
                                                type="button"
                                            >
                                                {isSubmitting ? (
                                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </>
            );
        }
    };

    return (
        <div className="flex-1 flex flex-col px-3 sm:px-6 py-6 overflow-auto h-full chat-view-wrapper">
            {/* Global style for maximum specificity - this will apply regardless of Next.js styling restrictions */}
            <style global jsx>{`
                /* Target the specific textarea with an important ID */
                #no-border-textarea {
                    border: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                    -webkit-appearance: none !important;
                }
                
                /* Target all focus states */
                #no-border-textarea:focus,
                #no-border-textarea:focus-visible,
                #no-border-textarea:focus-within,
                #no-border-textarea:active {
                    border: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                    -webkit-box-shadow: none !important;
                    -moz-box-shadow: none !important;
                }
                
                /* Auto-expanding styles */
                .auto-expanding-textarea {
                    min-height: 48px;
                    max-height: 144px;
                    resize: none !important;
                    line-height: 24px !important;
                    /* Allow scrolling when needed */
                    overflow-y: auto !important; 
                }
                
                /* Hide scrollbar */
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                /* Make sure the ChatView adapts to mobile layout */
                @media (max-width: 1024px) {
                    .chat-view-wrapper {
                        height: 100% !important;
                        max-height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: auto !important;
                        padding-top: 0.75rem !important;
                        padding-bottom: 0.75rem !important;
                    }
                    
                    .messages-container {
                        flex: 1 !important;
                        overflow-y: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                    }
                    
                    .input-container {
                        flex-shrink: 0 !important;
                        margin-top: auto !important;
                    }
                    
                    /* Mobile code preview styles */
                    .mobile-code-preview {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        z-index: 50 !important;
                        background-color: #111111 !important;
                    }
                    
                    .mobile-code-preview-enter {
                        animation: slide-up 0.3s ease-out !important;
                    }
                    
                    @keyframes slide-up {
                        from {
                            transform: translateY(100%);
                        }
                        to {
                            transform: translateY(0);
                        }
                    }
                    
                    .mobile-back-button {
                        position: absolute !important;
                        top: 12px !important;
                        left: 12px !important;
                        z-index: 60 !important;
                        background-color: rgba(0, 0, 0, 0.5) !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 50% !important;
                        width: 36px !important;
                        height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                }

                /* Toggle switch styles */
                .code-toggle-switch {
                    position: relative;
                    display: inline-block;
                    height: 32px;
                    border-radius: 16px;
                    overflow: hidden;
                    background-color: #111111;
                    border: 1px solid #333333;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                .code-toggle-option {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    padding: 0 12px;
                    cursor: pointer;
                    user-select: none;
                    color: #999999;
                    font-size: 12px;
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 2;
                }
                
                .code-toggle-option.active {
                    color: #ffffff;
                    background-color: #222222;
                }
                
                /* Responsive styles for audio component */
                @media (max-width: 640px) {
                    audio {
                        width: 100% !important;
                    }
                    
                    /* Ensure audio controls are properly sized on mobile */
                    .audio-recorder-container {
                        width: 100% !important;
                    }
                }
            `}</style>

            {/* Toggle button for coding questions */}
            {!viewOnly && isCodingQuestion && (
                <div className="flex justify-end mb-4">
                    <div className="code-toggle-switch">
                        <div
                            className={`code-toggle-option ${!isViewingCode ? 'active' : ''}`}
                            onClick={() => setIsViewingCode(false)}
                        >
                            <MessageCircle size={16} className="mr-1" />
                            <span>Chat</span>
                        </div>
                        <div
                            className={`code-toggle-option ${isViewingCode ? 'active' : ''}`}
                            onClick={() => setIsViewingCode(true)}
                        >
                            <Code size={16} className="mr-1" />
                            <span>Code</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content area with code editor or chat view */}
            {renderMainContent()}
        </div>
    );
};

export default ChatView; 