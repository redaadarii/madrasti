package ma.madrasti.finance;

public enum PaymentMethod {
    CASH, CARD, TRANSFER, CHECK,
    /** Payé par la famille depuis son espace (Stripe, ou paiement simulé en démonstration). */
    ONLINE
}
