from messages_base import write, check_same_keys

common_en = {
  "appName": "Dewa Surya Hub",
  "backToHome": "Back to home",
  "language": "Language",
  "toggleTheme": "Toggle theme",
  "themeLight": "Light", "themeDark": "Dark", "themeSystem": "System",
  "toggleSidebar": "Toggle sidebar", "sidebarTitle": "Sidebar", "sidebarDescription": "Displays the mobile sidebar.",
  "cancel": "Cancel", "back": "Back", "continue": "Continue", "confirm": "Confirm", "close": "Close",
  "save": "Save", "delete": "Delete", "edit": "Edit", "create": "Create", "search": "Search", "reset": "Reset",
  "loading": "Loading…", "tryAgain": "Try again", "leave": "Leave", "retry": "Retry", "refresh": "Refresh",
  "yes": "Yes", "no": "No", "none": "None", "all": "All", "optional": "Optional", "actions": "Actions",
  "unsavedChangesTitle": "Unsaved changes",
  "unsavedChangesDescription": "You have unsaved changes. If you leave now, they will be lost.",
  "searchPlaceholder": "Search…", "clearSearch": "Clear search",
  "noDataFound": "No data found", "noDataDescription": "Try adjusting the filters or search.",
  "previousPage": "Previous", "nextPage": "Next", "pageNumber": "Page {{page}}", "pagination": "Pagination",
  "rowsPerPage": "Rows per page", "paginationRange": "{{from}}–{{to}} of {{count}}",
  "breadcrumb": "Breadcrumb", "moreActions": "More actions",
  "copied": "Copied to clipboard", "copyFailed": "Couldn't copy to clipboard", "copy": "Copy",
  "traceId": "Trace ID", "errorReference": "Reference",
  "error": {
    "title": "Something went wrong",
    "description": "An unexpected error occurred. Please try again.",
    "pageDescription": "This page could not be loaded. Please try again in a moment.",
    "network": "Can't reach the server. Check your connection and try again.",
    "forbidden": "You don't have access to this.",
    "notFound": "This item no longer exists.",
    "conflict": "This conflicts with the current state. Refresh and try again.",
    "server": "The server had a problem. Please try again."
  },
  "toast": { "loadFailed": "Failed to load data", "requestFailed": "Request failed", "saved": "Saved", "deleted": "Deleted" },
  "notFound": {
    "title": "Page not found",
    "description": "The page you are looking for doesn't exist or has moved.",
    "readBlog": "Read the blog"
  },
  "time": { "timezoneNote": "Times are shown in {{zone}}." }
}
common_id = {
  "appName": "Dewa Surya Hub",
  "backToHome": "Kembali ke beranda",
  "language": "Bahasa",
  "toggleTheme": "Ganti tema",
  "themeLight": "Terang", "themeDark": "Gelap", "themeSystem": "Sistem",
  "toggleSidebar": "Buka/tutup sidebar", "sidebarTitle": "Sidebar", "sidebarDescription": "Menampilkan sidebar seluler.",
  "cancel": "Batal", "back": "Kembali", "continue": "Lanjut", "confirm": "Konfirmasi", "close": "Tutup",
  "save": "Simpan", "delete": "Hapus", "edit": "Ubah", "create": "Buat", "search": "Cari", "reset": "Atur ulang",
  "loading": "Memuat…", "tryAgain": "Coba lagi", "leave": "Tinggalkan", "retry": "Ulangi", "refresh": "Muat ulang",
  "yes": "Ya", "no": "Tidak", "none": "Tidak ada", "all": "Semua", "optional": "Opsional", "actions": "Aksi",
  "unsavedChangesTitle": "Perubahan belum disimpan",
  "unsavedChangesDescription": "Ada perubahan yang belum disimpan. Jika keluar sekarang, perubahan akan hilang.",
  "searchPlaceholder": "Cari…", "clearSearch": "Hapus pencarian",
  "noDataFound": "Data tidak ditemukan", "noDataDescription": "Coba ubah filter atau kata kunci.",
  "previousPage": "Sebelumnya", "nextPage": "Berikutnya", "pageNumber": "Halaman {{page}}", "pagination": "Navigasi halaman",
  "rowsPerPage": "Baris per halaman", "paginationRange": "{{from}}–{{to}} dari {{count}}",
  "breadcrumb": "Remah roti", "moreActions": "Aksi lainnya",
  "copied": "Disalin ke papan klip", "copyFailed": "Gagal menyalin ke papan klip", "copy": "Salin",
  "traceId": "Trace ID", "errorReference": "Referensi",
  "error": {
    "title": "Terjadi kesalahan",
    "description": "Terjadi kesalahan tak terduga. Silakan coba lagi.",
    "pageDescription": "Halaman ini tidak dapat dimuat. Silakan coba lagi sebentar lagi.",
    "network": "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
    "forbidden": "Anda tidak memiliki akses ke halaman ini.",
    "notFound": "Data ini sudah tidak ada.",
    "conflict": "Terjadi konflik dengan data terbaru. Muat ulang lalu coba lagi.",
    "server": "Server mengalami masalah. Silakan coba lagi."
  },
  "toast": { "loadFailed": "Gagal memuat data", "requestFailed": "Permintaan gagal", "saved": "Tersimpan", "deleted": "Terhapus" },
  "notFound": {
    "title": "Halaman tidak ditemukan",
    "description": "Halaman yang Anda cari tidak ada atau sudah dipindahkan.",
    "readBlog": "Baca blog"
  },
  "time": { "timezoneNote": "Waktu ditampilkan dalam {{zone}}." }
}

