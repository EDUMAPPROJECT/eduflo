import { useState, useEffect } from "react";
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
import ImageUpload from "@/components/ImageUpload";
import { Bell, Calendar, PartyPopper, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academyId: string;
  onSuccess: () => void;
}

const postTypes = [
  { value: 'notice', label: '공지', icon: Bell, description: '학원 공지사항' },
  { value: 'seminar', label: '설명회', icon: Calendar, description: '설명회 안내' },
  { value: 'event', label: '이벤트', icon: PartyPopper, description: '이벤트/프로모션' },
];

const CreatePostDialog = ({ open, onOpenChange, academyId, onSuccess }: CreatePostDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>('notice');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetRegions, setTargetRegions] = useState<string[]>([]);

  // Get academy's target regions
  useEffect(() => {
    const fetchAcademyRegions = async () => {
      const { data } = await supabase
        .from("academies")
        .select("target_regions")
        .eq("id", academyId)
        .single();
      
      if (data?.target_regions) {
        setTargetRegions(data.target_regions);
      }
    };

    if (open && academyId) {
      fetchAcademyRegions();
    }
  }, [open, academyId]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "오류", description: "제목을 입력해주세요", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("feed_posts")
        .insert({
          academy_id: academyId,
          type,
          title: title.trim(),
          body: body.trim() || null,
          image_url: imageUrl || null,
          target_regions: targetRegions,
        });

      if (error) throw error;

      // Reset form
      setType('notice');
      setTitle('');
      setBody('');
      setImageUrl('');
      
      onSuccess();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({ title: "오류", description: "소식 등록에 실패했습니다", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 소식 작성</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>유형 *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {postTypes.map((postType) => {
                  const Icon = postType.icon;
                  return (
                    <SelectItem key={postType.value} value={postType.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{postType.label}</span>
                        <span className="text-xs text-muted-foreground">
                          - {postType.description}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>제목 *</Label>
            <Input
              placeholder="소식 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>

          <div className="space-y-2">
            <Label>내용</Label>
            <Textarea
              placeholder="소식 내용을 입력하세요"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length}/2000
            </p>
          </div>

          <div className="space-y-2">
            <Label>이미지 (선택)</Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              folder="feed-posts"
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "등록 중..." : "소식 등록"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
