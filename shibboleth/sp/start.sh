#!/bin/bash

# Start script for Shibboleth SP + Apache

# Exit on any error
set -e

echo "Starting StudyCAT Shibboleth Service Provider..."

# Check if IdP metadata exists, if not create a placeholder
if [ ! -f /etc/shibboleth/idp-metadata.xml ]; then
    echo "WARNING: IdP metadata not found at /etc/shibboleth/idp-metadata.xml"
    echo "You need to add the IdP metadata before the SP can authenticate users."
    echo "Creating placeholder file..."
    cat > /etc/shibboleth/idp-metadata.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!-- Placeholder - Replace with actual IdP metadata -->
<EntityDescriptor entityID="https://idp.studycat.local/idp/shibboleth"
                  xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
    <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="https://idp.studycat.local:4443/idp/profile/SAML2/Redirect/SSO"/>
    </IDPSSODescriptor>
</EntityDescriptor>
EOF
fi

# Start Shibboleth SP daemon
echo "Starting Shibboleth SP daemon (shibd)..."
/usr/sbin/shibd -F -f -c /etc/shibboleth/shibboleth2.xml &
SHIBD_PID=$!

# Wait a moment for shibd to initialize
sleep 3

# Check if shibd started successfully
if ! ps -p $SHIBD_PID > /dev/null; then
    echo "ERROR: Shibboleth SP daemon failed to start"
    cat /var/log/shibboleth/shibd.log
    exit 1
fi

echo "Shibboleth SP daemon started successfully (PID: $SHIBD_PID)"

# Start Apache httpd
echo "Starting Apache httpd..."
/usr/sbin/httpd -D FOREGROUND &
HTTPD_PID=$!

# Wait a moment for httpd to initialize
sleep 2

# Check if httpd started successfully
if ! ps -p $HTTPD_PID > /dev/null; then
    echo "ERROR: Apache httpd failed to start"
    cat /var/log/httpd/error_log
    exit 1
fi

echo "Apache httpd started successfully (PID: $HTTPD_PID)"
echo "StudyCAT Service Provider is running!"
echo "Accessible at: https://sp.studycat.local"

# Function to handle shutdown gracefully
shutdown() {
    echo "Shutting down..."
    kill -TERM $HTTPD_PID 2>/dev/null || true
    kill -TERM $SHIBD_PID 2>/dev/null || true
    wait $HTTPD_PID 2>/dev/null || true
    wait $SHIBD_PID 2>/dev/null || true
    echo "Shutdown complete"
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Wait for either process to exit
wait -n $HTTPD_PID $SHIBD_PID

# If we get here, one of the processes died
echo "ERROR: A critical process has stopped"
exit 1
