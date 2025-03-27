import { CriterionData, ScorecardTemplate } from "../components/ScorecardPickerDialog";

export interface QuizEditorHandle {
    save: () => Promise<void>;
    cancel: () => void;
    hasContent: () => boolean;
    hasQuestionContent: () => boolean;
    getCurrentQuestionType: () => 'objective' | 'subjective' | 'coding';
    hasCorrectAnswer: () => boolean;
    hasScorecard: () => boolean;
    setActiveTab: (tab: 'question' | 'answer' | 'scorecard') => void;
}

export interface QuizQuestionConfig {
    inputType: 'text' | 'code' | 'audio';
    responseType: 'chat' | 'report';
    evaluationCriteria: string[];
    correctAnswer?: string;
    correctAnswerBlocks?: any[];
    codeLanguage?: string; // For code input type
    audioMaxDuration?: number; // For audio input type in seconds
    questionType: 'objective' | 'subjective' | 'coding';
    scorecardData?: ScorecardTemplate;
}

export interface QuizQuestion {
    id: string;
    content: any[];
    config: QuizQuestionConfig;
}

export interface QuizEditorProps {
    initialQuestions?: QuizQuestion[]; // Kept for backward compatibility but not used anymore
    onChange?: (questions: QuizQuestion[]) => void;
    isDarkMode?: boolean;
    className?: string;
    isPreviewMode?: boolean;
    readOnly?: boolean;
    onPublish?: () => void;
    taskId?: string;
    status?: string;
    onPublishSuccess?: (updatedData?: any) => void;
    showPublishConfirmation?: boolean;
    onPublishCancel?: () => void;
    isEditMode?: boolean;
    onSaveSuccess?: (updatedData?: any) => void;
    taskType?: 'quiz' | 'exam';
    currentQuestionId?: string;
    onQuestionChange?: (questionId: string) => void;
    onSubmitAnswer?: (questionId: string, answer: string) => void;
    userId?: string;
    schoolId?: string; // ID of the school for fetching school-specific scorecards
}

export interface ScorecardCriterion {
    name: string;
    description: string;
    min_score: number;
    max_score: number;
}

// Define the API response question interface
export interface APIQuestionResponse {
    id: number;
    blocks: any[];
    answer?: string;
    type: string;
    input_type: string;
    response_type: string;
    scorecard_id?: number;
    scorecard?: {
        id: number;
        title: string;
        criteria: {
            id: number;
            name: string;
            description: string;
            min_score: number;
            max_score: number;
        }[];
    };
} 


// Define a message type for the chat history
export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    messageType?: 'text' | 'audio';
    audioData?: string; // base64 encoded audio data
    scorecard?: ScorecardItem[]; // Add scorecard field for detailed feedback
}   


// Define scorecard item structure
export interface ScorecardItem {
    category: string;
    feedback: {
        correct: string;
        wrong: string;
    };
    score: number;
    max_score: number;
}

export interface AIResponse {
    feedback: string;
    is_correct: boolean;
    scorecard?: ScorecardItem[];
}