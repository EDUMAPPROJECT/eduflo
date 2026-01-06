import { useState, useEffect } from "react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Calendar, Save, Settings, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConsultationSettingsSectionProps {
  academyId: string;
}

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return [
    { value: `${hour}:00`, label: `${hour}:00` },
    { value: `${hour}:30`, label: `${hour}:30` },
  ];
}).flat();

const dayOptions = [
  { value: 0, label: "일요일" },
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" },
];

const slotDurationOptions = [
  { value: 30, label: "30분" },
  { value: 60, label: "1시간" },
];

const ConsultationSettingsSection = ({ academyId }: ConsultationSettingsSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("22:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [breakStartTime, setBreakStartTime] = useState<string | undefined>(undefined);
  const [breakEndTime, setBreakEndTime] = useState<string | undefined>(undefined);
  const [closedDays, setClosedDays] = useState<number[]>([0, 6]);
  const [temporaryClosedDates, setTemporaryClosedDates] = useState<Date[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("academy_settings")
          .select("*")
          .eq("academy_id", academyId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettingsId(data.id);
          setStartTime(data.consultation_start_time);
          setEndTime(data.consultation_end_time);
          setSlotDuration(data.slot_duration);
          setBreakStartTime(data.break_start_time || undefined);
          setBreakEndTime(data.break_end_time || undefined);
          setClosedDays(data.closed_days || [0, 6]);
          // Parse temporary closed dates
          const dates = (data.temporary_closed_dates || [])
            .map((dateStr: string) => {
              try {
                return parseISO(dateStr);
              } catch {
                return null;
              }
            })
            .filter((d: Date | null): d is Date => d !== null && !isNaN(d.getTime()));
          setTemporaryClosedDates(dates);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (academyId) {
      fetchSettings();
    }
  }, [academyId]);

  const toggleClosedDay = (day: number) => {
    setClosedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  const addTemporaryClosedDate = (date: Date | undefined) => {
    if (!date) return;
    
    const today = startOfDay(new Date());
    if (isBefore(date, today)) {
      toast.error("오늘 이전 날짜는 선택할 수 없습니다");
      return;
    }
    
    // Check if already added
    const dateStr = format(date, "yyyy-MM-dd");
    const exists = temporaryClosedDates.some(d => format(d, "yyyy-MM-dd") === dateStr);
    if (exists) {
      toast.error("이미 추가된 날짜입니다");
      return;
    }
    
    setTemporaryClosedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    setDatePickerOpen(false);
  };

  const removeTemporaryClosedDate = (dateToRemove: Date) => {
    setTemporaryClosedDates(prev => 
      prev.filter(d => format(d, "yyyy-MM-dd") !== format(dateToRemove, "yyyy-MM-dd"))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert dates to strings for storage
      const closedDateStrings = temporaryClosedDates.map(d => format(d, "yyyy-MM-dd"));
      
      const settingsData = {
        academy_id: academyId,
        consultation_start_time: startTime,
        consultation_end_time: endTime,
        slot_duration: slotDuration,
        break_start_time: breakStartTime || null,
        break_end_time: breakEndTime || null,
        closed_days: closedDays,
        temporary_closed_dates: closedDateStrings,
      };

      if (settingsId) {
        const { error } = await supabase
          .from("academy_settings")
          .update(settingsData)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("academy_settings")
          .insert(settingsData)
          .select("id")
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      toast.success("설정이 저장되었습니다");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("설정 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          상담 예약 설정
        </CardTitle>
        <CardDescription>
          학부모가 방문 상담을 예약할 수 있는 시간을 설정하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Operating Hours */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            상담 운영 시간
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">시작 시간</p>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">종료 시간</p>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Slot Duration */}
        <div className="space-y-3">
          <Label>상담 시간 단위</Label>
          <Select 
            value={slotDuration.toString()} 
            onValueChange={(v) => setSlotDuration(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {slotDurationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Break Time */}
        <div className="space-y-3">
          <Label>휴식 시간 (선택)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">시작</p>
              <Select value={breakStartTime || "none"} onValueChange={(v) => setBreakStartTime(v === "none" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="선택 안함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">종료</p>
              <Select value={breakEndTime || "none"} onValueChange={(v) => setBreakEndTime(v === "none" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="선택 안함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Closed Days */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            정기 휴무일
          </Label>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                <Checkbox
                  checked={closedDays.includes(day.value)}
                  onCheckedChange={() => toggleClosedDay(day.value)}
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Temporary Closed Dates */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            임시 휴무일
          </Label>
          <p className="text-xs text-muted-foreground">
            특정 날짜를 임시 휴무일로 지정할 수 있습니다
          </p>
          
          {/* Add Date Button */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                날짜 추가
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={undefined}
                onSelect={addTemporaryClosedDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                locale={ko}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* List of Temporary Closed Dates */}
          {temporaryClosedDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {temporaryClosedDates.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const isPast = isBefore(date, startOfDay(new Date()));
                return (
                  <Badge 
                    key={dateStr} 
                    variant={isPast ? "secondary" : "outline"}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5",
                      isPast && "opacity-50"
                    )}
                  >
                    {format(date, "M월 d일 (EEE)", { locale: ko })}
                    <button
                      type="button"
                      onClick={() => removeTemporaryClosedDate(date)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          
          {temporaryClosedDates.length === 0 && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 text-center">
              지정된 임시 휴무일이 없습니다
            </p>
          )}
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {saving ? "저장 중..." : "설정 저장"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConsultationSettingsSection;
