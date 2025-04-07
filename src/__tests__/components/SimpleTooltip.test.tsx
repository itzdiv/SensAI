import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleTooltip from '../../components/SimpleTooltip';

describe('SimpleTooltip Component', () => {
    it('should render children correctly', () => {
        render(
            <SimpleTooltip text="Tooltip Text">
                <button>Hover Me</button>
            </SimpleTooltip>
        );

        expect(screen.getByText('Hover Me')).toBeInTheDocument();
        expect(screen.queryByText('Tooltip Text')).not.toBeInTheDocument();
    });

    it('should show tooltip on mouse enter and hide on mouse leave', () => {
        render(
            <SimpleTooltip text="Tooltip Text">
                <button>Hover Me</button>
            </SimpleTooltip>
        );

        // Tooltip should not be visible initially
        expect(screen.queryByText('Tooltip Text')).not.toBeInTheDocument();

        // Hover over the element
        fireEvent.mouseEnter(screen.getByText('Hover Me').parentElement!);
        expect(screen.getByText('Tooltip Text')).toBeInTheDocument();

        // Mouse leave
        fireEvent.mouseLeave(screen.getByText('Hover Me').parentElement!);
        expect(screen.queryByText('Tooltip Text')).not.toBeInTheDocument();
    });

    it('should position tooltip above the children element', () => {
        render(
            <SimpleTooltip text="Tooltip Text">
                <button>Hover Me</button>
            </SimpleTooltip>
        );

        // Hover over the element
        fireEvent.mouseEnter(screen.getByText('Hover Me').parentElement!);

        // Get the tooltip element itself, not its parent
        const tooltipElement = screen.getByText('Tooltip Text').closest('div');
        expect(tooltipElement).toHaveClass('absolute');
        expect(tooltipElement).toHaveClass('bottom-full');
        expect(tooltipElement).toHaveClass('left-1/2');
    });
}); 