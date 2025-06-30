import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CohortMemberManagement from '../../components/CohortMemberManagement';
import { CohortWithDetails, CohortMember, Course } from '@/types';

// Mock the ConfirmationDialog component
jest.mock('@/components/ConfirmationDialog', () => {
    return function MockConfirmationDialog(props: any) {
        return (
            <div data-testid="confirmation-dialog">
                <span>{props.title}</span>
                <button onClick={props.onConfirm} data-testid="confirm-button">Confirm</button>
                <button onClick={props.onCancel} data-testid="cancel-button">Cancel</button>
            </div>
        );
    };
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('CohortMemberManagement Component', () => {
    // Sample cohort data for testing
    const mockCohort: CohortWithDetails = {
        id: 1,
        name: 'Test Cohort',
        org_id: 123,
        groups: [],
        joined_at: new Date().toISOString(),
        courses: [
            { id: 101, name: 'Course 1' } as Course,
        ],
        members: [
            { id: 201, name: 'Learner 1', email: 'learner1@example.com', role: 'learner' } as CohortMember,
            { id: 202, name: 'Learner 2', email: 'learner2@example.com', role: 'learner' } as CohortMember,
            { id: 203, name: 'Mentor 1', email: 'mentor1@example.com', role: 'mentor' } as CohortMember
        ]
    };

    const mockShowToast = jest.fn();
    const mockUpdateCohort = jest.fn();
    const mockOnInviteDialogClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            })
        );
    });

    it('renders learner members correctly', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Check for learner members
        expect(screen.getByText('learner1@example.com')).toBeInTheDocument();
        expect(screen.getByText('learner2@example.com')).toBeInTheDocument();
        expect(screen.queryByText('mentor1@example.com')).not.toBeInTheDocument(); // Should not show mentors
    });

    it('renders mentor members correctly', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="mentor"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Check for mentor members
        expect(screen.getByText('mentor1@example.com')).toBeInTheDocument();
        expect(screen.queryByText('learner1@example.com')).not.toBeInTheDocument(); // Should not show learners
        expect(screen.queryByText('learner2@example.com')).not.toBeInTheDocument();
    });

    it('opens invite dialog when "Add learners" button is clicked', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Click the Add button
        fireEvent.click(screen.getByText('Add learners'));

        // Check if the invite dialog opens
        expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    });

    it('opens invite dialog when "Add Mentors" button is clicked', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="mentor"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Click the Add button
        fireEvent.click(screen.getByText('Add mentors'));

        // Check if the invite dialog opens
        expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    });

    it('allows adding multiple email inputs in the invite dialog', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Open the invite dialog
        fireEvent.click(screen.getByText('Add learners'));

        // Click the "Add another email" button
        fireEvent.click(screen.getByText('Add another email'));

        // Should now have two email inputs
        const emailInputs = screen.getAllByPlaceholderText('Enter email address');
        expect(emailInputs.length).toBe(2);
    });

    it('shows confirmation dialog when deleting a member', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Find all trash icon buttons
        const trashButtons = screen.getAllByRole('button', {
            name: '' // Trash icons don't have accessible names
        }).filter(button => button.querySelector('svg.lucide-trash2'));

        // Click the first trash button
        fireEvent.click(trashButtons[0]);

        // Check if confirmation dialog appears
        expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    });

    it('calls API to delete a member when confirmed', async () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Find all trash icon buttons
        const trashButtons = screen.getAllByRole('button', {
            name: '' // Trash icons don't have accessible names
        }).filter(button => button.querySelector('svg.lucide-trash2'));

        // Click the first trash button
        fireEvent.click(trashButtons[0]);

        // Confirm the deletion
        fireEvent.click(screen.getByTestId('confirm-button'));

        // Check if API was called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/cohorts/1/members'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        // Check if updateCohort was called with the updated members
        expect(mockUpdateCohort).toHaveBeenCalled();
    });

    it('validates email addresses when submitting the invite form', async () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Open the invite dialog
        fireEvent.click(screen.getByText('Add learners'));

        // Enter an invalid email
        const emailInput = screen.getByPlaceholderText('Enter email address');
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

        // Submit the form using the correct button text
        fireEvent.click(screen.getByText('Invite learners'));

        // Should show error message
        await waitFor(() => {
            expect(screen.getByText('Invalid email')).toBeInTheDocument();
        });

        // API should not be called
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('submits valid email addresses and calls API', async () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
            />
        );

        // Open the invite dialog
        fireEvent.click(screen.getByText('Add learners'));

        // Enter a valid email
        const emailInput = screen.getByPlaceholderText('Enter email address');
        fireEvent.change(emailInput, { target: { value: 'new-learner@example.com' } });

        // Submit the form using the correct button text
        fireEvent.click(screen.getByText('Invite learners'));

        // API should be called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/cohorts/1/members'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('new-learner@example.com')
                })
            );
        });

        // Should show toast message
        expect(mockShowToast).toHaveBeenCalled();
    });

    it('opens invite dialog when openInviteDialog prop is true', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
                openInviteDialog={true}
                onInviteDialogClose={mockOnInviteDialogClose}
            />
        );

        // Invite dialog should be open without clicking the button
        expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    });

    it('calls onInviteDialogClose when closing the invite dialog', () => {
        render(
            <CohortMemberManagement
                cohort={mockCohort}
                role="learner"
                cohortId="1"
                schoolId="school1"
                onShowToast={mockShowToast}
                updateCohort={mockUpdateCohort}
                openInviteDialog={true}
                onInviteDialogClose={mockOnInviteDialogClose}
            />
        );

        // Find the Cancel button within the invite modal
        // Get all Cancel buttons and find the one that's not in the confirmation dialog
        const cancelButtons = screen.getAllByText('Cancel');
        const inviteDialogCancelButton = cancelButtons.find(
            button => !button.closest('[data-testid="confirmation-dialog"]')
        );

        // Click the correct Cancel button
        fireEvent.click(inviteDialogCancelButton!);

        // onInviteDialogClose should be called
        expect(mockOnInviteDialogClose).toHaveBeenCalled();
    });
}); 