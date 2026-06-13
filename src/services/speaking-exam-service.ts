export interface SubQuestion {
  _id: string;
  content: string;
  file?: string;
  image?: string | string[] | null;
  suggestion?: string | null;
  correctAnswer?: any;
  answerList?: any;
}

export interface Question {
  _id: string;
  questionTitle: string;
  content: string;
  subQuestion: SubQuestion[];
  isExample?: string;
  image?: string | string[] | null;
  file?: string;
}

export interface SpeakingExam {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  questionPart: 'ONE' | 'TWO' | 'THREE' | 'FOUR';
  questionType: 'SPEAKING';
}

export async function loadSpeakingExams(part: 1 | 2 | 3 | 4): Promise<SpeakingExam[]> {
  try {
    switch (part) {
      case 1:
        return (await import('../public/data/exams/speaking-part1.json')).default as SpeakingExam[];
      case 2:
        return (await import('../public/data/exams/speaking-part2.json')).default as SpeakingExam[];
      case 3:
        return (await import('../public/data/exams/speaking-part3.json')).default as SpeakingExam[];
      case 4:
        return (await import('../public/data/exams/speaking-part4.json')).default as SpeakingExam[];
      default:
        return [];
    }
  } catch (err) {
    console.error(`Failed to load speaking exam part ${part}:`, err);
    return [];
  }
}
