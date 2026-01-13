import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Settings, 
  Megaphone, 
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Shield,
  Save,
  Sparkles,
  Copy,
  Check
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface PlatformSettings {
  email_verification_enabled: boolean;
}

const AI_PROMPT = `# 학부모-학원 연결 플랫폼 (Parent-Academy Connection Platform)
## 완전한 구현 가이드

---

## 📋 프로젝트 개요

학부모와 학원을 연결하는 모바일 우선(Mobile-First) 웹 애플리케이션입니다.

### 핵심 가치
- **학부모**: 지역 기반 학원 탐색, 학습 성향 매칭, 상담/수업 예약, 시간표 관리
- **학원 관리자**: 학원 프로필 운영, 수업/강사 관리, 학부모 상담, 커뮤니티 소통
- **슈퍼 관리자**: 전체 플랫폼 관리, 학원 등록 승인, 시스템 설정

---

## 🛠 기술 스택

### Frontend
- **React 18** + **TypeScript** + **Vite** (빌드 도구)
- **Tailwind CSS** + **shadcn/ui** (컴포넌트 라이브러리)
- **React Router v6** (라우팅)
- **TanStack Query (React Query)** (서버 상태 관리)
- **React Hook Form** + **Zod** (폼 관리 및 유효성 검사)
- **Lucide React** (아이콘)
- **Sonner** (토스트 알림)
- **Recharts** (차트)
- **React Leaflet** (지도)
- **Framer Motion 스타일 애니메이션**

### Backend (Supabase)
- **Supabase Auth**: 이메일/비밀번호 인증
- **Supabase Database**: PostgreSQL with RLS (Row Level Security)
- **Supabase Storage**: 이미지 업로드 (학원 프로필, 피드 이미지)
- **Supabase Edge Functions**: 서버리스 함수
- **Supabase Realtime**: 실시간 채팅

---

## 👥 사용자 역할 및 권한

### 1. 학부모 (Parent) - role: 'parent'
\`\`\`
권한:
- 학원 탐색/검색/필터링
- 학원 찜하기 (북마크)
- 상담 예약 신청
- 설명회 신청
- 수업 등록
- 시간표 관리 (등록 수업 + 수동 일정)
- 학습 성향 테스트 진행
- 채팅 상담
- 커뮤니티 피드 조회
\`\`\`

### 2. 학원 관리자 (Admin) - role: 'admin'
\`\`\`
권한:
- 학원 프로필 관리 (기본 정보, 이미지, 태그, 대상 지역)
- 강사 등록/수정/삭제
- 수업 개설/관리 (시간표, 수강료, 커리큘럼)
- 상담 예약 확인/관리
- 설명회 등록/관리
- 피드 포스트 작성 (공지, 이벤트, 설명회 홍보)
- 채팅 상담 응대
- 상담 예약 설정 (운영시간, 휴무일, 휴게시간)
\`\`\`

### 3. 슈퍼 관리자 (Super Admin) - is_super_admin: true
\`\`\`
권한:
- 모든 학원 CRUD (생성, 조회, 수정, 삭제)
- MOU 학원 지정
- 프로필 잠금/해제 (수정 방지)
- 사용자 관리 (역할 변경, 삭제)
- 사업자 인증 심사 (승인/반려)
- 플랫폼 공지사항 관리
- 시스템 설정 (이메일 인증 등)
- 전체 피드 관리
\`\`\`

---

## 🗃 데이터베이스 스키마 (상세)

### 핵심 테이블

#### academies (학원)
\`\`\`sql
id: UUID (PK)
owner_id: UUID (FK -> auth.users, nullable) -- 학원장 ID
name: TEXT (NOT NULL) -- 학원명
subject: TEXT (NOT NULL) -- 주요 과목 (수학, 영어, 국어 등)
description: TEXT -- 학원 소개
address: TEXT -- 주소
profile_image: TEXT -- 프로필 이미지 URL
tags: TEXT[] -- 태그 배열 (예: ["1:1 맞춤", "소수정예"])
target_grade: TEXT -- 대상 학년 ("초등", "중등", "고등")
target_regions: TEXT[] -- 타겟 지역 배열
target_tags: TEXT[] -- 타겟 태그 (학습성향 매칭용)
is_mou: BOOLEAN -- MOU 학원 여부
is_profile_locked: BOOLEAN -- 프로필 수정 잠금
locked_by: UUID -- 잠금 실행자
locked_at: TIMESTAMPTZ -- 잠금 시간
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### teachers (강사)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies)
name: TEXT (NOT NULL)
subject: TEXT -- 담당 과목
bio: TEXT -- 소개
image_url: TEXT -- 프로필 이미지
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### classes (수업)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies)
teacher_id: UUID (FK -> teachers, nullable)
name: TEXT (NOT NULL) -- 수업명
description: TEXT -- 수업 설명
schedule: TEXT -- 시간표 정보 (JSON 문자열)
  예: [{"day": "월", "start": "14:00", "end": "16:00"}]
fee: INTEGER -- 수강료 (원)
target_grade: TEXT -- 대상 학년
curriculum: JSONB -- 커리큘럼 (주차별 내용)
  예: [{"week": 1, "topic": "기초개념", "details": "..."}]
is_recruiting: BOOLEAN -- 모집 중 여부
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### class_enrollments (수업 등록)
\`\`\`sql
id: UUID (PK)
user_id: UUID (FK -> auth.users)
class_id: UUID (FK -> classes)
created_at: TIMESTAMPTZ
UNIQUE(user_id, class_id)
\`\`\`

#### manual_schedules (수동 일정)
\`\`\`sql
id: UUID (PK)
user_id: UUID (FK -> auth.users)
title: TEXT (NOT NULL) -- 일정명
day: TEXT (NOT NULL) -- 요일 (월, 화, ...)
start_time: TIME -- 시작 시간
end_time: TIME -- 종료 시간
color_index: INTEGER -- 색상 인덱스 (0-9)
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### consultation_reservations (상담 예약)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies)
parent_id: UUID (FK -> auth.users) -- 예약 학부모
student_name: TEXT (NOT NULL) -- 학생 이름
student_grade: TEXT -- 학생 학년
reservation_date: DATE -- 예약 날짜
reservation_time: TIME -- 예약 시간
message: TEXT -- 메모
status: TEXT -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### academy_settings (학원 상담 설정)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies, UNIQUE)
consultation_start_time: TIME -- 상담 시작 시간 (예: 09:00)
consultation_end_time: TIME -- 상담 종료 시간 (예: 18:00)
slot_duration: INTEGER -- 상담 단위 시간 (분, 기본 30)
closed_days: INTEGER[] -- 휴무 요일 (0=일, 1=월, ..., 6=토)
break_start_time: TIME -- 휴게 시작
break_end_time: TIME -- 휴게 종료
temporary_closed_dates: DATE[] -- 임시 휴무일
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### seminars (설명회)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies)
title: TEXT (NOT NULL)
description: TEXT
date: TIMESTAMPTZ -- 설명회 일시
location: TEXT -- 장소
capacity: INTEGER -- 정원
target_grade: TEXT -- 대상 학년
subject: TEXT -- 관련 과목
image_url: TEXT -- 홍보 이미지
status: 'recruiting' | 'closed'
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### seminar_applications (설명회 신청)
\`\`\`sql
id: UUID (PK)
seminar_id: UUID (FK -> seminars)
user_id: UUID (FK -> auth.users)
student_name: TEXT (NOT NULL)
student_grade: TEXT
message: TEXT
attendee_count: INTEGER -- 참석 인원
created_at: TIMESTAMPTZ
\`\`\`

#### feed_posts (커뮤니티 피드)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies)
title: TEXT (NOT NULL)
body: TEXT
type: TEXT -- 'notice' | 'event' | 'seminar' | 'general'
image_url: TEXT -- JSON 배열로 다중 이미지 지원: ["url1", "url2"]
target_regions: TEXT[] -- 노출 대상 지역 (학원의 target_regions 복사)
seminar_id: UUID (FK -> seminars, nullable) -- 설명회 연동 시
like_count: INTEGER
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### post_likes (좋아요)
\`\`\`sql
id: UUID (PK)
post_id: UUID (FK -> feed_posts)
user_id: UUID (FK -> auth.users)
created_at: TIMESTAMPTZ
UNIQUE(post_id, user_id)
\`\`\`

#### bookmarks (찜하기)
\`\`\`sql
id: UUID (PK)
user_id: UUID (FK -> auth.users)
academy_id: UUID (FK -> academies)
created_at: TIMESTAMPTZ
UNIQUE(user_id, academy_id)
\`\`\`

#### chat_rooms (채팅방)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies)
parent_id: UUID (FK -> auth.users) -- 학부모 ID
created_at, updated_at: TIMESTAMPTZ
UNIQUE(academy_id, parent_id)
\`\`\`

#### messages (메시지)
\`\`\`sql
id: UUID (PK)
chat_room_id: UUID (FK -> chat_rooms)
sender_id: UUID (FK -> auth.users)
content: TEXT (NOT NULL)
is_read: BOOLEAN
created_at: TIMESTAMPTZ
\`\`\`

#### profiles (사용자 프로필)
\`\`\`sql
id: UUID (PK, FK -> auth.users)
email: TEXT
phone: TEXT
user_name: TEXT -- 닉네임
learning_style: TEXT -- 학습 성향 (자기주도형, 소통중심형, 체계관리형, 멘토링형)
profile_tags: TEXT[] -- 프로필 태그
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### user_roles (사용자 역할)
\`\`\`sql
id: UUID (PK)
user_id: UUID (FK -> auth.users, UNIQUE)
role: 'parent' | 'admin'
is_super_admin: BOOLEAN
\`\`\`

#### business_verifications (사업자 인증)
\`\`\`sql
id: UUID (PK)
user_id: UUID (FK -> auth.users)
business_number: TEXT -- 사업자번호
business_name: TEXT -- 상호명
document_url: TEXT -- 증빙 서류 URL
status: 'pending' | 'approved' | 'rejected'
rejection_reason: TEXT -- 반려 사유
reviewed_at: TIMESTAMPTZ
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### announcements (플랫폼 공지)
\`\`\`sql
id: UUID (PK)
title: TEXT (NOT NULL)
content: TEXT (NOT NULL)
is_active: BOOLEAN
priority: INTEGER -- 높을수록 상단
created_by: UUID (FK -> auth.users)
created_at, updated_at: TIMESTAMPTZ
\`\`\`

#### platform_settings (플랫폼 설정)
\`\`\`sql
id: UUID (PK)
key: TEXT (UNIQUE) -- 설정 키
value: JSONB -- 설정 값
description: TEXT
updated_by: UUID
updated_at: TIMESTAMPTZ
\`\`\`

#### profile_views (프로필 조회)
\`\`\`sql
id: UUID (PK)
academy_id: UUID (FK -> academies)
viewer_id: UUID (nullable)
viewed_at: TIMESTAMPTZ
created_at: TIMESTAMPTZ
\`\`\`

---

## 🧭 라우트 구조 (상세)

### 공통
\`\`\`
/ -> HomePage (역할에 따라 리다이렉트)
/auth -> AuthPage (로그인/회원가입)
/role-selection -> RoleSelection (역할 선택)
\`\`\`

### 학부모 전용 (/*)
\`\`\`
/                          -> 홈 (추천 학원, 지역 선택, 설명회)
/explore                   -> 학원 탐색 (필터: 과목, 지역, 태그)
/events                    -> 설명회/이벤트 목록
/community                 -> 커뮤니티 피드
/academy/:id               -> 학원 상세 (정보, 강사, 수업, 리뷰)
/seminar/:id               -> 설명회 상세
/my                        -> 마이페이지
/my/classes                -> MY CLASS (등록 수업)
/my/bookmarks              -> 찜한 학원
/my/reservations           -> 예약 내역 (상담, 설명회)
/timetable                 -> 시간표
/chat                      -> 채팅 목록
/chat/:roomId              -> 채팅방
/learning-style-test       -> 학습 성향 테스트
/learning-style-result     -> 테스트 결과
/settings                  -> 설정
/customer-service          -> 고객센터
\`\`\`

### 학원 관리자 전용 (/admin/*)
\`\`\`
/admin/home                -> 관리자 홈 (대시보드, 퀵 액션)
/admin/dashboard           -> 상세 대시보드
/admin/profile             -> 프로필 관리
/admin/consultations       -> 상담 관리
/admin/reservations        -> 예약 관리
/admin/posts               -> 학원 게시물 관리
/admin/feed-posts          -> 피드 포스트 관리
/admin/seminars            -> 설명회 관리
/admin/chat                -> 채팅 목록
/admin/chat/:roomId        -> 채팅방
/admin/my                  -> 학원장 마이페이지
/admin/community           -> 커뮤니티 (전체 소식 모니터링)
/admin/business-verification -> 사업자 인증 신청
\`\`\`

### 슈퍼 관리자 전용 (/admin/super/*)
\`\`\`
/admin/super               -> 슈퍼 관리자 메인
/admin/super/academies     -> 학원 관리 (목록)
/admin/super/academies/create -> 학원 생성
/admin/super/academies/:id/edit -> 학원 수정
/admin/super/users         -> 사용자 관리
/admin/super/posts         -> 피드 관리
/admin/super/settings      -> 시스템 설정 (공지, 인증 설정)
/admin/super/verification  -> 사업자 인증 심사
\`\`\`

---

## 🎨 디자인 시스템

### 레이아웃
- **모바일 우선**: max-w-lg mx-auto (최대 512px)
- **하단 네비게이션**: 고정 (h-16, 5개 탭)
- **상단 헤더**: sticky, backdrop-blur
- **콘텐츠 영역**: pb-20 (하단 네비 공간)

### 색상 토큰 (HSL)
\`\`\`css
--background: 0 0% 100%
--foreground: 222.2 84% 4.9%
--primary: 222.2 47.4% 11.2%
--primary-foreground: 210 40% 98%
--secondary: 210 40% 96.1%
--muted: 210 40% 96.1%
--muted-foreground: 215.4 16.3% 46.9%
--accent: 210 40% 96.1%
--destructive: 0 84.2% 60.2%
--border: 214.3 31.8% 91.4%
--card: 0 0% 100%
\`\`\`

### 하단 네비게이션 구성
학부모 모드: [홈, 채팅, 탐색, 커뮤니티, 마이]
학원장 모드: [홈, 채팅, 학원 프로필, 커뮤니티, 마이]

---

## 🔐 인증 및 권한

### 인증 플로우
1. 이메일/비밀번호 회원가입 (AuthPage)
2. 이메일 인증 (설정에 따라 auto-confirm 가능)
3. 역할 선택 (RoleSelection): parent 또는 admin
4. 역할별 페이지 리다이렉트

### 역할 확인 방법
\`\`\`typescript
// user_roles 테이블 조회
const { data } = await supabase
  .from('user_roles')
  .select('role, is_super_admin')
  .eq('user_id', userId)
  .single();

// 역할: data.role ('parent' | 'admin')
// 슈퍼관리자: data.is_super_admin === true
\`\`\`

### RLS 정책 패턴
\`\`\`sql
-- 본인 데이터만 접근
CREATE POLICY "Users can access own data" 
ON table_name FOR ALL 
USING (auth.uid() = user_id);

-- 학원장은 본인 학원 데이터 접근
CREATE POLICY "Academy owners can manage" 
ON table_name FOR ALL 
USING (
  academy_id IN (
    SELECT id FROM academies WHERE owner_id = auth.uid()
  )
);
\`\`\`

---

## 📦 주요 컴포넌트

### 레이아웃
- \`BottomNavigation\`: 학부모용 하단 네비
- \`AdminBottomNavigation\`: 관리자용 하단 네비
- \`AdminHeader\`: 관리자 페이지 헤더
- \`Logo\`: 로고 컴포넌트

### 공통 UI
- \`ImageUpload\`: 단일 이미지 업로드
- \`MultiImageUpload\`: 다중 이미지 업로드
- \`RegionSelector\`: 지역 선택 드롭다운
- \`GlobalRegionSelector\`: 전역 지역 필터
- \`ClassScheduleInput\`: 수업 시간표 입력
- \`CurriculumEditor\`: 커리큘럼 편집기

### 학원 관련
- \`RecommendedAcademies\`: 추천 학원 캐러셀
- \`CompactAcademyList\`: 학원 목록
- \`AcademyNewsFeed\`: 학원 소식 피드
- \`ConsultationReservationDialog\`: 상담 예약 다이얼로그

### 피드/커뮤니티
- \`FeedPostCard\`: 피드 게시물 카드
- \`FeedPostDetailSheet\`: 게시물 상세 시트
- \`CreatePostDialog\`: 게시물 작성 다이얼로그

### 설명회
- \`SeminarCarousel\`: 설명회 캐러셀
- \`SeminarFeedCard\`: 설명회 카드

---

## 🪝 커스텀 훅

\`\`\`typescript
useSuperAdmin()      // 슈퍼관리자 여부 확인
useParentProfile()   // 학부모 프로필 조회
useChatRooms()       // 채팅방 목록
useChatMessages()    // 채팅 메시지 (실시간)
useUnreadMessages()  // 안읽은 메시지 수
useClassEnrollments() // 수업 등록 상태
useBusinessVerification() // 사업자 인증 상태
useInfiniteScroll()  // 무한 스크롤
\`\`\`

---

## 🌐 Context

\`\`\`typescript
RegionContext: {
  selectedRegion: string | null,
  setSelectedRegion: (region: string | null) => void
}
\`\`\`

---

## 📁 폴더 구조

\`\`\`
src/
├── components/
│   ├── ui/          # shadcn/ui 컴포넌트
│   └── *.tsx        # 커스텀 컴포넌트
├── pages/
│   ├── admin/       # 관리자 페이지
│   └── *.tsx        # 일반 페이지
├── hooks/           # 커스텀 훅
├── contexts/        # React Context
├── lib/             # 유틸리티 함수
├── integrations/
│   └── supabase/    # Supabase 클라이언트, 타입
└── assets/          # 정적 자산

supabase/
├── functions/       # Edge Functions
└── config.toml      # Supabase 설정
\`\`\`

---

## 🔑 핵심 비즈니스 로직

### 학습 성향 매칭
\`\`\`
4가지 학습 성향:
- 자기주도형: 자기주도학습, 개별진도, 자율학습
- 소통중심형: 토론수업, 그룹활동, 발표수업
- 체계관리형: 체계적관리, 숙제관리, 출결관리
- 멘토링형: 1:1 맞춤, 멘토링, 상담중심

학원의 target_tags와 사용자의 learning_style을 매칭하여 
추천 점수 계산
\`\`\`

### 상담 예약 시스템
\`\`\`
1. academy_settings에서 운영 시간, 휴무일 조회
2. consultation_reservations에서 예약된 시간 제외
3. 가능한 시간대 표시
4. 예약 생성 (status: 'pending')
5. 학원장 확인 후 상태 변경
\`\`\`

### 시간표 통합
\`\`\`
1. class_enrollments에서 등록 수업 조회
2. classes.schedule 파싱 (JSON 배열)
3. manual_schedules에서 수동 일정 조회
4. 요일/시간별 그리드 표시
\`\`\`

---

## 💡 구현 시 주의사항

1. **모든 색상은 시맨틱 토큰 사용** (text-primary, bg-muted 등)
2. **모바일 우선 디자인** (max-w-lg)
3. **RLS 정책 필수** - 모든 테이블에 적절한 보안 정책
4. **한국어 UI** - 모든 텍스트는 한국어
5. **토스트 알림** - 액션 결과는 sonner toast로 표시
6. **로딩 상태** - Loader2 스피너 사용
7. **에러 처리** - try-catch와 toast.error

---

이 프롬프트를 사용하여 AI가 앱의 구조, 데이터 모델, 비즈니스 로직을 완전히 이해하고 일관된 방식으로 추가 개발을 진행할 수 있습니다.`;

