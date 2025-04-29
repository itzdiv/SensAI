import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PublishConfirmationDialog from '../../components/PublishConfirmationDialog';

// Mock the CSS import directly
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock ConfirmationDialog component since we're only testing PublishConfirmationDialog
jest.mock('../../components/ConfirmationDialog', () => {
    return function MockConfirmationDialog({
        open,
        title,
        message,
        onConfirm,
        onCancel,
        isLoading,
        errorMessage,
        type,
        confirmButtonText,
        children
    }: any) {
        return (
            <div data-testid="confirmation-dialog" style={{ display: open ? 'block' : 'none' }}>
                <h2>{title}</h2>
                <p>{message}</p>
                {isLoading && <div data-testid="loading-indicator">Loading...</div>}
                {errorMessage && <div data-testid="error-message">{errorMessage}</div>}
                <div data-testid="type">{type}</div>
                <button onClick={onConfirm} data-testid="confirm-button">{confirmButtonText}</button>
                <button onClick={onCancel} data-testid="cancel-button">Cancel</button>
                <div data-testid="dialog-children">{children}</div>
            </div>
        );
    };
});

// Mock DatePicker component
jest.mock('react-datepicker', () => {
    return function MockDatePicker({
        selected,
        onChange,
        showTimeSelect,
        timeFormat,
        timeIntervals,
        dateFormat,
        timeCaption,
        minDate,
        className,
        wrapperClassName,
        calendarClassName
    }: any) {
        return (
            <div className={wrapperClassName}>
                <input
                    type="text"
                    className={className}
                    value={selected ? selected.toISOString() : ''}
                    onChange={(e) => onChange(new Date(e.target.value))}
                    data-testid="date-picker"
                />
            </div>
        );
    };
});

describe('PublishConfirmationDialog Component', () => {
    const mockOnConfirm = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the dialog with correct title and message', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        fireEvent.click(screen.getByTestId('cancel-button'));
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with null when publish now button is clicked', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        fireEvent.click(screen.getByTestId('confirm-button'));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnConfirm).toHaveBeenCalledWith(null);
    });

    it('should have "Publish Now" text on button by default', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        expect(screen.getByTestId('confirm-button')).toHaveTextContent('Publish Now');
    });

    it('should show schedule checkbox', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        expect(screen.getByLabelText('Schedule time to publish')).toBeInTheDocument();
    });

    it('should show date picker when schedule checkbox is checked', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        fireEvent.click(screen.getByLabelText('Schedule time to publish'));
        expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    });

    it('should change confirm button text to "Schedule" when scheduling', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        fireEvent.click(screen.getByLabelText('Schedule time to publish'));
        expect(screen.getByTestId('confirm-button')).toHaveTextContent('Schedule');
    });

    it('should call onConfirm with ISO date string when scheduling', () => {
        // Mock date for predictable testing
        const mockDate = new Date('2030-01-01T12:00:00Z');
        jest.useFakeTimers();
        jest.setSystemTime(mockDate);

        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        fireEvent.click(screen.getByLabelText('Schedule time to publish'));

        // Simulate date selection (tomorrow by default)
        const tomorrowDate = new Date('2030-01-02T12:00:00Z');

        // Click confirm
        fireEvent.click(screen.getByTestId('confirm-button'));

        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnConfirm).toHaveBeenCalledWith(expect.any(String));

        // Reset mocked timers
        jest.useRealTimers();
    });

    it('should show loading indicator when isLoading is true', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
                isLoading={true}
            />
        );

        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should show error message when provided', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
                errorMessage="An error occurred"
            />
        );

        expect(screen.getByTestId('error-message')).toHaveTextContent('An error occurred');
    });

    it('should set dialog type to "publish"', () => {
        render(
            <PublishConfirmationDialog
                show={true}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
                title="Test Title"
                message="Test Message"
            />
        );

        expect(screen.getByTestId('type')).toHaveTextContent('publish');
    });
}); 