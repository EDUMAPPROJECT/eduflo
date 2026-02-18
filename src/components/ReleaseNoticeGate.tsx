import { useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FormalReleaseBanner from "./FormalReleaseBanner";

/** 설명회 관련 경로: 배너를 띄우지 않음 */
function isSeminarRelatedPath(pathname: string): boolean {
  return pathname.includes("/seminar");
}

/** 설명회 목록이 있는 홈 경로: 배너 띄우지 않음 (설명회 보러 가기로 이동한 뒤 배너가 사라지도록) */
function isHomePath(pathname: string): boolean {
  return (
    pathname === "/p/home" ||
    pathname === "/s/home" ||
    pathname === "/admin/home" ||
    pathname === "/super/home" ||
    pathname === "/home"
  );
}

/** 로그인/회원가입 전 경로: 배너 띄우지 않음 */
function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth");
}

interface ReleaseNoticeGateProps {
  children: ReactNode;
}

/**
 * 로그인 후 설명회를 제외한 모든 경로에서 정식 출시 안내 가림 배너를 표시합니다.
 */
const ReleaseNoticeGate = ({ children }: ReleaseNoticeGateProps) => {
  const { pathname } = useLocation();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const loggedIn = !!session;
      setHasSession(loggedIn);

      if (loggedIn && session) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("is_super_admin")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setIsSuperAdmin(!!roleData?.is_super_admin);
      } else {
        setIsSuperAdmin(false);
      }
    };

    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  const showBanner =
    hasSession === true &&
    !isSuperAdmin &&
    !isPublicPath(pathname) &&
    !isSeminarRelatedPath(pathname) &&
    !isHomePath(pathname);

  return (
    <>
      {children}
      {showBanner && <FormalReleaseBanner />}
    </>
  );
};

export default ReleaseNoticeGate;