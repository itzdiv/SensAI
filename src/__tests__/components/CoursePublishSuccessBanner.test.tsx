import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoursePublishSuccessBanner from '../../components/CoursePublishSuccessBanner';

describe('CoursePublishSuccessBanner Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not render anything when isOpen is false', () => {
        const { container } = render(
            <CoursePublishSuccessBanner
                isOpen={false}
                onClose={mockOnClose}
                cohortCount={2}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('should render the banner when isOpen is true', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={2}
            />
        );

        expect(screen.getByText('Your course is now live')).toBeInTheDocument();
    });

    it('should render correct singular text when cohortCount is 1 for course source', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={1}
                source="course"
            />
        );

        expect(screen.getByText('Learners in this cohort will now see this course on their home page')).toBeInTheDocument();
    });

    it('should render correct plural text when cohortCount is greater than 1 for course source', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={3}
                source="course"
            />
        );

        expect(screen.getByText('Learners in these cohorts will now see this course on their home page')).toBeInTheDocument();
    });

    it('should render correct singular text when courseCount is 1 for cohort source', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={1}
                courseCount={1}
                source="cohort"
            />
        );

        expect(screen.getByText('Courses are now live')).toBeInTheDocument();
        expect(screen.getByText('Learners in this cohort will now see this course on their home page')).toBeInTheDocument();
    });

    it('should render correct plural text when courseCount is greater than 1 for cohort source', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={1}
                courseCount={3}
                source="cohort"
            />
        );

        expect(screen.getByText('Courses are now live')).toBeInTheDocument();
        expect(screen.getByText('Learners in this cohort will now see these courses on their home page')).toBeInTheDocument();
    });

    it('should call onClose when the close button is clicked', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={2}
                source="course"
            />
        );

        fireEvent.click(screen.getByText('Back to Course'));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display "Back to Cohort" button text when source is cohort', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={1}
                courseCount={2}
                source="cohort"
            />
        );

        expect(screen.getByText('Back to Cohort')).toBeInTheDocument();
    });

    it('should display "Back to Course" button text when source is course', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={2}
                source="course"
            />
        );

        expect(screen.getByText('Back to Course')).toBeInTheDocument();
    });

    it('should display the checkmark icon', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={2}
            />
        );

        // Look for SVG path that represents checkmark
        const checkmarkPath = document.querySelector('path[d="M20 6L9 17L4 12"]');
        expect(checkmarkPath).toBeInTheDocument();
    });

    it('should have animation styles', () => {
        render(
            <CoursePublishSuccessBanner
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={2}
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
                isOpen={true}
                onClose={mockOnClose}
                cohortCount={2}
            // No source provided
            />
        );

        expect(screen.getByText('Your course is now live')).toBeInTheDocument();
        expect(screen.getByText('Back to Course')).toBeInTheDocument();
    });
}); 