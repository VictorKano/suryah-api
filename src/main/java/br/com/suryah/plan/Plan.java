package br.com.suryah.plan;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "plan")
@Getter @Setter @NoArgsConstructor
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // ── PER_SESSION fields ────────────────────────────────────────────────────

    /** Price charged per attended session. Used only when billingType = PER_SESSION. */
    @Column(name = "price_per_attendance", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerAttendance = BigDecimal.ZERO;

    // ── SUBSCRIPTION fields ───────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_type", nullable = false, length = 20)
    private BillingType billingType = BillingType.PER_SESSION;

    /** Only meaningful when billingType = SUBSCRIPTION. */
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = true, length = 20)
    private BillingCycle billingCycle;

    /**
     * Price per billing cycle. Used only when billingType = SUBSCRIPTION.
     * E.g. R$ 200,00/month for a "Mensal 3x" plan.
     */
    @Column(name = "price", nullable = true, precision = 10, scale = 2)
    private BigDecimal price;

    /**
     * Maximum number of bookings the student can make per calendar week (Mon–Sun).
     * Null means unlimited (used for PER_SESSION plans).
     */
    @Column(name = "weekly_session_limit", nullable = true)
    private Integer weeklySessionLimit;

    // ── Metadata ──────────────────────────────────────────────────────────────

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
