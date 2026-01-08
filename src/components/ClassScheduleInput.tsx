import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface ClassScheduleInputProps {
  value: string;
  onChange: (value: string) => void;
}

const DAYS = [
  { key: "월", label: "월" },
  { key: "화", label: "화" },
  { key: "수", label: "수" },
  { key: "목", label: "목" },
  { key: "금", label: "금" },
  { key: "토", label: "토" },
  { key: "일", label: "일" },
];

// Parse schedule string like "월/수/금 18:00~22:00"
function parseSchedule(schedule: string): { days: string[]; startTime: string; endTime: string } {
  if (!schedule) return { days: [], startTime: "", endTime: "" };
  
  const match = schedule.match(/([월화수목금토일\/]+)\s*(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})/);
  if (!match) return { days: [], startTime: "", endTime: "" };

  const dayString = match[1];
  const startTime = match[2];
  const endTime = match[3];

  const days = dayString.includes("/") 
    ? dayString.split("/").filter(Boolean)
    : dayString.split("").filter(d => ["월", "화", "수", "목", "금", "토", "일"].includes(d));

  return { days, startTime, endTime };
}

// Build schedule string from parts
function buildSchedule(days: string[], startTime: string, endTime: string): string {
  if (days.length === 0 || !startTime || !endTime) return "";
  return `${days.join("/")} ${startTime}~${endTime}`;
}

export default function ClassScheduleInput({ value, onChange }: ClassScheduleInputProps) {
  const parsed = parseSchedule(value);
  const [selectedDays, setSelectedDays] = useState<string[]>(parsed.days);
  const [startTime, setStartTime] = useState(parsed.startTime || "");
  const [endTime, setEndTime] = useState(parsed.endTime || "");

  // Update parent when any part changes
  useEffect(() => {
    const newSchedule = buildSchedule(selectedDays, startTime, endTime);
    if (newSchedule !== value) {
      onChange(newSchedule);
    }
  }, [selectedDays, startTime, endTime]);

  // Sync from parent value (e.g., when editing)
  useEffect(() => {
    const parsed = parseSchedule(value);
    setSelectedDays(parsed.days);
    setStartTime(parsed.startTime || "");
    setEndTime(parsed.endTime || "");
  }, [value]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => {
            const order = ["월", "화", "수", "목", "금", "토", "일"];
            return order.indexOf(a) - order.indexOf(b);
          })
    );
  };

  return (
    <div className="space-y-3">
      {/* Day Selection */}
      <div className="space-y-2">
        <Label className="text-sm">요일 선택</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label
              key={day.key}
              className={`
                flex items-center justify-center w-10 h-10 rounded-full border cursor-pointer transition-colors
                ${selectedDays.includes(day.key) 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background border-border hover:border-primary/50'
                }
              `}
            >
              <Checkbox
                checked={selectedDays.includes(day.key)}
                onCheckedChange={() => toggleDay(day.key)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{day.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Time Selection */}
      <div className="space-y-2">
        <Label className="text-sm">수업 시간</Label>
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* Preview */}
      {selectedDays.length > 0 && startTime && endTime && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          📅 {selectedDays.join("/")} {startTime}~{endTime}
        </div>
      )}
    </div>
  );
}
