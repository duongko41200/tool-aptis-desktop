import part1Data from '../public/data/exams/listening-part1.json';
import part2Data from '../public/data/exams/listening-part2.json';
import part3Data from '../public/data/exams/listening-part3.json';
import part4Data from '../public/data/exams/listening-part4.json';

// We define a flexible Exam type to accommodate the different parts
export interface ListeningSubQuestion {
  _id: string;
  content: string;
  correctAnswer: string;
  file?: string | null;
  answerList?: { content: string; id?: number }[] | null;
  suggestion?: string | null;
}

export interface ListeningQuestion {
  _id: string;
  content: string;
  file: string;
  suggestion: string;
  answerList?: { id?: number; content: string }[] | null;
  subQuestion: ListeningSubQuestion[];
}

export interface ListeningExam {
  id: string;
  _id: string;
  title: string;
  questionPart: 'ONE' | 'TWO' | 'THREE' | 'FOUR';
  questions: ListeningQuestion[];
}

const allData = {
  1: part1Data as unknown as ListeningExam[],
  2: part2Data as unknown as ListeningExam[],
  3: part3Data as unknown as ListeningExam[],
  4: part4Data as unknown as ListeningExam[],
};

export function useListeningExams() {
  const getExamsByPart = (part: 1 | 2 | 3 | 4): ListeningExam[] => {
    return allData[part] || [];
  };

  const getExamById = (part: 1 | 2 | 3 | 4, id: string): ListeningExam | undefined => {
    return allData[part]?.find((exam) => exam._id === id || exam.id === id);
  };

  return { getExamsByPart, getExamById };
}
