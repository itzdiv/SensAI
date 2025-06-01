import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { Trash2, Plus, X, Info, HelpCircle, Copy, RefreshCw, Save, Check } from 'lucide-react';
import { CriterionData } from './ScorecardPickerDialog';
import './scorecard-styles.css'; // We'll create this CSS file
import SimpleTooltip from './SimpleTooltip';
import Toast from './Toast'; // Import the Toast component
import Tooltip from './Tooltip'; // Import the Tooltip component

interface ScorecardProps {
    name: string;
    criteria: CriterionData[];
    onDelete?: () => void;
    readOnly?: boolean;
    linked: boolean;
    onChange?: (criteria: CriterionData[]) => void;
    onNameChange?: (newName: string) => void;
    onDuplicate?: () => void; // New prop for duplicating the scorecard
    onSave?: () => void; // New prop for saving published scorecard changes
    new?: boolean; // New prop to indicate if the scorecard is new
    scorecardId?: string; // New prop for scorecard ID
    allQuestions?: any[]; // New prop to pass all questions for checking usage
    originalName?: string; // Original name for change detection
    originalCriteria?: CriterionData[]; // Original criteria for change detection
}

export interface ScorecardHandle {
    focusName: () => void;
}

// Interface to track which cell is being edited
interface EditingCell {
    rowIndex: number;
    field: 'name' | 'description' | 'maxScore' | 'minScore';
}

