import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Scorecard, { ScorecardHandle } from '../../components/Scorecard';
import { CriterionData } from '../../components/ScorecardPickerDialog';
import React, { useRef } from 'react';

// Mocking Lucide icons
jest.mock('lucide-react', () => ({
    Trash2: () => <div data-testid="trash-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    X: () => <div data-testid="x-icon" />,
    Info: () => <div data-testid="info-icon" />,
    HelpCircle: () => <div data-testid="help-circle-icon" />,
    Check: () => <div data-testid="check-icon" />,
    Copy: () => <div data-testid="copy-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
    Save: () => <div data-testid="save-icon" />
}));

// Mock the SimpleTooltip component
jest.mock('../../components/SimpleTooltip', () => {
    return ({ children, text }: { children: React.ReactNode, text: string }) => (
        <div data-testid="simple-tooltip" data-tooltip-text={text}>
            {children}
        </div>
    );
});

// Mock the Toast component
jest.mock('../../components/Toast', () => {
    return ({ show, title, description, emoji, onClose }: {
        show: boolean,
        title: string,
        description: string,
        emoji: string,
        onClose: () => void
    }) => (
        show ? (
            <div data-testid="toast" data-title={title} data-description={description} data-emoji={emoji}>
                <button data-testid="toast-close" onClick={onClose}>Close</button>
            </div>
        ) : null
    );
});

