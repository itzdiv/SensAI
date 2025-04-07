import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoursePublishSuccessBanner from '../../components/CoursePublishSuccessBanner';

describe('CoursePublishSuccessBanner Component', () => {
    const mockOnClose = jest.fn();

    const baseProps = {
        isOpen: true,
        onClose: mockOnClose,
        cohortCount: 2,
        cohortNames: ['Cohort 1', 'Cohort 2'],
        courseCount: 1,
        courseNames: ['Course 1']
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not render when isOpen is false', () => {
        const { container } = render(
            <CoursePublishSuccessBanner
                {...baseProps}
                isOpen={false}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render the banner with course-specific messaging when source is "course"', () => {
        render(<CoursePublishSuccessBanner {...baseProps} source="course" />);

        expect(screen.getByText('Your course is now live')).toBeInTheDocument();
        expect(screen.getByText('Learners in these cohorts will now see this course on their home page')).toBeInTheDocument();
        expect(screen.getByText('Back to Course')).toBeInTheDocument();
    });

    it('should render the banner with cohort-specific messaging when source is "cohort"', () => {
        render(<CoursePublishSuccessBanner {...baseProps} source="cohort" />);

        expect(screen.getByText('Courses are now live')).toBeInTheDocument();
        expect(screen.getByText('Learners in this cohort will now see this course on their home page')).toBeInTheDocument();
        expect(screen.getByText('Back to Cohort')).toBeInTheDocument();
    });

    it('should use singular wording when only one cohort is affected', () => {
        render(
            <CoursePublishSuccessBanner
                {...baseProps}
                cohortCount={1}
                cohortNames={['Cohort 1']}
            />
        );

        expect(screen.getByText('Learners in this cohort will now see this course on their home page')).toBeInTheDocument();
    });

    it('should use plural wording when multiple courses are affected', () => {
        render(
            <CoursePublishSuccessBanner
                {...baseProps}
                source="cohort"
                courseCount={2}
                courseNames={['Course 1', 'Course 2']}
            />
        );

        expect(screen.getByText('Learners in this cohort will now see these courses on their home page')).toBeInTheDocument();
    });

    it('should call onClose when the button is clicked', () => {
        render(<CoursePublishSuccessBanner {...baseProps} />);

        fireEvent.click(screen.getByText('Back to Course'));

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should render the checkmark icon', () => {
        const { container } = render(<CoursePublishSuccessBanner {...baseProps} />);

        // Check for the SVG path with the checkmark
        const checkmark = container.querySelector('path[d="M20 6L9 17L4 12"]');
        expect(checkmark).toBeInTheDocument();
    });

    it('should render animations with correct styles', () => {
        const { container } = render(<CoursePublishSuccessBanner {...baseProps} />);

        // Check if the animation styles are included
        const styleTag = container.querySelector('style');
        expect(styleTag?.textContent).toContain('@keyframes ripple');
        expect(styleTag?.textContent).toContain('@keyframes fadeIn');
        expect(styleTag?.textContent).toContain('@keyframes slideUp');
    });
}); 