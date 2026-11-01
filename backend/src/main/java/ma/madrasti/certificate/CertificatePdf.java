package ma.madrasti.certificate;

import org.openpdf.text.*;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Mise en page de l'attestation de scolarité (document administratif, rédigé en français). */
@Component
public class CertificatePdf {

    public record Data(String schoolName, String city, String address, String directorName, String studentName,
                       LocalDate birthDate, String registrationNumber, String massarCode, String classroomName,
                       String level, String academicYear, LocalDate issuedOn, String reference) {
    }

    private static final Color INDIGO = new Color(0x4F, 0x3F, 0xD6);
    private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH);

    public byte[] render(Data d) {
        var out = new ByteArrayOutputStream();
        var document = new Document(PageSize.A4, 64, 64, 64, 64);
        PdfWriter.getInstance(document, out);
        document.addTitle("Attestation de scolarité — " + d.studentName());
        document.addCreator("Madrasti");
        document.open();

        var brand = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, INDIGO);
        var small = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);
        var title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
        var body = FontFactory.getFont(FontFactory.HELVETICA, 12);
        var bold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);

        document.add(new Paragraph(d.schoolName(), brand));
        document.add(new Paragraph(join(d.address(), d.city()), small));
        document.add(new Paragraph("Réf. " + d.reference(), small));

        var heading = new Paragraph("ATTESTATION DE SCOLARITÉ", title);
        heading.setAlignment(Element.ALIGN_CENTER);
        heading.setSpacingBefore(56);
        heading.setSpacingAfter(36);
        document.add(heading);

        var intro = new Paragraph(18);
        intro.add(new Chunk("Je soussigné(e), ", body));
        intro.add(new Chunk(d.directorName() == null ? "le directeur / la directrice" : d.directorName(), bold));
        intro.add(new Chunk(", directeur / directrice de l'établissement ", body));
        intro.add(new Chunk(d.schoolName(), bold));
        intro.add(new Chunk(", atteste que l'élève :", body));
        document.add(intro);

        var details = new Paragraph(22);
        details.setSpacingBefore(18);
        details.setIndentationLeft(24);
        line(details, "Nom et prénom : ", d.studentName(), body, bold);
        if (d.birthDate() != null) {
            line(details, "Né(e) le : ", d.birthDate().format(LONG_DATE), body, bold);
        }
        line(details, "Matricule : ", d.registrationNumber(), body, bold);
        if (d.massarCode() != null) {
            line(details, "Code MASSAR : ", d.massarCode(), body, bold);
        }
        line(details, "Classe : ", d.classroomName() + (d.level() == null ? "" : " (" + d.level() + ")"), body, bold);
        document.add(details);

        var statement = new Paragraph(18);
        statement.setSpacingBefore(18);
        statement.add(new Chunk("est régulièrement inscrit(e) dans notre établissement pour l'année scolaire ", body));
        statement.add(new Chunk(d.academicYear() == null ? "en cours" : d.academicYear(), bold));
        statement.add(new Chunk(".", body));
        document.add(statement);

        var purpose = new Paragraph("La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.", body);
        purpose.setSpacingBefore(18);
        document.add(purpose);

        var signature = new Paragraph(18);
        signature.setAlignment(Element.ALIGN_RIGHT);
        signature.setSpacingBefore(48);
        signature.add(new Chunk("Fait à " + (d.city() == null ? "" : d.city()) + ", le " + d.issuedOn().format(LONG_DATE) + "\n", body));
        signature.add(new Chunk("La direction", bold));
        document.add(signature);

        var footer = new Paragraph("Document généré par Madrasti. Toute rature ou surcharge le rend invalide.", small);
        footer.setSpacingBefore(120);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);

        document.close();
        return out.toByteArray();
    }

    private static void line(Paragraph p, String label, String value, Font body, Font bold) {
        p.add(new Chunk(label, body));
        p.add(new Chunk(value + "\n", bold));
    }

    private static String join(String address, String city) {
        if (address == null) return city == null ? "" : city;
        return city == null ? address : address + " — " + city;
    }
}
