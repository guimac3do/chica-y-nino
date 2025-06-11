<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('FRONTEND_URL', 'https://loja.chicaynino.com.br/'), 'https://loja.chicaynino.com.br/', '*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['Content-Type', 'X-Requested-With'],
    'max_age' => 0,
    'supports_credentials' => true,
];

