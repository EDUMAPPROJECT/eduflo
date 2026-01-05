import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface NicknameSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNickname: string;
  userId: string;
  onSuccess?: (newNickname: string) => void;
}

const NicknameSettingsDialog = ({
  open,
  onOpenChange,
  currentNickname,
  userId,
  onSuccess,
}: NicknameSettingsDialogProps) => {
  const [nickname, setNickname] = useState(currentNickname);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast.error("닉네임을 입력해주세요");
      return;
    }

    if (nickname.length > 20) {
      toast.error("닉네임은 20자 이하로 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ user_name: nickname.trim() })
        .eq("id", userId);

      if (error) throw error;

      toast.success("닉네임이 변경되었습니다");
      onSuccess?.(nickname.trim());
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating nickname:", error);
      toast.error("닉네임 변경에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            닉네임 설정
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              최대 20자까지 입력 가능합니다
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NicknameSettingsDialog;
