package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.common.util.Hashing;
import com.sdewa.coreservices.payment.midtrans.MidtransSignature;
import com.sdewa.coreservices.payment.midtrans.MidtransStatus;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MidtransSignatureTest {

    @Test
    void sha512OfOrderStatusAmountAndKey() {
        String expected = Hashing.sha512Hex("DSH-1" + "200" + "49000.00" + "key");
        assertThat(MidtransSignature.compute("DSH-1", "200", "49000.00", "key")).isEqualTo(expected).hasSize(128);
        assertThat(MidtransSignature.verify("DSH-1", "200", "49000.00", expected, "key")).isTrue();
        assertThat(MidtransSignature.verify("DSH-1", "200", "49000.00", expected.toUpperCase(), "key")).isTrue();
        assertThat(MidtransSignature.verify("DSH-1", "200", "4900.00", expected, "key")).isFalse();
        assertThat(MidtransSignature.verify("DSH-1", "200", "49000.00", expected, "other")).isFalse();
        assertThat(MidtransSignature.verify(null, "200", "49000.00", expected, "key")).isFalse();
        assertThat(MidtransSignature.verify("DSH-1", "200", "49000.00", expected, "")).isFalse();
    }

    @Test
    void statusMappingAndAmountParsing() {
        assertThat(status("settlement", null).mappedStatus()).isEqualTo(TransactionStatus.PAID);
        assertThat(status("capture", "accept").mappedStatus()).isEqualTo(TransactionStatus.PAID);
        assertThat(status("capture", "challenge").mappedStatus()).isNull();
        assertThat(status("pending", null).mappedStatus()).isEqualTo(TransactionStatus.PENDING);
        for (String s : new String[]{"deny", "cancel", "expire", "failure"}) {
            assertThat(status(s, null).mappedStatus()).isEqualTo(TransactionStatus.FAILED);
        }
        assertThat(status("refund", null).mappedStatus()).isEqualTo(TransactionStatus.REFUNDED);
        assertThat(status("partial_refund", null).mappedStatus()).isEqualTo(TransactionStatus.REFUNDED);
        assertThat(new MidtransStatus(Map.of("gross_amount", "49000.00")).grossAmountRupiah()).isEqualTo(49000L);
        assertThat(new MidtransStatus(Map.of("gross_amount", "49000.50")).grossAmountRupiah()).isNull();
        assertThat(new MidtransStatus(Map.of("gross_amount", "abc")).grossAmountRupiah()).isNull();
        assertThat(TransactionStatus.PAID.canMoveTo(TransactionStatus.FAILED)).isFalse();
        assertThat(TransactionStatus.PAID.canMoveTo(TransactionStatus.REFUNDED)).isTrue();
        assertThat(TransactionStatus.FAILED.canMoveTo(TransactionStatus.PAID)).isFalse();
        assertThat(TransactionStatus.PENDING.canMoveTo(TransactionStatus.PENDING)).isFalse();
    }

    private static MidtransStatus status(String s, String fraud) {
        return fraud == null ? new MidtransStatus(Map.of("transaction_status", s))
                : new MidtransStatus(Map.of("transaction_status", s, "fraud_status", fraud));
    }
}
