"use client";

import React, { useState, useMemo, FC, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, X, ListChecks, BookOpen, BrainCircuit } from 'lucide-react';
import { useParams } from 'next/navigation';

interface ScheduleItem {
    type: 'learning' | 'quiz' | 'project' | string;
    task_id: number;
    milestone_id: number;
    title: string;
    duration_minutes: number;
    notes?: string;
}

interface ScheduleDay {
    date: string;
    items: ScheduleItem[];
    summary?: string;
}

interface ApiResponse {
    schedule: {
        course_id: number;
        generated_at: string;
        timezone: string;
        days: ScheduleDay[];
    };
}

type ProcessedSchedule = {
    [date: string]: ScheduleDay;
};

interface ScheduleRequest {
    start_date?: string;
    include_weekends?: boolean;
    exclude_weekdays?: number[];
    exclude_dates?: string[];
    hours_per_day?: number;
    days_per_week?: number;
    timezone?: string;
}

const Button: FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }> = ({ children, className, variant = 'primary', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none';
    const variantClasses = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
        secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
        ghost: 'bg-transparent hover:bg-slate-700 text-slate-300',
    } as const;
    return <button className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`} {...props}>{children}</button>;
};

const Input: FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
    <input className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 ring-offset-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 ${className || ''}`} {...props} />
);