skills_en = {
  "frontend": {"title": "Frontend engineering", "description": "Next.js and React apps that are fast, accessible, and easy to change — server components, ISR, and a design system that works in light and dark."},
  "backend": {"title": "Backend & APIs", "description": "Spring Boot and Go services with clear module boundaries, strict contracts, and idempotent payment and webhook flows."},
  "data": {"title": "Data modelling", "description": "PostgreSQL schemas with constraints that protect money and access, versioned with Flyway migrations."},
  "cloud": {"title": "Cloud & infrastructure", "description": "AWS, Cloudflare Workers, Nginx, and Terraform — production setups that stay cheap for a solo developer."},
  "security": {"title": "Security", "description": "Firebase sign-in, SSO with PKCE, signed webhooks, least-privilege roles, and no raw HTML reaching the page."},
  "craft": {"title": "Product craft", "description": "From the PRD and ADRs to the last empty state: documented decisions, tests where they matter, and polished UI."}
}
skills_id = {
  "frontend": {"title": "Rekayasa frontend", "description": "Aplikasi Next.js dan React yang cepat, aksesibel, dan mudah diubah — server components, ISR, dan design system untuk mode terang dan gelap."},
  "backend": {"title": "Backend & API", "description": "Layanan Spring Boot dan Go dengan batas modul yang jelas, kontrak yang ketat, serta alur pembayaran dan webhook yang idempoten."},
  "data": {"title": "Pemodelan data", "description": "Skema PostgreSQL dengan constraint yang menjaga uang dan akses, dikelola lewat migrasi Flyway."},
  "cloud": {"title": "Cloud & infrastruktur", "description": "AWS, Cloudflare Workers, Nginx, dan Terraform — setup produksi yang tetap hemat untuk developer tunggal."},
  "security": {"title": "Keamanan", "description": "Login Firebase, SSO dengan PKCE, webhook bertanda tangan, peran dengan hak minimum, dan tanpa HTML mentah di halaman."},
  "craft": {"title": "Kualitas produk", "description": "Dari PRD dan ADR hingga empty state terakhir: keputusan terdokumentasi, pengujian di bagian penting, dan UI yang rapi."}
}

