package br.com.suryah.email;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds the custom "mail.*" block from application.yml.
 */
@Component
@ConfigurationProperties(prefix = "mail")
public class EmailProperties {

    /** When false, no e-mails are sent (safe default for local dev). */
    private boolean enabled = false;

    /** The From address shown to recipients, e.g. "noreply@gmail.com". */
    private String from = "";

    /** Display name used in e-mail subjects and body, e.g. "Suryah". */
    private String studioName = "Suryah";

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }

    public String getStudioName() { return studioName; }
    public void setStudioName(String studioName) { this.studioName = studioName; }
}
