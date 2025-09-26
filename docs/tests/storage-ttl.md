# chrome.storage TTL doğrulama senaryoları

## Test Senaryosu 1 – Premium İçgörü TTL Temizliği

1. `chrome.storage.local` içerisine `premium:company:*` anahtarları için örnek veri ekleyin ve `expiresAt` değeri geçmiş bir zaman damgası olacak şekilde ayarlayın.
2. Servis işçisini `chrome.runtime.sendMessage({ action: "debugForceCleanup" })` komutu ile tetikleyin veya geçici olarak geliştirme konsolundan `ensureStorageCapacity()` çağrısı yapın.
3. `chrome.storage.local.get` ile eski kayıtların kaldırıldığını doğrulayın.
4. Loglarda `Depolama kapasitesi kontrolü` uyarılarının hata içermediğini teyit edin.

## Test Senaryosu 2 – Şirket ID Cache TTL Temizliği

1. `companyIdCache:*` anahtarı için `expiresAt` geçmiş değeriyle kayıt oluşturun.
2. İşlem sonrası `chrome.storage.local.getBytesInUse()` çıktısını kontrol edip azaldığını doğrulayın.
3. TTL sonrası kaydın tekrar çözülmesi gerektiğinde `resolveCompanyId()` fonksiyonunun yeni ID talep ettiğini gözlemleyin.

## Test Senaryosu 3 – Eşik Aşımı ve Hedef Alan Temizliği

1. `PREMIUM_INSIGHTS_STORAGE_PREFIX` altında 60+ kayıt oluşturarak `STORAGE_USAGE_THRESHOLD_BYTES` değerini aşacak şekilde doldurun.
2. Temizlik sonrası toplam kullanımın `STORAGE_USAGE_TARGET_BYTES` altına düştüğünü ve en eski kayıtların kaldırıldığını `chrome.storage.local.get` ile doğrulayın.
3. Telemetri kayıtlarının (`telemetry:YYYY-MM-DD`) korunmaya devam ettiğini, sadece Premium kayıtlarının prune edildiğini teyit edin.

## Test Senaryosu 4 – Hata Dayanıklılığı

1. `chrome.storage.local.getBytesInUse` çağrısında simüle hata yakalamak için devtools konsolundan geçersiz parametre gönderin.
2. `ensureStorageCapacity()` fonksiyonunun `console.warn` üzerinden hata mesajı basıp süreci durdurduğunu gözlemleyin.
3. Hata sonrası normal akışı tekrar çalıştırarak sistemin eski haline döndüğünü doğrulayın.
