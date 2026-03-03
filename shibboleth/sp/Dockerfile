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

# Copy custom Shibboleth configuration files
COPY config/shibboleth2.xml /etc/shibboleth/shibboleth2.xml
COPY config/attribute-map.xml /etc/shibboleth/attribute-map.xml
# Copy protected routes config
COPY config/protected-routes.conf /etc/apache2/conf-available/protected-routes.conf
COPY config/shibboleth-headers.conf /etc/apache2/conf-available/shibboleth-headers.conf

# Set proper permissions
USER root
RUN chmod 644 /etc/apache2/ssl/ssl.crt && \
    chmod 600 /etc/apache2/ssl/ssl.key && \
    chmod 644 /etc/shibboleth/sp-cert.pem && \
    chmod 600 /etc/shibboleth/sp-key.pem && \
    chmod 644 /etc/shibboleth/metadata/idp-metadata.xml && \
    chmod 644 /etc/shibboleth/shibboleth2.xml && \
    chmod 644 /etc/shibboleth/attribute-map.xml && \
    chmod 644 /etc/apache2/conf-available/protected-routes.conf && \
    chmod 644 /etc/apache2/conf-available/shibboleth-headers.conf

# Expose ports (80 for HTTP, 443 for HTTPS)
EXPOSE 80 443

# Override default CMD to run Ansible, then patch the config
# 1. Inject ProxyPass exclusion for Shibboleth.sso
# 2. Change ProxyPreserveHost from Off to On
# 3. Disable Shibboleth on root path (AuthType None)
# 4. Disable requireSession on root path
# 5. Allow public access on root path
# 6. Include protected routes config
# 7. Include headers mapping config
CMD ["/bin/sh", "-c", "ansible-playbook /opt/playbooks/shibboleth-playbook.yaml --diff && a2enmod headers && sed -i '/ProxyPass \\/ http/i ProxyPass /Shibboleth.sso !' /etc/apache2/sites-enabled/000-default.conf && sed -i 's/ProxyPreserveHost Off/ProxyPreserveHost On/' /etc/apache2/sites-enabled/000-default.conf && sed -i '/<Location \\/>/,/<\\/Location>/ s/AuthType shibboleth/AuthType None/' /etc/apache2/sites-enabled/000-default.conf && sed -i '/<Location \\/>/,/<\\/Location>/ s/ShibRequestSetting requireSession 1/ShibRequestSetting requireSession 0/' /etc/apache2/sites-enabled/000-default.conf && sed -i '/<Location \\/>/,/<\\/Location>/ s/require valid-user/Require all granted/' /etc/apache2/sites-enabled/000-default.conf && sed -i '/<\\/VirtualHost>/i Include /etc/apache2/conf-available/protected-routes.conf' /etc/apache2/sites-enabled/000-default.conf && sed -i '/<\\/VirtualHost>/i Include /etc/apache2/conf-available/shibboleth-headers.conf' /etc/apache2/sites-enabled/000-default.conf && service apache2 restart && service shibd start && tail -f /var/log/apache2/access.log -f /var/log/apache2/error.log -f /var/log/apache2/other_vhosts_access.log -f /var/log/shibboleth/shibd.log -f /var/log/shibboleth/shibd_warn.log -f /var/log/shibboleth/signature.log -f /var/log/shibboleth/transaction.log"]
