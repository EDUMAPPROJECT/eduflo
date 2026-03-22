import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SortableProfileRowProps {
  id: string;
  /** 드래그 핸들을 행 맨 앞에 넣어 주세요 */
  children: (dragHandle: ReactNode) => ReactNode;
  className?: string;
}

/**
 * 학원 프로필 강사/강좌 목록용 — 드래그로 순서 변경
 */
export function SortableProfileRow({ id, children, className }: SortableProfileRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <button
      type="button"
      className={cn(
        "touch-none cursor-grab shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/50",
        "active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
      aria-label="드래그하여 순서 변경"
    >
      <GripVertical className="h-5 w-5" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50 opacity-60", className)}>
      {children(dragHandle)}
    </div>
  );
}