const Scorecard = forwardRef<ScorecardHandle, ScorecardProps>(({
    name,
    criteria,
    onDelete,
    readOnly = false,
    linked = false,
    onChange,
    onNameChange,
    onDuplicate,
    onSave,
    new: isNew = false,
    scorecardId,
    allQuestions = [],
    originalName,
    originalCriteria
}, ref) => {
    const nameRef = useRef<HTMLInputElement>(null);
    // State to track which cell is being edited
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    // State to track the current value being edited
    const [editValue, setEditValue] = useState<string>('');
    // State to track name input value for controlled component
    const [nameValue, setNameValue] = useState<string>(name || '');
    // State for Toast notification
    const [toast, setToast] = useState({
        show: false,
        title: '',
        description: '',
        emoji: ''
    });
    // State to track highlighted fields
    const [highlightedField, setHighlightedField] = useState<{ index: number, field: 'name' | 'description' } | null>(null);

    // Update nameValue when prop changes
    useEffect(() => {
        setNameValue(name || '');
    }, [name]);

    // Listen for highlight-criterion events
    useEffect(() => {
        const handleHighlightCriterion = (event: CustomEvent) => {
            const { index, field } = event.detail;

            // Set the highlighted field - we only need the index now since we highlight the whole row
            setHighlightedField({ index, field });

            // Clear the highlight after 4 seconds
            setTimeout(() => {
                setHighlightedField(null);
            }, 4000);
        };

        // Add event listener
        document.addEventListener('highlight-criterion', handleHighlightCriterion as EventListener);

        // Clean up
        return () => {
            document.removeEventListener('highlight-criterion', handleHighlightCriterion as EventListener);
        };
    }, []);

    // Auto-hide toast after 5 seconds
    useEffect(() => {
        let toastTimer: NodeJS.Timeout | null = null;

        if (toast.show) {
            toastTimer = setTimeout(() => {
                closeToast();
            }, 5000); // 5 seconds
        }

        // Clean up timeout when component unmounts or toast state changes
        return () => {
            if (toastTimer) {
                clearTimeout(toastTimer);
            }
        };
    }, [toast.show]);

    // Expose the focusName method to parent components
    useImperativeHandle(ref, () => ({
        focusName: () => {
            if (nameRef.current) {
                nameRef.current.focus();
                // Select all text to make it easy to replace
                nameRef.current.select();
            }
        }
    }));

    // Function to add a new criterion
    const handleAddCriterion = () => {
        if (!onChange) return;

        const newCriterion: CriterionData = {
            name: '',
            description: '',
            maxScore: 5,
            minScore: 1
        };

        const updatedCriteria = [...(criteria || []), newCriterion];
        onChange(updatedCriteria);
    };

    // Function to delete a criterion by index
    const handleDeleteCriterion = (indexToDelete: number) => {
        if (!onChange) return;

        const updatedCriteria = criteria.filter((_, index) => index !== indexToDelete);
        onChange(updatedCriteria);
    };

    // Function to close toast
    const closeToast = () => {
        setToast(prev => ({ ...prev, show: false }));
    };

    // Function to start editing a cell
    const startEditing = (rowIndex: number, field: 'name' | 'description' | 'maxScore' | 'minScore') => {
        const value = field === 'maxScore' || field === 'minScore'
            ? criteria[rowIndex][field].toString()
            : criteria[rowIndex][field] || '';

        setEditingCell({ rowIndex, field });
        setEditValue(value);
    };

    // Function to save changes when editing is complete
    const saveChanges = () => {
        if (!editingCell || !onChange) return;

        const { rowIndex, field } = editingCell;
        const updatedCriteria = [...criteria];

        if (field === 'maxScore' || field === 'minScore') {
            // Convert to number and validate
            const numberValue = parseInt(editValue, 10);
            if (!isNaN(numberValue) && numberValue >= 0) {
                // Check for min/max score relationship
                if (field === 'minScore' && numberValue >= criteria[rowIndex].maxScore) {
                    // Show toast notification
                    setToast({
                        show: true,
                        title: 'Invalid Value',
                        description: 'Minimum score must be less than the maximum score',
                        emoji: '⚠️'
                    });
                    setEditingCell(null);
                    return; // Don't save the invalid value
                }

                if (field === 'maxScore' && numberValue <= criteria[rowIndex].minScore) {
                    // Show toast notification
                    setToast({
                        show: true,
                        title: 'Invalid Value',
                        description: 'Maximum score must be greater than the minimum score',
                        emoji: '⚠️'
                    });
                    setEditingCell(null);
                    return; // Don't save the invalid value
                }

                updatedCriteria[rowIndex] = {
                    ...updatedCriteria[rowIndex],
                    [field]: numberValue
                };
            }
        } else {
            updatedCriteria[rowIndex] = {
                ...updatedCriteria[rowIndex],
                [field]: editValue
            };
        }

        onChange(updatedCriteria);
        setEditingCell(null);
    };

    // Handle key press events in the edit inputs
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (editingCell?.field === 'description') {
                // For descriptions, only save on Ctrl+Enter
                if (e.ctrlKey) {
                    saveChanges();
                }
                // Otherwise allow line breaks (default textarea behavior)
            } else {
                // For other fields, save on Enter
                saveChanges();
            }
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    // Check if this scorecard is used by multiple questions
    const isUsedByMultipleQuestions = useMemo(() => {
        if (!scorecardId || !allQuestions.length) return false;

        // Count how many questions use this scorecard ID
        const usageCount = allQuestions.filter(question =>
            question.config?.scorecardData?.id === scorecardId
        ).length;

        return usageCount > 1;
    }, [scorecardId, allQuestions]);

    // Check if the scorecard has been modified (for published scorecards)
    const hasChanges = useMemo(() => {
        // Only check for changes if we have original data and this is not a new scorecard
        if (!originalName || !originalCriteria || isNew) return false;

        // Check if name has changed
        if (nameValue !== originalName) return true;

        // Check if criteria length has changed
        if (criteria.length !== originalCriteria.length) return true;

        // Check if any criterion has changed
        for (let i = 0; i < criteria.length; i++) {
            const current = criteria[i];
            const original = originalCriteria[i];

            if (!original) return true; // New criterion added

            if (current.name !== original.name ||
                current.description !== original.description ||
                current.minScore !== original.minScore ||
                current.maxScore !== original.maxScore) {
                return true;
            }
        }

        return false;
    }, [nameValue, criteria, originalName, originalCriteria, isNew]);

    // Determine if save button should be shown
    const shouldShowSaveButton = !isNew && hasChanges && onSave;

    // Determine if banner should be shown
    const shouldShowBanner = !readOnly && isNew && (linked || isUsedByMultipleQuestions);

    return (
        <div className="w-full">
            {/* Toast notification */}
            <Toast
                show={toast.show}
                title={toast.title}
                description={toast.description}
                emoji={toast.emoji}
                onClose={closeToast}
            />

            <div className="w-full bg-[#2F2F2F] rounded-lg shadow-xl p-2">
                {/* Linked Scorecard Banner */}
                {shouldShowBanner && (
                    <div className="mb-3 bg-[#2A2A2A] border border-red-400/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                                <div className="flex-shrink-0">
                                    <RefreshCw size={16} className="text-red-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-red-300 mb-1">Synced Scorecard</div>
                                    <div className="text-xs text-red-200">
                                        This scorecard is synced across multiple questions - any changes made here will apply to all questions in this quiz using this scorecard
                                    </div>
                                    <div className="text-xs text-red-200">
                                        To update this scorecard only for this question without affecting others, duplicate it and make changes to it
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header with name */}
                <div className="p-5 pb-3 bg-[#1F1F1F] mb-2">
                    {/* NEW pill */}
                    {isNew && (
                        <div className="mb-3">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-700 text-white">
                                NEW
                            </span>
                        </div>
                    )}

                    <div className="flex items-center mb-4">
                        <input
                            ref={nameRef}
                            type="text"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            placeholder="Scorecard Name"
                            className={`text-white text-lg font-normal bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-b focus:border-white/50 w-full max-w-full`}
                            style={{ caretColor: 'white' }}
                            onBlur={(e) => onNameChange && onNameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && onNameChange) {
                                    e.currentTarget.blur();
                                    onNameChange(e.currentTarget.value);
                                }
                            }}
                        />

                        <div className="ml-4 flex items-center space-x-2">
                            {/* Save scorecard button - only show for modified published scorecards */}
                            {shouldShowSaveButton && (
                                <Tooltip content="Save changes" position="bottom">
                                    <button
                                        onClick={onSave}
                                        className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer"
                                        aria-label="Save scorecard changes"
                                    >
                                        Save
                                    </button>
                                </Tooltip>
                            )}

                            {/* Duplicate scorecard button - only show for linked scorecards */}
                            {onDuplicate && (
                                <Tooltip content="Duplicate" position="bottom">
                                    <button
                                        onClick={onDuplicate}
                                        className="flex items-center justify-center p-2 rounded-full hover:bg-[#333] text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                                        aria-label="Duplicate scorecard"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </Tooltip>
                            )}

                            {/* Delete scorecard button */}
                            <Tooltip content="Delete" position="bottom">
                                <button
                                    onClick={onDelete}
                                    className="flex items-center justify-center p-2 rounded-full hover:bg-[#4F2828] text-gray-400 hover:text-red-300 transition-colors cursor-pointer"
                                    aria-label="Delete scorecard"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 80px 80px 40px' }} className="gap-2 mb-2 text-xs text-gray-300">
                        <div className="px-2 flex items-center">
                            Parameter
                            <div className="relative ml-1 text-gray-500 hover:text-gray-300 cursor-pointer group">
                                <HelpCircle size={12} />
                                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block px-3 py-1.5 rounded bg-gray-900 text-white text-xs whitespace-nowrap z-[10000]">
                                    The specific aspect or skill being evaluated in this scorecard
                                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                                </div>
                            </div>
                        </div>
                        <div className="px-2 flex items-center">
                            Description
                            <div className="relative ml-1 text-gray-500 hover:text-gray-300 cursor-pointer group">
                                <HelpCircle size={12} />
                                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block px-3 py-1.5 rounded bg-gray-900 text-white text-xs whitespace-nowrap z-[10000]">
                                    A detailed explanation of what is being measured by this parameter
                                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                                </div>
                            </div>
                        </div>
                        <div className="px-2 text-center flex items-center justify-center">
                            Minimum
                            <div className="relative ml-1 text-gray-500 hover:text-gray-300 cursor-pointer group">
                                <HelpCircle size={12} />
                                <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 hidden group-hover:block px-3 py-1.5 rounded bg-gray-900 text-white text-xs whitespace-nowrap z-[10000]">
                                    The lowest possible score for this parameter
                                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                                </div>
                            </div>
                        </div>
                        <div className="px-2 text-center flex items-center justify-center">
                            Maximum
                            <div className="relative ml-1 text-gray-500 hover:text-gray-300 cursor-pointer group">
                                <HelpCircle size={12} />
                                <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 hidden group-hover:block px-3 py-1.5 rounded bg-gray-900 text-white text-xs whitespace-nowrap z-[10000]">
                                    The highest possible score for this parameter
                                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                                </div>
                            </div>
                        </div>
                        <div className="px-2"></div> {/* Empty header for delete button */}
                    </div>

                    {/* Criteria rows */}
                    <div className="space-y-2 mb-3">
                        {criteria?.map((criterion, index) => {
                            // Generate a unique background color for each criterion pill
                            const pillColors = ["#5E3B5D", "#3B5E4F", "#3B4E5E", "#5E3B3B", "#4F5E3B"];
                            const pillColor = pillColors[index % pillColors.length];

                            // Check if this row should be highlighted
                            const isRowHighlighted = highlightedField && highlightedField.index === index;

                            return (
                                <div
                                    key={index}
                                    style={{ display: 'grid', gridTemplateColumns: '250px 1fr 80px 80px 40px' }}
                                    className={`gap-2 rounded-md p-1 text-white ${isRowHighlighted ? 'bg-[#4D2424] outline outline-2 outline-red-400 shadow-md shadow-red-900/50 animate-pulse' : 'bg-[#2A2A2A]'}`}
                                >
                                    {/* Criterion Name Cell */}
                                    <div className="px-2 py-1 text-sm h-full flex items-center">
                                        {editingCell?.rowIndex === index && editingCell.field === 'name' ? (
                                            <div className="relative w-full flex items-center">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveChanges}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    className="bg-[#333] rounded w-full text-xs p-1 pr-6 outline-none"
                                                    style={{ caretColor: 'white' }}
                                                />
                                                <button
                                                    onClick={saveChanges}
                                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 p-0.5 rounded-sm bg-[#4A4A4A] hover:bg-[#5A5A5A] text-green-400 hover:text-green-300 transition-colors cursor-pointer"
                                                    aria-label="Save parameter name"
                                                >
                                                    <Check size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <Tooltip content="Click to edit" position="bottom">
                                                <span
                                                    className="inline-block px-2 py-0.5 rounded-full text-xs text-white whitespace-nowrap cursor-pointer hover:opacity-80 relative"
                                                    style={{ backgroundColor: pillColor }}
                                                    onClick={() => startEditing(index, 'name')}
                                                >
                                                    {criterion.name || 'Click to add name'}
                                                </span>
                                            </Tooltip>
                                        )}
                                    </div>

                                    {/* Description Cell */}
                                    <div className="px-2 py-1 text-sm flex items-start h-full">
                                        {editingCell?.rowIndex === index && editingCell.field === 'description' ? (
                                            <div className="relative w-full flex items-start">
                                                <textarea
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveChanges}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    className="bg-[#333] rounded w-full text-sm p-2 pr-6 outline-none min-h-[60px] resize-y"
                                                    style={{ caretColor: 'white', resize: 'none' }}
                                                    placeholder="Enter description"
                                                />
                                                <button
                                                    onClick={saveChanges}
                                                    className="absolute right-1 top-2 p-0.5 rounded-sm bg-[#4A4A4A] hover:bg-[#5A5A5A] text-green-400 hover:text-green-300 transition-colors cursor-pointer"
                                                    aria-label="Save description"
                                                >
                                                    <Check size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <Tooltip content="Click to edit" position="bottom">
                                                <span
                                                    className={`block break-words text-sm w-full whitespace-pre-wrap cursor-pointer hover:opacity-80 relative z-50 ${criterion.description ? '' : 'text-gray-500'}`}
                                                    onClick={() => startEditing(index, 'description')}
                                                >
                                                    {criterion.description || 'Click to add description'}
                                                </span>
                                            </Tooltip>
                                        )}
                                    </div>

                                    {/* Min Score Cell */}
                                    <div className="px-2 py-1 text-sm text-center h-full flex items-center justify-center">
                                        {editingCell?.rowIndex === index && editingCell.field === 'minScore' ? (
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveChanges}
                                                onKeyDown={handleKeyDown}
                                                autoFocus
                                                min="0"
                                                max="100"
                                                className="bg-[#333] rounded w-full text-xs p-1 outline-none text-center"
                                                style={{ caretColor: 'white' }}
                                            />
                                        ) : (
                                            <span
                                                className="block cursor-pointer hover:opacity-80 relative group"
                                                onClick={() => startEditing(index, 'minScore')}
                                            >
                                                {criterion.minScore}
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 hidden group-hover:block px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap z-[10000]">
                                                    Click to edit
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                                                </div>
                                            </span>
                                        )}
                                    </div>

                                    {/* Max Score Cell */}
                                    <div className="px-2 py-1 text-sm text-center h-full flex items-center justify-center">
                                        {editingCell?.rowIndex === index && editingCell.field === 'maxScore' ? (
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveChanges}
                                                onKeyDown={handleKeyDown}
                                                autoFocus
                                                min="0"
                                                max="100"
                                                className="bg-[#333] rounded w-full text-xs p-1 outline-none text-center"
                                                style={{ caretColor: 'white' }}
                                            />
                                        ) : (
                                            <span
                                                className="block cursor-pointer hover:opacity-80 relative group"
                                                onClick={() => startEditing(index, 'maxScore')}
                                            >
                                                {criterion.maxScore}
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 hidden group-hover:block px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap z-[10000]">
                                                    Click to edit
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                                                </div>
                                            </span>
                                        )}
                                    </div>

                                    {/* Delete Button Cell */}
                                    <div className="h-full flex items-center justify-center">
                                        {criteria.length > 1 && (
                                            <button
                                                onClick={() => handleDeleteCriterion(index)}
                                                className="p-1 rounded-full hover:bg-[#4F2828] text-gray-500 hover:text-red-300 transition-colors cursor-pointer"
                                                aria-label={`Delete parameter ${criterion.name}`}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* If no criteria, show empty state */}
                        {(!criteria || criteria.length === 0) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 80px 80px 40px' }} className="gap-2 bg-[#2A2A2A] rounded-md p-1 text-white">
                                <div className="px-2 py-1 text-sm flex items-center">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs text-white bg-[#5E3B5D]">
                                        Add parameter
                                    </span>
                                </div>
                                <div className="px-2 py-1 flex items-center">
                                    <div className="h-3 bg-[#333] rounded w-full"></div>
                                </div>
                                <div className="px-2 py-1 text-sm text-center"></div>
                                <div></div>
                            </div>
                        )}
                    </div>

                    {/* Add Criterion button - now below the criteria rows */}
                    <div className="flex justify-center mt-3">
                        <button
                            onClick={handleAddCriterion}
                            className="flex items-center px-4 py-2 rounded-full bg-[#2A2A2A] hover:bg-[#2A4A3A] text-gray-300 hover:text-green-300 transition-colors cursor-pointer"
                            aria-label="Add parameter"
                        >
                            <Plus size={14} className="mr-1" />
                            <span className="text-sm">Add</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
});

// Add display name for better debugging
Scorecard.displayName = 'Scorecard';

export default Scorecard; 