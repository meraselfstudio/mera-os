import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def create_hause_sop_docx(filename):
    doc = docx.Document()

    # Page setup - standard A4 margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.6)
        section.bottom_margin = Inches(0.6)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)

    MAROON = RGBColor(98, 33, 40)
    DARK_TEXT = RGBColor(46, 27, 31)
    MUTED_TEXT = RGBColor(90, 90, 90)

    # ── Header Table (Title + Logo) ──────────────────────────────────
    header_table = doc.add_table(rows=1, cols=2)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_table.autofit = False

    cell_left = header_table.cell(0, 0)
    cell_right = header_table.cell(0, 1)

    cell_left.width = Inches(5.0)
    cell_right.width = Inches(1.8)

    # Left cell content
    p_title = cell_left.paragraphs[0]
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run("Standart Operational Procedure")
    run_title.font.name = 'Arial'
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = MAROON

    p_sub = cell_left.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(0)
    run_sub = p_sub.add_run("Méra Hause — Cafe & Barista Operational Procedure")
    run_sub.font.name = 'Arial'
    run_sub.font.size = Pt(11)
    run_sub.font.bold = True
    run_sub.font.color.rgb = DARK_TEXT

    # Right cell logo
    p_logo = cell_right.paragraphs[0]
    p_logo.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    logo_path = "/Users/mac2019/méra-os/apps/customer-portal/public/mera-logo-maroon.png"
    if os.path.exists(logo_path):
        p_logo.add_run().add_picture(logo_path, height=Inches(0.65))

    # Add divider line
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(6)
    p_div.paragraph_format.space_after = Pt(10)
    p_div_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="18" w:space="1" w:color="622128"/></w:pBdr>')
    p_div._p.get_or_add_pPr().append(p_div_border)

    def add_principle_box(title, text):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.8)
        
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="622128"/>')
        cell._tc.get_or_add_tcPr().append(shd)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.left_indent = Inches(0.1)
        p.paragraph_format.right_indent = Inches(0.1)
        
        run_t = p.add_run(f"{title}\n")
        run_t.font.name = 'Arial'
        run_t.font.size = Pt(10.5)
        run_t.font.bold = True
        run_t.font.color.rgb = RGBColor(255, 218, 224)

        run_body = p.add_run(text)
        run_body.font.name = 'Arial'
        run_body.font.size = Pt(9.5)
        run_body.font.color.rgb = RGBColor(255, 255, 255)

        p_spacer = doc.add_paragraph()
        p_spacer.paragraph_format.space_before = Pt(0)
        p_spacer.paragraph_format.space_after = Pt(6)

    def add_section_header(title, subtitle):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.8)
        
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="622128"/>')
        cell._tc.get_or_add_tcPr().append(shd)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.left_indent = Inches(0.1)
        run = p.add_run(title)
        run.font.name = 'Arial'
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_before = Pt(2)
        p_sub.paragraph_format.space_after = Pt(10)
        run_sub = p_sub.add_run(subtitle)
        run_sub.font.name = 'Arial'
        run_sub.font.size = Pt(9.5)
        run_sub.font.italic = True
        run_sub.font.color.rgb = MUTED_TEXT

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = MAROON
        
        p_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="E5DADA"/></w:pBdr>')
        p._p.get_or_add_pPr().append(p_border)

    def add_callout(title, text):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.8)
        
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="FCF6F6"/>')
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="622128"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
        cell._tc.get_or_add_tcPr().append(shd)
        cell._tc.get_or_add_tcPr().append(borders)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.left_indent = Inches(0.1)
        p.paragraph_format.right_indent = Inches(0.1)
        
        run_t = p.add_run(f"{title}: ")
        run_t.font.name = 'Arial'
        run_t.font.size = Pt(9.5)
        run_t.font.bold = True
        run_t.font.color.rgb = MAROON

        run_body = p.add_run(text)
        run_body.font.name = 'Arial'
        run_body.font.size = Pt(9.5)
        run_body.font.color.rgb = DARK_TEXT

        p_spacer = doc.add_paragraph()
        p_spacer.paragraph_format.space_before = Pt(0)
        p_spacer.paragraph_format.space_after = Pt(4)

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(3)
        if bold_prefix:
            run_b = p.add_run(bold_prefix + " ")
            run_b.font.name = 'Arial'
            run_b.font.size = Pt(10)
            run_b.font.bold = True
            run_b.font.color.rgb = DARK_TEXT
        run_t = p.add_run(text)
        run_t.font.name = 'Arial'
        run_t.font.size = Pt(9.5)
        run_t.font.color.rgb = DARK_TEXT

    # ── Principle Box ────────────────────────────────────────────────
    add_principle_box(
        "PRINSIP UTAMA: ATTENTION TO DETAIL, HIGIENITAS & KONSISTENSI RASA",
        "Setiap kru barista Méra Hause WAJIB memiliki kepekaan tinggi (Attention to Detail) terhadap kebersihan area bar, higienitas bahan baku, konsistensi rasa minuman, serta keramahan pelayanan. Jika melihat cangkir kotor, meja berantakan, tetesan susu, atau asbak penuh, WAJIB LANGSUNG DIBERSIHKAN tanpa menunda atau menunggu diperintah."
    )

    # ── BAGIAN 1: OPENING ─────────────────────────────────────────────
    add_section_header("OPENING (KEDATANGAN & PERSIAPAN CAFE / BAR)", "Kesan pertama cafe yang wangi, higienis, rapi, dan siap melayani dibangun sebelum jam operasional dimulai.")

    add_h3("1. Waktu Kedatangan & Ketentuan Shift Kru (Nona, Izza & Bhagas)")
    add_bullet("Jam Operasional Cafe:", "Pukul 12.00 – 23.00 WIB setiap hari.")
    add_bullet("Shift 1 (11.00 – 20.00 WIB):", "Kru wajib hadir di cafe pukul 11.00 WIB (1 jam sebelum buka untuk persiapan bar). Base rate: Rp 50.000 / shift.")
    add_bullet("Shift 2 (15.00 – 23.00 WIB):", "Kru wajib hadir di cafe pukul 15.00 WIB tepat. Base rate: Rp 50.000 / shift.")
    add_bullet("Full Time / Solo (11.00 – 23.00 WIB):", "Jika hanya 1 orang bertugas seharian, wajib hadir pukul 11.00 WIB. Base rate: Rp 100.000 / hari.")

    add_h3("2. Standar Penampilan & Higienitas Barista")
    add_bullet("Pakaian & Seragam:", "Berpakaian rapi, sopan, bersih, dan berpenampilan estetis. Wajib memakai apron barista bersih dan sepatu tertutup.")
    add_bullet("Higienitas Pribadi:", "Kuku tangan dipotong pendek dan bersih. Rambut diikat rapi / hijab tertata rapi. Wajib memakai deodorant dan parfum beraroma lembut/segar.")
    add_bullet("Cuci Tangan Berkala:", "Wajib mencuci tangan dengan sabun handwash sebelum memegang bahan makanan, buah, atau peralatan bar.")

    add_h3("3. Prosedur Absensi Masuk (Clock-In) & Ketentuan Denda")
    add_bullet("Langkah Clock-In:", "Buka sistem POS Dashboard (os.meraselfstudio.com) di iMac / tablet POS, masuk ke menu Presensi / Backoffice. Pilih nama (Nona, Izza, atau Bhagas), nyalakan webcam, lalu jepret foto Clock-In secara jelas.")
    add_callout(
        "Catatan Penalti & Denda Keterlambatan",
        "Toleransi keterlambatan diberikan hingga 9 menit dari jam masuk shift (misal: pukul 11.09 WIB pada Shift 1 atau 15.09 WIB pada Shift 2). Tepat pada menit ke-10 keterlambatan (pukul 11.10 WIB atau 15.10 WIB), sistem secara otomatis memotong gaji kru sebesar Rp 5.000 per blok 10 menit (berlaku kelipatan)."
    )

    add_h3("4. Persiapan Mesin Espresso & Peralatan Bar")
    add_bullet("Pemanasan Mesin:", "Nyalakan mesin espresso dan grinder 20–30 menit sebelum cafe buka agar tekanan boiler dan suhu ekstraksi stabil.")
    add_bullet("Flushing & Purging:", "Lakukan flushing air pada masing-masing group head selama 5 detik, serta purge steam wand dengan lap basah bersih.")
    add_bullet("Kalibrasi Espresso (Dialing-In):", "Timbang gramatur bubuk kopi (dose), ekstrak espresso (yield), cek waktu ekstraksi (25–30 detik), dan cicipi rasa espresso untuk memastikan keseimbangan acidity, sweetness, dan bitterness.")
    add_bullet("Kebersihan Bar Tools:", "Pastikan tamper, distributor, knockbox, portafilter, timbangan digital, shaker, jigger, dan pitcher susu bersih dan kering.")

    add_h3("5. Pengecekan Bahan Baku & Perlengkapan Harian (Stock Checklist)")
    add_bullet("Bahan Baku Utama:", "Cek ketersediaan biji kopi espresso, susu segar (fresh milk/UHT), pasokan es batu kristal melimpah, aneka sirup, saus, krimer, powder matcha/cokelat, dan air mineral galon.")
    add_bullet("Packaging & Cup:", "Pastikan stok cup plastik dingin (12oz/16oz), hot paper cup, tutup cup (lid), sedotan steril, cup holder/sleeve, kantong take-away, dan tisu meja mencukupi.")

    add_h3("6. Pembersihan Area Cafe (Indoor, Teras & Toilet)")
    add_bullet("Area Meja & Dining:", "Lap bersih seluruh meja dan kursi cafe dengan cairan pembersih meja. Sapu dan pel lantai indoor dan teras outdoor.")
    add_bullet("Asbak Outdoor:", "Bersihkan dan cuci asbak rokok di area teras. Pastikan meja teras bebas dari abu dan puntung rokok.")
    add_bullet("Kaca & Pintu Masuk:", "Bersihkan seluruh kaca pintu masuk dan jendela dari sidik jari dengan glass cleaner.")
    add_bullet("Wastafel & Toilet:", "Pastikan sabun cuci tangan terisi penuh, tisu toilet tersedia, dan pasang trashbag baru pada tempat sampah.")

    add_h3("7. Kesiapan Sistem Kasir POS Méra Hause")
    add_bullet("POS Cafe Méra Hause:", "Buka sistem POS Méra Hause di os.meraselfstudio.com.")
    add_bullet("Modal Awal Kasir (Cash Float):", "Hitung modal awal kas kecil di laci kasir (misal: Rp 100.000 – Rp 200.000 uang pecahan kecil) untuk kembalian.")
    add_bullet("Printer Struk:", "Pastikan printer thermal struk menyala, terhubung, dan kertas roll terpasang sempurna.")

    # ── BAGIAN 2: OPERASIONAL ─────────────────────────────────────────
    add_section_header("OPERASIONAL (CUSTOMER SERVICE, ORDER & CASHIER FLOW)", "Alur pelayanan customer mulai dari pemesanan, kasir, proses peracikan minuman, hingga penyajian.")

    add_h3("1. Penyambutan Tamu (Hospitality Budaya 5S)")
    add_bullet("Budaya 5S:", "Terapkan Senyum, Salam, Sapa, Sopan, Santun saat customer mendekat ke meja bar/kasir.")
    add_bullet("Sapaan Hangat:", "Sambut dengan ramah: 'Halo kak, selamat datang di Méra Hause! Mau dine-in atau take-away?'")
    add_bullet("Rekomendasi Menu:", "Jika customer baru pertama kali datang atau bingung, berikan rekomendasi menu signature Méra Hause (Signature Coffee, Matcha Latte, atau Mocktails).")

    add_h3("2. Penginputan Pesanan di POS Méra Hause")
    add_bullet("Input Menu:", "Pilih item menu sesuai kategori (Coffee, Non-Coffee, Tea, Mocktails, Pastry/Food) pada layar POS Méra Hause.")
    add_bullet("Preferensi Khusus:", "Tanyakan dan catat preferensi customer: Hot / Iced, tingkat kemanisan (Normal / Less / No Sugar), dan opsi susu (Dairy / Oat Milk).")
    add_bullet("Nama & Meja:", "Catat nama customer dan nomor meja tamu jika dine-in.")

    add_callout(
        "SOP Upselling & Cross-Selling (Wajib)",
        "Setiap kru kasir WAJIB menawarkan menu pendamping sebelum transaksi diselesaikan: 'Mau sekalian coba pastry / croissant hangatnya kak untuk teman ngopi?' atau menawarkan extra shot espresso. Upselling yang konsisten terbukti meningkatkan kepuasan pelanggan dan omzet cafe."
    )

    add_h3("3. Proses Kasir, Pembayaran & Distribusi Struk")
    add_bullet("Metode Pembayaran:", "Tawarkan pilihan QRIS, Uang Tunai (Cash), atau Transfer Bank.")
    add_bullet("Pembayaran QRIS:", "Tampilkan barcode QRIS dan pastikan customer menunjukkan bukti status transaksi 'BERHASIL' di layar HP mereka.")
    add_bullet("Pembayaran Tunai (Cash):", "Sebutkan jumlah uang tunai yang diterima, hitung kembalian dengan jelas di depan customer, dan serahkan struk belanja.")
    add_bullet("Selesaikan Transaksi:", "Klik Bayar / Selesaikan Pesanan di POS hingga status order menjadi PAID, lalu cetak struk pesanan.")

    add_callout(
        "Aturan Keamanan Sistem Kasir (Locking Security)",
        "Seluruh riwayat pesanan yang telah dibayar lunas (PAID) terkunci permanen untuk kru (Nona, Izza & Bhagas). Pembatalan atau penghapusan transaksi hanya dapat dilakukan oleh Owner. Jika ada kesalahan order fatal, segera laporkan ke WhatsApp Owner."
    )

    add_h3("4. Standar Peracikan & Penyajian Minuman")
    add_bullet("Akurasi Resep:", "Wajib gunakan timbangan digital dan gelas takar (jigger) sesuai panduan resep baku agar rasa tetap konsisten.")
    add_bullet("Steam Wand Hygiene:", "Langsung lap steam wand dengan kain basah khusus begitu selesai frothing susu, lalu lakukan purge uap 1–2 detik.")
    add_bullet("Standar Penyajian:", "Gunakan coaster (tatakan gelas) untuk penyajian dine-in. Pastikan bagian luar cup bersih, tidak tumpah, dan lid tertutup rapat untuk take-away.")

    add_h3("5. Pencatatan Pengeluaran Harian Kas Kecil (Expenses)")
    add_bullet("Pengeluaran Kas Kecil:", "Jika membeli kebutuhan operasional darurat (es batu, galon air, gas portabel, tisu, dll.), wajib simpan nota/struk fisik.")
    add_bullet("Input di POS Méra Hause:", "Masukan nominal pada menu Input Pengeluaran dengan format keterangan baku: [Méra Hause] [Nama Kru] Pembelian ... (Contoh: [Méra Hause] [Nona] Beli Es Batu Kristal 2 Pack). Simpan struk di laci kasir untuk audit malam.")

    # ── BAGIAN 3: PERGANTIAN SHIFT ────────────────────────────────────
    add_section_header("PERGANTIAN SHIFT & SERAH TERIMA (MID-SHIFT / 15.00 WIB)", "Prosedur wajib saat pergantian dari Kru Shift 1 ke Kru Shift 2 agar operasional berjalan mulus.")

    add_h3("1. Prosedur Serah Terima (Handover Pukul 15.00 WIB)")
    add_bullet("Pembersihan Mini-Closing (Shift 1):", "Sebelum jam 15.00 WIB, Kru Shift 1 wajib mencuci seluruh bar tools kotor (jigger, pitcher, shaker), mengelap meja bar, membersihkan asbak teras, dan mengangkat gelas tamu yang sudah kosong.")
    add_bullet("Penghitungan Kasir Bersama (Cash Count):", "Kru Shift 1 dan Kru Shift 2 menghitung fisik uang tunai di laci kasir bersama-sama dan mencocokkannya dengan data transaksi tunai di POS.")
    add_bullet("Serah Terima Stok & Catatan:", "Informasikan sisa bahan baku kritis (es batu, susu, sirup) dan pesanan meja yang sedang berjalan.")
    add_bullet("Absensi Handover:", "Kru Shift 1 melakukan Clock-Out via foto webcam, dan Kru Shift 2 melakukan Clock-In via foto webcam.")

    # ── BAGIAN 4: CLOSING ─────────────────────────────────────────────
    add_section_header("CLOSING (PENUTUPAN OPERASIONAL CAFE / 23.00 WIB)", "Prosedur penutupan cafe yang tertib, bersih, aman, dan akurat secara finansial.")

    add_h3("1. Last Order (Pukul 22.30 WIB)")
    add_bullet("Pemberitahuan Last Order:", "Pukul 22.30 WIB, informasikan secara sopan kepada customer bahwa pemesanan menu terakhir (last order) dibuka.")

    add_h3("2. Deep Cleaning & Sanitasi Bar Area")
    add_bullet("Backflush Mesin Espresso:", "Lakukan backflush group head dengan blind filter hingga air buangan jernih. Rendam portafilter dalam air panas.")
    add_bullet("Bersihkan Drip Tray & Steam Wand:", "Lepas dan cuci bersih drip tray mesin espresso. Bersihkan kerak susu pada steam wand secara menyeluruh.")
    add_bullet("Grinder & Bar Tools:", "Tutup corong hopper grinder, bersihkan sisa bubuk kopi dengan kuas. Cuci bersih seluruh jigger, shaker, pitcher, blender jar, dan knockbox dengan sabun.")
    add_bullet("Chiller Management:", "Simpan susu cair yang sudah dibuka ke dalam kulkas/chiller (suhu 2°C – 4°C). Tutup rapat seluruh sirup, saus, dan wadah es batu.")

    add_h3("3. Pembersihan Seluruh Area Cafe (Indoor & Outdoor)")
    add_bullet("Cuci Gelas & Piring:", "Cuci seluruh gelas dan piring kotor, keringkan, dan susun rapi di rak.")
    add_bullet("Meja, Kursi & Asbak:", "Lap bersih seluruh meja dan kursi cafe. Buang puntung rokok dan cuci bersih seluruh asbak teras.")
    add_bullet("Sapu, Pel & Sampah:", "Sapu dan pel seluruh lantai bar, area indoor, dan teras luar. Ikat kantong sampah (trashbag), buang ke bak penampungan luar, dan pasang trashbag baru.")

    add_h3("4. Rekapitulasi Keuangan Harian (Daily Cash Recap)")
    add_bullet("Langkah Rekap:", "1) Hitung fisik uang tunai di laci kasir dan pisahkan uang modal awal kas kecil. 2) Cocokkan total uang tunai fisik dengan Total Cash pada sistem POS. 3) Cocokkan transaksi QRIS/Transfer dengan notifikasi mutasi bank. 4) Pastikan semua nota pengeluaran kas kecil sudah terinput di menu Expenses.")
    add_callout(
        "Format Laporan Closing Harian (Kirim ke WhatsApp Owner)",
        "Laporan Closing Harian Méra Hause\nTanggal       : [Hari, DD/MM/YYYY]\nKru Bertugas  : [Nona / Izza / Bhagas]\n------------------------------------\nTotal Penjualan : Rp [...]\n- Total QRIS / Transfer : Rp [...]\n- Total Tunai (Cash)   : Rp [...]\nTotal Pengeluaran Kas  : Rp [...] (Rincian nota terlampir)\nSisa Uang Tunai Kasir  : Rp [...]\n------------------------------------\nCatatan Stok Menipis   : [Bahan baku yang perlu restock]"
    )

    add_h3("5. Pengamanan Peralatan, Listrik & Penguncian Cafe")
    add_bullet("Peralatan Listrik:", "Matikan mesin espresso / posisikan standby, matikan AC, kipas angin, dan audio speaker cafe.")
    add_bullet("Lampu & Keran Air:", "Matikan seluruh lampu penerangan cafe dan teras. Pastikan semua keran air tertutup rapat.")
    add_bullet("Clock-Out & Kunci Pintu:", "Kru melakukan Clock-Out di menu Presensi via foto webcam. Kunci seluruh pintu dan gembok cafe dengan rapat sebelum pulang.")

    # Save document
    doc.save(filename)
    print(f"Document saved successfully: {filename}")

if __name__ == "__main__":
    out_file = "/Users/mac2019/méra-os/docs/SOP Méra Hause.docx"
    create_hause_sop_docx(out_file)
