FROM php:8.3.36-apache-bookworm

RUN pecl install apcu-5.1.28 \
    && docker-php-ext-enable apcu \
    && a2enmod remoteip \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && rm -rf /tmp/pear

COPY docker/php.ini /usr/local/etc/php/conf.d/90-site.ini
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/workers.conf /etc/apache2/conf-enabled/90-workers.conf
COPY --chown=root:root . /var/www/html/
RUN find /var/www/html -type d -exec chmod 755 {} + \
    && find /var/www/html -type f -exec chmod 644 {} +
COPY docker/healthz.php /var/www/html/healthz.php

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1/healthz.php || exit 1
