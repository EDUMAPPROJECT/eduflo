// 네이버 지도 API 스크립트 로드 유틸리티

declare global {
  interface Window {
    naver: any;
  }
}

export const loadNaverMapScript = (clientId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.naver && window.naver.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      `script[src*="openapi.map.naver.com"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.naver && window.naver.maps) {
          resolve();
        } else {
          reject(new Error("네이버 지도 API를 로드할 수 없습니다."));
        }
      });
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.naver && window.naver.maps && window.naver.maps.Map) {
          resolve();
        } else {
          reject(new Error("네이버 지도 API를 로드할 수 없습니다."));
        }
      }, 500);
    };
    script.onerror = () => {
      reject(new Error("네이버 지도 API 스크립트를 로드할 수 없습니다."));
    };
    document.head.appendChild(script);
  });
};

export const geocodeAddress = async (
  address: string
): Promise<{ lat: number; lng: number } | null> => {
  try {
    if (!window.naver?.maps?.Service) {
      return null;
    }

    return new Promise((resolve) => {
      window.naver.maps.Service.geocode(
        {
          address,
        },
        (status: any, response: any) => {
          if (status !== window.naver.maps.Service.Status.OK) {
            resolve(null);
            return;
          }

          if (response.v2?.addresses?.length > 0) {
            const addr = response.v2.addresses[0];
            const lat = parseFloat(addr.y);
            const lng = parseFloat(addr.x);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              resolve({ lat, lng });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        }
      );
    });
  } catch (error) {
    return null;
  }
};