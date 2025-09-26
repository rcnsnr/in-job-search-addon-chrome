<!-- docs/roadmap.md -->
# LinkedIn Gelişmiş İş Zekâsı Uzantısı Yol Haritası

## 1. Genel Bakış

- **Hedef**: LinkedIn üzerinde standart arama seçeneklerinin ötesinde, Premium verileri de kullanan, Brave (Chromium) ve Chrome tarayıcılarında sorunsuz çalışan ileri seviye bir uzantı geliştirmek.
- **Kapsam**: Gelişmiş arama/filtremeler, şirket ve departman içgörüleri, güvenli otomasyon, zengin çıktı seçenekleri, yeniden kullanılabilir arama şablonları.
- **Temel Kısıtlar**: LinkedIn rate limitlerine takılmadan, tek kullanıcı odaklı güvenli kullanım; Manifest V3 gereksinimleri; Premium oturumlarının istikrarlı yönetimi.

## 2. Faz Planı ve Süreler

| Faz | Süre (hafta) | Ana Amaç |
| --- | --- | --- |
| Faz 0 | 1 | Araştırma ve gereksinim doğrulama |
| Faz 1 | 2 | Mimari temel, uzantı iskeleti |
| Faz 2 | 3 | Gelişmiş Jobs veri toplama & filtreleme |
| Faz 3 | 4 | Premium içgörü entegrasyonu |
| Faz 4 | 3 | Analitik, görselleştirme, otomasyon |
| Faz 5 | Sürekli | Dayanıklılık, bakım, uyarlanabilirlik |

## 3. Faz Detayları

### Faz 0 – Hazırlık ve Araştırma (1 Hafta)

- **Literatür**: LinkedIn UI ve DOM güncellemeleri, Premium sekmelerdeki veri yükleme mekanizmaları.
- **Teknik analiz**: Manifest V3 kısıtları, Brave uyumluluğu (aynı Chromium API seti, izin stratejileri).
- **Veri modeli taslakları**: İlan, şirket, çalışan metrikleri için JSON şemaları belirleme.
- **Çıktılar**: Araştırma raporu (`docs/research-plan.md`), mimari gereksinim listesi.

### Faz 1 – Temel Altyapı ve Mimari (2 Hafta)

- **Mimari bileşenler**: `service_worker` görev yöneticisi, `content` betikleri, `popup`/`options` mikro arayüzleri.
- **Mesaj akışı**: `popup ↔ service_worker ↔ content` üçlü iletişim protokolünün tanımı.
- **Depolama**: `chrome.storage.local` + IndexedDB yapılandırması.
- **Brave uyumluluğu**: Brave deneysel ayarlarında uzantı yüklemesi, izinlerin doğrulanması.
- **Çıktılar**: Mimari şema (`docs/architecture.md`), bileşen sorumluluk matrisi.

### Faz 2 – LinkedIn Jobs İleri Seçim Motoru (3 Hafta)

- **DOM analizörü**: İlan kartlarından 20+ veri alanının çıkarılması (başlık, maaş, kıdem, sektör, vb.).
- **Filtre motoru**: Anahtar kelime sinonimleri, fuzzy matching, deneyim seviyesi/ endüstri filtreleri.
- **Arama şablonları**: Ön tanımlı + kullanıcı tanımlı şablonlar, `chrome.storage` üzerinde yönetim.
- **Brave testleri**: Brave üzerinde Jobs sayfası tarama senaryoları, performans ölçümleri.
- **Çıktılar**: Veri çıkarım modülleri, filtreleme test raporu.

### Faz 3 – Premium Veri Entegrasyonu (4 Hafta)

- **Şirket sayfası gezgini**: Premium sekmelerde `Median employee tenure`, `Headcount growth`, `Employee distribution` gibi alanların toparlanması.
- **Cache mekanizması**: Şirket bazlı veri önbelleği, geçerlilik süresi (24 saat varsayılan).
- **Veri birleştirme**: İlan + şirket içgörülerinin tek veri modelinde bütünleştirilmesi.
- **Güvenli otomasyon**: Sekme geçişleri, gerçekçi bekleme süreleri, hata toleransı.
- **Çıktılar**: Premium veri toplama modülleri, cache stratejisi dokümantasyonu.

### Faz 4 – Analitik, Görselleştirme ve Otomasyon (3 Hafta)

- **Arayüz**: Popup arayüzünde filtre rozetleri, grafiksel özetler, gelişmiş sıralama.
- **İzleme**: Arama geçmişi, sonuç değişim tespiti, not alma modülü.
- **İhracat seçenekleri**: CSV/JSON yanında XLSX, PDF ve Markdown rapor desteği.
- **Otomasyon**: Zamanlanmış tarama, e-posta bildirim entegrasyonu (isteğe bağlı).
- **Brave doğrulaması**: Brave üzerinde otomasyon senaryoları, event log toplama.
- **Çıktılar**: Arayüz iyileştirmeleri, otomasyon modülü, raporlama şablonları.

### Faz 5 – Dayanıklılık ve Bakım (Sürekli)

- **Regresyon testleri**: DOM değişikliği uyarıları, otomatik seçici güncellemeleri.
- **Hata yönetimi**: Global exception handler, yeniden deneme stratejileri.
- **Performans**: CPU/RAM izleme, throttling ayarlamaları.
- **Sürümleme**: Semantik versiyonlama, `CHANGELOG.md` yönetimi.
- **Brave/Chrome ileri uyumluluk**: Chrome/Brave güncellemeleri sonrası regresyon test planı.

## 4. Ana Görev Listesi

- **Araştırma & Dokümantasyon**: LinkedIn DOM, Premium veri yolları, Brave uyumluluğu.
- **Mimari Kurulum**: Manifest V3 yapılandırması, arka plan servis işçisi, mesajlaşma katmanı.
- **Veri Yakalama**: Jobs kartları, şirket içgörüleri, profil analizleri.
- **Filtreleme & Şablonlar**: Gelişmiş kriter motoru, kullanıcı tanımlı şablon yönetimi.
- **Arayüz & Raporlama**: Popup/Options ekranları, grafikler, dışa aktarımlar.
- **Güvenlik & Performans**: Rate limit uyumu, throttling, cache, hata toleransı.
- **Bakım & Test**: Otomatik test senaryoları, dokumentasyon güncellemeleri, sürüm planlama.

## 5. Başarı Ölçütleri

- **Veri Kapsamı**: İlan başına ≥ 20 alan, şirket başına ≥ 10 Premium metrik.
- **Filtre Doğruluğu**: 50 ilanlık testte %95+ uygun ilan yakalaması.
- **Performans**: Tek tarama döngüsü ≤ 10 dakika (Premium veri dahil, güvenli hız profili).
- **Güvenli Davranış**: Günlük istek sayısı LinkedIn toleranslarının ≤ %70'inde, uyarı/ban yok.
- **Uyumluluk**: Chrome 128+ ve Brave güncel sürümü üzerinde sorunsuz çalışma.

## 6. İlerleme Takibi ve Düzenli Gözden Geçirme

- Haftalık sprint değerlendirmeleri: Tamamlanan görevler, engeller, plan revizyonları.
- Ana kilometre taşları: Her faz sonunda demo + dökümantasyon güncellemesi.
- Dokümantasyon güncelleme noktaları: `docs/roadmap.md`, `docs/architecture.md`, `docs/research-plan.md`, `CHANGELOG.md`.
