import { useChildren, Child } from "@/hooks/useChildren";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface ChildSelectorProps {
  onChildChange?: (childId: string | null) => void;
  showAllOption?: boolean;
  className?: string;
}

const ChildSelector = ({ onChildChange, showAllOption = false, className = "" }: ChildSelectorProps) => {
  const { children, selectedChildId, selectChild, loading, hasChildren } = useChildren();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Users className="w-4 h-4" />
        <span>로딩 중...</span>
      </div>
    );
  }

  if (!hasChildren) {
    return null;
  }

  const handleChange = (value: string) => {
    const newChildId = value === "all" ? null : value;
    selectChild(newChildId);
    onChildChange?.(newChildId);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedChildId || "all"} onValueChange={handleChange}>
        <SelectTrigger className="w-auto min-w-[120px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">전체</SelectItem>
          )}
          {children.map((child) => (
            <SelectItem key={child.id} value={child.id}>
              {child.name}
              {child.grade && <span className="text-muted-foreground ml-1">({child.grade})</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChildSelector;