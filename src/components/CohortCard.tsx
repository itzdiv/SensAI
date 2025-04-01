import Link from "next/link";

interface CohortCardProps {
    cohort: {
        id: number;
        name: string;
    };
    schoolId?: number | string;
}

export default function CohortCard({ cohort, schoolId }: CohortCardProps) {
    // Generate a unique border color based on the cohort id
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
        return colors[cohort.id % colors.length];
    };

    return (
        <Link href={`/school/admin/${schoolId}/cohorts/${cohort.id}`} className="block h-full">
            <div className={`bg-[#1A1A1A] text-gray-300 rounded-lg p-6 h-full transition-all hover:opacity-90 cursor-pointer border-b-2 ${getBorderColor()} border-opacity-70`}>
                <h2 className="text-xl font-light mb-2">{cohort.name}</h2>
            </div>
        </Link>
    );
} 