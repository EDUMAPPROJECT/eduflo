import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

const ImageViewer = ({ images, initialIndex = 0, open, onClose }: ImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const minZoom = 0.25;
  const maxZoom = 4;

  const clampZoom = useCallback((value: number) => {
    return Math.min(maxZoom, Math.max(minZoom, value));
  }, [maxZoom, minZoom]);

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const [a, b] = [touches[0], touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    setZoomLevel(1);
    setNaturalSize(null);
  }, [currentIndex, open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "0") {
        setZoomLevel(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, images.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    const element = viewerContainerRef.current;
    if (!element || !open) return;

    const handleWheel = (e: WheelEvent) => {
      // Desktop: Ctrl/Cmd + wheel (터치패드 핀치 포함)
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const intensity = e.deltaMode === 1 ? 0.08 : 0.002;
      setZoomLevel((prev) => clampZoom(prev - e.deltaY * intensity));
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinchStartDistanceRef.current = getTouchDistance(e.touches);
      pinchStartZoomRef.current = zoomLevel;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDistanceRef.current === null) return;
      // 브라우저 전체 확대(뷰포트 줌) 방지
      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches);
      if (currentDistance <= 0) return;

      const scale = currentDistance / pinchStartDistanceRef.current;
      setZoomLevel(clampZoom(pinchStartZoomRef.current * scale));
    };

    const handleTouchEnd = () => {
      pinchStartDistanceRef.current = null;
      pinchStartZoomRef.current = zoomLevel;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [open, zoomLevel, clampZoom]);

  if (!open || images.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Main image: zoom + scroll */}
      <div
        ref={viewerContainerRef}
        className="w-[90vw] h-[85vh] overflow-auto cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "none" }}
      >
        <div
          className="min-w-full min-h-full flex items-center justify-center"
          style={{
            width: naturalSize ? `${naturalSize.width * zoomLevel}px` : "100%",
            height: naturalSize ? `${naturalSize.height * zoomLevel}px` : "100%",
          }}
        >
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="block object-none select-none shrink-0"
            style={{
              width: naturalSize ? `${naturalSize.width}px` : "auto",
              height: naturalSize ? `${naturalSize.height}px` : "auto",
              maxWidth: "none",
              maxHeight: "none",
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
            onLoad={(e) => {
              const target = e.currentTarget;
              setNaturalSize({
                width: target.naturalWidth,
                height: target.naturalHeight,
              });
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/50 rounded-full">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex ? "bg-white w-4" : "bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
