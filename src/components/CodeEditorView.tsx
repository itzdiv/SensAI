import React, { useState, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { Play, Send } from 'lucide-react';

interface CodeEditorViewProps {
    initialCode?: Record<string, string>;
    languages?: string[];
    handleCodeSubmit: (code: Record<string, string>) => void;
    onCodeRun?: (previewContent: string, output: string) => void;
}

// Preview component that can be used in a separate column
export interface CodePreviewProps {
    isRunning: boolean;
    previewContent: string;
    output: string;
    isWebPreview: boolean;
}

export const CodePreview: React.FC<CodePreviewProps> = ({
    isRunning,
    previewContent,
    output,
    isWebPreview
}) => {
    return (
        <div className="flex-1 flex flex-col bg-[#111111] overflow-hidden h-full">
            <div className="px-4 py-2 bg-[#222222] text-white text-sm font-medium">
                {isWebPreview ? 'Preview' : 'Output'}
            </div>
            <div className="flex-1 overflow-auto">
                {isRunning ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                    </div>
                ) : isWebPreview ? (
                    <iframe
                        srcDoc={previewContent}
                        title="Code Preview"
                        className="w-full h-full bg-white"
                        sandbox="allow-scripts"
                    />
                ) : (
                    <pre className="p-4 text-white whitespace-pre-wrap font-mono text-sm">
                        {output || 'Run your code to see output here'}
                    </pre>
                )}
            </div>
        </div>
    );
};

const DEFAULT_LANGUAGE_CONTENTS = {
    'javascript': 'function changeText() {\n  document.getElementById("greeting").textContent = "Hello from JavaScript!";\n}\n\nconsole.log("Hello, world!");\n',
    'html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1 id="greeting">Hello, world!</h1>\n  <button onclick="changeText()">Change Text</button>\n</body>\n</html>\n',
    'css': 'body {\n  font-family: sans-serif;\n  margin: 20px;\n}\n\nh1 {\n  color: navy;\n}\n',
    'python': 'print("Hello, world!")\n',
    'java': 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}\n',
    'c': '#include <stdio.h>\n\nint main() {\n  printf("Hello, world!\\n");\n  return 0;\n}\n',
    'cpp': '#include <iostream>\n\nint main() {\n  std::cout << "Hello, world!" << std::endl;\n  return 0;\n}\n',
    'csharp': 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, world!");\n  }\n}\n',
    'ruby': 'puts "Hello, world!"\n',
    'typescript': 'const message: string = "Hello, world!";\nconsole.log(message);\n',
    'php': '<?php\necho "Hello, world!";\n?>\n',
} as Record<string, string>;

// Map language to Monaco editor language identifiers
const LANGUAGE_MAPPING: Record<string, string> = {
    'javascript': 'javascript',
    'js': 'javascript',
    'html': 'html',
    'css': 'css',
    'python': 'python',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'c++': 'cpp',
    'csharp': 'csharp',
    'c#': 'csharp',
    'ruby': 'ruby',
    'typescript': 'typescript',
    'ts': 'typescript',
    'php': 'php',
};

// Prettier language display names
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
    'javascript': 'JavaScript',
    'html': 'HTML',
    'css': 'CSS',
    'python': 'Python',
    'java': 'Java',
    'c': 'C',
    'cpp': 'C++',
    'csharp': 'C#',
    'ruby': 'Ruby',
    'typescript': 'TypeScript',
    'php': 'PHP',
};

