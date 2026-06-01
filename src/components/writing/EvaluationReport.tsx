import { useState } from 'react';
import type { WritingEvaluationResult } from '../../types';

interface Props {
  result: WritingEvaluationResult;
}

function ScoreCard({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="bg-white border rounded-lg p-3 text-center min-w-24">
      <div className="text-2xl font-bold">{score.toFixed(1)}</div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function EvaluationReport({ result }: Props) {
  const [openSection, setOpenSection] = useState<string | null>('suggestions');

  const toggle = (section: string) =>
    setOpenSection((prev) => (prev === section ? null : section));

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <ScoreCard label="Overall" score={result.overall_score} />
        <ScoreCard label="Grammar" score={result.grammar_score} />
        <ScoreCard label="Vocabulary" score={result.vocabulary_score} />
        <ScoreCard label="Coherence" score={result.coherence_score} />
      </div>

      {result.suggestions.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <button
            onClick={() => toggle('suggestions')}
            className="w-full text-left px-4 py-3 font-medium text-sm flex justify-between"
          >
            Suggestions ({result.suggestions.length})
            <span>{openSection === 'suggestions' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'suggestions' && (
            <ul className="px-4 pb-3 space-y-2">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-blue-500">•</span> {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result.grammar_corrections.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <button
            onClick={() => toggle('corrections')}
            className="w-full text-left px-4 py-3 font-medium text-sm flex justify-between"
          >
            Grammar Corrections ({result.grammar_corrections.length})
            <span>{openSection === 'corrections' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'corrections' && (
            <div className="px-4 pb-3 space-y-2">
              {result.grammar_corrections.map((c, i) => (
                <div key={i} className="text-sm">
                  <div className="text-red-600 line-through">{c.original}</div>
                  <div className="text-green-600">→ {c.corrected}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result.better_sentences.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <button
            onClick={() => toggle('better')}
            className="w-full text-left px-4 py-3 font-medium text-sm flex justify-between"
          >
            Better Sentences ({result.better_sentences.length})
            <span>{openSection === 'better' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'better' && (
            <div className="px-4 pb-3 space-y-3">
              {result.better_sentences.map((b, i) => (
                <div key={i} className="text-sm border-l-4 border-blue-300 pl-3">
                  <div className="text-gray-500">{b.original}</div>
                  <div className="text-blue-700 font-medium mt-1">{b.improved}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
