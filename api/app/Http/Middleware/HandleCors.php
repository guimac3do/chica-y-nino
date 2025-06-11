<?php


return [
    

    'allowed_origins' => [env('FRONTEND_URL', 'https://loja.chicaynino.com.br')],
    'allowed_origins_patterns' => [],
    'exposed_headers' => [],
    'max_age' => 0,
    'paths' => ['api/*', 'loja/*', 'storage/*', 'sanctum/csrf-cookie', '*'], // adicione sua rota se necessário
    'allowed_methods' => ['*'],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,
    
];
