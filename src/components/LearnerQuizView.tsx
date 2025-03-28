"use client";

import "@blocknote/core/fonts/inter.css";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BlockNoteEditor from "./BlockNoteEditor";
import { QuizQuestion, ChatMessage, ScorecardItem, AIResponse, QuizQuestionConfig } from "../types/quiz";
import ChatView, { CodeViewState } from './ChatView';
import ScorecardView from './ScorecardView';
import ConfirmationDialog from './ConfirmationDialog';
import { getKnowledgeBaseContent, extractTextFromBlocks } from './QuizEditor';
import { CodePreview } from './CodeEditorView';
import isEqual from 'lodash/isEqual';

export interface LearnerQuizViewProps {
    questions: QuizQuestion[];
    onSubmitAnswer?: (questionId: string, answer: string) => void;
    isDarkMode?: boolean;
    className?: string;
    readOnly?: boolean;
    taskType?: 'quiz' | 'exam';
    currentQuestionId?: string;
    onQuestionChange?: (questionId: string) => void;
    userId?: string;
    isTestMode?: boolean;
    taskId?: string;
    completedQuestionIds?: Record<string, boolean>;
    onAiRespondingChange?: (isResponding: boolean) => void;
}

export default function LearnerQuizView({
    questions = [],
    onSubmitAnswer,
    isDarkMode = true,
    className = "",
    readOnly = false,
    taskType = 'quiz',
    currentQuestionId,
    onQuestionChange,
    userId = '',
    isTestMode = false,
    taskId = '',
    completedQuestionIds: initialCompletedQuestionIds = {},
    onAiRespondingChange
}: LearnerQuizViewProps) {
    // Constant message for exam submission confirmation
    const EXAM_CONFIRMATION_MESSAGE = "Thank you for your submission. We will review it shortly";

    // Current question index
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Update current question index when currentQuestionId changes
    useEffect(() => {
        if (currentQuestionId && questions.length > 0) {
            const index = questions.findIndex(q => q.id === currentQuestionId);
            if (index !== -1) {
                setCurrentQuestionIndex(index);
                // Reset to chat view when changing questions
                setIsViewingScorecard(false);
            }
        }
    }, [currentQuestionId, questions]);

    // Ensure we have valid questions
    const validQuestions = useMemo(() => {
        // Don't filter out any questions, just convert format if needed
        return (questions || []).map(q => {
            // If the question is null or undefined, return it with default empty values
            if (!q) {
                return {
                    id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    content: [],
                    config: {
                        inputType: 'text',
                        responseType: 'chat',
                        questionType: 'objective',
                        correctAnswer: [],
                        audioMaxDuration: 120, // Default to 2 minutes
                        scorecardData: undefined,
                        codingLanguages: [] // Default code language
                    }
                };
            }

            // If the question already has the right format, use it as is
            if (q.content && Array.isArray(q.content)) {
                // Ensure config has all required properties with defaults
                const completeConfig = {
                    ...q.config,
                    inputType: q.config?.inputType || 'text',
                    responseType: q.config?.responseType,
                    questionType: q.config?.questionType,
                    correctAnswer: q.config?.correctAnswer || [],
                    audioMaxDuration: q.config?.audioMaxDuration || 120,
                    scorecardData: q.config?.scorecardData,
                    codingLanguages: q.config?.codingLanguages || [] // Ensure code language is set
                };
                return {
                    ...q,
                    config: completeConfig
                };
            }

            // Handle API format where content might be in 'blocks' property
            if ((q as any).blocks && Array.isArray((q as any).blocks)) {
                const config = q.config || {};
                return {
                    id: q.id || `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    content: (q as any).blocks,
                    config: {
                        ...config,
                        inputType: config.inputType || 'text',
                        responseType: config.responseType,
                        questionType: config.questionType,
                        correctAnswer: config.correctAnswer || [],
                        audioMaxDuration: config.audioMaxDuration || 120,
                        scorecardData: config.scorecardData,
                        codingLanguages: config.codingLanguages || [] // Ensure code language is set
                    }
                };
            }

            // Return a default structure for any other case
            const config = q.config || {};
            return {
                id: q.id || `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content: [],
                config: {
                    ...config,
                    inputType: config.inputType || 'text',
                    responseType: config.responseType,
                    questionType: config.questionType,
                    correctAnswer: config.correctAnswer || [],
                    audioMaxDuration: config.audioMaxDuration || 120,
                    scorecardData: config.scorecardData,
                    codingLanguages: config.codingLanguages || [] // Ensure code language is set
                }
            };
        });
    }, [questions]);

    // Current answer input
    const [currentAnswer, setCurrentAnswer] = useState("");

    // State to track if an answer is being submitted
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modify the state to track chat history per question
    const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});

    // State to track if AI is responding
    const [isAiResponding, setIsAiResponding] = useState(false);

    // State to track if chat history has been loaded
    const [isChatHistoryLoaded, setIsChatHistoryLoaded] = useState(false);

    // State to track if we should show the preparing report button
    const [showPreparingReport, setShowPreparingReport] = useState(false);

    // New state to track if we're viewing a scorecard
    const [isViewingScorecard, setIsViewingScorecard] = useState(false);

    // New state to track which scorecard we're viewing
    const [activeScorecard, setActiveScorecard] = useState<ScorecardItem[]>([]);

    // Add state to remember chat scroll position
    const [chatScrollPosition, setChatScrollPosition] = useState(0);

    // Add state for navigation confirmation dialog
    const [showNavigationConfirmation, setShowNavigationConfirmation] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<'next' | 'prev' | null>(null);

    // Reference to the input element to maintain focus
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    // Reference to the chat container for scrolling
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Add a reference for the scorecard container
    const scorecardContainerRef = useRef<HTMLDivElement>(null);

    // Store the current answer in a ref to avoid re-renders
    const currentAnswerRef = useRef(currentAnswer);

    // Store the handleSubmitAnswer function in a ref to avoid circular dependencies
    const handleSubmitAnswerRef = useRef<() => void>(() => { });

    // Use a single state to track completed/submitted questions - initialize with props
    const [completedQuestionIds, setCompletedQuestionIds] = useState<Record<string, boolean>>(initialCompletedQuestionIds);

    // Update completedQuestionIds when the prop changes
    useEffect(() => {
        // To avoid infinite update loops, only update if there are actual differences
        const hasChanges = Object.keys(initialCompletedQuestionIds).some(id =>
            initialCompletedQuestionIds[id] !== completedQuestionIds[id]
        );

        if (hasChanges) {
            setCompletedQuestionIds(prev => ({
                ...prev,
                ...initialCompletedQuestionIds
            }));
        }
    }, [initialCompletedQuestionIds, completedQuestionIds]);

    // State to track which questions are currently being submitted (waiting for API response)
    const [pendingSubmissionQuestionIds, setPendingSubmissionQuestionIds] = useState<Record<string, boolean>>({});

    // Update the ref when the state changes
    useEffect(() => {
        currentAnswerRef.current = currentAnswer;
    }, [currentAnswer]);

    // Effect to focus the input when the component mounts
    useEffect(() => {
        // Focus the input field when the component mounts
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Reset chat history loaded state when taskId changes
    useEffect(() => {
        if (taskId) {
            setIsChatHistoryLoaded(false);
        }
    }, [taskId]);

    // Get the current question's chat history
    const currentChatHistory = useMemo(() => {
        const currentQuestionId = validQuestions[currentQuestionIndex]?.id || '';
        const history = chatHistories[currentQuestionId] || [];

        // For exam questions with existing chat history, we need to filter what's shown
        if (taskType === 'exam') {
            // Find any user messages in the history
            const userMessages = history.filter(msg => msg.sender === 'user');

            // Check if this question has a user message and is properly submitted (not currently in the submission process)
            const isSubmitted = completedQuestionIds[currentQuestionId] && !pendingSubmissionQuestionIds[currentQuestionId];

            // If we have user messages and the question is already submitted (not pending)
            if (userMessages.length > 0 && isSubmitted) {
                // Get the last user message
                const lastUserMessage = userMessages[userMessages.length - 1];

                // Only return the last user message and a confirmation message
                return [
                    lastUserMessage,
                    {
                        id: `ai-confirmation-${currentQuestionId}`,
                        content: EXAM_CONFIRMATION_MESSAGE,
                        sender: 'ai',
                        timestamp: new Date(),
                        messageType: 'text',
                        audioData: undefined,
                        scorecard: []
                    }
                ];
            }
        }

        return history;
    }, [chatHistories, currentQuestionIndex, validQuestions, taskType, completedQuestionIds, pendingSubmissionQuestionIds]);

    // Get the last user message for the current question
    const getLastUserMessage = useMemo(() => {
        // Filter for user messages only
        const userMessages = currentChatHistory.filter(msg => msg.sender === 'user');
        // Return the last user message if exists
        return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
    }, [currentChatHistory]);

    // Fetch chat history from backend when component mounts or task changes
    useEffect(() => {
        // Skip if we're in test mode or if userId is not available or if we've already loaded chat history
        // Also skip if taskId is not provided
        if (isTestMode || !userId || isChatHistoryLoaded || !taskId) {
            return;
        }

        const fetchChatHistory = async () => {
            if (!validQuestions || validQuestions.length === 0) {
                return;
            }

            try {
                // Make API call to fetch chat history using the provided taskId
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/user/${userId}/task/${taskId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch chat history: ${response.status}`);
                }

                const chatData = await response.json();

                // Organize chat messages by question ID
                const chatHistoryByQuestion: Record<string, ChatMessage[]> = {};
                // Track which questions had user messages
                const questionsWithResponses: Record<string, boolean> = {};

                // Process messages sequentially with Promise.all for audio messages
                await Promise.all(chatData.map(async (message: any) => {
                    const questionId = message.question_id.toString();
                    if (!chatHistoryByQuestion[questionId]) {
                        chatHistoryByQuestion[questionId] = [];
                    }

                    // For audio messages, fetch the actual audio data
                    let audioData = undefined;
                    if (message.response_type === 'audio') {
                        try {
                            // Get presigned URL
                            const file_uuid = message.content;
                            const presignedResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/presigned-url/get?uuid=${file_uuid}`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            });

                            if (!presignedResponse.ok) {
                                throw new Error('Failed to get presigned URL for audio file');
                            }

                            const { url: presignedUrl } = await presignedResponse.json();

                            // Fetch the audio data using the presigned URL
                            const audioResponse = await fetch(presignedUrl);
                            if (!audioResponse.ok) {
                                throw new Error('Failed to fetch audio data');
                            }

                            // Convert the audio data to base64
                            const audioBlob = await audioResponse.blob();
                            audioData = await blobToBase64(audioBlob);
                        } catch (error) {
                            console.error('Error fetching audio data:', error);
                        }
                    }

                    // Convert API message to ChatMessage format
                    const chatMessage: ChatMessage = {
                        id: `${message.role}-${message.id}`,
                        content: message.content,
                        sender: message.role === 'user' ? 'user' : 'ai',
                        timestamp: new Date(message.created_at),
                        messageType: message.response_type,
                        audioData: audioData,
                        scorecard: []
                    };

                    // If this is an AI message, try to parse the content as JSON
                    if (message.role === 'assistant') {
                        try {
                            // Try to parse the content as JSON
                            const contentObj = JSON.parse(message.content);

                            // Extract the feedback field to display as the message content
                            if (contentObj && contentObj.feedback) {
                                chatMessage.content = contentObj.feedback;
                            }

                            // Extract scorecard if available
                            if (contentObj && contentObj.scorecard) {
                                chatMessage.scorecard = contentObj.scorecard;
                            }
                        } catch (error) {
                            // If parsing fails, assume it's the old format (plain text)
                            // Keep the original content as is - it's already set in chatMessage
                            console.log('Message is in old format (plain text), using as is:', message.content);
                        }
                    }

                    // Track questions with user responses for exam questions
                    if (message.role === 'user') {
                        questionsWithResponses[questionId] = true;
                    }

                    chatHistoryByQuestion[questionId].push(chatMessage);
                }));

                console.log(chatHistoryByQuestion)

                // Sort chat history by timestamp for each question to ensure correct order
                Object.keys(chatHistoryByQuestion).forEach(questionId => {
                    chatHistoryByQuestion[questionId].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                });

                // Update chat histories state
                setChatHistories(chatHistoryByQuestion);

                // For exam questions with responses, mark them as completed
                if (taskType === 'exam') {
                    setCompletedQuestionIds(prev => ({
                        ...prev,
                        ...questionsWithResponses
                    }));

                    // Clear any pending submissions for these questions since they're loaded from history
                    setPendingSubmissionQuestionIds(prev => {
                        const newState = { ...prev };
                        Object.keys(questionsWithResponses).forEach(id => {
                            delete newState[id];
                        });
                        return newState;
                    });
                }

                setIsChatHistoryLoaded(true);

            } catch (error) {
                console.error("Error fetching chat history:", error);
            }
        };

        fetchChatHistory();
    }, [isTestMode, userId, validQuestions, isChatHistoryLoaded, taskId, taskType]);

    // Helper function to convert Blob to base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Extract the base64 data portion (remove "data:audio/wav;base64," prefix)
                const base64Data = base64String.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Effect to focus the input when the question changes
    useEffect(() => {
        // Ensure the input is focused after a short delay to allow the DOM to fully render
        const timer = setTimeout(() => {
            if (inputRef.current && !readOnly) {
                inputRef.current.focus();
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [currentQuestionIndex, readOnly]);

    // Effect to log and validate questions when they change
    useEffect(() => {
        if (validQuestions.length > 0 && currentQuestionIndex >= validQuestions.length) {
            setCurrentQuestionIndex(0);
        }
    }, [questions, validQuestions, currentQuestionIndex]);

    // Effect to scroll to the bottom of the chat when new messages are added
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistories]);

    // Navigate to previous question
    const goToPreviousQuestion = useCallback(() => {
        // If AI is responding, show confirmation dialog
        if (isAiResponding) {
            setPendingNavigation('prev');
            setShowNavigationConfirmation(true);
            return;
        }

        // Otherwise proceed with navigation
        executeGoToPreviousQuestion();
    }, [currentQuestionIndex, onQuestionChange, validQuestions, isAiResponding]);

    // Execute navigation to previous question without checks
    const executeGoToPreviousQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            const newIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(newIndex);
            setCurrentAnswer(""); // Reset answer when changing questions
            // Reset to chat view when changing questions
            setIsViewingScorecard(false);

            // Always notify parent component about question change
            if (onQuestionChange && validQuestions[newIndex]) {
                onQuestionChange(validQuestions[newIndex].id);
            }
        }
    }, [currentQuestionIndex, onQuestionChange, validQuestions]);

    // Navigate to next question
    const goToNextQuestion = useCallback(() => {
        // If AI is responding, show confirmation dialog
        if (isAiResponding) {
            setPendingNavigation('next');
            setShowNavigationConfirmation(true);
            return;
        }

        // Otherwise proceed with navigation
        executeGoToNextQuestion();
    }, [currentQuestionIndex, validQuestions.length, onQuestionChange, validQuestions, isAiResponding]);

    // Execute navigation to next question without checks
    const executeGoToNextQuestion = useCallback(() => {
        if (currentQuestionIndex < validQuestions.length - 1) {
            const newIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(newIndex);
            setCurrentAnswer(""); // Reset answer when changing questions
            // Reset to chat view when changing questions
            setIsViewingScorecard(false);

            // Always notify parent component about question change
            if (onQuestionChange && validQuestions[newIndex]) {
                onQuestionChange(validQuestions[newIndex].id);
            }
        }
    }, [currentQuestionIndex, validQuestions.length, onQuestionChange, validQuestions]);

    // Handle navigation confirmation
    const handleNavigationConfirm = useCallback(() => {
        setShowNavigationConfirmation(false);

        // Execute the navigation based on pending action
        if (pendingNavigation === 'next') {
            executeGoToNextQuestion();
        } else if (pendingNavigation === 'prev') {
            executeGoToPreviousQuestion();
        }

        setPendingNavigation(null);
    }, [executeGoToNextQuestion, executeGoToPreviousQuestion, pendingNavigation]);

    // Handle navigation cancellation
    const handleNavigationCancel = useCallback(() => {
        setShowNavigationConfirmation(false);
        setPendingNavigation(null);
    }, []);

    // Handle input change with focus preservation
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setCurrentAnswer(newValue);
        currentAnswerRef.current = newValue;
    }, []); // No dependencies to ensure stability

    // Handle key press in the input field
    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && currentAnswerRef.current.trim() && !readOnly) {
            handleSubmitAnswerRef.current();
        }
    }, [readOnly]); // Only depend on readOnly

    // Function to store chat history in backend
    const storeChatHistory = useCallback(async (questionId: string, userMessage: ChatMessage, aiResponse: AIResponse) => {
        if (!userId || isTestMode) return;

        // For both exam and quiz questions, use the completedQuestionIds state
        const userIsSolved = completedQuestionIds[questionId] || false;

        // For AI messages, check if it contains feedback about correctness
        // We'll extract the is_correct value from the message if it exists
        let aiIsSolved = false;
        try {
            // Try to parse the AI message as JSON to see if it contains is_correct
            if (aiResponse && typeof aiResponse.is_correct === 'boolean') {
                aiIsSolved = aiResponse.is_correct;
            }
        } catch (e) {
            console.error('Error parsing AI message:', e);
        }

        // Get the response type from the current question config
        const currentQuestion = validQuestions.find(q => q.id === questionId);
        const responseType = currentQuestion?.config?.responseType;

        // Create content based on the response type
        let contentObj = {};
        if (responseType === 'report') {
            // For report type, include both feedback and scorecard
            contentObj = {
                feedback: aiResponse.feedback,
                scorecard: aiResponse.scorecard || []
            };
        } else {
            // For chat type or any other type, just include feedback
            contentObj = {
                feedback: aiResponse.feedback
            };
        }
        let aiContent = JSON.stringify(contentObj);

        const messages = [
            {
                role: "user",
                content: userMessage.content,
                response_type: userMessage.messageType,
                audio_data: userMessage.messageType === 'audio' ? userMessage.audioData : undefined,
                created_at: userMessage.timestamp
            },
            {
                role: "assistant",
                content: aiContent,
                response_type: null,
                created_at: new Date()
            }
        ];

        const isComplete = taskType === 'exam' ? true : !userIsSolved && aiIsSolved;

        const requestBody = {
            user_id: parseInt(userId),
            question_id: parseInt(questionId),
            messages: messages,
            is_complete: isComplete
        };

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Failed to store chat history');
            }
        } catch (error) {
            console.error('Error storing chat history:', error);
        }
    }, [userId, isTestMode, completedQuestionIds, taskType, validQuestions]);

    // Process a user response (shared logic between text and audio submission)
    const processUserResponse = useCallback(
        async (
            responseContent: string,
            responseType: 'text' | 'audio' | 'code' = 'text',
            audioData?: string
        ) => {
            if (!validQuestions || validQuestions.length === 0 || currentQuestionIndex >= validQuestions.length) {
                return;
            }

            const currentQuestionId = validQuestions[currentQuestionIndex].id;

            // Set submitting state to true
            setIsSubmitting(true);

            // Create the user message object
            const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                content: responseContent,
                sender: 'user',
                timestamp: new Date(),
                messageType: responseType,
                audioData: audioData,
                scorecard: []
            };

            // Handle code type message differently for UI display
            // Only set messageType to 'code' when it actually comes from the code editor
            // or when the responseType is explicitly set to 'code'
            if (responseType === 'code') {
                userMessage.messageType = 'code';
            }
            // Don't automatically convert text messages to code messages for coding questions

            // Immediately add the user's message to chat history
            setChatHistories(prev => ({
                ...prev,
                [currentQuestionId]: [...(prev[currentQuestionId] || []), userMessage]
            }));

            // Clear the input field after submission (only for text input)
            if (responseType === 'text' || responseType === 'code') {
                setCurrentAnswer("");
                currentAnswerRef.current = "";

                // Focus the input field again
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }

            // Special case: For exam questions in test mode, don't make the API call
            // instead show confirmation immediately
            if (taskType === 'exam' && isTestMode) {
                // Mark this question as completed
                setCompletedQuestionIds(prev => ({
                    ...prev,
                    [currentQuestionId]: true
                }));

                // Call the onSubmitAnswer callback to mark completion
                if (onSubmitAnswer) {
                    onSubmitAnswer(currentQuestionId, responseType === 'audio' ? audioData || '' : responseContent);
                }

                // Add confirmation message immediately
                const confirmationMessage: ChatMessage = {
                    id: `ai-${Date.now()}`,
                    content: EXAM_CONFIRMATION_MESSAGE,
                    sender: 'ai',
                    timestamp: new Date(),
                    messageType: 'text',
                    audioData: undefined
                };

                // Update chat history with confirmation message
                setChatHistories(prev => ({
                    ...prev,
                    [currentQuestionId]: [...(prev[currentQuestionId] || []), confirmationMessage]
                }));

                // Reset states
                setIsSubmitting(false);
                return; // Skip the API call completely
            }

            // For exam questions, mark as pending submission
            if (taskType === 'exam') {
                setPendingSubmissionQuestionIds(prev => ({
                    ...prev,
                    [currentQuestionId]: true
                }));
            }

            // Show the AI typing animation
            setIsAiResponding(true);

            // Prepare the request body based on whether this is a teacher testing or a real learner
            let requestBody;

            if (isTestMode) {
                // In teacher testing mode, send chat_history and question data
                // Format the chat history for the current question
                const formattedChatHistory = (chatHistories[currentQuestionId] || []).map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.sender === 'user' ? msg.content :
                        validQuestions[currentQuestionIndex].config.responseType === 'chat' ? JSON.stringify({ feedback: msg.content }) : JSON.stringify({ feedback: msg.content, scorecard: msg.scorecard }),
                    response_type: msg.messageType,
                    audio_data: msg.audioData
                }));

                let scorecard = undefined;
                if (validQuestions[currentQuestionIndex].config.responseType === 'report') {
                    scorecard = {
                        id: validQuestions[currentQuestionIndex].config.scorecardData?.id || '',
                        title: validQuestions[currentQuestionIndex].config.scorecardData?.name || '',
                        criteria: validQuestions[currentQuestionIndex].config.scorecardData?.criteria.map(criterion => ({
                            name: criterion.name,
                            description: criterion.description,
                            min_score: criterion.minScore,
                            max_score: criterion.maxScore
                        })) || []
                    }
                }

                // Create the request body for teacher testing mode
                requestBody = {
                    user_response: responseType === 'audio' ? audioData : responseContent,
                    ...(responseType === 'audio' && { response_type: "audio" }),
                    ...(responseType === 'code' && { response_type: "code" }),
                    chat_history: formattedChatHistory,
                    question: {
                        "blocks": validQuestions[currentQuestionIndex].content,
                        "response_type": validQuestions[currentQuestionIndex].config.responseType,
                        "answer": validQuestions[currentQuestionIndex].config.correctAnswer,
                        "type": validQuestions[currentQuestionIndex].config.questionType,
                        "input_type": validQuestions[currentQuestionIndex].config.inputType,
                        "scorecard": scorecard,
                        "coding_languages": validQuestions[currentQuestionIndex].config.codingLanguages,
                        "context": getKnowledgeBaseContent(validQuestions[currentQuestionIndex].config as QuizQuestionConfig)
                    }
                };
            } else {
                // In normal mode, send question_id and user_id
                requestBody = {
                    user_response: responseType === 'audio' ? audioData : responseContent,
                    response_type: responseType,
                    question_id: currentQuestionId,
                    user_id: userId
                };
            }

            // Create a message ID for the streaming response
            const aiMessageId = `ai-${Date.now()}`;

            // Create an initial empty message for streaming content
            const initialAiMessage: ChatMessage = {
                id: aiMessageId,
                content: "",
                sender: 'ai',
                timestamp: new Date(),
                messageType: 'text',
                audioData: undefined,
                scorecard: []
            };

            let isCorrect = false;

            // Track if we've received any feedback
            let receivedAnyFeedback = false;

            // For audio responses, get a presigned URL to upload the audio file
            if (responseType === 'audio' && audioData) {
                let presigned_url = '';
                let file_key = '';
                let file_uuid = '';

                try {
                    // First, get a presigned URL for the audio file
                    const presignedUrlResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/presigned-url/create`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file_type: "wav",
                            content_type: "audio/wav"
                        })
                    });

                    if (!presignedUrlResponse.ok) {
                        throw new Error('Failed to get presigned URL');
                    }

                    const presignedData = await presignedUrlResponse.json();
                    presigned_url = presignedData.presigned_url;
                    file_key = presignedData.file_key;
                    file_uuid = presignedData.file_uuid;
                } catch (error) {
                    console.error("Error getting presigned URL for audio:", error);
                }

                // Upload the audio file to S3 using the presigned URL
                try {
                    // Convert base64 audio data to a Blob
                    const binaryData = atob(audioData);
                    const arrayBuffer = new ArrayBuffer(binaryData.length);
                    const uint8Array = new Uint8Array(arrayBuffer);

                    for (let i = 0; i < binaryData.length; i++) {
                        uint8Array[i] = binaryData.charCodeAt(i);
                    }

                    // IMPORTANT: Explicitly set type to audio/wav for the upload
                    // The browser's recorded format (likely webm) will be treated as WAV format
                    const audioBlob = new Blob([uint8Array], { type: 'audio/wav' });

                    console.log(presigned_url);
                    // Upload to S3 using the presigned URL with WAV content type
                    const uploadResponse = await fetch(presigned_url, {
                        method: 'PUT',
                        body: audioBlob,
                        headers: {
                            'Content-Type': 'audio/wav'
                        }
                    });

                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload audio to S3: ${uploadResponse.status}`);
                    }

                    console.log('Audio file uploaded successfully to S3');
                    // Update the request body with the file information
                    requestBody.user_response = file_uuid;
                    userMessage.content = file_uuid || '';
                } catch (error) {
                    console.error('Error uploading audio to S3:', error);
                    throw error;
                }
            }

            console.log(requestBody)

            // Call the API with the appropriate request body for streaming response
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }

                    // Get the response reader for streaming for both exam and quiz
                    const reader = response.body?.getReader();

                    if (!reader) {
                        throw new Error('Failed to get response reader');
                    }

                    // Function to process the streaming chunks
                    const processStream = async () => {
                        try {
                            let accumulatedFeedback = "";
                            // Add a variable to collect the complete scorecard
                            let completeScorecard = [];
                            // Add a flag to track if streaming is done
                            let streamingComplete = false;

                            while (true) {
                                const { done, value } = await reader.read();

                                if (done) {
                                    streamingComplete = true;
                                    break;
                                }

                                // Convert the chunk to text
                                const chunk = new TextDecoder().decode(value);

                                // Split by newlines to handle multiple JSON objects in a single chunk
                                const jsonLines = chunk.split('\n').filter(line => line.trim());

                                for (const line of jsonLines) {
                                    try {
                                        const data = JSON.parse(line);

                                        // Handle feedback updates
                                        if (data.feedback) {
                                            // Append to accumulated feedback
                                            accumulatedFeedback = data.feedback;

                                            // For quiz questions, update the UI as we receive chunks
                                            if (taskType === 'quiz') {
                                                // If this is the first feedback chunk we've received
                                                if (!receivedAnyFeedback) {
                                                    receivedAnyFeedback = true;

                                                    // Stop showing the animation
                                                    setIsAiResponding(false);

                                                    // Add the AI message to chat history now that we have content
                                                    setChatHistories(prev => ({
                                                        ...prev,
                                                        [currentQuestionId]: [...(prev[currentQuestionId] || []), {
                                                            ...initialAiMessage,
                                                            content: accumulatedFeedback
                                                        }]
                                                    }));
                                                } else {
                                                    // Update the existing AI message content for subsequent chunks
                                                    setChatHistories(prev => {
                                                        // Find the current question's chat history
                                                        const currentHistory = [...(prev[currentQuestionId] || [])];

                                                        // Find the index of the AI message to update
                                                        const aiMessageIndex = currentHistory.findIndex(msg => msg.id === aiMessageId);

                                                        if (aiMessageIndex !== -1) {
                                                            // Update the existing message
                                                            currentHistory[aiMessageIndex] = {
                                                                ...currentHistory[aiMessageIndex],
                                                                content: accumulatedFeedback
                                                            };
                                                        }

                                                        return {
                                                            ...prev,
                                                            [currentQuestionId]: currentHistory
                                                        };
                                                    });
                                                }
                                            }
                                            // For exam questions, we don't update the UI yet
                                            // but we still track that we received feedback
                                            else if (!receivedAnyFeedback) {
                                                receivedAnyFeedback = true;
                                            }
                                        }

                                        // Handle scorecard data when available
                                        if (data.scorecard && data.scorecard.length > 0) {
                                            // Show preparing report message if not already shown
                                            if (!showPreparingReport) {
                                                setShowPreparingReport(true);
                                            }

                                            // Instead of immediately updating the chat message,
                                            // collect the scorecard data
                                            completeScorecard = data.scorecard;
                                        }

                                        // Handle is_correct when available - for quiz questions
                                        if (taskType === 'quiz' && data.is_correct !== undefined) {
                                            isCorrect = data.is_correct;
                                        }
                                    } catch (e) {
                                        console.error('Error parsing JSON chunk:', e);
                                    }
                                }
                            }

                            // After processing all chunks (stream is complete)

                            // Only now update the chat message with the complete scorecard
                            if (completeScorecard.length > 0) {
                                // Check if all criteria received maximum scores
                                if (completeScorecard.length > 0) {
                                    // Set isCorrect to true only if all criteria have received their maximum score
                                    isCorrect = completeScorecard.every((item: ScorecardItem) =>
                                        item.score !== undefined &&
                                        item.max_score !== undefined &&
                                        item.score === item.max_score
                                    );
                                }

                                // Update the existing AI message with the complete scorecard data
                                setChatHistories(prev => {
                                    // Find the current question's chat history
                                    const currentHistory = [...(prev[currentQuestionId] || [])];

                                    // Find the index of the AI message to update
                                    const aiMessageIndex = currentHistory.findIndex(msg => msg.id === aiMessageId);

                                    if (aiMessageIndex !== -1) {
                                        // Update the existing message with the complete scorecard
                                        currentHistory[aiMessageIndex] = {
                                            ...currentHistory[aiMessageIndex],
                                            scorecard: completeScorecard
                                        };
                                    }

                                    return {
                                        ...prev,
                                        [currentQuestionId]: currentHistory
                                    };
                                });

                                // Only now hide the preparing report message
                                setTimeout(() => setShowPreparingReport(false), 0);
                            }

                            if (isCorrect) {
                                // Mark this specific question as completed
                                setCompletedQuestionIds(prev => ({
                                    ...prev,
                                    [currentQuestionId]: true
                                }));

                                // Call the onSubmitAnswer callback to mark completion
                                if (onSubmitAnswer) {
                                    onSubmitAnswer(currentQuestionId, responseType === 'audio' ? audioData || '' : responseContent);
                                }
                            }

                            // Handle exam questions completion
                            if (taskType === 'exam') {
                                // Now that all chunks have been received, mark as complete
                                // Mark this question as completed
                                setCompletedQuestionIds(prev => ({
                                    ...prev,
                                    [currentQuestionId]: true
                                }));

                                // Call the onSubmitAnswer callback to mark completion
                                if (onSubmitAnswer) {
                                    onSubmitAnswer(currentQuestionId, responseType === 'audio' ? audioData || '' : responseContent);
                                }

                                // For exam questions, clear the pending submission status
                                setPendingSubmissionQuestionIds(prev => {
                                    const newState = { ...prev };
                                    delete newState[currentQuestionId];
                                    return newState;
                                });

                                initialAiMessage.content = EXAM_CONFIRMATION_MESSAGE;

                                // Add exam confirmation message to chat history
                                setChatHistories(prev => ({
                                    ...prev,
                                    [currentQuestionId]: [...(prev[currentQuestionId] || []), {
                                        ...initialAiMessage,
                                        content: EXAM_CONFIRMATION_MESSAGE,
                                        scorecard: []
                                    }]
                                }));
                            }

                            // Store chat history in backend for both quiz and exam
                            if (!isTestMode) {
                                const aiResponse: AIResponse = {
                                    feedback: accumulatedFeedback,
                                    is_correct: isCorrect,
                                    scorecard: completeScorecard
                                };
                                storeChatHistory(currentQuestionId, userMessage, aiResponse);
                            }
                        } catch (error) {
                            console.error('Error processing stream:', error);
                            // Only reset the preparing report state when an error occurs
                            // and we need to allow the user to try again
                            if (showPreparingReport) {
                                setTimeout(() => setShowPreparingReport(false), 0);
                            }
                            throw error;
                        }
                    };

                    // Start processing the stream for both exam and quiz
                    return processStream();
                })
                .catch(error => {
                    console.error('Error fetching AI response:', error);

                    // Show error message to the user
                    const errorMessage = responseType === 'audio'
                        ? "There was an error processing your audio. Please try again."
                        : "There was an error processing your answer. Please try again.";

                    const errorResponse: ChatMessage = {
                        id: `ai-error-${Date.now()}`,
                        content: errorMessage,
                        sender: 'ai',
                        timestamp: new Date(),
                        messageType: 'text',
                        audioData: undefined,
                        scorecard: []
                    };

                    // For exam questions, clear the pending status so the user can try again
                    if (taskType === 'exam') {
                        setPendingSubmissionQuestionIds(prev => {
                            const newState = { ...prev };
                            delete newState[currentQuestionId];
                            return newState;
                        });
                    }

                    // Add the error message to the chat history
                    // This is only for UI display and won't be saved to the database
                    setChatHistories(prev => ({
                        ...prev,
                        [currentQuestionId]: [...(prev[currentQuestionId] || []), errorResponse]
                    }));

                    // Reset report preparation state on error since the user needs to try again
                    setShowPreparingReport(false);
                })
                .finally(() => {
                    // Only reset submitting state when API call is done
                    setIsSubmitting(false);

                    // If we never received any feedback, also reset the AI responding state
                    if (!receivedAnyFeedback) {
                        setIsAiResponding(false);
                    }
                });
        },
        [
            validQuestions,
            currentQuestionIndex,
            onSubmitAnswer,
            taskType,
            userId,
            isTestMode,
            chatHistories,
            storeChatHistory,
            completedQuestionIds,
            EXAM_CONFIRMATION_MESSAGE
        ]
    );

    // Modified handleSubmitAnswer function to use shared logic
    const handleSubmitAnswer = useCallback((responseType: 'text' | 'code' = 'text') => {
        // Get the current answer from the ref
        const answer = currentAnswerRef.current;

        if (!answer.trim()) return;

        // Use the shared processing function
        processUserResponse(answer, responseType);
    }, [processUserResponse]);

    // New function to handle audio submission using shared logic
    const handleAudioSubmit = useCallback(async (audioBlob: Blob) => {
        try {
            // Convert the WebM audio blob to WAV format
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Convert AudioBuffer to WAV format
            const wavBuffer = convertAudioBufferToWav(audioBuffer);
            const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

            // Convert the WAV blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(wavBlob);

            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
                const base64Data = base64Audio.split(',')[1];

                // Use the shared processing function with audio-specific parameters
                processUserResponse('', 'audio', base64Data);
            };
        } catch (error) {
            console.error("Error processing audio submission:", error);
            setIsSubmitting(false);
        }
    }, [processUserResponse]);

    // Helper function to convert AudioBuffer to WAV format
    const convertAudioBufferToWav = (audioBuffer: AudioBuffer) => {
        const numOfChan = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChan * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        const sampleRate = audioBuffer.sampleRate;
        const channels = [];

        // Extract channels
        for (let i = 0; i < numOfChan; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        // RIFF identifier
        writeString(view, 0, 'RIFF');
        // File length
        view.setUint32(4, 36 + length, true);
        // RIFF type
        writeString(view, 8, 'WAVE');
        // Format chunk identifier
        writeString(view, 12, 'fmt ');
        // Format chunk length
        view.setUint32(16, 16, true);
        // Sample format (raw)
        view.setUint16(20, 1, true);
        // Channel count
        view.setUint16(22, numOfChan, true);
        // Sample rate
        view.setUint32(24, sampleRate, true);
        // Byte rate (sample rate * block align)
        view.setUint32(28, sampleRate * numOfChan * 2, true);
        // Block align (channel count * bytes per sample)
        view.setUint16(32, numOfChan * 2, true);
        // Bits per sample
        view.setUint16(34, 16, true);
        // Data chunk identifier
        writeString(view, 36, 'data');
        // Data chunk length
        view.setUint32(40, length, true);

        // Write PCM samples
        const offset = 44;
        let pos = 0;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numOfChan; channel++) {
                // Clamp the value to -1.0 - 1.0 range and convert to 16-bit
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset + pos, value, true);
                pos += 2;
            }
        }

        return buffer;
    };

    // Helper function to write strings to DataView
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // Update the handleSubmitAnswerRef when handleSubmitAnswer changes
    useEffect(() => {
        handleSubmitAnswerRef.current = handleSubmitAnswer;
    }, [handleSubmitAnswer]);

    // Get current question content
    const currentQuestionContent = validQuestions[currentQuestionIndex]?.content || [];

    // Get current question config
    const currentQuestionConfig = validQuestions[currentQuestionIndex]?.config

    // Focus the input field directly
    useEffect(() => {
        // Use requestAnimationFrame to ensure the DOM is fully rendered
        requestAnimationFrame(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        });
    }, [currentQuestionIndex]); // Only re-focus when changing questions

    // Preset list of thinking messages for the AI typing animation
    const thinkingMessages = [
        "Analyzing your response",
        "Thinking",
        "Processing your answer",
        "Considering different angles",
        "Evaluating your submission",
        "Looking at your approach",
        "Checking against criteria",
        "Formulating feedback",
        "Preparing a thoughtful response",
        "Finding the best way to help",
        "Reflecting on your answer",
        "Connecting the dots",
        "Crafting personalized feedback",
        "Examining your reasoning",
        "Assessing key concepts"
    ];

    // State for current thinking message
    const [currentThinkingMessage, setCurrentThinkingMessage] = useState("");
    // State to track animation transition
    const [isTransitioning, setIsTransitioning] = useState(false);
    // Ref to store the interval ID for proper cleanup
    const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // Ref to store the timeout ID for proper cleanup
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Ref to store the current thinking message to avoid dependency issues
    const currentThinkingMessageRef = useRef("");
    // Ref to track if initial message has been set
    const initialMessageSetRef = useRef(false);

    // Update the ref when the state changes
    useEffect(() => {
        currentThinkingMessageRef.current = currentThinkingMessage;
    }, [currentThinkingMessage]);

    // Effect to change the thinking message every 2 seconds
    useEffect(() => {
        // Only set up the interval if AI is responding
        if (!isAiResponding) {
            // Clear any existing intervals/timeouts when AI stops responding
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current);
                messageIntervalRef.current = null;
            }
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
            // Reset the initial message flag when AI stops responding
            initialMessageSetRef.current = false;
            return;
        }

        // Set initial message only if it hasn't been set yet
        if (!initialMessageSetRef.current) {
            const randomMessage = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
            setCurrentThinkingMessage(randomMessage);
            setIsTransitioning(false);
            initialMessageSetRef.current = true;
        }

        // Set interval to change message every 2 seconds
        messageIntervalRef.current = setInterval(() => {
            // First set transition state to true (starting the fade-out)
            setIsTransitioning(true);

            // After a short delay, change the message and reset transition state
            transitionTimeoutRef.current = setTimeout(() => {
                // Get current message from the ref to avoid dependency issues
                const currentMessage = currentThinkingMessageRef.current;

                // Filter out the current message to avoid repetition
                const availableMessages = thinkingMessages.filter(msg => msg !== currentMessage);

                // Select a random message from the filtered list
                const newRandomIndex = Math.floor(Math.random() * availableMessages.length);
                setCurrentThinkingMessage(availableMessages[newRandomIndex]);

                // Reset transition state (starting the fade-in)
                setIsTransitioning(false);
            }, 200); // Short delay for the transition effect
        }, 2000);

        // Clean up interval and timeout on unmount or when dependencies change
        return () => {
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current);
                messageIntervalRef.current = null;
            }
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
        };
    }, [isAiResponding]);

    // Custom styles for the pulsating animation and hidden scrollbar
    const customStyles = `
    @keyframes pulsate {
      0% {
        transform: scale(0.9);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.6;
      }
      100% {
        transform: scale(0.9);
        opacity: 0.8;
      }
    }
    
    .pulsating-circle {
      animation: pulsate 1.5s ease-in-out infinite;
    }

    @keyframes highlightText {
      0% {
        background-position: -200% center;
      }
      100% {
        background-position: 300% center;
      }
    }

    .highlight-animation {
      background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 25%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 75%);
      background-size: 200% auto;
      color: rgba(255, 255, 255, 0.6);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: highlightText 2s linear infinite;
      transition: opacity 0.2s ease-in-out;
    }

    .message-transition-out {
      opacity: 0.5;
    }

    .message-transition-in {
      opacity: 1;
    }

    /* Hide scrollbar for Chrome, Safari and Opera */
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    .hide-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    `;

    // ScoreCard view toggle functions
    const handleViewScorecard = (scorecard: ScorecardItem[]) => {
        // Save current chat scroll position before switching views
        if (chatContainerRef.current) {
            setChatScrollPosition(chatContainerRef.current.scrollTop);
        }

        setActiveScorecard(scorecard);
        setIsViewingScorecard(true);

        // Reset scroll position of scorecard view when opened
        setTimeout(() => {
            if (scorecardContainerRef.current) {
                scorecardContainerRef.current.scrollTop = 0;
            }
        }, 0);
    };

    const handleBackToChat = () => {
        setIsViewingScorecard(false);

        // Focus the input field when returning to chat if appropriate
        setTimeout(() => {
            if (!readOnly && inputRef.current) {
                inputRef.current.focus();
            }

            // Restore saved chat scroll position
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatScrollPosition;
            }
        }, 0);
    };

    // Function to handle retrying the last user message
    const handleRetry = useCallback(() => {
        if (!validQuestions || validQuestions.length === 0) {
            return;
        }

        const currentQuestionId = validQuestions[currentQuestionIndex].id;
        const currentHistory = chatHistories[currentQuestionId] || [];

        // Find the most recent user message
        const userMessages = currentHistory.filter(msg => msg.sender === 'user');
        if (userMessages.length === 0) {
            return; // No user message to retry
        }

        const lastUserMessage = userMessages[userMessages.length - 1];

        // If in test mode, first remove the last user message and AI response
        if (isTestMode) {
            // Find all AI messages
            const aiMessages = currentHistory.filter(msg => msg.sender === 'ai');

            // If there are AI messages, remove the last user message and last AI message
            if (aiMessages.length > 0) {
                setChatHistories(prev => {
                    const updatedHistory = [...(prev[currentQuestionId] || [])];
                    // Remove the last two messages (last user message and last AI response)
                    updatedHistory.splice(updatedHistory.length - 2, 2);
                    return {
                        ...prev,
                        [currentQuestionId]: updatedHistory
                    };
                });
            } else {
                // If no AI messages (unusual case), just remove the last user message
                setChatHistories(prev => {
                    const updatedHistory = [...(prev[currentQuestionId] || [])];
                    // Remove just the last user message
                    updatedHistory.pop();
                    return {
                        ...prev,
                        [currentQuestionId]: updatedHistory
                    };
                });
            }
        }

        // Now process the user response again
        // If it's an audio message, get the audio data
        if (lastUserMessage.messageType === 'audio') {
            if (lastUserMessage.audioData) {
                processUserResponse('', 'audio', lastUserMessage.audioData);
            }
        } else {
            // For text messages, resubmit the text content
            processUserResponse(lastUserMessage.content);
        }
    }, [validQuestions, currentQuestionIndex, chatHistories, processUserResponse, isTestMode]);

    // Update the parent component when AI responding state changes
    useEffect(() => {
        if (onAiRespondingChange) {
            onAiRespondingChange(isAiResponding);
        }
    }, [isAiResponding, onAiRespondingChange]);

    // Add new state for code view
    const [codeViewState, setCodeViewState] = useState<CodeViewState>({
        isViewingCode: false,
        isRunning: false,
        previewContent: '',
        output: '',
        hasWebLanguages: false
    });

    // Handle code view state changes from ChatView
    const handleCodeStateChange = (newState: CodeViewState) => {
        // Only update state if there are actual changes to prevent infinite loops
        setCodeViewState(prevState => {
            // Return previous state if new state is deeply equal to prevent unnecessary updates
            if (isEqual(prevState, newState)) {
                return prevState;
            }
            return newState;
        });
    };

    // Determine if we should show the 3-column layout
    const isCodeQuestion = useMemo(() => {
        if (!validQuestions || validQuestions.length === 0) return false;
        return validQuestions[currentQuestionIndex]?.config?.questionType === 'coding';
    }, [validQuestions, currentQuestionIndex]);

    return (
        <div className={`w-full h-full ${className}`}>
            {/* Add the custom styles */}
            <style jsx>{customStyles}</style>
            <style jsx>{`
                .three-column-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 0.75fr;
                    height: 100%;
                }
                
                .two-column-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    height: 100%;
                }
                
                .preview-placeholder {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    background-color: #1A1A1A;
                    color: #666666;
                    font-size: 0.9rem;
                    text-align: center;
                    padding: 1rem;
                }
                
                .preview-placeholder svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
            `}</style>

            <div className={`rounded-md overflow-hidden ${isCodeQuestion && codeViewState.isViewingCode ? 'three-column-grid' : 'two-column-grid'} bg-[#111111]`}>
                {/* Left side - Question (33% or 50% depending on layout) */}
                <div className="p-6 border-r border-[#222222] flex flex-col bg-[#1A1A1A]">
                    {/* Navigation controls at the top of left side - only show if more than one question */}
                    {validQuestions.length > 1 ? (
                        <div className="flex items-center justify-between w-full mb-6">
                            <div className="w-10 h-10">
                                <button
                                    className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#222222] text-white ${currentQuestionIndex > 0 ? 'hover:bg-[#333333] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                    onClick={goToPreviousQuestion}
                                    disabled={currentQuestionIndex <= 0}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            </div>

                            <div className="bg-[#222222] px-3 py-1 rounded-full text-white text-sm">
                                Question {currentQuestionIndex + 1} / {validQuestions.length}
                            </div>

                            <div className="w-10 h-10">
                                <button
                                    className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#222222] text-white ${currentQuestionIndex < validQuestions.length - 1 ? 'hover:bg-[#333333] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                    onClick={goToNextQuestion}
                                    disabled={currentQuestionIndex >= validQuestions.length - 1}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full mb-6">
                            <div className="bg-[#222222] px-3 py-1 rounded-full text-white text-sm">
                                Question
                            </div>
                        </div>
                    )}

                    <div className={`flex-1 ${questions.length > 1 ? 'mt-4' : ''}`}>
                        {/* Use editor with negative margin to offset unwanted space */}
                        <div className="ml-[-60px]"> {/* Increased negative margin to align with navigation arrow */}
                            <BlockNoteEditor
                                key={`question-view-${currentQuestionIndex}`}
                                initialContent={currentQuestionContent}
                                onChange={() => { }} // Read-only in view mode
                                isDarkMode={isDarkMode}
                                readOnly={true}
                                className={`!bg-transparent ${isTestMode ? 'quiz-viewer-preview' : 'quiz-viewer'}`}
                                placeholder="Question content will appear here"
                            />
                        </div>
                    </div>
                </div>

                {/* Middle column - Chat/Code View */}
                <div className="flex flex-col bg-[#111111] h-full overflow-hidden">
                    {isViewingScorecard ? (
                        /* Use the ScorecardView component */
                        <ScorecardView
                            activeScorecard={activeScorecard}
                            handleBackToChat={handleBackToChat}
                            lastUserMessage={getLastUserMessage as ChatMessage | null}
                        />
                    ) : (
                        /* Use the ChatView component */
                        <ChatView
                            currentChatHistory={currentChatHistory as ChatMessage[]}
                            isAiResponding={isAiResponding}
                            showPreparingReport={showPreparingReport}
                            isChatHistoryLoaded={isChatHistoryLoaded}
                            isTestMode={isTestMode}
                            taskType={taskType}
                            currentQuestionConfig={validQuestions[currentQuestionIndex]?.config}
                            isSubmitting={isSubmitting}
                            currentAnswer={currentAnswer}
                            handleInputChange={handleInputChange}
                            handleKeyPress={handleKeyPress}
                            handleSubmitAnswer={handleSubmitAnswer}
                            handleAudioSubmit={handleAudioSubmit}
                            handleViewScorecard={handleViewScorecard}
                            readOnly={readOnly}
                            completedQuestionIds={completedQuestionIds}
                            currentQuestionId={validQuestions[currentQuestionIndex]?.id}
                            handleRetry={handleRetry}
                            onCodeStateChange={handleCodeStateChange}
                            initialIsViewingCode={isCodeQuestion}
                        />
                    )}
                </div>

                {/* Third column - Code Preview (only shown for coding questions) */}
                {isCodeQuestion && codeViewState.isViewingCode && (
                    <div className="border-l border-[#222222] bg-[#111111] h-full overflow-hidden">
                        {codeViewState.previewContent || codeViewState.output ? (
                            <CodePreview
                                isRunning={codeViewState.isRunning}
                                previewContent={codeViewState.previewContent}
                                output={codeViewState.output}
                                isWebPreview={codeViewState.hasWebLanguages}
                            />
                        ) : (
                            <div className="preview-placeholder">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 4L18 8M18 8V18M18 8H8M6 20L10 16M10 16H20M10 16V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <p>Run your code to see the preview here.</p>
                                <p className="text-xs mt-2">For HTML/CSS/JavaScript/React, you will see a live preview. For other languages, you will see the console output.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Confirmation Dialog */}
            <ConfirmationDialog
                open={showNavigationConfirmation}
                title="What's the rush?"
                message="Our AI is still reviewing your answer and will be ready with a response soon. If you navigate away now, you will not see the complete response. Are you sure you want to leave?"
                confirmButtonText="Leave Anyway"
                cancelButtonText="Stay"
                onConfirm={handleNavigationConfirm}
                onCancel={handleNavigationCancel}
                type="custom"
            />
        </div>
    );
} 