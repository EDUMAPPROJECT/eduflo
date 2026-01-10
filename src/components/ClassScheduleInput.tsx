import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface ScheduleEntry {
  day: string;
  startTime: string;
  endTime: string;
}

interface ClassScheduleInputProps {
  value: string;
  onChange: (value: string) => void;
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

// Generate hour options (0-23)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

// Generate minute options (0, 15, 30, 45)
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

// Helper to split time string into hour and minute
const splitTime = (time: string): { hour: string; minute: string } => {
  if (!time) return { hour: "", minute: "" };
  const [hour, minute] = time.split(":");
  return { hour: hour || "", minute: minute || "" };
};

// Helper to combine hour and minute into time string
const combineTime = (hour: string, minute: string): string => {
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
};

// Parse schedule string like "월 18:00~20:00, 수 19:00~21:00" or "월/수/금 18:00~20:00"
function parseSchedule(schedule: string): ScheduleEntry[] {
  if (!schedule) return [];
  
  const entries: ScheduleEntry[] = [];
  const parts = schedule.split(",").map(p => p.trim());
  
  for (const part of parts) {
    const match = part.match(/([월화수목금토일])\s*(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})/);
    if (match) {
      entries.push({
        day: match[1],
        startTime: match[2],
        endTime: match[3],
      });
    }
  }
  
  if (entries.length > 0) return entries;
  
  // Try old format: "월/수/금 18:00~20:00"
  const oldMatch = schedule.match(/([월화수목금토일\/]+)\s*(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})/);
  if (oldMatch) {
    const dayString = oldMatch[1];
    const startTime = oldMatch[2];
    const endTime = oldMatch[3];
    
    const days = dayString.includes("/") 
      ? dayString.split("/").filter(Boolean)
      : dayString.split("").filter(d => DAYS.includes(d));
    
    return days.map(day => ({ day, startTime, endTime }));
  }
  
  return [];
}

function buildSchedule(entries: ScheduleEntry[]): string {
  const validEntries = entries.filter(e => e.day && e.startTime && e.endTime);
  if (validEntries.length === 0) return "";
  
  const sorted = [...validEntries].sort((a, b) => 
    DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
  );
  
  return sorted.map(e => `${e.day} ${e.startTime}~${e.endTime}`).join(", ");
}

export default function ClassScheduleInput({ value, onChange }: ClassScheduleInputProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>(() => {
    const parsed = parseSchedule(value);
    return parsed.length > 0 ? parsed : [{ day: "", startTime: "", endTime: "" }];
  });

  useEffect(() => {
    const newSchedule = buildSchedule(entries);
    if (newSchedule !== value) {
      onChange(newSchedule);
    }
  }, [entries]);

  useEffect(() => {
    const parsed = parseSchedule(value);
    if (parsed.length > 0) {
      setEntries(parsed);
    } else if (!value) {
      setEntries([{ day: "", startTime: "", endTime: "" }]);
    }
  }, [value]);

  const updateEntry = (index: number, field: keyof ScheduleEntry, newValue: string) => {
    setEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: newValue } : entry
    ));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, { day: "", startTime: "", endTime: "" }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) {
      setEntries([{ day: "", startTime: "", endTime: "" }]);
    } else {
      setEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const selectedDays = entries.map(e => e.day).filter(Boolean);

  return (
    <div className="space-y-3">
      <Label className="text-sm">수업 일정</Label>
      
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const startTimeParts = splitTime(entry.startTime);
          const endTimeParts = splitTime(entry.endTime);
          
          return (
            <div key={index} className="flex items-center gap-0.5 p-1.5 bg-muted/30 rounded-lg">
              {/* Day Selection */}
              <Select 
                value={entry.day} 
                onValueChange={(val) => updateEntry(index, "day", val)}
              >
                <SelectTrigger className="w-[52px] h-8 px-1.5 text-xs shrink-0">
                  <SelectValue placeholder="요일" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem 
                      key={day} 
                      value={day}
                      disabled={selectedDays.includes(day) && entry.day !== day}
                    >
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Start Time - Hour */}
              <Select 
                value={startTimeParts.hour} 
                onValueChange={(val) => updateEntry(index, "startTime", combineTime(val, startTimeParts.minute || "00"))}
              >
                <SelectTrigger className="w-[48px] h-8 px-1 text-xs shrink-0">
                  <SelectValue placeholder="시" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {HOUR_OPTIONS.map((hour) => (
                    <SelectItem key={hour} value={hour} className="text-xs">
                      {hour}시
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Start Time - Minute */}
              <Select 
                value={startTimeParts.minute} 
                onValueChange={(val) => updateEntry(index, "startTime", combineTime(startTimeParts.hour || "00", val))}
              >
                <SelectTrigger className="w-[48px] h-8 px-1 text-xs shrink-0">
                  <SelectValue placeholder="분" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map((minute) => (
                    <SelectItem key={minute} value={minute} className="text-xs">
                      {minute}분
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground text-xs px-0.5">~</span>

              {/* End Time - Hour */}
              <Select 
                value={endTimeParts.hour} 
                onValueChange={(val) => updateEntry(index, "endTime", combineTime(val, endTimeParts.minute || "00"))}
              >
                <SelectTrigger className="w-[48px] h-8 px-1 text-xs shrink-0">
                  <SelectValue placeholder="시" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {HOUR_OPTIONS.map((hour) => (
                    <SelectItem key={hour} value={hour} className="text-xs">
                      {hour}시
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* End Time - Minute */}
              <Select 
                value={endTimeParts.minute} 
                onValueChange={(val) => updateEntry(index, "endTime", combineTime(endTimeParts.hour || "00", val))}
              >
                <SelectTrigger className="w-[48px] h-8 px-1 text-xs shrink-0">
                  <SelectValue placeholder="분" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map((minute) => (
                    <SelectItem key={minute} value={minute} className="text-xs">
                      {minute}분
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 ml-0.5"
                onClick={() => removeEntry(index)}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Add Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1"
        onClick={addEntry}
        disabled={entries.length >= 7}
      >
        <Plus className="h-4 w-4" />
        수업 추가
      </Button>

      {/* Preview */}
      {entries.some(e => e.day && e.startTime && e.endTime) && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          📅 {buildSchedule(entries)}
        </div>
      )}
    </div>
  );
}
