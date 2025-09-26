<!-- docs/architecture.md -->
# Mimari Tasarım

## 1. Sistem Genel Bakışı

- **Tarayıcı Uyumluluğu**: Chrome ve Chromium tabanlı Brave tarayıcılarında Manifest V3 gereksinimlerine uyumlu.
- **Bileşenler**:
  - `service_worker` (arka plan): Görev planlayıcı, hız profili uygulaması, telemetri kayıt/saklama, Premium Insights kuyruğu ve iş kuyruğu yönetimi.
  - `content` betikleri: LinkedIn sayfalarından veri çıkarımı, DOM gözlemi, işyeri tipi sınıflandırması.
  - `popup` ve `options` arayüzleri: Kullanıcı etkileşimi, şablon yönetimi, profil seçimi.
  - `storage` katmanı: `chrome.storage.local`, IndexedDB cache.
- **İletişim**: `chrome.runtime` mesaj kanalı ile üçlü iletişim (`popup ↔ service_worker ↔ content`).

## 2. Bileşen Sorumlulukları

### Service Worker

- Görev kuyruğu ve durum makinesi yönetimi (`chrome.alarms`, `chrome.runtime` olayları — [kaynak](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle/)).
- Throttling stratejileri, rastgele gecikme üretimi, hız profili seçimi.
- Profil bazlı gecikme (`conservative`, `balanced`, `aggressive`) ve batch sonrası cooldown.
- Oturum, hata loglama ve `chrome.storage` üzerinden kalıcı durum yönetimi.
- Günlük bazda telemetri üretimi (`processedToday`, `premiumCallsToday`, kalan kota) ve `chrome.storage.local` altında saklama.
- Premium Insights kuyruğu: Filtrelenmiş ilanlardan benzersiz şirket çıkarımı, günlük 50 istek sınırı, CSRf token yönetimi ve GraphQL endpointleri ile veri saklama.
- Anahtar kelime beyaz/siyah listeleri için popup üzerinden düzenleme, `content/jobs.js` seviyesinde başlık/açıklama taramasıyla hybrid/uzaktan sinyallerini filtreleme.
- İçerik betiklerinin yeniden enjekte edilmesi gerektiğinde `chrome.scripting.executeScript` ile kurtarma.

### Content Script Modülleri

- `jobsScraper`: LinkedIn Jobs sayfasında ilan kartlarını çıkarır, temel filtreleme ön işlemini uygular (uzaktan, ilan yaşı, işyeri tipi gibi gelişmiş kriterler dahil).
- Beyaz/Siyah liste eşleşmeleri ve uzaktan çalışma sinyallerini başlık/açıklama/kart metninden toplayarak karar verir.
- `companyInsightsScraper`: Şirket sayfalarında Premium metrikleri (örn. `Median employee tenure`) toplar; oturum gereksinimleri için yardım merkezi incelemesi yapılacak.
- `profileSampler` (opsiyonel): Çalışan profili örneklemesi, takım yapısı analizleri.
- DOM gözlemleri için `MutationObserver` ve gecikmeli kaydırma simülasyonları.

### Popup UI

- Anlık filtre uygulama, sonuç görselleştirme.
- Arama şablonu seçimi, hız profili ve uzaktan/yaş filtreleri dahil kullanıcı parametrelerinin yönetimi.
- Veri dışa aktarımları tetikleme.
- Telemetri paneli ile hız profili gecikmesi, günlük sayaç ve son işlenme zamanının gösterimi.

### Options UI

- Varsayılan hız profilleri, cache ayarları, otomasyon planlayıcı.

### Storage Katmanı

- Kalıcı filtre ayarları (`chrome.storage.sync` ile yedekli).
- IndexedDB: Şirket içgörü cache’i (timestamp, kaynak bilgisi).

## 3. Veri Akışı

1. Kullanıcı `popup` üzerinden arama şablonunu ve parametrelerini seçer.
2. `popup`, `service_worker`’a mesaj gönderir; görev kuyruğuna yeni arama eklenir veya anlık tarama tetiklenir.
3. `service_worker`, aktif sekmede `chrome.tabs.sendMessage` ile komut yürütür; gerekirse `chrome.scripting` kullanarak içerik betiğini yeniden enjekte eder.
4. `jobsScraper`, DOM’dan ham veriyi toplar, hız profiline uygun gecikmeyi uygular ve sonuçları döner.
5. Gerekli şirket içgörüleri yoksa `service_worker` şirket sayfasını yeni sekmede açar, `companyInsightsScraper`’ı tetikler ve veriyi cache’e işler.
6. Tüm veriler `service_worker` tarafında birleştirilir, ileri seviye filtre motoru çalıştırılır ve sonuçlar `popup` arayüzüne iletilir.
7. Kullanıcı sonuçları indirir veya otomasyon planlayıcı sonuçları planlı olarak tekrarlar; geçmiş kayıtları `chrome.storage`/IndexedDB’de saklanır.

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
- Referans: [Brave FAQ - Extensions](https://brave.com/faq/#extensions) Brave’in Chromium tabanı ve uzantı desteğini doğrular.

## 7. Güvenlik ve Gizlilik Notları

- Çerez ve oturum bilgisi uzantı dışında tutulmaz.
- Yalnızca kullanıcının açık sekmelerinde kod çalıştırılır.
- Premium veriye erişim için kullanıcı oturumu gereklidir; herhangi bir credential saklanmaz.

## 8. Yol Haritası Entegrasyonu

- Her faz sonunda bu doküman güncellenecek.
- Genişleyen modüller (ör. `analyticsDashboard`, `automationScheduler`) bölümleri eklenerek mimari şemalar güncellenecek.

## 9. Resmi Kaynak Referansları

- Manifest V3 değişimleri: [Chrome Developers – Migrate](https://developer.chrome.com/docs/extensions/develop/migrate/)
- Servis işçisi kavramı ve yaşam döngüsü: [Chrome Developers – Service Workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/) ve [Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle/)
- Brave uyumluluğu: [Brave FAQ](https://brave.com/faq/#extensions)
- LinkedIn filtre alanları: [Company Search API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/company-search?view=li-lms-2025-09)
