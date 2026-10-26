<?php
$files = [
    getenv('RECAPTCHA_SECRET_FILE') ?: __DIR__ . '/../word-map-data/pvt-v3-key',
    getenv('OPENAI_KEY_FILE') ?: __DIR__ . '/../word-map-data/wv-openai-key.txt',
    getenv('EMBEDDINGS_FILE') ?: __DIR__ . '/../word-map-data/embeddings_with_code.json',
];
foreach ($files as $file) {
    if (!is_file($file) || !is_readable($file) || filesize($file) === 0) {
        http_response_code(503);
        exit('configuration unavailable');
    }
}
echo 'ok';
