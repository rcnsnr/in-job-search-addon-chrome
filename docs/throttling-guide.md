<!-- docs/throttling-guide.md -->
# Throttling ve Davranışsal Simülasyon Rehberi

## 1. Amaç

Bu rehber, LinkedIn üzerinde çalışan Manifest V3 uzantısının güvenli hız profilleriyle çalışmasını sağlamak için kullanılacak stratejileri açıklamaktadır. Rate limit ihlallerini önlemek ve insan benzeri davranış üretmek hedeflenmiştir.

## 2. Hız Profilleri

- **Konservatif**
  - Bekleme aralığı: 6-10 saniye (log-normal dağılım).
  - Maksimum ilan taraması: 30 ilan/dakika.
  - Kullanım: Premium oturumlar, yüksek riskli veri toplama.
- **Dengeli**
  - Bekleme aralığı: 4-6 saniye.
  - Maksimum ilan taraması: 45 ilan/dakika.
  - Kullanım: Standart Jobs taramaları.
- **Agresif**
  - Bekleme aralığı: 2-4 saniye.
  - Maksimum ilan taraması: 60 ilan/dakika.
  - Kullanım: Kısa süreli hızlı taramalar; uzun süreli kullanım önerilmez.

Bekleme aralıkları servis işçisi tarafından üretilecek ve içerik betiklerine iletilecektir.

## 3. Bekleme Mantığı

- `service_worker.js` içinde kuyruğa alınan görevler hız profiline göre gecikmeli tetiklenir.
- `content/jobs.js` verileri eşzamanlı toplar; ancak profil gecikmesi `popup.js` üzerinden planlanır.
- Gelecekte `companyInsightsScraper` için ek bekleme katmanı (`chrome.alarms`) planlanmaktadır.

## 4. Davranışsal Simülasyon

- Scroll ve mouse hareketlerinin rastgeleleştirilmesi (`content` modüllerinde `requestIdleCallback` + `setTimeout`).
- Arama parametreleri arasına rastgele gecikme (1500-3000 ms).
- Her 10 görevde bir 15-25 saniyelik mola ekleme.

## 5. Rate Limit Varsayımları

- LinkedIn Jobs arayüzü için 1 dakikada 60 istek üzeri hız, uyarı riskini artırır.
- Premium sekmelerde 30 istek/dakika üzeri hız tavsiye edilmez.
- Günlük toplam tarama sayısı 500 ilanla sınırlandırılacaktır; servis işçisi `chrome.storage.local` üzerinden sayaç tutacaktır.

## 6. İzleme ve Loglama

- `service_worker.js` içinde her görev için `processedAt` zaman damgası oluşturulur.
- Hız profili, güncel sayaçlar ve hata kodları `chrome.storage.local` altında `telemetry` anahtarında saklanacaktır.
- Uzun vadede bir `logs.html` veya dışa aktarım fonksiyonu planlanmaktadır.

## 7. Brave Özel Ayarlar

- Brave Shields, otomatik kaydırma çağrılarını engelleyebilir; gerekli durumlarda site bazlı izin verilmelidir.
- Brave üzerinde istek hızının %10 daha düşük tutulması önerilir (örn. dengeli profil → 4-7 saniye).

## 8. Uygulama Yol Haritası

1. `popup.js` hız profili seçimi ve servis işçisine iletimi.
2. `service_worker.js` kuyruğunda gecikme mantığının uygulanması.
3. Davranışsal simülasyon modülünün (`utils/humanizer.js`) eklenmesi.
4. Sayaç ve rate limit uyarı mekanizmasının geliştirilmesi.

Bu rehber Faz 2 ve Faz 3 geliştirmeleri boyunca referans alınacaktır.
