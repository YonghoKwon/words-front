import { useEffect, useRef, useState } from 'react';
import { Word } from '../types/Word.ts';
import { addBookmark, addWrongAnswer, fetchWordProgress, removeBookmark } from '../services/WordProgressService';
import '../styles/WordCard.css';

interface WordCardProps {
  word: Word | null;
  wordType: 'concepts' | 'regular';
  promptMode: 'english' | 'meaning';
  onNextWord: () => void;
}

const defaultWord: Word = {
  seq: 0,
  word: 'example',
  meaning: '예시, 보기',
  partOfSpeech: 'n.',
};

let sessionQuizTotalCache = 0;
let sessionQuizCorrectCache = 0;
let quizModeEnabledCache = false;

try {
  const t = Number(sessionStorage.getItem('quiz_total') || '0');
  const c = Number(sessionStorage.getItem('quiz_correct') || '0');
  const m = sessionStorage.getItem('quiz_mode_enabled');
  if (Number.isFinite(t)) sessionQuizTotalCache = t;
  if (Number.isFinite(c)) sessionQuizCorrectCache = c;
  quizModeEnabledCache = m === '1';
} catch {
  // 세션 스토리지를 사용할 수 없는 환경에서는 메모리 상태만 사용한다.
}

const uniqueValues = (values: string[]) => values.filter((value, index, self) => value.trim() && self.indexOf(value) === index);

