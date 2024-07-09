# Set up

## Sub domain set up
Set up subdomain in apache conf

	<VirtualHost *:80>
	   ServerName example.com
	   DocumentRoot "/www/example.com"

	    <Directory "/var/www/example.com">
            AllowOverride All
            Require all granted
	    </Directory>
	</VirtualHost>

	<VirtualHost *:80>
	    ServerName wordmap.example.com
	    DocumentRoot "/var/www/wordmap.example.com"
	    ErrorLog "logs/wordmap-error_log"
		<Directory "/var/www/wordmap.example.com">
			Require all granted
		</Directory>
	</VirtualHost>

## Set up SSL cert for the new subdomain
Run certbot (which calls letsenvrypt) and choose the subdomain (with www.)    

    certbot -apache

Restart apache  

    sudo systemctl restart httpd

## Library set up

### 1. Enable curl extension
uncomment/add the following in `php.ini`  

	extension=curl 

### 2. Enable SSL HTTPS call support for curl in `php.ini`
**On Windows:**  

Download a cacert.pem (certificate authorities file).  
Place it in php folder.  
Add its address to php.info.  
Example:  

    curl.cainfo=c:\tools\php-8.2.1\cacert.pem

### 3. Enable json extension:
**On Linux**  

    sudo yum install php-json

### 4. Enable APCu for caching, binary needs to be set up
**On Windows:**  

Check PHP version using `phpinfo()`  
Download an place apcu binary for your specific version of PHP in php/ext folder.  
In `php.ini` place  

	[apcu]
	extension=php_apcu.dll
	apc.enabled=1
	apc.shm_size=32M
	apc.ttl=7200
	apc.enable_cli=1
	apc.serializer=php

**On Linux (Red Hat): Use Pear/PECL pkg manager.**  

	sudo yum install php-devel
	sudo yum install php-pear
	sudo pecl channel-update pecl.php.net
	sudo pecl install apcu

Add following to `php.ini`  

    extension=apcu.so

