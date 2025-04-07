import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toast from '../../components/Toast';

describe('Toast Component', () => {
    const mockOnClose = jest.fn();
    const defaultProps = {
        show: true,
        title: 'Test Title',
        description: 'Test Description',
        emoji: '🎉',
        onClose: mockOnClose,
    };

    it('should render correctly with default props', () => {
        render(<Toast {...defaultProps} />);

        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('🎉')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
        render(<Toast {...defaultProps} show={false} />);

        expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
        render(<Toast {...defaultProps} />);

        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should apply mobile view styles when isMobileView is true', () => {
        render(<Toast {...defaultProps} isMobileView={true} />);

        const toastDiv = screen.getByText('Test Title').closest('div')?.parentElement;
        expect(toastDiv).toHaveClass('top-0');
        expect(toastDiv).toHaveClass('left-0');
        expect(toastDiv).toHaveClass('right-0');
        expect(toastDiv).toHaveClass('w-full');
        expect(toastDiv).toHaveClass('rounded-none');
    });

    it('should apply desktop view styles when isMobileView is false', () => {
        render(<Toast {...defaultProps} isMobileView={false} />);

        const toastDiv = screen.getByText('Test Title').closest('div')?.parentElement;
        expect(toastDiv).toHaveClass('bottom-4');
        expect(toastDiv).toHaveClass('right-4');
        expect(toastDiv).toHaveClass('rounded-lg');
        expect(toastDiv).toHaveClass('max-w-md');
    });
}); 