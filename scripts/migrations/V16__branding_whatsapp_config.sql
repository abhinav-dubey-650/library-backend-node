-- Login branding + admin WhatsApp notification numbers (library_config)

INSERT INTO library_config (config_key, config_value, description)
VALUES (
    'login_image_url',
    'https://res.cloudinary.com/dcahaaigp/image/upload/v1781909500/school_tfd0v6.png',
    'URL for school/logo image on login page and sidebar (local path like /school.png or full HTTPS URL)'
)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO library_config (config_key, config_value, description)
VALUES (
    'admin_whatsapp_numbers',
    '',
    'Comma-separated admin WhatsApp numbers (with country code) for library notifications'
)
ON CONFLICT (config_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_fee_payments_paid_at ON fee_payments(paid_at DESC);
