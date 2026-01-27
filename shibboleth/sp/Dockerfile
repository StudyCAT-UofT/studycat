FROM jefferyb/shibboleth-sp

LABEL maintainer="StudyCAT Team"
LABEL description="Shibboleth Service Provider for StudyCAT - Extends jefferyb/shibboleth-sp"

# Set environment variables for StudyCAT configuration
ENV HOSTNAME="sp.studycat.local"

####### APACHE SECTION #######
# The Next.js app runs on host.docker.internal:3000
ENV SERVICE_TO_PROTECT="host.docker.internal"
ENV SERVICE_PORT="3000"

####### SHIBBOLETH SECTION #######
ENV IDP_ENTITY_ID="https://idp.studycat.local/idp/shibboleth"
ENV IDP_METADATA_URL="https://idp.studycat.local:4443/idp/shibboleth"
ENV SUPPORT_EMAIL="admin@studycat.local"
ENV SHIB_METADATA_BACKUP_URL="https://idp.studycat.local:4443/idp/shibboleth"
ENV SHIB_DOWNLOAD_METADATA="true"

# Copy Apache SSL certificates (for HTTPS on the SP)
# Note: jefferyb image expects these at /etc/apache2/ssl/
COPY certificates/sp-cert.pem /etc/apache2/ssl/ssl.crt
COPY certificates/sp-key.pem /etc/apache2/ssl/ssl.key

# Copy Shibboleth SP certificates (for SAML signing/encryption)
# Note: jefferyb image expects these at /etc/shibboleth/
COPY certificates/sp-signing-cert.pem /etc/shibboleth/sp-cert.pem
COPY certificates/sp-signing-key.pem /etc/shibboleth/sp-key.pem

# Copy IdP metadata to the correct location expected by jefferyb image
# The image looks for metadata at /etc/shibboleth/metadata/idp-metadata.xml
COPY config/idp-metadata.xml /etc/shibboleth/metadata/idp-metadata.xml

# Copy custom Shibboleth configuration files (optional - if we need custom settings)
# The jefferyb image has defaults, but we can override them if needed
# For now, we'll let the jefferyb image use its default configs with our env vars
# COPY config/shibboleth2.xml /etc/shibboleth/shibboleth2.xml
# COPY config/attribute-map.xml /etc/shibboleth/attribute-map.xml

# Set proper permissions
USER root
RUN chmod 644 /etc/apache2/ssl/ssl.crt && \
    chmod 600 /etc/apache2/ssl/ssl.key && \
    chmod 644 /etc/shibboleth/sp-cert.pem && \
    chmod 600 /etc/shibboleth/sp-key.pem && \
    chmod 644 /etc/shibboleth/metadata/idp-metadata.xml

# Expose ports (80 for HTTP, 443 for HTTPS)
EXPOSE 80 443

# The base image already has a proper CMD, so we don't need to override it
