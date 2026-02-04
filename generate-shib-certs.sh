#!/bin/bash

CERT_DIR="./shibboleth/sp/certificates"
mkdir -p "$CERT_DIR"

echo "🔐 Generating Shibboleth SP certificates..."
echo "⚠️  When prompted, you can leave most fields blank."
echo "⚠️  For 'Common Name', use: sp.studycat.local"
echo ""

# Run OpenSSL interactively
openssl req -x509 -newkey rsa:3072 \
  -keyout "$CERT_DIR/sp-key.pem" \
  -out "$CERT_DIR/sp-cert.pem" \
  -days 3650 \
  -nodes

# Fix permissions
chmod 600 "$CERT_DIR/sp-key.pem"

echo ""
echo "✅ Certificates created in $CERT_DIR"
echo "-------------------------------------------------------"
echo "Next Step: Copy the content of sp-cert.pem into the IdP's"
echo "metadata file (sp-metadata.xml) and restart the IdP."
echo "-------------------------------------------------------"