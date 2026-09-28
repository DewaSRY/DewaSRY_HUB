package com.sdewa.coreservices.product;

import java.time.Instant;
import java.time.ZoneOffset;

/** Length of access one payment buys (not a recurring charge). */
public enum BillingPeriod {
    MONTHLY, YEARLY;

    public Instant addTo(Instant from) {
        var utc = from.atZone(ZoneOffset.UTC);
        return (this == MONTHLY ? utc.plusMonths(1) : utc.plusYears(1)).toInstant();
    }
}
