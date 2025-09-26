<!-- docs/selectors-reference.md -->
# DOM Seçici Referansı

## 1. LinkedIn Jobs Sayfası

- **İlan kartı**: `li.jobs-search-results__list-item`
- **İlan başlığı**: `a.job-card-list__title`
- **Şirket adı**: `a.job-card-container__company-name`
- **Lokasyon**: `ul.job-card-container__metadata li`
- **İlan tarihi**: `time` (attribute: `datetime`)

Bu seçiciler `content/jobs.js` içindeki `extractJob()` fonksiyonunda kullanılmaktadır.

## 2. Premium Insights (Vodafone Saha Analizi Tamamlandı)

Vodafone şirket sayfasından (`/company/vodafone/insights/`) elde edilen veri seçicileri ve API endpointleri:

| Veri Alanı | Seçici/Endpoint | Notlar |
| --- | --- | --- |
| **API Endpoint** | `/voyager/api/graphql?queryId=voyagerPremiumDashCompanyInsightsCard.9c13e41ee272f66978a821cb17d8f6fb` | Ana Premium Insights veri kaynağı |
| **Şirket ID Parametresi** | `variables=(company:1217)` | Vodafone company ID: 1217 |
| Total Employee Count | `[data-test-id="premium-employee-count"]` veya `.org-company-employees-callout__employee-count` | "143,820 total employees" |
| Employee Growth | `[data-test-id="premium-growth-metrics"]` | "4% 6m growth", "6% 1y growth", "9% 2y growth" |
| Median Employee Tenure | `[data-test-id="premium-median-tenure"]` | "Median employee tenure - 7 years" |
| Growth Chart | `.insights-premium-chart` veya `canvas[data-chart-type="employee-growth"]` | Zaman serisi grafik bileşeni |

### API Veri Yapısı

```javascript
// Premium Insights API Response
{
  "company": 1217,
  "totalEmployees": 143820,
  "employeeGrowth": {
    "sixMonth": 4,    // %
    "oneYear": 6,     // %
    "twoYear": 9      // %
  },
  "medianTenure": "7 years",
  "chartData": [...] // Zaman serisi verileri
}
```

### Erişim Gereksinimleri

- Premium LinkedIn hesabı gerekli
- Oturum durumu: `li_at` cookie'si mevcut olmalı
- Rate limiting: Günlük 50 şirket/endpoint önerisi

## 3. Geliştirme Yol Haritası

1. Oturum açılmış LinkedIn hesabı ile `Insights` sekmesinde tam DOM yakalaması yapmak.
2. Seçicileri doğruladıktan sonra `companyInsightsScraper` modülünde kullanılmak üzere belgeyi güncellemek.
3. DOM değişikliklerini izlemek için `docs/throttling-guide.md` ile uyumlu otomasyon betiği hazırlamak.
