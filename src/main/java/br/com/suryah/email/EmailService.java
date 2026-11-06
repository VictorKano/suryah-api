package br.com.suryah.email;

import br.com.suryah.booking.BookingSnapshot;
import br.com.suryah.classsession.SessionSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.List;

/**
 * Sends transactional e-mails for booking events.
 *
 * All public methods accept plain-data snapshots (not JPA entities) so they
 * are safe to call from @Async threads where the Hibernate session is closed.
 * When mail.enabled=false (the default for local dev), every method is a no-op.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final EmailProperties props;

    public EmailService(JavaMailSender mailSender, EmailProperties props) {
        this.mailSender = mailSender;
        this.props = props;
    }

    // ── 1. Reserva confirmada ─────────────────────────────────────────────────

    @Async
    public void sendBookingConfirmed(BookingSnapshot snap) {
        if (!props.isEnabled()) return;

        String subject = "Reserva confirmada - " + snap.classTypeName();
        String body = template(
                snap.studentName(),
                "Sua reserva est&#225; confirmada!",
                "Voc&#234; tem uma vaga garantida na aula abaixo.",
                detail("Aula", snap.classTypeName()) +
                detail("Data / hor&#225;rio", snap.formattedDateTime()) +
                detail("Dura&#231;&#227;o", snap.durationMin() + " minutos"),
                "At&#233; l&#225;!"
        );
        send(snap.studentEmail(), subject, body);
    }

    // ── 2. Entrada na lista de espera ─────────────────────────────────────────

    @Async
    public void sendWaitlistConfirmed(BookingSnapshot snap) {
        if (!props.isEnabled()) return;

        String subject = "Voc\u00ea est\u00e1 na lista de espera - " + snap.classTypeName();
        String body = template(
                snap.studentName(),
                "Voc&#234; entrou na lista de espera.",
                "A aula est&#225; lotada no momento, mas voc&#234; ser&#225; notificado assim que uma vaga abrir.",
                detail("Aula", snap.classTypeName()) +
                detail("Data / hor&#225;rio", snap.formattedDateTime()) +
                detail("Dura&#231;&#227;o", snap.durationMin() + " minutos"),
                "Avisaremos se uma vaga abrir."
        );
        send(snap.studentEmail(), subject, body);
    }

    // ── 3. Promoção da lista de espera ────────────────────────────────────────

    @Async
    public void sendWaitlistPromoted(BookingSnapshot snap) {
        if (!props.isEnabled()) return;

        String subject = "Vaga aberta! Sua reserva foi confirmada - " + snap.classTypeName();
        String body = template(
                snap.studentName(),
                "Uma vaga abriu para voc&#234;!",
                "Voc&#234; saiu da lista de espera e agora tem uma vaga confirmada.",
                detail("Aula", snap.classTypeName()) +
                detail("Data / hor&#225;rio", snap.formattedDateTime()) +
                detail("Dura&#231;&#227;o", snap.durationMin() + " minutos"),
                "Nos vemos em breve!"
        );
        send(snap.studentEmail(), subject, body);
    }

    // ── 4. Sessão cancelada pelo admin ────────────────────────────────────────

    // ── 5. Lembrete 12h antes da aula ────────────────────────────────────────

    /** Called synchronously by the reminder scheduler — NOT @Async. */
    public void sendReminder(BookingSnapshot snap) {
        if (!props.isEnabled()) return;

        String subject = "Lembrete: sua aula come&#231;a em 12 horas - " + snap.classTypeName();
        String body = template(
                snap.studentName(),
                "Sua aula come&#231;a em breve!",
                "Este &#233; um lembrete de que voc&#234; tem uma aula confirmada amnh&#227;.",
                detail("Aula", snap.classTypeName()) +
                detail("Hor&#225;rio", snap.formattedDateTime()) +
                detail("Dura&#231;&#227;o", snap.durationMin() + " minutos"),
                "Te esperamos l&#225;!"
        );
        send(snap.studentEmail(), subject, body);
    }
    @Async
    public void sendSessionCancelled(SessionSnapshot session, List<BookingSnapshot> snapshots) {
        if (!props.isEnabled()) return;
        if (snapshots.isEmpty()) return;

        for (BookingSnapshot snap : snapshots) {
            String subject = "Aula cancelada - " + session.classTypeName();
            String body = template(
                    snap.studentName(),
                    "Infelizmente esta aula foi cancelada.",
                    "Lamentamos pelo inconveniente. Fique \u00e0 vontade para reservar outra sess\u00e3o.",
                    detail("Aula", session.classTypeName()) +
                    detail("Data / hor&#225;rio", session.formattedDateTime()),
                    "Esperamos te ver em breve!"
            );
            send(snap.studentEmail(), subject, body);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void send(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(props.getFrom(), props.getStudioName());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.debug("E-mail enviado para {} - {}", to, subject);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Falha ao enviar e-mail para {}: {}", to, e.getMessage());
        }
    }

    /**
     * Minimal, clean HTML e-mail template that renders well in Gmail, Outlook and Apple Mail.
     * All non-ASCII characters use HTML entities to avoid source-file encoding issues.
     */
    private String detail(String label, String value) {
        // label is a trusted static HTML string (may contain entities like &#225;)
        // value comes from the database — escape it to prevent injection
        return "<tr>"
             + "<td style=\"padding:4px 8px;color:#6b7280;font-size:14px;\">" + label + "</td>"
             + "<td style=\"padding:4px 8px;color:#111827;font-size:14px;font-weight:600;\">" + escapeHtml(value) + "</td>"
             + "</tr>";
    }

    private String template(String name, String headline, String intro,
                             String detailRows, String closing) {
        String studio = props.getStudioName();
        // Only escape values that come from the database (could contain user input).
        // headline/intro/closing are static trusted HTML strings — do NOT escape them.
        String safeStudio = escapeHtml(studio);
        String safeName   = escapeHtml(name);

        return "<!DOCTYPE html>"
             + "<html lang=\"pt-BR\">"
             + "<head>"
             + "<meta charset=\"UTF-8\">"
             + "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">"
             + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
             + "</head>"
             + "<body style=\"margin:0;padding:0;background:#f4f7f4;font-family:Arial,sans-serif;\">"
             + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f7f4;padding:32px 0;\">"
             + "<tr><td align=\"center\">"
             + "<table width=\"520\" cellpadding=\"0\" cellspacing=\"0\" "
             +   "style=\"background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);\">"
             + "<tr><td style=\"background:#466a46;padding:24px 32px;\">"
             + "<p style=\"margin:0;font-size:22px;font-weight:700;color:#ffffff;\">" + safeStudio + "</p>"
             + "</td></tr>"
             + "<tr><td style=\"padding:28px 32px;\">"
             + "<p style=\"margin:0 0 4px;font-size:15px;color:#6b7280;\">Ol&#225;, " + safeName + "</p>"
             + "<p style=\"margin:0 0 20px;font-size:20px;font-weight:700;color:#1f2937;\">" + headline + "</p>"
             + "<p style=\"margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;\">" + intro + "</p>"
             + "<table cellpadding=\"0\" cellspacing=\"0\" "
             +   "style=\"background:#f4f7f4;border-radius:8px;padding:12px 4px;width:100%;\">"
             + detailRows
             + "</table>"
             + "<p style=\"margin:24px 0 0;font-size:14px;color:#6b7280;\">" + closing + "</p>"
             + "</td></tr>"
             + "<tr><td style=\"padding:16px 32px;border-top:1px solid #e5e7eb;\">"
             + "<p style=\"margin:0;font-size:12px;color:#9ca3af;\">"
             + "Este &#233; um e-mail autom&#225;tico do est&#250;dio " + safeStudio
             + ". Por favor, n&#227;o responda.</p>"
             + "</td></tr>"
             + "</table>"
             + "</td></tr></table>"
             + "</body></html>";
    }

    /** Escapes HTML special chars so DB values render safely and accented
     *  characters are expressed as numeric entities (charset-independent). */
    private String escapeHtml(String text) {
        if (text == null) return "";
        StringBuilder sb = new StringBuilder(text.length() * 2);
        for (char c : text.toCharArray()) {
            if (c > 127) {
                sb.append("&#").append((int) c).append(';');
            } else {
                switch (c) {
                    case '&'  -> sb.append("&amp;");
                    case '<'  -> sb.append("&lt;");
                    case '>'  -> sb.append("&gt;");
                    case '"'  -> sb.append("&quot;");
                    default   -> sb.append(c);
                }
            }
        }
        return sb.toString();
    }
}
