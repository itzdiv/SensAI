import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmationDialog from '../../components/ConfirmationDialog';

describe('ConfirmationDialog Component', () => {
    // Mock functions for callbacks
    const mockOnConfirm = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    it('should not render when not visible', () => {
        const { container } = render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={false}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render with default delete props when open is true', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
            />
        );

        expect(screen.getByText('Confirm deletion')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete this item? This action cannot be undone.')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render with default publish props when type is publish', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
                type="publish"
            />
        );

        expect(screen.getByText('Ready to publish?')).toBeInTheDocument();
        expect(screen.getByText('Make sure your content is complete and reviewed for errors before publishing')).toBeInTheDocument();
        expect(screen.getByText('Publish Now')).toBeInTheDocument();
    });

    it('should use custom title, message and button text when provided', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
                title="Custom Title"
                message="Custom Message"
                confirmButtonText="Custom Confirm"
                cancelButtonText="Custom Cancel"
            />
        );

        expect(screen.getByText('Custom Title')).toBeInTheDocument();
        expect(screen.getByText('Custom Message')).toBeInTheDocument();
        expect(screen.getByText('Custom Confirm')).toBeInTheDocument();
        expect(screen.getByText('Custom Cancel')).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
                isLoading={true}
            />
        );

        // Check for spinner element (div with animate-spin class)
        const spinner = screen.getByText('Delete').parentElement?.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();

        // Confirm button should be disabled
        const confirmButton = screen.getByText('Delete').closest('button');
        expect(confirmButton).toHaveClass('opacity-70');
        expect(confirmButton).toBeDisabled();
    });

    it('should display error message when provided', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
                errorMessage="Something went wrong"
            />
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Something went wrong')).toHaveClass('text-red-400');
    });

    it('should call onConfirm when confirm button is clicked', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
            />
        );

        fireEvent.click(screen.getByText('Delete'));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
            />
        );

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when backdrop is clicked', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                open={true}
            />
        );

        // Click on the backdrop (the fixed div)
        fireEvent.click(screen.getByText('Confirm deletion').parentElement?.parentElement?.parentElement!);
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should work with show prop instead of open prop', () => {
        render(
            <ConfirmationDialog
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                show={true}
            />
        );

        expect(screen.getByText('Confirm deletion')).toBeInTheDocument();
    });
}); 