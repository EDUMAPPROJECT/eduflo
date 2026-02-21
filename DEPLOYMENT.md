# 배포 가이드 - 커스텀 도메인 연결

이 문서는 프로젝트를 커스텀 도메인으로 배포하기 위한 단계별 가이드입니다.

## 필수 환경 변수

프로젝트를 배포하기 전에 다음 환경 변수들을 설정해야 합니다:

- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase 공개 키 (anon/public key)

## Supabase Edge Functions 배포 (Lovable 사용 시)

Lovable에서 백엔드를 쓰는 방식은 두 가지입니다.

### Lovable Cloud를 쓰는 경우 (Supabase 계정 없음)

**Lovable Cloud**는 Lovable이 Supabase 인스턴스를 대신 만들어서 관리하는 방식입니다.  
이 경우 **Supabase 계정이 없고**, Supabase 대시보드 접속·CLI 배포·Secret 직접 설정이 **불가능**합니다.

이 레포의 `firebase-signup`, `firebase-login`을 쓰려면 다음 중 하나를 선택해야 합니다.

#### 선택 1: Lovable 채팅으로 Edge Function 추가·배포 요청

1. Lovable 프로젝트 에디터에서 **채팅**으로 요청합니다.
   - 예: *"Firebase 휴대폰 인증 후 Supabase 사용자를 만드는 Edge Function 두 개를 추가해줘. 회원가입용 firebase-signup, 로그인용 firebase-login. 레포에 이미 있는 `supabase/functions/firebase-signup`, `supabase/functions/firebase-login` 코드를 참고해서 배포해줘."*
2. Lovable이 Edge Function을 만들고 배포하면, **시크릿**(Firebase API 키 등)은 Lovable이 안내하는 **API 키/시크릿 입력 UI**(예: Integrations, Add API Key)에 입력합니다.
3. 앱에서는 `VITE_SUPABASE_URL`(Lovable이 넣어주는 값)로 `/functions/v1/firebase-signup`, `firebase-login`이 호출되도록 이미 구현되어 있습니다.

#### 선택 2: 본인 Supabase 프로젝트로 전환 후 CLI로 배포

Supabase 계정을 만들고 **본인 소유의 Supabase 프로젝트**를 만든 뒤, Lovable 프로젝트 설정에서 **그 Supabase 프로젝트로 연결**하면, 그때부터는 Supabase 대시보드·CLI를 쓸 수 있습니다.  
(이전에 Lovable Cloud만 쓰던 경우, DB/데이터는 수동 마이그레이션이 필요할 수 있습니다. [Lovable Self-hosting](https://docs.lovable.dev/tips-tricks/self-hosting) 참고.)

연결 후에는 아래 **「본인 Supabase 프로젝트를 Lovable에 연결한 경우」** 절차대로 배포하면 됩니다.

---

### 본인 Supabase 프로젝트를 Lovable에 연결한 경우

Supabase 계정이 있고, Lovable에서 **내 Supabase 프로젝트**를 선택해 연결한 상태라면, 로컬에서 Supabase CLI로 배포할 수 있습니다.

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