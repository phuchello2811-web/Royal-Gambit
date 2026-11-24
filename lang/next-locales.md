# Gói ngôn ngữ Royal Gambit

Royal Gambit có tiếng Việt, tiếng Anh và 19 gói bổ sung. Mỗi gói chứa 2.930 chuỗi từ giao diện và nội dung có bản tiếng Anh. Khóa của mỗi chuỗi là mã băm FNV-1a trên từng đơn vị UTF-16 của bản tiếng Anh ở dạng NFC, khớp với `hkey` trong `i18n.js`.

Bản dịch gồm phần Claude đã soạn, phần được rà thủ công và phần tạo bằng mô hình dịch cục bộ. Phần Punjabi bổ sung dùng chuyển tự Gurmukhi sang Shahmukhi. [M2M100](https://huggingface.co/facebook/m2m100_418M) · [OPUS-MT](https://opus-mt.eu/) · [Paar](https://udgamlabs.com/models/paar) · [NITHUB](https://huggingface.co/NITHUB-AI/marian-mt-bbc-en-pcm) · [Aksharamukha](https://aksharamukha.com/)

## 10 ngôn ngữ bổ sung sau nhóm đầu

| Mã gói | Tên trong danh sách | Locale cho `Intl` | Tên tiếng Việt | Chiều |
| --- | --- | --- | --- | --- |
| `ur` | اردو | `ur-PK` | tiếng Urdu | RTL |
| `de` | Deutsch | `de-DE` | tiếng Đức | LTR |
| `ja` | 日本語 | `ja-JP` | tiếng Nhật | LTR |
| `pcm` | Naijá | `pcm-NG` | tiếng Pidgin Nigeria | LTR |
| `mr` | मराठी | `mr-IN` | tiếng Marathi | LTR |
| `te` | తెలుగు | `te-IN` | tiếng Telugu | LTR |
| `sw` | Kiswahili | `sw-KE` | tiếng Swahili | LTR |
| `ha` | Hausa | `ha-Latn-NG` | tiếng Hausa (chữ Latinh) | LTR |
| `tr` | Türkçe | `tr-TR` | tiếng Thổ Nhĩ Kỳ | LTR |
| `pnb` | پنجابی (شاہ مکھی) | `pa-Arab-PK` | tiếng Punjabi Tây (chữ Shahmukhi) | RTL |

Chọn theo tổng số người nói (L1 + L2), bỏ qua các ngôn ngữ đã có và các biến thể thuộc nhóm Ả Rập hoặc Trung. [Ethnologue 200, bản 2026](https://shop.ethnologue.com/products/2026-ethnologue-200) · [Bảng số liệu công khai](https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers#Ethnologue_(2026))

## Cập nhật bản dịch

1. Thêm bản tiếng Anh cho chuỗi giao diện vào `EN` hoặc `TPL` trong `i18n.js`. Nội dung khoá học lấy từ `lessons-en.js`, bài kiến thức lấy từ `knowledge-en.js`, khai cuộc và câu đố lấy từ dữ liệu đã có trong ứng dụng.
2. Khi thêm bản dịch, giữ các biến `{0}`, `{1}` và ký hiệu ô cờ, nước đi. Tăng `PACK_V` khi phát hành gói mới để trình duyệt lấy đúng bản dịch.
3. Bố cục trong `rtl.css` áp dụng cho `ar`, `ur`, `pnb`. Giữ bàn cờ và các nút tua nước đi theo thứ tự trái sang phải để khớp các phím ← và →.
