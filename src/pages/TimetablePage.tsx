import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import { useClassEnrollments, parseScheduleMultiple, CLASS_COLORS } from "@/hooks/useClassEnrollments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleBlock {
  id: string;
  className: string;
  academyName?: string;
  day: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  colorIndex: number;
  isManual: boolean;
  academyId?: string;
}

interface ManualSchedule {
  id: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  color_index: number;
}

const TimetablePage = () => {
  const navigate = useNavigate();
  const { enrollments, loading: enrollmentsLoading, userId } = useClassEnrollments();
  const [manualSchedules, setManualSchedules] = useState<ManualSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDay, setNewDay] = useState("월");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const hours = Array.from({ length: 14 }, (_, i) => i + 9); // 09:00 ~ 22:00

  // Generate time options (15 min intervals)
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  useEffect(() => {
    const fetchManualSchedules = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("manual_schedules")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching manual schedules:", error);
      } else {
        setManualSchedules(data || []);
      }
      setLoading(false);
    };

    if (!enrollmentsLoading) {
      fetchManualSchedules();
    }
  }, [userId, enrollmentsLoading]);

  // Parse all enrolled class schedules into blocks
  const scheduleBlocks: ScheduleBlock[] = [];
  
  enrollments.forEach((enrollment, colorIndex) => {
    const entries = parseScheduleMultiple(enrollment.class?.schedule || null);
    
    entries.forEach((entry) => {
      scheduleBlocks.push({
        id: `${enrollment.class_id}-${entry.day}`,
        className: enrollment.class?.name || "강좌",
        academyName: enrollment.class?.academy?.name || "학원",
        academyId: enrollment.class?.academy?.id,
        day: entry.day,
        startHour: entry.startHour,
        startMinute: entry.startMinute,
        endHour: entry.endHour,
        endMinute: entry.endMinute,
        colorIndex,
        isManual: false,
      });
    });
  });

  // Add manual schedules
  manualSchedules.forEach((schedule, idx) => {
    const [startHour, startMinute] = schedule.start_time.split(":").map(Number);
    const [endHour, endMinute] = schedule.end_time.split(":").map(Number);
    
    scheduleBlocks.push({
      id: schedule.id,
      className: schedule.title,
      day: schedule.day,
      startHour,
      startMinute,
      endHour,
      endMinute,
      colorIndex: enrollments.length + idx,
      isManual: true,
    });
  });

  // Check if this is the starting cell for a block
  const isStartingCell = (block: ScheduleBlock, hour: number) => {
    return block.startHour === hour;
  };

  // Calculate block height in cells (considering partial hours)
  const getBlockHeight = (block: ScheduleBlock) => {
    const startTotal = block.startHour * 60 + block.startMinute;
    const endTotal = block.endHour * 60 + block.endMinute;
    return (endTotal - startTotal) / 60;
  };

  // Get top offset for a block
  const getBlockTopOffset = (block: ScheduleBlock) => {
    return (block.startMinute / 60) * 48; // 48px per hour
  };

  // Get blocks that start in a specific hour
  const getStartingBlocksForCell = (day: string, hour: number) => {
    return scheduleBlocks.filter(
      (block) => block.day === day && block.startHour === hour
    );
  };

  const handleAddSchedule = async () => {
    if (!userId || !newTitle.trim()) {
      toast.error("일정 이름을 입력해주세요");
      return;
    }

    const { data, error } = await supabase
      .from("manual_schedules")
      .insert({
        user_id: userId,
        title: newTitle.trim(),
        day: newDay,
        start_time: newStartTime,
        end_time: newEndTime,
        color_index: enrollments.length + manualSchedules.length,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding schedule:", error);
      toast.error("일정 추가에 실패했습니다");
      return;
    }

    setManualSchedules(prev => [...prev, data]);
    setShowAddDialog(false);
    setNewTitle("");
    setNewDay("월");
    setNewStartTime("09:00");
    setNewEndTime("10:00");
    toast.success("일정이 추가되었습니다");
  };

  const handleDeleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from("manual_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting schedule:", error);
      toast.error("일정 삭제에 실패했습니다");
      return;
    }

    setManualSchedules(prev => prev.filter(s => s.id !== id));
    toast.success("일정이 삭제되었습니다");
  };

  const handleBlockClick = (block: ScheduleBlock) => {
    if (block.isManual) {
      if (confirm("이 일정을 삭제하시겠습니까?")) {
        handleDeleteSchedule(block.id);
      }
    } else if (block.academyId) {
      navigate(`/academy/${block.academyId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">시간표</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Weekly Calendar */}
      <main className="max-w-lg mx-auto py-4 px-2">
        {loading || enrollmentsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[360px]">
              {/* Days Header */}
              <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-border">
                <div className="p-2" />
                {days.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-xs font-medium text-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Time Slots with Time-Tick Layout */}
              <div className="relative">
                {hours.map((hour) => {
                  const displayHour = hour > 12 ? hour - 12 : hour;
                  
                  return (
                    <div key={hour} className="relative">
                      {/* Time Label */}
                      <div className="absolute left-0 top-0.5 w-10 text-right pr-2 z-10">
                        <span className="text-xs text-muted-foreground">{displayHour}</span>
                      </div>
                      
                      {/* Grid Row */}
                      <div className="grid grid-cols-[40px_repeat(7,1fr)] border-t border-border">
                        <div className="h-12" />
                        {days.map((day) => {
                          const startingBlocks = getStartingBlocksForCell(day, hour);
                          
                          return (
                            <div
                              key={`${day}-${hour}`}
                              className="h-12 border-l border-border relative"
                            >
                              {startingBlocks.map((block) => (
                                <div
                                  key={block.id}
                                  className={`absolute left-0.5 right-0.5 z-20 rounded-md overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${CLASS_COLORS[block.colorIndex % CLASS_COLORS.length].bg}`}
                                  style={{
                                    top: `${getBlockTopOffset(block)}px`,
                                    height: `${getBlockHeight(block) * 48 - 2}px`,
                                  }}
                                  onClick={() => handleBlockClick(block)}
                                >
                                  <div className={`p-1 h-full flex flex-col ${CLASS_COLORS[block.colorIndex % CLASS_COLORS.length].text}`}>
                                    <p className="text-[10px] font-semibold leading-tight line-clamp-2">
                                      {block.className}
                                    </p>
                                    {block.academyName && (
                                      <p className="text-[8px] opacity-80 mt-auto truncate">
                                        {block.academyName}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-border" />
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        {scheduleBlocks.length > 0 && (
          <div className="mt-4 p-3 bg-card rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2">등록된 일정</p>
            <div className="flex flex-wrap gap-2">
              {enrollments.map((enrollment, idx) => (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-1.5"
                >
                  <div
                    className={`w-3 h-3 rounded-sm ${CLASS_COLORS[idx % CLASS_COLORS.length].bg}`}
                  />
                  <span className="text-xs text-foreground">
                    {enrollment.class?.name}
                  </span>
                </div>
              ))}
              {manualSchedules.map((schedule, idx) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-1.5"
                >
                  <div
                    className={`w-3 h-3 rounded-sm ${CLASS_COLORS[(enrollments.length + idx) % CLASS_COLORS.length].bg}`}
                  />
                  <span className="text-xs text-foreground">
                    {schedule.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {scheduleBlocks.length === 0 
            ? "MY CLASS에 강좌를 등록하거나 일정을 추가해주세요"
            : "강좌 클릭 시 학원 페이지로, 수동 일정 클릭 시 삭제 가능"}
        </p>
      </main>

      {/* Add Schedule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>일정 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>일정 이름</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 피아노 학원"
              />
            </div>
            <div className="space-y-2">
              <Label>요일</Label>
              <Select value={newDay} onValueChange={setNewDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}요일</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>시작 시간</Label>
                <Select value={newStartTime} onValueChange={setNewStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>종료 시간</Label>
                <Select value={newEndTime} onValueChange={setNewEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddSchedule}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default TimetablePage;
