import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { UsersRound } from 'lucide-react';
import CreateCohortDialog from './CreateCohortDialog';

// Define interface for CourseCohortSelectionDialog props
interface CourseCohortSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    originButtonRef: React.RefObject<HTMLButtonElement | null>;
    isPublishing: boolean;
    onConfirm: () => void;
    showLoading: boolean;
    hasError: boolean;
    errorMessage: string;
    onRetry: () => void;
    cohorts: any[]; // Using any[] for consistency with existing cohorts state
    tempSelectedCohorts: any[];
    onRemoveCohort: (cohortId: number) => void;
    onSelectCohort: (cohort: any) => void;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    searchQuery: string;
    filteredCohorts: any[];
    totalSchoolCohorts: number;
    schoolId: string;
    courseId?: string; // Add courseId for linking the new cohort
    onCohortCreated?: (cohort: any) => void; // Callback when a cohort is created and linked
    onOpenCreateCohortDialog: () => void; // New callback to open the CreateCohortDialog
}

// Add CohortSelectionDialog component
export const CourseCohortSelectionDialog = ({
    isOpen,
    onClose,
    originButtonRef,
    isPublishing,
    onConfirm,
    showLoading,
    hasError,
    errorMessage,
    onRetry,
    cohorts,
    tempSelectedCohorts,
    onRemoveCohort,
    onSelectCohort,
    onSearchChange,
    searchQuery,
    filteredCohorts,
    totalSchoolCohorts,
    schoolId,
    courseId,
    onCohortCreated,
    onOpenCreateCohortDialog,
}: CourseCohortSelectionDialogProps) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Calculate position when button or isOpen changes
    useEffect(() => {
        const updatePosition = () => {
            if (isOpen && originButtonRef.current && dropdownRef.current) {
                const buttonRect = originButtonRef.current.getBoundingClientRect();
                const windowWidth = window.innerWidth;

                // Position dropdown below button
                // Use viewport-relative position (since fixed positioning is relative to viewport)
                const top = buttonRect.bottom;

                // Calculate left position to avoid going off-screen
                // Default to aligning with left edge of button
                let left = buttonRect.left;

                // If dropdown would go off right edge, align with right edge of button instead
                const dropdownWidth = 400; // Width of dropdown from CSS
                if (left + dropdownWidth > windowWidth) {
                    left = buttonRect.right - dropdownWidth;
                }

                // Apply the new position directly to the DOM element for immediate effect
                setPosition({ top, left });
            }
        };

        // Initial position update
        updatePosition();

        // Add scroll and resize event listeners
        if (isOpen) {
            window.addEventListener('scroll', updatePosition, { passive: true });
            window.addEventListener('resize', updatePosition, { passive: true });
            // Add a more frequent position update for smoother following during scrolling
            const intervalId = setInterval(updatePosition, 16); // ~60fps

            return () => {
                window.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
                clearInterval(intervalId);
            };
        }

        return undefined;
    }, [isOpen, originButtonRef, dropdownRef]);

    // Handle clicks outside of the dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            if (dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                !(target as Element).closest('[data-dropdown-toggle="true"]')) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Update the click handler to use the new callback
    const handleCreateCohortClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onOpenCreateCohortDialog();
    };

    if (!isOpen) return null;

    const buttonText = isPublishing
        ? showLoading
            ? "Publishing..."
            : "Publish course to cohorts"
        : showLoading
            ? "Adding..."
            : "Add course to cohorts";

    return (
        <div
            ref={dropdownRef}
            className="fixed z-50 py-2 w-[400px] bg-[#1A1A1A] rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                position: 'fixed',
            }}
        >
            <div className="p-4 pb-2">
                {/* Only show search and selected cohorts when not loading */}
                {!showLoading && (
                    <>
                        {/* Only show search when there are available cohorts AND not all cohorts are selected */}
                        {!hasError && cohorts.length > 0 && cohorts.length > tempSelectedCohorts.length && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search cohorts"
                                    className="w-full bg-[#111] rounded-md px-3 py-2 text-white"
                                    value={searchQuery}
                                    onChange={onSearchChange}
                                />
                            </div>
                        )}

                        {/* Show temporarily selected cohorts */}
                        {tempSelectedCohorts.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {tempSelectedCohorts.map(cohort => (
                                    <div
                                        key={cohort.id}
                                        className="flex items-center bg-[#222] px-3 py-1 rounded-full"
                                    >
                                        <span className="text-white text-sm font-light mr-2">{cohort.name}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveCohort(cohort.id);
                                            }}
                                            className="text-gray-400 hover:text-white cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="max-h-72 overflow-y-auto py-2 px-2">
                {showLoading ? (
                    <div className="flex justify-center items-center py-6">
                        <div className="w-8 h-8 border-2 border-t-green-500 border-r-green-500 border-b-transparent border-l-transparent rounded-full animate-spin" data-testid="loading-spinner"></div>
                    </div>
                ) : hasError ? (
                    <div className="p-4 text-center">
                        <p className="text-red-400 mb-2">{errorMessage}</p>
                        <button
                            className="text-green-400 hover:text-green-300 cursor-pointer"
                            onClick={onRetry}
                        >
                            Try again
                        </button>
                    </div>
                ) : filteredCohorts.length === 0 ? (
                    <div className="p-4 text-center">
                        {totalSchoolCohorts === 0 ? (
                            // School has no cohorts at all
                            <>
                                <h3 className="text-lg text-white font-light mb-1">No cohorts available</h3>
                                <p className="text-gray-400 text-sm">Create cohorts in your school that you can publish courses to</p>
                                <button
                                    onClick={handleCreateCohortClick}
                                    className="mt-4 inline-block px-4 py-2 text-sm bg-white text-black rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    Create Cohort
                                </button>
                            </>
                        ) : totalSchoolCohorts > 0 && cohorts.length === 0 ? (
                            // All cohorts have been assigned to the course already
                            <>
                                <h3 className="text-lg text-white font-light mb-1">All cohorts selected</h3>
                                <p className="text-gray-400 text-sm">You have selected all available cohorts</p>
                                <button
                                    onClick={handleCreateCohortClick}
                                    className="mt-4 inline-block px-4 py-2 text-sm bg-white text-black rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    Create more cohorts
                                </button>
                            </>
                        ) : filteredCohorts.length === 0 && tempSelectedCohorts.length > 0 && tempSelectedCohorts.length === cohorts.length ? (
                            // All available cohorts have been temporarily selected
                            <>
                                <h3 className="text-lg text-white font-light mb-1">All cohorts selected</h3>
                                <p className="text-gray-400 text-sm">You have selected all available cohorts</p>
                            </>
                        ) : (
                            // Search returned no results
                            <>
                                <h3 className="text-lg text-white font-light mb-1">No matching cohorts</h3>
                                <p className="text-gray-400 text-sm">Try a different search term</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filteredCohorts.map(cohort => (
                            <div
                                key={cohort.id}
                                className="flex items-center px-3 py-1.5 hover:bg-[#222] rounded-md cursor-pointer"
                                onClick={() => onSelectCohort(cohort)}
                            >
                                <div className="w-6 h-6 bg-green-900 rounded-md flex items-center justify-center mr-2">
                                    <UsersRound size={14} className="text-white" />
                                </div>
                                <p className="text-white text-sm font-light">{cohort.name}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Publish/Add button at the end of the list */}
                {(filteredCohorts.length > 0 || tempSelectedCohorts.length > 0) && (
                    <div className="px-2 pt-4 pb-1">
                        <button
                            className="w-full bg-[#016037] text-white py-3 rounded-full text-sm hover:bg-[#017045] transition-colors cursor-pointer"
                            onClick={onConfirm}
                            disabled={showLoading}
                        >
                            {buttonText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};