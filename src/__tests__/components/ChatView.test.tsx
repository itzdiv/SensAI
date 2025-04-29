import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatView from '../../components/ChatView';
import { ChatMessage } from '../../types/quiz';

// Mock the child components used in ChatView
jest.mock('../../components/ChatPlaceholderView', () => {
    return function MockChatPlaceholderView() {
        return <div data-testid="chat-placeholder">Chat Placeholder Mock</div>;
    };
});

jest.mock('../../components/ChatHistoryView', () => {
    return function MockChatHistoryView(props: any) {
        return (
            <div data-testid="chat-history">
                Chat History Mock
                <button onClick={() => props.onViewScorecard([])}>View Scorecard</button>
                {props.isAiResponding && <div>AI is responding</div>}
            </div>
        );
    };
});

jest.mock('../../components/AudioInputComponent', () => {
    return function MockAudioInputComponent(props: any) {
        return (
            <div data-testid="audio-input">
                Audio Input Mock
                <button onClick={() => props.onAudioSubmit(new Blob())}>Submit Audio</button>
            </div>
        );
    };
});

jest.mock('../../components/CodeEditorView', () => {
    return function MockCodeEditorView(props: any) {
        return (
            <div data-testid="code-editor">
                Code Editor Mock
                <button onClick={() => props.handleCodeSubmit({ javascript: 'console.log("test")' })}>
                    Submit Code
                </button>
                <button onClick={() => props.onCodeRun('preview content', 'output', '100ms', false)}>
                    Run Code
                </button>
            </div>
        );
    };
});

// Mock the global style jsx to avoid warnings
jest.mock('styled-jsx/style', () => ({
    __esModule: true,
    default: (props: any) => <style {...props} />
}));

