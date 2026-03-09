import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const TERMS_ITEMS = [
  { id: "service" as const, label: "서비스 이용약관", required: true },
  { id: "privacy" as const, label: "개인정보 처리방침", required: true },
  { id: "marketing" as const, label: "마케팅 정보 수신 동의", required: false },
];

export type TermsAgreementState = {
  all: boolean;
  service: boolean;
  privacy: boolean;
  marketing: boolean;
};

interface TermsAgreementScreenProps {
  onNext: (agreed: TermsAgreementState) => void;
  className?: string;
}

export default function TermsAgreementScreen({ onNext, className }: TermsAgreementScreenProps) {
  const [all, setAll] = useState(false);
  const [service, setService] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const requiredAllChecked = service && privacy;

  const handleAllChange = useCallback(
    (checked: boolean) => {
      setAll(checked);
      setService(checked);
      setPrivacy(checked);
      setMarketing(checked);
    },
    []
  );

  const handleServiceChange = (checked: boolean) => {
    setService(checked);
    if (!checked) setAll(false);
    else setAll(checked && privacy && marketing);
  };
  const handlePrivacyChange = (checked: boolean) => {
    setPrivacy(checked);
    if (!checked) setAll(false);
    else setAll(service && checked && marketing);
  };
  const handleMarketingChange = (checked: boolean) => {
    setMarketing(checked);
    if (!checked) setAll(false);
    else setAll(service && privacy && checked);
  };

  return (
    <div className={cn("w-full max-w-sm space-y-6", className)}>
      <h2 className="text-xl font-semibold text-foreground text-center">이용약관 동의</h2>

      {/* 전체 동의 */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
        <Checkbox
          id="terms-all"
          checked={all}
          onCheckedChange={(c) => handleAllChange(c === true)}
        />
        <label htmlFor="terms-all" className="text-sm font-medium cursor-pointer flex-1">
          전체 동의
        </label>
      </div>

      {/* 개별 약관 */}
      <div className="space-y-3">
        {TERMS_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <Checkbox
              id={`terms-${item.id}`}
              checked={
                item.id === "service"
                  ? service
                  : item.id === "privacy"
                    ? privacy
                    : marketing
              }
              onCheckedChange={(c) => {
                const checked = c === true;
                if (item.id === "service") handleServiceChange(checked);
                else if (item.id === "privacy") handlePrivacyChange(checked);
                else handleMarketingChange(checked);
              }}
            />
            <label
              htmlFor={`terms-${item.id}`}
              className="text-sm cursor-pointer flex-1 flex items-center gap-2"
            >
              <span>{item.label}</span>
              <span className={item.required ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                {item.required ? "(필수)" : "(선택)"}
              </span>
            </label>
          </div>
        ))}
      </div>

      <Button
        className="w-full h-14 text-base"
        size="xl"
        disabled={!requiredAllChecked}
        onClick={() =>
          onNext({
            all,
            service,
            privacy,
            marketing,
          })
        }
      >
        다음
      </Button>
    </div>
  );
}
