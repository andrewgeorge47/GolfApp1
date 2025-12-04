/**
 * Calendar .ics file generator for booking confirmations
 */

/**
 * Generate an .ics calendar file content for a booking
 * @param {Object} booking - The booking object
 * @param {string} booking.date - Booking date (YYYY-MM-DD)
 * @param {string} booking.start_time - Start time (HH:MM:SS)
 * @param {string} booking.end_time - End time (HH:MM:SS)
 * @param {string} booking.club_name - Club name
 * @param {number} booking.bay - Bay number
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's full name
 * @returns {string} .ics file content
 */
function generateICS(booking, userEmail, userName) {
  const { date, start_time, end_time, club_name, bay } = booking;

  // Parse date and times - handle PostgreSQL time format
  // Times come as "HH:MM:SS" or HH:MM:SS.mmm or Date objects
  const parseTime = (timeStr) => {
    if (!timeStr) return '00:00:00';
    // Convert to string and extract just HH:MM:SS
    const timeOnly = timeStr.toString().split('.')[0].split('+')[0]; // Remove milliseconds and timezone
    // Ensure it's 8 characters (HH:MM:SS)
    if (timeOnly.length === 5) return timeOnly + ':00'; // HH:MM -> HH:MM:00
    if (timeOnly.length === 8) return timeOnly; // HH:MM:SS
    return '00:00:00';
  };

  const startTimeStr = parseTime(start_time);
  const endTimeStr = parseTime(end_time);

  // Parse date - could be Date object or string
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date.toString().split('T')[0];

  // Create datetime strings (local time, not UTC)
  const bookingDate = new Date(dateStr + 'T' + startTimeStr);
  const endDate = new Date(dateStr + 'T' + endTimeStr);

  // Verify dates are valid
  if (isNaN(bookingDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid date/time:', { date, start_time, end_time, dateStr, startTimeStr, endTimeStr });
    throw new Error('Invalid booking date or time');
  }

  // Format dates for ICS (YYYYMMDDTHHMMSS) in local time
  const formatICSDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  // Generate unique ID
  const uid = `booking-${booking.id || Date.now()}@nngolf.co`;
  const timestamp = formatICSDate(new Date());

  // Create ICS content
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Neighborhood National GC//Simulator Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${formatICSDate(bookingDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:Simulator Booking - ${club_name} Bay ${bay}`,
    `DESCRIPTION:Your simulator booking at ${club_name}\\nBay: ${bay}\\nDate: ${date}\\nTime: ${start_time.slice(0, 5)} - ${end_time.slice(0, 5)}`,
    `LOCATION:${club_name}, Neighborhood National Golf Club`,
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`,
    `ORGANIZER;CN=Neighborhood National GC:mailto:bookings@nngolf.co`,
    `ATTENDEE;CN=${userName};RSVP=TRUE:mailto:${userEmail}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return ics;
}

/**
 * Convert .ics content to base64 for email attachment
 * @param {string} icsContent - The .ics file content
 * @returns {string} Base64 encoded content
 */
function icsToBase64(icsContent) {
  return Buffer.from(icsContent).toString('base64');
}

module.exports = {
  generateICS,
  icsToBase64
};
