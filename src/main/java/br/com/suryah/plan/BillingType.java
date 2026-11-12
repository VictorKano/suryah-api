package br.com.suryah.plan;

/** How revenue is tracked for a plan. */
public enum BillingType {
    /** Revenue is calculated per attended session (e.g. drop-in, TotalPass, Wellhub). */
    PER_SESSION,
    /** Revenue is a fixed recurring fee; usage is capped by weeklySessionLimit. */
    SUBSCRIPTION
}
