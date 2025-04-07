import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateQuizDialog from '../../components/CreateQuizDialog';

describe('CreateQuizDialog Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console.log to avoid logs in tests
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should render dialog when open is true', () => {
        render(<CreateQuizDialog open={true} onClose={mockOnClose} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Minimal Dialog')).toBeInTheDocument();
    });

    it('should set open attribute on dialog element', () => {
        render(<CreateQuizDialog open={true} onClose={mockOnClose} />);

        const dialogElement = screen.getByRole('dialog');
        expect(dialogElement).toHaveAttribute('open');
    });

    it('should log a message when rendered', () => {
        // Restore the mock to see if the component logs
        console.log = jest.fn();

        render(<CreateQuizDialog open={true} onClose={mockOnClose} />);

        expect(console.log).toHaveBeenCalledWith('Minimal CreateQuizDialog Rendered');
    });
}); 