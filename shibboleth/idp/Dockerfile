FROM unicon/shibboleth-idp:3.4.3

LABEL maintainer="StudyCAT Team"
LABEL description="Shibboleth IdP for StudyCAT with LDAP authentication"

# Copy the customized IdP configuration
COPY customized-shibboleth-idp/ /opt/shibboleth-idp/

# Ensure proper permissions
RUN chmod 600 /opt/shibboleth-idp/credentials/idp-browser.p12 && \
    chmod 600 /opt/shibboleth-idp/credentials/idp-backchannel.p12 && \
    chown -R jetty:jetty /opt/shibboleth-idp/credentials

# Expose ports
# 4443 - Browser-based TLS (HTTPS)
# 8443 - Backchannel TLS
EXPOSE 4443 8443

# The base image already has CMD set to start Jetty
