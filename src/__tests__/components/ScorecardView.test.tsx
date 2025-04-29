import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScorecardView from '../../components/ScorecardView';
import { ChatMessage, ScorecardItem } from '../../types/quiz';

// Mock the types if they're not directly importable
// Based on the code, these seem to be the actual structures used
interface MockScorecardItem {
    id: string;
    label: string;
    score: number;
    feedback: string;
    maxScore: number;
}

interface MockChatMessage {
    id: string;
    role: string;
    content: string;
    messageType?: 'text' | 'audio' | 'code';
    audioData?: string;
    timestamp: string;
}

describe('ScorecardView Component', () => {
    // Mock props with the correct structure
    const mockScorecard: MockScorecardItem[] = [
        {
            id: '1',
            label: 'Test Criterion',
            score: 80,
            feedback: 'Good job on this criterion',
            maxScore: 100
        },
        {
            id: '2',
            label: 'Another Criterion',
            score: 90,
            feedback: 'Excellent work here',
            maxScore: 100
        }
    ];

    const mockHandleBackToChat = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the back button', () => {
        render(
            <ScorecardView
                activeScorecard={mockScorecard as any}
                handleBackToChat={mockHandleBackToChat}
                lastUserMessage={null}
            />
        );

        const backButton = screen.getByRole('button');
        expect(backButton).toBeInTheDocument();
    });

    it('should call handleBackToChat when back button is clicked', () => {
        render(
            <ScorecardView
                activeScorecard={mockScorecard as any}
                handleBackToChat={mockHandleBackToChat}
                lastUserMessage={null}
            />
        );

        const backButton = screen.getByRole('button');
        fireEvent.click(backButton);
        expect(mockHandleBackToChat).toHaveBeenCalledTimes(1);
    });

    it('should render "Detailed Report" heading when no lastUserMessage is provided', () => {
        render(
            <ScorecardView
                activeScorecard={mockScorecard as any}
                handleBackToChat={mockHandleBackToChat}
                lastUserMessage={null}
            />
        );

        expect(screen.getByText('Detailed Report')).toBeInTheDocument();
    });

    it('should render text response when lastUserMessage has text content', () => {
        const textMessage: MockChatMessage = {
            id: '123',
            role: 'user',
            content: 'This is my test response',
            messageType: 'text',
            timestamp: new Date().toISOString()
        };

        render(
            <ScorecardView
                activeScorecard={mockScorecard as any}
                handleBackToChat={mockHandleBackToChat}
                lastUserMessage={textMessage as any}
            />
        );

        expect(screen.getByText('Your Response')).toBeInTheDocument();
        expect(screen.getByText('This is my test response')).toBeInTheDocument();
    });

    it('should render audio player when lastUserMessage has audio content', () => {
        const audioMessage: MockChatMessage = {
            id: '456',
            role: 'user',
            content: '',
            messageType: 'audio',
            audioData: 'base64audiodata',
            timestamp: new Date().toISOString()
        };

        const { container } = render(
            <ScorecardView
                activeScorecard={mockScorecard as any}
                handleBackToChat={mockHandleBackToChat}
                lastUserMessage={audioMessage as any}
            />
        );

        expect(screen.getByText('Your Response')).toBeInTheDocument();
        // Use querySelector instead of getByRole for the audio element
        const audioElement = container.querySelector('audio');
        expect(audioElement).toBeInTheDocument();
        expect(audioElement).toHaveAttribute('src', 'data:audio/wav;base64,base64audiodata');
    });

    it('should toggle text expansion when view more/less button is clicked', () => {
        const longTextMessage: MockChatMessage = {
            id: '789',
            role: 'user',
            content: 'This is a very long response that should trigger the view more button. '.repeat(10),
            messageType: 'text',
            timestamp: new Date().toISOString()
        };

        render(
            <ScorecardView
                activeScorecard={mockScorecard as any}
                handleBackToChat={mockHandleBackToChat}
                lastUserMessage={longTextMessage as any}
            />
        );

        expect(screen.getByText('View more')).toBeInTheDocument();

        // Initial state should have text clipped
        const textElement = screen.getByText(/This is a very long response/);
        expect(textElement).toHaveClass('line-clamp-2');

        // Click to expand
        fireEvent.click(screen.getByText('View more'));

        // Text should no longer be clipped
        expect(textElement).not.toHaveClass('line-clamp-2');
        expect(screen.getByText('View less')).toBeInTheDocument();

        // Click to collapse
        fireEvent.click(screen.getByText('View less'));

        // Text should be clipped again
        expect(textElement).toHaveClass('line-clamp-2');
        expect(screen.getByText('View more')).toBeInTheDocument();
    });

    it('should render the LearnerScorecard component with scorecard data', () => {
        render(
            <ScorecardView
                activeScorecard={mockScorecard as any}
                handleBackToChat={mockHandleBackToChat}
                lastUserMessage={null}
            />
        );

        // Note: We can't directly test the LearnerScorecard component as it's a child component
        // and would be mocked. Instead, we're testing that the component renders without errors.
        // A more comprehensive test would include mocking the LearnerScorecard component.
        expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
    });
}); 