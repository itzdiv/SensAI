"use client";

import { useAuth } from "./auth";
import { useCallback, useEffect, useState } from 'react';
import { Task, Milestone } from "@/types";
import { transformMilestonesToModules } from "./course";

// Define course interface based on your backend response
export interface Course {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  createdAt?: string;
  updatedAt?: string;
  moduleCount?: number;
  role?: string;
  org?: {
    id: number;
    name: string;
    slug: string;
  };
  org_id?: number;
  // Add other fields as needed
}

// School interface (mapped from organization in the API)
export interface School {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  url?: string;
  role?: string;
  slug?: string;
  // Add other fields as needed
}

/**
 * Hook to fetch courses for the current user
 */
export function useCourses() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch courses immediately when user ID is available
  useEffect(() => {
    if (!isAuthenticated || !user?.id || authLoading) {
      return;
    }
    
    setIsLoading(true);
    
    // Simple fetch without caching
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${user.id}/courses`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Transform the API response to match the expected format
        const formattedCourses: Course[] = data.map((course: any) => ({
          id: course.id,
          title: course.name,
          description: course.description,
          moduleCount: course.moduleCount || 0,
          role: course.role,
          org: course.org,
          org_id: course.org?.id,
          coverImage: course.coverImage,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt
        }));
        
        setCourses(formattedCourses);
      })
      .catch(err => {
        console.error('Error fetching courses:', err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user?.id, isAuthenticated, authLoading]);
  
  return {
    courses,
    isLoading,
    error
  };
}

/**
 * Hook to fetch schools for the current user
 */
export function useSchools() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch schools immediately when user ID is available
  useEffect(() => {
    if (!isAuthenticated || !user?.id || authLoading) {
      return;
    }
    
    setIsLoading(true);
    
    // Simple fetch without caching
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${user.id}/orgs`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Transform the API response to match the expected format
        const formattedSchools: School[] = data.map((org: any) => ({
          id: org.id,
          name: org.name,
          description: org.description,
          url: org.url,
          role: org.role,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt
        }));
        
        setSchools(formattedSchools);
      })
      .catch(err => {
        console.error('Error fetching schools:', err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user?.id, isAuthenticated, authLoading]);
  
  return {
    schools,
    isLoading,
    error
  };
} 

/**
 * Fetches and processes completion data for a user in a cohort
 * @param cohortId - The ID of the cohort
 * @param userId - The ID of the user
 * @returns Object containing task and question completion data
 */
export const getCompletionData = async (cohortId: number, userId: string): Promise<{
  taskCompletions: Record<string, boolean>,
  questionCompletions: Record<string, Record<string, boolean>>
}> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/${cohortId}/completion?user_id=${userId}`);

  if (!response.ok) {
      throw new Error(`Failed to fetch completion data: ${response.status}`);
  }

  const completionData = await response.json();

  // Process completion data for tasks
  const taskCompletions: Record<string, boolean> = {};
  // Process completion data for questions
  const questionCompletions: Record<string, Record<string, boolean>> = {};

  // Iterate through each task in the completion data
  Object.entries(completionData).forEach(([taskId, taskData]: [string, any]) => {
      // Store task completion status
      taskCompletions[taskId] = taskData.is_complete;

      // Store question completion status if questions exist
      if (taskData.questions && taskData.questions.length > 0) {
          const questionsMap: Record<string, boolean> = {};

          taskData.questions.forEach((question: any) => {
              questionsMap[question.question_id.toString()] = question.is_complete;
          });

          questionCompletions[taskId] = questionsMap;
      }
  });

  return { taskCompletions, questionCompletions };
}; 

/**
 * Fetches course data and transforms it into modules
 * @param courseId - The ID of the course
 * @param baseUrl - The base URL for the API request (defaults to NEXT_PUBLIC_BACKEND_URL)
 * @returns Object containing the course data and transformed modules
 * 
 * NOTE: This is a client-side function. For server components, use the version in server-api.ts
 */
export const getCourseModules = async (courseId: string, baseUrl?: string): Promise<{
  courseData: any,
  modules: any[]
}> => {
  // Determine which URL to use (server-side vs client-side)
  const apiUrl = baseUrl || process.env.NEXT_PUBLIC_BACKEND_URL;
  
  const response = await fetch(`${apiUrl}/courses/${courseId}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course data: ${response.status}`);
  }

  const courseData = await response.json();
  
  // Use the shared utility function to transform the milestones to modules
  const modules = transformMilestonesToModules(courseData.milestones);

  return { courseData, modules };
}; 