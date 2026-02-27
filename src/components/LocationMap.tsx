import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, MapPinOff, RefreshCw } from "lucide-react";

interface LocationMapProps {
  address: string;
  name: string;
}

const LocationMap = ({ address, name }: LocationMapProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const encodedAddress = encodeURIComponent(address);
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

  const openNaverMap = () => {
    const url = `https://map.naver.com/p/search/${encodedAddress}`;
    window.open(url, "_blank");
  };

  const openKakaoMap = () => {
    const url = `https://map.kakao.com/?q=${encodedAddress}`;
    window.open(url, "_blank");
  };

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  return (
    <div className="space-y-3">
      <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-secondary/30 relative">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">지도 로딩 중...</span>
            </div>
          </div>
        )}
        
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
            <MapPinOff className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              지도를 불러올 수 없습니다
            </p>
            <p className="text-xs text-muted-foreground text-center px-4">
              {address}
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-1" />
              다시 시도
            </Button>
          </div>
        ) : (
          <iframe
            src={googleMapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`${name} 위치`}
            onError={handleIframeError}
            onLoad={handleIframeLoad}
          />
        )}
      </div>
      
      <p className="text-sm text-muted-foreground px-1">{address}</p>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={openNaverMap}
        >
          <Navigation className="w-4 h-4" />
          네이버 지도
        </Button>
      </div>
    </div>
  );
};

export default LocationMap;