export const WordCard = ({ word, wordType, promptMode, onNextWord }: WordCardProps) => {
  const currentWord = word || defaultWord;

  const [showAnswer, setShowAnswer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [showChoiceQuiz, setShowChoiceQuiz] = useState(false);
  const [quizChoices, setQuizChoices] = useState<string[]>([]);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizTarget, setQuizTarget] = useState<'meaning' | 'word'>('meaning');
  const [quizModeEnabled, setQuizModeEnabled] = useState(quizModeEnabledCache);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  const [sessionQuizTotal, setSessionQuizTotal] = useState(sessionQuizTotalCache);
  const [sessionQuizCorrect, setSessionQuizCorrect] = useState(sessionQuizCorrectCache);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastWrongKeyRef = useRef<string>('');
  const lastWrongTimeRef = useRef<number>(0);
  const quizAutoNextTimerRef = useRef<number | null>(null);
  const quizCountdownIntervalRef = useRef<number | null>(null);
  const [gestureHint, setGestureHint] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearQuizTimers();
    };
  }, []);

  useEffect(() => {
    loadProgress();
    setShowAnswer(false);
    clearQuizState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord.word, currentWord.meaning, currentWord.partOfSpeech, currentWord.seq, wordType]);

  useEffect(() => {
    if (showChoiceQuiz) {
      buildChoiceQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptMode]);

  useEffect(() => {
    quizModeEnabledCache = quizModeEnabled;
    try {
      sessionStorage.setItem('quiz_mode_enabled', quizModeEnabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, [quizModeEnabled]);

  useEffect(() => {
    if (quizModeEnabled) {
      buildChoiceQuiz();
    } else {
      clearQuizState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord.word, currentWord.meaning, currentWord.partOfSpeech, currentWord.seq, quizModeEnabled, wordType]);

  const clearQuizTimers = () => {
    if (quizAutoNextTimerRef.current !== null) {
      window.clearTimeout(quizAutoNextTimerRef.current);
      quizAutoNextTimerRef.current = null;
    }
    if (quizCountdownIntervalRef.current !== null) {
      window.clearInterval(quizCountdownIntervalRef.current);
      quizCountdownIntervalRef.current = null;
    }
  };

  const clearQuizState = () => {
    clearQuizTimers();
    setShowChoiceQuiz(false);
    setQuizChoices([]);
    setQuizSelected(null);
    setQuizResult(null);
    setAutoNextCountdown(null);
  };

  const loadProgress = async () => {
    if (!currentWord || currentWord.seq === 0) return;

    setProgressLoading(true);
    setProgressError(null);
    try {
      const progress = await fetchWordProgress(currentWord, wordType);
      setBookmarked(progress.bookmarked);
      setWrongCount(progress.wrongCount);
    } catch (error) {
      setBookmarked(false);
      setWrongCount(0);
      setProgressError(error instanceof Error ? error.message : '진행 상태를 불러오지 못했습니다.');
    } finally {
      setProgressLoading(false);
    }
  };

  const handleNextWord = () => {
    clearQuizState();
    setShowAnswer(false);
    onNextWord();
  };

  const showGestureHint = (message: string) => {
    setGestureHint(message);
    window.setTimeout(() => setGestureHint(null), 1200);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchStartYRef.current = e.changedTouches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (Math.abs(diffX) < 50) return;

    if (diffX > 0) {
      if (!showAnswer) {
        setShowAnswer(true);
        showGestureHint('정답 표시');
      }
    } else {
      handleNextWord();
      showGestureHint('다음 단어');
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentWord || currentWord.seq === 0) return;
    try {
      if (bookmarked) {
        await removeBookmark(currentWord, wordType);
        setBookmarked(false);
        showGestureHint('즐겨찾기 해제');
      } else {
        await addBookmark(currentWord, wordType);
        setBookmarked(true);
        showGestureHint('즐겨찾기 저장');
      }
      setProgressError(null);
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '즐겨찾기 처리 중 오류가 발생했습니다.');
    }
  };

  const handleMarkWrong = async (silent = false) => {
    if (!currentWord || currentWord.seq === 0) return;

    const key = `${wordType}:${currentWord.seq}:${currentWord.word}:${currentWord.partOfSpeech}:${currentWord.meaning}`;
    const now = Date.now();
    if (lastWrongKeyRef.current === key && now - lastWrongTimeRef.current < 1500) {
      if (!silent) showGestureHint('잠시 후 다시 시도');
      return;
    }

    try {
      const wrong = await addWrongAnswer(currentWord, wordType);
      const nextWrongCount = wrong.wrongCount ?? wrongCount + 1;
      setWrongCount(nextWrongCount);
      lastWrongKeyRef.current = key;
      lastWrongTimeRef.current = now;
      setProgressError(null);
      if (!silent) showGestureHint('오답 저장');
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '오답 저장 중 오류가 발생했습니다.');
    }
  };

  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  const loadQuizCandidates = async (): Promise<Word[]> => {
    const params = new URLSearchParams({
      type: wordType,
      seq: String(currentWord.seq),
      limit: '8',
    });
    if (currentWord.partOfSpeech) {
      params.set('partOfSpeech', currentWord.partOfSpeech);
    }

    const response = await fetch(`/api/words/quiz-choices?${params.toString()}`);
    if (response.ok) {
      return response.json();
    }

    const startSeq = Math.max(1, currentWord.seq - 250);
    const endSeq = currentWord.seq + 250;
    const fallback = await fetch(`/api/words/range?type=${wordType}&startSeq=${startSeq}&endSeq=${endSeq}`);
    if (!fallback.ok) throw new Error('퀴즈 선택지를 불러오지 못했습니다.');
    return fallback.json();
  };

  const buildChoiceQuiz = async () => {
    if (!currentWord || currentWord.seq === 0) return;

    clearQuizTimers();
    setShowChoiceQuiz(true);
    setQuizLoading(true);
    setQuizResult(null);
    setQuizSelected(null);
    setAutoNextCountdown(null);

    try {
      const words = await loadQuizCandidates();
      const target: 'meaning' | 'word' = promptMode === 'english' ? 'meaning' : 'word';
      const correctAnswer = target === 'meaning' ? currentWord.meaning : currentWord.word;
      const distractors = uniqueValues(
        words
          .filter((candidate) => candidate.seq !== currentWord.seq || candidate.word !== currentWord.word)
          .map((candidate) => target === 'meaning' ? candidate.meaning : candidate.word)
          .filter((value) => value !== correctAnswer)
      );

      const picked = shuffle(distractors).slice(0, 2);
      if (picked.length < 2) throw new Error('유사 보기 생성에 실패했어요. 다시 눌러주세요.');

      setQuizTarget(target);
      setQuizChoices(shuffle([correctAnswer, ...picked]));
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '유사 보기 퀴즈 생성 중 오류가 발생했습니다.');
      setShowChoiceQuiz(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handlePickChoice = async (choice: string) => {
    if (quizSelected !== null) return;

    setQuizSelected(choice);
    const correctAnswer = quizTarget === 'meaning' ? currentWord.meaning : currentWord.word;
    const isCorrect = choice === correctAnswer;
    setQuizResult(isCorrect ? 'correct' : 'wrong');

    const nextTotal = sessionQuizTotal + 1;
    const nextCorrect = sessionQuizCorrect + (isCorrect ? 1 : 0);
    setSessionQuizTotal(nextTotal);
    setSessionQuizCorrect(nextCorrect);
    sessionQuizTotalCache = nextTotal;
    sessionQuizCorrectCache = nextCorrect;

    try {
      sessionStorage.setItem('quiz_total', String(nextTotal));
      sessionStorage.setItem('quiz_correct', String(nextCorrect));
    } catch {
      // ignore
    }

    if (!isCorrect) {
      await handleMarkWrong(true);
    }

    clearQuizTimers();
    setAutoNextCountdown(3);
    quizCountdownIntervalRef.current = window.setInterval(() => {
      setAutoNextCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (quizCountdownIntervalRef.current !== null) {
            window.clearInterval(quizCountdownIntervalRef.current);
            quizCountdownIntervalRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    quizAutoNextTimerRef.current = window.setTimeout(() => {
      handleNextWord();
    }, 3000);
  };

  const correctRate = sessionQuizTotal > 0 ? Math.round((sessionQuizCorrect / sessionQuizTotal) * 100) : null;
  const correctAnswer = quizTarget === 'meaning' ? currentWord.meaning : currentWord.word;
  const getChoiceClassName = (choice: string) => {
    const classes = ['meaning-choice'];
    const hasAnswered = quizSelected !== null;

    if (quizSelected === choice) {
      classes.push('selected');
    }
    if (hasAnswered && choice === correctAnswer) {
      classes.push('correct-choice');
    }
    if (hasAnswered && quizSelected === choice && choice !== correctAnswer) {
      classes.push('wrong-choice');
    }
    if (hasAnswered && quizSelected !== choice && choice !== correctAnswer) {
      classes.push('dimmed-choice');
    }

    return classes.join(' ');
  };

  return (
    <div
      className={`word-card ${showChoiceQuiz ? 'quiz-active' : ''} ${!showAnswer ? 'clickable' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="card-top-row">
        <button
          className={`bookmark-button ${bookmarked ? 'active' : ''}`}
          onClick={handleToggleBookmark}
          disabled={progressLoading}
        >
          {bookmarked ? '★ 저장됨' : '☆ 즐겨찾기'}
        </button>
        <button className="wrong-button" onClick={() => handleMarkWrong()} disabled={progressLoading}>
          오답 저장{wrongCount > 0 ? ` ${wrongCount}` : ''}
        </button>
      </div>

      <div className="quiz-accuracy-status">
        <span>세션 정답률</span>
        <strong>{correctRate === null ? '아직 없음' : `${correctRate}%`}</strong>
        {sessionQuizTotal > 0 && <em>{sessionQuizCorrect}/{sessionQuizTotal}</em>}
      </div>
      {progressLoading && <div className="progress-status">진행 상태 불러오는 중...</div>}
      {progressError && <div className="progress-error">{progressError}</div>}

      <div className="word-content">
        <div className="word-main-panel">
          {!showAnswer ? (
            <div className="word-question">
              {promptMode === 'english' ? currentWord.word : currentWord.meaning}
              {promptMode === 'english' && <span className="part-of-speech">{currentWord.partOfSpeech}</span>}
            </div>
          ) : (
            <div className="word-answer">
              <div className="english-word">{currentWord.word} <span className="part-of-speech">{currentWord.partOfSpeech}</span></div>
              {!showChoiceQuiz && <div className="korean-meaning">{currentWord.meaning}</div>}
            </div>
          )}
        </div>

        {showChoiceQuiz && (
          <div className="meaning-quiz-box">
            <div className="meaning-quiz-title">
              {quizTarget === 'meaning' ? '뜻 맞히기 퀴즈' : '영단어 맞히기 퀴즈'}
            </div>
            <div className="meaning-quiz-options">
              {quizLoading && <div className="meaning-quiz-loading">퀴즈 보기 생성 중...</div>}
              {!quizLoading && quizChoices.map((choice, idx) => (
                <button
                  key={`${choice}-${idx}`}
                  className={getChoiceClassName(choice)}
                  onClick={() => handlePickChoice(choice)}
                  disabled={quizSelected !== null}
                >
                  <span className="choice-index">{idx + 1}</span>
                  <span className="choice-text">{choice}</span>
                </button>
              ))}
            </div>
            <div className={`meaning-quiz-feedback ${quizResult ? 'visible' : ''}`}>
              <div className={`meaning-quiz-result ${quizResult ?? ''}`}>
                {quizResult === 'correct' && '정답입니다!'}
                {quizResult === 'wrong' && `오답입니다. 정답: ${quizTarget === 'meaning' ? currentWord.meaning : currentWord.word}`}
              </div>
              <button
                className="auto-next-countdown"
                onClick={handleNextWord}
                disabled={autoNextCountdown === null}
                aria-hidden={autoNextCountdown === null}
              >
                {autoNextCountdown ?? 3}초 후 다음 · 바로 넘기기
              </button>
            </div>
          </div>
        )}

        <div className="swipe-guide">
          ← 다음 단어 · 정답 보기 →
        </div>

        <div className="mobile-fixed-cta-wrap inline-cta-wrap">
          <button
            className="mobile-fixed-cta"
            onClick={(e) => {
              e.stopPropagation();
              if (!showAnswer) {
                setShowAnswer(true);
              } else {
                handleNextWord();
              }
            }}
          >
            {showAnswer ? '다음 단어' : '정답 보기'}
          </button>
          <button
            className={`mobile-fixed-quiz-btn ${quizModeEnabled ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setQuizModeEnabled((v) => !v);
            }}
            disabled={quizLoading}
          >
            {quizLoading ? '생성 중...' : `퀴즈 ${quizModeEnabled ? 'ON' : 'OFF'}`}
          </button>
        </div>
      </div>

      {gestureHint && <div className="gesture-toast">{gestureHint}</div>}
    </div>
  );
};
