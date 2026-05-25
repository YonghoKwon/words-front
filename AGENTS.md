# AGENTS.md — Words 학습 서비스 분석 및 작업 가이드

## 1. 프로젝트 개요

`words-front`는 React 19, TypeScript, Vite, Mantine 기반의 영어 단어 학습 모바일 우선 웹앱이다. 현재 핵심 화면은 다음 두 가지다.

- `/` — 랜덤 단어 학습 화면
- `/words` — 단어 목록, 즐겨찾기, 오답 목록 화면

백엔드는 `words-back` Spring Boot API를 `/api` 프록시로 연결한다. 프론트 개발 서버는 `VITE_API_TARGET` 환경변수가 없으면 `http://localhost:8080`으로 프록시한다.

## 2. 현재 구조 분석

### 프론트엔드

- `src/main.tsx`
  - MantineProvider를 적용하고 기본 다크 모드로 앱을 렌더링한다.
- `src/App.tsx`
  - 공통 헤더, 라이트/다크 토글, 상단 탭 네비게이션, 라우팅을 담당한다.
- `src/pages/WordStudyPage.tsx`
  - 랜덤 단어, 즐겨찾기 복습, 오답 복습, 품사 필터, 영단어/뜻 먼저 모드를 관리한다.
- `src/components/WordCard.tsx`
  - 단어 카드, 스와이프, 정답 보기, 다음 단어, 즐겨찾기, 오답 저장, 객관식 퀴즈, 세션 정답률을 담당한다.
- `src/pages/WordListPage.tsx`
  - 범위 기반 단어 목록, 즐겨찾기 목록, 오답순 목록, 검색, 컴팩트 보기, 페이지 이동을 담당한다.
- `src/services/WordProgressService.ts`
  - 즐겨찾기, 오답, 단어 진행 상태 API 호출을 분리한다.

### 백엔드 연동

- 랜덤 단어: `GET /api/words/random?type=concepts|regular&partOfSpeech=n.`
- 범위 조회: `GET /api/words/range?type=concepts|regular&startSeq=1&endSeq=20`
- 객관식 보기 후보: `GET /api/words/quiz-choices?type=concepts|regular&seq=1&partOfSpeech=n.&limit=8`
- 진행 상태: `GET /api/words/progress?...`
- 즐겨찾기: `POST/DELETE/GET /api/words/bookmarks`
- 오답: `POST/GET /api/words/wrongs`

## 3. 이번 브랜치에서 반영한 UX/UI 개선

브랜치: `feature/mobile-study-ux-service-polish`

### 모바일 학습 화면 개선

- 기존 화면은 버튼과 카드 간 간격이 다소 무겁고, 현재 학습 조건이 한눈에 들어오지 않았다.
- 상단에 `Today's session` 히어로 영역과 현재 학습 조건 칩을 추가했다.
- `컨설텝스/일반 TEPS`, `품사`, `랜덤/즐겨찾기/오답 복습` 상태가 즉시 보이도록 했다.
- 옵션 영역은 기본적으로 접어두고, 필요할 때만 열어 화면 밀도를 낮췄다.
- iPhone 15 Pro 기준으로 CTA 버튼 높이, radius, gap, 카드 여백을 다시 조정했다.

### 단어 카드 개선

- 즐겨찾기와 오답 저장 액션을 카드 상단에 고정해 접근성을 높였다.
- 오답 저장 후 현재 단어의 누적 오답 횟수를 버튼에 표시한다.
- 세션 정답률을 카드 내부 상태 영역으로 정리했다.
- 정답 보기/다음 단어, 퀴즈 ON/OFF 버튼을 하단 CTA로 정렬했다.
- 객관식 보기 버튼은 번호 배지를 추가해 모바일에서 더 쉽게 누를 수 있게 했다.
- 퀴즈 정답/오답 후 자동 이동 상태에서 “바로 넘기기” 버튼을 제공한다.

### 오류/빈 상태 개선

- 단어 조회 실패 시 더 이상 `example` 기본 단어를 보여주지 않는다.
- 조건에 맞는 단어가 없거나 서버 오류가 있을 때 빈 상태 카드와 재시도 버튼을 표시한다.
- 즐겨찾기/오답 복습 조건에서 결과가 없을 때 사용자에게 명확히 안내한다.

## 4. 이번 브랜치에서 반영한 기능 개선

### 퀴즈 선택지 생성 방식 개선

기존 프론트는 현재 단어 기준 `seq ± 250` 범위를 가져와 클라이언트에서 보기 후보를 만들었다. 이 방식은 다음 문제가 있었다.

- 일반 단어와 컨설텝스 단어 구분이 명확하지 않았다.
- 가까운 seq 범위에 유사 품사 후보가 부족하면 퀴즈 생성 실패가 잦았다.
- 클라이언트가 불필요하게 넓은 범위를 가져왔다.

