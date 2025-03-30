"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HelpCircle, ChevronRight } from "lucide-react";
import Tooltip from "@/components/Tooltip";
import ClientLeaderboardView from "@/app/school/[id]/cohort/[cohortId]/leaderboard/ClientLeaderboardView";
import TaskTypeMetricCard from "@/components/TaskTypeMetricCard";

interface Course {
    id: number;
    name: string;
    description?: string;
    moduleCount?: number;
}

interface Member {
    id: number;
    email: string;
    role: 'learner' | 'mentor';
}

interface Cohort {
    id: number;
    org_id: number;
    name: string;
    members: Member[];
    groups: any[];
    courses?: Course[];
}

// Course metrics interface
interface CourseMetrics {
    average_completion: number;
    num_tasks: number;
    num_active_learners: number;
    task_type_metrics: {
        quiz?: {
            completion_rate: number;
            count: number;
        };
        learning_material?: {
            completion_rate: number;
            count: number;
        };
        exam?: {
            completion_rate: number;
            count: number;
        };
    };
}

interface CohortDashboardProps {
    cohort: Cohort;
    cohortId: string;
    schoolId: string;
}

export default function CohortDashboard({ cohort, cohortId, schoolId }: CohortDashboardProps) {
    // State for course metrics
    const [courseMetrics, setCourseMetrics] = useState<CourseMetrics | null>(null);
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
    const [metricsError, setMetricsError] = useState<string | null>(null);

    const fetchCourseMetrics = async () => {
        if (!cohort?.courses || cohort.courses.length === 0) {
            setIsLoadingMetrics(false);
            return;
        }

        const firstCourse = cohort.courses[0];
        setIsLoadingMetrics(true);
        setMetricsError(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/courses/${firstCourse.id}/metrics`);

            if (!response.ok) {
                throw new Error(`Failed to fetch metrics: ${response.status}`);
            }

            const metricsData: CourseMetrics = await response.json();
            setCourseMetrics(metricsData);
        } catch (error) {
            console.error("Error fetching course metrics:", error);
            setMetricsError("There was an error while fetching the metrics. Please try again.");
        } finally {
            setIsLoadingMetrics(false);
        }
    };

    // Fetch metrics when the component mounts or when cohort courses change
    useEffect(() => {
        fetchCourseMetrics();
    }, [cohort?.courses, cohortId]);

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3">
                {isLoadingMetrics ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-12 h-12 border-t-2 border-white rounded-full animate-spin"></div>
                    </div>
                ) : metricsError ? (
                    <div className="flex flex-col items-center justify-center p-8 border border-red-800 rounded-lg bg-red-900/20">
                        <p className="text-red-400 mb-2">{metricsError}</p>
                        <button
                            className="text-white bg-red-800 hover:bg-red-700 px-4 py-2 rounded-md mt-2 cursor-pointer"
                            onClick={fetchCourseMetrics}
                        >
                            Try again
                        </button>
                    </div>
                ) : courseMetrics ? (
                    <div className="flex gap-6">
                        {/* Task Completion Rate - 75% width */}
                        <div className="bg-[#111] p-8 rounded-lg w-2/3">
                            <h3 className="text-gray-400 text-sm mb-2 flex items-center">
                                <span className="inline-block">Task Completion</span>
                                <Tooltip content="Average percentage of tasks completed by a learner" position="top">
                                    <span className="ml-2 inline-flex items-center">
                                        <HelpCircle size={14} className="relative top-[0.1em]" />
                                    </span>
                                </Tooltip>
                            </h3>
                            <div className="flex items-end gap-4">
                                <span className={`text-4xl font-light ${courseMetrics.average_completion < 0.3 ? 'text-red-400' :
                                    courseMetrics.average_completion < 0.7 ? 'text-amber-400' :
                                        'text-green-400'
                                    }`}>
                                    {Math.round(courseMetrics.average_completion * 100)}%
                                </span>
                                <div className="flex-1 bg-gray-800 h-4 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${courseMetrics.average_completion < 0.3 ? 'bg-red-400' :
                                            courseMetrics.average_completion < 0.7 ? 'bg-amber-400' :
                                                'bg-green-400'
                                            }`}
                                        style={{ width: `${courseMetrics.average_completion * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            {/* Add total tasks count below the progress bar */}
                            <div className="text-xs text-gray-400 mt-2 text-right">
                                {Math.round(courseMetrics.average_completion * courseMetrics.num_tasks)} / {courseMetrics.num_tasks} tasks
                            </div>
                        </div>

                        {/* Active Learners - 25% width */}
                        <div className="bg-[#111] p-8 rounded-lg w-1/3">
                            <h3 className="text-gray-400 text-sm mb-2 flex items-center">
                                <span className="inline-block">Active Learners</span>
                                <Tooltip content="Number of learners who have attempted at least one task" position="top">
                                    <span className="ml-2 inline-flex items-center">
                                        <HelpCircle size={14} className="relative top-[0.1em]" />
                                    </span>
                                </Tooltip>
                            </h3>
                            <div className="flex items-end gap-4">
                                {/* Calculate the percentage of active learners */}
                                {(() => {
                                    const totalLearners = cohort?.members?.filter(m => m.role === 'learner').length || 0;
                                    const activePercentage = totalLearners > 0 ?
                                        (courseMetrics.num_active_learners / totalLearners) : 0;

                                    return (
                                        <span className="text-6xl font-light">
                                            <span className={`${activePercentage < 0.3 ? 'text-red-400' :
                                                activePercentage < 0.7 ? 'text-amber-400' :
                                                    'text-green-400'
                                                }`}>
                                                {courseMetrics.num_active_learners}
                                            </span>
                                            <span className="text-sm text-gray-400 ml-2">
                                                out of {totalLearners}
                                            </span>
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-[#111] rounded-lg border border-gray-800">
                        <p className="text-gray-400">No metrics available for this course</p>
                    </div>
                )}

                {/* Task Type Metrics - Ultra Simple Direct Cards */}
                {courseMetrics && (
                    <div className="mt-8">
                        <h3 className="text-gray-400 text-sm mb-4 flex items-center pl-2">
                            <span className="inline-block">Completion by Type</span>
                            <Tooltip content="Average completion by a learner for each type of task" position="top">
                                <span className="ml-2 inline-flex items-center">
                                    <HelpCircle size={14} className="relative top-[0.1em]" />
                                </span>
                            </Tooltip>
                        </h3>

                        {/* Empty state */}
                        {!courseMetrics.task_type_metrics.quiz &&
                            !courseMetrics.task_type_metrics.learning_material &&
                            !courseMetrics.task_type_metrics.exam && (
                                <div className="text-center text-gray-400 py-16 bg-[#111] rounded-lg">
                                    No task type metrics available
                                </div>
                            )}

                        {/* Cards Layout */}
                        {(courseMetrics.task_type_metrics.quiz ||
                            courseMetrics.task_type_metrics.learning_material ||
                            courseMetrics.task_type_metrics.exam) && (() => {
                                // Calculate number of available task types
                                const availableTypes = [
                                    courseMetrics.task_type_metrics.quiz,
                                    courseMetrics.task_type_metrics.learning_material,
                                    courseMetrics.task_type_metrics.exam
                                ].filter(Boolean).length;

                                // Render with the appropriate grid class based on count
                                return (
                                    <div className={`grid grid-cols-1 ${availableTypes === 1 ? 'md:grid-cols-1' :
                                        availableTypes === 2 ? 'md:grid-cols-2' :
                                            'md:grid-cols-3'
                                        } gap-4`}>
                                        {/* Quiz Card */}
                                        {courseMetrics.task_type_metrics.quiz && (
                                            <TaskTypeMetricCard
                                                title="Quiz"
                                                count={courseMetrics.task_type_metrics.quiz.count}
                                                completionRate={courseMetrics.task_type_metrics.quiz.completion_rate}
                                                color="indigo"
                                            />
                                        )}

                                        {/* Learning Material Card */}
                                        {courseMetrics.task_type_metrics.learning_material && (
                                            <TaskTypeMetricCard
                                                title="Learning Material"
                                                count={courseMetrics.task_type_metrics.learning_material.count}
                                                completionRate={courseMetrics.task_type_metrics.learning_material.completion_rate}
                                                color="purple"
                                            />
                                        )}

                                        {/* Exam Card */}
                                        {courseMetrics.task_type_metrics.exam && (
                                            <TaskTypeMetricCard
                                                title="Exam"
                                                count={courseMetrics.task_type_metrics.exam.count}
                                                completionRate={courseMetrics.task_type_metrics.exam.completion_rate}
                                                color="teal"
                                            />
                                        )}
                                    </div>
                                );
                            })()}
                    </div>
                )}
            </div>

            {/* Right side - Leaderboard */}
            <div className="lg:w-1/2 space-y-6">
                {/* Use ClientLeaderboardView */}
                <ClientLeaderboardView
                    cohortId={cohortId}
                    cohortName={cohort?.name}
                    view='admin'
                    topN={5}
                />
                {/* View All Leaderboard Button */}
                {cohort?.members?.filter(m => m.role === 'learner').length > 5 &&
                    <div className="flex justify-center mt-4">
                        <Link
                            href={`/school/${schoolId}/cohort/${cohortId}/leaderboard`}
                            className="group px-4 py-2 font-light rounded-md transition-all duration-200 flex items-center 
                            bg-white/10 hover:bg-white/15 text-gray-200 cursor-pointer"
                        >
                            <span>View Full Leaderboard</span>
                            <ChevronRight size={16} className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                }
            </div>
        </div>
    );
} 