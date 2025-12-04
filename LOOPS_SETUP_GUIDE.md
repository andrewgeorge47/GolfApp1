# Loops.so Email Notifications Setup Guide

This guide will help you set up transactional email notifications for booking confirmations, reschedules, and cancellations.

## 1. Environment Variables

Add your Loops credentials to your `.env` file:

```bash
LOOPS_API_KEY=your_loops_api_key_here
LOOPS_BOOKING_CONFIRMATION_ID=clxxxxxxxxxxxxx
LOOPS_BOOKING_RESCHEDULED_ID=clxxxxxxxxxxxxx
LOOPS_BOOKING_CANCELLED_ID=clxxxxxxxxxxxxx
```

**Where to find these:**
- **LOOPS_API_KEY**: https://app.loops.so/settings?page=api
- **Transactional IDs**: Create each email template in Loops, then copy the auto-generated ID from the template settings

## 2. Create Transactional Email Templates in Loops

You need to create 3 transactional email templates in your Loops dashboard.

### Go to: Loops Dashboard → Transactional → Create new transactional email

**Important:** After creating each template, Loops will auto-generate a transactional ID (looks like `clxxxxxxxxxxxxx`). Copy this ID and add it to your environment variables.

---

## Template 1: Booking Confirmation

**Name:** Booking Confirmation
**Auto-generated ID:** Copy this to `LOOPS_BOOKING_CONFIRMATION_ID`

### Data Variables Available:
- `firstName` - User's first name
- `lastName` - User's last name
- `clubName` - Club name (e.g., "No. 5")
- `date` - Booking date (YYYY-MM-DD)
- `startTime` - Start time (HH:MM)
- `endTime` - End time (HH:MM)
- `bay` - Bay number
- `bookingType` - Type of booking (solo/social)
- `bookingId` - Booking ID

### Example Email Template:

**Subject:** Your Simulator Booking Confirmation - {{clubName}}

**Body:**
```
Hi {{firstName}},

Your simulator booking has been confirmed! 🎉

Booking Details:
• Location: {{clubName}}
• Date: {{date}}
• Time: {{startTime}} - {{endTime}}
• Bay: {{bay}}
• Type: {{bookingType}}
• Booking ID: #{{bookingId}}

A calendar invite (.ics file) is attached to this email. Add it to your calendar so you don't forget!

See you on the course!

Best regards,
Neighborhood National Golf Club
```

---

## Template 2: Booking Rescheduled

**Name:** Booking Rescheduled
**Auto-generated ID:** Copy this to `LOOPS_BOOKING_RESCHEDULED_ID`

### Data Variables Available:
- `firstName` - User's first name
- `lastName` - User's last name
- `clubName` - Club name
- `oldDate` - Original date
- `oldStartTime` - Original start time
- `oldEndTime` - Original end time
- `oldBay` - Original bay
- `newDate` - New date
- `newStartTime` - New start time
- `newEndTime` - New end time
- `newBay` - New bay
- `bookingId` - Booking ID

### Example Email Template:

**Subject:** Your Booking Has Been Rescheduled - {{clubName}}

**Body:**
```
Hi {{firstName}},

Your simulator booking has been rescheduled.

Previous Booking:
• Date: {{oldDate}}
• Time: {{oldStartTime}} - {{oldEndTime}}
• Bay: {{oldBay}}

New Booking:
• Date: {{newDate}}
• Time: {{newStartTime}} - {{newEndTime}}
• Bay: {{newBay}}
• Location: {{clubName}}
• Booking ID: #{{bookingId}}

A new calendar invite (.ics file) is attached to replace the previous one.

See you soon!

Best regards,
Neighborhood National Golf Club
```

---

## Template 3: Booking Cancelled

**Name:** Booking Cancelled
**Auto-generated ID:** Copy this to `LOOPS_BOOKING_CANCELLED_ID`

### Data Variables Available:
- `firstName` - User's first name
- `lastName` - User's last name
- `clubName` - Club name
- `date` - Booking date
- `startTime` - Start time
- `endTime` - End time
- `bay` - Bay number
- `bookingId` - Booking ID

### Example Email Template:

**Subject:** Your Booking Has Been Cancelled - {{clubName}}

**Body:**
```
Hi {{firstName}},

Your simulator booking has been cancelled.

Cancelled Booking Details:
• Location: {{clubName}}
• Date: {{date}}
• Time: {{startTime}} - {{endTime}}
• Bay: {{bay}}
• Booking ID: #{{bookingId}}

You can make a new booking anytime at play.nngolf.co

If you have any questions, please contact us.

Best regards,
Neighborhood National Golf Club
```

---

## 3. Test the Integration

### Test Booking Confirmation:
1. Create a new simulator booking
2. Check your email for the confirmation with calendar attachment
3. Verify the .ics file opens in your calendar app

### Test Reschedule:
1. Edit an existing booking
2. Check your email for the reschedule notification
3. Verify the new calendar invite replaces the old one

### Test Cancellation:
1. Delete a booking
2. Check your email for the cancellation notification

---

## 4. Customization

### Add Your Logo:
In each template, add your logo image at the top:
```html
<img src="https://your-domain.com/logo.png" alt="Logo" width="200">
```

### Customize Colors:
Match your brand colors in the email templates using HTML/CSS in the Loops editor.

### Add Social Links:
Add footer links to your website, social media, etc.

---

## 5. Troubleshooting

### Emails Not Sending:
1. Check all environment variables are set in Render:
   - `LOOPS_API_KEY`
   - `LOOPS_BOOKING_CONFIRMATION_ID`
   - `LOOPS_BOOKING_RESCHEDULED_ID`
   - `LOOPS_BOOKING_CANCELLED_ID`
2. Verify the transactional IDs match exactly what Loops generated
3. Check server logs for errors:
   ```bash
   grep "Error sending" logs/server.log
   ```

### Calendar File Not Working:
- Ensure the .ics attachment is enabled in Loops
- Test the .ics file by opening it directly
- Check timezone settings

### Data Variables Not Showing:
- Verify variable names match exactly (case-sensitive)
- Use {{variableName}} syntax in templates
- Check Loops documentation: https://loops.so/docs/transactional/guide

---

## 6. Production Deployment

Before going live:

1. ✅ Test all three email types
2. ✅ Verify calendar attachments work
3. ✅ Check emails on mobile and desktop
4. ✅ Test with different email clients (Gmail, Outlook, etc.)
5. ✅ Set up SPF/DKIM records for better deliverability
6. ✅ Monitor email delivery rates in Loops dashboard

---

## Support

- Loops Documentation: https://loops.so/docs
- Loops Support: support@loops.so
- Your support: admin@nngolf.co
