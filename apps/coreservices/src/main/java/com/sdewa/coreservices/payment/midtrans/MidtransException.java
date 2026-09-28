package com.sdewa.coreservices.payment.midtrans;

public class MidtransException extends RuntimeException {

    public MidtransException(String message) {
        super(message);
    }

    public MidtransException(String message, Throwable cause) {
        super(message, cause);
    }
}
