from messages_base import write, check_same_keys
en = {
  "status": {"PENDING": "Pending", "PAID": "Paid", "FAILED": "Failed", "REFUNDED": "Refunded"},
  "subscriptionStatus": {"ACTIVE": "Active", "EXPIRED": "Expired", "CANCELLED": "Cancelled"},
  "method": {"QRIS": "QRIS", "BANK_TRANSFER": "Bank transfer", "GOPAY": "GoPay", "SHOPEEPAY": "ShopeePay", "CREDIT_CARD": "Card", "OTHER": "Other"},
  "transactions": {
    "title": "Payment history", "description": "Every payment you have made on the hub, newest first.",
    "filterStatus": "Filter by status", "allStatuses": "All statuses",
    "empty": "No payments yet", "emptyDescription": "When you buy a plan, the payment shows up here.", "browseProducts": "Browse products",
    "date": "Date", "product": "Product", "plan": "Plan", "amount": "Amount", "method": "Method", "status": "Status"
  },
  "detail": {
    "title": "Payment details", "summary": "Summary", "orderId": "Order ID", "copyOrderId": "Copy order ID",
    "createdAt": "Created", "paidAt": "Paid",
    "pendingTitle": "Waiting for payment", "pendingDescription": "Finish the payment in Midtrans. This page updates once Midtrans confirms it.",
    "pendingExpired": "The payment window has closed. If you paid, the status will update shortly; otherwise it will expire.",
    "failed": "Payment failed", "refunded": "This payment was refunded, and access for it has ended."
  },
  "checkout": {
    "title": "Checkout", "renewTitle": "Renew subscription",
    "period": "Access period", "price": "Price", "total": "Total",
    "oneTimeNotice": "One-time payment, no automatic renewal. Access starts once the payment is confirmed.",
    "pay": "Pay with Midtrans", "securedBy": "Payments are processed securely by Midtrans.",
    "freePlan": "Free plans don't need a payment.",
    "snapNotConfigured": "Midtrans is not configured (NEXT_PUBLIC_MIDTRANS_CLIENT_KEY). The hosted payment page will open instead.",
    "planUnavailableTitle": "This plan isn't available", "planUnavailableDescription": "It may no longer be sold. Choose another plan of the product.", "choosePlan": "Choose a plan",
    "errors": {
      "network": "Can't reach the server. Check your connection and try again.",
      "notFound": "This plan no longer exists.",
      "conflict": "This plan can't be bought right now.",
      "upstream": "Payment could not be started, please try again.",
      "generic": "Checkout failed. Please try again."
    },
    "processingTitle": "Payment processing", "processingDescription": "We're waiting for Midtrans to confirm your payment. This usually takes a few seconds.",
    "pendingTitle": "Waiting for your payment", "pendingDescription": "We haven't received a confirmation yet. Complete the payment and this page will update.",
    "instructions": {
      "qris": "Scan the QRIS code in the Midtrans window with your banking or e-wallet app.",
      "va": "Transfer the exact amount to the virtual account number shown by Midtrans.",
      "generic": "Complete the payment in the Midtrans window.",
      "keepPage": "Keep this page open, or come back later — the status updates automatically.",
      "history": "You can always find this payment in your payment history."
    },
    "reopenPayment": "Reopen payment", "openInstructions": "Open payment instructions", "checkAgain": "Check again", "viewTransaction": "View payment",
    "successTitle": "Payment confirmed", "successDescription": "{{product}} {{plan}} is now active on your account.",
    "viewSubscriptions": "View my subscriptions", "backToProduct": "Back to {{product}}",
    "failedTitle": "Payment failed", "failedDescription": "The payment was declined, cancelled, or expired. You were not charged for this order.",
    "tryAgain": "Try again", "viewHistory": "Payment history",
    "howItWorksTitle": "How it works",
    "howItWorks": {"one": "Confirm the plan and open the Midtrans payment window.", "two": "Pay with QRIS, virtual account, e-wallet, or card.", "three": "Access starts as soon as Midtrans confirms the payment."},
    "orderId": "Order ID"
  },
  "subscriptions": {
    "title": "Subscriptions", "description": "Your access to each product. Renew any time — early renewals never lose paid days.",
    "empty": "No subscriptions yet", "emptyDescription": "Pick a plan to unlock paid features in a product.", "browseProducts": "Browse products",
    "activeUntil": "Active until {{date}}", "endedOn": "Ended on {{date}}",
    "daysLeft_one": "{{count}} day left", "daysLeft_other": "{{count}} days left",
    "renew": "Renew", "buyAgain": "Buy again", "choosePlan": "Choose another plan", "planRetired": "This plan is no longer sold."
  }
}
id_ = {
  "status": {"PENDING": "Menunggu", "PAID": "Lunas", "FAILED": "Gagal", "REFUNDED": "Dikembalikan"},
  "subscriptionStatus": {"ACTIVE": "Aktif", "EXPIRED": "Berakhir", "CANCELLED": "Dibatalkan"},
  "method": {"QRIS": "QRIS", "BANK_TRANSFER": "Transfer bank", "GOPAY": "GoPay", "SHOPEEPAY": "ShopeePay", "CREDIT_CARD": "Kartu", "OTHER": "Lainnya"},
  "transactions": {
    "title": "Riwayat pembayaran", "description": "Semua pembayaran Anda di hub, dari yang terbaru.",
    "filterStatus": "Filter status", "allStatuses": "Semua status",
    "empty": "Belum ada pembayaran", "emptyDescription": "Saat Anda membeli paket, pembayarannya muncul di sini.", "browseProducts": "Lihat produk",
    "date": "Tanggal", "product": "Produk", "plan": "Paket", "amount": "Jumlah", "method": "Metode", "status": "Status"
  },
  "detail": {
    "title": "Detail pembayaran", "summary": "Ringkasan", "orderId": "ID pesanan", "copyOrderId": "Salin ID pesanan",
    "createdAt": "Dibuat", "paidAt": "Dibayar",
    "pendingTitle": "Menunggu pembayaran", "pendingDescription": "Selesaikan pembayaran di Midtrans. Halaman ini diperbarui setelah Midtrans mengonfirmasi.",
    "pendingExpired": "Waktu pembayaran sudah habis. Jika Anda sudah membayar, status akan segera diperbarui; jika belum, transaksi akan kedaluwarsa.",
    "failed": "Pembayaran gagal", "refunded": "Pembayaran ini sudah dikembalikan, dan akses untuk pembayaran ini telah berakhir."
  },
  "checkout": {
    "title": "Checkout", "renewTitle": "Perpanjang langganan",
    "period": "Masa akses", "price": "Harga", "total": "Total",
    "oneTimeNotice": "Sekali bayar, tanpa perpanjangan otomatis. Akses aktif setelah pembayaran terkonfirmasi.",
    "pay": "Bayar dengan Midtrans", "securedBy": "Pembayaran diproses dengan aman oleh Midtrans.",
    "freePlan": "Paket gratis tidak memerlukan pembayaran.",
    "snapNotConfigured": "Midtrans belum dikonfigurasi (NEXT_PUBLIC_MIDTRANS_CLIENT_KEY). Halaman pembayaran Midtrans akan dibuka sebagai gantinya.",
    "planUnavailableTitle": "Paket ini tidak tersedia", "planUnavailableDescription": "Paket mungkin sudah tidak dijual. Pilih paket lain dari produk ini.", "choosePlan": "Pilih paket",
    "errors": {
      "network": "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
      "notFound": "Paket ini sudah tidak ada.",
      "conflict": "Paket ini tidak dapat dibeli saat ini.",
      "upstream": "Pembayaran tidak dapat dimulai, silakan coba lagi.",
      "generic": "Checkout gagal. Silakan coba lagi."
    },
    "processingTitle": "Pembayaran diproses", "processingDescription": "Kami menunggu konfirmasi dari Midtrans. Biasanya hanya beberapa detik.",
    "pendingTitle": "Menunggu pembayaran Anda", "pendingDescription": "Kami belum menerima konfirmasi. Selesaikan pembayaran dan halaman ini akan diperbarui.",
    "instructions": {
      "qris": "Pindai kode QRIS di jendela Midtrans dengan aplikasi bank atau e-wallet Anda.",
      "va": "Transfer jumlah yang tepat ke nomor virtual account yang ditampilkan Midtrans.",
      "generic": "Selesaikan pembayaran di jendela Midtrans.",
      "keepPage": "Biarkan halaman ini terbuka, atau kembali nanti — status diperbarui otomatis.",
      "history": "Pembayaran ini selalu dapat dilihat di riwayat pembayaran."
    },
    "reopenPayment": "Buka pembayaran lagi", "openInstructions": "Buka instruksi pembayaran", "checkAgain": "Periksa lagi", "viewTransaction": "Lihat pembayaran",
    "successTitle": "Pembayaran terkonfirmasi", "successDescription": "{{product}} {{plan}} sekarang aktif di akun Anda.",
    "viewSubscriptions": "Lihat langganan saya", "backToProduct": "Kembali ke {{product}}",
    "failedTitle": "Pembayaran gagal", "failedDescription": "Pembayaran ditolak, dibatalkan, atau kedaluwarsa. Anda tidak ditagih untuk pesanan ini.",
    "tryAgain": "Coba lagi", "viewHistory": "Riwayat pembayaran",
    "howItWorksTitle": "Cara kerjanya",
    "howItWorks": {"one": "Konfirmasi paket lalu buka jendela pembayaran Midtrans.", "two": "Bayar dengan QRIS, virtual account, e-wallet, atau kartu.", "three": "Akses aktif segera setelah Midtrans mengonfirmasi pembayaran."},
    "orderId": "ID pesanan"
  },
  "subscriptions": {
    "title": "Langganan", "description": "Akses Anda ke setiap produk. Perpanjang kapan saja — perpanjangan lebih awal tidak menghilangkan hari yang sudah dibayar.",
    "empty": "Belum ada langganan", "emptyDescription": "Pilih paket untuk membuka fitur berbayar di sebuah produk.", "browseProducts": "Lihat produk",
    "activeUntil": "Aktif sampai {{date}}", "endedOn": "Berakhir pada {{date}}",
    "daysLeft_one": "{{count}} hari lagi", "daysLeft_other": "{{count}} hari lagi",
    "renew": "Perpanjang", "buyAgain": "Beli lagi", "choosePlan": "Pilih paket lain", "planRetired": "Paket ini sudah tidak dijual."
  }
}
m = check_same_keys(en, id_) + check_same_keys(id_, en)
assert not m, m
write("billing", en, id_)
print("ok")
