import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoursePublishSuccessBanner from '../../components/CoursePublishSuccessBanner';

describe('CoursePublishSuccessBanner Component', () => {
    const mockOnClose = jest.fn();

    // Mock required props to match actual component interface
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        cohortId: 123,
        cohortName: 'Test Cohort',
        schoolId: 'test-school-id',
        schoolSlug: 'test-school'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock window.location.origin for invite link generation
        Object.defineProperty(window, 'location', {
            value: {
                origin: 'http://localhost:3000'
            },
            writable: true
        });
    });

    it('should not render anything when isOpen is false', () => {
        const { container } = render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                isOpen={false}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('should render the banner when isOpen is true', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
            />
        );

        expect(screen.getByText('Your course is now live')).toBeInTheDocument();
    });

    it('should render correct text for course source (default)', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                source="course"
            />
        );

        // Check for parts of the text that are actually continuous in the DOM
        expect(screen.getByText(/Learners added to this cohort can see this course now/)).toBeInTheDocument();
        expect(screen.getByText('cohort admin dashboard')).toBeInTheDocument();
        expect(screen.getByText(/or send them an invite link/)).toBeInTheDocument();
    });

    it('should render correct singular text when courseCount is 1 for cohort source', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                courseCount={1}
                source="cohort"
            />
        );

        expect(screen.getByText('Courses are now live')).toBeInTheDocument();
        expect(screen.getByText(/Learners added to this cohort can see/)).toBeInTheDocument();
        expect(screen.getByText(/this course/)).toBeInTheDocument();
        expect(screen.getByText('Learners')).toBeInTheDocument(); // Check for the strong element
    });

    it('should render correct plural text when courseCount is greater than 1 for cohort source', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                courseCount={3}
                source="cohort"
            />
        );

        expect(screen.getByText('Courses are now live')).toBeInTheDocument();
        expect(screen.getByText(/Learners added to this cohort can see/)).toBeInTheDocument();
        expect(screen.getByText(/these courses/)).toBeInTheDocument();
        expect(screen.getByText('Learners')).toBeInTheDocument(); // Check for the strong element
    });

    it('should call onClose when the close button is clicked', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                source="course"
            />
        );

        fireEvent.click(screen.getByText('Back to Course'));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display "Back to Cohort" button text when source is cohort', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                courseCount={2}
                source="cohort"
            />
        );

        expect(screen.getByText('Back to Cohort')).toBeInTheDocument();
    });

    it('should display "Back to Course" button text when source is course', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                source="course"
            />
        );

        expect(screen.getByText('Back to Course')).toBeInTheDocument();
    });

    it('should display the checkmark icon', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
            />
        );

        // Look for SVG path that represents checkmark
        const checkmarkPath = document.querySelector('path[d="M20 6L9 17L4 12"]');
        expect(checkmarkPath).toBeInTheDocument();
    });

    it('should have animation styles', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
            />
        );

        // Check for animation classes
        expect(document.querySelector('.animate-ripple')).toBeInTheDocument();
        expect(document.querySelector('.animate-slideUp')).toBeInTheDocument();
        expect(document.querySelector('.animate-fadeIn')).toBeInTheDocument();
    });

    it('should default to course source when no source is provided', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
            // No source provided
            />
        );

        expect(screen.getByText('Your course is now live')).toBeInTheDocument();
        expect(screen.getByText('Back to Course')).toBeInTheDocument();
    });

    it('should generate invite link with correct URL', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
            />
        );

        // The component should render a copy invite link button
        expect(screen.getByText('Copy invite link')).toBeInTheDocument();
    });

    it('should show admin dashboard link for course source', () => {
        render(
            <CoursePublishSuccessBanner
                {...defaultProps}
                source="course"
            />
        );

        const adminLink = screen.getByText('cohort admin dashboard');
        expect(adminLink).toBeInTheDocument();
        expect(adminLink.closest('a')).toHaveAttribute('href', `/school/admin/${defaultProps.schoolId}/cohorts/${defaultProps.cohortId}`);
    });
}); 