const CodeEditorView: React.FC<CodeEditorViewProps> = ({
    initialCode = {},
    languages = ['javascript'],
    handleCodeSubmit,
    onCodeRun,
}) => {
    // Normalize languages to their canonical form
    const normalizedLanguages = languages.map(lang =>
        LANGUAGE_MAPPING[lang.toLowerCase()] || lang.toLowerCase()
    ).filter((lang, index, self) =>
        // Remove duplicates
        self.indexOf(lang) === index &&
        // Ensure we have a default content for this language
        Object.keys(LANGUAGE_MAPPING).includes(lang)
    );

    // If no valid languages, default to JavaScript
    const validLanguages = normalizedLanguages.length > 0
        ? normalizedLanguages
        : ['javascript'];

    // Initialize code state with provided initialCode or defaults
    const [code, setCode] = useState<Record<string, string>>(() => {
        const initialState: Record<string, string> = {};

        validLanguages.forEach(lang => {
            initialState[lang] = initialCode[lang] || DEFAULT_LANGUAGE_CONTENTS[lang] || '';
        });

        return initialState;
    });

    // State for the active language tab
    const [activeLanguage, setActiveLanguage] = useState<string>(validLanguages[0]);

    // Preview state
    const [previewContent, setPreviewContent] = useState<string>('');
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [output, setOutput] = useState<string>('');

    // Check if web preview is available (HTML, CSS, JS)
    const hasWebLanguages = validLanguages.some(lang =>
        ['html', 'css', 'javascript'].includes(lang)
    );

    // Update code state when initialCode changes
    useEffect(() => {
        if (Object.keys(initialCode).length > 0) {
            setCode(prevCode => ({
                ...prevCode,
                ...initialCode
            }));
        }
    }, [initialCode]);

    // Handle code change for the active language
    const handleCodeChange = (value: string | undefined) => {
        if (value !== undefined) {
            setCode(prevCode => ({
                ...prevCode,
                [activeLanguage]: value
            }));
        }
    };

    // Prepare and run the code
    const handleRunCode = () => {
        setIsRunning(true);

        try {
            // For web-based languages, create a preview
            if (hasWebLanguages) {
                // Generate HTML preview with CSS and JavaScript
                const htmlContent = code['html'] || '';
                const cssContent = code['css'] ? `<style>${code['css']}</style>` : '';
                const jsContent = code['javascript'] ? `<script>${code['javascript']}</script>` : '';

                // Combine all content
                const fullHtmlContent = htmlContent
                    .replace('</head>', `${cssContent}</head>`)
                    .replace('</body>', `${jsContent}</body>`);

                setPreviewContent(fullHtmlContent);
                setOutput('Preview updated');

                // Notify parent component
                if (onCodeRun) {
                    onCodeRun(fullHtmlContent, 'Preview updated');
                }
            }
            // For non-web languages, execute the code if possible
            else {
                // In a real implementation, you would send this code to a server for execution
                // For now, we'll show a placeholder message
                const outputMessage = `Code execution for ${LANGUAGE_DISPLAY_NAMES[activeLanguage] || activeLanguage} would happen on a server.`;
                setOutput(outputMessage);

                // For JavaScript, we can run it in the browser (for demo purposes)
                if (activeLanguage === 'javascript') {
                    const originalConsoleLog = console.log;
                    let consoleOutput = '';

                    console.log = (...args) => {
                        consoleOutput += args.join(' ') + '\n';
                    };

                    try {
                        // This is just for demo purposes and should be replaced with a secure solution
                        // eslint-disable-next-line no-eval
                        const result = eval(code['javascript']);

                        if (result !== undefined) {
                            consoleOutput += 'Return value: ' + result + '\n';
                        }
                    } catch (error) {
                        consoleOutput += 'Error: ' + (error as Error).message + '\n';
                    }

                    // Restore original console
                    console.log = originalConsoleLog;

                    setOutput(consoleOutput || 'No output');

                    // Notify parent component
                    if (onCodeRun) {
                        onCodeRun('', consoleOutput || 'No output');
                    }
                } else {
                    // Notify parent component for other languages
                    if (onCodeRun) {
                        onCodeRun('', outputMessage);
                    }
                }
            }
        } catch (error) {
            const errorMessage = `Error: ${(error as Error).message}`;
            setOutput(errorMessage);

            // Notify parent component
            if (onCodeRun) {
                onCodeRun('', errorMessage);
            }
        } finally {
            setIsRunning(false);
        }
    };

    // Submit the code
    const handleSubmit = () => {
        handleCodeSubmit(code);
    };

    // Monaco editor setup
    const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        // You can customize the editor here if needed
        editor.focus();
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Language tabs */}
            {validLanguages.length > 1 && (
                <div className="flex items-center overflow-x-auto bg-[#1D1D1D] hide-scrollbar">
                    {validLanguages.map((lang) => (
                        <button
                            key={lang}
                            onClick={() => setActiveLanguage(lang)}
                            className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${activeLanguage === lang
                                ? 'bg-[#2D2D2D] text-white border-b-2 border-white'
                                : 'text-gray-400 hover:text-white hover:bg-[#222222]'
                                }`}
                        >
                            {LANGUAGE_DISPLAY_NAMES[lang] || lang}
                        </button>
                    ))}
                </div>
            )}

            {/* Code editor (without preview) */}
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    language={activeLanguage}
                    value={code[activeLanguage]}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        lineNumbers: 'off',
                    }}
                    onMount={handleEditorDidMount}
                />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between p-4 border-t border-[#222222]">
                <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className="flex items-center space-x-2 bg-[#333333] hover:bg-[#444444] text-white rounded-full px-4 py-2 cursor-pointer"
                >
                    <Play size={16} />
                    <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                </button>

                <button
                    onClick={handleSubmit}
                    className="flex items-center space-x-2 bg-white hover:bg-gray-200 text-black rounded-full px-4 py-2 cursor-pointer"
                >
                    <Send size={16} />
                    <span>Submit Code</span>
                </button>
            </div>
        </div>
    );
};

export default CodeEditorView; 