site_en = {
  "nav": {"label": "Main", "home": "Home", "blog": "Blog", "products": "Products", "about": "About", "account": "Account", "menu": "Open menu"},
  "footer": {
    "tagline": "The home of Dewa Surya Ariesta's writing and SaaS products — one account for every app.",
    "explore": "Explore", "account": "Account", "signIn": "Sign in", "subscriptions": "Subscriptions", "transactions": "Payment history",
    "rights": "All rights reserved."
  },
  "home": {
    "metaTitle": "Dewa Surya Hub — full-stack development, articles, and SaaS products",
    "metaDescription": "Articles and tutorials by Dewa Surya Ariesta, a full-stack developer, plus the SaaS products of the Dewa Surya Hub such as Document Doctor.",
    "hero": {
      "badge": "Full-stack developer · open to work",
      "title": "I build web products end to end —",
      "highlight": "from the database to the last pixel.",
      "description": "I'm Dewa Surya Ariesta. I write about building and running real software, and I build SaaS products like Document Doctor on top of this hub.",
      "primaryCta": "Read the blog",
      "secondaryCta": "See the products",
      "stackLabel": "Everyday stack"
    },
    "latest": {"eyebrow": "Blog", "title": "Latest articles", "description": "Practical notes on web development, backend design, and cloud infrastructure.", "viewAll": "All articles", "empty": "No articles yet — the first one is on its way.", "unavailable": "Articles can't be loaded right now. Please check back soon."},
    "skills": {"eyebrow": "What I do", "title": "Full stack, for real", "description": "One developer, the whole product: interface, API, data, payments, and the infrastructure it runs on."},
    "products": {"eyebrow": "Products", "title": "Tools built on the hub", "description": "Sign in once with Google and use every product with the same account.", "viewAll": "All products", "empty": "Products are coming soon.", "unavailable": "Products can't be loaded right now. Please check back soon."},
    "cta": {"title": "Let's build something useful", "description": "Want to know more about how I work, or need a developer for your next product?", "about": "About me", "signIn": "Create your account"}
  },
  "skills": skills_en,
  "about": {
    "metaTitle": "About Dewa Surya Ariesta",
    "metaDescription": "Dewa Surya Ariesta is a full-stack developer building web products end to end: Next.js frontends, Spring Boot and Go APIs, PostgreSQL, and cloud infrastructure.",
    "eyebrow": "About",
    "title": "Hi, I'm Dewa — a full-stack developer.",
    "intro": "I design, build, and run web products end to end. I care about software that is fast for visitors, safe with money and data, and cheap enough to operate as one person.",
    "body": "This hub is where that comes together: the blog where I share what I learn, the account that signs you in to all my products, and the billing that keeps them running.",
    "contact": "Email me",
    "skillsEyebrow": "Skills",
    "facts": {
      "focus": {"label": "Focus", "value": "Full-stack web"},
      "stack": {"label": "Stack", "value": "Next.js · Spring Boot · Go"},
      "location": {"label": "Based in", "value": "Indonesia"},
      "writing": {"label": "Writes about", "value": "Web, APIs & cloud"}
    },
    "portfolioEyebrow": "Portfolio",
    "portfolioTitle": "Selected projects",
    "portfolioDescription": "Things I have designed and built from the first document to production.",
    "projects": {
      "hub": {"title": "Dewa Surya Hub", "description": "This platform: a content site, one Google account across products, subscriptions, and Midtrans payments — Next.js on Cloudflare Workers with a Spring Boot API."},
      "documentDoctor": {"title": "Document Doctor", "description": "Fix, convert, and check documents in the browser. The first product connected to the hub through SSO and entitlements."},
      "simpleBank": {"title": "Simple Bank", "description": "A ledger-based core banking demo in Go with accounts, deposits, and transfers — a study in consistent money movement."}
    },
    "approachEyebrow": "How I work",
    "approachTitle": "From idea to production",
    "approach": {
      "one": {"title": "Write it down", "description": "A short PRD and architecture decisions first, so every trade-off is explicit and reviewable."},
      "two": {"title": "Model the data", "description": "Schemas and API contracts that make invalid states impossible — especially for payments and access."},
      "three": {"title": "Build the slice", "description": "Ship thin end-to-end slices: UI, API, data, and tests together, one use case at a time."},
      "four": {"title": "Run it cheaply", "description": "Static and cached where possible, measured, and deployed with infrastructure as code."}
    }
  },
  "portal": {"navLabel": "Account", "profile": "Profile", "subscriptions": "Subscriptions", "transactions": "Payment history"},
  "adminNav": {
    "tagline": "Admin", "overview": "Overview", "dashboard": "Dashboard", "content": "Content", "articles": "Articles", "media": "Media",
    "categories": "Categories", "tags": "Tags", "business": "Business", "users": "Users", "transactions": "Transactions",
    "products": "Products & plans", "viewSite": "View site"
  }
}
site_id = {
  "nav": {"label": "Utama", "home": "Beranda", "blog": "Blog", "products": "Produk", "about": "Tentang", "account": "Akun", "menu": "Buka menu"},
  "footer": {
    "tagline": "Rumah tulisan dan produk SaaS Dewa Surya Ariesta — satu akun untuk semua aplikasi.",
    "explore": "Jelajahi", "account": "Akun", "signIn": "Masuk", "subscriptions": "Langganan", "transactions": "Riwayat pembayaran",
    "rights": "Hak cipta dilindungi."
  },
  "home": {
    "metaTitle": "Dewa Surya Hub — pengembangan full-stack, artikel, dan produk SaaS",
    "metaDescription": "Artikel dan tutorial dari Dewa Surya Ariesta, developer full-stack, serta produk SaaS di Dewa Surya Hub seperti Document Doctor.",
    "hero": {
      "badge": "Developer full-stack · terbuka untuk kerja sama",
      "title": "Saya membangun produk web dari hulu ke hilir —",
      "highlight": "dari database sampai piksel terakhir.",
      "description": "Saya Dewa Surya Ariesta. Saya menulis tentang membangun dan menjalankan software sungguhan, dan membangun produk SaaS seperti Document Doctor di atas hub ini.",
      "primaryCta": "Baca blog",
      "secondaryCta": "Lihat produk",
      "stackLabel": "Stack sehari-hari"
    },
    "latest": {"eyebrow": "Blog", "title": "Artikel terbaru", "description": "Catatan praktis tentang pengembangan web, desain backend, dan infrastruktur cloud.", "viewAll": "Semua artikel", "empty": "Belum ada artikel — yang pertama segera hadir.", "unavailable": "Artikel belum dapat dimuat. Silakan cek kembali nanti."},
    "skills": {"eyebrow": "Yang saya kerjakan", "title": "Benar-benar full stack", "description": "Satu developer, seluruh produk: antarmuka, API, data, pembayaran, dan infrastrukturnya."},
    "products": {"eyebrow": "Produk", "title": "Tools yang dibangun di atas hub", "description": "Masuk sekali dengan Google dan gunakan semua produk dengan akun yang sama.", "viewAll": "Semua produk", "empty": "Produk segera hadir.", "unavailable": "Produk belum dapat dimuat. Silakan cek kembali nanti."},
    "cta": {"title": "Mari membangun sesuatu yang berguna", "description": "Ingin tahu cara saya bekerja, atau butuh developer untuk produk Anda berikutnya?", "about": "Tentang saya", "signIn": "Buat akun Anda"}
  },
  "skills": skills_id,
  "about": {
    "metaTitle": "Tentang Dewa Surya Ariesta",
    "metaDescription": "Dewa Surya Ariesta adalah developer full-stack yang membangun produk web dari hulu ke hilir: frontend Next.js, API Spring Boot dan Go, PostgreSQL, dan infrastruktur cloud.",
    "eyebrow": "Tentang",
    "title": "Halo, saya Dewa — developer full-stack.",
    "intro": "Saya merancang, membangun, dan menjalankan produk web dari awal sampai akhir. Saya peduli pada software yang cepat bagi pengunjung, aman untuk uang dan data, dan cukup hemat untuk dijalankan sendiri.",
    "body": "Hub ini tempat semuanya bertemu: blog tempat saya berbagi pelajaran, akun yang membuat Anda masuk ke semua produk saya, dan penagihan yang menjaga semuanya tetap berjalan.",
    "contact": "Kirim email",
    "skillsEyebrow": "Keahlian",
    "facts": {
      "focus": {"label": "Fokus", "value": "Web full-stack"},
      "stack": {"label": "Stack", "value": "Next.js · Spring Boot · Go"},
      "location": {"label": "Berbasis di", "value": "Indonesia"},
      "writing": {"label": "Menulis tentang", "value": "Web, API & cloud"}
    },
    "portfolioEyebrow": "Portofolio",
    "portfolioTitle": "Proyek pilihan",
    "portfolioDescription": "Hal-hal yang saya rancang dan bangun dari dokumen pertama sampai produksi.",
    "projects": {
      "hub": {"title": "Dewa Surya Hub", "description": "Platform ini: situs konten, satu akun Google untuk semua produk, langganan, dan pembayaran Midtrans — Next.js di Cloudflare Workers dengan API Spring Boot."},
      "documentDoctor": {"title": "Document Doctor", "description": "Perbaiki, konversi, dan periksa dokumen di browser. Produk pertama yang terhubung ke hub lewat SSO dan entitlement."},
      "simpleBank": {"title": "Simple Bank", "description": "Demo core banking berbasis ledger dengan Go: akun, setoran, dan transfer — studi tentang perpindahan uang yang konsisten."}
    },
    "approachEyebrow": "Cara saya bekerja",
    "approachTitle": "Dari ide ke produksi",
    "approach": {
      "one": {"title": "Tulis dulu", "description": "PRD singkat dan keputusan arsitektur lebih dulu, agar setiap kompromi jelas dan bisa ditinjau."},
      "two": {"title": "Modelkan datanya", "description": "Skema dan kontrak API yang membuat keadaan tidak valid mustahil — terutama untuk pembayaran dan akses."},
      "three": {"title": "Bangun per irisan", "description": "Kirim irisan tipis end-to-end: UI, API, data, dan tes bersama, satu use case setiap kali."},
      "four": {"title": "Jalankan dengan hemat", "description": "Statis dan ter-cache sebisa mungkin, terukur, dan di-deploy dengan infrastructure as code."}
    }
  },
  "portal": {"navLabel": "Akun", "profile": "Profil", "subscriptions": "Langganan", "transactions": "Riwayat pembayaran"},
  "adminNav": {
    "tagline": "Admin", "overview": "Ringkasan", "dashboard": "Dasbor", "content": "Konten", "articles": "Artikel", "media": "Media",
    "categories": "Kategori", "tags": "Tag", "business": "Bisnis", "users": "Pengguna", "transactions": "Transaksi",
    "products": "Produk & paket", "viewSite": "Lihat situs"
  }
}

