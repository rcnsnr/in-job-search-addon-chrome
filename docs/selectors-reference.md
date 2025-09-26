<!-- docs/selectors-reference.md -->
# DOM Seçici Referansı

## 1. LinkedIn Jobs Sayfası

- **İlan kartı**: `li.jobs-search-results__list-item`
- **İlan başlığı**: `a.job-card-list__title`
- **Şirket adı**: `a.job-card-container__company-name`
- **Lokasyon**: `ul.job-card-container__metadata li`
- **İlan tarihi**: `time` (attribute: `datetime`)

Bu seçiciler `content/jobs.js` içindeki `extractJob()` fonksiyonunda kullanılmaktadır.

## 2. Premium Insights (Manuel Analiz Gerekiyor)

Premium metriklerin DOM seçicileri LinkedIn Premium oturumu gerektirdiği için henüz doğrulanmadı. Aşağıdaki tablo saha testinden sonra doldurulacaktır.

| Veri Alanı | Beklenen Bölüm | Notlar |
| --- | --- | --- |
| Median employee tenure | `Insights` sekmesi | Oturumlu tarama sonrası CSS/ARIA seçicisi belirlenecek |
| Headcount growth | `Insights` sekmesi | AJAX yükleme zinciri gözlemlenecek |
| Employee distribution | `Insights` sekmesi | `data-ember-action` ve grafik bileşenleri incelenecek |
| Recent hires | `People` veya `Retention` alt sekmesi | Liste bileşenleri ve pagination kontrolü doğrulanacak |

## 3. Geliştirme Yol Haritası

1. Oturum açılmış LinkedIn hesabı ile `Insights` sekmesinde tam DOM yakalaması yapmak.
2. Seçicileri doğruladıktan sonra `companyInsightsScraper` modülünde kullanılmak üzere belgeyi güncellemek.
3. DOM değişikliklerini izlemek için `docs/throttling-guide.md` ile uyumlu otomasyon betiği hazırlamak.
