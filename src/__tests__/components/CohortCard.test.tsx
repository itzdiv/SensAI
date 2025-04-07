import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CohortCard from '../../components/CohortCard';

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

describe('CohortCard Component', () => {
    // Test data
    const cohort = {
        id: 123,
        name: 'Test Cohort'
    };

    it('should render cohort name correctly', () => {
        render(<CohortCard cohort={cohort} schoolId={456} />);
        expect(screen.getByText('Test Cohort')).toBeInTheDocument();
    });

    it('should generate the correct link URL with schoolId', () => {
        render(<CohortCard cohort={cohort} schoolId={456} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/school/admin/456/cohorts/123');
    });

    it('should apply a border color based on cohort ID', () => {
        render(<CohortCard cohort={cohort} schoolId={456} />);
        const card = screen.getByText('Test Cohort').closest('div');

        // Validate that a border class is applied
        expect(card).toHaveClass('border-b-2');

        // We can validate against all possible border classes
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

    it('should have hover effect styling', () => {
        render(<CohortCard cohort={cohort} schoolId={456} />);
        const card = screen.getByText('Test Cohort').closest('div');
        expect(card).toHaveClass('hover:opacity-90');
        expect(card).toHaveClass('transition-all');
    });

    it('should handle undefined schoolId gracefully', () => {
        render(<CohortCard cohort={cohort} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/school/admin/undefined/cohorts/123');
    });
}); 