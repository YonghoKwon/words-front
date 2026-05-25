# Words Front

영어 단어 학습용 모바일 우선 웹 프론트엔드입니다. React 19, TypeScript, Vite, Mantine를 사용하며 `words-back` Spring Boot API와 `/api` 프록시로 연동합니다.

## 주요 기능

- 랜덤 단어 학습
- 영단어 먼저 / 뜻 먼저 전환
- 품사 필터
- 컨설텝스 단어 / 일반 TEPS 단어 전환
- 즐겨찾기 저장 및 즐겨찾기 복습
- 오답 저장 및 오답 우선 복습
- 객관식 퀴즈 모드
- 세션 정답률 표시
- 단어 목록, 즐겨찾기 목록, 오답순 목록
- 모바일 스와이프 제스처
  - 오른쪽 스와이프: 정답 보기
  - 왼쪽 스와이프: 다음 단어

## 실행 방법

```bash
npm install
npm run dev
```

기본 백엔드 프록시 대상은 `http://localhost:8080`입니다. 다른 백엔드로 연결하려면 `VITE_API_TARGET`을 지정합니다.

```bash
VITE_API_TARGET=http://localhost:8080 npm run dev
```

Windows PowerShell:

```powershell
$env:VITE_API_TARGET="http://localhost:8080"
npm run dev
```

## 빌드 및 검사

```bash
npm run build
npm run lint
npm run test:e2e
```

## API 연동 요약

프론트는 다음 API를 사용합니다.

- `GET /api/words/random?type=concepts|regular&partOfSpeech=n.`
- `GET /api/words/range?type=concepts|regular&startSeq=1&endSeq=20`
- `GET /api/words/quiz-choices?type=concepts|regular&seq=1&partOfSpeech=n.&limit=8`
- `GET /api/words/progress?...`
- `POST /api/words/bookmarks`
- `DELETE /api/words/bookmarks?...`
- `GET /api/words/bookmarks`
- `POST /api/words/wrongs`
- `GET /api/words/wrongs`

## 이번 개선 브랜치

브랜치: `feature/mobile-study-ux-service-polish`

반영 내용:

- iPhone 15 Pro 기준 학습 화면 레이아웃 재정리
- 현재 학습 조건 칩 추가
- 옵션 패널 접기/펼치기 개선
- 카드 상단에 즐겨찾기/오답 저장 액션 배치
- 오답 누적 횟수 표시
- 세션 정답률 UI 정리
- 퀴즈 선택지 로딩을 신규 백엔드 API 우선 사용 방식으로 변경
- 단어 조회 실패 시 기본 단어 대신 빈 상태와 재시도 버튼 표시

자세한 분석과 작업 가이드는 `AGENTS.md`를 참고하세요.
