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
    const [isIframeLoading, setIsIframeLoading] = useState(true);

    // Reset loading state when new content is provided
    useEffect(() => {
        if (previewContent) {
            setIsIframeLoading(true);
        }
    }, [previewContent]);

    // Create a modified HTML content with a loading indicator
    const enhancedPreviewContent = isWebPreview && previewContent ? `
        ${previewContent.replace(
        '</body>',
        `
            <style>
                #iframe-loading-indicator {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    transition: opacity 0.3s ease-out;
                }
                #iframe-loading-indicator.hidden {
                    opacity: 0;
                    pointer-events: none;
                }
                .iframe-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            <div id="iframe-loading-indicator">
                <div class="iframe-spinner"></div>
            </div>
            <script>
                // Hide the loading indicator when the page is fully loaded
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        document.getElementById('iframe-loading-indicator').classList.add('hidden');
                    }, 500); // Small delay to ensure everything is rendered
                });
            </script>
            </body>
            `
    )}
    ` : previewContent;

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
                    <div className="relative w-full h-full">
                        {isIframeLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#f3f3f3] border-t-[#3498db]"></div>
                            </div>
                        )}
                        <iframe
                            srcDoc={enhancedPreviewContent}
                            title="Code Preview"
                            className="w-full h-full bg-white"
                            sandbox="allow-scripts"
                            onLoad={() => setIsIframeLoading(false)}
                        />
                    </div>
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
    'react': `// === REACT PLAYGROUND GUIDE ===
// 
// This playground runs React 18 directly in the browser using Babel for JSX transformation.
// Here's how to use this editor effectively:
//
// 1. COMPONENT DEFINITION:
//    - Define your components using either function or class syntax
//    - Example: function MyComponent() { return <div>Hello</div>; }
//
// 2. USING HOOKS:
//    - React hooks work normally (useState, useEffect, etc.)
//    - Access them directly from the React object (React.useState)
//
// 3. RENDERING TO DOM:
//    - IMPORTANT: Always render your main component to the "root" div
//    - Use React 18's createRoot API as shown below
// 
// 4. LIMITATIONS:
//    - No npm imports (use only built-in React functionality)
//    - Libraries like React Router won't work here
//    - For CSS, add inline styles or use the CSS tab
//
// The example below demonstrates a basic counter component:
// ======

// Define your main component
function App() {
  // Use React hooks just like in a normal React app
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", marginTop: "50px" }}>
      <h1>Hello from React!</h1>
      <p>You clicked the button {count} times</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          padding: "8px 16px",
          borderRadius: "4px",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Click me
      </button>
    </div>
  );
}

// REQUIRED: Create a root and render your App component
// This is the React 18 way of rendering components
const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

// You can add more components above the App component
// Just make sure your final component is rendered to the DOM
`,
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
    'react': 'javascript', // React uses JavaScript syntax with JSX
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
    'react': 'React',
};

const CodeEditorView: React.FC<CodeEditorViewProps> = ({
    initialCode = {},
    languages = ['javascript'],
    handleCodeSubmit,
    onCodeRun,
}) => {
    // Check if React is in the original languages array
    const hasReactLanguages = languages.some(lang =>
        lang.toLowerCase() === 'react'
    );

    console.log('Original languages:', languages);
    console.log('Has React languages:', hasReactLanguages);

    // When only React is selected, don't normalize languages (skip the mapping to JavaScript)
    let normalizedLanguages: string[];

    if (hasReactLanguages) {
        // When React is the only language, skip normalization and just use React
        normalizedLanguages = ['react'];
        console.log('Using only React tab');
    } else {
        // Otherwise normalize languages as usual
        normalizedLanguages = languages.map(lang =>
            LANGUAGE_MAPPING[lang.toLowerCase()] || lang.toLowerCase()
        ).filter((lang, index, self) =>
            // Remove duplicates
            self.indexOf(lang) === index &&
            // Ensure we have a default content for this language
            Object.keys(LANGUAGE_MAPPING).includes(lang)
        );
    }

    // Initialize code state with provided initialCode or defaults
    const [code, setCode] = useState<Record<string, string>>(() => {
        const initialState: Record<string, string> = {};

        // Add entries for all valid languages
        normalizedLanguages.forEach(lang => {
            initialState[lang] = initialCode[lang] || DEFAULT_LANGUAGE_CONTENTS[lang] || '';
        });

        return initialState;
    });

    // State for the active language tab
    const [activeLanguage, setActiveLanguage] = useState<string>(normalizedLanguages[0]);

    // Preview state
    const [previewContent, setPreviewContent] = useState<string>('');
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [output, setOutput] = useState<string>('');

    // Check if web preview is available (HTML, CSS, JS)
    const hasWebLanguages = normalizedLanguages.some(lang =>
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

    // Handle code run
    const handleCodeRun = () => {
        setIsRunning(true);
        console.log('Running code for activeLanguage:', activeLanguage);

        try {
            // For React code
            if (activeLanguage === 'react') {
                console.log('Running React code');
                // Create a basic HTML template with React and ReactDOM loaded from CDN with specific version
                const reactTemplate = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>React Preview</title>
                    <!-- Load React and ReactDOM from CDN with specific version -->
                    <script src="https://unpkg.com/react@18.2.0/umd/react.development.js"></script>
                    <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js"></script>
                    <!-- Load Babel for JSX support -->
                    <script src="https://unpkg.com/@babel/standalone@7.21.4/babel.min.js"></script>
                    ${code['css'] ? `<style>${code['css']}</style>` : ''}
                </head>
                <body>
                    <div id="root"></div>
                    <script type="text/babel">
                    ${code['react']}
                    </script>
                </body>
                </html>`;

                setPreviewContent(reactTemplate);
                setOutput('React preview updated');

                // Notify parent component
                if (onCodeRun) {
                    onCodeRun(reactTemplate, 'React preview updated');
                }

                // Delay setting isRunning to false to give time for the iframe to start loading
                setTimeout(() => {
                    setIsRunning(false);
                }, 300);
            }
            // For web-based languages, create a preview
            else if (hasWebLanguages) {
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

                // Delay setting isRunning to false to give time for the iframe to start loading
                setTimeout(() => {
                    setIsRunning(false);
                }, 300);
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

    // Get the correct Monaco editor language based on active language
    const getMonacoLanguage = (lang: string) => {
        if (lang === 'react') {
            return 'javascript'; // React uses JavaScript syntax
        }
        return lang;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Language tabs */}
            {normalizedLanguages.length > 0 ? (
                <div className="flex items-center overflow-x-auto bg-[#1D1D1D] hide-scrollbar">
                    {/* Show all language tabs */}
                    {normalizedLanguages.map((lang) => (
                        <button
                            key={lang}
                            onClick={() => {
                                console.log('Setting active language to:', lang);
                                setActiveLanguage(lang);
                            }}
                            className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${activeLanguage === lang
                                ? 'bg-[#2D2D2D] text-white border-b-2 border-white'
                                : 'text-gray-400 hover:text-white hover:bg-[#222222]'
                                }`}
                        >
                            {LANGUAGE_DISPLAY_NAMES[lang] || lang}
                        </button>
                    ))}
                </div>
            ) : null}

            {/* Code editor (without preview) */}
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    language={getMonacoLanguage(activeLanguage)}
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
                    onClick={handleCodeRun}
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