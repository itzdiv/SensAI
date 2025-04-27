import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPlaceholderView from '../../components/ChatPlaceholderView';

describe('ChatPlaceholderView Component', () => {
    // Common props for testing
    const baseProps = {
        taskType: 'quiz' as const,
        isChatHistoryLoaded: true,
        isTestMode: false,
        inputType: 'text',

    };

    it('should render a loading spinner when chat history is not loaded', () => {
        render(
            <ChatPlaceholderView
                {...baseProps}
                isChatHistoryLoaded={false}
            />
        );

        // Check for spinner
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('should render quiz placeholder text when taskType is quiz', () => {
        render(<ChatPlaceholderView {...baseProps} />);

        expect(screen.getByText('Ready for a challenge?')).toBeInTheDocument();
        expect(screen.getByText(/Think through your answer, then type it here/)).toBeInTheDocument();
    });

    // it('should render exam placeholder text when taskType is exam', () => {
    //     render(
    //         <ChatPlaceholderView
    //             {...baseProps}
    //             taskType="exam"
    //         />
    //     );

    //     expect(screen.getByText('Ready to test your knowledge?')).toBeInTheDocument();
    //     expect(screen.getByText(/You can attempt the question only once/)).toBeInTheDocument();
    // });

    it('should use correct wording for audio input type', () => {
        render(
            <ChatPlaceholderView
                {...baseProps}
                inputType="audio"
            />
        );

        expect(screen.getByText(/Think through your answer, then record it here/)).toBeInTheDocument();
    });

    it('should show different message for coding question type in quiz mode', () => {
        render(
            <ChatPlaceholderView
                {...baseProps}
                inputType="code"
            />
        );

        expect(screen.getByText(/Think through your answer, then write your code in the code editor/)).toBeInTheDocument();
        expect(screen.getByText(/You can also type your response below/)).toBeInTheDocument();
    });

    it('should show different message for coding question type in exam mode', () => {
        render(
            <ChatPlaceholderView
                {...baseProps}
                inputType="code"
                responseType="exam"
            />
        );

        expect(screen.getByText(/Think through your answer, then write your code in the code editor/)).toBeInTheDocument();
        expect(screen.getByText(/You can attempt the question only once/)).toBeInTheDocument();
    });

    it('should show view-only message when viewOnly is true', () => {
        render(
            <ChatPlaceholderView
                {...baseProps}
                viewOnly={true}
            />
        );

        expect(screen.getByText('No activity yet')).toBeInTheDocument();
        expect(screen.getByText('There is no chat history for this quiz')).toBeInTheDocument();
    });
}); 