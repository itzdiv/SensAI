import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
// Mock CSS imports
jest.mock('@blocknote/core/fonts/inter.css', () => ({}));
jest.mock('@blocknote/mantine/style.css', () => ({}));
import BlockNoteEditor from '../../components/BlockNoteEditor';
import React from 'react';

// Define the type for our mock editor with the additional property
interface MockEditor {
    document: any[];
    onEditorContentChange: jest.Mock;
    getJSON: jest.Mock;
    insertBlocks: jest.Mock;
    domElement: HTMLDivElement;
    activeEditor: {
        chain: jest.Mock;
        focus: jest.Mock;
        run: jest.Mock;
    };
    _onChangeCallback?: (data: any) => void;
}

// Create a mock editor
const mockEditor: MockEditor = {
    document: [],
    onEditorContentChange: jest.fn(callback => {
        // Store the callback for later use
        mockEditor._onChangeCallback = callback;
        return { dispose: jest.fn() };
    }),
    getJSON: jest.fn(() => [{ id: 'test-block', type: 'paragraph', content: 'Test content' }]),
    insertBlocks: jest.fn(),
    domElement: document.createElement('div'),
    activeEditor: {
        chain: jest.fn().mockReturnThis(),
        focus: jest.fn().mockReturnThis(),
        run: jest.fn().mockReturnThis()
    }
};

// Mock BlockNote modules and dependencies
jest.mock('@blocknote/react', () => ({
    useCreateBlockNote: jest.fn(() => mockEditor)
}));

jest.mock('@blocknote/mantine', () => ({
    BlockNoteView: jest.fn(({ editor, editable, theme }) => (
        <div data-testid="blocknote-editor" data-editable={editable} data-theme={theme}>
            <button data-testid="mock-editor-button">Editor</button>
        </div>
    ))
}));

jest.mock('@blocknote/core', () => ({
    BlockNoteSchema: {
        create: jest.fn(() => ({}))
    },
    defaultBlockSpecs: {
        paragraph: { type: 'paragraph' },
        heading: { type: 'heading' },
        bulletListItem: { type: 'bulletListItem' },
        numberedListItem: { type: 'numberedListItem' },
        image: { type: 'image' },
        video: { type: 'video' },
        audio: { type: 'audio' },
        table: { type: 'table' },
        file: { type: 'file' }
    },
    locales: {
        en: {
            placeholders: {
                emptyDocument: 'Start typing...'
            }
        }
    }
}));

// Mock fetch for file uploads
const mockFetch = jest.fn().mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('/file/presigned-url/create')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presigned_url: 'https://example.com/presigned-url' })
        } as unknown as Response);
    } else if (typeof url === 'string' && url.includes('/file/presigned-url/get')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ url: 'https://example.com/file.jpg' })
        } as unknown as Response);
    } else if (url === 'https://example.com/presigned-url') {
        return Promise.resolve({
            ok: true,
            url: 'https://example.com/file.jpg'
        } as unknown as Response);
    }
    return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({})
    } as unknown as Response);
});

global.fetch = mockFetch;

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com';

describe('BlockNoteEditor Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the editor with default props', () => {
        render(<BlockNoteEditor />);

        expect(screen.getByTestId('blocknote-editor')).toBeInTheDocument();
    });

    it('renders in read-only mode when specified', () => {
        render(<BlockNoteEditor readOnly={true} />);

        expect(screen.getByTestId('blocknote-editor')).toHaveAttribute('data-editable', 'false');
    });

    it('uses dark theme by default', () => {
        render(<BlockNoteEditor />);

        expect(screen.getByTestId('blocknote-editor')).toHaveAttribute('data-theme', 'dark');
    });

    it('uses light theme when isDarkMode is false', () => {
        render(<BlockNoteEditor isDarkMode={false} />);

        expect(screen.getByTestId('blocknote-editor')).toHaveAttribute('data-theme', 'light');
    });

    it('applies custom className when provided', () => {
        render(<BlockNoteEditor className="custom-class" />);

        // BlockNoteView would receive this className
        const editorContainer = screen.getByTestId('blocknote-editor').parentElement;
        expect(editorContainer).toHaveClass('custom-class');
    });

    it('uses initial content when provided', () => {
        const initialContent = [
            { id: 'block-1', type: 'paragraph', content: 'Initial content' }
        ];

        render(<BlockNoteEditor initialContent={initialContent} />);

        // Verify useCreateBlockNote was called with the initialContent
        expect(require('@blocknote/react').useCreateBlockNote).toHaveBeenCalledWith(
            expect.objectContaining({
                initialContent
            })
        );
    });

    it('calls onChange callback when content changes', async () => {
        const onChangeMock = jest.fn();

        render(<BlockNoteEditor onChange={onChangeMock} />);

        // Simulate an editor content change
        await act(async () => {
            if (mockEditor._onChangeCallback) {
                mockEditor._onChangeCallback({ content: 'changed' });
            }
        });

        // Wait for the debounced onChange to be called
        await waitFor(() => {
            expect(onChangeMock).toHaveBeenCalled();
        });
    });

    it('calls onEditorReady when the editor is ready', () => {
        const onEditorReadyMock = jest.fn();

        render(<BlockNoteEditor onEditorReady={onEditorReadyMock} />);

        expect(onEditorReadyMock).toHaveBeenCalledWith(mockEditor);
    });

    it('excludes media blocks when allowMedia is false', () => {
        render(<BlockNoteEditor allowMedia={false} />);

        // Verify BlockNoteSchema.create was called with the correct block specs
        expect(require('@blocknote/core').BlockNoteSchema.create).toHaveBeenCalledWith(
            expect.objectContaining({
                blockSpecs: expect.not.objectContaining({
                    image: expect.anything(),
                    video: expect.anything(),
                    audio: expect.anything()
                })
            })
        );
    });

    it('includes media blocks when allowMedia is true', () => {
        render(<BlockNoteEditor allowMedia={true} />);

        // Should not exclude image, video and audio blocks
        const call = require('@blocknote/core').BlockNoteSchema.create.mock.calls[0][0];
        expect(call.blockSpecs).toHaveProperty('image');
        expect(call.blockSpecs).toHaveProperty('video');
        expect(call.blockSpecs).toHaveProperty('audio');
    });

    it('uses custom placeholder when provided', () => {
        const customPlaceholder = "Custom placeholder text";

        render(<BlockNoteEditor placeholder={customPlaceholder} />);

        // Verify useCreateBlockNote was called with the custom placeholder
        expect(require('@blocknote/react').useCreateBlockNote).toHaveBeenCalledWith(
            expect.objectContaining({
                dictionary: expect.objectContaining({
                    placeholders: expect.objectContaining({
                        emptyDocument: customPlaceholder
                    })
                })
            })
        );
    });
});