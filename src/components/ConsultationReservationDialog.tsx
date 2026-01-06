import { useState, useEffect, useMemo } from "react";
import { format, addDays, isBefore, startOfDay, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, Clock, User, GraduationCap, MessageSquare, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AcademySettings {
  consultation_start_time: string;
  consultation_end_time: string;
  slot_duration: number;
  break_start_time: string | null;
  break_end_time: string | null;
  closed_days: number[];
  temporary_closed_dates: string[];
}

interface ConsultationReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academyId: string;
  academyName: string;
  onSuccess?: () => void;
}

const defaultSettings: AcademySettings = {
  consultation_start_time: "10:00",
  consultation_end_time: "22:00",
  slot_duration: 30,
  break_start_time: null,
  break_end_time: null,
  closed_days: [0, 6], // Sunday = 0, Saturday = 6
  temporary_closed_dates: [],
};

const gradeOptions = [
  { value: "elementary-1", label: "초1" },
  { value: "elementary-2", label: "초2" },
  { value: "elementary-3", label: "초3" },
  { value: "elementary-4", label: "초4" },
  { value: "elementary-5", label: "초5" },
  { value: "elementary-6", label: "초6" },
  { value: "middle-1", label: "중1" },
  { value: "middle-2", label: "중2" },
  { value: "middle-3", label: "중3" },
  { value: "high-1", label: "고1" },
  { value: "high-2", label: "고2" },
  { value: "high-3", label: "고3" },
];

const ConsultationReservationDialog = ({
  open,
  onOpenChange,
  academyId,
  academyName,
  onSuccess,
}: ConsultationReservationDialogProps) => {
  const [step, setStep] = useState<"datetime" | "info">("datetime");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [settings, setSettings] = useState<AcademySettings>(defaultSettings);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch academy settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("academy_settings")
        .select("*")
        .eq("academy_id", academyId)
        .maybeSingle();

      if (data) {
        setSettings({
          consultation_start_time: data.consultation_start_time,
          consultation_end_time: data.consultation_end_time,
          slot_duration: data.slot_duration,
          break_start_time: data.break_start_time,
          break_end_time: data.break_end_time,
          closed_days: data.closed_days || [0, 6],
          temporary_closed_dates: data.temporary_closed_dates || [],
        });
      }
    };

    if (open && academyId) {
      fetchSettings();
    }
  }, [open, academyId]);

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUser();
  }, []);

  // Fetch booked slots when date changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate) return;

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data } = await supabase
        .from("consultation_reservations")
        .select("reservation_time")
        .eq("academy_id", academyId)
        .eq("reservation_date", dateStr)
        .in("status", ["pending", "confirmed"]);

      setBookedSlots(data?.map(r => r.reservation_time) || []);
    };

    fetchBookedSlots();
  }, [selectedDate, academyId]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: { time: string; disabled: boolean }[] = [];
    const startTime = parse(settings.consultation_start_time, "HH:mm", new Date());
    const endTime = parse(settings.consultation_end_time, "HH:mm", new Date());
    const breakStart = settings.break_start_time
      ? parse(settings.break_start_time, "HH:mm", new Date())
      : null;
    const breakEnd = settings.break_end_time
      ? parse(settings.break_end_time, "HH:mm", new Date())
      : null;

    let current = startTime;
    while (isBefore(current, endTime)) {
      const timeStr = format(current, "HH:mm");
      
      // Check if in break time
      const isBreakTime = breakStart && breakEnd && 
        !isBefore(current, breakStart) && 
        isBefore(current, breakEnd);
      
      // Check if already booked
      const isBooked = bookedSlots.includes(timeStr);

      slots.push({
        time: timeStr,
        disabled: isBreakTime || isBooked,
      });

      current = addDays(current, 0);
      current = new Date(current.getTime() + settings.slot_duration * 60 * 1000);
    }

    return slots;
  }, [settings, bookedSlots]);

  // Disable dates in calendar
  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    
    const dayOfWeek = date.getDay();
    if (settings.closed_days.includes(dayOfWeek)) return true;
    
    // Check temporary closed dates
    const dateStr = format(date, "yyyy-MM-dd");
    if (settings.temporary_closed_dates.includes(dateStr)) return true;
    
    return false;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleNext = () => {
    if (selectedDate && selectedTime) {
      setStep("info");
    }
  };

  const handleBack = () => {
    setStep("datetime");
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("로그인이 필요합니다");
      return;
    }

    if (!studentName.trim()) {
      toast.error("학생 이름을 입력해주세요");
      return;
    }

    if (!studentGrade) {
      toast.error("학년을 선택해주세요");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("날짜와 시간을 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("consultation_reservations").insert({
        academy_id: academyId,
        parent_id: userId,
        student_name: studentName.trim(),
        student_grade: studentGrade,
        reservation_date: format(selectedDate, "yyyy-MM-dd"),
        reservation_time: selectedTime,
        message: message.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("상담 예약이 완료되었습니다");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setStep("datetime");
      setSelectedDate(undefined);
      setSelectedTime(null);
      setStudentName("");
      setStudentGrade("");
      setMessage("");
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error("예약에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = selectedDate
    ? format(selectedDate, "M월 d일 (EEE)", { locale: ko })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            방문 상담 예약
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{academyName}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === "datetime" ? (
            <div className="p-4 space-y-4">
              {/* Calendar */}
              <div>
                <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  날짜 선택
                </h3>
                <div className="border border-border rounded-lg p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={isDateDisabled}
                    locale={ko}
                    className="pointer-events-auto mx-auto"
                  />
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    시간 선택
                    <span className="text-muted-foreground font-normal">
                      ({formattedDate})
                    </span>
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map(({ time, disabled }) => (
                      <button
                        key={time}
                        onClick={() => !disabled && handleTimeSelect(time)}
                        disabled={disabled}
                        className={cn(
                          "py-2 px-3 text-sm rounded-lg border transition-all",
                          disabled
                            ? "bg-muted text-muted-foreground line-through cursor-not-allowed"
                            : selectedTime === time
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  {timeSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      선택한 날짜에 예약 가능한 시간이 없습니다
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Selected DateTime Summary */}
              <div className="bg-primary/10 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">선택한 일시</p>
                  <p className="font-medium text-primary">
                    {formattedDate} {selectedTime}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  변경
                </Button>
              </div>

              {/* Student Info Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    학생 이름 *
                  </Label>
                  <Input
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="학생 이름을 입력하세요"
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentGrade" className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    학년 *
                  </Label>
                  <Select value={studentGrade} onValueChange={setStudentGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="학년을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    문의사항 (선택)
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="상담 시 전달할 내용을 입력하세요"
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t border-border p-4 bg-card">
          {step === "datetime" ? (
            <>
              {selectedDate && selectedTime && (
                <p className="text-sm text-center text-muted-foreground mb-3">
                  <span className="font-medium text-foreground">
                    {formattedDate} {selectedTime}
                  </span>
                  에 방문 상담 예약
                </p>
              )}
              <Button
                className="w-full gap-2"
                disabled={!selectedDate || !selectedTime}
                onClick={handleNext}
              >
                다음
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-center text-muted-foreground mb-3">
                <span className="font-medium text-foreground">
                  {formattedDate} {selectedTime}
                </span>
                에 방문 상담 신청
              </p>
              <Button
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={submitting || !studentName.trim() || !studentGrade}
              >
                {submitting ? "예약 중..." : (
                  <>
                    <Check className="w-4 h-4" />
                    상담 신청하기
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationReservationDialog;
