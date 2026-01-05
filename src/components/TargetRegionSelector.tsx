import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AVAILABLE_REGIONS, ALL_REGIONS } from "@/contexts/RegionContext";
import { MapPin } from "lucide-react";

interface TargetRegionSelectorProps {
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
}

const TargetRegionSelector = ({ selectedRegions, onChange }: TargetRegionSelectorProps) => {
  const toggleRegion = (regionId: string) => {
    if (selectedRegions.includes(regionId)) {
      onChange(selectedRegions.filter(r => r !== regionId));
    } else {
      onChange([...selectedRegions, regionId]);
    }
  };

  const selectAll = () => {
    onChange(ALL_REGIONS.map(r => r.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            홍보 타겟 지역 설정
          </div>
          <div className="flex gap-2">
            <button 
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              전체 선택
            </button>
            <span className="text-muted-foreground">|</span>
            <button 
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:underline"
            >
              초기화
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          선택한 지역의 학부모에게 학원이 노출됩니다
        </p>
        
        {Object.entries(AVAILABLE_REGIONS).map(([groupName, regions]) => (
          <div key={groupName}>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">{groupName}</h4>
            <div className="flex flex-wrap gap-2">
              {regions.map((region) => {
                const isSelected = selectedRegions.includes(region.id);
                return (
                  <button
                    key={region.id}
                    onClick={() => toggleRegion(region.id)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {region.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        
        {selectedRegions.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              선택된 지역 ({selectedRegions.length}개)
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedRegions.map(regionId => {
                const region = ALL_REGIONS.find(r => r.id === regionId);
                return region ? (
                  <Badge key={regionId} variant="secondary" className="text-xs">
                    {region.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TargetRegionSelector;
