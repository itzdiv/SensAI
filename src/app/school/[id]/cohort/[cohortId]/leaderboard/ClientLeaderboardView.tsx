"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Performer } from "@/components/TopPerformers";

export default function ClientLeaderboardView({
    cohortId,
    cohortName: initialCohortName,
    view,
    topN
}: {
    cohortId: string;
    cohortName?: string;
    view: 'learner' | 'admin'
    topN?: number;
}) {
    const router = useRouter();
    const { user } = useAuth();
    const [cohortName, setCohortName] = useState<string>(initialCohortName || "Introduction to Programming");
    const [performers, setPerformers] = useState<Performer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch leaderboard data
    useEffect(() => {
        const fetchLeaderboardData = async () => {
            if (!cohortId || !user?.id) return;

            setLoading(true);

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/leaderboard`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch leaderboard data: ${response.status}`);
                }

                const data = await response.json();

                // Transform API response to match Performer interface
                const performersData: Performer[] = data.stats.map((stat: any, index: number) => {
                    const userName = [stat.user.first_name, stat.user.last_name].filter(Boolean).join(' ') || stat.user.email;
                    return {
                        name: userName,
                        streakDays: stat.streak_count,
                        tasksSolved: stat.tasks_completed,
                        position: index + 1, // Position based on array order
                        userId: stat.user.id // Keep track of user ID for identifying current user
                    };
                });

                // Sort by tasks completed (desc) then streak days (desc)
                performersData.sort((a, b) => {
                    if (b.tasksSolved !== a.tasksSolved) {
                        return b.tasksSolved - a.tasksSolved;
                    }
                    return b.streakDays - a.streakDays;
                });

                // Update positions after sorting
                performersData.forEach((performer, index) => {
                    performer.position = index + 1;
                });

                setPerformers(performersData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching leaderboard data:", error);
                setError("Failed to load leaderboard data. Please try again.");
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, [cohortId, user?.id]);

    // Function to get the appropriate badge SVG based on position
    const getPositionBadge = (position: number) => {
        if (position === 1) {
            return "/images/leaderboard_1.svg";
        } else if (position === 2) {
            return "/images/leaderboard_2.svg";
        } else if (position === 3) {
            return "/images/leaderboard_3.svg";
        }
        return null;
    };

    // Check if a performer is the current user
    const isCurrentUser = (performer: Performer) => {
        return performer.userId === parseInt(user.id)
    };

    // Check if performer should show a medal (top 3 position AND streak > 0)
    const shouldShowMedal = (performer: Performer) => {
        return performer.position <= 3 && performer.streakDays > 0;
    };

    return (
        <div className={`${view === 'admin' ? '' : 'min-h-screen'} bg-black text-white`}>
            {view === 'learner' && <Header showCreateCourseButton={false} />}

            <main className={`container mx-auto ${view === 'admin' ? '' : 'px-4 py-8'}`}>
                {/* Back button and page title */}
                {view === 'learner' && <div className="flex mb-8">
                    <div className="flex-1 text-center">
                        <h1 className="flex">
                            <span
                                className="text-gray-400 mt-3 text-lg font-light cursor-pointer hover:text-gray-300"
                                onClick={() => router.back()}
                            >
                                {cohortName}
                            </span>
                            <span className="mx-2 text-lg mt-3 font-light text-gray-400">/</span>
                            <span className="text-4xl font-light">Leaderboard</span>
                        </h1>
                    </div>

                    {/* Empty div for flex balance */}
                    <div className="w-24"></div>
                </div>}

                {loading ? (
                    <div className="flex justify-center my-12">
                        <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="text-center my-12">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => location.reload()}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : performers.length === 0 ? (
                    <div className="text-center my-12">
                        <p className="text-gray-400 mb-4">No leaderboard data available yet.</p>
                    </div>
                ) : (
                    <div className="bg-[#121212] rounded-lg border border-gray-800 overflow-hidden">
                        {/* Column Headers */}
                        <div className={`grid ${view === 'admin' ? 'grid-cols-8' : 'grid-cols-12'} gap-2 px-4 py-4 border-b border-gray-800 bg-[#2A2000] text-sm font-light`}>
                            <div className="col-span-1 text-center">Rank</div>
                            <div className={`${view === 'admin' ? 'col-span-4' : 'col-span-5 lg:col-span-6'}`}>Learner</div>
                            <div className={`${view === 'admin' ? 'col-span-1' : 'col-span-3 lg:col-span-2'} text-center`}>Streak</div>
                            <div className={`${view === 'admin' ? 'col-span-2' : 'col-span-3 lg:col-span-3'} text-right pr-2`}>Tasks Completed</div>
                        </div>

                        {/* Performers List */}
                        <div className="divide-y divide-gray-800">
                            {performers.slice(0, topN !== undefined ? topN : performers.length).map((performer, index) => (
                                <div
                                    key={index}
                                    className={`grid ${view === 'admin' ? 'grid-cols-8' : 'grid-cols-12'} gap-2 px-4 py-4 items-center ${isCurrentUser(performer) ? 'bg-blue-900/20' : ''}`}
                                >
                                    {/* Position Column */}
                                    <div className="col-span-1 flex justify-center">
                                        {shouldShowMedal(performer) ? (
                                            <div className={`${view === 'admin' ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center`}>
                                                <Image
                                                    src={getPositionBadge(performer.position)!}
                                                    alt={`Position ${performer.position}`}
                                                    width={view === 'admin' ? 32 : 36}
                                                    height={view === 'admin' ? 32 : 36}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800/30">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-light text-base border-2 
                                                    ${isCurrentUser(performer)
                                                        ? 'text-blue-500 border-blue-500'
                                                        : 'text-gray-400 border-gray-700'}`}>
                                                    {performer.position}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Name Column */}
                                    <div className={`${view === 'admin' ? 'col-span-4' : 'col-span-5 lg:col-span-6'} flex items-center`}>
                                        <div className="font-medium text-white flex items-center">
                                            {performer.name}
                                            {isCurrentUser(performer) && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Completion Column */}
                                    <div className={`${view === 'admin' ? 'col-span-1' : 'col-span-3 lg:col-span-2'} text-center text-gray-400`}>
                                        {performer.streakDays} Day{performer.streakDays === 1 ? "" : "s"}
                                    </div>

                                    {/* Tasks Solved Column */}
                                    <div className={`${view === 'admin' ? 'col-span-2' : 'col-span-3 lg:col-span-3'} text-right pr-2 text-gray-400`}>
                                        {performer.tasksSolved}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
} 