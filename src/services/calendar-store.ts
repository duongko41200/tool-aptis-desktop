export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  enableReminder?: boolean;
  notified15m?: boolean;
  notifiedStart?: boolean;
}

const STORAGE_KEY = 'aptis_calendar_events';

export const CalendarStore = {
  getEvents: (): CalendarEvent[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveEvents: (events: CalendarEvent[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },
  
  addEvent: (event: CalendarEvent) => {
    const events = CalendarStore.getEvents();
    events.push(event);
    CalendarStore.saveEvents(events);
  },
  
  updateEvent: (updatedEvent: CalendarEvent) => {
    const events = CalendarStore.getEvents();
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index > -1) {
      events[index] = updatedEvent;
      CalendarStore.saveEvents(events);
    }
  },
  
  deleteEvent: (eventId: string) => {
    const events = CalendarStore.getEvents();
    const newEvents = events.filter(e => e.id !== eventId);
    CalendarStore.saveEvents(newEvents);
  }
};
