import { useState } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useRegion, AVAILABLE_REGIONS } from "@/contexts/RegionContext";

const GlobalRegionSelector = () => {
  const [open, setOpen] = useState(false);
  const { selectedRegion, selectedRegionName, setSelectedRegion } = useRegion();

  const handleSelect = (regionId: string) => {
    setSelectedRegion(regionId);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-foreground font-medium px-2 h-9"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm">{selectedRegionName}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">지역 선택</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 pb-8 max-h-[60vh] overflow-y-auto">
          {Object.entries(AVAILABLE_REGIONS).map(([groupName, regions]) => (
            <div key={groupName} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
                {groupName}
              </h3>
              <div className="space-y-1">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => handleSelect(region.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                      selectedRegion === region.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{region.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {region.district}
                      </span>
                    </div>
                    {selectedRegion === region.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default GlobalRegionSelector;
