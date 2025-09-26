<!-- docs/research-plan.md -->
# Araştırma Planı

## 1. LinkedIn DOM ve Premium Veri Analizi

- **Resmi Kaynaklar**
  - [Company Search API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/company-search?view=li-lms-2025-09) dökümantasyonu `industryV2`, `networkDegree`, `companySize`, `followersSize` gibi filtrelerin resmi tanımlarını ve geçerli değer kümelerini sağlamaktadır.
  - Premium içgörü alanlarına dair kamuya açık içerikler LinkedIn Help Center üzerinde oturum gerektirdiğinden, oturum açılmış inceleme gereksinimi kayda alındı.
- **Jobs Sayfası**
  - Kart yapısı, lazy-load davranışı, sayfalama.
  - Deneyim seviyesi, iş fonksiyonu, sektör gibi filtre alanlarının DOM referansları.
- **Şirket Sayfaları (Premium)**
  - `About` ve `Insights` sekmelerinin HTML/CSS seçicileri.
  - `Median employee tenure`, `Headcount growth`, `Employee distribution` veri bloklarının yüklenme tetikleyicileri.
- **Profil Sayfaları** (opsiyonel)
  - Section nasıl yükleniyor? Scroll gereksinimleri, premium özellikler.

## 2. Davranışsal Simülasyon ve Throttling

- **Rate Limit İncelemesi**
  - LinkedIn’in tespit ettiği aşırı istek davranışları.
  - Premium hesaplarda kabul edilebilir istek yoğunluğu.
- **Davranış Taklidi**
  - Rastgele scroll, mouse hareketleri.
  - Gözlemlenen ortalama kullanıcı etkileşim süreleri.

## 3. Chrome/Brave Manifest V3 Kısıtları

- **Resmi Kaynaklar**
  - [Manifest V3 geçiş rehberi](https://developer.chrome.com/docs/extensions/develop/migrate/) kalıcı arka plan sayfalarının `service_worker` lehine kaldırıldığını ve uzaktan barındırılan kodun yasaklandığını doğrular.
  - [Service worker konsepti](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/) ile [servis işçisi yaşam döngüsü](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle/) belgeleri, `idle` durum yönetimi ile `chrome.alarms` gibi tetikleyicilerin kullanımını resmi olarak tarif eder.
  - [Brave SSS](https://brave.com/faq/#extensions) Brave’in Chromium tabanlı olduğunu ve Chrome uzantı API’lerinin desteklendiğini belirtilir; bu nedenle Manifest V3 gereksinimleri Brave’de de birebir uygulanır.
- **Service Worker Yaşam Döngüsü**
  - Uykuya geçme/uyanma, kalıcı görevlerin planlanması (`chrome.alarms`).
- **Offscreen Documents**
  - Gerekirse arka planda veri işleme için kullanımı.
- **Brave Spesifik Davranışlar**
  - Shields ayarlarının uzantı davranışına etkileri.
  - Geliştirici modu yükleme yöntemleri.

## 4. Otomasyon ve Test Araçları

- **E2E Test Stratejisi**
  - Puppeteer veya Playwright ile örnekleme.
  - LinkedIn oturumlarıyla otomasyonun sınırları.
- **Regresyon Tespit**
  - DOM değişikliklerini takip eden scriptler.

## 5. Veri Modeli ve Depolama Stratejileri

- **Schema Tanımları**
  - `JobPosting`, `CompanyInsight`, `SearchTemplate` şema detaylandırması.
- **Cache Politikası**
  - Zaman damgası, invalidation stratejileri.
  - IndexedDB seçenekleri.

## 6. Çıktı ve Raporlama Biçimleri

- **Formatlar**
  - JSON, CSV, XLSX, PDF, Markdown.
- **Otomasyon**
  - Belirli aralıklarla rapor oluşturma.

## 7. Kaynaklar ve Referanslar

- **Resmi Dokümantasyon**
  - [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
  - [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/mv3/intro/)
- **Topluluk Kaynakları**
  - LinkedIn veri çıkarımı ve DOM değişikliklerini izleyen projeler.
  - Brave uzantıları topluluk deneyimleri.

## 8. Çıktılar

- Araştırma notları ve bulgular.
- DOM seçici tablosu (`docs/selectors-reference.md`).
- Rate limit ve throttling stratejisi raporu (`docs/throttling-guide.md`).
