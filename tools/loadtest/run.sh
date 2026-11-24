#!/bin/sh
# Chạy thử tải bằng bot trên Firebase Emulator (không đụng dữ liệu thật).
# 1) Cần Java: brew install openjdk@21
# 2) Mở emulator với luật thật: (thư mục có firebase.json trỏ tới firebase-rules.json)
#    firebase emulators:start --only auth,database --project demo-rg
# 3) Chạy các mức tải:
cd "$(dirname "$0")/../.."
mkdir -p tools/loadtest/results
for n in ${TIERS:-100 250 500 1000}; do
  # Dọn database giả lập trước mỗi mức (quyền "owner" chỉ có trên emulator) để số liệu không lẫn lượt trước
  curl -s -X PUT "http://127.0.0.1:9000/.json?ns=demo-rg-default-rtdb" -H "Authorization: Bearer owner" -d '{}' > /dev/null
  node tools/loadtest/bots.js --bots $n --minutes 3 --ramp 30 --out tools/loadtest/results/bots-$n.json
done
