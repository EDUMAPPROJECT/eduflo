import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  content: string;
}

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('id, title, content')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = visibleAnnouncements[currentIndex % visibleAnnouncements.length];

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    if (currentIndex >= visibleAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setCurrentIndex(prev => 
      prev === 0 ? visibleAnnouncements.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex(prev => 
      (prev + 1) % visibleAnnouncements.length
    );
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 relative">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm mb-0.5">
            {currentAnnouncement.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {currentAnnouncement.content}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 flex-shrink-0"
          onClick={() => handleDismiss(currentAnnouncement.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {visibleAnnouncements.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={handlePrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {(currentIndex % visibleAnnouncements.length) + 1} / {visibleAnnouncements.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={handleNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnnouncementBanner;
