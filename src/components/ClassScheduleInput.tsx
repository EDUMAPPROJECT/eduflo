import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

// Parse schedule string like "월 18:00~20:00, 수 19:00~21:00" or "월/수/금 18:00~20:00"
function parseSchedule(schedule: string): ScheduleEntry[] {
  if (!schedule) return [];
  
  // Try new format first: "월 18:00~20:00, 수 19:00~21:00"
  const entries: ScheduleEntry[] = [];
  const parts = schedule.split(",").map(p => p.trim());
  
  for (const part of parts) {
    // Match: 요일 시간~시간
    const match = part.match(/([월화수목금토일])\s*(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})/);
    if (match) {
      entries.push({
        day: match[1],
        startTime: match[2],
        endTime: match[3],
      });
    }
  }
  
  // If new format worked, return
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

// Build schedule string from entries
function buildSchedule(entries: ScheduleEntry[]): string {
  const validEntries = entries.filter(e => e.day && e.startTime && e.endTime);
  if (validEntries.length === 0) return "";
  
  // Sort by day order
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

  // Update parent when entries change
  useEffect(() => {
    const newSchedule = buildSchedule(entries);
    if (newSchedule !== value) {
      onChange(newSchedule);
    }
  }, [entries]);

  // Sync from parent value (e.g., when editing)
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

  // Get already selected days to prevent duplicates
  const selectedDays = entries.map(e => e.day).filter(Boolean);

  return (
    <div className="space-y-3">
      <Label className="text-sm">수업 일정</Label>
      
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            {/* Day Selection */}
            <Select 
              value={entry.day} 
              onValueChange={(val) => updateEntry(index, "day", val)}
            >
              <SelectTrigger className="w-[70px]">
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

            {/* Time Selection */}
            <div className="flex items-center gap-1 flex-1">
              <Input
                type="time"
                value={entry.startTime}
                onChange={(e) => updateEntry(index, "startTime", e.target.value)}
                className="flex-1 text-sm"
              />
              <span className="text-muted-foreground text-sm">~</span>
              <Input
                type="time"
                value={entry.endTime}
                onChange={(e) => updateEntry(index, "endTime", e.target.value)}
                className="flex-1 text-sm"
              />
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeEntry(index)}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
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
