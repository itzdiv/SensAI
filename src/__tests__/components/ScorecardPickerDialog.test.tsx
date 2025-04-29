import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScorecardPickerDialog, { ScorecardTemplate } from '../../components/ScorecardPickerDialog';
import React from 'react';

// Mocking Lucide icons
jest.mock('lucide-react', () => ({
    X: () => <div data-testid="x-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    Check: () => <div data-testid="check-icon" />,
    FileText: () => <div data-testid="file-text-icon" />,
    Mic: () => <div data-testid="mic-icon" />
}));

describe('ScorecardPickerDialog Component', () => {
    // Test data
    const mockOnClose = jest.fn();
    const mockOnCreateNew = jest.fn();
    const mockOnSelectTemplate = jest.fn();

    const mockSchoolScorecards: ScorecardTemplate[] = [
        {
            id: 'school-scorecard-1',
            name: 'School Scorecard 1',
            criteria: [
                { name: "Test Criterion", description: "Test description", maxScore: 5, minScore: 1 }
            ],
            new: false
        },
        {
            id: 'school-scorecard-2',
            name: 'School Scorecard 2',
            criteria: [
                { name: "Another Criterion", description: "Another description", maxScore: 10, minScore: 0 }
            ],
            new: true
        }
    ];

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    it('should not render when isOpen is false', () => {
        const { container } = render(
            <ScorecardPickerDialog
                isOpen={false}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
            />
        );

        // Instead of looking for role='dialog', check for dialog content
        expect(screen.getByText('New scorecard')).toBeInTheDocument();
        expect(screen.getByText('New empty scorecard')).toBeInTheDocument();
        expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    it('should show "Your Scorecards" and "Templates" tabs when school scorecards are provided', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
                schoolScorecards={mockSchoolScorecards}
            />
        );

        expect(screen.getByText('Your Scorecards')).toBeInTheDocument();
        expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    it('should not show tabs when no school scorecards are provided', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
                schoolScorecards={[]}
            />
        );

        expect(screen.queryByText('Your Scorecards')).not.toBeInTheDocument();
    });

    it('should display school scorecards when "Your Scorecards" tab is active', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
                schoolScorecards={mockSchoolScorecards}
            />
        );

        // "Your Scorecards" tab should be active by default when school scorecards are provided
        expect(screen.getByText('School Scorecard 1')).toBeInTheDocument();
        expect(screen.getByText('School Scorecard 2')).toBeInTheDocument();
    });

    it('should display standard templates when "Templates" tab is active', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
                schoolScorecards={mockSchoolScorecards}
            />
        );

        // Click on "Templates" tab
        fireEvent.click(screen.getByText('Templates'));

        // Should show standard templates
        expect(screen.getByText('Written Communication')).toBeInTheDocument();
        expect(screen.getByText('Interview Preparation')).toBeInTheDocument();
        expect(screen.getByText('Product Pitch')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
            />
        );

        // Click the close button
        fireEvent.click(screen.getByTestId('x-icon').closest('button')!);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onCreateNew when "Create New Rubric" button is clicked', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
            />
        );

        // Click the create new button
        fireEvent.click(screen.getByText('New empty scorecard'));

        expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectTemplate when a template is clicked', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
            />
        );

        // Click on the "Written Communication" template
        fireEvent.click(screen.getByText('Written Communication').closest('div')!);

        expect(mockOnSelectTemplate).toHaveBeenCalledTimes(1);
        expect(mockOnSelectTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'written-communication',
                name: 'Written Communication'
            })
        );
    });

    it('should position the dialog based on provided position prop', () => {
        const position = { top: 100, left: 200 };

        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
                position={position}
            />
        );

        // Find the container div instead of looking for role='dialog'
        const dialogContainer = screen.getByText('New scorecard').closest('div[style*="top"]');
        expect(dialogContainer).toHaveStyle(`top: ${position.top}px`);
        expect(dialogContainer).toHaveStyle(`left: ${position.left}px`);
    });

    it('should highlight newly created school scorecards', () => {
        render(
            <ScorecardPickerDialog
                isOpen={true}
                onClose={mockOnClose}
                onCreateNew={mockOnCreateNew}
                onSelectTemplate={mockOnSelectTemplate}
                schoolScorecards={mockSchoolScorecards}
            />
        );

        // Second scorecard is marked as "new"
        const scorecard2 = screen.getByText('School Scorecard 2').closest('div');
        expect(scorecard2).toContainElement(screen.getByText('NEW'));
        expect(screen.getByText('NEW')).toHaveClass('bg-green-700'); // Visual indicator for new scorecards
    });
}); 