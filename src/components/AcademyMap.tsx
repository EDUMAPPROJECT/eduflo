import { useEffect, useRef, useState } from "react";
import { loadNaverMapScript } from "@/utils/naverMap";
import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import markerIcon from "@/assets/marker.png";

interface Academy {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface FocusedAcademy {
  id: string;
  latitude: number;
  longitude: number;
}

interface AcademyMapProps {
  onMapClick?: () => void;
  expanded?: boolean;
  /** 검색 결과 Drawer에서 첫 번째 학원으로 지도 확대 및 마커 강조 시 사용 */
  focusedAcademy?: FocusedAcademy | null;
}

const DEFAULT_MARKER_SIZE = 36;
const FOCUSED_MARKER_SIZE = 72;

const AcademyMap = ({ onMapClick, expanded = false, focusedAcademy = null }: AcademyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ marker: any; academyId: string }[]>([]);
  const academiesDataRef = useRef<{ latitude: number; longitude: number }[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setError("네이버 지도 API 키가 설정되지 않았습니다. .env 파일에 VITE_NAVER_MAP_CLIENT_ID를 설정해주세요.");
      setIsLoading(false);
      return;
    }

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await loadNaverMapScript(clientId);

        if (!mapRef.current || !window.naver?.maps || !window.naver.maps.Map) {
          throw new Error("네이버 지도 API를 초기화할 수 없습니다.");
        }

        // 지도 생성
        const map = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(37.2020, 127.0700), // 동탄 중심 좌표
          zoom: 14,
          logoControl: false, // 네이버 로고 숨기기
          mapTypeControl: false,
        });

        mapInstanceRef.current = map;

        // 학원 데이터 가져오기
        const { data: academies, error: fetchError } = await supabase
          .from("academies")
          .select("id, name, address, latitude, longitude")
          .not("latitude", "is", null)
          .not("longitude", "is", null);

        if (fetchError) {
          console.error("학원 데이터 로드 실패:", fetchError);
          setIsLoading(false);
          return;
        }

        if (academies && academies.length > 0) {
          const naver = window.naver.maps;
          academiesDataRef.current = (academies as Academy[])
            .filter((a) => a.latitude != null && a.longitude != null)
            .map((a) => ({ latitude: a.latitude!, longitude: a.longitude! }));

          // 마커 추가 (academyId 저장해서 포커스 시 크기 변경에 사용)
          academies.forEach((academy: Academy) => {
            if (academy.latitude && academy.longitude) {
              const marker = new naver.Marker({
                position: new naver.LatLng(academy.latitude, academy.longitude),
                map: map,
                title: academy.name,
                icon: {
                  url: markerIcon,
                  scaledSize: new naver.Size(DEFAULT_MARKER_SIZE, DEFAULT_MARKER_SIZE),
                  anchor: new naver.Point(DEFAULT_MARKER_SIZE / 2, DEFAULT_MARKER_SIZE),
                },
              });

              // 마커 클릭 시 정보창 표시
              const infoWindow = new naver.InfoWindow({
                content: `
                  <div style="padding: 12px; min-width: 200px;">
                    <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">${academy.name}</h3>
                    <p style="font-size: 12px; color: #666; margin: 0;">${academy.address || "주소 정보 없음"}</p>
                  </div>
                `,
              });

              naver.Event.addListener(marker, "click", () => {
                if (infoWindow.getMap()) {
                  infoWindow.close();
                } else {
                  infoWindow.open(map, marker);
                }
              });

              markersRef.current.push({ marker, academyId: academy.id });
            }
          });

          // 모든 마커가 보이도록 지도 범위 조정 (포커스 없을 때만, 나중에 포커스 해제 시에도 사용)
          if (markersRef.current.length > 0) {
            const bounds = new naver.LatLngBounds();
            academiesDataRef.current.forEach(({ latitude, longitude }) => {
              bounds.extend(new naver.LatLng(latitude, longitude));
            });
            map.fitBounds(bounds, { padding: 50 });
          }
        }

        // 지도(마커 제외) 클릭 시 콜백
        if (onMapClickRef.current) {
          window.naver.maps.Event.addListener(map, "click", () => {
            onMapClickRef.current?.();
          });
        }

        setMapReady(true);
        setIsLoading(false);
      } catch (err: any) {
        setError(err?.message || "지도를 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      setMapReady(false);
      markersRef.current.forEach(({ marker }) => marker.setMap(null));
      markersRef.current = [];
      academiesDataRef.current = [];
    };
  }, [clientId]);

  // 검색 결과 Drawer 첫 번째 학원으로 확대 + 해당 마커 크기 확대
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !window.naver?.maps) return;

    const naver = window.naver.maps;

    if (focusedAcademy) {
      map.setCenter(new naver.LatLng(focusedAcademy.latitude, focusedAcademy.longitude));
      map.setZoom(17);
      markersRef.current.forEach(({ marker, academyId }) => {
        const isFocused = academyId === focusedAcademy.id;
        const size = isFocused ? FOCUSED_MARKER_SIZE : DEFAULT_MARKER_SIZE;
        marker.setIcon({
          url: markerIcon,
          scaledSize: new naver.Size(size, size),
          anchor: new naver.Point(size / 2, size),
        });
      });
    } else {
      // Drawer 닫혀도 지도 위치/줌은 그대로 두고, 마커 크기만 기본으로 복구
      markersRef.current.forEach(({ marker }) => {
        marker.setIcon({
          url: markerIcon,
          scaledSize: new naver.Size(DEFAULT_MARKER_SIZE, DEFAULT_MARKER_SIZE),
          anchor: new naver.Point(DEFAULT_MARKER_SIZE / 2, DEFAULT_MARKER_SIZE),
        });
      });
    }
  }, [focusedAcademy, mapReady]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto border-b border-border">
        <div className="h-64 bg-secondary/50 flex flex-col items-center justify-center p-4">
          <MapPin className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2 whitespace-pre-line text-center">
            {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              setIsLoading(true);
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        expanded
          ? "absolute inset-0 w-full h-full min-h-0"
          : "max-w-lg mx-auto border-b border-border relative z-0"
      }
    >
      <div className={expanded ? "relative w-full h-full" : "relative"}>
        {isLoading && (
          <div className="absolute inset-0 bg-secondary/50 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">지도 로딩 중...</span>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          className={`w-full relative z-0 ${expanded ? "h-full min-h-0" : "h-64"}`}
          style={expanded ? {} : { minHeight: "256px" }}
        />
      </div>
    </div>
  );
};

export default AcademyMap;