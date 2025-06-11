<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\DomCrawler\Crawler;
use Illuminate\Support\Facades\Log;
use App\Models\Campaign;
use App\Models\ProductColor;

class ProductScraperController extends Controller
{
    public function scrape(Request $request)
    {
        $request->validate([
            'url' => 'required|url',
            'campaign_id' => 'required|exists:campaigns,id',
        ]);

        $url = $request->input('url');
        $campaign_id = $request->input('campaign_id');

        Log::info('Iniciando scraping do produto', ['url' => $url, 'campaign_id' => $campaign_id]);

        try {
            // Initialize Symfony HttpClient
            $client = HttpClient::create([
                'timeout' => 30,
                'headers' => [
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                ],
            ]);
            $response = $client->request('GET', $url);
            $content = $response->getContent();

            // Initialize DomCrawler
            $crawler = new Crawler($content);

            // Extrair nome do produto
            $name = $this->extractText($crawler, [
                'h1',
                '.product-title',
                '.product-name',
                '[itemprop="name"]',
                '.title--product', // Natura-specific selector
            ], 'Produto sem nome');
            $name = trim($name);

            // Extrair descrição
            $description = $this->extractText($crawler, [
                '.product-description',
                '[itemprop="description"]',
                '.description',
                '.text--description', // Natura-specific selector
                '.description--product', // Additional Natura-specific selector
            ], null);
            $description = $description ? trim($description) : null;

            // Extrair preço
            $price = $this->extractText($crawler, [
                '.price',
                '.product-price',
                '[itemprop="price"]',
                '.current-price',
                '.price--product', // Natura-specific selector
                '.price__amount', // Natura-specific for price
            ], '0');
            $price = (float) preg_replace('/[^0-9.]/', '', $price);
            $price = $price > 0 ? $price : 0.01; // Ensure non-zero price

            // Extrair cores
            $colors = [];
            $crawler->filter('.color-option, .swatch, [data-color], .color-swatch, .variant-option, .variant--color')->each(function (Crawler $node) use (&$colors) {
                $colorName = trim($node->text(''));
                if ($colorName) {
                    $color = ProductColor::firstOrCreate(['name' => $colorName]);
                    $colors[] = ['id' => $color->id, 'name' => $colorName];
                }
            });

            // Extrair tamanhos
            $sizes = [];
            $crawler->filter('.size-option, .size, [data-size], .size-swatch, .variant-option, .variant--size')->each(function (Crawler $node) use (&$sizes) {
                $sizeName = trim($node->text(''));
                if ($sizeName) {
                    $sizes[] = ['size' => $sizeName, 'price' => null];
                }
            });

            // Se nenhum tamanho for encontrado, adicionar um padrão
            if (empty($sizes)) {
                $sizes[] = ['size' => 'Único', 'price' => null];
            }

            // Associar tamanhos a cada cor
            $colorSizes = array_map(function ($color) use ($sizes) {
                return [
                    'id' => $color['id'],
                    'name' => $color['name'],
                    'sizes' => $sizes,
                ];
            }, $colors);

            // Se nenhuma cor for encontrada, adicionar uma padrão
            if (empty($colors)) {
                $defaultColor = ProductColor::firstOrCreate(['name' => 'Padrão']);
                $colorSizes[] = [
                    'id' => $defaultColor->id,
                    'name' => 'Padrão',
                    'sizes' => $sizes,
                ];
            }

            // Extrair e baixar imagens
            $images = [];
            $imageData = [];
            $crawler->filter('.product-image, .main-image, [itemprop="image"], img, .image--product, .carousel__image')->each(function (Crawler $node) use (&$images, &$imageData, $url, $client) {
                $src = $node->attr('src');
                // Convert relative URLs to absolute
                if ($src && !filter_var($src, FILTER_VALIDATE_URL)) {
                    $baseUrl = parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST);
                    $src = rtrim($baseUrl, '/') . '/' . ltrim($src, '/');
                }
                if ($src && filter_var($src, FILTER_VALIDATE_URL)) {
                    try {
                        $imageResponse = $client->request('GET', $src);
                        $contentType = $imageResponse->getHeaders()['content-type'][0] ?? 'image/jpeg';
                        $imageContent = $imageResponse->getContent();
                        $base64 = base64_encode($imageContent);
                        $images[] = $src; // Keep URL for reference
                        $imageData[] = [
                            'url' => $src,
                            'base64' => "data:{$contentType};base64,{$base64}",
                        ];
                    } catch (\Exception $e) {
                        Log::warning('Erro ao baixar imagem', ['url' => $src, 'error' => $e->getMessage()]);
                    }
                }
            });

            // Filtrar imagens duplicadas e limitar a 5
            $images = array_unique($images);
            $images = array_slice($images, 0, 5);
            $imageData = array_slice($imageData, 0, 5);

            // Estruturar os dados no formato esperado pelo ProductController@store
            $productData = [
                'nome' => $name,
                'descricao' => $description,
                'campaign_id' => $campaign_id,
                'preco' => $price,
                'colors' => $colorSizes,
                'images' => $imageData, // Include base64 data
                'color_images' => [], // Não associamos imagens a cores específicas
            ];

            Log::info('Dados do produto extraídos com sucesso', ['product_data' => $productData]);

            return response()->json([
                'message' => 'Dados do produto extraídos com sucesso!',
                'product' => $productData,
            ]);

        } catch (\Exception $e) {
            Log::error('Erro ao realizar scraping', ['url' => $url, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Erro ao extrair dados do produto: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Helper method to extract text from the first matching selector
     */
    private function extractText(Crawler $crawler, array $selectors, ?string $default = null): ?string
    {
        foreach ($selectors as $selector) {
            try {
                $element = $crawler->filter($selector)->first();
                if ($element->count() > 0) {
                    return $element->text($default);
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        return $default;
    }
}