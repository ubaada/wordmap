<?php

date_default_timezone_set('Europe/Amsterdam');

$apcuAvailabe = function_exists('apcu_enabled') && apcu_enabled();

if($apcuAvailabe)
{
    echo "APCu is available";
} else {
    echo "APCu is not available";
}
echo "\n";

$fruit  = 'apple';
$veggie = 'carrot';

apcu_store('foo', $fruit);
apcu_store('bar', $veggie);

if (apcu_exists('foo')) {
    echo "Foo exists: ";
    echo apcu_fetch('foo');
} else {
    echo "Foo does not exist";
}

?>