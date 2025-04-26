import React from 'react';

interface ChatPlaceholderViewProps {
    taskType: 'quiz' | 'learning_material';
    isChatHistoryLoaded: boolean;
    isTestMode: boolean;
    inputType?: string;
    viewOnly?: boolean;
    responseType?: 'chat' | 'exam';
}

const ChatPlaceholderView: React.FC<ChatPlaceholderViewProps> = ({
    taskType,
    isChatHistoryLoaded,
    isTestMode,
    inputType = 'text',
    viewOnly = false,
    responseType = 'chat'
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full">
            {!isChatHistoryLoaded && !isTestMode ? (
                // Loading spinner while chat history is loading
                <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                </div>
            ) : (
                // Show placeholder text only when history is loaded but empty
                <>
                    <h2 className="text-4xl font-light text-white mb-6 text-center">
                        {viewOnly
                            ? 'No activity yet'
                            : taskType === 'learning_material'
                                ? 'Have a question?'
                                : responseType === 'exam'
                                    ? 'Ready to test your knowledge?'
                                    : 'Ready for a challenge?'
                        }
                    </h2>
                    <p className="text-gray-400 text-center max-w-md mx-6 sm:mx-auto mb-8">
                        {viewOnly
                            ? `There is no chat history for this quiz`
                            : taskType === 'learning_material'
                                ? `Ask your doubt here and AI will help you understand the material better`
                                : responseType === 'exam'
                                    ? (inputType === 'code'
                                        ? `Think through your answer, then write your code in the code editor. You can attempt the question only once. Be careful and confident.`
                                        : `Think through your answer, then ${inputType === 'audio' ? 'record' : 'type'} it here. You can attempt the question only once. Be careful and confident.`)
                                    : (inputType === 'code'
                                        ? `Think through your answer, then write your code in the code editor. You can also type your response below if you want to ask or say something that is not code. You will receive instant feedback and support throughout your journey`
                                        : `Think through your answer, then ${inputType === 'audio' ? 'record' : 'type'} it here. You will receive instant feedback and support throughout your journey`)
                        }
                    </p>
                </>
            )}
        </div>
    );
};

export default ChatPlaceholderView; 