content_en = {
  "blog": {
    "metaTitle": "Blog", "metaTitlePage": "Blog — page {{page}}", "pageSuffix": "page {{page}}",
    "metaDescription": "Articles and tutorials by Dewa Surya Ariesta on web development, backend engineering, and cloud infrastructure.",
    "eyebrow": "Articles & tutorials", "title": "Blog",
    "description": "Practical, tested notes on building and running web products.",
    "all": "All", "categories": "Categories",
    "empty": "No articles yet", "emptyDescription": "New articles will appear here as soon as they are published.",
    "unavailable": "Articles can't be loaded right now. Please try again in a moment.",
    "backToBlog": "Back to the blog"
  },
  "category": {
    "label": "Category", "metaTitle": "{{name}} articles",
    "metaDescription_one": "{{count}} article about {{name}} by Dewa Surya Ariesta.",
    "metaDescription_other": "{{count}} articles about {{name}} by Dewa Surya Ariesta.",
    "count_one": "{{count}} article", "count_other": "{{count}} articles",
    "empty": "No articles in this category yet", "emptyDescription": "Check back soon, or browse all articles."
  },
  "tag": {
    "label": "Tag", "metaTitle": "Articles tagged {{name}}",
    "metaDescription_one": "{{count}} article tagged {{name}} by Dewa Surya Ariesta.",
    "metaDescription_other": "{{count}} articles tagged {{name}} by Dewa Surya Ariesta.",
    "count_one": "{{count}} article", "count_other": "{{count}} articles",
    "empty": "No articles with this tag yet", "emptyDescription": "Check back soon, or browse all articles."
  },
  "article": {
    "breadcrumb": "Breadcrumb", "readingTime_one": "{{count}} min read", "readingTime_other": "{{count}} min read",
    "updated": "Updated", "onThisPage": "On this page", "tags": "Tags", "related": "Related articles"
  },
  "body": {
    "copy": "Copy", "copied": "Copied", "codeLanguage": "Language", "plainText": "Plain text",
    "loadEmbed": "Load {{provider}}", "embedNotice": "Click to load {{provider}}",
    "opensInNewTab": "(opens in a new tab)",
    "callout": {"info": "Note", "tip": "Tip", "warning": "Warning", "danger": "Danger"},
    "headingAnchor": "Link to this section", "advertisement": "Advertisement",
    "taskDone": "Done", "taskTodo": "To do"
  }
}
content_id = {
  "blog": {
    "metaTitle": "Blog", "metaTitlePage": "Blog — halaman {{page}}", "pageSuffix": "halaman {{page}}",
    "metaDescription": "Artikel dan tutorial dari Dewa Surya Ariesta tentang pengembangan web, rekayasa backend, dan infrastruktur cloud.",
    "eyebrow": "Artikel & tutorial", "title": "Blog",
    "description": "Catatan praktis yang sudah diuji tentang membangun dan menjalankan produk web.",
    "all": "Semua", "categories": "Kategori",
    "empty": "Belum ada artikel", "emptyDescription": "Artikel baru akan muncul di sini segera setelah terbit.",
    "unavailable": "Artikel belum dapat dimuat. Silakan coba lagi sebentar lagi.",
    "backToBlog": "Kembali ke blog"
  },
  "category": {
    "label": "Kategori", "metaTitle": "Artikel {{name}}",
    "metaDescription_one": "{{count}} artikel tentang {{name}} oleh Dewa Surya Ariesta.",
    "metaDescription_other": "{{count}} artikel tentang {{name}} oleh Dewa Surya Ariesta.",
    "count_one": "{{count}} artikel", "count_other": "{{count}} artikel",
    "empty": "Belum ada artikel di kategori ini", "emptyDescription": "Cek lagi nanti, atau lihat semua artikel."
  },
  "tag": {
    "label": "Tag", "metaTitle": "Artikel dengan tag {{name}}",
    "metaDescription_one": "{{count}} artikel dengan tag {{name}} oleh Dewa Surya Ariesta.",
    "metaDescription_other": "{{count}} artikel dengan tag {{name}} oleh Dewa Surya Ariesta.",
    "count_one": "{{count}} artikel", "count_other": "{{count}} artikel",
    "empty": "Belum ada artikel dengan tag ini", "emptyDescription": "Cek lagi nanti, atau lihat semua artikel."
  },
  "article": {
    "breadcrumb": "Remah roti", "readingTime_one": "{{count}} menit baca", "readingTime_other": "{{count}} menit baca",
    "updated": "Diperbarui", "onThisPage": "Di halaman ini", "tags": "Tag", "related": "Artikel terkait"
  },
  "body": {
    "copy": "Salin", "copied": "Tersalin", "codeLanguage": "Bahasa", "plainText": "Teks biasa",
    "loadEmbed": "Muat {{provider}}", "embedNotice": "Klik untuk memuat {{provider}}",
    "opensInNewTab": "(terbuka di tab baru)",
    "callout": {"info": "Catatan", "tip": "Tips", "warning": "Peringatan", "danger": "Bahaya"},
    "headingAnchor": "Tautan ke bagian ini", "advertisement": "Iklan",
    "taskDone": "Selesai", "taskTodo": "Belum"
  }
}

