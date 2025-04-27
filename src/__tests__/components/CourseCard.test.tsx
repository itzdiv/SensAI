import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CourseCard from '../../components/CourseCard';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useParams: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
    return function MockLink({ children, ...props }: any) {
        return (
            <a {...props}>
                {children}
            </a>
        );
    };
});

describe('CourseCard Component', () => {
    // Test data
    const basicCourse = {
        id: 123,
        title: 'Test Course'
    };

    const courseWithOrgId = {
        id: 456,
        title: 'Test Course with Org ID',
        org_id: 789
    };

    const courseWithRole = {
        id: 789,
        title: 'Learner Course',
        role: 'learner',
        org: {
            slug: 'test-org'
        },
        cohort_id: 123
    };

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Default mock implementation for useParams
        require('next/navigation').useParams.mockReturnValue({ id: 'school-123' });
    });

    it('should render course title correctly', () => {
        render(<CourseCard course={basicCourse} />);
        expect(screen.getByText('Test Course')).toBeInTheDocument();
    });

    it('should generate a link to school-specific course path when schoolId is available', () => {
        render(<CourseCard course={basicCourse} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/school/admin/school-123/courses/123');
    });

    it('should generate a link to org-specific course path when org_id is available', () => {
        render(<CourseCard course={courseWithOrgId} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/school/admin/789/courses/456');
    });

    it('should generate a link to school path for learner courses', () => {
        render(<CourseCard course={courseWithRole} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/school/test-org?course_id=789&cohort_id=123');
    });

    it('should generate a link to general course path when no school or org context is available', () => {
        // Override useParams to return no school ID
        require('next/navigation').useParams.mockReturnValue({});

        render(<CourseCard course={basicCourse} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/courses/123');
    });

    it('should apply a border color based on course ID', () => {
        render(<CourseCard course={basicCourse} />);
        const card = screen.getByText('Test Course').closest('div');

        // Validate that a border class is applied
        // We can't test the exact class since it's dynamically generated,
        // but we can check that one of the border classes is present
        expect(card).toHaveClass('border-b-2');
        expect(card).toMatchSnapshot();

        // We can either validate against all possible border classes
        const possibleBorderClasses = [
            'border-purple-500',
            'border-green-500',
            'border-pink-500',
            'border-yellow-500',
            'border-blue-500',
            'border-red-500',
            'border-indigo-500',
            'border-orange-500'
        ];

        const hasBorderClass = possibleBorderClasses.some(className =>
            card?.classList.contains(className)
        );

        expect(hasBorderClass).toBe(true);
    });

    it('should handle string IDs for course correctly', () => {
        const courseWithStringId = {
            id: 'course-abc',
            title: 'Course with String ID'
        };

        render(<CourseCard course={courseWithStringId} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/school/admin/school-123/courses/course-abc');
    });
}); 