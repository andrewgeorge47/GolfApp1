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
        startTime: booking.start_time.slice(0, 5),
        endTime: booking.end_time.slice(0, 5),
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
        oldStartTime: oldBooking.start_time.slice(0, 5),
        oldEndTime: oldBooking.end_time.slice(0, 5),
        oldBay: oldBooking.bay,
        // New booking info
        newDate: newBooking.date,
        newStartTime: newBooking.start_time.slice(0, 5),
        newEndTime: newBooking.end_time.slice(0, 5),
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
    const emailData = {
      email: user.email_address,
      transactionalId: 'booking-cancelled', // Create this in Loops dashboard
      dataVariables: {
        firstName: user.first_name,
        lastName: user.last_name,
        clubName: booking.club_name,
        date: booking.date,
        startTime: booking.start_time.slice(0, 5),
        endTime: booking.end_time.slice(0, 5),
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
