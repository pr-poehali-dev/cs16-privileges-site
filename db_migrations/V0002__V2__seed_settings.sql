INSERT INTO site_settings (key, value) VALUES
    ('cs_server_host', '95.188.88.74'),
    ('cs_server_port', '27015'),
    ('cs_server_name', 'PUBLIC #1'),
    ('vip_price', '149'),
    ('premium_price', '299'),
    ('elite_price', '499'),
    ('chat_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
