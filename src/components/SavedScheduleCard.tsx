"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

type ScheduleItem = {
  type: string;
  task_id: number;
  milestone_id: number;
  title: string;
  duration_minutes: number;
  notes?: string;
};

type ScheduleDay = {
  date: string; // yyyy-MM-dd
  items: ScheduleItem[];
  summary?: string;
};

type ApiResponse = {
  schedule?: {
    course_id: number;
    generated_at: string;
    timezone: string;
    days: ScheduleDay[];
  };
};

interface SavedScheduleCardProps {
  courseId: string | number;
}

const SavedScheduleCard: React.FC<SavedScheduleCardProps> = ({ courseId }) => {
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/schedule/${courseId}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data: ApiResponse = await res.json();
        const fetchedDays = (data.schedule?.days || []).slice().sort((a, b) => a.date.localeCompare(b.date));
        setDays(fetchedDays);
        setTimezone(data.schedule?.timezone || "UTC");

        // Default selection: Today if present, else first upcoming, else 0
        const today = format(new Date(), "yyyy-MM-dd");
        let idx = fetchedDays.findIndex((d) => d.date === today);
        if (idx === -1) {
          idx = fetchedDays.findIndex((d) => d.date > today);
        }
        setCurrentIndex(Math.max(0, idx));
      } catch (e) {
        // Keep empty state on error
        console.error("Failed to load saved schedule:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [courseId]);

  const currentDay = days[currentIndex];

  const headerLabel = useMemo(() => {
    if (!currentDay) return "No schedule";
    const dt = parseISO(currentDay.date);
    if (isToday(dt)) return "Today";
    if (isTomorrow(dt)) return "Tomorrow";
    return format(dt, "EEE, MMM d");
  }, [currentDay]);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < Math.max(0, days.length - 1);

  return (
    <div className="sticky top-24 w-full">
      <div className="rounded-2xl border border-white/30 bg-transparent p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm tracking-wide text-white">Upcoming Sessions</div>
          <div className="text-xs text-white/60">{timezone}</div>
        </div>

        <div className="flex items-center justify-between">
          <button
            className={`px-2 py-1 rounded-full border border-white/30 text-xs ${canPrev ? "hover:bg-white/10" : "opacity-40 cursor-not-allowed"}`}
            onClick={() => canPrev && setCurrentIndex((i) => i - 1)}
            disabled={!canPrev}
            aria-label="Previous day"
          >
            ▲
          </button>

          <div className="flex-1 px-3 text-center">
            <div className="text-sm font-medium">{headerLabel}</div>
            <div className="text-xs text-white/60">
              {currentDay ? format(parseISO(currentDay.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
            </div>
          </div>

          <button
            className={`px-2 py-1 rounded-full border border-white/30 text-xs ${canNext ? "hover:bg-white/10" : "opacity-40 cursor-not-allowed"}`}
            onClick={() => canNext && setCurrentIndex((i) => i + 1)}
            disabled={!canNext}
            aria-label="Next day"
          >
            ▼
          </button>
        </div>

        <div className="mt-3 border-t border-white/10 pt-3 min-h-[120px]">
          {isLoading ? (
            <div className="text-center text-sm text-white/70">Loading…</div>
          ) : currentDay && currentDay.items && currentDay.items.length > 0 ? (
            <div className="space-y-3">
              {currentDay.summary && (
                <div className="text-xs text-white/80 bg-white/5 rounded-md px-2 py-1 inline-block">{currentDay.summary}</div>
              )}
              <ul className="space-y-2">
                {currentDay.items.map((item) => (
                  <li key={item.task_id} className="flex items-start gap-2 text-sm">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-white/80" />
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-white/60">{item.type} · {item.duration_minutes} min</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center text-sm text-white/70">No schedule</div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            className="text-xs px-2 py-1 rounded-full border border-white/30 hover:bg-white/10"
            onClick={() => {
              if (!days.length) return;
              const todayStr = format(new Date(), "yyyy-MM-dd");
              const idx = days.findIndex((d) => d.date === todayStr);
              setCurrentIndex(Math.max(0, idx === -1 ? 0 : idx));
            }}
          >
            Today
          </button>
          <button
            className="text-xs px-2 py-1 rounded-full border border-white/30 hover:bg-white/10"
            onClick={() => {
              if (!days.length) return;
              const tomorrowStr = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
              const idx = days.findIndex((d) => d.date === tomorrowStr);
              setCurrentIndex(Math.max(0, idx === -1 ? 0 : idx));
            }}
          >
            Tomorrow
          </button>
          <button
            className="text-xs px-2 py-1 rounded-full border border-white/30 hover:bg-white/10"
            onClick={() => {
              if (!days.length) return;
              const todayStr = format(new Date(), "yyyy-MM-dd");
              const idx = days.findIndex((d) => d.date > todayStr);
              setCurrentIndex(Math.max(0, idx === -1 ? 0 : idx));
            }}
          >
            Upcoming
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedScheduleCard;


