<?php
/**
 * BODA E-Commerce - Product Source of Truth
 * In a production app, this would query a real database.
 */

const PRODUCT_DATABASE = [
    'shirt-001' => [
        'id' => 'shirt-001',
        'name' => 'قميص رجالي كلاسيكي',
        'price' => 89.99,
        'category' => 'ملابس'
    ],
    'jeans-001' => [
        'id' => 'jeans-001',
        'name' => 'بنطال جينز رجالي',
        'price' => 149.99,
        'category' => 'ملابس'
    ],
    'phone-001' => [
        'id' => 'phone-001',
        'name' => 'هاتف ذكي 5G',
        'price' => 799.99,
        'category' => 'إلكترونيات'
    ],
    'laptop-001' => [
        'id' => 'laptop-001',
        'name' => 'لابتوب احترافي',
        'price' => 1299.99,
        'category' => 'إلكترونيات'
    ],
    'camera-001' => [
        'id' => 'camera-001',
        'name' => 'كاميرا ديجيتال احترافية',
        'price' => 899.99,
        'category' => 'إلكترونيات'
    ],
    'skincare-001' => [
        'id' => 'skincare-001',
        'name' => 'مجموعة العناية بالبشرة',
        'price' => 59.99,
        'category' => 'جمال'
    ],
    'makeup-001' => [
        'id' => 'makeup-001',
        'name' => 'مجموعة مستحضرات التجميل',
        'price' => 49.99,
        'category' => 'جمال'
    ],
    'perfume-001' => [
        'id' => 'perfume-001',
        'name' => 'عطر فاخر',
        'price' => 79.99,
        'category' => 'جمال'
    ],
    'shoes-001' => [
        'id' => 'shoes-001',
        'name' => 'حذاء رياضي احترافي',
        'price' => 129.99,
        'category' => 'رياضة'
    ],
    'dumbbells-001' => [
        'id' => 'dumbbells-001',
        'name' => 'مجموعة أوزان تمرين',
        'price' => 89.99,
        'category' => 'رياضة'
    ],
    'pillow-001' => [
        'id' => 'pillow-001',
        'name' => 'وسادة شاطئ فاخرة',
        'price' => 39.99,
        'category' => 'منزل'
    ],
    // Test Products (Internal use/Legacy)
    'p1' => [
        'id' => 'p1',
        'name' => 'ساعة ذكية برو',
        'price' => 1200.00,
        'category' => 'إلكترونيات'
    ]
];

/**
 * Calculate total price on server side
 */
function calculateOrderTotal($items) {
    $subtotal = 0;
    $shipping = 20.00; // Fixed shipping cost
    $tax_rate = 0.05;  // 5% Tax

    foreach ($items as $item) {
        $pid = $item['id'] ?? '';
        if (isset(PRODUCT_DATABASE[$pid])) {
            $product = PRODUCT_DATABASE[$pid];
            $quantity = (int)($item['quantity'] ?? 0);
            $subtotal += $product['price'] * $quantity;
        }
    }

    $tax = $subtotal * $tax_rate;
    $total = $subtotal + $tax + $shipping;

    return [
        'subtotal' => $subtotal,
        'tax' => $tax,
        'shipping' => $shipping,
        'total' => $total
    ];
}
