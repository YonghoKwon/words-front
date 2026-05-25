import { useCallback, useEffect, useRef, useState } from 'react';
import { Word } from '../types/Word.ts';
import '../styles/WordList.css';

type ListMode = 'all' | 'bookmark' | 'wrong';

type ProgressWordItem = {
  seq: number;
  word: string;
  partOfSpeech?: string;
  meaning: string;
  wrongCount?: number;
};

const RANGE_SIZE = 20;
const CLIENT_PAGE_SIZE = 20;

export const WordListPage = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listMode, setListMode] = useState<ListMode>('all');

  const [currentRange, setCurrentRange] = useState({
    startSeq: 1,
    endSeq: RANGE_SIZE
  });
  const [hasNext, setHasNext] = useState(true);
  const [customRangeMode, setCustomRangeMode] = useState(false);
  const [customStartSeq, setCustomStartSeq] = useState('');
  const [customEndSeq, setCustomEndSeq] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [compactView, setCompactView] = useState(true);
  const [clientPage, setClientPage] = useState(1);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const wordListRef = useRef<HTMLDivElement | null>(null);
  const prevCustomRangeModeRef = useRef(customRangeMode);

  const fetchWords = useCallback(async (start: number, end: number) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/words/range?startSeq=${start}&endSeq=${end}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('서버에서 단어 목록을 가져오는데 실패했습니다.');
      }

      const data = await response.json();

      if (data.length === 0) {
        setHasNext(false);
        setError('해당 범위에 단어가 없습니다.');
        return [];
      }

      if (data.length > 0 && data[data.length - 1].seq < end) {
        setHasNext(false);
      } else {
        setHasNext(true);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRangeWords = useCallback(async (start: number, end: number) => {
    const newWords = await fetchWords(start, end);
    if (newWords.length > 0) {
      setWords(newWords);
      setCurrentRange({ startSeq: start, endSeq: end });
    } else {
      setWords([]);
    }
  }, [fetchWords]);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/words/bookmarks');
      if (!response.ok) throw new Error('즐겨찾기 목록을 불러오지 못했습니다.');

      const data = await response.json() as ProgressWordItem[];
      const mapped: Word[] = data.map((item) => ({
        seq: item.seq,
        word: item.word,
        partOfSpeech: item.partOfSpeech ?? '',
        meaning: item.meaning,
      }));
      setWords(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWrongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/words/wrongs');
      if (!response.ok) throw new Error('오답 목록을 불러오지 못했습니다.');

      const data = await response.json() as ProgressWordItem[];
      const sorted = [...data].sort((a, b) => (b.wrongCount ?? 0) - (a.wrongCount ?? 0));
      const mapped: Word[] = sorted.map((item) => ({
        seq: item.seq,
        word: item.word,
        partOfSpeech: item.partOfSpeech ?? '',
        meaning: `${item.meaning} (오답 ${item.wrongCount ?? 0}회)`,
      }));
      setWords(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    if (listMode === 'bookmark') {
      await loadBookmarks();
      return;
    }

    if (listMode === 'wrong') {
      await loadWrongs();
      return;
    }

    await loadRangeWords(1, RANGE_SIZE);
  }, [listMode, loadBookmarks, loadRangeWords, loadWrongs]);

  const scrollListTop = () => {
    const run = () => {
      const el = wordListRef.current;
      if (!el) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 단어 목록 시작 지점 + 상단 여백 확보
      const y = el.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };

    // 렌더 반영 후 스크롤 보장
    requestAnimationFrame(() => setTimeout(run, 0));
  };

  const loadNextPage = async () => {
    if (loading || !hasNext || listMode !== 'all') return;
    const { endSeq } = currentRange;
    const nextStartSeq = endSeq + 1;
    const nextEndSeq = nextStartSeq + RANGE_SIZE - 1;
    await loadRangeWords(nextStartSeq, nextEndSeq);
    scrollListTop();
  };

  const loadPrevPage = async () => {
    if (loading || currentRange.startSeq <= 1 || listMode !== 'all') return;
    const prevStartSeq = Math.max(1, currentRange.startSeq - RANGE_SIZE);
    const prevEndSeq = prevStartSeq + RANGE_SIZE - 1;
    await loadRangeWords(prevStartSeq, prevEndSeq);
    scrollListTop();
  };

  const handleCustomRangeSearch = async () => {
    const start = parseInt(customStartSeq);
    const end = parseInt(customEndSeq);

    if (isNaN(start) || isNaN(end)) {
      setError('유효한 숫자를 입력해주세요.');
      return;
    }

    if (start > end) {
      setError('시작 번호는 종료 번호보다 작아야 합니다.');
      return;
    }

    if (end - start > 100) {
      setError('한 번에 최대 100개까지만 조회할 수 있습니다.');
      return;
    }

    await loadRangeWords(start, end);
  };

  useEffect(() => {
    setError(null);
    setClientPage(1);
    if (listMode !== 'all') {
      setCustomRangeMode(false);
    }
    loadInitialData();
  }, [listMode, loadInitialData]);

  useEffect(() => {
    const customRangeModeChanged = prevCustomRangeModeRef.current !== customRangeMode;
    prevCustomRangeModeRef.current = customRangeMode;

    if (customRangeModeChanged && !customRangeMode && listMode === 'all') {
      loadInitialData();
    }
  }, [customRangeMode, listMode, loadInitialData]);

  const filteredWords = words.filter((w) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q);
  });

  const totalClientPages = Math.max(1, Math.ceil(filteredWords.length / CLIENT_PAGE_SIZE));
  const displayWords = listMode === 'all'
    ? filteredWords
    : filteredWords.slice((clientPage - 1) * CLIENT_PAGE_SIZE, clientPage * CLIENT_PAGE_SIZE);

  const nextClientPage = () => {
    setClientPage((p) => Math.min(totalClientPages, p + 1));
    scrollListTop();
  };

  const prevClientPage = () => {
    setClientPage((p) => Math.max(1, p - 1));
    scrollListTop();
  };

  const handleListTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchStartYRef.current = e.changedTouches[0]?.clientY ?? null;
  };

  const handleListTouchEnd = async (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (Math.abs(diffX) < 50) return;

    // 왼쪽 스와이프: 다음 페이지, 오른쪽 스와이프: 이전 페이지
    if (diffX < 0) {
      if (listMode === 'all') {
        await loadNextPage();
      } else {
        nextClientPage();
      }
    } else {
      if (listMode === 'all') {
        await loadPrevPage();
      } else {
        prevClientPage();
      }
    }
  };

  return (
    <div className="word-list-container">
      <div className="range-controls">
        <div className="range-toggle mode-toggle">
          <button className={`range-button ${listMode === 'all' ? 'active' : ''}`} onClick={() => setListMode('all')}>전체</button>
          <button className={`range-button ${listMode === 'bookmark' ? 'active' : ''}`} onClick={() => setListMode('bookmark')}>즐겨찾기</button>
          <button className={`range-button ${listMode === 'wrong' ? 'active' : ''}`} onClick={() => setListMode('wrong')}>오답순</button>
        </div>

        {listMode === 'all' && (
          <>
            <div className="range-toggle">
              <button className={`range-button ${!customRangeMode ? 'active' : ''}`} onClick={() => setCustomRangeMode(false)}>기본 범위</button>
              <button className={`range-button ${customRangeMode ? 'active' : ''}`} onClick={() => setCustomRangeMode(true)}>직접 지정</button>
            </div>

            {customRangeMode ? (
              <div className="custom-range-form">
                <div className="input-group">
                  <label htmlFor="startSeq">시작 번호:</label>
                  <input type="number" id="startSeq" value={customStartSeq} onChange={(e) => setCustomStartSeq(e.target.value)} min="1" />
                </div>
                <div className="input-group">
                  <label htmlFor="endSeq">종료 번호:</label>
                  <input type="number" id="endSeq" value={customEndSeq} onChange={(e) => setCustomEndSeq(e.target.value)} min="1" />
                </div>
                <button className="search-button" onClick={handleCustomRangeSearch} disabled={loading}>검색</button>
              </div>
            ) : (
              <div className="pagination-controls">
                <div className="pagination-buttons-row">
                  <button className="page-button" onClick={loadPrevPage} disabled={loading || currentRange.startSeq <= 1}>이전</button>
                  <button className="page-button" onClick={loadNextPage} disabled={loading || !hasNext}>다음</button>
                </div>
                <span className="current-range">현재 범위: {currentRange.startSeq}~{currentRange.endSeq}</span>
              </div>
            )}
          </>
        )}

        {listMode !== 'all' && !loading && (
          <div className="pagination-controls">
            <div className="pagination-buttons-row">
              <button className="page-button" onClick={prevClientPage} disabled={clientPage <= 1}>이전</button>
              <button className="page-button" onClick={nextClientPage} disabled={clientPage >= totalClientPages}>다음</button>
            </div>
            <span className="current-range">현재 페이지: {clientPage}/{totalClientPages}</span>
          </div>
        )}
      </div>

      <div className="list-enhance-row">
        <input
          className="list-search-input"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setClientPage(1);
          }}
          placeholder="단어/뜻 검색"
        />
        <button className="range-button" onClick={() => setCompactView(v => !v)}>
          {compactView ? '기본 보기' : '컴팩트'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">단어를 불러오는 중...</div>
      ) : (
        <div className="word-stats">현재 표시 단어: {displayWords.length}개{searchTerm ? ` (검색결과 ${filteredWords.length}개)` : ''}</div>
      )}

      <div
        ref={wordListRef}
        className={`word-list ${compactView ? 'compact' : ''}`}
        onTouchStart={handleListTouchStart}
        onTouchEnd={handleListTouchEnd}
      >
        {displayWords.length > 0 ? (
          displayWords.map((word, index) => (
            <div key={`${word.seq}-${word.word}-${index}`} className="word-item">
              <div className="word-number">{word.seq}</div>
              <div className="word-list-content">
                <div className="word-english">{word.word} <span className="word-part">{word.partOfSpeech}</span></div>
                <div className="word-meaning">{word.meaning}</div>
              </div>
            </div>
          ))
        ) : (
          !loading && <div className="no-words">표시할 단어가 없습니다.</div>
        )}
      </div>

      {!loading && <div className="swipe-page-hint">← 오른쪽 스와이프: 이전 · 왼쪽 스와이프: 다음 →</div>}


    </div>
  );
};
