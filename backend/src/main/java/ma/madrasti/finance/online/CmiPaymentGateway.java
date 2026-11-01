package ma.madrasti.finance.online;

import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.finance.Payment;

import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.*;

/**
 * CMI, « 3D Pay Hosting » : la famille est envoyée sur la page de paiement du CMI par un formulaire signé ;
 * le CMI notifie ensuite le serveur (callback de serveur à serveur), dont on vérifie la signature.
 * Signature « ver3 » : valeurs triées par nom de paramètre (sans tenir compte de la casse), « \ » et « | »
 * échappés, jointes par « | », suivies de la clé du magasin ; SHA-512 encodé en Base64.
 */
public class CmiPaymentGateway implements PaymentGateway {

    /** Dirham marocain (ISO 4217 numérique). */
    private static final String MAD = "504";
    private static final Set<String> UNSIGNED = Set.of("hash", "encoding");

    private final MadrastiProperties.Payments.Cmi cmi;
    private final String publicUrl;
    private final SecureRandom random = new SecureRandom();

    public CmiPaymentGateway(MadrastiProperties.Payments properties) {
        this.cmi = properties.cmi();
        this.publicUrl = properties.publicUrl();
    }

    @Override
    public String provider() {
        return "cmi";
    }

    @Override
    public Checkout createCheckout(Payment payment, String reference, String returnUrl, String cancelUrl) {
        // Identifiant de commande unique par tentative : c'est lui qui revient dans les notifications du CMI.
        var oid = reference + "-" + Long.toString(Math.abs(random.nextLong()), 36);
        var notify = publicUrl + "/api/public/payments/cmi";
        var fields = new LinkedHashMap<String, String>();
        fields.put("clientid", cmi.clientId());
        fields.put("storetype", "3D_PAY_HOSTING");
        fields.put("TranType", "PreAuth");
        fields.put("hashAlgorithm", "ver3");
        fields.put("amount", payment.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString());
        fields.put("currency", MAD);
        fields.put("oid", oid);
        fields.put("okUrl", notify + "/return");
        fields.put("failUrl", notify + "/return");
        fields.put("callbackUrl", notify + "/callback");
        fields.put("shopurl", cancelUrl);
        fields.put("lang", "fr");
        fields.put("rnd", Long.toString(System.nanoTime()));
        fields.put("BillToName", payment.getStudent().getParent() == null ? payment.getStudent().fullName()
                : payment.getStudent().getParent().fullName());
        if (payment.getStudent().getParent() != null) {
            fields.put("email", payment.getStudent().getParent().getEmail());
        }
        fields.put("encoding", "UTF-8");
        fields.put("hash", hash(fields, cmi.storeKey()));
        return new Checkout(oid, cmi.gatewayUrl(), fields);
    }

    /** Payé si une notification signée du CMI a validé la tentative (callback ou retour du navigateur). */
    @Override
    public boolean isPaid(OnlinePayment online) {
        return online.isApproved();
    }

    /** Une notification du CMI est authentique si sa signature correspond à celle recalculée avec la clé du magasin. */
    public boolean isAuthentic(Map<String, String> params) {
        var received = params.entrySet().stream().filter(e -> e.getKey().equalsIgnoreCase("hash"))
                .map(Map.Entry::getValue).findFirst().orElse(null);
        return received != null && MessageDigest.isEqual(
                received.getBytes(StandardCharsets.UTF_8), hash(params, cmi.storeKey()).getBytes(StandardCharsets.UTF_8));
    }

    static String hash(Map<String, String> params, String storeKey) {
        var names = new ArrayList<>(params.keySet());
        names.sort(String.CASE_INSENSITIVE_ORDER);
        var plain = new StringBuilder();
        for (var name : names) {
            if (!UNSIGNED.contains(name.toLowerCase(Locale.ROOT))) {
                plain.append(escape(Objects.toString(params.get(name), "").strip())).append('|');
            }
        }
        plain.append(escape(storeKey));
        try {
            var digest = MessageDigest.getInstance("SHA-512").digest(plain.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("|", "\\|");
    }
}