개선 후에는 백엔드의 `/api/words/quiz-choices` API를 우선 사용하고, 실패할 경우에만 기존 range 방식으로 폴백한다.

### 일반 단어 진행 상태 처리 개선

일반 TEPS 단어는 품사 값이 비어 있을 수 있다. 백엔드에서 진행 상태 저장/조회 시 빈 품사를 `-`로 정규화하도록 보완해 즐겨찾기/오답 저장 실패 가능성을 낮췄다.

### range API 타입 통일

백엔드의 `/api/words/range`에 `type=concepts|regular` 파라미터를 추가해 프론트에서 학습 타입에 맞는 보기 후보와 목록을 가져올 수 있게 했다.

## 5. 남아 있는 개선 후보

### UX/UI

1. 하단 탭 네비게이션 추가
   - 현재는 상단 SegmentedControl 기반이다.
   - 모바일 서비스처럼 `학습`, `목록`, `오답노트`, `통계` 하단 탭 구조로 바꾸면 접근성이 좋아진다.

2. 학습 진행률 대시보드
   - 오늘 본 단어 수, 정답률, 오답 증가 수, 즐겨찾기 수를 카드 상단 또는 홈 화면에 요약하면 학습 동기가 좋아진다.

3. 오답노트 전용 화면
   - 현재 오답은 단어 목록 내 모드로 제공된다.
   - 오답만 따로 묶어 `오답 횟수`, `마지막 오답일`, `최근 재복습 여부`를 보여주는 전용 화면이 있으면 서비스 완성도가 올라간다.

4. TEPS 스타일 문제 UX
   - 뜻 맞히기/영단어 맞히기 외에 빈칸, 동의어, 문맥 추론, 품사 판단 유형을 추가하면 실제 시험 대비성이 높아진다.

### 기능

1. 사용자 구분
   - 현재 즐겨찾기/오답은 사용자 계정 개념 없이 전역 데이터처럼 동작한다.
   - 실제 서비스라면 로그인 또는 익명 deviceId/sessionId 기반 분리가 필요하다.

2. 학습 이력 테이블
   - 단순 오답 카운트 외에 `seenCount`, `correctCount`, `lastSeenAt`, `lastCorrectAt`이 있으면 복습 알고리즘을 만들 수 있다.

3. 간격 반복 알고리즘
   - 오답 횟수와 마지막 학습 시점을 기반으로 `오늘 다시 볼 단어`를 자동 추천하면 학습 효율이 좋아진다.

4. API 응답 DTO 통일
   - 컨설텝스 단어와 일반 단어가 프론트에서 동일한 `ApiWordDto` 형태로 내려오도록 확장 중이다.
   - 목록/진행/퀴즈 API 전체를 DTO로 통일하면 프론트 방어 코드가 줄어든다.

5. 테스트 추가
   - 프론트: WordCard 퀴즈 상태, 필터 변경, 빈 상태 렌더링 테스트
   - 백엔드: `/random`, `/range`, `/quiz-choices`, progress 정규화 테스트

## 6. 실행 방법

### 백엔드

```bash
cd words-back
./mvnw spring-boot:run
```

백엔드는 기본적으로 8080 포트에서 동작한다고 가정한다.

### 프론트엔드

```bash
cd words-front
npm install
npm run dev
```

백엔드 주소를 바꾸려면 다음처럼 실행한다.

```bash
VITE_API_TARGET=http://localhost:8080 npm run dev
```

Windows PowerShell에서는 다음처럼 설정한다.

```powershell
$env:VITE_API_TARGET="http://localhost:8080"
npm run dev
```

## 7. 검증 체크리스트

- `npm run build`
- `npm run lint`
- 모바일 폭 393px 또는 iPhone 15 Pro 에뮬레이션에서 `/` 확인
- 랜덤 단어 조회 확인
- 품사 필터 변경 후 자동 재조회 확인
- 즐겨찾기 저장/해제 확인
- 오답 저장 및 오답 횟수 증가 확인
- 퀴즈 ON 후 선택지 생성 확인
- 정답/오답 후 3초 자동 이동 및 바로 넘기기 확인
- `/words`에서 목록, 즐겨찾기, 오답순 조회 확인

## 8. 작업 시 주의사항

- 모바일 기준 CTA는 최소 44px 이상 유지한다.
- 단어 카드 내부 CTA는 하단에 고정하되, 긴 뜻/퀴즈 선택지가 잘리지 않도록 `word-content`의 padding-bottom을 함께 조정한다.
- 일반 단어는 품사가 비어 있을 수 있으므로 프론트/백엔드 모두 빈 품사 방어가 필요하다.
- `WordCard`의 세션 정답률은 현재 `sessionStorage` 기반이다. 사용자 계정 기반 통계로 확장할 때는 서버 저장 방식으로 옮긴다.
- API 추가 시 프론트 폴백 경로를 유지하면 배포 순서가 어긋나도 앱이 완전히 깨지지 않는다.
