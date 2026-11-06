package br.com.suryah.email;

import br.com.suryah.booking.Booking;
import br.com.suryah.booking.BookingRepository;
import br.com.suryah.booking.BookingSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.List;
import java.util.Locale;

/**
 * Runs every hour and sends a 12-hour advance reminder to every CONFIRMED
 * student whose class starts between now+11h and now+13h (a 2-hour window
 * centred on the 12h mark) and has not yet received a reminder.
 *
 * Idempotency: once a reminder is sent the booking's reminder_sent flag is
 * set to TRUE so the scheduler never sends twice.
 */
@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    /** Hours before the class to send the reminder. */
    private static final long REMINDER_HOURS = 12;

    /** Half-width of the detection window (centred on REMINDER_HOURS). */
    private static final long WINDOW_HALF_HOURS = 1;

    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter
            .ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
            .withLocale(new Locale("pt", "BR"))
            .withZone(STUDIO_ZONE);

    private final BookingRepository bookingRepository;
    private final EmailService emailService;

    public ReminderScheduler(BookingRepository bookingRepository,
                              EmailService emailService) {
        this.bookingRepository = bookingRepository;
        this.emailService = emailService;
    }

    /**
     * Runs every hour on the hour.
     * cron = "0 0 * * * *" means: second=0, minute=0, every hour, every day.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void sendReminders() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime from = now.plusHours(REMINDER_HOURS - WINDOW_HALF_HOURS);
        OffsetDateTime to   = now.plusHours(REMINDER_HOURS + WINDOW_HALF_HOURS);

        List<Booking> bookings = bookingRepository.findConfirmedWithoutReminder(from, to);

        if (bookings.isEmpty()) {
            log.debug("Reminder scheduler: no bookings to remind in window [{} - {}]", from, to);
            return;
        }

        log.info("Reminder scheduler: sending {} reminder(s) for window [{} - {}]",
                bookings.size(), from, to);

        for (Booking booking : bookings) {
            try {
                String formattedDateTime = DATE_FMT.format(booking.getClassSession().getStartDateTime());
                BookingSnapshot snap = new BookingSnapshot(
                        booking.getStudent().getName(),
                        booking.getStudent().getEmail(),
                        booking.getClassSession().getClassType().getName(),
                        formattedDateTime,
                        booking.getClassSession().getDurationMin()
                );
                emailService.sendReminder(snap);
                booking.setReminderSent(true);
                bookingRepository.save(booking);
            } catch (Exception e) {
                // Log but don't abort — other students should still get their reminders
                log.error("Failed to send reminder for booking {}: {}", booking.getId(), e.getMessage());
            }
        }
    }
}
