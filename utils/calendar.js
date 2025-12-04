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

  // Parse date and times
  const bookingDate = new Date(date + 'T' + start_time);
  const endDate = new Date(date + 'T' + end_time);

  // Format dates for ICS (YYYYMMDDTHHMMSS)
  const formatICSDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
