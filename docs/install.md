<!-- docs/install.md -->
# Kurulum ve Yükleme Kılavuzu

Bu doküman, LinkedIn Gelişmiş İş Zekâsı uzantısının yerel geliştirme sırasında Chrome ve Brave tarayıcılarına nasıl yüklenip kullanılacağını açıklar.

## 1. Ön Koşullar

- Google Chrome 128+ veya Brave tarayıcısı (Chromium tabanlı).
- Geliştirme modunda uzantı yüklemeye izin verecek yetkiler.
- LinkedIn hesabına giriş yapılmış bir tarayıcı oturumu (Premium içgörüler için gerekli).

## 2. Kaynak Kodunu Hazırlama

1. Depoyu klonlayın:

   ```bash
   git clone https://github.com/rcnsnr/in-job-search-addon-chrome.git
   cd in-job-search-addon-chrome
   ```


2. Gerekli yapılandırma dosyalarının mevcut olduğundan emin olun (`manifest.json`, `service_worker.js`, `content/jobs.js`, `popup.html`, `popup.js`).
3. Gerekirse `docs/` altındaki referans dokümanları gözden geçirerek hızlı başlangıç yapın.

## 3. Chrome Üzerinde Yükleme

1. Chrome tarayıcısını açın ve adres çubuğuna `chrome://extensions/` yazın.
2. Sağ üstteki **Geliştirici modu** anahtarını etkinleştirin.
3. **Paketlenmemiş uzantı yükle** düğmesine tıklayın.
4. Klonladığınız depo klasörünü (`in-job-search-addon-chrome/`) seçin.
5. Uzantı listesinde "LinkedIn Job Filter" adını gördüğünüzde kurulum tamamlanmış demektir.

## 4. Brave Üzerinde Yükleme

1. Brave tarayıcısını açın ve adres çubuğuna `brave://extensions/` yazın.
2. Sağ üstteki **Geliştirici modu** anahtarını etkinleştirin.
3. **Load unpacked** veya "Paketlenmemiş yükle" seçeneğine tıklayın.
4. Klonlanan depo klasörünü (`in-job-search-addon-chrome/`) seçin.
5. Brave Shields ayarlarının uzantıyı engellemediğinden emin olun; gerekirse uzantının yanındaki **Details** bölümünden site izinlerini gözden geçirin.

## 5. Uzantıyı Kullanma

1. Uzantı simgesine tıklayın ve `popup.html` arayüzünü açın.
2. İlgili LinkedIn Jobs sekmesi aktifken filtre alanlarını doldurun:
   - Anahtar kelimeler
   - Lokasyon
   - Şirket
   - Tarama hızı (varsayılan 5000 ms)
3. **Filtreleri Kaydet ve Tara** düğmesine basın. Service worker, aktif Jobs sekmesindeki ilanları tarar ve sonuçları listeler.
4. Sonuçları **CSV** veya **JSON** formatında indirebilirsiniz.
5. Kaydedilen filtreler `chrome.storage.local` üzerinden saklanır; popup yeniden açıldığında otomatik yüklenir.

## 6. Geliştirme Akışı

- Kod değişiklikleri yaptıktan sonra `chrome://extensions/` sayfasındaki uzantının yanındaki **Yeniden Yükle** düğmesine basarak servis işçisini ve içerik betiklerini yeniden yükleyin.
- Servis işçisi loglarını görmek için `chrome://extensions/` sayfasındaki **Servis çalışanını incele** bağlantısını kullanın.
- İçerik betiği logları ilgili LinkedIn sekmesinin geliştirici araçları (DevTools) konsolunda görüntülenir.
- Debug sırasında `chrome.runtime.lastError` çıktıları `popup.js` kapsamında statü rozetlerine yansıtılır.

## 7. Güvenlik ve Oturum

- Uzantı yalnızca aktif sekmede LinkedIn Jobs sayfası açıkken çalışır.
- LinkedIn oturumu tarayıcıda açık olmalıdır; uzantı herhangi bir kimlik bilgisi saklamaz.
- Premium içgörüler için daha sonra geliştirilecek `companyInsightsScraper` modülü oturum gerektireceğinden, oturum süresinin dolmaması için tarayıcı ayarları gözden geçirilmelidir.

## 8. Sorun Giderme

- Uzantı butonuna tıklayıp sonuç alamıyorsanız, aktif sekmenin `https://www.linkedin.com/jobs/` ile başladığını doğrulayın.
- `Servis işçisi yanıt vermedi` hatası alırsanız uzantıyı yeniden yükleyin veya `chrome://extensions/` sayfasından servis işçisini yeniden başlatın.
- CSV/JSON indirme sorunlarında tarayıcının pop-up engelleyici veya indirme izinlerini kontrol edin.

## 9. Sonraki Adımlar

- Premium içgörü toplama süreci tamamlandığında bu doküman güncellenecek.
- Resmî mağaza (Chrome Web Store / Brave Add-ons) yayına hazırlık için paketleme ve imzalama adımları ayrı bir bölümde belgelenecek.
