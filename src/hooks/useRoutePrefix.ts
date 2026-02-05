import { useLocation } from "react-router-dom";

/**
 * Returns the current route prefix based on the URL path.
 * - "/p" for parent routes
 * - "/s" for student routes
 * - "/super" for super admin routes
 * - "/p" as default fallback
 */
export const useRoutePrefix = () => {
  const location = useLocation();
  
  if (location.pathname.startsWith("/s/") || location.pathname === "/s") {
    return "/s";
  }
  
  if (location.pathname.startsWith("/super/") || location.pathname === "/super") {
    return "/super";
  }
  
  // Default to parent prefix
  return "/p";
};