const SuperAdminSettingsPage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_active: true,
    priority: 0
  });
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    email_verification_enabled: true
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      toast.success("프롬프트가 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("복사에 실패했습니다");
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchAnnouncements();
      fetchPlatformSettings();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('key', 'email_verification_enabled')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPlatformSettings({
          email_verification_enabled: data.value === true || data.value === 'true'
        });
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    }
  };

  const handleEmailVerificationToggle = async (enabled: boolean) => {
    setSettingsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: existingData } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('key', 'email_verification_enabled')
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ 
            value: enabled,
            updated_by: session?.user?.id 
          })
          .eq('key', 'email_verification_enabled');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            key: 'email_verification_enabled',
            value: enabled,
            description: '회원가입 시 이메일 인증 필수 여부',
            updated_by: session?.user?.id
          });

        if (error) throw error;
      }

      setPlatformSettings({ email_verification_enabled: enabled });
      toast.success(enabled ? "이메일 인증이 활성화되었습니다" : "이메일 인증이 비활성화되었습니다");
    } catch (error) {
      console.error('Error updating email verification setting:', error);
      toast.error("설정 변경에 실패했습니다");
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error("공지사항을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title.trim(),
            content: formData.content.trim(),
            is_active: formData.is_active,
            priority: formData.priority
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast.success("공지사항이 수정되었습니다");
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: formData.title.trim(),
            content: formData.content.trim(),
            is_active: formData.is_active,
            priority: formData.priority,
            created_by: session?.user?.id
          });

        if (error) throw error;
        toast.success("공지사항이 등록되었습니다");
      }

      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error("저장에 실패했습니다");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("공지사항이 삭제되었습니다");
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_active: announcement.is_active,
      priority: announcement.priority
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", is_active: true, priority: 0 });
    setEditingAnnouncement(null);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAnnouncements();
      toast.success(currentStatus ? "공지사항이 비활성화되었습니다" : "공지사항이 활성화되었습니다");
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error("상태 변경에 실패했습니다");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">접근 권한이 없습니다</h1>
        <Button onClick={() => navigate('/admin/home')}>돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/super')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo size="sm" showText={false} />
          <span className="font-semibold text-foreground">시스템 설정</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Announcements Section */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              플랫폼 공지사항
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingAnnouncement ? "공지사항 수정" : "새 공지사항"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="공지사항 제목"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">내용</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="공지사항 내용을 입력하세요"
                      rows={4}
                      maxLength={1000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">우선순위</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      placeholder="높을수록 상단에 표시"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">활성화</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {editingAnnouncement ? "수정하기" : "등록하기"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                등록된 공지사항이 없습니다
              </p>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{announcement.title}</h4>
                        <Badge variant={announcement.is_active ? "default" : "secondary"}>
                          {announcement.is_active ? "활성" : "비활성"}
                        </Badge>
                        {announcement.priority > 0 && (
                          <Badge variant="outline">우선: {announcement.priority}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(announcement.id, announcement.is_active)}
                      >
                        <Switch checked={announcement.is_active} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              기본 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Verification Toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">이메일 인증</h4>
                <p className="text-sm text-muted-foreground">
                  회원가입 시 이메일 인증을 필수로 요구합니다
                </p>
              </div>
              <Switch
                checked={platformSettings.email_verification_enabled}
                onCheckedChange={handleEmailVerificationToggle}
                disabled={settingsLoading}
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              ※ 이메일 인증을 비활성화하면 가입 즉시 계정이 활성화됩니다
            </p>
          </CardContent>
        </Card>
      </main>

      {/* AI Prompt Button - Fixed Bottom Right */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-24 right-4 h-12 w-12 rounded-full shadow-lg z-50"
          >
            <Sparkles className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI 구현용 프롬프트
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              아래 프롬프트를 AI에게 제공하면 이 앱의 구조와 기능을 이해하고 추가 개발을 할 수 있습니다.
            </p>
            <ScrollArea className="h-[50vh] border border-border rounded-lg p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono text-foreground">
                {AI_PROMPT}
              </pre>
            </ScrollArea>
            <Button onClick={handleCopyPrompt} className="w-full">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  프롬프트 복사
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSettingsPage;