product_en = {
  "price": {"free": "Free", "perMonth": "/ month", "perYear": "/ year"},
  "period": {"monthly": "Monthly", "yearly": "Yearly", "free": "Free"},
  "plan": {"oneTime": "One-time payment, no automatic renewal", "buy": "Buy", "useFree": "Use for free", "popular": "Recommended"},
  "features": {"removeAds": "No ads"},
  "card": {"learnMore": "Learn more", "getStarted": "Get started", "details": "Details", "from": "Paid plans from", "plans_one": "{{count}} plan", "plans_other": "{{count}} plans"},
  "list": {
    "metaTitle": "Products", "metaDescription": "SaaS products by Dewa Surya Ariesta. One Google account for all of them; pay once per period with QRIS, e-wallet, bank transfer, or card.",
    "eyebrow": "Products", "title": "Products", "description": "Tools built on the hub. Sign in once and use them all with the same account.",
    "empty": "No products are available yet.", "unavailable": "Products can't be loaded right now. Please try again in a moment."
  },
  "detail": {
    "breadcrumb": "Breadcrumb", "plansTitle": "Plans", "plansDescription": "Prices are in Indonesian rupiah. Each payment buys one period.", "noPlans": "There are no public plans for this product yet.",
    "points": {
      "oneTime": {"title": "Pay once per period", "description": "No card on file and no automatic charge — renew only when you want to."},
      "secure": {"title": "Secure checkout", "description": "Payments run through Midtrans. Access starts only after the payment is confirmed."},
      "sso": {"title": "One account", "description": "Sign in with Google on the hub and use the same account in every product."}
    }
  }
}
product_id = {
  "price": {"free": "Gratis", "perMonth": "/ bulan", "perYear": "/ tahun"},
  "period": {"monthly": "Bulanan", "yearly": "Tahunan", "free": "Gratis"},
  "plan": {"oneTime": "Sekali bayar, tanpa perpanjangan otomatis", "buy": "Beli", "useFree": "Pakai gratis", "popular": "Rekomendasi"},
  "features": {"removeAds": "Tanpa iklan"},
  "card": {"learnMore": "Pelajari", "getStarted": "Mulai", "details": "Detail", "from": "Paket berbayar mulai", "plans_one": "{{count}} paket", "plans_other": "{{count}} paket"},
  "list": {
    "metaTitle": "Produk", "metaDescription": "Produk SaaS dari Dewa Surya Ariesta. Satu akun Google untuk semuanya; bayar sekali per periode dengan QRIS, e-wallet, transfer bank, atau kartu.",
    "eyebrow": "Produk", "title": "Produk", "description": "Tools yang dibangun di atas hub. Masuk sekali dan gunakan semuanya dengan akun yang sama.",
    "empty": "Belum ada produk yang tersedia.", "unavailable": "Produk belum dapat dimuat. Silakan coba lagi sebentar lagi."
  },
  "detail": {
    "breadcrumb": "Remah roti", "plansTitle": "Paket", "plansDescription": "Harga dalam rupiah. Setiap pembayaran berlaku untuk satu periode.", "noPlans": "Belum ada paket publik untuk produk ini.",
    "points": {
      "oneTime": {"title": "Bayar sekali per periode", "description": "Tanpa menyimpan kartu dan tanpa tagihan otomatis — perpanjang hanya saat Anda mau."},
      "secure": {"title": "Pembayaran aman", "description": "Pembayaran diproses Midtrans. Akses aktif hanya setelah pembayaran terkonfirmasi."},
      "sso": {"title": "Satu akun", "description": "Masuk dengan Google di hub dan gunakan akun yang sama di setiap produk."}
    }
  }
}

