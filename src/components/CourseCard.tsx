import Link from "next/link";
import { useParams } from "next/navigation";

interface CourseCardProps {
    course: {
        id: string | number;
        title: string;
        role?: string;
        org_id?: number;
        org?: {
            slug: string;
        };
    };
}

export default function CourseCard({ course }: CourseCardProps) {
    const params = useParams();
    const schoolId = params?.id;

    // Generate a unique border color based on the course id
    const getBorderColor = () => {
        const colors = [
            'border-purple-500',
            'border-green-500',
            'border-pink-500',
            'border-yellow-500',
            'border-blue-500',
            'border-red-500',
            'border-indigo-500',
            'border-orange-500'
        ];

        // Handle string IDs by converting to a number
        let idNumber: number;
        if (typeof course.id === 'string') {
            // Use string hash code
            idNumber = Array.from(course.id).reduce(
                (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0
            );
            // Ensure positive number
            idNumber = Math.abs(idNumber);
        } else {
            idNumber = course.id;
        }

        return colors[idNumber % colors.length];
    };

    // Determine the correct link path
    const getLinkPath = () => {
        // If this is a learner course (role is not admin), use the school slug path
        if (course.role && course.role !== 'admin' && course.org?.slug) {
            return `/school/${course.org.slug}`;
        }
        // If we have an org_id from the API, use that for the school-specific course path
        else if (course.org_id) {
            return `/school/admin/${course.org_id}/courses/${course.id}`;
        }
        // If we're in a school context, use the school-specific course path
        else if (schoolId) {
            return `/school/admin/${schoolId}/courses/${course.id}`;
        }
        // Otherwise use the general course path
        return `/courses/${course.id}`;
    };

    return (
        <Link href={getLinkPath()} className="block h-full">
            <div className={`bg-[#1A1A1A] text-gray-300 rounded-lg p-6 h-full transition-all hover:opacity-90 cursor-pointer border-b-2 ${getBorderColor()} border-opacity-70`}>
                <h2 className="text-xl font-light mb-2">{course.title}</h2>
            </div>
        </Link>
    );
} 