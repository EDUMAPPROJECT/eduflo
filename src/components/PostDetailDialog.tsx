import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Bell, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  content: string | null;
  category: string;
  image_url: string | null;
  created_at: string;
  academy: {
    id: string;
    name: string;
    profile_image: string | null;
  };
}

interface PostDetailDialogProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  notice: { label: "공지", icon: Bell, color: "bg-primary text-primary-foreground" },
  news: { label: "소식", icon: Megaphone, color: "bg-secondary text-secondary-foreground" },
  event: { label: "이벤트", icon: PartyPopper, color: "bg-accent text-accent-foreground" },
};

const PostDetailDialog = ({ post, open, onClose }: PostDetailDialogProps) => {
  if (!post) return null;

  const config = categoryConfig[post.category] || categoryConfig.news;
  const CategoryIcon = config.icon;
  const getImageUrls = (): string[] => {
    if (!post.image_url) return [];
    try {
      const parsed = JSON.parse(post.image_url);
      if (Array.isArray(parsed)) return parsed.filter((url) => typeof url === "string");
      return [post.image_url];
    } catch {
      return [post.image_url];
    }
  };
  const imageUrls = getImageUrls();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden shrink-0">
              {post.academy.profile_image ? (
                <img 
                  src={post.academy.profile_image} 
                  alt={post.academy.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                  {post.academy.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{post.academy.name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(post.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${config.color}`}>
              <CategoryIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          </div>
          <DialogTitle className="text-left text-lg">{post.title}</DialogTitle>
        </DialogHeader>
        
        {imageUrls.length > 0 && (
          <div className="rounded-lg overflow-hidden my-4">
            <img 
              src={imageUrls[0]} 
              alt={post.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}
        
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
          {post.content || "내용이 없습니다."}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailDialog;
