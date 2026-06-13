import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { CalendarStore, CalendarEvent } from '../services/calendar-store';
import Icon from '../components/common/Icon';
import TopBar from '../components/layout/TopBar';
import FloatingNav from '../components/layout/FloatingNav';
import { useNavigate } from 'react-router-dom';
import { isPermissionGranted, sendNotification, requestPermission } from '@tauri-apps/plugin-notification';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    setEvents(CalendarStore.getEvents());
  }, []);

  const handleDateClick = (arg: DateClickArg) => {
    setEditingEvent({
      title: '',
      start: arg.dateStr,
      end: arg.dateStr,
      allDay: arg.allDay,
      backgroundColor: 'var(--accent)',
      textColor: 'var(--accent-ink)',
      enableReminder: true,
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const e = arg.event;
    setEditingEvent({
      id: e.id,
      title: e.title,
      start: e.startStr,
      end: e.endStr || e.startStr,
      allDay: e.allDay,
      backgroundColor: e.backgroundColor,
      textColor: e.textColor,
      enableReminder: e.extendedProps?.enableReminder ?? true,
    });
    setIsModalOpen(true);
  };

  const handleEventDrop = (arg: EventDropArg) => {
    const e = arg.event;
    const updatedEvent: CalendarEvent = {
      id: e.id,
      title: e.title,
      start: e.startStr,
      end: e.endStr || e.startStr,
      allDay: e.allDay,
      backgroundColor: e.backgroundColor,
      textColor: e.textColor,
      enableReminder: e.extendedProps?.enableReminder ?? true,
    };
    CalendarStore.updateEvent(updatedEvent);
    setEvents(CalendarStore.getEvents());
  };

  const handleSaveEvent = () => {
    if (!editingEvent || !editingEvent.title?.trim()) return;
    
    if (editingEvent.id) {
      CalendarStore.updateEvent(editingEvent as CalendarEvent);
    } else {
      const newEvent: CalendarEvent = {
        ...editingEvent,
        id: Date.now().toString(),
      } as CalendarEvent;
      CalendarStore.addEvent(newEvent);
    }
    
    setEvents(CalendarStore.getEvents());
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = () => {
    if (editingEvent?.id) {
      if (confirm('Bạn có chắc muốn xóa lịch học này?')) {
        CalendarStore.deleteEvent(editingEvent.id);
        setEvents(CalendarStore.getEvents());
        setIsModalOpen(false);
        setEditingEvent(null);
      }
    }
  };

  const colors = [
    { bg: 'var(--accent)', text: 'var(--accent-ink)', label: 'Xanh lơ' },
    { bg: '#FFB5A7', text: '#5C1D11', label: 'Hồng cam' },
    { bg: '#FCD5CE', text: '#5E3023', label: 'Đào' },
    { bg: '#E8E8E4', text: '#212529', label: 'Xám nhạt' },
    { bg: '#D8E2DC', text: '#1D3325', label: 'Xanh rêu' },
  ];

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', paddingTop: 80 }}>
      <TopBar />
      <FloatingNav />
      
      {/* Custom FullCalendar CSS overrides */}
      <style>{`
        .fc {
          --fc-border-color: rgba(40,55,30,0.1);
          --fc-button-bg-color: var(--glass-bg);
          --fc-button-border-color: var(--glass-edge);
          --fc-button-text-color: var(--ink);
          --fc-button-hover-bg-color: rgba(255,255,255,0.8);
          --fc-button-hover-border-color: var(--glass-edge);
          --fc-button-active-bg-color: var(--accent);
          --fc-button-active-border-color: var(--accent);
          --fc-button-active-text-color: var(--accent-ink);
          --fc-event-bg-color: var(--accent);
          --fc-event-border-color: transparent;
          --fc-event-text-color: var(--accent-ink);
          --fc-today-bg-color: rgba(217, 232, 157, 0.15);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: transparent;
          font-family: inherit;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: var(--fc-border-color);
        }
        .fc-header-toolbar {
          padding: 24px 32px 0;
          margin-bottom: 24px !important;
        }
        .fc-toolbar-title {
          font-size: 22px !important;
          font-weight: 800 !important;
          color: var(--ink);
        }
        .fc-button {
          text-transform: capitalize;
          border-radius: var(--r-sm) !important;
          font-weight: 600 !important;
          box-shadow: var(--sh-sm);
        }
        .fc-closeBtn-button {
          margin-left: 16px !important;
          background-color: rgba(255, 100, 100, 0.1) !important;
          color: #d32f2f !important;
          border-color: rgba(255, 100, 100, 0.2) !important;
        }
        .fc-closeBtn-button:hover {
          background-color: rgba(255, 100, 100, 0.2) !important;
        }
        .fc-event {
          border-radius: 6px;
          padding: 2px 4px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s;
          cursor: pointer;
          border: none;
        }
        .fc-event:hover {
          transform: translateY(-1px);
          filter: brightness(0.95);
        }
        .fc-col-header-cell-cushion {
          color: var(--ink-2);
          font-weight: 700;
          padding: 12px 0 !important;
        }
        .fc-daygrid-day-number {
          color: var(--ink);
          font-weight: 600;
          padding: 8px !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          background: var(--accent);
          color: var(--accent-ink);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px;
        }
      `}</style>

      {/* Main Calendar View */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="glass" style={{ flex: 1, margin: 24, borderRadius: 'var(--r-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          <div style={{ flex: 1, padding: '0 0 24px 0' }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'testBtn dayGridMonth,timeGridWeek,timeGridDay closeBtn'
              }}
              customButtons={{
                closeBtn: {
                  text: '✕ Đóng',
                  click: () => navigate(-1)
                },
                testBtn: {
                  text: '🔔 Thử thông báo',
                  click: async () => {
                    // Test In-app
                    window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Test', body: 'Đây là thông báo test!' } }));
                    // Test OS
                    try {
                      let granted = await isPermissionGranted();
                      if (!granted) {
                        const perm = await requestPermission();
                        granted = perm === 'granted';
                      }
                      if (granted) {
                        sendNotification({ title: 'Test Windows Notification', body: 'Nếu bạn thấy dòng này, OS Notification đã hoạt động!' });
                      } else {
                        alert("Không được cấp quyền thông báo OS!");
                      }
                    } catch (e) {
                      console.error(e);
                      alert("Lỗi khi gọi thông báo OS: " + e);
                    }
                  }
                }
              }}
              buttonText={{
                today: 'Hôm nay',
                month: 'Tháng',
                week: 'Tuần',
                day: 'Ngày'
              }}
              locale="vi"
              events={events}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="100%"
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && editingEvent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="glass" style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }} onClick={() => setIsModalOpen(false)} />
          
          <div className="glass rise" style={{ position: 'relative', width: '100%', maxWidth: 500, padding: 32, borderRadius: 'var(--r-xl)', background: 'var(--glass-bg)', boxShadow: 'var(--sh-lg)', border: '1px solid var(--glass-edge)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                {editingEvent.id ? 'Sửa lịch học' : 'Thêm lịch học'}
              </div>
              <button className="iconbtn" onClick={() => setIsModalOpen(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Nội dung học tập</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Ví dụ: Luyện Speaking Part 2"
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--glass-edge)', background: '#fff', fontSize: 15, outline: 'none', color: 'var(--ink)', fontWeight: 500 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Từ ngày</label>
                  <input 
                    type={editingEvent.allDay ? 'date' : 'datetime-local'}
                    value={
                      editingEvent.allDay
                        ? editingEvent.start?.substring(0, 10)
                        : (editingEvent.start?.length === 10 ? `${editingEvent.start}T08:00` : editingEvent.start?.substring(0, 16))
                    }
                    onChange={e => setEditingEvent({ ...editingEvent, start: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--glass-edge)', background: '#fff', fontSize: 14, boxSizing: 'border-box', color: 'var(--ink)', fontWeight: 500, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Đến ngày</label>
                  <input 
                    type={editingEvent.allDay ? 'date' : 'datetime-local'}
                    value={
                      editingEvent.allDay
                        ? (editingEvent.end?.substring(0, 10) || editingEvent.start?.substring(0, 10))
                        : (editingEvent.end?.length === 10 ? `${editingEvent.end}T09:00` : (editingEvent.end?.substring(0, 16) || (editingEvent.start?.length === 10 ? `${editingEvent.start}T09:00` : editingEvent.start?.substring(0, 16))))
                    }
                    onChange={e => setEditingEvent({ ...editingEvent, end: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--glass-edge)', background: '#fff', fontSize: 14, boxSizing: 'border-box', color: 'var(--ink)', fontWeight: 500, outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Màu sắc</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {colors.map(c => (
                    <button
                      key={c.bg}
                      title={c.label}
                      onClick={() => setEditingEvent({ ...editingEvent, backgroundColor: c.bg, textColor: c.text })}
                      style={{ 
                        width: 32, height: 32, borderRadius: '50%', background: c.bg, border: 'none', cursor: 'pointer',
                        boxShadow: editingEvent.backgroundColor === c.bg ? '0 0 0 2px #fff, 0 0 0 4px var(--ink)' : 'var(--sh-sm)',
                        transition: 'transform 0.2s',
                        transform: editingEvent.backgroundColor === c.bg ? 'scale(1.1)' : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {/* Sự kiện cả ngày checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input 
                    type="checkbox" 
                    id="allDay"
                    checked={editingEvent.allDay}
                    onChange={e => {
                      const isAllDay = e.target.checked;
                      setEditingEvent({ 
                        ...editingEvent, 
                        allDay: isAllDay,
                        start: isAllDay ? editingEvent.start?.substring(0, 10) : (editingEvent.start?.length === 10 ? `${editingEvent.start}T08:00` : editingEvent.start),
                        end: isAllDay ? editingEvent.end?.substring(0, 10) : (editingEvent.end?.length === 10 ? `${editingEvent.end}T09:00` : editingEvent.end)
                      });
                    }}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="allDay" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
                    Sự kiện cả ngày (Không cần giờ)
                  </label>
                </div>

                {/* Nhắc nhở checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input 
                    type="checkbox" 
                    id="enableReminder"
                    checked={editingEvent.enableReminder}
                    onChange={e => setEditingEvent({ ...editingEvent, enableReminder: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="enableReminder" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
                    Bật nhắc nhở trước 15 phút
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {editingEvent.id && (
                <button 
                  onClick={handleDeleteEvent}
                  style={{ padding: '12px 16px', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--r-md)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15 }}
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--ink-2)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-md)', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveEvent}
                style={{ flex: 2, padding: '12px', background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 'var(--r-md)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15, boxShadow: 'var(--sh-sm)' }}
              >
                {editingEvent.id ? 'Cập nhật' : 'Tạo lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
