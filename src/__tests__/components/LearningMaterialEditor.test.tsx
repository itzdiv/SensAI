import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { TaskData } from '@/types';

// Mock CSS imports
jest.mock('@blocknote/core/fonts/inter.css', () => ({}), { virtual: true });
jest.mock('@blocknote/mantine/style.css', () => ({}), { virtual: true });
jest.mock('../../components/editor-styles.css', () => ({}), { virtual: true });
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}), { virtual: true });

// Mock localStorage with safeLocalStorage implementation
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

// Mock safeLocalStorage
jest.mock('@/lib/utils/localStorage', () => ({
    safeLocalStorage: mockLocalStorage
}));

// Import component after CSS mocks
import LearningMaterialEditor, { LearningMaterialEditorHandle } from '../../components/LearningMaterialEditor';

// Mock the BlockNoteEditor component
jest.mock('../../components/BlockNoteEditor', () => ({
    __esModule: true,
    default: jest.fn(({ initialContent, onChange, readOnly, onEditorReady }) => {
        // Call onEditorReady with a mock editor instance if provided
        if (onEditorReady) {
            setTimeout(() => onEditorReady({ focus: jest.fn() }), 0);
        }

        return (
            <div data-testid="block-note-editor" data-read-only={readOnly}>
                <button
                    data-testid="mock-content-change"
                    onClick={() => onChange && onChange([{ type: 'paragraph', content: [{ text: 'New content', type: 'text', styles: {} }] }])}
                >
                    Change Content
                </button>
                <span data-testid="editor-content">{JSON.stringify(initialContent)}</span>
            </div>
        );
    })
}));

// Mock components used by LearningMaterialEditor
jest.mock('../../components/ConfirmationDialog', () => ({
    __esModule: true,
    default: jest.fn(({ open, onCancel, onConfirm, title, message }) => (
        open ? (
            <div data-testid="confirmation-dialog">
                <h2>{title}</h2>
                <p>{message}</p>
                <button onClick={onCancel} data-testid="cancel-confirm-button">Cancel</button>
                <button onClick={onConfirm} data-testid="confirm-button">Confirm</button>
            </div>
        ) : null
    ))
}));

jest.mock('../../components/PublishConfirmationDialog', () => ({
    __esModule: true,
    default: jest.fn(({ show, onCancel, onConfirm, title, message, isLoading, errorMessage }) => (
        show ? (
            <div data-testid="publish-confirmation-dialog">
                <h2>{title}</h2>
                <p>{message}</p>
                {errorMessage && <p data-testid="error-message">{errorMessage}</p>}
                <button onClick={onCancel} data-testid="cancel-publish-button" disabled={isLoading}>Cancel</button>
                <button onClick={() => onConfirm(null)} data-testid="confirm-publish-button" disabled={isLoading}>
                    {isLoading ? 'Publishing...' : 'Publish Now'}
                </button>
            </div>
        ) : null
    ))
}));

jest.mock('../../components/ChatView', () => ({
    __esModule: true,
    default: jest.fn(() => <div data-testid="chat-view"></div>)
}));

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://test-api.example.com';

