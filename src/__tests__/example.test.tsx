import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Example Test Suite', () => {
    it('should pass a simple test', () => {
        expect(1 + 1).toBe(2);
    });

    it('should render hello world', () => {
        render(<div data-testid="hello-world">Hello World</div>);
        expect(screen.getByTestId('hello-world')).toBeInTheDocument();
        expect(screen.getByTestId('hello-world')).toHaveTextContent('Hello World');
    });
}); 