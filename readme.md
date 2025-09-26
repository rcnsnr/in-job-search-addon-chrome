# LinkedIn Job Filter Chrome Extension

LinkedIn'deki iş ilanlarını filtrelemek için kullanabileceğiniz bir Chrome tarayıcı eklentisi. Kullanıcı belirli **anahtar kelimelere**, **lokasyona** ve **şirket isimlerine** göre iş ilanlarını filtreler. Ayrıca, insan benzeri davranış sergileyerek LinkedIn'in bot algılama mekanizmasını aşar.

---

## 🚀 Özellikler

1. **Anahtar Kelime Filtreleme**: Belirttiğiniz anahtar kelimelere göre ilanları listeler.
2. **Lokasyon ve Şirket Adı Filtreleme**: İlgili lokasyon ve şirket adlarını baz alarak ilanları daraltır.
3. **Tarama Hızı Ayarı**: Tarama hızını ayarlayarak bot algılama riskini azaltır.
4. **İnsan Benzeri Davranış**: Rastgele gecikmeler ekleyerek doğal tarama simülasyonu yapar.
5. **Sonuçları İndirme**: Filtrelenmiş ilanları **JSON** veya **CSV** formatında indirebilirsiniz.
6. **Yeni Sekmede Sonuç Görüntüleme**: Filtrelenmiş ilanları tarayıcıda yeni bir sekmede liste olarak gösterir.

---

## 📋 Kurulum

1. Bu repoyu klonlayın:

   ```bash
   git clone https://github.com/kullaniciadi/linkedin-job-filter.git
   cd linkedin-job-filter
   ```

2. Chrome tarayıcısını açın ve **Extensions** (Eklentiler) sayfasına gidin:

   ```text
   chrome://extensions/
   ```

3. Sağ üst köşeden **"Developer mode"** (Geliştirici Modu) seçeneğini etkinleştirin.
4. **"Load unpacked"** butonuna tıklayarak bu projenin klasörünü seçin.
5. Eklenti yüklendikten sonra LinkedIn Jobs sayfasında çalıştırabilirsiniz.

---

## 📘 Kullanım

1. LinkedIn'de **Jobs** sayfasına gidin.
2. Eklenti ikonuna tıklayarak popup arayüzünü açın.
3. Filtreleme kriterlerini girin:
   - **Anahtar Kelimeler**: Örneğin, `Frontend, Remote, JavaScript`
   - **Lokasyon**: Örneğin, `Remote, İstanbul`
   - **Şirket Adı**: Örneğin, `Google, Microsoft`
   - **Tarama Hızı**: Bot algılamayı önlemek için gecikme süresi.
4. "**Filtreleri Kaydet**" butonuna basarak taramayı başlatın.
5. Tarama tamamlandığında:
   - Sonuçları **JSON** veya **CSV** formatında indirebilirsiniz.
   - Filtrelenmiş ilanları yeni bir sekmede görüntüleyebilirsiniz.

---

## 📂 Proje Yapısı

```text
linkedin-job-filter/
│── manifest.json         # Eklentinin tanımı ve izinleri
│── popup.html            # Popup kullanıcı arayüzü
│── popup.js              # Popup ile etkileşim ve veri işleme
│── content.js            # Sayfa içeriğini okuma ve tarama
└── icon.png              # Eklenti ikonu
```

---

## 🛠️ Teknolojiler

- **HTML/CSS**: Kullanıcı arayüzü.
- **JavaScript**: Filtreleme, veri işleme ve DOM manipülasyonu.
- **Chrome Extension API**: Tarayıcı ile etkileşim.

---

## 🔒 Güvenlik

- LinkedIn'in bot algılama politikalarını ihlal etmemek için **tarama hızını ayarlayabilir** ve **rastgele gecikmeler** ekleyebilirsiniz.
- Eklenti, yalnızca kullanıcının açık olan LinkedIn Jobs sayfasını okur ve veri toplar.

---

## 📄 Lisans

Bu proje MIT Lisansı altında sunulmaktadır. Daha fazla bilgi için [LICENSE](LICENSE) dosyasını inceleyin.

---

## 🤝 Katkıda Bulunma

Katkıda bulunmak isterseniz pull request'lerinizi bekliyoruz! Projeye yeni özellikler eklemek veya mevcut hataları düzeltmek için aşağıdaki adımları takip edin:

1. Projeyi fork'layın.
2. Yeni bir branch oluşturun:

   ```bash
   git checkout -b yeni-ozellik
   ```

3. Değişikliklerinizi yapın ve commit'leyin:

   ```bash
   git commit -m "Yeni özellik: ..."
   ```

4. Fork'unuza push'layın:

   ```bash
   git push origin yeni-ozellik
   ```

5. Pull request gönderin.

---

## 🌟 İletişim

Eğer sorularınız veya önerileriniz varsa, lütfen [GitHub Issues](https://github.com/kullaniciadi/linkedin-job-filter/issues) kısmından ulaşın.

---

## Ekran Görüntüleri

### Popup Arayüzü

![Popup](https://via.placeholder.com/300x150)

### JSON ve CSV İndirme

![Download Options](https://via.placeholder.com/300x150)

### Tarama Sonuçları

![Filtered Results](https://via.placeholder.com/300x150)

---
