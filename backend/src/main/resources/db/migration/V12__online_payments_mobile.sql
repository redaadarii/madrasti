-- Paiement en ligne depuis l'application mobile : origine de la tentative et formulaire signé (CMI) à rejouer
ALTER TABLE online_payments ADD COLUMN client VARCHAR(10) NOT NULL DEFAULT 'web';
ALTER TABLE online_payments ADD COLUMN form_fields TEXT;
