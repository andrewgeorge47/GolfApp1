/**
 * Loops.so email notification helper
 * Documentation: https://loops.so/docs/api-reference
 */

const { LoopsClient } = require('loops');
const { generateICS, icsToBase64 } = require('./calendar');

// Initialize Loops client
const loops = new LoopsClient(process.env.LOOPS_API_KEY);

/**
 * Send booking confirmation email with calendar attachment
 * @param {Object} booking - The booking object
 * @param {Object} user - User object with email, first_name, last_name
 */
async function sendBookingConfirmation(booking, user) {
  try {
    // Helper to format time for display
    const formatTime = (timeStr) => {
      if (!timeStr) return '00:00';
      const str = timeStr.toString().split('.')[0]; // Remove milliseconds
      return str.slice(0, 5); // Get HH:MM
    };

    const icsContent = generateICS(
      booking,
      user.email_address,
      `${user.first_name} ${user.last_name}`
    );

    const emailData = {
      email: user.email_address,
      transactionalId: 'booking-confirmation', // Create this in Loops dashboard
      dataVariables: {
        firstName: user.first_name,
        lastName: user.last_name,
        clubName: booking.club_name,
        date: booking.date,
        startTime: formatTime(booking.start_time),
        endTime: formatTime(booking.end_time),
        bay: booking.bay,
        bookingType: booking.type,
        bookingId: booking.id
      },
      attachments: [
        {
          filename: 'booking.ics',
          contentType: 'text/calendar',
          data: icsToBase64(icsContent)
        }
      ]
    };

    const response = await loops.sendTransactionalEmail(emailData);
    console.log('Booking confirmation sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    throw error;
  }
}

/**
 * Send booking reschedule notification
 * @param {Object} oldBooking - The original booking details
 * @param {Object} newBooking - The updated booking details
 * @param {Object} user - User object with email, first_name, last_name
 */
async function sendRescheduleNotification(oldBooking, newBooking, user) {
  try {
    // Helper to format time for display
    const formatTime = (timeStr) => {
      if (!timeStr) return '00:00';
      const str = timeStr.toString().split('.')[0]; // Remove milliseconds
      return str.slice(0, 5); // Get HH:MM
    };

    const icsContent = generateICS(
      newBooking,
      user.email_address,
      `${user.first_name} ${user.last_name}`
    );

    const emailData = {
      email: user.email_address,
      transactionalId: 'booking-rescheduled', // Create this in Loops dashboard
      dataVariables: {
        firstName: user.first_name,
        lastName: user.last_name,
        clubName: newBooking.club_name,
        // Old booking info
        oldDate: oldBooking.date,
        oldStartTime: formatTime(oldBooking.start_time),
        oldEndTime: formatTime(oldBooking.end_time),
        oldBay: oldBooking.bay,
        // New booking info
        newDate: newBooking.date,
        newStartTime: formatTime(newBooking.start_time),
        newEndTime: formatTime(newBooking.end_time),
        newBay: newBooking.bay,
        bookingId: newBooking.id
      },
      attachments: [
        {
          filename: 'booking.ics',
          contentType: 'text/calendar',
          data: icsToBase64(icsContent)
        }
      ]
    };

    const response = await loops.sendTransactionalEmail(emailData);
    console.log('Reschedule notification sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending reschedule notification:', error);
    throw error;
  }
}

/**
 * Send booking cancellation notification
 * @param {Object} booking - The cancelled booking details
 * @param {Object} user - User object with email, first_name, last_name
 */
async function sendCancellationNotification(booking, user) {
  try {
    // Helper to format time for display
    const formatTime = (timeStr) => {
      if (!timeStr) return '00:00';
      const str = timeStr.toString().split('.')[0]; // Remove milliseconds
      return str.slice(0, 5); // Get HH:MM
    };

    const emailData = {
      email: user.email_address,
      transactionalId: 'booking-cancelled', // Create this in Loops dashboard
      dataVariables: {
        firstName: user.first_name,
        lastName: user.last_name,
        clubName: booking.club_name,
        date: booking.date,
        startTime: formatTime(booking.start_time),
        endTime: formatTime(booking.end_time),
        bay: booking.bay,
        bookingId: booking.id
      }
    };

    const response = await loops.sendTransactionalEmail(emailData);
    console.log('Cancellation notification sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending cancellation notification:', error);
    throw error;
  }
}

module.exports = {
  sendBookingConfirmation,
  sendRescheduleNotification,
  sendCancellationNotification
};
