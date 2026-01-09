import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, MapPin } from "lucide-react";

interface AddressSearchProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: () => void;
        width?: string;
        height?: string;
      }) => {
        embed: (container: HTMLElement) => void;
        open: () => void;
      };
    };
  }
}

interface DaumPostcodeData {
  address: string;
  addressType: string;
  bname: string;
  buildingName: string;
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  sido: string;
  sigungu: string;
}

const AddressSearch = ({ value, onChange, placeholder = "주소 검색" }: AddressSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [baseAddress, setBaseAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing value into base and detail on mount
  useEffect(() => {
    if (value) {
      // Check if value contains detail address pattern (separated by comma or space after closing parenthesis)
      const match = value.match(/^(.+?)(?:\s*,\s*|\s+)(\d+동\s*.+|\d+호\s*.+|.+동\s*\d+호.*)$/);
      if (match) {
        setBaseAddress(match[1]);
        setDetailAddress(match[2]);
      } else {
        setBaseAddress(value);
        setDetailAddress("");
      }
    }
  }, []);

  // Update parent value when addresses change
  useEffect(() => {
    if (baseAddress) {
      const fullAddress = detailAddress ? `${baseAddress}, ${detailAddress}` : baseAddress;
      onChange(fullAddress);
    }
  }, [baseAddress, detailAddress]);

  useEffect(() => {
    // Check if script is already loaded
    if (window.daum?.Postcode) {
      setIsScriptLoaded(true);
      return;
    }

    // Load Daum Postcode script
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup as it may be used by other instances
    };
  }, []);

  useEffect(() => {
    if (isOpen && isScriptLoaded && containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = "";
      
      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          // Get full address (prefer road address)
          let fullAddress = data.roadAddress || data.jibunAddress;
          
          // Add building name if exists
          if (data.buildingName) {
            fullAddress += ` (${data.buildingName})`;
          }
          
          setBaseAddress(fullAddress);
          setDetailAddress("");
          setIsOpen(false);
        },
        width: "100%",
        height: "100%",
      }).embed(containerRef.current);
    }
  }, [isOpen, isScriptLoaded]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={baseAddress}
          placeholder={placeholder}
          className="flex-1"
          readOnly
        />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="gap-2 shrink-0">
              <Search className="w-4 h-4" />
              검색
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md h-[500px] p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                주소 검색
              </DialogTitle>
            </DialogHeader>
            <div 
              ref={containerRef} 
              className="w-full flex-1" 
              style={{ height: "calc(100% - 60px)" }}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {baseAddress && (
        <Input
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          placeholder="상세 주소 입력 (예: 3층 301호)"
          className="w-full"
        />
      )}
      
      {baseAddress && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {detailAddress ? `${baseAddress}, ${detailAddress}` : baseAddress}
        </p>
      )}
    </div>
  );
};

export default AddressSearch;
