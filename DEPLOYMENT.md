# 배포 가이드 - 커스텀 도메인 연결

이 문서는 프로젝트를 커스텀 도메인으로 배포하기 위한 단계별 가이드입니다.

## 필수 환경 변수

프로젝트를 배포하기 전에 다음 환경 변수들을 설정해야 합니다:

- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase 공개 키 (anon/public key)

## 배포 플랫폼 선택

### 1. Vercel (권장)

Vercel은 Vite 프로젝트와 매우 잘 통합되며, 커스텀 도메인 연결이 간단합니다.

#### 배포 단계:

1. **GitHub/GitLab/Bitbucket에 코드 푸시**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push
   ```

2. **Vercel에 프로젝트 연결**
   - [Vercel](https://vercel.com)에 로그인
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - 프로젝트 설정:
     - Framework Preset: Vite
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **환경 변수 설정**
   - Vercel 대시보드에서 프로젝트 선택
   - Settings > Environment Variables로 이동
   - 다음 변수 추가:
     - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
     - `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase 공개 키

4. **커스텀 도메인 연결**
   - Settings > Domains로 이동
   - 도메인 추가
   - DNS 설정 안내에 따라 도메인 제공업체에서 DNS 레코드 추가
   - SSL 인증서는 자동으로 발급됩니다

5. **재배포**
   - 환경 변수 추가 후 자동으로 재배포되거나
   - Deployments 탭에서 "Redeploy" 클릭

### 2. Netlify

Netlify도 좋은 대안입니다.

#### 배포 단계:

1. **netlify.toml 파일 생성** (선택사항, 자동 감지 가능)
2. **Netlify에 프로젝트 연결**
   - [Netlify](https://www.netlify.com)에 로그인
   - "Add new site" > "Import an existing project"
   - Git 저장소 연결
3. **빌드 설정**
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **환경 변수 설정**
   - Site settings > Environment variables
   - 필요한 변수 추가
5. **커스텀 도메인 연결**
   - Domain settings > Custom domains
   - 도메인 추가 및 DNS 설정

### 3. Cloudflare Pages

무료로 제공되며 글로벌 CDN이 포함됩니다.

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

### CORS 오류
- Supabase에서 새 도메인을 허용된 오리진에 추가했는지 확인

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