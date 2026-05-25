import { Word } from '../types/Word';

export interface WordProgress {
  bookmarked: boolean;
  wrongCount: number;
}

export interface WordStudySummary {
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  reviewDueCount: number;
}

interface WordPayload {
  wordType: 'concepts' | 'regular';
  seq: number;
  word: string;
  partOfSpeech: string;
  meaning: string;
}

function toPayload(word: Word, wordType: 'concepts' | 'regular'): WordPayload {
  return {
    wordType,
    seq: word.seq,
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
  };
}

export async function fetchWordProgress(word: Word, wordType: 'concepts' | 'regular'): Promise<WordProgress> {
  const params = new URLSearchParams({
    wordType,
    seq: String(word.seq),
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
  });

  const response = await fetch(`/api/words/progress?${params.toString()}`);
  if (!response.ok) {
    throw new Error('단어 진행 상태를 불러오지 못했습니다.');
  }
  return response.json();
}

export async function addBookmark(word: Word, wordType: 'concepts' | 'regular') {
  const response = await fetch('/api/words/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(word, wordType)),
  });

  if (!response.ok) {
    throw new Error('즐겨찾기 저장에 실패했습니다.');
  }
}

export async function removeBookmark(word: Word, wordType: 'concepts' | 'regular') {
  const params = new URLSearchParams({
    wordType,
    seq: String(word.seq),
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
  });

  const response = await fetch(`/api/words/bookmarks?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 204) {
    throw new Error('즐겨찾기 해제에 실패했습니다.');
  }
}

export async function addWrongAnswer(word: Word, wordType: 'concepts' | 'regular') {
  const response = await fetch('/api/words/wrongs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(word, wordType)),
  });

  if (!response.ok) {
    throw new Error('오답 저장에 실패했습니다.');
  }

  return response.json();
}

export async function recordStudyResult(word: Word, wordType: 'concepts' | 'regular', result: 'correct' | 'wrong') {
  const response = await fetch('/api/words/study-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...toPayload(word, wordType), result }),
  });

  if (!response.ok) {
    throw new Error('학습 기록 저장에 실패했습니다.');
  }

  return response.json();
}

export async function fetchStudySummary(date?: string): Promise<WordStudySummary> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);

  const query = params.toString();
  const response = await fetch(`/api/words/study-summary${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw new Error('학습 요약을 불러오지 못했습니다.');
  }

  return response.json();
}

export async function fetchReviewDueWords(wordType: 'concepts' | 'regular', limit = 30): Promise<Word[]> {
  const params = new URLSearchParams({
    type: wordType,
    limit: String(limit),
  });

  const response = await fetch(`/api/words/review-due?${params.toString()}`);
  if (!response.ok) {
    throw new Error('복습 추천 단어를 불러오지 못했습니다.');
  }

  return response.json();
}
