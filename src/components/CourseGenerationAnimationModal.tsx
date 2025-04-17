import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Code, Book, Users, Phone, BarChart, Bot, MessageSquare, FileCheck, Lightbulb } from 'lucide-react';

interface CourseGenerationAnimationModalProps {
    isOpen: boolean;
}

const facts = [
    {
        text: "Our AI tutor gives personalized feedback to learners",
        icon: <Bot className="w-5 h-5" />
    },
    {
        text: "Analyse speech to assess clarity, confidence, pronunciation and more",
        icon: <Zap className="w-5 h-5" />
    },
    {
        text: "Learners can run code directly within SensAI's code editor",
        icon: <Code className="w-5 h-5" />
    },
    {
        text: "Assess subjective questions with a rubric defined by you",
        icon: <FileCheck className="w-5 h-5" />
    },
    {
        text: "Publish a course to a cohort for learners to access",
        icon: <Users className="w-5 h-5" />
    },
    {
        text: "With SensAI, learners can even learn right inside their phone's browser",
        icon: <Phone className="w-5 h-5" />
    },
    {
        text: "Track learner progress in the cohort dashboard",
        icon: <BarChart className="w-5 h-5" />
    }
];

const CourseGenerationAnimationModal: React.FC<CourseGenerationAnimationModalProps> = ({ isOpen }) => {
    const [currentFactIndex, setCurrentFactIndex] = useState(0);

    // Animation for the facts
    useEffect(() => {
        if (!isOpen) return;

        const factsInterval = setInterval(() => {
            setCurrentFactIndex((prevIndex) => (prevIndex + 1) % facts.length);
        }, 4000);

        return () => clearInterval(factsInterval);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-auto"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backdropFilter: 'blur(2px)'
            }}>

            {/* Semi-transparent gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-black/90"></div>

            <div className="absolute inset-0 overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute w-full h-full">
                        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-20">
                            <defs>
                                <radialGradient id="dot-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                    <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                                </radialGradient>
                            </defs>
                            <pattern id="pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                                <circle cx="5" cy="5" r="1" fill="url(#dot-gradient)" />
                            </pattern>
                            <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern)" />
                        </svg>
                    </div>
                </div>

                {/* Animated blurred circles */}
                <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-indigo-600/20 blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-1/3 right-1/3 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl animate-pulse-slower"></div>
            </div>

            <div className="relative h-full flex flex-col items-center justify-center px-8 py-12">
                <div className="flex flex-col items-center max-w-lg">
                    {/* Animation container */}
                    <div className="mb-16 relative">
                        <div className="w-20 h-20 flex items-center justify-center relative">
                            {/* Central icon with glowing effect */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl animate-pulse-slow"></div>
                                <div className="relative z-10 bg-gradient-to-br from-indigo-400 to-indigo-600 p-5 rounded-full shadow-lg">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            {/* Orbital rings */}
                            <div className="absolute w-32 h-32 border border-white/10 rounded-full animate-spin-slow"></div>
                            <div className="absolute w-40 h-40 border border-white/5 rounded-full animate-spin-slower" style={{ animationDirection: 'reverse' }}></div>

                            {/* Orbiting dots */}
                            <div className="absolute w-32 h-32 animate-orbit-clockwise">
                                <div className="absolute top-0 left-1/2 -translate-x-1.5 -translate-y-1.5 w-3 h-3 bg-indigo-400 rounded-full shadow-glow"></div>
                            </div>
                            <div className="absolute w-40 h-40 animate-orbit-counterclockwise">
                                <div className="absolute bottom-0 left-1/2 -translate-x-1 translate-y-1 w-2 h-2 bg-blue-400 rounded-full shadow-glow"></div>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-2xl font-light text-white mb-3">Generating Your Course Plan</h3>
                    <p className="text-gray-400 text-sm mb-10">
                        Creating a comprehensive course structure designed for optimal learning
                    </p>

                    {/* Facts with fade transition */}
                    <div className="h-16 flex items-center justify-center w-full max-w-lg overflow-hidden">
                        <div className="flex items-center space-x-3 animate-fadein-out">
                            <div className="text-indigo-300 flex-shrink-0">
                                {facts[currentFactIndex].icon}
                            </div>
                            <p className="text-white/80 text-sm">{facts[currentFactIndex].text}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS for custom animations */}
            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
                
                @keyframes pulse-slower {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.08); }
                }
                
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes spin-slower {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes orbit-clockwise {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes orbit-counterclockwise {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(-360deg); }
                }
                
                @keyframes fadein-out {
                    0%, 15% { opacity: 0; transform: translateY(10px); }
                    20%, 80% { opacity: 1; transform: translateY(0); }
                    85%, 100% { opacity: 0; transform: translateY(-10px); }
                }
                
                .shadow-glow {
                    box-shadow: 0 0 10px 2px rgba(122, 122, 255, 0.3);
                }
                
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
                
                .animate-pulse-slower {
                    animation: pulse-slower 5s ease-in-out infinite;
                }
                
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
                
                .animate-spin-slower {
                    animation: spin-slower 20s linear infinite;
                }
                
                .animate-orbit-clockwise {
                    animation: orbit-clockwise 8s linear infinite;
                }
                
                .animate-orbit-counterclockwise {
                    animation: orbit-counterclockwise 12s linear infinite;
                }
                
                .animate-fadein-out {
                    animation: fadein-out 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default CourseGenerationAnimationModal; 