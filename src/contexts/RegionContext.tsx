import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Available regions for the alpha test (동탄 신도시)
export const AVAILABLE_REGIONS = {
  "동탄 1신도시": [
    { id: "dongtan1", name: "석우동", district: "화성시" },
    { id: "dongtan2", name: "반송동", district: "화성시" },
    { id: "dongtan3", name: "능동", district: "화성시" },
  ],
  "동탄 2신도시": [
    { id: "dongtan4", name: "청계동", district: "화성시" },
    { id: "dongtan5", name: "영천동", district: "화성시" },
    { id: "dongtan6", name: "중동", district: "화성시" },
    { id: "dongtan7", name: "금곡동", district: "화성시" },
    { id: "dongtan8", name: "방교동", district: "화성시" },
    { id: "dongtan9", name: "여울동", district: "화성시" },
    { id: "dongtan10", name: "산척동", district: "화성시" },
    { id: "dongtan11", name: "송동", district: "화성시" },
    { id: "dongtan12", name: "장지동", district: "화성시" },
    { id: "dongtan13", name: "목동", district: "화성시" },
    { id: "dongtan14", name: "신동", district: "화성시" },
  ],
};

export const ALL_REGIONS = Object.values(AVAILABLE_REGIONS).flat();

interface RegionContextType {
  selectedRegion: string;
  selectedRegionName: string;
  setSelectedRegion: (regionId: string) => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const STORAGE_KEY = "eduflo_selected_region";

export const REGION_ALL = "all";

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedRegion, setSelectedRegionState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || REGION_ALL; // 기본값: 동탄4동
  });

  const selectedRegionName =
    selectedRegion === REGION_ALL
      ? "전체"
      : ALL_REGIONS.find((r) => r.id === selectedRegion)?.name || "전체";

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
