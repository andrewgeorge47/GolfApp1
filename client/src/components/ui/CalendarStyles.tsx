import React from 'react';

/**
 * CalendarStyles - Mobile-optimized styling for react-big-calendar
 *
 * This component provides consistent Google Calendar-inspired styling
 * for all calendar instances across the app. It includes:
 * - Compact time gutter for mobile
 * - Google Calendar-style date headers with circular today indicator
 * - Optimized touch scrolling
 * - Clickable time slots
 *
 * Usage:
 * ```tsx
 * import { Calendar } from 'react-big-calendar';
 * import { CalendarStyles } from '@/components/ui';
 *
 * function MyCalendarPage() {
 *   return (
 *     <div>
 *       <CalendarStyles />
 *       <Calendar ... />
 *     </div>
 *   );
 * }
 * ```
 */
export const CalendarStyles: React.FC = () => {
  return (
    <style>{`
      @media (max-width: 640px) {
        .rbc-time-header-gutter {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
        }
        .rbc-time-gutter {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
        }
        .rbc-label {
          font-size: 9px !important;
          padding: 0 !important;
          text-align: center !important;
        }
        .rbc-time-content {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        /* Keep left gutter visible, hide time labels inside day columns */
        .rbc-day-slot .rbc-timeslot-group {
          border: none !important;
        }
        .rbc-day-slot .rbc-time-slot {
          border-top: none !important;
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        /* Only show borders on full hour rows (first slot in each group) */
        .rbc-day-slot .rbc-timeslot-group .rbc-time-slot:first-child {
          border-top: 1px solid #e5e7eb !important;
        }
        .rbc-day-slot .rbc-label {
          display: none !important;
        }
        /* Keep left time gutter labels visible and styled */
        .rbc-time-gutter .rbc-label {
          display: block !important;
        }
        /* Ensure day columns are clickable */
        .rbc-day-slot {
          pointer-events: auto !important;
        }
        .rbc-time-column {
          pointer-events: auto !important;
        }
        /* Custom date header styling - Google Calendar style */
        .rbc-time-header {
          overflow: visible !important;
        }
        .rbc-time-header-content {
          border-left: none !important;
        }
        .rbc-header {
          padding: 10px 4px 12px 4px !important;
          border-bottom: 1px solid #e5e7eb !important;
          font-size: 11px !important;
          overflow: visible !important;
          min-height: 60px !important;
        }
        .rbc-header .day-letter {
          display: block;
          font-size: 10px;
          font-weight: 500;
          color: #5f6368;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .rbc-header .day-number {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 400;
          color: #202124;
          width: 32px;
          height: 32px;
          margin: 0 auto;
          border-radius: 50%;
        }
        .rbc-header .day-number.today {
          background-color: #1a73e8;
          color: white;
          font-weight: 500;
        }
        /* Remove the extra allDay row */
        .rbc-allday-cell {
          display: none !important;
        }
        .rbc-time-header-content > .rbc-row.rbc-row-resource {
          display: none !important;
        }
      }
    `}</style>
  );
};

export default CalendarStyles;
