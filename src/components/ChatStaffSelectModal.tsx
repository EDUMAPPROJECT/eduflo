import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAcademyStaffForChat, AcademyStaffItem } from "@/hooks/useAcademyStaffForChat";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface ChatStaffSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academyId: string | undefined;
  /** staffUserId, roleLabel(원장/부원장/강사 등). 강사면 수락 후 채팅 가능 */
  onSelect: (staffUserId: string, roleLabel: string) => void;
  selecting?: boolean;
}

function StaffCard({
  staff,
  isSelected,
  onSelect,
}: {
  staff: AcademyStaffItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        <User className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{staff.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {staff.roleLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">
          {staff.description}
        </p>
      </div>
    </button>
  );
}

const ChatStaffSelectModal = ({
  open,
  onOpenChange,
  academyId,
  onSelect,
  selecting = false,
}: ChatStaffSelectModalProps) => {
  const { staff, loading } = useAcademyStaffForChat(academyId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedUserId) {
      const staffItem = staff.find((s) => s.user_id === selectedUserId);
      onSelect(selectedUserId, staffItem?.roleLabel ?? "관리자");
      setSelectedUserId(null);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedUserId(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-bold">채팅 상담</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            채팅 상담을 진행하고 싶은 상대를 선택해주세요.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              로딩 중...
            </div>
          ) : staff.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              채팅 상담 가능한 담당자가 없습니다.
            </div>
          ) : (
            staff.map((s) => (
              <StaffCard
                key={s.user_id}
                staff={s}
                isSelected={selectedUserId === s.user_id}
                onSelect={() => setSelectedUserId(s.user_id)}
              />
            ))
          )}
        </div>

        <div className="shrink-0 pt-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleConfirm}
            disabled={!selectedUserId || selecting}
          >
            {selecting ? "연결 중..." : "선택하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatStaffSelectModal;