import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, GraduationCap, User, MessageSquare } from "lucide-react";

interface ReservationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "reservation" | "seminar";
  data: {
    // Common
    id: string;
    studentName: string;
    studentGrade?: string | null;
    message?: string | null;
    // Reservation specific
    academyName?: string;
    reservationDate?: string;
    reservationTime?: string;
    status?: string;
    // Seminar specific
    seminarTitle?: string;
    seminarDate?: string;
    seminarTime?: string;
    seminarLocation?: string | null;
    seminarAcademyName?: string;
    attendeeCount?: number | null;
    seminarStatus?: string;
  } | null;
  onCancel?: () => void;
  canCancel?: boolean;
}

const ReservationDetailSheet = ({
  open,
  onOpenChange,
  type,
  data,
  onCancel,
  canCancel = false
}: ReservationDetailSheetProps) => {
  if (!data) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700">대기중</Badge>;
      case "confirmed":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">확정</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">완료</Badge>;
      case "cancelled":
        return <Badge variant="destructive">취소됨</Badge>;
      case "recruiting":
        return <Badge variant="default">모집중</Badge>;
      case "applied":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">신청 완료</Badge>;
      case "closed":
        return <Badge variant="secondary">마감</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일(${dayName})`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">
              {type === "reservation" ? "방문 상담 상세" : "설명회 신청 상세"}
            </SheetTitle>
            {type === "reservation" && data.status && getStatusBadge(data.status)}
            {type === "seminar" && data.seminarStatus && getStatusBadge(data.seminarStatus)}
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Academy/Seminar Info */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h3 className="font-semibold text-foreground mb-1">
              {type === "reservation" ? data.academyName : data.seminarTitle}
            </h3>
            {type === "seminar" && data.seminarAcademyName && (
              <p className="text-sm text-muted-foreground">{data.seminarAcademyName}</p>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            {type === "reservation" && data.reservationDate && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">예약 날짜</p>
                    <p className="font-medium">{formatDate(data.reservationDate)}</p>
                  </div>
                </div>
                {data.reservationTime && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">예약 시간</p>
                      <p className="font-medium">{data.reservationTime}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {type === "seminar" && data.seminarDate && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">설명회 날짜</p>
                    <p className="font-medium">{formatDate(data.seminarDate)}</p>
                  </div>
                </div>
                {data.seminarTime && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">설명회 시간</p>
                      <p className="font-medium">{data.seminarTime}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {type === "seminar" && data.seminarLocation && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">장소</p>
                  <p className="font-medium">{data.seminarLocation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Student Info */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">학생 이름</p>
                <p className="font-medium">{data.studentName}</p>
              </div>
            </div>

            {data.studentGrade && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">학년</p>
                  <p className="font-medium">{data.studentGrade}</p>
                </div>
              </div>
            )}

            {type === "seminar" && data.attendeeCount && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">참석 인원</p>
                  <p className="font-medium">{data.attendeeCount}명</p>
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          {data.message && (
            <div className="pt-2 border-t">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {type === "reservation" ? "상담 요청사항" : "질문/요청사항"}
                  </p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                    {data.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {canCancel && onCancel && (
            <div className="pt-4">
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={onCancel}
              >
                {type === "reservation" ? "예약 취소" : "신청 취소"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReservationDetailSheet;
