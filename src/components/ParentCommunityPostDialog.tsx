import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiImageUpload from "@/components/MultiImageUpload";
import { Bell, GraduationCap, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParentCommunityPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const boardOptions = [
  { value: "academy-admission", label: "학원·입시정보", icon: GraduationCap },
  { value: "life-parenting", label: "생활·육아", icon: Bell },
  { value: "free-talk", label: "자유수다", icon: MessageCircle },
];

const ParentCommunityPostDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: ParentCommunityPostDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState("academy-admission");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setBoard("academy-admission");
    setTitle("");
    setBody("");
    setImageUrls([]);
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "오류", description: "제목을 입력해주세요", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("로그인이 필요합니다");
      }

      const { error } = await supabase
        .from("feed_posts")
        .insert({
          academy_id: null,
          author_id: session.user.id,
          type: board,
          title: title.trim(),
          body: body.trim() || null,
          image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
          target_regions: [],
        });

      if (error) throw error;

      toast({ title: "게시 완료", description: "게시글이 등록되었습니다" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating parent community post:", error);
      toast({ title: "오류", description: "게시글 등록에 실패했습니다", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>학부모 글 작성</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>게시판 선택</Label>
            <Select value={board} onValueChange={setBoard}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {boardOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
          </div>

          <div className="space-y-2">
            <Label>본문</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={5}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label>이미지 (최대 5장)</Label>
            <MultiImageUpload
              values={imageUrls}
              onChange={setImageUrls}
              folder="parent-community-posts"
              maxImages={5}
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "게시 중..." : "게시하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParentCommunityPostDialog;
