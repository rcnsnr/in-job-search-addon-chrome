<!-- docs/architecture.md -->
# Mimari Tasarım

## 1. Sistem Genel Bakışı

- **Tarayıcı Uyumluluğu**: Chrome ve Chromium tabanlı Brave tarayıcılarında Manifest V3 gereksinimlerine uyumlu.
- **Bileşenler**:
  - `service_worker` (arka plan): Görev planlayıcı, hız denetimi, iş kuyruğu yönetimi.
  - `content` betikleri: LinkedIn sayfalarından veri çıkarımı, DOM gözlemi.
  - `popup` ve `options` arayüzleri: Kullanıcı etkileşimi, şablon yönetimi.
  - `storage` katmanı: `chrome.storage.local`, IndexedDB cache.
- **İletişim**: `chrome.runtime` mesaj kanalı ile üçlü iletişim (`popup ↔ service_worker ↔ content`).

## 2. Bileşen Sorumlulukları

- **Service Worker**
  - Görev kuyruğu ve durum makinesi yönetimi.
  - Throttling stratejileri, rastgele gecikme üretimi.
  - Oturum ve hata loglama.
- **Content Script Modülleri**
  - `jobsScraper`: LinkedIn Jobs sayfasında ilan kartlarını çıkarır.
  - `companyInsightsScraper`: Şirket sayfalarında Premium metrikleri toplar.
  - `profileSampler` (opsiyonel): Çalışan profili örneklemesi.
- **Popup UI**
  - Anlık filtre uygulama, sonuç görselleştirme.
  - Arama şablonu seçimi ve oluşturma.
  - Veri dışa aktarımları tetikleme.
- **Options UI**
  - Varsayılan hız profilleri, cache ayarları, otomasyon planlayıcı.
- **Storage Katmanı**
  - Kalıcı filtre ayarları (`chrome.storage.sync` ile yedekli)
  - IndexedDB: Şirket içgörü cache’i (timestamp, kaynak bilgisi).

## 3. Veri Akışı

1. Kullanıcı `popup` üzerinden arama şablonunu ve parametrelerini seçer.
2. `popup` mesajı `service_worker`’a iletir; görev kuyruğuna yeni arama eklenir.
3. `service_worker`, aktif sekmeye `content` betiğini enjekte eder ve komut verir.
4. `content` betiği LinkedIn Jobs sayfasını tarar, ham veriyi geri yollar.
5. Gerekli şirket içgörüleri yoksa `service_worker` yeni sekme açtırarak `companyInsightsScraper`’ı tetikler.
6. Tüm veriler birleştirilir, filtre motoruna uygulanır ve sonuçlar `popup` arayüzünde gösterilir.
7. Kullanıcı sonuçları indirir veya otomasyon planlayıcı sonuçları planlı olarak tekrarlar.

## 4. Veri Modeli Şemaları

- **İlan (`JobPosting`)**
  - `id`, `title`, `companyName`, `jobUrl`, `location`, `workplaceType`, `employmentType`, `postedAt`, `salaryEstimate`, `skillsTags`, `experienceLevel`, `industries`, `benefits`.
- **Şirket İçgörüsü (`CompanyInsight`)**
  - `companyName`, `companyUrl`, `medianTenure`, `headcount`, `headcountGrowth`, `distributionByFunction`, `recentHires`, `topLocations`.
- **Arama Şablonu (`SearchTemplate`)**
  - `name`, `keywords`, `locations`, `experienceLevels`, `industryFilters`, `premiumCriteria`, `throttlingProfile`.

## 5. Throttling ve Davranışsal Simülasyon

- **Hız Profilleri**: Konservatif, Dengeli, Agresif (default: konservatif).
- **Bekleme Stratejisi**: Log-normal dağılımlı gecikmeler, kullanıcı scroll ve mouse hareketlerinin taklit edilmesi.
- **Sekme Yönetimi**: Şirket içgörü sekmeleri seri olarak işlenir, aktif sekme sürekli değişmez.
- **Hata Yönetimi**: `try-catch` blokları, yeniden deneme (max 3), backoff.

## 6. Brave Uyumluluğu

- `chrome.*` API’leri Brave’de aynı isimle kullanılabilir; fark:
  - Shields/koruma ayarlarının uzantıyı engellemediğinin doğrulanması.
  - `chrome://extensions` üzerinden manuel yükleme yönergeleri dokümante edilir.
- Servis işçisi ve manifest izinleri Brave özelinde test edilir.

## 7. Güvenlik ve Gizlilik Notları

- Çerez ve oturum bilgisi uzantı dışında tutulmaz.
- Yalnızca kullanıcının açık sekmelerinde kod çalıştırılır.
- Premium veriye erişim için kullanıcı oturumu gereklidir; herhangi bir credential saklanmaz.

## 8. Yol Haritası Entegrasyonu

- Her faz sonunda bu doküman güncellenecek.
- Genişleyen modüller (ör. `analyticsDashboard`, `automationScheduler`) bölümleri eklenerek mimari şemalar güncellenecek.