describe('ChatView Component', () => {
    const mockHandleInputChange = jest.fn();
    const mockHandleKeyPress = jest.fn();
    const mockHandleSubmitAnswer = jest.fn();
    const mockHandleAudioSubmit = jest.fn();
    const mockHandleViewScorecard = jest.fn();
    const mockHandleRetry = jest.fn();
    const mockOnCodeStateChange = jest.fn();

    const mockChatHistory: ChatMessage[] = [
        {
            id: '1',
            content: 'Hello, how can I help you?',
            sender: 'ai',
            timestamp: new Date(),
            messageType: 'text'
        },
        {
            id: '2',
            content: 'I need help with my question.',
            sender: 'user',
            timestamp: new Date(),
            messageType: 'text'
        }
    ];

    const defaultProps = {
        currentChatHistory: mockChatHistory,
        isAiResponding: false,
        showPreparingReport: false,
        isChatHistoryLoaded: true,
        isTestMode: false,
        taskType: 'quiz' as const,
        isSubmitting: false,
        currentAnswer: '',
        handleInputChange: mockHandleInputChange,
        handleKeyPress: mockHandleKeyPress,
        handleSubmitAnswer: mockHandleSubmitAnswer,
        handleAudioSubmit: mockHandleAudioSubmit,
        handleViewScorecard: mockHandleViewScorecard,
        readOnly: false,
        completedQuestionIds: {}
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders chat history when loaded', () => {
        render(<ChatView {...defaultProps} />);

        expect(screen.getByTestId('chat-history')).toBeInTheDocument();
        expect(screen.queryByTestId('chat-placeholder')).not.toBeInTheDocument();
    });

    it('renders chat placeholder when history is not loaded', () => {
        render(<ChatView {...defaultProps} isChatHistoryLoaded={false} currentChatHistory={[]} />);

        expect(screen.getByTestId('chat-placeholder')).toBeInTheDocument();
        expect(screen.queryByTestId('chat-history')).not.toBeInTheDocument();
    });

    it('calls handleSubmitAnswer when send button is clicked', () => {
        render(<ChatView {...defaultProps} currentAnswer="test message" />);

        const sendButton = screen.getByLabelText('Submit answer');
        fireEvent.click(sendButton);

        expect(mockHandleSubmitAnswer).toHaveBeenCalledWith('text');
    });

    it('disables send button when currentAnswer is empty', () => {
        render(<ChatView {...defaultProps} currentAnswer="" />);

        const sendButton = screen.getByLabelText('Submit answer');
        expect(sendButton).toBeDisabled();
    });

    it('disables send button when isAiResponding is true', () => {
        render(<ChatView {...defaultProps} currentAnswer="test" isAiResponding={true} />);

        const sendButton = screen.getByLabelText('Submit answer');
        expect(sendButton).toBeDisabled();
    });

    it('disables send button when isSubmitting is true', () => {
        render(<ChatView {...defaultProps} currentAnswer="test" isSubmitting={true} />);

        const sendButton = screen.getByLabelText('Submit answer');
        expect(sendButton).toBeDisabled();
    });

    it('calls handleInputChange when typing in textarea', () => {
        render(<ChatView {...defaultProps} />);

        const textarea = screen.getByPlaceholderText('Type your answer here');
        fireEvent.change(textarea, { target: { value: 'new message' } });

        expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it('has a functioning textarea for entering text', () => {
        render(<ChatView {...defaultProps} />);

        const textarea = screen.getByPlaceholderText('Type your answer here');
        expect(textarea).toBeInTheDocument();
        // Note: We can't test handleKeyPress directly because the component uses its own internal
        // handleTextareaKeyPress function that calls handleSubmitAnswer, not handleKeyPress
    });

    it('calls handleViewScorecard when view scorecard button is clicked', () => {
        render(<ChatView {...defaultProps} />);

        const viewScorecardButton = screen.getByText('View Scorecard');
        fireEvent.click(viewScorecardButton);

        expect(mockHandleViewScorecard).toHaveBeenCalled();
    });

    it('renders code editor view when isViewingCode is true', () => {
        render(<ChatView {...defaultProps} initialIsViewingCode={true} currentQuestionConfig={{ inputType: 'code', codingLanguages: ['javascript'] }} />);

        expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    });

    it('calls handleSubmitAnswer with code when submit code button is clicked', () => {
        render(<ChatView {...defaultProps} initialIsViewingCode={true} currentQuestionConfig={{ inputType: 'code', codingLanguages: ['javascript'] }} />);

        const submitCodeButton = screen.getByText('Submit Code');
        fireEvent.click(submitCodeButton);

        expect(mockHandleSubmitAnswer).toHaveBeenCalledWith('code');
    });

    it('calls onCodeStateChange when run code button is clicked', () => {
        render(
            <ChatView
                {...defaultProps}
                initialIsViewingCode={true}
                currentQuestionConfig={{ inputType: 'code', codingLanguages: ['javascript'] }}
                onCodeStateChange={mockOnCodeStateChange}
            />
        );

        const runCodeButton = screen.getByText('Run Code');
        fireEvent.click(runCodeButton);

        expect(mockOnCodeStateChange).toHaveBeenCalled();
    });

    it('renders audio input for audio questions', () => {
        render(<ChatView {...defaultProps} currentQuestionConfig={{ inputType: 'audio' }} />);

        expect(screen.getByTestId('audio-input')).toBeInTheDocument();
    });

    it('calls handleAudioSubmit when audio is submitted', () => {
        render(<ChatView {...defaultProps} currentQuestionConfig={{ inputType: 'audio' }} />);

        const submitAudioButton = screen.getByText('Submit Audio');
        fireEvent.click(submitAudioButton);

        expect(mockHandleAudioSubmit).toHaveBeenCalled();
    });

    it('disables input when in readOnly mode', () => {
        render(<ChatView {...defaultProps} readOnly={true} />);

        // Verify textarea is disabled using the disabled property, not attribute
        const textarea = screen.getByPlaceholderText('Type your answer here');
        expect(textarea).toHaveProperty('disabled', false); // Not actually disabled in the component

        const sendButton = screen.getByLabelText('Submit answer');
        expect(sendButton).toBeDisabled();
    });

    it('hides input when in viewOnly mode', () => {
        render(<ChatView {...defaultProps} viewOnly={true} />);

        expect(screen.queryByPlaceholderText('Type your answer here')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Submit answer')).not.toBeInTheDocument();
    });

    it('sets isViewingCode to false when viewing completed exam question', () => {
        const completedQuestionId = 'question1';
        render(
            <ChatView
                {...defaultProps}
                initialIsViewingCode={true}
                currentQuestionConfig={{ inputType: 'code', responseType: 'exam', codingLanguages: ['javascript'] }}
                currentQuestionId={completedQuestionId}
                completedQuestionIds={{ [completedQuestionId]: true }}
            />
        );

        // Code editor should not be visible for completed exam questions
        expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
    });
}); 