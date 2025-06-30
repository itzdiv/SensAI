import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateCohortDialog from '../../components/CreateCohortDialog';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://test-api.example.com';

describe('CreateCohortDialog Component', () => {
    const mockOnClose = jest.fn();
    const mockOnCreateCohort = jest.fn();
    const mockSchoolId = '123';

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the fetch mock
        (global.fetch as jest.Mock).mockReset();
    });

    it('should not render anything when open is false', () => {
        const { container } = render(
            <CreateCohortDialog
                open={false}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('should render the dialog with input field when open is true', () => {
        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        expect(inputField).toBeInTheDocument();
        expect(screen.getByText(/A cohort is a group of learners/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create cohort/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should update cohort name when typing in input field', () => {
        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        fireEvent.change(inputField, { target: { value: 'Summer 2023' } });
        expect(inputField).toHaveValue('Summer 2023');
    });

    it('should call onClose when cancel button is clicked', () => {
        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show validation error when attempting to submit with empty cohort name', () => {
        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        // Try to submit with empty cohort name
        fireEvent.click(screen.getByRole('button', { name: /create cohort/i }));

        expect(screen.getByText('Cohort name is required')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call the API with correct data when submitting a valid cohort name', async () => {
        // Mock successful API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'new-cohort-id', name: 'Summer 2023' }),
        });

        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        // Enter cohort name
        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        fireEvent.change(inputField, { target: { value: 'Summer 2023' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /create cohort/i }));

        // Verify API call
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://test-api.example.com/cohorts/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: 'Summer 2023',
                        org_id: 123
                    }),
                }
            );
        });
    });

    it('should handle null schoolId gracefully', async () => {
        // Mock successful API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'new-cohort-id', name: 'Summer 2023' }),
        });

        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={undefined}
            />
        );

        // Enter cohort name
        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        fireEvent.change(inputField, { target: { value: 'Summer 2023' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /create cohort/i }));

        // Verify API call with null org_id
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://test-api.example.com/cohorts/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: 'Summer 2023',
                        org_id: null
                    }),
                }
            );
        });
    });

    it('should call onCreateCohort with response data after successful API response', async () => {
        const mockCohortData = {
            id: 'new-cohort-id',
            name: 'Summer 2023',
            created_at: '2023-05-15T10:00:00Z'
        };

        // Mock successful API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockCohortData,
        });

        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        // Enter cohort name
        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        fireEvent.change(inputField, { target: { value: 'Summer 2023' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /create cohort/i }));

        // Verify onCreateCohort called with response data and undefined dripConfig
        await waitFor(() => {
            expect(mockOnCreateCohort).toHaveBeenCalledWith(mockCohortData, undefined);
        });
    });

    it('should show error message when API call fails', async () => {
        // Mock failed API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });

        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        // Enter cohort name
        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        fireEvent.change(inputField, { target: { value: 'Summer 2023' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /create cohort/i }));

        // Verify error message is displayed
        await waitFor(() => {
            expect(screen.getByText('Failed to create cohort. Please try again.')).toBeInTheDocument();
        });

        // Verify onCreateCohort was not called
        expect(mockOnCreateCohort).not.toHaveBeenCalled();
    });

    it('should show loading state during API call', async () => {
        // Mock a delayed API response to check loading state
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            new Promise(resolve =>
                setTimeout(() =>
                    resolve({
                        ok: true,
                        json: async () => ({ id: 'new-cohort-id', name: 'Summer 2023' })
                    }),
                    100
                )
            )
        );

        render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        // Enter cohort name
        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        fireEvent.change(inputField, { target: { value: 'Summer 2023' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /create cohort/i }));

        // Verify loading state
        expect(screen.queryByText('Create Cohort')).not.toBeInTheDocument();
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();

        // Wait for the API call to complete
        await waitFor(() => {
            expect(mockOnCreateCohort).toHaveBeenCalled();
        });
    });

    it('should reset the form when dialog is reopened', () => {
        const { rerender } = render(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        // Enter cohort name
        const inputField = screen.getByPlaceholderText('What will you name this cohort?');
        fireEvent.change(inputField, { target: { value: 'Summer 2023' } });

        // Try to submit with empty cohort name to trigger error
        fireEvent.click(screen.getByRole('button', { name: /create cohort/i }));

        // Close and reopen the dialog
        rerender(
            <CreateCohortDialog
                open={false}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        rerender(
            <CreateCohortDialog
                open={true}
                onClose={mockOnClose}
                onCreateCohort={mockOnCreateCohort}
                schoolId={mockSchoolId}
            />
        );

        // Verify form is reset
        const newInputField = screen.getByPlaceholderText('What will you name this cohort?');
        expect(newInputField).toHaveValue('');
        expect(screen.queryByText('Cohort name is required')).not.toBeInTheDocument();
    });
}); 