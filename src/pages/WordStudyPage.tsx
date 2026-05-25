import { useEffect, useMemo, useState } from 'react';
import { WordCard } from '../components/WordCard';
import { Word } from '../types/Word.ts';
import { fetchReviewDueWords, fetchStudySummary, WordStudySummary } from '../services/WordProgressService';
import '../styles/WordStudy.css';

const PART_OF_SPEECH_OPTIONS = [
  { value: 'all', label: '모든 품사' },
  { value: 'a.', label: '형용사(a.)' },
  { value: 'n.', label: '명사(n.)' },
  { value: 'v.', label: '동사(v.)' },
  { value: 'adv.', label: '부사(adv.)' },
  { value: 'prep.', label: '전치사(prep.)' },
  { value: 'conj.', label: '접속사(conj.)' },
];

const STUDY_MODE_LABELS = {
  normal: '랜덤',
  bookmark: '즐겨찾기',
  wrong: '오답 복습',
  reviewDue: '오늘 복습',
} as const;

const WORD_TYPE_LABELS = {
  concepts: '컨설텝스',
  regular: '일반 TEPS',
} as const;

export const WordStudyPage = () => {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordType, setWordType] = useState<'concepts' | 'regular'>('concepts');
  const [partOfSpeech, setPartOfSpeech] = useState<string>('all');
  const [studyMode, setStudyMode] = useState<'normal' | 'bookmark' | 'wrong' | 'reviewDue'>('normal');
  const [promptMode, setPromptMode] = useState<'english' | 'meaning'>('english');
  const [showFilters, setShowFilters] = useState(false);
  const [studySummary, setStudySummary] = useState<WordStudySummary | null>(null);
  const [summaryAvailable, setSummaryAvailable] = useState(true);

  const activePartOfSpeechLabel = useMemo(() => {
    return PART_OF_SPEECH_OPTIONS.find((option) => option.value === partOfSpeech)?.label ?? '모든 품사';
  }, [partOfSpeech]);

  const pickRandomProgressWord = async () => {
    const endpoint = studyMode === 'bookmark' ? '/api/words/bookmarks' : '/api/words/wrongs';
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(studyMode === 'bookmark' ? '즐겨찾기 단어를 가져오지 못했습니다.' : '오답 단어를 가져오지 못했습니다.');
    }

    const rows = await response.json();
    const filtered = (Array.isArray(rows) ? rows : []).filter((row) => {
      const candidate = row as Partial<Word> & { wordType?: string; wrongCount?: number };
      const typeOk = !candidate.wordType || candidate.wordType === wordType;
      const posOk = partOfSpeech === 'all' || candidate.partOfSpeech === partOfSpeech;
      return typeOk && posOk;
    });

    if (filtered.length === 0) {
      throw new Error(studyMode === 'bookmark' ? '조건에 맞는 즐겨찾기 단어가 없습니다.' : '조건에 맞는 오답 단어가 없습니다.');
    }

    const pool = studyMode === 'wrong'
      ? [...filtered]
        .sort((a, b) => ((b as { wrongCount?: number }).wrongCount ?? 0) - ((a as { wrongCount?: number }).wrongCount ?? 0))
        .slice(0, 30)
      : filtered;

    const pick = pool[Math.floor(Math.random() * pool.length)] as Partial<Word>;

    return {
      seq: Number(pick.seq ?? 0),
      word: String(pick.word ?? ''),
      partOfSpeech: String(pick.partOfSpeech ?? ''),
      meaning: String(pick.meaning ?? ''),
    } satisfies Word;
  };

  const pickReviewDueWord = async () => {
    const rows = await fetchReviewDueWords(wordType, 30);
    const filtered = rows.filter((row) => {
      const posOk = partOfSpeech === 'all' || row.partOfSpeech === partOfSpeech;
      return posOk;
    });

    if (filtered.length === 0) {
      throw new Error('오늘 다시 볼 추천 단어가 없습니다.');
    }

    return filtered[Math.floor(Math.random() * filtered.length)];
  };

  const refreshStudySummary = async () => {
    try {
      const summary = await fetchStudySummary();
      setStudySummary(summary);
      setSummaryAvailable(true);
    } catch {
      setSummaryAvailable(false);
    }
  };

  const fetchRandomWord = async () => {
    setLoading(true);
    setError(null);

    try {
      if (studyMode === 'reviewDue') {
        setCurrentWord(await pickReviewDueWord());
        return;
      }

      if (studyMode === 'bookmark' || studyMode === 'wrong') {
        setCurrentWord(await pickRandomProgressWord());
        return;
      }

      const params = new URLSearchParams();
      params.set('type', wordType);
      if (wordType === 'concepts' && partOfSpeech !== 'all') {
        params.set('partOfSpeech', partOfSpeech);
      }

      const response = await fetch(`/api/words/random?${params.toString()}`);

      if (!response.ok) {
        throw new Error('서버에서 단어를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setCurrentWord(data);
    } catch (err) {
      setCurrentWord(null);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomWord();
    // 첫 진입 및 학습 조건 변경 시 새 카드로 전환한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordType, partOfSpeech, studyMode]);

  useEffect(() => {
    refreshStudySummary();
  }, []);

  const handleStartReviewDue = () => {
    setStudyMode('reviewDue');
  };

  return (
    <div className="word-study-container">
      <section className="study-hero" aria-label="현재 학습 설정">
        <div>
          <p className="study-kicker">Today&apos;s session</p>
          <h1>단어를 넘기듯 빠르게 복습해요</h1>
          <p className="study-helper">모바일에서는 오른쪽으로 밀면 정답, 왼쪽으로 밀면 다음 단어로 이동합니다.</p>
        </div>
        <button className="filters-toggle-btn" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? '옵션 숨기기' : '옵션 보기'}
        </button>
      </section>

      <div className="study-status-row" aria-label="활성 학습 조건">
        <span>{WORD_TYPE_LABELS[wordType]}</span>
        <span>{activePartOfSpeechLabel}</span>
        <span>{STUDY_MODE_LABELS[studyMode]}</span>
      </div>

      {summaryAvailable && studySummary && (
        <div className="study-summary-strip" aria-label="오늘 학습 요약">
          <span>오늘 {studySummary.seenCount}</span>
          <span>정답률 {studySummary.accuracyRate}%</span>
          <span>오답 {studySummary.wrongCount}</span>
          {studySummary.reviewDueCount > 0 ? (
            <button type="button" onClick={handleStartReviewDue}>
              복습 {studySummary.reviewDueCount}
            </button>
          ) : (
            <span>복습 0</span>
          )}
        </div>
      )}

      {showFilters && (
        <div className="filter-controls">
          <div className="filter-section">
            <div className="inline-selector-row">
              <label className="filter-label" htmlFor="word-type-select">단어 유형</label>
              <select id="word-type-select" value={wordType} onChange={(e) => setWordType(e.target.value as 'concepts' | 'regular')}>
                <option value="concepts">컨설텝스 단어</option>
                <option value="regular">일반 TEPS 단어</option>
              </select>
            </div>

            <div className="inline-selector-row">
              <label className="filter-label" htmlFor="part-of-speech-select">품사</label>
              <select id="part-of-speech-select" value={partOfSpeech} onChange={(e) => setPartOfSpeech(e.target.value)}>
                {PART_OF_SPEECH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-selector-row">
              <label className="filter-label" htmlFor="study-mode-select">복습 모드</label>
              <select id="study-mode-select" value={studyMode} onChange={(e) => setStudyMode(e.target.value as 'normal' | 'bookmark' | 'wrong' | 'reviewDue')}>
                <option value="normal">일반 랜덤</option>
                <option value="bookmark">즐겨찾기 복습</option>
                <option value="wrong">오답 우선 복습</option>
                <option value="reviewDue">오늘 복습 추천</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading study-loading">단어를 불러오는 중...</div>
      ) : (
        <>
          <div className="fetch-row bottom-fetch-row">
            <button className="apply-filter-button" onClick={fetchRandomWord}>
              새 단어 가져오기
            </button>
            <div className="prompt-mode-toggle" role="group" aria-label="문제 표시 방식">
              <button
                type="button"
                className={`prompt-toggle-btn ${promptMode === 'english' ? 'active' : ''}`}
                onClick={() => setPromptMode('english')}
              >
                영단어 먼저
              </button>
              <button
                type="button"
                className={`prompt-toggle-btn ${promptMode === 'meaning' ? 'active' : ''}`}
                onClick={() => setPromptMode('meaning')}
              >
                뜻 먼저
              </button>
            </div>
          </div>

          {currentWord ? (
            <WordCard
              word={currentWord}
              wordType={wordType}
              promptMode={promptMode}
              onNextWord={fetchRandomWord}
              onStudyResultRecorded={refreshStudySummary}
            />
          ) : (
            <div className="study-empty-state">
              <strong>단어를 표시할 수 없어요.</strong>
              <p>{error ?? '현재 조건에 맞는 단어가 없습니다.'}</p>
              <button className="apply-filter-button" onClick={fetchRandomWord}>다시 시도</button>
            </div>
          )}

          {error && currentWord && <div className="error-message">{error}</div>}
        </>
      )}
    </div>
  );
};
