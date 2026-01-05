import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Available regions for the alpha test (동탄 신도시)
export const AVAILABLE_REGIONS = {
  "동탄 1신도시": [
    { id: "dongtan1", name: "동탄1동", district: "화성시" },
    { id: "dongtan2", name: "동탄2동", district: "화성시" },
    { id: "dongtan3", name: "동탄3동", district: "화성시" },
  ],
  "동탄 2신도시": [
    { id: "dongtan4", name: "동탄4동", district: "화성시" },
    { id: "dongtan5", name: "동탄5동", district: "화성시" },
    { id: "dongtan6", name: "동탄6동", district: "화성시" },
    { id: "dongtan7", name: "동탄7동", district: "화성시" },
    { id: "dongtan8", name: "동탄8동", district: "화성시" },
    { id: "dongtan9", name: "동탄9동", district: "화성시" },
  ],
};

export const ALL_REGIONS = Object.values(AVAILABLE_REGIONS).flat();

interface RegionContextType {
  selectedRegion: string;
  selectedRegionName: string;
  setSelectedRegion: (regionId: string) => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const STORAGE_KEY = "edumap_selected_region";

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedRegion, setSelectedRegionState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || "dongtan4"; // 기본값: 동탄4동
  });

  const selectedRegionName = ALL_REGIONS.find(r => r.id === selectedRegion)?.name || "동탄4동";

  const setSelectedRegion = (regionId: string) => {
    setSelectedRegionState(regionId);
    localStorage.setItem(STORAGE_KEY, regionId);
  };

  return (
    <RegionContext.Provider value={{ selectedRegion, selectedRegionName, setSelectedRegion }}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return context;
};
