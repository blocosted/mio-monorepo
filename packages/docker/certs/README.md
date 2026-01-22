# SSL Certificates for Mio Development

This directory contains SSL certificates for local development with Traefik.

## Certificate Structure

- `mioca.pem` - Certificate Authority (CA) certificate
- `mioca-key.pem` - CA private key
- `mio-cert.pem` - Server certificate signed by CA
- `mio-key.pem` - Server private key

## Domains Covered

The certificate covers the following domains:
- `mio.local` (root domain)
- `*.mio.local` (wildcard)
- `app.mio.local` (Next.js web app)
- `api.mio.local` (Elysia API)
- `pgadmin.mio.local` (PostgreSQL admin)
- `redis-commander.mio.local` (Redis UI)
- `qstash.mio.local` (QStash dev server)
- `traefik.mio.local` (Traefik dashboard)
- `postgres.mio.local` (PostgreSQL)
- `redis.mio.local` (Redis)

## Generating Certificates

Run the following commands to generate the certificates:

```bash
# Generate CA private key and certificate
openssl genrsa -out mioca-key.pem 2048
openssl req -x509 -new -nodes -key mioca-key.pem -sha256 -days 3650 -out mioca.pem \
  -subj "/C=FR/ST=France/L=Paris/O=Mio CA/CN=Mio Local CA"

# Generate server private key
openssl genrsa -out mio-key.pem 2048

# Generate certificate signing request (CSR)
openssl req -new -key mio-key.pem -out mio.csr -config mio.cnf

# Sign the certificate with CA
openssl x509 -req -in mio.csr -CA mioca.pem -CAkey mioca-key.pem -CAcreateserial \
  -out mio-cert.pem -days 3650 -sha256 -extfile mio.cnf -extensions v3_req

# Clean up CSR
rm mio.csr
```

## Installing CA Certificate

To trust the certificates in your browser, install the CA certificate:

### macOS
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain mioca.pem
```

### Linux
```bash
sudo cp mioca.pem /usr/local/share/ca-certificates/mioca.crt
sudo update-ca-certificates
```

### Windows
1. Double-click `mioca.pem`
2. Click "Install Certificate"
3. Select "Local Machine"
4. Select "Place all certificates in the following store"
5. Browse to "Trusted Root Certification Authorities"
6. Click "Finish"

## /etc/hosts Configuration

Add the following entries to `/etc/hosts`:

```
127.0.0.1 mio.local
127.0.0.1 app.mio.local
127.0.0.1 api.mio.local
127.0.0.1 pgadmin.mio.local
127.0.0.1 redis-commander.mio.local
127.0.0.1 qstash.mio.local
127.0.0.1 traefik.mio.local
127.0.0.1 postgres.mio.local
127.0.0.1 redis.mio.local
```

## Verification

After starting the services with `docker-compose up -d`, verify the certificates:

```bash
# Check certificate details
openssl x509 -in mio-cert.pem -text -noout

# Test HTTPS connection
curl -v https://api.mio.local
```

## Security Notes

- These certificates are for **development only**
- Never use these certificates in production
- Keep the private keys (`*-key.pem`) secure
- The certificates are valid for 10 years (3650 days)
- Regenerate certificates if you add new domains
