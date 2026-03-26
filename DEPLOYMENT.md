# 배포 가이드 - 커스텀 도메인 연결

이 문서는 프로젝트를 커스텀 도메인으로 배포하기 위한 단계별 가이드입니다.

## 필수 환경 변수

프로젝트를 배포하기 전에 다음 환경 변수들을 설정해야 합니다:

- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase 공개 키 (anon/public key)

## Supabase Edge Functions 배포

Supabase 계정이 있고 **본인 소유의 Supabase 프로젝트**를 사용한다면, 로컬에서 Supabase CLI로 배포할 수 있습니다.

#### 1. Supabase CLI 설치

- macOS: `brew install supabase/tap/supabase`
- 또는 [공식 문서](https://supabase.com/docs/guides/cli) 참고

#### 2. 로그인 및 프로젝트 연결

```bash
supabase login
```

이 레포의 `supabase/config.toml`에 이미 `project_id`가 있으면 연결된 상태입니다.  
다른 프로젝트로 바꾸려면:

```bash
supabase link --project-ref <프로젝트_REF>
```

프로젝트 REF는 Supabase URL에서 확인: `https://xxxxx.supabase.co` → `xxxxx`.

#### 3. Edge Function 배포

```bash
supabase functions deploy firebase-signup
supabase functions deploy firebase-login
```

#### 4. Secret 설정 (firebase-signup / firebase-login용)

[Supabase Dashboard](https://app.supabase.com) → 해당 프로젝트 → **Project Settings** → **Edge Functions** → **Secrets**에서 다음을 추가합니다.

- `FIREBASE_API_KEY`: Firebase 웹 API 키 (클라이언트 `VITE_FIREBASE_API_KEY`와 동일)
- `SUPABASE_URL`: Supabase 프로젝트 URL (예: `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 롤 키 (Project Settings → API에서 확인)

이후 앱에서는 `VITE_SUPABASE_URL`만 있으면 `/functions/v1/firebase-signup`, `firebase-login`이 호출됩니다. 별도 `VITE_BACKEND_URL`은 필요 없습니다.

---

## Supabase 리디렉션 URL 설정

**중요**: 도메인을 변경한 후에는 Supabase 대시보드에서 리디렉션 URL을 업데이트해야 합니다.

1. **Supabase 대시보드 접속**
   - [Supabase Dashboard](https://app.supabase.com)에 로그인
   - 프로젝트 선택

2. **Authentication 설정 업데이트**
   - Authentication > URL Configuration으로 이동
   - **Site URL**: 새 도메인 (예: `https://yourdomain.com`)
   - **Redirect URLs**에 다음 추가:
     - `https://yourdomain.com/auth`
     - `https://yourdomain.com/**` (와일드카드)
     - 개발 환경을 유지하려면: `http://localhost:8080/auth`

3. **이메일 템플릿 확인**
   - Authentication > Email Templates
   - 리디렉션 URL이 새 도메인을 사용하도록 확인

## 로컬 테스트

배포 전 로컬에서 빌드 테스트:

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 문제 해결

### 환경 변수 오류
- 환경 변수 이름이 `VITE_`로 시작하는지 확인
- 빌드 후 환경 변수가 제대로 포함되었는지 확인:
  - `dist/index.html` 또는 빌드된 JavaScript 파일 확인

### 라우팅 오류 (404)
- SPA(Single Page Application)이므로 모든 경로를 `index.html`로 리다이렉트해야 함
- Vercel: `vercel.json`의 `rewrites` 설정 확인
- Netlify: `netlify.toml`의 `redirects` 설정 확인

## 추가 확인사항

1. **빌드 성공 여부**: 배포 플랫폼의 빌드 로그 확인
2. **환경 변수**: 프로덕션 환경에서 환경 변수가 제대로 로드되는지 확인
3. **Supabase 연결**: 브라우저 콘솔에서 Supabase 연결 오류 확인
4. **인증 플로우**: 로그인/회원가입이 새 도메인에서 정상 작동하는지 테스트

## 보안 고려사항

- 환경 변수에 민감한 정보가 포함되지 않도록 주의 (프론트엔드 환경 변수는 빌드에 포함됨)
- Supabase 서비스 롤 키는 절대 프론트엔드 코드에 포함하지 말 것
- HTTPS 사용 (대부분의 배포 플랫폼에서 자동 제공)