const Select: FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => (
    <select className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 ring-offset-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 ${className || ''}`} {...props}>{children}</select>
);

const TaskIcon: FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'learning': return <BookOpen className="h-4 w-4 mr-2 text-blue-400" />;
        case 'quiz': return <ListChecks className="h-4 w-4 mr-2 text-yellow-400" />;
        case 'project': return <BrainCircuit className="h-4 w-4 mr-2 text-purple-400" />;
        default: return null;
    }
};

const CourseScheduler: FC = () => {
    const params = useParams<{ id: string; courseId: string }>();
    const courseId = params?.courseId;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [startDate, setStartDate] = useState<string>('');
    const [includeWeekends, setIncludeWeekends] = useState(false);
    const [excludeWeekdays, setExcludeWeekdays] = useState<number[]>([0, 6]);
    const [excludeDates, setExcludeDates] = useState<string[]>([]);
    const [hoursPerDay, setHoursPerDay] = useState(2);
    const [daysPerWeek, setDaysPerWeek] = useState(5);
    const [timezone, setTimezone] = useState('UTC');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [scheduledTasks, setScheduledTasks] = useState<ProcessedSchedule>({});
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    useEffect(() => {
        if (!startDate) {
            setStartDate(format(new Date(), 'yyyy-MM-dd'));
        }
    }, [startDate]);

    useEffect(() => {
        if (includeWeekends) {
            setExcludeWeekdays(prev => prev.filter(d => d !== 0 && d !== 6));
        } else {
            setExcludeWeekdays(prev => [...new Set([...prev, 0, 6])]);
        }
    }, [includeWeekends]);

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const startDateOfWeek = startOfWeek(monthStart);
        const endDateOfWeek = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: startDateOfWeek, end: endDateOfWeek });
    }, [currentDate]);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timezones = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'Asia/Tokyo'];

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleWeekdayToggle = (dayIndex: number) => {
        const isExcluded = excludeWeekdays.includes(dayIndex);
        if (isExcluded && (dayIndex === 0 || dayIndex === 6)) {
            setIncludeWeekends(true);
        }
        setExcludeWeekdays(prev => isExcluded ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
    };

    const handleDateClick = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        setExcludeDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
    };

    const handleAddExcludedDate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateStr = e.target.value;
        if (dateStr && !excludeDates.includes(dateStr)) {
            setExcludeDates(prev => [...prev, dateStr]);
            e.target.value = '';
        }
    };

    const removeExcludedDate = (dateToRemove: string) => {
        setExcludeDates(prev => prev.filter(date => date !== dateToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;
        setIsLoading(true);
        setScheduledTasks({});

        const requestBody: ScheduleRequest = {
            start_date: startDate || undefined,
            include_weekends: includeWeekends,
            exclude_weekdays: excludeWeekdays,
            exclude_dates: excludeDates,
            hours_per_day: hoursPerDay,
            days_per_week: daysPerWeek,
            timezone: timezone,
        };

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/generate/course/${courseId}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            if (!res.ok) throw new Error(`Failed: ${res.status}`);
            const data: ApiResponse = await res.json();
            const scheduleMap = (data.schedule?.days || []).reduce((acc, day) => {
                acc[day.date] = day;
                return acc;
            }, {} as ProcessedSchedule);
            setScheduledTasks(scheduleMap);
        } catch (err) {
            console.error('Failed to generate schedule:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePersist = async () => {
        if (!courseId) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/generate/course/${courseId}/schedule?persist=true`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error(`Failed: ${res.status}`);
            const data: ApiResponse & { success?: boolean } = await res.json();
            const scheduleMap = (data.schedule?.days || []).reduce((acc, day) => {
                acc[day.date] = day;
                return acc;
            }, {} as ProcessedSchedule);
            setScheduledTasks(scheduleMap);
        } catch (e) {
            console.error('Failed to save schedule:', e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-900 text-slate-50 min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => history.back()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-transparent border border-white/40 hover:bg-white/10 rounded-full cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </button>
                        <h1 className="text-3xl font-light">AI Course Scheduler</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePersist}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:opacity-90 rounded-full cursor-pointer disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-slate-800/50 rounded-xl shadow-2xl p-6 border border-slate-700" style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex items-center justify-between mb-4">
                            <Button onClick={handlePrevMonth} variant="ghost" className="p-2"><ChevronLeft className="h-6 w-6" /></Button>
                            <h2 className="text-xl font-semibold text-center">{format(currentDate, 'MMMM yyyy')}</h2>
                            <Button onClick={handleNextMonth} variant="ghost" className="p-2"><ChevronRight className="h-6 w-6" /></Button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-slate-400 mb-2">
                            {weekdays.map(day => <div key={day}>{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-grow">
                            {calendarDays.map((day, i) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const dayNumber = getDay(day);
                                const scheduledDay = scheduledTasks[dayStr];
                                const isExcluded = excludeDates.includes(dayStr) || excludeWeekdays.includes(dayNumber);

                                const cellClasses = [
                                    'relative flex items-center justify-center rounded-lg transition-all duration-200 ease-in-out h-full',
                                    isSameMonth(day, currentDate) ? 'text-slate-50' : 'text-slate-500',
                                    isToday(day) && 'bg-indigo-600/50 text-white font-bold',
                                    scheduledDay && !isExcluded && 'bg-green-500/20 border border-green-500',
                                    isExcluded && 'bg-red-500/20 line-through text-slate-400',
                                    !isToday(day) && !isExcluded && 'hover:bg-slate-700 cursor-pointer',
                                ];

                                return (
                                    <div
                                        key={i}
                                        className={cellClasses.filter(Boolean).join(' ')}
                                        onClick={() => handleDateClick(day)}
                                        onMouseEnter={() => scheduledDay && setHoveredDate(dayStr)}
                                        onMouseLeave={() => setHoveredDate(null)}
                                    >
                                        <span>{format(day, 'd')}</span>
                                        {scheduledDay && !isExcluded && <div className="absolute bottom-1.5 h-1.5 w-1.5 bg-green-400 rounded-full"></div>}
                                        {hoveredDate === dayStr && scheduledDay && (
                                            <div className="absolute z-10 bottom-full mb-2 w-64 p-3 bg-slate-900 border border-slate-600 rounded-lg shadow-xl text-left">
                                                {scheduledDay.summary && <p className="font-bold text-indigo-400 mb-2 pb-2 border-b border-slate-700">{scheduledDay.summary}</p>}
                                                <ul className="space-y-2">
                                                    {scheduledDay.items.map(item => (
                                                        <li key={item.task_id} className="flex items-start text-sm">
                                                            <TaskIcon type={item.type} />
                                                            <div>
                                                                <span className="font-semibold text-slate-200">{item.title}</span>
                                                                <span className="text-slate-400 ml-2">({item.duration_minutes} min)</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800/50 rounded-xl shadow-2xl p-6 border border-slate-700">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Exclude Weekdays</label>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                {weekdays.map((day, i) => (
                                    <button type="button" key={i} onClick={() => handleWeekdayToggle(i)} className={`p-2 rounded-md text-xs font-bold transition-colors ${excludeWeekdays.includes(i) ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Exclude Specific Dates</label>
                            <Input type="date" onChange={handleAddExcludedDate} placeholder="Add a date to exclude..." />
                            <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {excludeDates.map(date => (
                                    <span key={date} className="flex items-center gap-1.5 bg-slate-700 text-xs font-medium px-2 py-1 rounded-full">
                                        {date}
                                        <button type="button" onClick={() => removeExcludedDate(date)} className="text-slate-400 hover:text-white"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                            <label htmlFor="include-weekends" className="text-sm font-medium text-slate-300">Include Weekends</label>
                            <button type="button" role="switch" aria-checked={includeWeekends} onClick={() => setIncludeWeekends(!includeWeekends)} className={`${includeWeekends ? 'bg-indigo-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800`}>
                                <span className={`${includeWeekends ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Study Plan</label>
                            <div className="flex items-center gap-2">
                                <Input type="number" value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} min="1" />
                                <span className="text-slate-400">hours/day</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Days per week</label>
                            <Input type="number" value={daysPerWeek} onChange={e => setDaysPerWeek(Number(e.target.value))} min="1" max="7" />
                        </div>

                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                            <Select id="timezone" value={timezone} onChange={e => setTimezone(e.target.value)}>
                                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </Select>
                        </div>

                        <Button type="submit" className="w-full py-3 text-base" disabled={isLoading}>
                            {isLoading ? 'Generating...' : 'Generate AI Schedule'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CourseScheduler;