auth_en = {
  "loginMetaTitle": "Sign in", "loginMetaDescription": "Sign in to Dewa Surya Hub with your Google account. The first sign-in creates your account.",
  "loginTitle": "Sign in to Dewa Surya Hub", "loginDescription": "Use your Google account. If this is your first time, we'll create your account.",
  "continueWithGoogle": "Continue with Google",
  "benefitOneAccount": "One account for the hub and every connected product.",
  "benefitNoPassword": "No password to remember — Google keeps your account safe.",
  "termsNotice": "Your profile comes from your Google account.", "aboutLink": "About the hub",
  "notConfigured": "Sign-in is not configured", "notConfiguredDescription": "Set the NEXT_PUBLIC_FIREBASE_* environment variables to enable Google sign-in.",
  "signInFailed": "Sign-in failed. Please try again.", "sessionRejected": "Your sign-in could not be verified. Please sign in again.",
  "signIn": "Sign in", "signOut": "Sign out", "signingOut": "Signing you out…",
  "signedOutTitle": "You're signed out", "signedOutDescription": "See you next time.",
  "sessionExpiredTitle": "Your session has ended", "sessionExpiredDescription": "Please sign in again to continue.",
  "signInAgain": "Sign in again", "backHome": "Back to home",
  "accountMenu": "Account menu", "profile": "Profile", "subscriptions": "Subscriptions", "transactions": "Payment history", "adminDashboard": "Admin dashboard",
  "forbiddenTitle": "No access", "forbiddenDescription": "This area is for administrators only. If you think this is a mistake, contact the site owner.",
  "goToAccount": "Go to my account",
  "sessionErrorTitle": "We couldn't load your account", "sessionErrorDescription": "You're signed in with Google, but the hub didn't respond. Please try again.",
  "account": {
    "metaTitle": "My profile", "title": "Profile", "description": "Your profile comes from your Google account and is read-only here.",
    "googleNotice": "To change your name or photo, update your Google account. Changes appear after your next sign-in.",
    "editInGoogle": "Manage Google account", "email": "Email", "memberSince": "Member since", "lastSignIn": "Last sign-in", "role": "Role",
    "roles": {"USER": "User", "ADMIN": "Administrator"},
    "products": "Joined products", "productsDescription": "Products you have signed in to with this account.",
    "noProducts": "You haven't joined any products yet.", "browseProducts": "Browse products", "joinedOn": "Joined {{date}}",
    "loadFailed": "Your profile could not be loaded."
  },
  "sso": {
    "metaTitle": "Signing you in", "title": "Signing you in", "checking": "Checking the request…", "signingIn": "Sign in to continue to the product",
    "redirecting": "Taking you back…", "continueTo": "Continue to {{host}}",
    "invalidTitle": "This sign-in link is not valid", "invalidDescription": "The app that sent you here built an invalid request. Go back and try again.",
    "rejectedTitle": "Sign-in was not allowed", "rejectedDescription": "The app is not registered for this redirect address, or it is inactive.",
    "failedTitle": "Something went wrong", "failedDescription": "We couldn't finish signing you in. Please try again.",
    "reasons": {
      "missing_client_id": "client_id is missing.", "missing_redirect_uri": "redirect_uri is missing.", "invalid_redirect_uri": "redirect_uri is not a valid HTTPS URL.",
      "missing_state": "state is missing.", "missing_code_challenge": "code_challenge is missing.", "invalid_code_challenge": "code_challenge must be a base64url S256 value.",
      "unsupported_code_challenge_method": "Only code_challenge_method=S256 is supported.", "unsupported_response_type": "Only response_type=code is supported."
    },
    "signedInAs": "Signed in as {{email}}", "useAnother": "Use another account"
  }
}
auth_id = {
  "loginMetaTitle": "Masuk", "loginMetaDescription": "Masuk ke Dewa Surya Hub dengan akun Google Anda. Login pertama akan membuat akun Anda.",
  "loginTitle": "Masuk ke Dewa Surya Hub", "loginDescription": "Gunakan akun Google Anda. Jika ini pertama kali, kami akan membuatkan akun.",
  "continueWithGoogle": "Lanjutkan dengan Google",
  "benefitOneAccount": "Satu akun untuk hub dan semua produk yang terhubung.",
  "benefitNoPassword": "Tanpa kata sandi — Google menjaga keamanan akun Anda.",
  "termsNotice": "Profil Anda berasal dari akun Google Anda.", "aboutLink": "Tentang hub",
  "notConfigured": "Login belum dikonfigurasi", "notConfiguredDescription": "Isi variabel lingkungan NEXT_PUBLIC_FIREBASE_* untuk mengaktifkan login Google.",
  "signInFailed": "Gagal masuk. Silakan coba lagi.", "sessionRejected": "Login Anda tidak dapat diverifikasi. Silakan masuk kembali.",
  "signIn": "Masuk", "signOut": "Keluar", "signingOut": "Sedang keluar…",
  "signedOutTitle": "Anda sudah keluar", "signedOutDescription": "Sampai jumpa lagi.",
  "sessionExpiredTitle": "Sesi Anda telah berakhir", "sessionExpiredDescription": "Silakan masuk kembali untuk melanjutkan.",
  "signInAgain": "Masuk kembali", "backHome": "Kembali ke beranda",
  "accountMenu": "Menu akun", "profile": "Profil", "subscriptions": "Langganan", "transactions": "Riwayat pembayaran", "adminDashboard": "Dasbor admin",
  "forbiddenTitle": "Tidak ada akses", "forbiddenDescription": "Area ini khusus administrator. Jika menurut Anda ini keliru, hubungi pemilik situs.",
  "goToAccount": "Ke akun saya",
  "sessionErrorTitle": "Akun Anda tidak dapat dimuat", "sessionErrorDescription": "Anda sudah masuk dengan Google, tetapi hub tidak merespons. Silakan coba lagi.",
  "account": {
    "metaTitle": "Profil saya", "title": "Profil", "description": "Profil Anda berasal dari akun Google dan hanya dapat dibaca di sini.",
    "googleNotice": "Untuk mengubah nama atau foto, perbarui akun Google Anda. Perubahan muncul setelah Anda masuk kembali.",
    "editInGoogle": "Kelola akun Google", "email": "Email", "memberSince": "Anggota sejak", "lastSignIn": "Terakhir masuk", "role": "Peran",
    "roles": {"USER": "Pengguna", "ADMIN": "Administrator"},
    "products": "Produk yang diikuti", "productsDescription": "Produk yang pernah Anda masuki dengan akun ini.",
    "noProducts": "Anda belum bergabung dengan produk apa pun.", "browseProducts": "Lihat produk", "joinedOn": "Bergabung {{date}}",
    "loadFailed": "Profil Anda tidak dapat dimuat."
  },
  "sso": {
    "metaTitle": "Sedang memasukkan Anda", "title": "Sedang memasukkan Anda", "checking": "Memeriksa permintaan…", "signingIn": "Masuk untuk melanjutkan ke produk",
    "redirecting": "Mengembalikan Anda…", "continueTo": "Lanjut ke {{host}}",
    "invalidTitle": "Tautan login ini tidak valid", "invalidDescription": "Aplikasi yang mengarahkan Anda membuat permintaan yang tidak valid. Kembali dan coba lagi.",
    "rejectedTitle": "Login tidak diizinkan", "rejectedDescription": "Aplikasi tidak terdaftar untuk alamat pengalihan ini, atau sedang tidak aktif.",
    "failedTitle": "Terjadi kesalahan", "failedDescription": "Kami tidak dapat menyelesaikan proses masuk. Silakan coba lagi.",
    "reasons": {
      "missing_client_id": "client_id tidak ada.", "missing_redirect_uri": "redirect_uri tidak ada.", "invalid_redirect_uri": "redirect_uri bukan URL HTTPS yang valid.",
      "missing_state": "state tidak ada.", "missing_code_challenge": "code_challenge tidak ada.", "invalid_code_challenge": "code_challenge harus berupa nilai S256 base64url.",
      "unsupported_code_challenge_method": "Hanya code_challenge_method=S256 yang didukung.", "unsupported_response_type": "Hanya response_type=code yang didukung."
    },
    "signedInAs": "Masuk sebagai {{email}}", "useAnother": "Gunakan akun lain"
  }
}

for ns, en, id_ in (("common", common_en, common_id), ("site", site_en, site_id), ("content", content_en, content_id), ("product", product_en, product_id), ("auth", auth_en, auth_id)):
    m = check_same_keys(en, id_) + check_same_keys(id_, en)
    assert not m, (ns, m)
    write(ns, en, id_)
print("ok")
