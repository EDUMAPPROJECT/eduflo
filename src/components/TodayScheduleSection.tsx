import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseScheduleMultiple, CLASS_COLORS } from "@/hooks/useClassEnrollments";

interface TodayClass {
  id: string;
  className: string;
  academyName: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  colorIndex: number;
}

type ScheduleStatus = "upcoming" | "inProgress" | "completed";

const getScheduleStatus = (
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): ScheduleStatus => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (currentTime < startTime) return "upcoming";
  if (currentTime >= startTime && currentTime < endTime) return "inProgress";
  return "completed";
};

const getStatusLabel = (status: ScheduleStatus): { text: string; className: string } => {
  switch (status) {
    case "upcoming":
      return { text: "예정", className: "bg-primary/20 text-primary" };
    case "inProgress":
      return { text: "진행중", className: "bg-green-500 text-white" };
    case "completed":
      return { text: "완료", className: "bg-muted text-muted-foreground" };
  }
};

const getDuration = (
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): string => {
  const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const TodayScheduleSection = () => {
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const fetchTodaySchedule = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        let query = supabase
          .from("class_enrollments")
          .select(`
            *,
            class:classes (
              id,
              name,
              schedule,
              academy:academies (
                id,
                name
              )
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });


        const { data, error } = await query;

        if (error) throw error;

        // Get today's day of week in Korean
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const today = days[new Date().getDay()];

        const classes: TodayClass[] = [];
        
        (data || []).forEach((enrollment: any, index: number) => {
          if (!enrollment.class?.schedule) return;
          
          const scheduleEntries = parseScheduleMultiple(enrollment.class.schedule);
          
          scheduleEntries.forEach(entry => {
            if (entry.day === today) {
              classes.push({
                id: `${enrollment.class.id}-${entry.day}-${entry.startHour}`,
                className: enrollment.class.name,
                academyName: enrollment.class.academy?.name || "",
                startHour: entry.startHour,
                startMinute: entry.startMinute,
                endHour: entry.endHour,
                endMinute: entry.endMinute,
                colorIndex: index,
              });
            }
          });
        });

        // Sort by start time
        classes.sort((a, b) => {
          const aTime = a.startHour * 60 + a.startMinute;
          const bTime = b.startHour * 60 + b.startMinute;
          return aTime - bTime;
        });

        setTodayClasses(classes);
      } catch (error) {
        console.error("Error fetching today's schedule:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySchedule();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">오늘의 일정</h3>
        </div>
        <div className="space-y-3">
          <div className="h-20 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">오늘의 일정</h3>
        </div>
        
      </div>

      {todayClasses.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">오늘 예정된 수업이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayClasses.map((classItem) => {
            const status = getScheduleStatus(
              classItem.startHour,
              classItem.startMinute,
              classItem.endHour,
              classItem.endMinute
            );
            const statusInfo = getStatusLabel(status);
            const duration = getDuration(
              classItem.startHour,
              classItem.startMinute,
              classItem.endHour,
              classItem.endMinute
            );
            const colorClass = CLASS_COLORS[classItem.colorIndex % CLASS_COLORS.length];

            return (
              <div
                key={classItem.id}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border"
              >
                {/* Color indicator */}
                <div className={`w-1 h-full min-h-[60px] rounded-full ${colorClass.bg}`} />
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    {classItem.academyName}
                  </p>
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${status === 'inProgress' ? 'bg-green-500' : 'bg-transparent'}`} />
                    {classItem.className}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {classItem.startHour.toString().padStart(2, '0')}:
                      {classItem.startMinute.toString().padStart(2, '0')} - 
                      {classItem.endHour.toString().padStart(2, '0')}:
                      {classItem.endMinute.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Status badge and duration */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.className}`}>
                    {statusInfo.text}
                  </span>
                  <span className="text-xs text-muted-foreground">{duration}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodayScheduleSection;