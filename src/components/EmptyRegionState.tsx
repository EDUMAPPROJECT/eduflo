import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useRegion, AVAILABLE_REGIONS, ALL_REGIONS } from "@/contexts/RegionContext";

interface EmptyRegionStateProps {
  region?: string;
}

const EmptyRegionState = ({ region }: EmptyRegionStateProps) => {
  const { selectedRegion, selectedRegionName, setSelectedRegion } = useRegion();
  const currentRegion = region || selectedRegion;
  const currentRegionName = ALL_REGIONS.find(r => r.id === currentRegion)?.name || selectedRegionName;
  
  // Get other regions to suggest
  const otherRegions = ALL_REGIONS.filter(r => r.id !== currentRegion).slice(0, 4);

  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <MapPin className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">
        아직 우리 동네에 등록된 정보가 없어요
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        다른 지역을 구경해보시겠어요?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {otherRegions.map((r) => (
          <Button
            key={r.id}
            variant="outline"
            size="sm"
            onClick={() => setSelectedRegion(r.id)}
            className="gap-1"
          >
            <MapPin className="w-3 h-3" />
            {r.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default EmptyRegionState;
