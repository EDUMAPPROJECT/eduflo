import { useEffect, useRef, useState } from "react";
import { loadNaverMapScript } from "@/utils/naverMap";
import { Button } from "@/components/ui/button";
import { Navigation, MapPinOff, RefreshCw } from "lucide-react";
import markerIcon from "@/assets/marker.png";

interface AcademyDetailMapProps {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const AcademyDetailMap = ({
  name,
  address,
  latitude,
  longitude,
}: AcademyDetailMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
  const encodedAddress = encodeURIComponent(address);

  const openNaverMap = () => {
    window.open(`https://map.naver.com/p/search/${encodedAddress}`, "_blank");
  };

  const openKakaoMap = () => {
    window.open(`https://map.kakao.com/?q=${encodedAddress}`, "_blank");
  };

  useEffect(() => {
    if (!clientId) {
      setError("네이버 지도 API 키가 설정되지 않았습니다.");
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await loadNaverMapScript(clientId);

        if (!mapRef.current || !window.naver?.maps?.Map) {
          throw new Error("네이버 지도 API를 초기화할 수 없습니다.");
        }

        const map = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(latitude, longitude),
          zoom: 16,
          logoControl: false,
          mapTypeControl: false,
        });

        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(latitude, longitude),
          map,
          title: name,
          icon: {
            url: markerIcon,
            scaledSize: new window.naver.maps.Size(36, 42),
            anchor: new window.naver.maps.Point(27, 54),
          },
        });

        const infoWindow = new window.naver.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">${name}</h3>
              <p style="font-size: 12px; color: #666; margin: 0;">${address}</p>
            </div>
          `,
        });

        window.naver.maps.Event.addListener(marker, "click", () => {
          if (infoWindow.getMap()) {
            infoWindow.close();
          } else {
            infoWindow.open(map, marker);
          }
        });
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "지도를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [clientId, latitude, longitude, name, address]);

  if (error) {
    return (
      <div className="space-y-3">
        <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-secondary/30 flex flex-col items-center justify-center gap-3 p-4">
          <MapPinOff className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <p className="text-xs text-muted-foreground text-center px-4">{address}</p>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            다시 시도
          </Button>
        </div>
        <p className="text-sm text-muted-foreground px-1">{address}</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={openNaverMap}>
            <Navigation className="w-4 h-4" />
            네이버 지도
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={openKakaoMap}>
            <Navigation className="w-4 h-4" />
            카카오맵
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-secondary/30 relative z-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">지도 로딩 중...</span>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          className="w-full h-full"
          style={{ minHeight: "192px" }}
        />
      </div>

      <p className="text-sm text-muted-foreground px-1">{address}</p>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={openNaverMap}>
          <Navigation className="w-4 h-4" />
          네이버 지도
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={openKakaoMap}>
          <Navigation className="w-4 h-4" />
          카카오맵
        </Button>
      </div>
    </div>
  );
};

export default AcademyDetailMap;