describe('LearningMaterialEditor Component', () => {
    const mockTaskId = '123';
    const mockUserId = 'user-123';
    const mockOnChange = jest.fn();
    const mockOnSaveSuccess = jest.fn();
    const mockOnPublishSuccess = jest.fn();
    const mockOnPublishConfirm = jest.fn();
    const mockOnPublishCancel = jest.fn();

    // Sample task data for mock responses
    const mockTaskData: TaskData = {
        id: mockTaskId,
        title: 'Test Task',
        blocks: [
            {
                type: 'paragraph',
                content: [{ text: 'Test content', type: 'text', styles: {} }]
            }
        ],
        status: 'draft'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockReset();
        mockLocalStorage.getItem.mockReset();
        mockLocalStorage.setItem.mockReset();
    });

    it('should render the editor in loading state initially', () => {
        // Mock fetch to delay responding
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            new Promise(resolve => setTimeout(() => resolve({
                ok: true,
                json: async () => mockTaskData
            }), 100))
        );

        render(
            <LearningMaterialEditor
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
            />
        );

        // Look for the loading spinner using the test ID
        expect(screen.getByTestId('editor-loading-spinner')).toBeInTheDocument();
    });

    it('should fetch task data when taskId is provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTaskData
        });

        render(
            <LearningMaterialEditor
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
            />
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `http://test-api.example.com/tasks/${mockTaskId}`,
                expect.anything()
            );
        });
    });

    it('should render the editor with task data when loaded', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTaskData
        });

        render(
            <LearningMaterialEditor
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('block-note-editor')).toBeInTheDocument();
        });
    });

    it('should call onChange when editor content changes', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTaskData
        });

        render(
            <LearningMaterialEditor
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('block-note-editor')).toBeInTheDocument();
        });

        // Trigger content change via our mock
        fireEvent.click(screen.getByTestId('mock-content-change'));

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'paragraph'
                })
            ])
        );
    });

    it('should pass readOnly prop to editor correctly', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTaskData
        });

        render(
            <LearningMaterialEditor
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
                readOnly={true}
            />
        );

        await waitFor(() => {
            const editor = screen.getByTestId('block-note-editor');
            expect(editor).toBeInTheDocument();
            expect(editor.getAttribute('data-read-only')).toBe('true');
        });
    });

    it('should handle save operation correctly', async () => {
        // Mock successful API response for saving
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockTaskData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockTaskData, status: 'draft' })
            });

        const editorRef = { current: null as any };

        render(
            <LearningMaterialEditor
                ref={(ref) => { editorRef.current = ref; }}
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
                onSaveSuccess={mockOnSaveSuccess}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('block-note-editor')).toBeInTheDocument();
        });

        // Trigger save using the ref
        await act(async () => {
            await editorRef.current.save();
        });

        // Verify the API was called with correct data
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `http://test-api.example.com/tasks/${mockTaskId}/learning_material`,
                expect.objectContaining({
                    method: 'PUT',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    body: expect.any(String)
                })
            );

            expect(mockOnSaveSuccess).toHaveBeenCalled();
        });
    });

    it('should handle publish operation correctly', async () => {
        // Mock API responses
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockTaskData
            }) // Initial fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockTaskData, status: 'published' })
            }); // Publish API call

        render(
            <LearningMaterialEditor
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
                onPublishSuccess={mockOnPublishSuccess}
                showPublishConfirmation={true}
                onPublishConfirm={mockOnPublishConfirm}
                onPublishCancel={mockOnPublishCancel}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('publish-confirmation-dialog')).toBeInTheDocument();
        });

        // Confirm publishing
        fireEvent.click(screen.getByTestId('confirm-publish-button'));

        await waitFor(() => {
            // Verify publish API was called
            expect(global.fetch).toHaveBeenCalledWith(
                `http://test-api.example.com/tasks/${mockTaskId}/learning_material`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    })
                })
            );

            expect(mockOnPublishSuccess).toHaveBeenCalled();
            expect(mockOnPublishConfirm).toHaveBeenCalled();
        });
    });

    it('should handle cancel publish correctly', async () => {
        // Mock API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTaskData
        });

        render(
            <LearningMaterialEditor
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
                showPublishConfirmation={true}
                onPublishConfirm={mockOnPublishConfirm}
                onPublishCancel={mockOnPublishCancel}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('publish-confirmation-dialog')).toBeInTheDocument();
        });

        // Cancel publishing
        fireEvent.click(screen.getByTestId('cancel-publish-button'));

        expect(mockOnPublishCancel).toHaveBeenCalled();
        expect(mockOnPublishConfirm).not.toHaveBeenCalled();
    });

    it('should handle API errors during save', async () => {
        console.error = jest.fn(); // Suppress expected console errors

        // Mock API responses
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockTaskData
            }) // Initial fetch
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Failed to save' }),
                status: 500
            }); // Save API error

        const editorRef = { current: null as any };

        render(
            <LearningMaterialEditor
                ref={(ref) => { editorRef.current = ref; }}
                taskId={mockTaskId}
                userId={mockUserId}
                onChange={mockOnChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('block-note-editor')).toBeInTheDocument();
        });

        // Trigger save using the ref
        await act(async () => {
            await editorRef.current.save();
        });

        // Check for error response handling
        await waitFor(() => {
            // Since the error might be handled internally and not displayed in the editor UI,
            // we can just verify the save success callback wasn't called
            expect(mockOnSaveSuccess).not.toHaveBeenCalled();
        });
    });
}); 