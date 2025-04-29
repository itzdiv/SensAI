import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CourseCohortSelectionDialog } from '../../components/CourseCohortSelectionDialog';

// Mock the CreateCohortDialog component
jest.mock('../../components/CreateCohortDialog', () => {
    return function MockCreateCohortDialog() {
        return <div data-testid="create-cohort-dialog">Create Cohort Dialog Mock</div>;
    };
});

// Mock Next.js Link component
jest.mock('next/link', () => {
    return function MockLink({ children, href }: { children: React.ReactNode, href: string }) {
        return <a href={href}>{children}</a>;
    };
});

describe('CourseCohortSelectionDialog Component', () => {
    // Common props for testing
    const mockCohorts = [
        { id: 1, name: 'Cohort 1' },
        { id: 2, name: 'Cohort 2' },
        { id: 3, name: 'Cohort 3' }
    ];

    const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        originButtonRef: { current: document.createElement('button') },
        isPublishing: false,
        onConfirm: jest.fn(),
        showLoading: false,
        hasError: false,
        errorMessage: '',
        onRetry: jest.fn(),
        cohorts: mockCohorts,
        tempSelectedCohorts: [],
        onRemoveCohort: jest.fn(),
        onSelectCohort: jest.fn(),
        onSearchChange: jest.fn(),
        searchQuery: '',
        filteredCohorts: mockCohorts,
        totalSchoolCohorts: 3,
        schoolId: 'school1',
        onOpenCreateCohortDialog: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly when open', () => {
        render(<CourseCohortSelectionDialog {...defaultProps} />);

        // Check if the dialog is rendered
        expect(screen.getByPlaceholderText('Search cohorts')).toBeInTheDocument();

        // Check if cohorts are displayed
        expect(screen.getByText('Cohort 1')).toBeInTheDocument();
        expect(screen.getByText('Cohort 2')).toBeInTheDocument();
        expect(screen.getByText('Cohort 3')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<CourseCohortSelectionDialog {...defaultProps} isOpen={false} />);

        // Dialog should not be rendered
        expect(screen.queryByPlaceholderText('Search cohorts')).not.toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
        render(<CourseCohortSelectionDialog {...defaultProps} showLoading={true} />);

        // Loading spinner should be visible - look for the div with spinner classes
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

        // Search box should not be visible when loading
        expect(screen.queryByPlaceholderText('Search cohorts')).not.toBeInTheDocument();
    });

    it('displays error state correctly', () => {
        render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                hasError={true}
                errorMessage="An error occurred"
            />
        );

        // Error message should be visible
        expect(screen.getByText('An error occurred')).toBeInTheDocument();

        // Retry button should be visible
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    it('calls onSelectCohort when a cohort is clicked', () => {
        render(<CourseCohortSelectionDialog {...defaultProps} />);

        // Click on the first cohort
        fireEvent.click(screen.getByText('Cohort 1'));

        // onSelectCohort should be called with the cohort
        expect(defaultProps.onSelectCohort).toHaveBeenCalledWith(mockCohorts[0]);
    });

    it('displays selected cohorts correctly', () => {
        const selectedCohorts = [mockCohorts[0]]; // Cohort 1 is selected

        render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                tempSelectedCohorts={selectedCohorts}
            />
        );

        // Selected cohort should be displayed in the selected cohorts section
        const selectedCohortElement = screen.getAllByText('Cohort 1')[0];
        expect(selectedCohortElement).toBeInTheDocument();

        // Selected cohort should have a remove button
        const removeButton = selectedCohortElement.parentElement?.querySelector('button');
        expect(removeButton).toBeInTheDocument();
    });

    it('calls onRemoveCohort when remove button is clicked', () => {
        const selectedCohorts = [mockCohorts[0]]; // Cohort 1 is selected

        render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                tempSelectedCohorts={selectedCohorts}
            />
        );

        // Find and click the remove button
        const removeButton = screen.getByRole('button', { name: '' });
        fireEvent.click(removeButton);

        // onRemoveCohort should be called with the cohort id
        expect(defaultProps.onRemoveCohort).toHaveBeenCalledWith(1);
    });

    it('calls onSearchChange when search input changes', () => {
        render(<CourseCohortSelectionDialog {...defaultProps} />);

        // Change the search input
        const searchInput = screen.getByPlaceholderText('Search cohorts');
        fireEvent.change(searchInput, { target: { value: 'Cohort 1' } });

        // onSearchChange should be called
        expect(defaultProps.onSearchChange).toHaveBeenCalled();
    });

    it('filters cohorts based on searchQuery', () => {
        const filteredCohorts = [mockCohorts[0]]; // Only Cohort 1 matches the search

        render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                searchQuery="Cohort 1"
                filteredCohorts={filteredCohorts}
            />
        );

        // Cohort 1 should be visible
        expect(screen.getByText('Cohort 1')).toBeInTheDocument();

        // Cohort 2 and 3 should not be visible
        expect(screen.queryByText('Cohort 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Cohort 3')).not.toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', () => {
        const selectedCohorts = [mockCohorts[0]]; // Cohort 1 is selected

        render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                tempSelectedCohorts={selectedCohorts}
            />
        );

        // Find and click the confirm button
        const confirmButton = screen.getByText('Add course to cohorts');
        fireEvent.click(confirmButton);

        // onConfirm should be called
        expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it('shows different button text when publishing', () => {
        render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                isPublishing={true}
            />
        );

        // Button text should indicate publishing
        expect(screen.getByText('Publish course to cohorts')).toBeInTheDocument();
    });

    it('shows loading text when action is in progress', () => {
        // Test for adding
        const { unmount } = render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                showLoading={true}
            />
        );

        expect(screen.getByText('Adding...')).toBeInTheDocument();

        // Clean up and test for publishing
        unmount();

        render(
            <CourseCohortSelectionDialog
                {...defaultProps}
                isPublishing={true}
                showLoading={true}
            />
        );

        expect(screen.getByText('Publishing...')).toBeInTheDocument();
    });

    it('calls onOpenCreateCohortDialog when "Create New Cohort" is clicked', () => {
        // Render with no available cohorts to show the "Create New Cohort" button
        render(<CourseCohortSelectionDialog
            {...defaultProps}
            cohorts={[]}
            filteredCohorts={[]}
            totalSchoolCohorts={0}
        />);

        // Find and click the "Create New Cohort" button
        const createButton = screen.getByText('Create Cohort');
        fireEvent.click(createButton);

        // onOpenCreateCohortDialog should be called
        expect(defaultProps.onOpenCreateCohortDialog).toHaveBeenCalled();
    });
}); 