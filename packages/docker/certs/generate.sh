#!/bin/bash

# Generate SSL certificates for Mio local development
# This script should be run from the packages/docker/certs directory

set -e

echo "🔐 Generating SSL certificates for Mio..."

# Generate CA private key and certificate
echo "📝 Generating CA certificate..."
openssl genrsa -out mioca-key.pem 2048
openssl req -x509 -new -nodes -key mioca-key.pem -sha256 -days 3650 -out mioca.pem \
  -subj "/C=FR/ST=France/L=Paris/O=Mio CA/CN=Mio Local CA"

# Generate server private key
echo "🔑 Generating server private key..."
openssl genrsa -out mio-key.pem 2048

# Generate certificate signing request (CSR)
echo "📄 Generating CSR..."
openssl req -new -key mio-key.pem -out mio.csr -config mio.cnf

# Sign the certificate with CA
echo "✍️  Signing certificate with CA..."
openssl x509 -req -in mio.csr -CA mioca.pem -CAkey mioca-key.pem -CAcreateserial \
  -out mio-cert.pem -days 3650 -sha256 -extfile mio.cnf -extensions v3_req

# Clean up CSR
rm mio.csr

echo "✅ Certificates generated successfully!"
echo ""
echo "📋 Generated files:"
echo "  - mioca.pem (CA certificate)"
echo "  - mioca-key.pem (CA private key)"
echo "  - mio-cert.pem (Server certificate)"
echo "  - mio-key.pem (Server private key)"
echo ""
echo "📌 Next steps:"
echo "  1. Install CA certificate on your system (see README.md)"
echo "  2. Add domains to /etc/hosts (see README.md)"
echo "  3. Start Docker services: docker-compose up -d"
echo ""
