
CREATE TABLE spiritos_user
(
    email TEXT PRIMARY KEY NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL
);

CREATE TABLE client
(
    id TEXT PRIMARY KEY NOT NULL,
    secret_key TEXT NOT NULL,
    app_name TEXT,
    homepage TEXT,
    description TEXT,
    redirect_uri TEXT NOT NULL
);
INSERT INTO client (id, secret_key, app_name, homepage, description, redirect_uri) VALUES ('SPIRITOS', '5j4MSSuaprea7PXnRCrqTiyL2KlFmG3cKJ0XoilBRvpd0P2Z', 'SpiritOS', 'https://www.spiritos.com', 'The Actual App', 'https://gateway.spiritos.com/oauth/callback');
CREATE TABLE access_token
(
    id BIGSERIAL PRIMARY KEY,
    access_token TEXT NOT NULL,
    scope TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL
);
CREATE TABLE user_access_token (
    email TEXT NOT NULL,
    access_token_id BIGINT NOT NULL,
    PRIMARY KEY(email, access_token_id),
    CONSTRAINT user_email_fk FOREIGN KEY (email) REFERENCES spiritos_user (email) ON DELETE CASCADE,
    CONSTRAINT access_token_id_fk FOREIGN KEY (access_token_id) REFERENCES access_token (id) ON DELETE CASCADE
);
CREATE TABLE client_access_token (
    client_id TEXT NOT NULL,
    access_token_id BIGINT NOT NULL,
    PRIMARY KEY (client_id, access_token_id),
    CONSTRAINT client_id_fk FOREIGN KEY (client_id) REFERENCES client (id) ON DELETE CASCADE,
    CONSTRAINT access_token_id_fk FOREIGN KEY (access_token_id) REFERENCES access_token (id) ON DELETE CASCADE
);
CREATE TABLE refresh_token
(
    id BIGSERIAL PRIMARY KEY,
    refresh_token TEXT NOT NULL,
    scope TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL
);
CREATE TABLE user_refresh_token (
    email TEXT NOT NULL,
    refresh_token_id BIGINT NOT NULL,
    PRIMARY KEY(email, refresh_token_id),
    CONSTRAINT user_email_fk FOREIGN KEY (email) REFERENCES spiritos_user (email) ON DELETE CASCADE,
    CONSTRAINT refresh_token_id_fk FOREIGN KEY (refresh_token_id) REFERENCES refresh_token (id) ON DELETE CASCADE
);

CREATE TABLE client_refresh_token (
    client_id TEXT NOT NULL,
    refresh_token_id BIGINT NOT NULL,
    PRIMARY KEY (client_id, refresh_token_id),
    CONSTRAINT client_id_fk FOREIGN KEY (client_id) REFERENCES client (id) ON DELETE CASCADE,
    CONSTRAINT refresh_token_id_fk FOREIGN KEY (refresh_token_id) REFERENCES refresh_token (id) ON DELETE CASCADE
);