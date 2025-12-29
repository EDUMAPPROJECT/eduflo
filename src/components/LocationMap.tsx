import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Navigation, AlertCircle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationMapProps {
  address: string;
  name: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const LocationMap = ({ address, name }: LocationMapProps) => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const geocode = async () => {
      setLoading(true);
      setError(false);

      try {
        // Using Nominatim (OpenStreetMap) for geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              "Accept-Language": "ko",
            },
          }
        );
        const data = await response.json();

        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      geocode();
    }
  }, [address]);

  const openNaverMap = () => {
    const url = `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
    window.open(url, "_blank");
  };

  const openKakaoMap = () => {
    const url = `https://map.kakao.com/?q=${encodeURIComponent(address)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="w-full h-48 rounded-lg bg-secondary/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !coordinates) {
    return (
      <div className="space-y-3">
        <div className="w-full h-32 rounded-lg bg-secondary/30 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm">지도를 불러올 수 없습니다</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={openNaverMap}
          >
            <Navigation className="w-4 h-4" />
            네이버 지도
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={openKakaoMap}
          >
            <Navigation className="w-4 h-4" />
            카카오맵
          </Button>
        </div>
      </div>
    );
  }

  const position = useMemo<[number, number]>(
    () => [coordinates.lat, coordinates.lng],
    [coordinates.lat, coordinates.lng]
  );

  return (
    <div className="space-y-3">
      <div className="w-full h-48 rounded-lg overflow-hidden">
        <MapContainer
          center={position}
          zoom={16}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position}>
            <Popup>
              <span className="text-center">
                <strong>{name}</strong>
                <br />
                <span className="text-xs">{address}</span>
              </span>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={openNaverMap}
        >
          <Navigation className="w-4 h-4" />
          네이버 지도
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={openKakaoMap}
        >
          <Navigation className="w-4 h-4" />
          카카오맵
        </Button>
      </div>
    </div>
  );
};

export default LocationMap;
