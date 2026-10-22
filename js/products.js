/* =====================================================================
   SHOPIA - DAFTAR PRODUK
   ---------------------------------------------------------------------
   Cara termudah menambah/mengubah produk: buka halaman Admin di website
   (menu Akun -> Dasbor Penjual, atau alamat #/admin). Foto bisa langsung
   diupload dari galeri HP dan file ini diperbarui otomatis.

   Boleh juga diedit manual. Keterangan setiap field ada di js/data.js.
   ===================================================================== */
const PRODUCTS = [
  {
    "id": "p01",
    "name": "Kemeja Oversize Linen Wanita",
    "category": "fashion-wanita",
    "price": 149000,
    "originalPrice": 229000,
    "rating": 4.8,
    "sold": 2310,
    "stock": 54,
    "emoji": "👚",
    "color": [
      "#ede9fe",
      "#c4b5fd"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "warna": [
        "Putih",
        "Lilac",
        "Krem",
        "Hitam"
      ]
    },
    "tags": [
      "kemeja",
      "atasan",
      "linen",
      "oversize",
      "kerja",
      "kuliah",
      "casual"
    ],
    "createdAt": "2026-09-02",
    "flashSale": true,
    "description": "Kemeja oversize berbahan linen premium yang adem dan tidak mudah kusut. Potongan longgar cocok untuk ke kampus, kerja, maupun hangout. Jahitan rapi, kancing kayu natural.",
    "reviews": [
      {
        "name": "Nadia",
        "rating": 5,
        "text": "Bahannya adem banget, ukuran pas sesuai chart. Pengiriman cepat!",
        "date": "2026-10-01"
      },
      {
        "name": "Rara",
        "rating": 5,
        "text": "Warna lilac cantik, persis seperti di foto. Bakal beli lagi.",
        "date": "2026-09-28"
      },
      {
        "name": "Sinta",
        "rating": 4,
        "text": "Kualitas bagus, cuma agak tipis untuk warna putih.",
        "date": "2026-09-20"
      }
    ]
  },
  {
    "id": "p02",
    "name": "Dress Midi Floral Korea",
    "category": "fashion-wanita",
    "price": 189000,
    "originalPrice": 259000,
    "rating": 4.7,
    "sold": 1540,
    "stock": 32,
    "emoji": "👗",
    "color": [
      "#fce7f3",
      "#f9a8d4"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "S",
        "M",
        "L"
      ],
      "warna": [
        "Pink",
        "Biru",
        "Kuning"
      ]
    },
    "tags": [
      "dress",
      "gaun",
      "floral",
      "korea",
      "kondangan",
      "pesta",
      "jalan"
    ],
    "createdAt": "2026-10-10",
    "flashSale": false,
    "description": "Dress midi motif bunga ala Korea dengan tali pinggang yang bisa diatur. Bahan rayon jatuh dan nyaman dipakai seharian.",
    "reviews": [
      {
        "name": "Ayu",
        "rating": 5,
        "text": "Cantik banget dipakai kondangan, bahannya jatuh.",
        "date": "2026-10-12"
      },
      {
        "name": "Dewi",
        "rating": 4,
        "text": "Bagus, tapi ukuran M agak kecil. Saran naik satu ukuran.",
        "date": "2026-10-05"
      }
    ]
  },
  {
    "id": "p03",
    "name": "Kaos Polos Cotton Combed 30s",
    "category": "fashion-pria",
    "price": 59000,
    "originalPrice": 89000,
    "rating": 4.9,
    "sold": 8920,
    "stock": 300,
    "emoji": "👕",
    "color": [
      "#e0e7ff",
      "#a5b4fc"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "S",
        "M",
        "L",
        "XL",
        "XXL"
      ],
      "warna": [
        "Hitam",
        "Putih",
        "Navy",
        "Abu",
        "Sage"
      ]
    },
    "tags": [
      "kaos",
      "tshirt",
      "polos",
      "cotton",
      "basic",
      "murah",
      "pria",
      "unisex"
    ],
    "createdAt": "2026-06-15",
    "flashSale": true,
    "description": "Kaos basic cotton combed 30s yang lembut, menyerap keringat, dan tidak melar. Wajib punya untuk outfit sehari-hari. Unisex.",
    "reviews": [
      {
        "name": "Budi",
        "rating": 5,
        "text": "Murah tapi kualitas mantap, sudah dicuci berkali-kali tetap awet.",
        "date": "2026-10-03"
      },
      {
        "name": "Andi",
        "rating": 5,
        "text": "Bahan lembut, jahitan rapi. Recommended seller!",
        "date": "2026-09-25"
      },
      {
        "name": "Fajar",
        "rating": 4,
        "text": "Bagus, warna sage agak beda sedikit dari foto.",
        "date": "2026-09-11"
      }
    ]
  },
  {
    "id": "p04",
    "name": "Celana Chino Slim Fit Pria",
    "category": "fashion-pria",
    "price": 169000,
    "originalPrice": 199000,
    "rating": 4.6,
    "sold": 1210,
    "stock": 48,
    "emoji": "👖",
    "color": [
      "#fef3c7",
      "#fcd34d"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "28",
        "30",
        "32",
        "34",
        "36"
      ],
      "warna": [
        "Khaki",
        "Navy",
        "Hitam"
      ]
    },
    "tags": [
      "celana",
      "chino",
      "slim",
      "kerja",
      "formal",
      "pria"
    ],
    "createdAt": "2026-08-01",
    "flashSale": false,
    "description": "Celana chino slim fit dengan bahan stretch sehingga nyaman untuk bergerak. Cocok untuk kerja kantoran maupun santai.",
    "reviews": [
      {
        "name": "Rizky",
        "rating": 5,
        "text": "Pas di badan, bahannya stretch enak dipakai.",
        "date": "2026-09-30"
      },
      {
        "name": "Hendra",
        "rating": 4,
        "text": "Bagus, pengiriman agak lama tapi barang oke.",
        "date": "2026-09-14"
      }
    ]
  },
  {
    "id": "p05",
    "name": "Sneakers Putih Klasik Unisex",
    "category": "sepatu",
    "price": 279000,
    "originalPrice": 399000,
    "rating": 4.8,
    "sold": 3480,
    "stock": 26,
    "emoji": "👟",
    "color": [
      "#f1f5f9",
      "#cbd5e1"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "37",
        "38",
        "39",
        "40",
        "41",
        "42",
        "43"
      ],
      "warna": [
        "Putih",
        "Putih-Hitam"
      ]
    },
    "tags": [
      "sneakers",
      "sepatu",
      "putih",
      "unisex",
      "casual",
      "kuliah"
    ],
    "createdAt": "2026-07-20",
    "flashSale": true,
    "description": "Sneakers putih klasik yang cocok dengan semua outfit. Sol karet empuk anti-slip, upper kulit sintetis mudah dibersihkan.",
    "reviews": [
      {
        "name": "Kevin",
        "rating": 5,
        "text": "Empuk dan ringan, ukuran sesuai. Mirip brand mahal!",
        "date": "2026-10-08"
      },
      {
        "name": "Putri",
        "rating": 5,
        "text": "Suka banget, gampang dibersihkan.",
        "date": "2026-09-29"
      },
      {
        "name": "Yoga",
        "rating": 3,
        "text": "Bagus, tapi kardusnya agak penyok saat sampai.",
        "date": "2026-09-10"
      }
    ]
  },
  {
    "id": "p06",
    "name": "Sandal Slide Empuk Anti Slip",
    "category": "sepatu",
    "price": 45000,
    "originalPrice": 69000,
    "rating": 4.5,
    "sold": 5120,
    "stock": 120,
    "emoji": "🩴",
    "color": [
      "#dcfce7",
      "#86efac"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "36-37",
        "38-39",
        "40-41",
        "42-43"
      ],
      "warna": [
        "Hitam",
        "Krem",
        "Hijau"
      ]
    },
    "tags": [
      "sandal",
      "slide",
      "murah",
      "rumah",
      "santai"
    ],
    "createdAt": "2026-05-11",
    "flashSale": false,
    "description": "Sandal slide berbahan EVA super empuk seperti menginjak awan. Anti slip dan tahan air.",
    "reviews": [
      {
        "name": "Lina",
        "rating": 5,
        "text": "Empuk banget, harga murah. Beli 3 sekaligus!",
        "date": "2026-10-02"
      },
      {
        "name": "Tomi",
        "rating": 4,
        "text": "Nyaman, ukuran agak besar sedikit.",
        "date": "2026-09-18"
      }
    ]
  },
  {
    "id": "p07",
    "name": "TWS Earbuds Bluetooth 5.3 ANC",
    "category": "elektronik",
    "price": 329000,
    "originalPrice": 499000,
    "rating": 4.7,
    "sold": 4210,
    "stock": 40,
    "emoji": "🎧",
    "color": [
      "#ede9fe",
      "#8b5cf6"
    ],
    "images": [],
    "variants": {
      "warna": [
        "Hitam",
        "Putih",
        "Ungu"
      ]
    },
    "tags": [
      "earbuds",
      "tws",
      "headset",
      "bluetooth",
      "musik",
      "anc",
      "gaming"
    ],
    "createdAt": "2026-10-15",
    "flashSale": true,
    "description": "Earbuds wireless dengan Active Noise Cancelling, baterai hingga 30 jam (dengan case), latency rendah untuk gaming, dan tahan cipratan air (IPX5).",
    "reviews": [
      {
        "name": "Dimas",
        "rating": 5,
        "text": "ANC-nya beneran kerja, suara bass mantap. Worth it!",
        "date": "2026-10-16"
      },
      {
        "name": "Mega",
        "rating": 4,
        "text": "Suara jernih, baterai awet. Mic agak kecil saat telepon.",
        "date": "2026-10-14"
      },
      {
        "name": "Arif",
        "rating": 5,
        "text": "Buat main game delay-nya kecil. Mantap.",
        "date": "2026-10-11"
      }
    ]
  },
  {
    "id": "p08",
    "name": "Smartwatch Layar AMOLED 1.9\"",
    "category": "elektronik",
    "price": 549000,
    "originalPrice": 799000,
    "rating": 4.6,
    "sold": 1890,
    "stock": 18,
    "emoji": "⌚",
    "color": [
      "#e0f2fe",
      "#7dd3fc"
    ],
    "images": [],
    "variants": {
      "warna": [
        "Hitam",
        "Silver",
        "Pink"
      ]
    },
    "tags": [
      "smartwatch",
      "jam",
      "olahraga",
      "fitness",
      "gadget",
      "hadiah"
    ],
    "createdAt": "2026-09-25",
    "flashSale": false,
    "description": "Smartwatch dengan layar AMOLED tajam, pemantau detak jantung, SpO2, tidur, 100+ mode olahraga, dan notifikasi WhatsApp. Baterai hingga 10 hari.",
    "reviews": [
      {
        "name": "Galih",
        "rating": 5,
        "text": "Layarnya tajam, fitur lengkap untuk harga segini.",
        "date": "2026-10-09"
      },
      {
        "name": "Citra",
        "rating": 4,
        "text": "Bagus, cuma aplikasinya kadang perlu sinkron ulang.",
        "date": "2026-10-01"
      }
    ]
  },
  {
    "id": "p09",
    "name": "Power Bank 20.000mAh Fast Charging",
    "category": "elektronik",
    "price": 219000,
    "originalPrice": 289000,
    "rating": 4.8,
    "sold": 6730,
    "stock": 75,
    "emoji": "🔋",
    "color": [
      "#fef9c3",
      "#fde047"
    ],
    "images": [],
    "variants": {
      "warna": [
        "Hitam",
        "Putih"
      ]
    },
    "tags": [
      "powerbank",
      "charger",
      "baterai",
      "gadget",
      "traveling",
      "hp"
    ],
    "createdAt": "2026-04-03",
    "flashSale": false,
    "description": "Power bank 20.000mAh dengan PD 22.5W, bisa mengisi 3 perangkat sekaligus. Ada layar digital persentase baterai.",
    "reviews": [
      {
        "name": "Wahyu",
        "rating": 5,
        "text": "Ngecas cepat, kapasitas sesuai. Mantap buat traveling.",
        "date": "2026-09-27"
      },
      {
        "name": "Intan",
        "rating": 5,
        "text": "Ada indikator persen, berguna banget.",
        "date": "2026-09-21"
      }
    ]
  },
  {
    "id": "p10",
    "name": "Serum Wajah Niacinamide 10%",
    "category": "kecantikan",
    "price": 79000,
    "originalPrice": 120000,
    "rating": 4.9,
    "sold": 12450,
    "stock": 210,
    "emoji": "🧴",
    "color": [
      "#fae8ff",
      "#e879f9"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "20ml",
        "50ml"
      ]
    },
    "tags": [
      "serum",
      "skincare",
      "niacinamide",
      "jerawat",
      "cerah",
      "wajah",
      "bpom"
    ],
    "createdAt": "2026-08-22",
    "flashSale": true,
    "description": "Serum niacinamide 10% + zinc untuk mencerahkan, menyamarkan bekas jerawat, dan mengontrol minyak. Sudah BPOM, cocok untuk kulit sensitif.",
    "reviews": [
      {
        "name": "Salsa",
        "rating": 5,
        "text": "Bekas jerawat memudar dalam 3 minggu. Holy grail!",
        "date": "2026-10-10"
      },
      {
        "name": "Vina",
        "rating": 5,
        "text": "Teksturnya ringan, cepat meresap, tidak lengket.",
        "date": "2026-10-04"
      },
      {
        "name": "Maya",
        "rating": 4,
        "text": "Bagus, tapi butuh waktu untuk lihat hasil.",
        "date": "2026-09-26"
      }
    ]
  },
  {
    "id": "p11",
    "name": "Lip Tint Matte Tahan Lama",
    "category": "kecantikan",
    "price": 49000,
    "originalPrice": 65000,
    "rating": 4.7,
    "sold": 7800,
    "stock": 160,
    "emoji": "💄",
    "color": [
      "#ffe4e6",
      "#fb7185"
    ],
    "images": [],
    "variants": {
      "warna": [
        "Rosy",
        "Brick",
        "Nude",
        "Cherry"
      ]
    },
    "tags": [
      "lip",
      "lipstik",
      "tint",
      "makeup",
      "matte",
      "bibir"
    ],
    "createdAt": "2026-10-18",
    "flashSale": false,
    "description": "Lip tint matte ringan yang tahan hingga 12 jam, tidak bikin bibir kering, dan transferproof.",
    "reviews": [
      {
        "name": "Tasya",
        "rating": 5,
        "text": "Warna Rosy cantik banget, tahan sampai makan siang.",
        "date": "2026-10-19"
      },
      {
        "name": "Bella",
        "rating": 4,
        "text": "Bagus, cuma Brick agak gelap di bibirku.",
        "date": "2026-10-17"
      }
    ]
  },
  {
    "id": "p12",
    "name": "Tumbler Stainless 1 Liter",
    "category": "rumah",
    "price": 89000,
    "originalPrice": 139000,
    "rating": 4.8,
    "sold": 3920,
    "stock": 88,
    "emoji": "🥤",
    "color": [
      "#ccfbf1",
      "#5eead4"
    ],
    "images": [],
    "variants": {
      "warna": [
        "Lilac",
        "Sage",
        "Hitam",
        "Krem"
      ]
    },
    "tags": [
      "tumbler",
      "botol",
      "minum",
      "stainless",
      "kantor",
      "olahraga",
      "hadiah"
    ],
    "createdAt": "2026-09-12",
    "flashSale": false,
    "description": "Tumbler stainless double wall, menjaga minuman dingin 24 jam dan panas 12 jam. Dilengkapi sedotan dan handle.",
    "reviews": [
      {
        "name": "Eka",
        "rating": 5,
        "text": "Es batu masih ada sampai sore. Keren!",
        "date": "2026-10-06"
      },
      {
        "name": "Gita",
        "rating": 5,
        "text": "Warna sage aesthetic, tidak bocor.",
        "date": "2026-09-30"
      }
    ]
  },
  {
    "id": "p13",
    "name": "Set Pisau Dapur Anti Karat (5 pcs)",
    "category": "rumah",
    "price": 159000,
    "originalPrice": 229000,
    "rating": 4.6,
    "sold": 980,
    "stock": 30,
    "emoji": "🔪",
    "color": [
      "#f5f5f4",
      "#d6d3d1"
    ],
    "images": [],
    "variants": {},
    "tags": [
      "pisau",
      "dapur",
      "masak",
      "stainless",
      "set"
    ],
    "createdAt": "2026-07-07",
    "flashSale": false,
    "description": "Set 5 pisau dapur stainless anti karat dengan stand kayu. Tajam, gagang ergonomis, aman dan mudah dibersihkan.",
    "reviews": [
      {
        "name": "Ibu Ratna",
        "rating": 5,
        "text": "Tajam sekali, stand-nya rapi di dapur.",
        "date": "2026-09-22"
      }
    ]
  },
  {
    "id": "p14",
    "name": "Keripik Tempe Pedas Khas Malang",
    "category": "umkm",
    "price": 25000,
    "originalPrice": 25000,
    "rating": 4.9,
    "sold": 4580,
    "stock": 500,
    "emoji": "🌶️",
    "color": [
      "#ffedd5",
      "#fdba74"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "250gr",
        "500gr"
      ],
      "warna": []
    },
    "tags": [
      "keripik",
      "tempe",
      "camilan",
      "snack",
      "pedas",
      "oleh-oleh",
      "umkm",
      "makanan"
    ],
    "createdAt": "2026-10-05",
    "flashSale": false,
    "description": "Keripik tempe renyah dengan bumbu pedas gurih, dibuat oleh UMKM di Malang. Tanpa pengawet, halal.",
    "reviews": [
      {
        "name": "Hana",
        "rating": 5,
        "text": "Renyah dan pedasnya pas! Cocok buat ngemil.",
        "date": "2026-10-13"
      },
      {
        "name": "Joko",
        "rating": 5,
        "text": "Mendukung UMKM, rasanya juara.",
        "date": "2026-10-07"
      }
    ]
  },
  {
    "id": "p15",
    "name": "Tas Anyaman Rotan Handmade",
    "category": "umkm",
    "price": 135000,
    "originalPrice": 175000,
    "rating": 4.8,
    "sold": 760,
    "stock": 15,
    "emoji": "👜",
    "color": [
      "#fef3c7",
      "#d97706"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "Kecil",
        "Sedang"
      ],
      "warna": [
        "Natural",
        "Coklat"
      ]
    },
    "tags": [
      "tas",
      "rotan",
      "anyaman",
      "handmade",
      "umkm",
      "aksesoris",
      "hadiah"
    ],
    "createdAt": "2026-10-20",
    "flashSale": false,
    "description": "Tas rotan anyaman tangan pengrajin Lombok. Kuat, ringan, dan cocok untuk ke pantai atau hangout bergaya boho.",
    "reviews": [
      {
        "name": "Laras",
        "rating": 5,
        "text": "Rapi banget anyamannya, banyak yang nanya beli di mana.",
        "date": "2026-10-21"
      }
    ]
  },
  {
    "id": "p16",
    "name": "Hoodie Fleece Basic Unisex",
    "category": "fashion-pria",
    "price": 175000,
    "originalPrice": 249000,
    "rating": 4.7,
    "sold": 2650,
    "stock": 60,
    "emoji": "🧥",
    "color": [
      "#ede9fe",
      "#a78bfa"
    ],
    "images": [],
    "variants": {
      "ukuran": [
        "M",
        "L",
        "XL",
        "XXL"
      ],
      "warna": [
        "Ungu",
        "Hitam",
        "Abu",
        "Krem"
      ]
    },
    "tags": [
      "hoodie",
      "jaket",
      "sweater",
      "unisex",
      "hangat",
      "casual"
    ],
    "createdAt": "2026-09-30",
    "flashSale": true,
    "description": "Hoodie fleece tebal dan hangat dengan kantong kanguru. Cocok untuk cuaca dingin, motoran, atau di ruangan ber-AC.",
    "reviews": [
      {
        "name": "Reza",
        "rating": 5,
        "text": "Tebal dan hangat, warnanya keren.",
        "date": "2026-10-15"
      },
      {
        "name": "Nina",
        "rating": 4,
        "text": "Bagus, sedikit berbulu setelah dicuci pertama.",
        "date": "2026-10-08"
      }
    ]
  }
];
