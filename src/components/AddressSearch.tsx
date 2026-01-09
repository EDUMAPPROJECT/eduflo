import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface AddressSearchProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

const AddressSearch = ({
  value,
  onChange,
  placeholder = "주소 입력",
}: AddressSearchProps) => {
  const [baseAddress, setBaseAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse incoming value into base/detail only on initial mount
  useEffect(() => {
    if (isInitialized) return;
    
    if (value) {
      // Check if value contains detail address pattern (separated by comma)
      const commaIndex = value.lastIndexOf(", ");
      if (commaIndex > 0) {
        setBaseAddress(value.substring(0, commaIndex));
        setDetailAddress(value.substring(commaIndex + 2));
      } else {
        setBaseAddress(value);
        setDetailAddress("");
      }
    }
    setIsInitialized(true);
  }, [value, isInitialized]);

  // Memoized update function to prevent infinite loops
  const updateParent = useCallback((base: string, detail: string) => {
    const fullAddress = base
      ? detail
        ? `${base}, ${detail}`
        : base
      : "";
    onChange(fullAddress);
  }, [onChange]);

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBase = e.target.value;
    setBaseAddress(newBase);
    updateParent(newBase, detailAddress);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDetail = e.target.value;
    setDetailAddress(newDetail);
    updateParent(baseAddress, newDetail);
  };

  return (
    <div className="space-y-3">
      <Input
        value={baseAddress}
        onChange={handleBaseChange}
        placeholder={placeholder}
        className="w-full"
      />

      <Input
        value={detailAddress}
        onChange={handleDetailChange}
        placeholder="상세 주소 입력 (예: 3층 301호)"
        className="w-full"
      />

      {(baseAddress || detailAddress) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {baseAddress ? (detailAddress ? `${baseAddress}, ${detailAddress}` : baseAddress) : detailAddress}
        </p>
      )}
    </div>
  );
};

export default AddressSearch;