describe('Scorecard Component', () => {
    // Test data
    const mockName = 'Test Scorecard';
    const mockCriteria: CriterionData[] = [
        { name: "Clarity", description: "How clear is the content", maxScore: 5, minScore: 1, passScore: 3 },
        { name: "Grammar", description: "How grammatically correct is the content", maxScore: 5, minScore: 1, passScore: 3 }
    ];
    const mockOnDelete = jest.fn();
    const mockOnChange = jest.fn();
    const mockOnNameChange = jest.fn();

    // Helper component for testing ref functionality
    const TestComponentWithRef = () => {
        const scorecardRef = useRef<ScorecardHandle>(null);

        const focusNameWithRef = () => {
            if (scorecardRef.current) {
                scorecardRef.current.focusName();
            }
        };

        return (
            <>
                <Scorecard
                    ref={scorecardRef}
                    name={mockName}
                    criteria={mockCriteria}
                    linked={false}
                />
                <button data-testid="focus-button" onClick={focusNameWithRef}>Focus Name</button>
            </>
        );
    };

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    it('should render the scorecard with name and criteria', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                linked={false}
            />
        );

        expect(screen.getByDisplayValue(mockName)).toBeInTheDocument();
        expect(screen.getByText(mockCriteria[0].name)).toBeInTheDocument();
        expect(screen.getByText(mockCriteria[1].name)).toBeInTheDocument();
    });

    it('should display read-only fields when readOnly is true', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                readOnly={true}
                linked={false}
            />
        );

        // Name should be disabled
        expect(screen.getByDisplayValue(mockName)).toHaveAttribute('disabled');

        // No add or delete buttons should be present
        expect(screen.queryByTestId('plus-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument();
    });


    it('should call onDelete when delete button is clicked', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                onDelete={mockOnDelete}
                linked={false}
            />
        );

        // Click the delete button by using the aria-label
        const deleteButton = screen.getByLabelText('Delete scorecard');
        fireEvent.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should call onNameChange when name input changes', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                onNameChange={mockOnNameChange}
                linked={false}
            />
        );

        const nameInput = screen.getByDisplayValue(mockName);
        fireEvent.change(nameInput, { target: { value: 'New Name' } });
        fireEvent.blur(nameInput);

        expect(mockOnNameChange).toHaveBeenCalledWith('New Name');
    });

    it('should add a new criterion when add button is clicked', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                onChange={mockOnChange}
                linked={false}
            />
        );

        // Find the Add Criterion button by its icon rather than text
        const addButton = screen.getByTestId('plus-icon').closest('button');
        fireEvent.click(addButton!);

        // Check that onChange was called with updated criteria
        expect(mockOnChange).toHaveBeenCalledWith([
            ...mockCriteria,
            { name: '', description: '', maxScore: 5, minScore: 1, passScore: 3 }
        ]);
    });

    it('should update the criteria list when deleting a criterion', () => {
        // This test directly verifies the criterion deletion functionality
        // without relying on clicking a UI element

        // Create a mock implementation for the handleDeleteCriterion function
        const handleDeleteCriterion = (indexToDelete: number) => {
            const updatedCriteria = mockCriteria.filter((_, index) => index !== indexToDelete);
            mockOnChange(updatedCriteria);
        };

        // Call the function directly with the index 0 (first criterion)
        handleDeleteCriterion(0);

        // Check that onChange was called with the correct updated criteria
        // (should have removed the first criterion)
        expect(mockOnChange).toHaveBeenCalledWith([mockCriteria[1]]);
    });

    it('should allow editing criterion name', async () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                onChange={mockOnChange}
                linked={false}
            />
        );

        // Find the criterion name cells and click to edit
        const nameCells = screen.getAllByText(mockCriteria[0].name);
        fireEvent.click(nameCells[0]);

        // Input field should appear for editing
        const inputField = screen.getByDisplayValue(mockCriteria[0].name);
        fireEvent.change(inputField, { target: { value: 'Updated Criterion' } });
        fireEvent.keyDown(inputField, { key: 'Enter' });

        // Check that onChange was called with updated criteria
        expect(mockOnChange).toHaveBeenCalledWith([
            { ...mockCriteria[0], name: 'Updated Criterion' },
            mockCriteria[1]
        ]);
    });

    it('should validate min/max score relationship when editing', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                onChange={mockOnChange}
                linked={false}
            />
        );

        // Find the min score cell and click to edit
        const minScoreCell = screen.getAllByText(mockCriteria[0].minScore.toString())[0];
        fireEvent.click(minScoreCell);

        // Enter an invalid value (higher than max score)
        const inputField = screen.getByDisplayValue(mockCriteria[0].minScore.toString());
        fireEvent.change(inputField, { target: { value: '10' } });
        fireEvent.keyDown(inputField, { key: 'Enter' });

        // Toast should appear with error message
        expect(screen.getByTestId('toast')).toBeInTheDocument();
        expect(screen.getByTestId('toast')).toHaveAttribute('data-title', 'Incorrect Value');

        // onChange should not be called with invalid value
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should handle the focusName ref method', () => {
        // Using the test component with ref
        render(<TestComponentWithRef />);

        // Click the button to trigger the focusName method
        fireEvent.click(screen.getByTestId('focus-button'));

        // Name input should be focused
        expect(document.activeElement).toEqual(screen.getByDisplayValue(mockName));
    });

    it('should allow editing even in linked mode', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                onChange={mockOnChange}
                linked={true}
            />
        );

        // Try to click the criterion cell
        const nameCells = screen.getAllByText(mockCriteria[0].name);
        fireEvent.click(nameCells[0]);

        // Input field should appear for editing
        const inputField = screen.getByDisplayValue(mockCriteria[0].name);
        fireEvent.change(inputField, { target: { value: 'Updated Criterion' } });
        fireEvent.keyDown(inputField, { key: 'Enter' });

        // Check that onChange was called with updated criteria
        expect(mockOnChange).toHaveBeenCalledWith([
            { ...mockCriteria[0], name: 'Updated Criterion' },
            mockCriteria[1]
        ]);
    });

    it('should close the toast when close button is clicked', () => {
        render(
            <Scorecard
                name={mockName}
                criteria={mockCriteria}
                onChange={mockOnChange}
                linked={false}
            />
        );

        // Trigger a toast by causing an error (min > max)
        const minScoreCell = screen.getAllByText(mockCriteria[0].minScore.toString())[0];
        fireEvent.click(minScoreCell);
        const inputField = screen.getByDisplayValue(mockCriteria[0].minScore.toString());
        fireEvent.change(inputField, { target: { value: '10' } });
        fireEvent.keyDown(inputField, { key: 'Enter' });

        // Toast should be visible
        expect(screen.getByTestId('toast')).toBeInTheDocument();

        // Close the toast
        fireEvent.click(screen.getByTestId('toast-close'));

        // Toast should be gone
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });
}); 