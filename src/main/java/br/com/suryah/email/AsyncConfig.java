package br.com.suryah.email;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables Spring's @Async and @Scheduled support.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {}
