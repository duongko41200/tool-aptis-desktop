import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CalendarEvent } from './calendar-store';

const MODEL = 'gemini-2.5-flash';

export const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
  Writing:        { bg: 'var(--accent)',  text: 'var(--accent-ink)' },
  Speaking:       { bg: '#FFB5A7',        text: '#5C1D11' },
  Listening:      { bg: '#FCD5CE',        text: '#5E3023' },
  Vocabulary:     { bg: '#D8E2DC',        text: '#1D3325' },
  'Ôn tổng hợp': { bg: '#E8E8E4',        text: '#212529' },
};

const DAY_NAMES: Record<number, string> = {
  0: 'Chủ nhật', 1: 'Thứ 2', 2: 'Thứ 3',
  3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7',
};

export interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface DayNote {
  dow: number;
  label: string;
  startTime?: string; // optional time range for this note
  endTime?: string;
  note: string;
}

export interface ScheduleRequest {
  examDate: string;
  skills: string[];
  timeSlots: TimeSlot[];
  sessionsPerWeek: number;
  notes?: string;
  todayDate: string;
  inactiveDays: number[];
  dayNotes: DayNote[];
  allowMultiSkill: boolean;
}

export function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

function fmt(h: number) {
  return h % 1 === 0 ? `${h}` : h.toFixed(1);
}

function buildPrompt(req: ScheduleRequest): string {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil(
    (new Date(req.examDate).getTime() - new Date(req.todayDate).getTime()) / msPerDay,
  );
  const weeks = Math.min(Math.ceil(daysLeft / 7), 8);
  const totalSessions = weeks * req.sessionsPerWeek;
  const maxSlotHours = Math.max(...req.timeSlots.map(s => calcHours(s.start, s.end)));

  // Format time slots
  const slotsText = req.timeSlots
    .map((s, i) => `  - Slot ${i + 1}: ${s.start}–${s.end} (${fmt(calcHours(s.start, s.end))} tiếng)`)
    .join('\n');

  const inactiveDayNames = req.inactiveDays.map(d => DAY_NAMES[d]).join(', ') || 'không có';

  // Group day notes by day
  const notesByDay: Record<number, DayNote[]> = {};
  for (const n of req.dayNotes) {
    if (!notesByDay[n.dow]) notesByDay[n.dow] = [];
    notesByDay[n.dow].push(n);
  }
  const dayNotesText = Object.entries(notesByDay).length > 0
    ? Object.entries(notesByDay)
        .map(([dow, notes]) => {
          const dayName = DAY_NAMES[Number(dow)];
          const lines = notes.map(n => {
            const timeStr = n.startTime && n.endTime ? ` [${n.startTime}–${n.endTime}]` : '';
            return `    •${timeStr} ${n.note}`;
          }).join('\n');
          return `  - ${dayName}:\n${lines}`;
        })
        .join('\n')
    : '  (không có)';

  const multiSkillRule = req.allowMultiSkill && maxSlotHours >= 2
    ? `- Khi slot học ≥ 2 tiếng, có thể ghép TỐI ĐA 2 kỹ năng vào 1 sự kiện (tổng không quá thời lượng slot)
- Khi ghép 2 kỹ năng: đặt skill = "ghép", title rõ ràng (VD: "Writing + Vocabulary – Email & từ vựng")`
    : `- Mỗi sự kiện chỉ tập trung 1 kỹ năng duy nhất`;

  return `Bạn là AI coach luyện thi APTIS tiếng Anh. Tạo lịch học chi tiết cho học sinh.

THÔNG TIN:
- Hôm nay: ${req.todayDate}
- Ngày thi APTIS: ${req.examDate} (còn ${daysLeft} ngày)
- Kỹ năng cần luyện: ${req.skills.join(', ')}
- Số buổi học mỗi tuần: ${req.sessionsPerWeek} buổi

KHUNG GIỜ HỌC (có thể dùng bất kỳ slot nào dưới đây):
${slotsText}

RÀNG BUỘC NGÀY:
- Ngày KHÔNG xếp lịch: ${inactiveDayNames}
- Ghi chú đặc biệt theo ngày:
${dayNotesText}
${req.notes ? `- Ghi chú chung: ${req.notes}` : ''}

YÊU CẦU TẠO LỊCH:
- Tạo khoảng ${totalSessions} sự kiện, từ ngày ${req.todayDate} đến trước ${req.examDate} 1 ngày
- Sử dụng đúng khung giờ từ danh sách "KHUNG GIỜ HỌC" ở trên
- Tôn trọng ghi chú giờ đặc biệt theo từng ngày
- Phân bổ: Writing & Speaking cần nhiều nhất, 1–2 buổi "Ôn tổng hợp" tuần cuối
- KHÔNG xếp vào ngày: ${inactiveDayNames}
${multiSkillRule}
- Mỗi sự kiện có tên cụ thể (VD: "Speaking – Part 2: Mô tả ảnh", "Writing – Email xin học bổng")

Trả về JSON array THUẦN TÚY (không markdown, không code block):
[{"title":"...","start":"YYYY-MM-DDTHH:MM:00","end":"YYYY-MM-DDTHH:MM:00","skill":"Writing"}]

Giá trị hợp lệ cho skill: Writing, Speaking, Listening, Vocabulary, Ôn tổng hợp, ghép`;
}

function parseJsonArray(text: string): { title: string; start: string; end: string; skill: string }[] {
  const cleaned = text
    .replace(/```(json|javascript|typescript|js|text)?\s*\n?/gi, '')
    .replace(/```\s*$/g, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : (parsed as any).events ?? [];
}

function handleError(err: unknown): string {
  const msg = (err as any)?.message ?? String(err);
  if (msg.includes('429') || msg.toLowerCase().includes('quota'))
    return 'Gemini đang giới hạn request. Vui lòng thử lại sau 1 phút.';
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key'))
    return 'Gemini API key không hợp lệ. Vào Settings để kiểm tra lại.';
  if (msg.includes('503') || msg.toLowerCase().includes('high demand'))
    return 'Gemini đang quá tải. Thử lại sau ít phút.';
  return `Lỗi khi tạo lịch: ${msg}`;
}

export async function generateSchedule(
  req: ScheduleRequest,
  apiKey: string,
): Promise<CalendarEvent[]> {
  if (!apiKey.trim()) throw new Error('Chưa có Gemini API key. Vào Settings để thêm key.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: 'application/json' },
  });

  try {
    const result = await model.generateContent(buildPrompt(req));
    const raw = parseJsonArray(result.response.text());

    return raw.map((item, idx) => {
      const isMulti = item.skill === 'ghép';
      const colors = SKILL_COLORS[isMulti ? 'Ôn tổng hợp' : item.skill] ?? SKILL_COLORS['Ôn tổng hợp'];
      return {
        id: `ai-${Date.now()}-${idx}`,
        title: item.title,
        start: item.start,
        end: item.end,
        allDay: false,
        backgroundColor: colors.bg,
        textColor: colors.text,
        enableReminder: true,
        isCompleted: false,
      } as CalendarEvent;
    });
  } catch (err) {
    throw new Error(handleError(err));
  }
}
