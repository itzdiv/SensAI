import { Task, Milestone } from "@/types";

/**
 * Fetches course data and transforms it into modules (server-side version)
 * @param courseId - The ID of the course
 * @param baseUrl - The base URL for the API request
 * @returns Object containing the course data and transformed modules
 */
export const getCourseModules = async (courseId: string): Promise<{
  courseData: any,
  modules: any[]
}> => {
  const response = await fetch(`${process.env.BACKEND_URL}/courses/${courseId}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course data: ${response.status}`);
  }

  const courseData = await response.json();
  
  // Initialize modules array
  let modules: any[] = [];

  // Check if milestones are available in the response
  if (courseData.milestones && Array.isArray(courseData.milestones)) {
    // Transform milestones to match our Module interface
    modules = courseData.milestones.map((milestone: Milestone) => {
      // Map tasks to module items if they exist
      const moduleItems: any[] = [];

      if (milestone.tasks && Array.isArray(milestone.tasks)) {
        milestone.tasks.forEach((task: Task) => {
          if (task.type === 'learning_material') {
            moduleItems.push({
              id: task.id.toString(),
              title: task.title,
              position: task.ordering,
              type: 'material',
              content: task.content || [],
              status: task.status,
              
            });
          } else if (task.type === 'quiz') {
            moduleItems.push({
              id: task.id.toString(),
              title: task.title,
              position: task.ordering,
              type: 'quiz',
              questions: task.questions || [],
              status: task.status,
              numQuestions: task.num_questions
            });
          } else if (task.type === 'exam') {
            moduleItems.push({
              id: task.id.toString(),
              title: task.title,
              position: task.ordering,
              type: 'exam',
              questions: task.questions || [],
              status: task.status,
              numQuestions: task.num_questions
            });
          }
        });

        // Sort items by position/ordering
        moduleItems.sort((a: any, b: any) => a.position - b.position);
      }

      return {
        id: milestone.id.toString(),
        title: milestone.name,
        position: milestone.ordering,
        items: moduleItems,
        isExpanded: false,
        backgroundColor: `${milestone.color}80`, // Add 50% opacity for UI display
      };
    });

    // Sort modules by position/ordering
    modules.sort((a: any, b: any) => a.position - b.position);
  }

  return { courseData, modules };
}; 