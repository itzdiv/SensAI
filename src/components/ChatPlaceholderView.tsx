import React from 'react';

interface ChatPlaceholderViewProps {
    taskType: 'quiz' | 'exam';
    isChatHistoryLoaded: boolean;
    isTestMode: boolean;
    inputType?: string;
    viewOnly?: boolean;
}

const ChatPlaceholderView: React.FC<ChatPlaceholderViewProps> = ({
    taskType,
    isChatHistoryLoaded,
    isTestMode,
    inputType = 'text',
    viewOnly = false
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
                            : taskType === 'exam'
                                ? 'Ready to test your knowledge?'
                                : 'Ready for a challenge?'
                        }
                    </h2>
                    <p className="text-gray-400 text-center max-w-md mx-auto mb-8">
                        {viewOnly
                            ? `There is no chat history for this ${taskType === 'exam' ? 'exam' : 'quiz'}`
                            : taskType === 'exam'
                                ? `Think through your answer, then ${inputType === 'audio' ? 'record' : 'type'} it here. You can attempt the question only once. Be careful and confident.`
                                : `Think through your answer, then ${inputType === 'audio' ? 'record' : 'type'} it here. You will receive instant feedback and support throughout your journey`
                        }
                    </p>
                </>
            )}
        </div>
    );
};

export default ChatPlaceholderView; 