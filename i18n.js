// Đa ngôn ngữ: Tiếng Việt (gốc) / English.
//
// Cách hoạt động: toàn bộ giao diện viết bằng tiếng Việt như cũ. Khi chọn English, một MutationObserver theo dõi
// mọi chữ xuất hiện trên trang (kể cả chữ do JavaScript tạo sau này) và đổi sang tiếng Anh theo:
//   1. EN: bảng dịch nguyên câu (khớp chính xác, bỏ khoảng trắng đầu/cuối);
//   2. TPL: mẫu câu có biến, viết {0}, {1}… ở chỗ thay đổi; phần biến cũng được dịch nếu có trong EN;
//   3. câu ghép bằng " · " được tách ra dịch từng đoạn.
// Câu chưa có bản dịch thì giữ nguyên tiếng Việt. Thêm bản dịch: thêm một dòng vào EN hoặc TPL.
// Nội dung 106 bài Học cờ (lessons.js) hiện chỉ có tiếng Việt.

const I18N = (() => {
  const KEY = 'rg-lang';
  const LANGS = [['vi', 'Tiếng Việt'], ['en', 'English']];
  let lang = 'vi';
  try { const s = localStorage.getItem(KEY); if (s === 'en' || s === 'vi') lang = s; } catch {}

  const EN = {
    // ----- Điều hướng & chung -----
    'Chơi': 'Play', 'Học cờ': 'Learn', 'Thư viện': 'Library', 'Câu đố': 'Puzzles', 'Nhật ký': 'History',
    'Xếp hạng': 'Leaderboard', 'Bảng điểm': 'Standings', 'Đóng': 'Close', 'Tải lại': 'Reload',
    'Quay lại': 'Back', 'Hủy': 'Cancel', 'Tạo': 'Create', 'Đồng ý': 'Accept', 'Từ chối': 'Decline',
    'Bạn': 'You', 'Máy': 'Computer', 'Trắng': 'White', 'Đen': 'Black', 'Ngẫu nhiên': 'Random',
    'Dễ': 'Easy', 'Trung bình': 'Medium', 'Khó': 'Hard', 'Đang tải…': 'Loading…', 'Đang diễn ra': 'Live',
    'Viết bằng HTML, CSS và JavaScript thuần · Quân cờ: cburnett (Colin M.L. Burnett, GPLv2+)': 'Built with plain HTML, CSS and JavaScript · Pieces: cburnett (Colin M.L. Burnett, GPLv2+)',
    'Rank và Elo của bạn': 'Your rank and Elo', 'Trang hồ sơ của bạn': 'Your profile',
    'Thiếu file mới: hãy thay đủ index.html, app.js, profile.js, online.js, contest.js, lessons.js, learn.js, sound.js, style.css rồi bấm Ctrl+F5': 'Some files are out of date: replace index.html, app.js, profile.js, online.js, contest.js, lessons.js, learn.js, sound.js, style.css and press Ctrl+F5',
    'Ngôn ngữ': 'Language',
    // ----- Nhật ký (v15) -----
    'Tự lưu sau mỗi ván · xem lại từng nước · phân tích · tải PGN': 'Saved after every game · replay move by move · analyse · download PGN',
    'ván đã lưu': 'saved games', 'tỉ lệ thắng': 'win rate', 'độ chính xác TB': 'avg accuracy', 'Elo 20 ván gần nhất': 'Elo, last 20 games',
    'Mọi chế độ': 'All modes', 'Đấu máy': 'Vs computer', 'Xem lại': 'Replay', 'Phân tích': 'Analyse', 'Hôm qua': 'Yesterday',
    'Tải PGN các ván đang lọc': 'Download PGN of filtered games', 'Tìm đối thủ, chế độ…': 'Search opponent, mode…', 'Tìm ván': 'Search games',
    'Chế độ': 'Mode', 'Xem lại trên bàn cờ': 'Replay on the board', 'Xóa ván này': 'Delete this game', 'Không có ván nào khớp bộ lọc.': 'No games match the filter.',
    'Chấm từng nước bằng Stockfish, thêm nước hớ vào Sổ luyện lỗi': 'Grade every move with Stockfish and add blunders to the Mistake Notebook',
    'Không đọc được PGN của ván này.': 'Could not read this game\'s PGN.', 'Không phân tích được ván này.': 'Could not analyse this game.',
    'Không có ván nào để tải.': 'No games to download.', 'Đã tải ván · dùng ◀ ▶ hoặc phím ← → để xem từng nước': 'Game loaded · use ◀ ▶ or ← → to step through it',
    'cầm Trắng': 'played White', 'cầm Đen': 'played Black',
    // ----- Bảng xếp hạng (v15) -----
    'Huy chương': 'Medals', 'Vị trí của bạn': 'Your position', 'Tổng': 'Total', 'dẫn đầu bảng!': 'top of the board!',
    'Tổng huy chương Contest · xếp theo Vàng, rồi Bạc, rồi Đồng': 'Contest medal table · sorted by gold, then silver, then bronze',
    'Toàn thế giới · 100 người Elo cao nhất · tính cả ván đấu máy': 'Worldwide · top 100 by Elo · includes games vs computer',
    'Toàn thế giới · xếp theo exp rank (chỉ ván Online)': 'Worldwide · sorted by rank exp (online games only)',
    'Chưa có ai giành huy chương. Contest đầu tiên đang chờ bạn!': 'Nobody has won a medal yet. The first contest is waiting for you!',
    'vài huy chương': 'a few medals', 'Vàng ': 'Gold ',
    // ----- Contest (v15) -----
    'Của tôi': 'Mine', 'người tham gia': 'players', 'ván đã đấu': 'games played', 'thời lượng': 'duration', 'vô địch': 'champion', 'đang dẫn đầu': 'leading',
    'Thành tích của bạn': 'Your result', 'Thêm vào lịch': 'Add to calendar', 'Sao chép link': 'Copy link', 'Sửa': 'Edit', 'Sửa contest': 'Edit contest',
    'Lưu thay đổi': 'Save changes', 'Tạo contest mới': 'New contest', 'Tạo contest': 'Create contest', 'Đã sao chép link contest': 'Contest link copied',
    'Bạn đã tham gia': 'You took part', 'Bạn đã đăng ký ✓': 'You are registered ✓', 'Không có contest nào ở mục này.': 'No contests in this section.',
    'Contest đã bắt đầu: chỉ sửa được tên và mô tả.': 'The contest has started: only the name and description can be edited.', 'Đã lưu thay đổi.': 'Changes saved.',
    'Contest đã bắt đầu nên không đổi được giờ.': 'The contest has started, so its time cannot change.', 'Contest này không còn tồn tại.': 'This contest no longer exists.',
    // ----- Quản trị (v15) -----
    'Thông báo toàn web': 'Site announcement', 'Bị mute': 'Muted', 'Vai trò': 'Role', 'Tên A–Z': 'Name A–Z', 'Elo cao nhất': 'Highest Elo',
    'Exp cao nhất': 'Highest exp', 'Nhiều ván nhất': 'Most games', 'Hoạt động gần đây': 'Recently active', 'Có danh hiệu': 'Titled', 'Chưa chơi Online': 'No online games',
    'Danh hiệu': 'Title', 'Sắp xếp': 'Sort', 'Xem hồ sơ': 'View profile', 'Vĩnh viễn': 'Permanent', 'vĩnh viễn': 'permanent', 'Lý do (không bắt buộc)': 'Reason (optional)',
    'Hoạt động 7 ngày': 'Active (7 days)', 'Mute': 'Mute', 'Mute chat': 'Mute chat',
    'Tải danh sách người chơi (CSV, mở được bằng Excel)': 'Download the player list (CSV, opens in Excel)',
    'Chủ web cấp / thu hồi quyền admin và danh hiệu. Admin được dùng Gợi ý trong ván Online (vẫn tính Elo/rank) và có thể': 'The owner grants / revokes admin rights and titles. Admins can use Hint in online games (still rated) and can',
    'người chơi nói tục. Cần luật Firebase có mục': 'abusive players. Requires Firebase rules with the',
    'Thông báo hiện thành một thanh ở đầu trang cho mọi người chơi (kể cả khách chưa đăng nhập vào ván). Người chơi có thể tắt thanh này; thông báo mới sẽ hiện lại.': 'The announcement appears as a bar at the top of the page for every player. Players can dismiss it; a new announcement shows again.',
    'Nội dung (tối đa 300 ký tự)': 'Message (max 300 characters)', 'Kiểu thông báo': 'Type', 'Thông tin': 'Info', 'Sự kiện': 'Event', 'Cảnh báo': 'Warning',
    'Tự ẩn sau': 'Hide automatically after', 'Không tự ẩn': 'Never', 'Đăng thông báo': 'Post announcement', 'Gỡ thông báo': 'Remove announcement',
    'Hiện không có thông báo nào.': 'No announcement right now.', 'Nội dung thông báo quá ngắn.': 'The message is too short.',
    'Đã đăng thông báo cho mọi người chơi.': 'Announcement posted for every player.', 'Đã gỡ thông báo.': 'Announcement removed.', 'Gỡ thông báo đang hiện?': 'Remove the current announcement?',
    'Máy chủ từ chối: hãy dán luật Firebase mới (có mục "announce") rồi bấm Publish.': 'Denied by the server: paste the new Firebase rules (with "announce") and press Publish.',
    'Ẩn thông báo này': 'Hide this announcement',
    'Ví dụ: Tối thứ Sáu 20:00 có contest Blitz, đăng ký ngay trong tab Contest!': 'E.g. Blitz contest on Friday at 20:00 — register in the Contest tab!', '1 nước': '1 move', '1 thế cờ đến hạn ôn hôm nay': '1 position due today', '1 ván': '1 game', 'Chuỗi ngày học': 'Study streak', 'Hôm nay': 'Today', 'Số ngày liên tiếp giải câu đố hôm nay': 'Days in a row solving the daily puzzle',
    'Giải không sai, không gợi ý': 'Solved with no mistakes and no hints', 'Nước hớ: mất ≥30% cơ hội thắng': 'Blunder: loses ≥30% winning chances',
    'Nước sai: mất ≥20% cơ hội thắng': 'Mistake: loses ≥20% winning chances', 'Thiếu chính xác: mất ≥10% cơ hội thắng': 'Inaccuracy: loses ≥10% winning chances',
    'Thời gian hết': 'Time is up', 'Ngôn ngữ / Language': 'Language / Ngôn ngữ',
    'Nội dung các bài Học cờ hiện chỉ có tiếng Việt. Giao diện vẫn hiển thị tiếng Anh.': 'Lesson content is currently available in Vietnamese only. The rest of the interface is in English.',

    // ----- Bàn cờ & bảng điều khiển -----
    'Bàn cờ': 'Board', 'Đánh giá thế cờ (ước lượng)': 'Position evaluation (estimate)',
    'Đấu với máy': 'Vs computer', '2 người cùng máy': '2 players, 1 device', 'Bạn cầm': 'You play',
    'Thời gian': 'Time', 'Đấu với máy – cầm Trắng': 'Vs computer – play White', 'Đấu với máy – cầm Đen': 'Vs computer – play Black',
    'Dễ · 800': 'Easy · 800', 'Trung bình · 1200': 'Medium · 1200', 'Khó · 1600': 'Hard · 1600',
    'Không giới hạn': 'Unlimited', 'Không giới hạn thời gian': 'Unlimited time', 'không giới hạn thời gian': 'unlimited time',
    '1 phút': '1 min', '5 phút': '5 min', '10 phút': '10 min', '30 phút': '30 min',
    'Bắt đầu ván': 'Start game', 'Ván mới': 'New game', 'Đi lại': 'Undo', 'Đi tiếp': 'Redo', 'Gợi ý': 'Hint',
    'Xoay': 'Flip', 'Xin thua': 'Resign', 'Âm': 'Sound', 'Đánh giá': 'Eval',
    'Đi lại (Z)': 'Undo (Z)', 'Đi tiếp (Y)': 'Redo (Y)', 'Gợi ý (H)': 'Hint (H)', 'Xoay bàn (F)': 'Flip board (F)',
    'Bật/tắt âm thanh': 'Toggle sound', 'Bật/tắt thanh đánh giá': 'Toggle evaluation bar', 'Sao chép PGN': 'Copy PGN',
    'Xoay bàn': 'Flip board', 'Biên bản': 'Moves', 'Chưa có nước đi nào': 'No moves yet', 'Chưa có nước đi': 'No moves yet',
    'Đang xem lại · bấm «Live» hoặc đi nước mới để về ván hiện tại': 'Reviewing · press «Live» or make a move to return to the game',
    'Sao chép PGN để phân tích ở web khác': 'Copy PGN to analyse elsewhere', 'Sao chép FEN thế cờ hiện tại': 'Copy FEN of the current position',
    'Đầu ván': 'Start', 'Nước trước': 'Previous move', 'Về hiện tại': 'Back to live', 'Nước sau': 'Next move', 'Cuối ván': 'End',
    'Tốt Con': 'Little Pawn', 'Mã Chiến': 'War Knight', 'Hậu Đen': 'Black Queen',
    'Mới tập chơi, hay đi nước ngẫu hứng': 'Just learning, plays on a whim', 'Biết chiến thuật, ít khi bỏ quân': 'Knows tactics, rarely hangs pieces',
    'Stockfish mạnh, hiếm khi sai': 'Strong Stockfish, rarely errs', '· ván tập': '· practice game',
    'Máy đang suy nghĩ': 'Computer is thinking', '– đang bị chiếu!': '– in check!', 'Hòa –': 'Draw –',
    'Chiếu hết': 'Checkmate', 'Hết nước đi (pat)': 'Stalemate', 'Luật 50 nước': '50-move rule',
    'Lặp lại thế cờ 3 lần': 'Threefold repetition', 'Không đủ quân để chiếu hết': 'Insufficient material',
    'Dùng Gợi ý thì ván này sẽ không tính Elo. Tiếp tục?': 'Using a hint makes this game unrated. Continue?',
    'Đang tính gợi ý (Stockfish)…': 'Calculating hint (Stockfish)…', 'Gợi ý đã sẵn sàng': 'Hint ready', 'Không tính được gợi ý': 'Could not compute a hint',
    'Bỏ ván giữa chừng sẽ bị tính thua và mất Elo. Tiếp tục?': 'Abandoning the game counts as a loss and costs Elo. Continue?',
    'Ván tập từ Thư viện · không tính Elo': 'Library practice game · unrated', '2 người cùng máy không tính Elo': '2-player games are unrated',
    'Ván này không tính Elo vì đã dùng Đi lại': 'This game is unrated because Undo was used',
    'Ván này không tính Elo vì đã dùng Gợi ý / Đi lại': 'This game is unrated because Hint / Undo was used',
    'Đi lại thì ván này sẽ không tính Elo. Tiếp tục?': 'Undoing makes this game unrated. Continue?',
    'Bạn chắc chắn muốn xin thua?': 'Are you sure you want to resign?', 'Ván tập từ Thư viện không tính Elo': 'Library practice games are unrated',
    'Ván tập từ Thư viện không tính Elo.': 'Library practice games are unrated.',
    'Ván có dùng Đi lại nên không tính Elo': 'Undo was used, so the game is unrated',
    'Ván có dùng Gợi ý / Đi lại nên không tính Elo': 'Hint / Undo was used, so the game is unrated',
    'Ván quá ngắn nên không tính rank và Elo': 'Game too short to count for rank and Elo', 'Ván quá ngắn nên không tính Elo': 'Game too short to count for Elo',
    'Người chơi Trắng': 'White player', 'Người chơi Đen': 'Black player', '2 người': '2 players', 'Ván tập từ Thư viện': 'Library practice',
    'Tắt âm thanh': 'Mute sound', 'Bật âm thanh': 'Turn sound on', 'Đã bật âm': 'Sound on', 'Đã tắt âm': 'Sound off',
    'Ẩn thanh đánh giá': 'Evaluation bar hidden', 'Hiện thanh đánh giá': 'Evaluation bar shown',
    'Đã sao chép': 'Copied', 'Không sao chép được — hãy thử lại': 'Could not copy — try again', 'Đã sao chép PGN': 'PGN copied', 'Đã sao chép FEN': 'FEN copied',
    'Phong cấp tốt thành': 'Promote pawn to', 'Rời phòng giữa ván sẽ bị tính thua. Tiếp tục?': 'Leaving mid-game counts as a loss. Continue?',
    'Đang giải câu đố: dùng nút Gợi ý hoặc Đáp án trong khung câu đố.': 'Solving a puzzle: use the Hint or Solution buttons in the puzzle panel.',
    'Chỉ mời được ván mới khi ván hiện tại đã kết thúc.': 'You can only offer a new game once the current one has ended.',
    // ----- Nhật ký: nhập ván, kết quả ván 2 người; bàn cờ 3D; tự lưu ván -----
    'Chưa có contest nào. Hãy bấm "Tạo contest" ở trên.': 'No contests yet. Press "Create contest" above.', 'Chưa có contest nào.': 'No contests yet.',
    'Không kết nối được máy chủ trung gian (mạng yếu hoặc máy chủ đang quá tải). Hãy thử lại sau ít phút.': 'Could not reach the relay server (weak connection or the server is busy). Please try again in a few minutes.',
    'Đang đồng bộ với tài khoản…': 'Syncing with your account…',
    'Đã đồng bộ với tài khoản: xem được trên mọi máy bạn đăng nhập': 'Synced with your account: available on every device you sign in on',
    'Nhật ký được đồng bộ với tài khoản': 'Your history is synced with your account',
    'Chưa đồng bộ được: máy chủ chưa cho lưu nhật ký. Chủ web cần dán lại firebase-rules.json (có mục "history") rồi bấm Publish.': 'Not synced: the server does not allow saving history yet. The site owner needs to paste the new firebase-rules.json (with "history") and press Publish.',
    'Chưa đồng bộ được (mất mạng). Ván vẫn lưu trên máy này và sẽ đồng bộ lại sau.': 'Not synced (offline). Games are kept on this device and will sync later.',
    'Chưa đồng bộ được, sẽ thử lại sau.': 'Not synced yet, will retry later.',
    // ----- Đăng nhập Google, chế độ khách, thông báo Gmail -----
    'Đăng nhập bằng Google': 'Sign in with Google', 'Chơi với tư cách khách': 'Play as a guest',
    'Khách: đấu máy, 2 người, câu đố, học cờ. Không có rank / Elo, không chơi Online, không tham gia contest.': 'Guests can play the computer, 2-player games, puzzles and lessons. No rank / Elo, no online play, no contests.',
    'Chào bạn! Hãy chọn tên hiển thị cho tài khoản Google này. Tên hiện trên bảng xếp hạng và không đổi được.': 'Welcome! Choose a display name for this Google account. It appears on the leaderboard and cannot be changed.',
    'Tên hiển thị': 'Display name', 'Vào chơi': 'Start playing', 'Dùng tài khoản khác': 'Use another account',
    'Gửi thông báo về Gmail (contest mới, contest đã đăng ký sắp bắt đầu)': 'Email notifications to Gmail (new contests, registered contests about to start)',
    'Đăng nhập bằng Google để nhận thông báo qua Gmail.': 'Sign in with Google to receive notifications by Gmail.',
    'Đã tắt thông báo qua Gmail': 'Gmail notifications turned off', 'Không lưu được, kiểm tra mạng rồi thử lại.': 'Could not save, check your connection and try again.',
    'Máy chủ chưa cho lưu: chủ web cần dán lại firebase-rules.json (có mục "notify") rồi bấm Publish.': 'Not allowed by the server yet: the site owner needs to paste the new firebase-rules.json (with "notify") and press Publish.',
    'Chế độ khách: không tính Elo, không xếp hạng · đăng nhập để có Elo và rank': 'Guest mode: unrated, no ranking · sign in to get Elo and rank',
    'Chế độ khách không tính Elo': 'Guest games are unrated', 'Chế độ khách': 'Guest mode', 'Bạn đang chơi với tư cách khách': 'You are playing as a guest',
    'Đăng nhập (hoặc dùng Google) để có rank, Elo, chơi Online, tham gia contest và đồng bộ nhật ký giữa các máy.': 'Sign in (or use Google) to get a rank and Elo, play online, join contests and sync your history across devices.',
    'Đăng nhập / Đăng ký': 'Sign in / Sign up', 'Đăng nhập để tham gia contest': 'Sign in to join contests', 'Chế độ khách không tham gia contest được.': 'Guests cannot join contests.',
    'Link mời là ván Online: hãy đăng nhập để vào phòng.': 'This invite is for an online game: please sign in to join the room.',
    'chơi Online': 'play online', 'tham gia contest': 'join contests', 'có hồ sơ, rank và Elo': 'have a profile, rank and Elo',
    'Máy chủ chưa bật cách đăng nhập này (Firebase Console › Authentication › Sign-in method, xem README).': 'This sign-in method is not enabled on the server (Firebase Console › Authentication › Sign-in method, see README).',
    'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép cửa sổ bật lên rồi thử lại.': 'The browser blocked the Google sign-in window. Allow pop-ups and try again.',
    'Tên miền của web chưa được thêm vào Firebase (Authentication › Settings › Authorized domains).': 'This site\'s domain is not added in Firebase (Authentication › Settings › Authorized domains).',
    'Phiên đăng nhập đã hết, hãy đăng nhập lại.': 'Your session expired, please sign in again.', 'Đăng nhập bằng Google cần cấu hình Firebase (xem README).': 'Google sign-in requires Firebase to be configured (see README).',
    'hoặc': 'or',
    'Trắng thắng': 'White won', 'Đen thắng': 'Black won', 'Ván nhập': 'Imported', 'Nhập PGN': 'Import PGN',
    'Dán PGN / FEN từ chess.com, lichess… để phân tích': 'Paste a PGN / FEN from chess.com, lichess… to analyse',
    'Dán PGN của một ván (từ chess.com, lichess…) hoặc một thế cờ FEN': 'Paste the PGN of a game (from chess.com, lichess…) or a FEN position',
    'Không (chỉ phân tích)': 'Neither (analysis only)', 'Nhập & phân tích': 'Import & analyse', 'Xóa ván này khỏi nhật ký?': 'Delete this game from your history?',
    'Hãy dán PGN của một ván hoặc một thế cờ FEN.': 'Paste the PGN of a game or a FEN position.',
    'FEN không hợp lệ (kiểm tra số ô mỗi hàng, Vua của hai bên…).': 'Invalid FEN (check the squares per rank, both kings…).',
    'Thẻ [FEN] trong PGN không hợp lệ.': 'The [FEN] tag in the PGN is invalid.', 'Không tìm thấy nước đi nào trong PGN.': 'No moves found in the PGN.',
    'Không lưu được ván này.': 'Could not save this game.', 'Có lỗi khi nhập ván, thử lại.': 'Something went wrong importing the game, try again.',
    'Đã nhập ván nhưng không phân tích được (chưa tải được Stockfish).': 'Game imported but could not be analysed (Stockfish failed to load).',
    'Đã đặt thế cờ lên bàn (2 người) · có thể đi tiếp, xoay bàn, sao chép FEN': 'Position set up on the board (2 players) · play on, flip, copy FEN',
    'Bàn cờ nổi 3D (ánh sáng, bóng đổ, quân nhấc lên)': '3D raised board (lighting, shadows, lifted pieces)',
    'Góc nhìn nghiêng 3D (quân đứng trên bàn)': 'Tilted 3D view (pieces stand on the board)',
    // ----- Phân tích ván kiểu chess.com -----
    'Thiên tài': 'Brilliant', 'Tuyệt vời': 'Great', 'Tốt nhất': 'Best', 'Xuất sắc': 'Excellent', 'Nước tốt': 'Good', 'Lý thuyết': 'Book',
    'Thiếu chính xác': 'Inaccuracy', 'Sai lầm': 'Mistake', 'Bỏ lỡ': 'Miss', 'Bắt buộc': 'Forced',
    'là nước thiên tài!': 'is a brilliant move!', 'là nước tuyệt vời: nước duy nhất giữ được thế cờ': 'is a great move: the only move that holds the position',
    'là nước tốt nhất': 'is the best move', 'là nước xuất sắc': 'is an excellent move', 'là nước tốt': 'is a good move',
    'là nước lý thuyết khai cuộc': 'is a book move', 'là nước thiếu chính xác': 'is an inaccuracy', 'là một sai lầm': 'is a mistake',
    'bỏ lỡ cơ hội trừng phạt sai lầm của đối thủ': 'misses the chance to punish the opponent\'s mistake', 'là nước hớ': 'is a blunder',
    'là nước bắt buộc (duy nhất)': 'is forced (the only legal move)', 'Nước tốt nhất:': 'Best move:', 'Phân tích ván': 'Game review',
    'Tắt phân tích': 'Close review', 'Thế xuất phát · bấm ▶ hoặc phím → để xem từng nước': 'Starting position · press ▶ or → to step through the moves',
    'Nước này chưa được phân tích': 'This move has not been analysed', 'Xem lại từng nước': 'Review move by move',
    'Stockfish đang phân tích từng nước của ván…': 'Stockfish is analysing every move of the game…',
    'Bạn không có nước hớ hay sai lầm nào. Rất tốt!': 'You made no blunders or mistakes. Well played!', 'Xem phân tích': 'View review',
    'Xem lại từng nước kèm xếp loại (thiên tài, tốt nhất, nước hớ…)': 'Step through the moves with their classification (brilliant, best, blunder…)',
    'Đã tải ván kèm phân tích · dùng ◀ ▶ hoặc phím ← → để xem từng nước': 'Game loaded with its review · use ◀ ▶ or ← → to step through it',
    

    // ----- Kết quả & nhận xét -----
    'Hòa!': 'Draw!', 'Bạn thắng!': 'You won!', 'Bạn thua': 'You lost', 'Hòa': 'Draw', 'Thắng': 'Win', 'Thua': 'Loss',
    'Ván contest tiếp theo': 'Next contest game', 'Mời chơi ván mới': 'Offer a rematch', 'Xem bàn cờ': 'View board',
    'Nhận xét ván đấu': 'Game review', 'Chiến thắng': 'Victory', 'Thất bại': 'Defeat', 'Kết thúc sớm': 'Ended early',
    'Ván ngắn': 'Short game', 'Ván dài': 'Long game', 'Ván rất ngắn': 'Very short game', 'Chưa nhập thành': 'No castling',
    'Đã nhập thành': 'Castled', 'Hậu ra sớm': 'Early queen', 'Mất Hậu': 'Queen lost', 'Ăn Hậu': 'Queen won',
    'Nước đáng tiếc': 'Regrettable move', 'Gợi ý:': 'Tip:', 'và': 'and', 'Nước': 'Move',
    'Ván khá ngắn: khai cuộc chưa kịp triển khai hết quân. Cố gắng nhập thành sớm và phát triển Mã/Tượng trước khi tấn công.': 'A fairly short game: the pieces were not fully developed. Castle early and develop knights and bishops before attacking.',
    'Đấu ở mức trung bình về độ dài — hai bên đã qua giai đoạn khai cuộc.': 'A medium-length game — both sides got past the opening.',
    'Bạn chưa nhập thành trong ván này. Nhập thành giúp vua an toàn và đưa Xe vào trận sớm hơn.': 'You did not castle this game. Castling keeps the king safe and brings the rook into play sooner.',
    '). Hậu dễ bị quấy rồi mất nhịp triển khai.': '). An early queen gets harassed and costs development time.',
    'Bạn bị chiếu khá nhiều. Khi bị chiếu, ưu tiên nước an toàn, tránh bỏ quân khi chạy vua.': 'You were checked a lot. When in check, prefer safe moves and avoid dropping pieces while running.',
    'Ưu tiên nhập thành trong 8–12 nước đầu.': 'Aim to castle within the first 8–12 moves.',
    'Triển khai Mã và Tượng trước, Hậu ra sau.': 'Develop knights and bishops first, the queen later.',
    'Chủ động tìm cách mở đường và trao đổi quân khi bị động.': 'When passive, look to open lines and trade pieces.',
    'Khi bị tấn công, kiểm tra tất cả nước chiếu và ô thoát của vua.': 'Under attack, check every checking move and every escape square of your king.',
    'Phát huy thế thắng: khi hơn quân, hãy đơn giản hóa (đổi quân) để vào tàn cuộc.': 'Convert your advantage: when ahead in material, simplify (trade pieces) into an endgame.',
    'Mỗi ván hãy xem lại 1–2 nước then chốt — tiến bộ sẽ rất nhanh.': 'Review 1–2 key moves after every game — you will improve fast.',
    'Ván quá ngắn để nhận xét sâu. Chơi thêm vài nước nữa để có phân tích hữu ích hơn.': 'Too short for a meaningful review. Play a few more moves next time.',
    'Hậu': 'Queen', 'Tượng': 'Bishop', 'Mã': 'Knight', 'Tốt': 'Pawn', 'Xe': 'Rook', 'Vua': 'King',

    // ----- Sổ luyện lỗi -----
    'Huấn luyện viên đang chấm từng nước của bạn…': 'The coach is grading each of your moves…',
    'Không phân tích được ván này (chưa tải được Stockfish).': 'Could not analyse this game (Stockfish failed to load).',
    'Không có nước hớ hay nước sai nào. Rất tốt!': 'No blunders or mistakes. Well played!',
    'Thế cờ trong Sổ luyện lỗi đến hạn ôn': 'Mistake Notebook positions due for review',
    'Sổ luyện lỗi của bạn': 'Your Mistake Notebook', 'Huấn luyện viên riêng': 'Personal coach',
    'Chơi một ván với máy hoặc Online: sau ván, web tự chấm từng nước bằng Stockfish và biến các nước hớ của bạn thành câu đố riêng để ôn lại. Càng chơi, sổ càng sát điểm yếu của bạn.': 'Play a game against the computer or online: afterwards Stockfish grades every move and turns your blunders into personal puzzles to review. The more you play, the better it targets your weak spots.',
    'Hôm nay không còn thế cờ nào đến hạn': 'Nothing due today', 'Đã ôn xong': 'All reviewed', 'Nước hớ': 'Blunder', 'Nước sai': 'Mistake',
    'Hôm nay đã ôn hết sổ luyện lỗi!': 'You have reviewed the whole notebook for today!', 'Đã ôn hết sổ luyện lỗi hôm nay!': 'You have reviewed the whole notebook for today!',
    'Đang kiểm tra nước của bạn…': 'Checking your move…', 'Nước này cũng tốt ngang nước của máy!': 'That move is as good as the engine\'s!',
    'Chưa đủ tốt: nước này vẫn để mất nhiều lợi thế. Thử lại nhé.': 'Not good enough: that still gives away a lot. Try again.',
    'Đã giải, nhưng có sai / dùng gợi ý nên thế cờ sẽ quay lại sau 10 phút.': 'Solved, but with a mistake / hint, so this position will come back in 10 minutes.',
    'Thế cờ tiếp': 'Next position', 'Đã ôn hết hôm nay!': 'All done for today!', 'Xong': 'Done', 'Từ ván của bạn': 'From your games', 'Ván cờ': 'Game',

    // ----- Câu đố -----
    'Câu đố chiến thuật': 'Tactics puzzles', 'Mate ngắn, đòn chĩa, xiên, chiếu mở — luyện mắt cờ': 'Short mates, forks, skewers, discovered checks — train your eye',
    'câu đã giải': 'puzzles solved', 'ngày': 'days', 'hoàn hảo': 'perfect', 'Chủ đề:': 'Theme:', 'Giải ngay': 'Solve now',
    'Tất cả': 'All', 'Chưa giải': 'Unsolved', 'Chiếu hết 1 nước': 'Mate in 1', 'Chiếu hết 2 nước': 'Mate in 2', 'Đòn chiến thuật': 'Tactics',
    'Tìm nước chiếu hết ngay lập tức': 'Find the immediate checkmate', 'Một nước chuẩn bị, máy đáp trả, rồi chiếu hết': 'One quiet move, a reply, then mate',
    'Chĩa đôi, ghim, xiên, chiếu mở, phong cấp': 'Forks, pins, skewers, discovered checks, promotion',
    '🎉 Bạn đã giải hết các câu ở mục này!': '🎉 You have solved every puzzle here!', 'Đáp án': 'Solution', 'Câu khác': 'Another', 'Thoát': 'Exit',
    'Đã thoát câu đố': 'Puzzle closed', 'Tìm nước mạnh nhất.': 'Find the strongest move.', 'Quân cần đi đã được tô sáng.': 'The piece to move is highlighted.',
    'Đây là nước đúng. Máy đang đáp trả…': 'That is the right move. The computer replies…', 'Chính xác! Máy đang đáp trả…': 'Correct! The computer replies…',
    'Tiếp tục: tìm nước mạnh nhất.': 'Keep going: find the strongest move.', 'Hoàn hảo! Giải không sai lần nào.': 'Perfect! Solved without a single mistake.',
    'Hoàn thành câu đố!': 'Puzzle complete!', 'Câu tiếp theo': 'Next puzzle', 'Chưa đúng, thử nước khác.': 'Not quite, try another move.',
    'Giải hoàn hảo': 'Solved perfectly', 'Đã giải': 'Solved', '✓ Đã giải hôm nay · giải lại': '✓ Solved today · solve again',
    'Hàng cuối': 'Back rank', 'Xe và Mã': 'Rook & knight', 'Hậu và Tốt': 'Queen & pawn', 'Hậu và Tượng': 'Queen & bishop', 'Hậu và Mã': 'Queen & knight',
    'Tàn cuộc': 'Endgame', 'Chĩa đôi': 'Fork', 'Xiên': 'Skewer', 'Ghim': 'Pin', 'Chiếu mở': 'Discovered check', 'Phong cấp': 'Promotion',

    // ----- Online -----
    'Tìm trận nhanh': 'Quick match', 'Tự ghép với người đang tìm trận · màu quân ngẫu nhiên · tính rank và Elo': 'Paired with another player who is searching · random colours · rated for rank and Elo',
    'Tìm trận': 'Find match', 'Chơi với bạn bè': 'Play a friend', 'Tạo phòng & lấy link mời': 'Create room & get invite link',
    'hoặc vào phòng của bạn bè': 'or join a friend\'s room', 'Vào phòng': 'Join', 'Mã phòng': 'Room code', 'Link mời': 'Invite link',
    'Đang tìm đối thủ…': 'Looking for an opponent…', 'Đang tìm đối thủ': 'Looking for an opponent',
    'Bạn sẽ vào ván ngay khi có người khác bấm Tìm trận. Rủ bạn bè cùng bấm để gặp nhau nhanh hơn.': 'The game starts as soon as someone else presses Find match. Ask a friend to press it too to meet faster.',
    'Hủy tìm trận': 'Cancel search', 'Mã phòng của bạn': 'Your room code', 'Gửi mã hoặc link cho bạn bè. Ván bắt đầu ngay khi họ vào phòng.': 'Send the code or link to a friend. The game starts as soon as they join.',
    'Sao chép link': 'Copy link', 'Hủy phòng': 'Close room', 'Xin hòa': 'Offer draw', 'Mute chat đối thủ': 'Mute opponent chat', 'Rời phòng': 'Leave room',
    'Gợi ý (chỉ Admin)': 'Hint (admin only)', 'Nhắn tin cho đối thủ…': 'Message your opponent…', 'Tin nhắn': 'Message', 'Gửi': 'Send',
    'Tắt chat đối thủ (chỉ Admin)': 'Mute opponent chat (admin only)', 'Sẵn sàng đấu Online': 'Ready to play online', 'Đang kết nối': 'Connecting',
    'Đang kết nối…': 'Connecting…', 'Đang chờ đối thủ vào phòng…': 'Waiting for your opponent…', 'Đang chờ đối thủ vào phòng': 'Waiting for your opponent',
    'Đang tự ghép cặp contest…': 'Pairing for the contest…', 'Đang tự ghép cặp contest': 'Pairing for the contest',
    'Chiếu hết – Bạn thua': 'Checkmate – you lost', 'Chiếu hết – Bạn thắng': 'Checkmate – you won', 'Đối thủ đã rời phòng': 'Your opponent left',
    'Lượt của bạn': 'Your move', 'Chờ đối thủ đi': 'Waiting for opponent', 'Chờ đối thủ đi…': 'Waiting for opponent…', 'Đối thủ đã rời ván': 'Opponent left the game',
    'Đã sao chép link mời!': 'Invite link copied!', 'Bạn đã xin thua': 'You resigned', 'Bạn xin thua': 'You resigned',
    'Đã gửi lời xin hòa.': 'Draw offer sent.', 'Đã gửi lời mời chơi ván mới.': 'Rematch offer sent.', 'Đối thủ': 'Opponent',
    'Bạn đã bị admin tắt chat (mute). Không gửi được tin nhắn.': 'An admin has muted your chat. You cannot send messages.', 'Bạn đã bị admin tắt chat…': 'An admin has muted your chat…',
    'Đã mute': 'Muted', 'Không tìm thấy tài khoản đối thủ để mute.': 'Could not find the opponent\'s account to mute.',
    'Chỉ admin mới mute được. Cần luật Firebase có mục "mutes".': 'Only admins can mute. The Firebase rules need a "mutes" section.', 'Không mute được, thử lại sau.': 'Could not mute, try again later.',
    'Không tải được thư viện kết nối. Kiểm tra mạng Internet.': 'Could not load the connection library. Check your Internet connection.',
    'Mã phòng gồm 6 ký tự.': 'Room codes have 6 characters.', 'Không tìm thấy phòng. Kiểm tra lại mã phòng.': 'Room not found. Check the code.',
    'Mất kết nối tới máy chủ trung gian.': 'Lost connection to the signalling server.', 'Máy chủ kết nối đang lỗi, thử lại sau.': 'The connection server is having problems, try again later.',
    'Trình duyệt không hỗ trợ WebRTC.': 'This browser does not support WebRTC.', 'Lỗi kết nối:': 'Connection error:', 'Ván này tính điểm Contest.': 'This game counts for the contest.',
    'Bạn đang thi đấu contest này ở một tab hoặc máy khác, nên tab này dừng tự ghép cặp.': 'You are playing this contest in another tab or device, so this tab stopped auto-pairing.',
    'Phòng từ chối kết nối.': 'The room refused the connection.', 'Nhận được nước đi không hợp lệ từ đối thủ.': 'Received an illegal move from the opponent.',
    'Đối thủ xin thua – Bạn thắng': 'Opponent resigned – you won', 'Đối thủ xin thua': 'Opponent resigned', 'Đối thủ đã xin thua.': 'Your opponent resigned.',
    'Hòa – hai bên đồng ý': 'Draw – agreed', 'Hai bên đồng ý hòa': 'Draw by agreement', 'Đối thủ từ chối hòa.': 'Your opponent declined the draw.',
    'Ván contest không chơi lại được, web sẽ tự ghép ván tiếp theo.': 'Contest games cannot be replayed; the next pairing is automatic.',
    'Đối thủ chưa muốn chơi ván mới.': 'Your opponent does not want a rematch yet.', 'Phòng này đã đủ 2 người.': 'This room is full.',
    'Đối thủ đã rời phòng.': 'Your opponent left the room.', 'Kết nối bị đóng.': 'Connection closed.',
    'Chưa tìm được đối thủ. Hãy thử lại sau ít phút hoặc rủ bạn bè cùng bấm Tìm trận.': 'No opponent found. Try again in a few minutes or ask a friend to press Find match too.',
    'Bạn đã rời ván': 'You left the game', 'Bạn rời ván giữa chừng': 'You left mid-game', 'Đối thủ xin hòa.': 'Your opponent offers a draw.',
    'Đối thủ muốn chơi ván mới (đổi màu).': 'Your opponent wants a rematch (colours swapped).', 'Contest đã kết thúc.': 'The contest has ended.',

    // ----- Học cờ -----
    'Mục tiêu hằng ngày': 'Daily goal', 'Tiến độ khoá học': 'Course progress', 'Học tiếp': 'Continue', 'Luyện tập nhanh': 'Quick practice',
    'Luyện tập': 'Practice', 'Hoạt động 7 ngày': 'Last 7 days', 'Mục lục': 'Contents', 'Cách học': 'How it works', 'Nhảy cóc': 'Skip ahead',
    'Mỗi bài có 3 tim, đi sai mất 1 tim. Không sai và không dùng gợi ý thì được 3 sao. Học mỗi ngày để giữ chuỗi ngày học. Đã biết chơi? Bấm': 'Each lesson has 3 hearts; a wrong move costs one. No mistakes and no hints earns 3 stars. Study daily to keep your streak. Already know how to play? Press',
    'ở một phần để làm bài kiểm tra và mở khoá luôn phần đó.': 'on a unit to take a test and unlock it straight away.',
    'Chuỗi ngày học liên tiếp': 'Daily streak', 'Tổng điểm kinh nghiệm': 'Total XP', 'Số bài đã xong': 'Lessons completed',
    'Thoát bài học': 'Leave lesson', 'Số tim còn lại': 'Hearts left', 'Làm lại': 'Retry', 'Kiểm tra': 'Check', 'Tổng XP': 'Total XP',
    'Chính xác': 'Accuracy', 'Tiếp tục': 'Continue', 'Về lộ trình': 'Back to path', 'Tuyệt vời!': 'Awesome!', 'Chính xác!': 'Correct!',
    'Xuất sắc!': 'Excellent!', 'Giỏi lắm!': 'Well done!', 'Hay quá!': 'Great!',
    'Đó chưa phải nhập thành. Bấm vào Vua rồi chọn ô cách 2 ô về phía Xe.': 'That is not castling. Click the king, then the square two steps toward the rook.',
    'Hãy đưa Tốt tới hàng cuối.': 'Bring the pawn to the last rank.', 'Nước này chưa chiếu Vua Đen.': 'That move does not check the black king.',
    'Chưa phải chiếu đôi – cần cả hai quân cùng chiếu.': 'Not a double check – both pieces must give check.', 'Chưa chiếu hết – Vua Đen vẫn thoát được.': 'Not mate – the black king can still escape.',
    'Chưa đúng nước, thử lại nhé!': 'Not the right move, try again!', 'Đúng hướng rồi! Đen đáp lại…': 'On the right track! Black replies…',
    'Nước này để Đen thoát được. Tìm nước buộc Đen không còn đường chạy!': 'That lets Black escape. Find a move that leaves Black nowhere to run!',
    'Pat! Đen hết nước đi – ván hòa.': 'Stalemate! Black has no moves – draw.', 'Ván cờ hòa.': 'The game is drawn.', 'Mất Tốt rồi!': 'The pawn is lost!',
    'Đen đã bắt được Tốt!': 'Black caught the pawn!', 'Chưa được rồi': 'Not this time', 'Thử lại nhé!': 'Try again!', 'Chưa đúng': 'Not quite',
    'Gợi ý: đi quân ở ô được tô xanh tới ô đánh dấu.': 'Hint: move the piece on the green square to the marked square.', 'Luyện tập xong!': 'Practice complete!',
    'Hoàn thành bài học!': 'Lesson complete!', 'Hết tim rồi!': 'Out of hearts!', 'Đừng lo – làm lại bài, bạn sẽ giỏi hơn sau mỗi lần thử.': 'Don\'t worry – retry the lesson; every attempt makes you better.',
    'Thoát bây giờ thì tiến độ bài này sẽ mất. Thoát?': 'Leaving now loses your progress in this lesson. Leave?',
    'Bạn đã học xong cả khoá – tuyệt vời! Ôn lại bất cứ bài nào bạn thích.': 'You finished the whole course – amazing! Review any lesson you like.',
    'Làm bài kiểm tra để mở khoá phần này': 'Take the test to unlock this unit', 'Bắt đầu': 'Start',
    '5 thử thách ngẫu nhiên từ các bài bạn đã học · +5 XP': '5 random challenges from lessons you have done · +5 XP',
    'Học xong ít nhất 1 bài để mở luyện tập.': 'Finish at least one lesson to unlock practice.', 'Hoàn thành các bài phía trên để mở khoá bài này.': 'Complete the lessons above to unlock this one.',
    'Đang khoá': 'Locked', 'Ôn tập': 'Review', 'bấm vào ô': 'tap a square',

    // ----- Hồ sơ -----
    'Hồ sơ người chơi': 'Player profile', 'Đổi ảnh đại diện': 'Change avatar', 'Thành tích Online': 'Online record', 'Diễn biến Elo': 'Elo history',
    'Tủ huy chương Contest': 'Contest medals', 'Bấm vào huy chương để xem contest': 'Click a medal to open its contest', 'Lịch sử Contest': 'Contest history',
    'Ván gần đây': 'Recent games', 'Xem nhật ký': 'Open history', 'Cài đặt': 'Settings', 'Tải ảnh lên': 'Upload photo', 'Xóa ảnh': 'Remove photo',
    'Tuỳ chọn': 'Options', 'Âm thanh nước đi': 'Move sounds', 'Hiện toạ độ (a–h, 1–8)': 'Show coordinates (a–h, 1–8)', 'Chấm các nước đi hợp lệ': 'Show legal move dots',
    'Hiệu ứng trượt quân': 'Piece animation', 'Tự phong Hậu (không hỏi)': 'Auto-promote to queen', 'Thông báo khi contest đã đăng ký sắp bắt đầu': 'Notify me when a registered contest is about to start',
    'Phím tắt': 'Keyboard shortcuts', 'Đăng xuất': 'Log out', 'Khởi đầu': 'Starting rank', 'Người mới': 'Beginner', 'Cơ bản': 'Novice', 'Trung cấp': 'Intermediate',
    'Cao thủ': 'Advanced', 'Chuyên gia': 'Expert+', 'Huyền thoại': 'Legend',
    'Không tìm thấy người chơi này, hoặc không tải được dữ liệu. Kiểm tra mạng rồi bấm Tải lại.': 'Player not found, or the data could not be loaded. Check your connection and press Reload.',
    'vừa xong': 'just now', 'Chủ web': 'Owner', 'Chưa chọn trình độ': 'Level not chosen', 'Độ chính xác': 'Accuracy', 'trung bình 10 ván gần nhất': 'average of the last 10 games',
    'Ván tính Elo': 'Elo games', 'cả ván đấu máy': 'incl. vs computer', 'Ván Online': 'Online games', 'tính rank': 'ranked', 'Tỉ lệ thắng': 'Win rate',
    'ván Online': 'online games', 'Contest đã dự': 'Contests played', 'chưa có huy chương': 'no medals yet',
    'Chơi vài ván tính Elo (Online hoặc đấu máy) để thấy biểu đồ. Lịch sử Elo được lưu trên máy này.': 'Play a few rated games (online or vs computer) to see the chart. Elo history is stored on this device.',
    'Đang tải huy chương…': 'Loading medals…', 'Xem các contest sắp diễn ra': 'See upcoming contests', 'Đã đăng ký': 'Registered', 'Đang chốt kết quả': 'Finalising',
    'điểm': 'pts', 'chỉ tính ván Online': 'online games only', 'Xem các bậc rank': 'See all ranks', 'Kỳ vọng điểm của bạn:': 'Your expected score:',
    'ngày liên tiếp': 'day streak', 'XP hôm nay': 'XP today', 'Bắt đầu học': 'Start learning', 'Chưa có ván nào trong nhật ký.': 'No games in your history yet.',
    'Bạn chưa chơi ván Online nào.': 'You have not played any online games yet.', 'Người chơi này chưa chơi ván Online nào.': 'This player has not played any online games yet.',
    'Bạn chưa có huy chương nào. Lọt top 3 một contest để nhận huy chương Vàng, Bạc hoặc Đồng!': 'No medals yet. Finish top 3 in a contest to win gold, silver or bronze!',
    'Người chơi này chưa có huy chương nào.': 'This player has no medals yet.', 'Bạn chưa tham gia contest nào.': 'You have not joined any contests yet.',
    'Người chơi này chưa tham gia contest nào.': 'This player has not joined any contests yet.',
    'Vàng': 'Gold', 'Bạc': 'Silver', 'Đồng': 'Bronze', 'Bạch Kim': 'Platinum', 'Kim Cương': 'Diamond', 'Cao Thủ': 'Master', 'Thách Đấu': 'Challenger',
    'Contest này không còn tồn tại (có thể admin đã xóa).': 'This contest no longer exists (an admin may have deleted it).',
    'Quân cờ': 'Pieces', 'Đăng xuất giữa ván online sẽ bị tính thua. Tiếp tục?': 'Logging out mid-game counts as a loss. Continue?',
    'Ảnh quá lớn (tối đa 10 MB).': 'Image too large (max 10 MB).', 'Chỉ nhận ảnh PNG, JPG, WebP hoặc GIF.': 'Only PNG, JPG, WebP or GIF images.', 'Không đọc được ảnh này.': 'Could not read this image.',
    'Trình duyệt này không hỗ trợ thông báo.': 'This browser does not support notifications.',
    'Trình duyệt đang chặn thông báo của web này. Hãy cho phép trong cài đặt trang (biểu tượng ổ khoá cạnh địa chỉ web).': 'Your browser is blocking notifications from this site. Allow them in the site settings (padlock icon next to the address).',
    'Đã bật thông báo: web sẽ nhắc khi contest bạn đăng ký sắp bắt đầu (cần mở web trong trình duyệt).': 'Notifications on: you will be reminded when a registered contest is about to start (keep the site open in a tab).',
    'Xanh lá': 'Green', 'Gỗ': 'Wood', 'Xanh dương': 'Blue', 'Tím': 'Purple', 'Đêm': 'Night', 'Cẩm thạch': 'Marble', 'Đỏ': 'Red', 'Ngọc lục': 'Emerald',
    'Gỗ tối': 'Dark wood', 'Hoàng hôn': 'Sunset', 'Đại dương': 'Ocean', 'Mặc định': 'Default', 'Đen trắng': 'Mono', 'Băng': 'Ice', 'Lửa': 'Fire', 'Mềm': 'Soft', 'Hoàng gia': 'Royal', 'Pha lê': 'Crystal', 'Gỗ khắc': 'Carved wood', 'Ngọc': 'Jewel',
    'Khách': 'Guest',

    // ----- Phím tắt -----
    'Bấm': 'Press', 'ở bất cứ đâu để mở bảng này': 'anywhere to open this list', 'Đi lại / đi tiếp': 'Undo / redo', 'Gợi ý nước đi': 'Hint',
    'Xoay bàn cờ': 'Flip the board', 'Xem lại nước trước / sau': 'Step back / forward through moves', 'Về thế cờ hiện tại, đóng hộp thoại': 'Back to live position, close dialogs',
    'Chuột phải': 'Right click', 'Đánh dấu ô trên bàn cờ': 'Mark a square', 'Chọn đáp án / kiểm tra khi học cờ': 'Pick answer / check in lessons',

    // ----- Đăng nhập -----
    'Đăng nhập': 'Log in', 'Đăng ký': 'Sign up', 'Tên đăng nhập': 'Username', 'Mật khẩu': 'Password', 'Nhập lại mật khẩu': 'Repeat password', 'Tạo tài khoản': 'Create account',
    'Bạn là ai?': 'Who are you?', 'Chọn trình độ cờ của bạn để có Elo khởi điểm. Sau đó Elo tăng giảm theo kết quả từng ván, nên hãy chọn đúng sức nhé!': 'Pick your level to get a starting Elo. It then goes up and down with every game, so choose honestly!',
    'Chưa chơi bao giờ hoặc vừa mới học luật': 'Never played or just learned the rules', 'Biết cách đi các quân nhưng hay bị mất quân': 'Knows how pieces move but often loses material',
    'Chơi khá đều, biết vài khai cuộc và chiến thuật cơ bản': 'Plays regularly, knows some openings and basic tactics', 'Chơi lâu năm, tính trước được nhiều nước, ít mắc lỗi': 'Experienced, calculates ahead, rarely blunders',
    'Thành thạo chiến thuật, tàn cuộc; từng đấu câu lạc bộ hoặc giải': 'Strong at tactics and endgames; has played clubs or tournaments',
    'Tên đăng nhập 3–20 ký tự, chỉ gồm chữ không dấu, số và dấu _': 'Usernames are 3–20 characters: letters, digits and _ only', 'Mật khẩu cần ít nhất 6 ký tự': 'Passwords need at least 6 characters',
    'Hai mật khẩu không khớp': 'The passwords do not match', 'Tên đăng nhập này đã có người dùng': 'That username is taken',
    'Tên bắt đầu bằng "admin" chỉ dành cho chủ web, hãy chọn tên khác': 'Names starting with "admin" are reserved for the owner, choose another',
    'Sai tên đăng nhập hoặc mật khẩu': 'Wrong username or password', 'Thử quá nhiều lần, hãy đợi một lúc rồi thử lại': 'Too many attempts, wait a moment and try again',
    'Không kết nối được máy chủ. Kiểm tra mạng Internet.': 'Cannot reach the server. Check your Internet connection.',
    'Máy chủ chưa bật đăng nhập Email/Password (xem README).': 'The server has not enabled Email/Password sign-in (see README).',
    'Máy chủ từ chối truy cập, kiểm tra lại luật Firebase (xem README).': 'The server denied access; check the Firebase rules (see README).',
    'Chế độ cục bộ: tài khoản và bảng xếp hạng chỉ có trên trình duyệt này (bật bản toàn thế giới: xem README).': 'Local mode: accounts and leaderboard exist only in this browser (for the global version see README).',
    'Có lỗi xảy ra, thử lại sau.': 'Something went wrong, try again later.',

    // ----- Thư viện -----
    'Thư viện khai cuộc': 'Opening library', 'Danh sách': 'All openings', 'Tìm: Sicily, gambit, Najdorf, c4…': 'Search: Sicilian, gambit, Najdorf, c4…',
    'Tìm khai cuộc': 'Search openings', 'Minh họa thế cờ': 'Position diagram', 'Thế xuất phát': 'Starting position', 'Nước trước (←)': 'Previous move (←)',
    'Nước sau (→)': 'Next move (→)', 'Nước cuối': 'Last move', 'Ván mở': 'Open games', 'Nửa mở': 'Semi-open', 'Ván đóng': 'Closed games',
    'Ấn Độ & 1.d4': 'Indian & 1.d4', 'Khai cuộc cánh': 'Flank openings', 'Đặt lên bàn (2 người)': 'Set up on board (2 players)',
    'Không tìm thấy khai cuộc nào khớp. Thử tên tiếng Anh (Sicilian, Gambit…) hoặc một nước như "c4".': 'No matching openings. Try a name (Sicilian, Gambit…) or a move such as "c4".',

    // ----- Nhật ký -----
    'Nhật ký ván đấu': 'Game history', 'Tự lưu sau mỗi ván · xem lại · sao chép PGN': 'Saved after every game · replay · copy PGN', 'Xóa hết': 'Clear all',
    'Chưa có ván nào được lưu.': 'No saved games yet.', 'Chơi xong một ván (máy / online) sẽ xuất hiện ở đây.': 'Finished games (vs computer / online) appear here.',
    'Đã tải ván từ nhật ký': 'Game loaded from history', 'Xóa toàn bộ nhật ký ván đấu?': 'Delete the whole game history?', 'Xem': 'View',

    // ----- Bảng xếp hạng -----
    'Bảng xếp hạng': 'Leaderboard', 'Người chơi': 'Player', '(bạn)': '(you)',
    'Toàn thế giới · xếp theo exp rank (chỉ ván Online) · cột Elo tính cả ván đấu máy': 'Worldwide · sorted by rank exp (online games only) · Elo includes games vs computer',
    'Chỉ gồm tài khoản trên máy này · bảng toàn thế giới: xem README': 'Only accounts on this device · for the worldwide board see README',
    'Chưa có ai trên bảng. Chơi một ván Online để có tên ở đây!': 'Nobody here yet. Play an online game to get on the board!',
    'Không tải được bảng xếp hạng. Kiểm tra mạng và cấu hình Firebase.': 'Could not load the leaderboard. Check your connection and Firebase settings.',

    // ----- Contest -----
    'Tạo contest (Admin)': 'Create contest (admin)', 'Tên contest': 'Contest name', 'Mô tả (không bắt buộc)': 'Description (optional)',
    'Bắt đầu lúc': 'Starts at', 'Thời lượng': 'Duration', '1 giờ': '1 hour', '2 giờ': '2 hours', '3 giờ': '3 hours', '1 ngày': '1 day', '7 ngày': '7 days',
    '‹ Tất cả contest': '‹ All contests', 'Điểm': 'Pts', 'Ván': 'Games',
    'Thắng +2 · Hòa +1 · Thua 0 · Chỉ ván từ 4 nước trở lên, bắt đầu trong giờ contest mới được tính · Kết thúc: hạng 1, 2, 3 nhận huy chương Vàng, Bạc, Đồng': 'Win +2 · Draw +1 · Loss 0 · Only games of 4+ moves started during the contest count · At the end, places 1, 2 and 3 win gold, silver and bronze',
    'Tên contest cần 3–60 ký tự.': 'Contest names need 3–60 characters.', 'Thời gian không hợp lệ (contest dài tối đa 7 ngày).': 'Invalid time (contests last at most 7 days).',
    'Giờ bắt đầu phải ở tương lai để mọi người kịp đăng ký.': 'The start time must be in the future so people can register.',
    'Máy chủ từ chối: chỉ admin mới tạo / xóa được contest. Nếu bạn là admin, hãy dán lại firebase-rules.json mới rồi bấm Publish (xem README).': 'Denied by the server: only admins can create / delete contests. If you are an admin, paste the new firebase-rules.json and press Publish (see README).',
    'Contest đã bắt đầu nên đã đóng đăng ký.': 'The contest has started; registration is closed.', 'Mở đăng ký': 'Registration open', 'Đã kết thúc': 'Finished',
    'Đăng ký trước · đến giờ web tự ghép cặp · Thắng +2 · Hòa +1 · Thua 0 · Top 3 nhận huy chương': 'Register in advance · automatic pairing at start time · Win +2 · Draw +1 · Loss 0 · Top 3 win medals',
    'Chế độ cục bộ: contest chỉ có trên trình duyệt này (bật bản toàn thế giới: xem README)': 'Local mode: contests exist only in this browser (for the global version see README)',
    'Chỉ admin mới tạo được contest.': 'Only admins can create contests.', 'Sắp diễn ra': 'Upcoming', 'Vô địch': 'Champion', 'Đã đăng ký ✓': 'Registered ✓',
    'Chưa có contest nào.': 'No contests yet.', 'Hãy bấm "Tạo contest" ở trên.': 'Press "Create contest" above.',
    'Không tải được bảng điểm. Kiểm tra mạng và luật Firebase.': 'Could not load the standings. Check your connection and the Firebase rules.',
    'Chưa có ai đăng ký. Hãy là người đầu tiên!': 'Nobody has registered yet. Be the first!', 'Không có ai đăng ký contest này.': 'Nobody registered for this contest.',
    'Hủy đăng ký': 'Unregister', 'Đến giờ bắt đầu, web sẽ tự ghép cặp bạn với những người đã đăng ký. Chỉ cần mở web lúc đó.': 'At the start time you will be paired automatically with other registered players. Just keep the site open.',
    'Đăng ký tham gia': 'Register', 'Đăng ký đóng khi contest bắt đầu.': 'Registration closes when the contest starts.', 'Đang tự ghép cặp…': 'Pairing…',
    'Đang thi đấu': 'Playing', 'Tiếp tục thi đấu': 'Resume playing', 'Vào thi đấu ngay': 'Play now',
    'Web tự ghép cặp bạn với người đã đăng ký đang mở web; xong ván sẽ tự tìm ván tiếp.': 'You are paired with registered players who have the site open; after each game the next one is found automatically.',
    'Đăng ký đã đóng': 'Registration closed', 'Contest đã bắt đầu, chỉ người đăng ký trước mới được thi đấu.': 'The contest has started; only players who registered beforehand can play.',
    'Xóa contest': 'Delete contest', 'Đã kết thúc · kết quả chung cuộc': 'Finished · final results', 'Đã kết thúc · đang chờ các ván cuối': 'Finished · waiting for last games',
    'Muốn được nhắc giờ? Bật "Thông báo" trong Hồ sơ › Cài đặt.': 'Want a reminder? Turn on "Notifications" in Profile › Settings.', 'Đã hủy đăng ký.': 'Registration cancelled.',
    'Bạn đang trong phòng hoặc ván Online khác. Hãy rời phòng trước.': 'You are in another online room or game. Leave it first.', 'Bạn đang trong phòng Online khác, hãy rời phòng trước.': 'You are in another online room, leave it first.',
    'Đã tạo contest! Người chơi có thể đăng ký tới giờ bắt đầu.': 'Contest created! Players can register until it starts.', 'Quay lại Royal Gambit để được ghép cặp thi đấu.': 'Come back to Royal Gambit to get paired.',
    'Bạn đã đăng ký contest này. Hãy mở sẵn web để được ghép cặp.': 'You registered for this contest. Keep the site open to get paired.', 'Tạm dừng': 'Pause',

    // ----- Admin -----
    'Bảng quản trị': 'Admin panel', 'Tìm người chơi…': 'Search players…', 'Tìm người chơi': 'Search players', 'Bỏ mute': 'Unmute', 'Cho phép chat lại': 'Allow chat again',
    'Tắt chat vì nói tục / spam': 'Mute for abuse / spam', 'Cấp danh hiệu (GM, IM, …)': 'Grant title (GM, IM, …)', 'Thu hồi': 'Revoke', 'Cấp admin': 'Make admin',
    'Không có người chơi nào khớp.': 'No matching players.', 'Nói tục / spam trong chat': 'Abuse / spam in chat',
    'Chủ web cấp / thu hồi quyền admin. Admin được dùng Gợi ý trong ván Online (vẫn tính Elo/rank) và có thể': 'The owner grants / revokes admin rights. Admins can use Hint in online games (still rated) and can',
    'người chơi nói tục. Cần luật Firebase có mục': 'abusive players. Requires Firebase rules with a',
    'Mới chỉ có tài khoản ADMIN. Người khác cần đăng ký và vào web ít nhất một lần thì mới hiện ở đây.': 'Only the ADMIN account exists. Others appear here after signing up and opening the site once.',
    'Chỉ chủ web (tài khoản admin) mới cấp được danh hiệu.': 'Only the owner (admin account) can grant titles.', 'Có lỗi, thử lại. Hãy Publish luật Firebase mới (mục titles).': 'Error, try again. Publish the new Firebase rules (titles section).',
    'Chỉ admin / chủ web mới mute được. Hãy dán luật Firebase mới (có mục "mutes") rồi Publish.': 'Only admins / the owner can mute. Paste the new Firebase rules (with "mutes") and Publish.',
    'Máy chủ từ chối: hãy dán luật Firebase mới (có mục "admins") và bấm Publish.': 'Denied by the server: paste the new Firebase rules (with "admins") and press Publish.',
    'Chế độ cục bộ: chỉ thấy tài khoản tạo trên trình duyệt này, người chơi ở máy khác sẽ không hiện ở đây (bật Firebase: xem README).': 'Local mode: only accounts created in this browser are listed (enable Firebase: see README).',
    'Chưa đọc được danh sách admin: hãy dán luật Firebase mới (có mục "admins") rồi bấm Publish. Tới lúc đó nút cấp / thu hồi chưa hoạt động.': 'Could not read the admin list: paste the new Firebase rules (with "admins") and press Publish. Until then grant / revoke does not work.',
    'Kiểm tra mạng Internet.': 'Check your Internet connection.', 'Máy chủ từ chối đọc, kiểm tra luật Firebase.': 'The server denied reading; check the Firebase rules.',
    'Kiểm tra lại databaseURL trong config.js.': 'Check databaseURL in config.js.', 'Kiểm tra mạng và cấu hình Firebase (xem README).': 'Check your connection and Firebase settings (see README).',
    // Trang chủ (v25)
    'Trang chủ': 'Home', 'Sắp xếp danh sách': 'Sort the list', 'Lọc theo chế độ chơi': 'Filter by game mode', 'Bắt đầu nhanh': 'Quick start',
    'Chơi với máy': 'Play the computer', 'Chọn nhân vật bot · có tính Elo': 'Pick a bot character · rated', 'Đấu Online': 'Play online',
    'Tìm trận nhanh hoặc mời bạn bè': 'Quick match or invite a friend', 'Luyện chiến thuật mỗi ngày': 'Sharpen your tactics daily',
    'Lộ trình từ cơ bản đến nâng cao': 'A path from basics to advanced', 'Việc hôm nay': "Today's tasks", 'Ván gần đây': 'Recent games',
    'Xem nhật ký': 'Open history', 'Top kỳ thủ': 'Top players',
    'Chúc một đêm nhiều nước hay': 'Late-night chess time', 'Chào buổi sáng': 'Good morning', 'Chào buổi trưa': 'Good afternoon',
    'Chào buổi chiều': 'Good afternoon', 'Chào buổi tối': 'Good evening', 'Xem luật rank': 'See rank rules',
    'Exp tới ngôi sao tiếp theo': 'Exp to the next star', 'Rank cao nhất': 'Highest rank', 'Elo hiện tại': 'Current Elo',
    'Ván đã chơi': 'Games played', 'Số ván trong nhật ký trên máy này': 'Games in the history on this device', 'Tỉ lệ thắng': 'Win rate',
    'Câu đố đã giải': 'Puzzles solved', 'Ván Online đang diễn ra': 'Online game in progress', 'Bài học đang dở': 'Lesson in progress',
    'Câu đố đang giải': 'Puzzle in progress', 'Ván 2 người đang dở': 'Two-player game in progress', 'Ván đấu máy đang dở': 'Game vs computer in progress',
    'nước': 'moves', 'Giải câu đố hôm nay': "Solve today's puzzle", 'Đã xong': 'Done', 'Mỗi ngày một thế cờ mới': 'A new position every day',
    'Đạt mục tiêu học hằng ngày': 'Reach your daily study goal', 'Ôn sổ luyện lỗi': 'Review your mistake notebook',
    'Không có thế cờ nào đến hạn': 'Nothing due right now', 'Chơi ít nhất 1 ván': 'Play at least 1 game', 'Đấu máy hoặc Online': 'Vs computer or online',
    'Chưa có ván nào. Chơi ván đầu tiên nhé!': 'No games yet. Play your first one!', 'Chơi ngay': 'Play now', 'Khai cuộc hôm nay': 'Opening of the day',
    'Không tải được danh sách contest.': 'Could not load contests.', 'Chưa có contest nào sắp diễn ra.': 'No upcoming contests.',
    'Kết thúc sau': 'Ends in', 'Bắt đầu sau': 'Starts in', 'Không tải được bảng xếp hạng.': 'Could not load the leaderboard.',
    'Chưa có ai trên bảng xếp hạng.': 'Nobody on the leaderboard yet.',
    // Mất kết nối Online (v28)
    'Đối thủ mất kết nối': 'Opponent disconnected', 'Đối thủ mất kết nối.': 'Opponent disconnected.', 'Mất kết nối với đối thủ.': 'Lost connection to the opponent.',
    'Đối thủ đã thoát khỏi trang.': 'Your opponent left the page.', 'Đối thủ đã rời phòng.': 'Your opponent left the room.', 'Đối thủ đã kết nối lại.': 'Your opponent reconnected.',
    'Đối thủ thoát quá 15 giây – Bạn thắng': 'Opponent gone for over 15 seconds – You win', 'Đối thủ thoát quá 15 giây': 'Opponent gone for over 15 seconds',
    'Bạn mất kết nối quá 15 giây – xử thua': 'You were disconnected for over 15 seconds – loss', 'Mất kết nối quá 15 giây': 'Disconnected for over 15 seconds',
    'Bạn rời ván quá 15 giây – xử thua': 'You left the game for over 15 seconds – loss', 'Rời ván quá 15 giây': 'Left the game for over 15 seconds',
    'Bạn đã vắng mặt quá 15 giây nên bị xử thua.': 'You were away for over 15 seconds, so you lose.', 'Bạn đã rời ván quá 15 giây nên bị xử thua.': 'You left the game for over 15 seconds, so you lose.',
    'Đối thủ vắng mặt quá 15 giây nên bị xử thua.': 'Your opponent was away for over 15 seconds and loses.', 'Ván bị huỷ vì đối thủ thoát trước khi ván bắt đầu.': 'Game cancelled: your opponent left before it started.',
    'Bạn đang mất kết nối mạng…': 'You are offline…',
    // Xoá contest (v27)
    'Xoá contest': 'Delete contest', 'Xoá': 'Delete',
    'Contest đang diễn ra: các ván đang đấu sẽ không được tính nữa.': 'This contest is live: games in progress will no longer count.',
    'Huy chương của contest này cũng sẽ bị xoá khỏi hồ sơ người chơi.': "This contest's medals will also be removed from player profiles.",
    // Học cờ (v26)
    'Mục tiêu hôm nay': "Today's goal", 'bài xong': 'lessons done', 'sao': 'stars', 'Tổng số sao đã đạt': 'Total stars earned',
    'Thành tích': 'Achievements', 'Khoá học cờ vua': 'Chess course', 'Hoàn thành khoá học!': 'Course complete!', 'Tiếp theo:': 'Next:',
    'Thử thách hiện tại': 'Current challenge', 'Số sao đạt được trong phần này': 'Stars earned in this unit', 'Đã nhận cúp': 'Trophy earned',
    'Học bài tiếp theo': 'Next lesson', 'Bước đầu tiên': 'First step', 'Hoàn thành bài học đầu tiên': 'Finish your first lesson',
    'Nhập môn': 'Beginner', 'Hoàn thành Phần 1': 'Finish Unit 1', 'Chăm chỉ': 'Diligent', 'Học 3 ngày liên tiếp': 'Study 3 days in a row',
    'Kiên trì': 'Persistent', 'Học 7 ngày liên tiếp': 'Study 7 days in a row', 'Hoàn hảo': 'Perfect', '10 bài đạt 3 sao': '10 lessons with 3 stars',
    'Chăm học': 'Hard worker', 'Đạt 500 XP': 'Reach 500 XP', 'Nửa chặng đường': 'Halfway there', 'Hoàn thành một nửa khoá học': 'Finish half of the course',
    'Tốt nghiệp': 'Graduate', 'Hoàn thành cả khoá học': 'Finish the whole course',
  };

  // Mẫu câu có biến: [tiếng Việt, tiếng Anh], {0} {1}… là phần thay đổi
  const TPL = [
    ['Lượt {0} đi', '{0} to move'], ['Chiếu hết! {0} thắng', 'Checkmate! {0} wins'], ['{0} – {1} thắng', '{0} – {1} wins'], ['Hòa – {0}', 'Draw – {0}'],
    ['{0} hết giờ', '{0} ran out of time'], ['{0} hết giờ nhưng {1} không đủ quân chiếu hết', '{0} ran out of time but {1} cannot mate'],
    ['{0} thắng!', '{0} wins!'], ['{0} xin thua', '{0} resigns'], ['{0} xin thua?', 'Does {0} resign?'],
    ['Khai cuộc: {0} ({1})', 'Opening: {0} ({1})'], ['Thay phiên nhau đi', 'Take turns'], ['Đang đấu với {0}', 'Playing {0}'], ['{0} Elo', '{0} Elo'],
    ['Bạn cầm {0}', 'You play {0}'], ['{0} · Máy', '{0} · Computer'], ['Máy {0}', 'Computer {0}'], ['Máy · {0}', 'Computer · {0}'],
    ['Đánh giá thế cờ (ước lượng): {0} {1}', 'Evaluation (estimate): {0} {1}'], ['cân bằng', 'equal'],
    ['Đấu với máy {0} ({1} Elo) có tính Elo, không tính rank', 'Rated vs computer {0} ({1} Elo), Elo only, no rank'],
    ['Admin: Gợi ý vẫn tính, Đi lại thì không', 'Admin: hints stay rated, undo does not'], ['dùng Gợi ý hoặc Đi lại thì không tính', 'using Hint or Undo makes it unrated'],
    ['Bạn thắng bằng chiếu hết sau {0} nước. Kết thúc gọn!', 'You won by checkmate in {0} moves. Clean finish!'],
    ['Bạn bị chiếu hết sau {0} nước. Hãy chú ý an toàn vua ở tàn cuộc.', 'You were mated after {0} moves. Watch your king\'s safety.'],
    ['{0} thắng bằng chiếu hết sau {1} nước.', '{0} won by checkmate after {1} moves.'], ['Ván kết thúc sớm ({0} nước): {1}.', 'The game ended early ({0} moves): {1}.'],
    ['Hòa vì hết nước đi (pat) sau {0} nước — vua không bị chiếu nhưng không còn nước hợp lệ.', 'Stalemate after {0} moves — the king is not in check but has no legal moves.'],
    ['Hòa sau {0} nước ({1}).', 'Draw after {0} moves ({1}).'], ['Ván dừng sau {0} nước.', 'The game stopped after {0} moves.'],
    ['Ván dài {0} nước: có sự giằng co ở trung cuộc/tàn cuộc.', 'A long game of {0} moves: a real fight in the middlegame/endgame.'],
    ['{0} chưa nhập thành — vua dễ bị tấn công giữa bàn.', '{0} did not castle — the king is exposed in the centre.'],
    ['{0} đưa Hậu ra rất sớm (nước {1}:', '{0} brought the queen out very early (move {1}:'],
    ['Bạn mất Hậu ở nước thứ {0}. Đây thường là bước ngoặt — hãy kiểm tra ô bị tấn công trước khi để Hậu đứng trên đường nguy hiểm.', 'You lost your queen on move {0}. That is usually the turning point — check attacked squares before placing your queen.'],
    ['Đối thủ mất Hậu ở nước {0} — bạn đã tận dụng tốt cơ hội.', 'Your opponent lost their queen on move {0} — well taken.'],
    ['Có tới {0} lần chiếu trong ván — nhịp tấn công khá cao.', '{0} checks in this game — a sharp, attacking game.'],
    ['Lợi thế chất liệu nghiêng về {0} ({1}–{2} điểm tạm tính).', 'Material favoured {0} ({1}–{2} by rough count).'],
    ['Điểm đáng chú ý: {0} dùng Hậu đổi quân nhỏ tại', 'Notable: {0} traded the queen for a minor piece on'],
    ['(nước {0}) — thường là thiệt lớn trừ khi có chiếu hết hoặc bắt lại ngay.', '(move {0}) — usually a big loss unless it leads to mate or an immediate recapture.'],
    ['(nước {0}) của {1} có vẻ đổi quân bất lợi.', '(move {0}) by {1} looks like a bad trade.'],
    ['Online với {=0}', 'Online vs {0}'], ['Độ chính xác {0}%', 'Accuracy {0}%'], ['{0} hớ', '{0} blunders'], ['{0} sai', '{0} mistakes'], ['{0} thiếu chính xác', '{0} inaccuracies'],
    ['Lỗi đáng tiếc nhất: nước {0} {1}, nên đi {2}.', 'Costliest mistake: move {0} {1}; better was {2}.'],
    ['Đã thêm {0} thế cờ vào Sổ luyện lỗi · Ôn ngay', 'Added {0} positions to your Mistake Notebook · Review now'],
    ['Lên rank {0}!', 'Promoted to {0}!'], ['Xuống rank {0}', 'Demoted to {0}'], ['+{0} điểm', '+{0} pts'],
    ['Web sẽ tự ghép ván contest tiếp theo sau {0} giây', 'The next contest game will be paired in {0} seconds'],
    ['Rank cao nhất · Tổng {0} exp', 'Top rank · {0} exp total'], ['{0}/{1} exp tới sao tiếp theo', '{0}/{1} exp to the next star'], ['Tổng {0} exp', '{0} exp total'],
    ['Rank chỉ tính ván Online', 'Rank counts online games only'], ['{0} exp = 1 sao', '{0} exp = 1 star'], ['đủ {0} sao thì lên rank tiếp theo.', '{0} stars to reach the next rank.'],
    ['từ {0} exp', 'from {0} exp'], ['{0} exp', '{0} exp'], ['{0} phút trước', '{0} min ago'], ['{0} giờ trước', '{0} h ago'], ['{0} ngày trước', '{0} days ago'],
    ['Hoạt động {0}', 'Active {0}'], ['{0} huy chương', '{0} medals'], ['{0} ván', '{0} games'], ['Cao nhất {0}', 'Peak {0}'], ['Thấp nhất {0}', 'Low {0}'],
    ['Mở contest "{=0}"', 'Open contest "{0}"'], ['Hạng {0}/{1}', 'Place {0}/{1}'], ['{0} điểm', '{0} pts'], ['Nếu bạn đấu với {=0}', 'If you played {0}'],
    ['{0}/{1} bài', '{0}/{1} lessons'], ['{0} nước', '{0} moves'], ['Huy chương {0}', '{0} medal'], ['{0} huy chương {1}', '{0} {1} medals'],
    ['Xem hồ sơ {=0}', 'View {0}\'s profile'], ['{0}/{1} exp tới sao tiếp theo · còn {2} exp lên {3}', '{0}/{1} exp to the next star · {2} exp to {3}'],
    ['còn {0} exp lên', '{0} exp to'], ['Rank cao nhất · {0} exp', 'Top rank · {0} exp'],
    ['Không tải được danh sách (mã lỗi: {=0}). {1}', 'Could not load the list (error: {0}). {1}'], ['{0} người chơi', '{0} players'], ['{0} admin', '{0} admins'], ['{0} bị mute chat', '{0} muted'],
    ['bởi {=0}', 'by {0}'], ['Đã cấp danh hiệu {=0} cho {=1}.', 'Granted the {0} title to {1}.'], ['Đã gỡ danh hiệu của {=0}.', 'Removed {0}\'s title.'],
    ['Mute chat của {=0}?\n(Tuỳ chọn) Lý do:', 'Mute {0}\'s chat?\n(Optional) Reason:'], ['Bỏ mute chat cho {=0}?', 'Unmute {0}?'],
    ['Đã mute chat của {=0}. Họ không gửi được tin nhắn trong ván online.', 'Muted {0}. They cannot send messages in online games.'], ['Đã bỏ mute chat cho {=0}.', 'Unmuted {0}.'],
    ['Cấp quyền admin cho {=0}?', 'Make {0} an admin?'], ['Thu hồi quyền admin của {=0}?', 'Revoke {0}\'s admin rights?'], ['Đã cấp quyền admin cho {=0}.', '{0} is now an admin.'],
    ['Đã thu hồi quyền admin của {=0}.', 'Revoked {0}\'s admin rights.'], ['Admin đã mute chat của {=0}.', 'An admin muted {0}\'s chat.'],
    ['{0} thế cờ đến hạn', '{0} positions due'], ['Cúp Phần {0}', 'Unit {0} trophy'], ['Đã hoàn thành Phần {0}!', 'Unit {0} complete!'],
    ['Học xong {0} bài để nhận cúp Phần {1}', 'Finish {0} lessons to earn the Unit {1} trophy'], ['{0} ván hôm nay', '{0} games today'],
    ['{0} ngày', '{0} days'], ['{0} giờ', '{0} h'], ['{0} phút', '{0} min'], ['{0} ngày {1} giờ', '{0} d {1} h'],
    ['Không tải được danh sách contest (mã lỗi: {=0}). Kiểm tra mạng và luật Firebase (xem README).', 'Could not load contests (error: {0}). Check your connection and the Firebase rules (see README).'],
    ['tạo bởi {=0}', 'by {0}'], ['Chúc mừng! Bạn giành huy chương {0} (hạng {1}) – huy chương đã được thêm vào trang Hồ sơ.', 'Congratulations! You won {0} (place {1}) – it has been added to your profile.'],
    ['Bạn xếp hạng {0}/{1}.', 'You placed {0}/{1}.'], ['{0} thắng', '{0} wins'], ['Còn {0}', '{0} left'], ['còn {0}', '{0} left'], ['Bắt đầu sau {0}', 'Starts in {0}'],
    ['Không đọc được nước "{=0}" (nước thứ {=1}). Hãy kiểm tra lại PGN.', 'Could not read the move "{0}" (move {1}). Please check the PGN.'],
    ['Đã nhập {=0} nước. Stockfish đang phân tích… {=1}%', 'Imported {0} moves. Stockfish is analysing… {1}%'],
    ['Đã nhập {=0} nước. Stockfish đang phân tích… 0%', 'Imported {0} moves. Stockfish is analysing… 0%'],
    ['Đã khôi phục ván đang dở ({=0} nước)', 'Restored your unfinished game ({0} moves)'],
    ['Gửi tới {=0}', 'Sent to {0}'], ['Đã bật: thông báo contest sẽ được gửi về {=0}', 'On: contest notifications will be sent to {0}'],
    ['Chế độ khách không {0} được. Đăng nhập hoặc đăng ký tài khoản (miễn phí)?', 'Guests cannot {0}. Sign in or create a free account?'],
    ['Lỗi đáng tiếc nhất của bạn: nước {=0} {=1}, nên đi', 'Your most costly mistake: move {0} {1}; better was'],
    ['Đã phân tích xong · độ chính xác Trắng {=0}% · Đen {=1}%', 'Analysis done · accuracy White {0}% · Black {1}%'],
    ['Đã đăng ký! Contest bắt đầu lúc {0}, web sẽ tự ghép cặp cho bạn.', 'Registered! The contest starts at {0}; you will be paired automatically.'],
    ['Đã đăng ký! Contest bắt đầu lúc {0}, web sẽ tự ghép cặp cho bạn. Muốn được nhắc giờ? Bật "Thông báo" trong Hồ sơ › Cài đặt.', 'Registered! The contest starts at {0}; you will be paired automatically. Want a reminder? Turn on "Notifications" in Profile › Settings.'],
    ['Hủy đăng ký contest "{=0}"?', 'Unregister from "{0}"?'], ['Xóa contest "{=0}" cùng toàn bộ bảng điểm?', 'Delete "{0}" and all its standings?'], ['Đã xóa contest "{=0}".', 'Deleted "{0}".'],
    ['Chúc mừng! Bạn giành huy chương {0} ở contest "{=1}"', 'Congratulations! You won a {0} medal in "{1}"'], ['{=0} đã bắt đầu!', '{0} has started!'], ['{=0} bắt đầu sau {1} phút', '{0} starts in {1} min'],
    ['{=0} đang diễn ra ({1})', '{0} is live ({1})'], ['bạn đã tạm dừng tự ghép cặp', 'you paused auto-pairing'], ['ván tiếp theo sau {0} giây', 'next game in {0} s'],
    ['đang thi đấu ({0})', 'playing ({0})'], ['đang tự ghép cặp với người đã đăng ký… ({0})', 'pairing with registered players… ({0})'],
    ['web sẽ tự ghép cặp khi bạn xong việc đang làm', 'you will be paired when you finish what you are doing'], ['{=0} bắt đầu sau {1}', '{0} starts in {1}'],
    ['bạn đã đăng ký, đến giờ web sẽ tự ghép cặp', 'you are registered and will be paired automatically'],
    ['Bắt đầu ván mới – bạn cầm quân {0}.', 'New game – you play {0}.'], ['Mute chat của {=0}?', 'Mute {0}\'s chat?'],
    ['{0} đi', '{0} to move'], ['{0} nước', '{0} moves'], ['Ôn ngay ({0})', 'Review now ({0})'], ['{0} thế cờ đến hạn ôn hôm nay', '{0} positions due today'],
    ['{0} thế cờ lấy từ ván của bạn', '{0} positions from your games'], ['{0} đã thuộc', '{0} mastered'], ['độ chính xác TB {0}%', 'avg accuracy {0}%'],
    ['Nước {0} · {=1}', 'Move {0} · {1}'], ['Nước {0}: {1}', 'Move {0}: {1}'], ['Câu đố hôm nay', 'Daily puzzle'], ['Câu đố hôm nay · {0}', 'Daily puzzle · {0}'], ['/{0} đã giải', '/{0} solved'],
    ['{0}/{1} đã giải', '{0}/{1} solved'], ['Sổ luyện lỗi', 'Mistake Notebook'], ['nước hớ', 'blunder'], ['nước sai', 'mistake'], ['hộp {0}/{1}', 'box {0}/{1}'],
    ['Trong ván "{=0}", bạn cầm {1} và đã đi {2}. Hãy tìm nước tốt hơn.', 'In "{0}" you played {1} and chose {2}. Find a better move.'],
    ['{0} đi. Chiếu hết trong {1} nước.', '{0} to move. Mate in {1}.'], ['{0} đi. Tìm nước mạnh nhất.', '{0} to move. Find the strongest move.'],
    ['Chính xác! Thế cờ lên hộp {0}, sẽ gặp lại sau {1} ngày.', 'Correct! The position moves to box {0} and returns in {1} days.'],
    ['Còn {0} thế cờ cần ôn.', '{0} positions left to review.'], ['Chuỗi câu đố hôm nay: {0} ngày.', 'Daily puzzle streak: {0} days.'],
    ['{0} nước · {1} chọn', '{0} moves · {1}\'s choice'], ['{0} khai cuộc và {1} thế tàn cuộc', '{0} openings and {1} endgames'], ['xem từng nước', 'step through moves'],
    ['tập với máy', 'practice vs computer'], ['Tập với máy', 'Practice vs computer'], ['bạn cầm {0}', 'you play {0}'], ['{0} đi trước', '{0} to move'],
    ['Nước {0}/{1}', 'Move {0}/{1}'], ['Tập {0} với máy', 'Practising {0} vs computer'], ['Đã đặt: {0}', 'Set up: {0}'],
    ['Nước {0}: bạn đã đi {1}', 'Move {0}: you played {1}'],
    ['Trong ván "{=0}", bạn đi {1} và mất khoảng {2}% cơ hội thắng. Có nước tốt hơn hẳn: hãy tìm nó.', 'In "{0}" you played {1} and lost about {2}% winning chances. There is a much better move: find it.'],
    ['Nhảy cóc tới Phần {0}', 'Skip ahead to Unit {0}'], ['Tốt lắm! Còn {0} ngôi sao.', 'Nice! {0} stars left.'], ['Tốt lắm! Còn {0} quân.', 'Nice! {0} pieces left.'],
    ['Giờ chiếu hết trong {0} nước!', 'Now mate in {0}!'], ['Giờ chiếu hết!', 'Now checkmate!'], ['Đã hết {0} nước.', 'Out of moves ({0}).'],
    ['Máy đang nghĩ… (nước {0}/{1})', 'Computer thinking… (move {0}/{1})'], ['Lượt bạn', 'Your move'], ['còn {0} nước', '{0} moves left'],
    ['Đáp án đúng: {0}', 'Correct answer: {0}'], ['Đã mở khoá Phần {0}!', 'Unit {0} unlocked!'], ['Đạt mục tiêu hằng ngày! Chuỗi {0} ngày học liên tiếp', 'Daily goal reached! {0}-day streak'],
    ['Chuỗi {0} ngày', '{0}-day streak'], ['hôm nay {0}/{1} XP', 'today {0}/{1} XP'], ['Phần {0}', 'Unit {0}'], ['Bài {0}', 'Lesson {0}'], ['Bài {0}/{1}', 'Lesson {0}/{1}'],
    ['{0}/{1} bài', '{0}/{1} lessons'], ['Tiếp theo: Phần {0}', 'Next: Unit {0}'], ['{0} bài', '{0} lessons'],
    ['Làm bài kiểm tra 6 câu để mở khoá Phần {0}? Sai 3 lần là không qua.', 'Take a 6-question test to unlock Unit {0}? Three mistakes and you fail.'],
    ['{0} ({1})', '{0} ({1})'], ['đang khoá', 'locked'], ['đã xong', 'done'], ['mở', 'open'], ['{0} thử thách', '{0} challenges'],
    ['Ôn lại +{0} XP', 'Review +{0} XP'], ['Bắt đầu +{0} XP', 'Start +{0} XP'], ['{0}/30 XP', '{0}/30 XP'],
    ['Elo qua {0} lần ghi, từ {1} tới {2}', 'Elo over {0} records, from {1} to {2}'], ['Chủ đề: {0}', 'Theme: {0}'], ['Gợi ý: {0}', 'Tip: {0}'],
    ['{0} và {1}', '{0} and {1}'], ['{0} và {1} chưa nhập thành — vua dễ bị tấn công giữa bàn.', '{0} and {1} did not castle — the kings are exposed in the centre.'],
    ['Lỗi đáng tiếc nhất: nước {0} {1}, nên đi {2}.', 'Costliest mistake: move {0} {1}; better was {2}.'],
    ['Lỗi đáng tiếc nhất: nước {0} {1}, nên đi', 'Costliest mistake: move {0} {1}; better was'],
    ['Vô địch: {=0} · {1} điểm', 'Champion: {0} · {1} pts'], ['Vô địch: {=0}', 'Champion: {0}'], ['cách #{0} {1}', '{1} behind #{0}'],
    ['Thắng {0} · Hòa {1} · Thua {2}', 'Wins {0} · Draws {1} · Losses {2}'], ['Đăng bởi {=0}', 'Posted by {0}'], ['tự ẩn sau {0}', 'hides in {0}'],
    ['Độ chính xác {0}% · đã thêm {1} thế cờ vào Sổ luyện lỗi', 'Accuracy {0}% · added {1} positions to the Mistake Notebook'],
    ['Độ chính xác {0}% · không có nước hớ nào', 'Accuracy {0}% · no blunders'], ['Hạng {0}/{1} · {2} ván', 'Place {0}/{1} · {2} games'],
    ['{0} ván đã đấu', '{0} games played'], ['bởi {=0}', 'by {0}'],
  ];

  // Tên / mô tả nội dung (khai cuộc, tàn cuộc, câu đố) lấy bản tiếng Anh ngay trong dữ liệu
  let contentReady = false;
  function loadContent() {
    if (contentReady) return;
    contentReady = true;
    if (typeof OPENINGS !== 'undefined') {
      for (const o of OPENINGS.concat(typeof ENDGAMES !== 'undefined' ? ENDGAMES : [])) {
        if (o.nameVi && o.name) EN[o.nameVi] = o.name;
        if (o.desc && o.descEn) EN[o.desc] = o.descEn;
        if (o.cat === 'endgame' && o.movesEn) EN[o.moves] = o.movesEn;
      }
    }
    if (typeof PUZZLES !== 'undefined') {
      for (const p of PUZZLES) if (p.en) { EN[p.title] = p.en.title; EN[p.hint] = p.en.hint; }
    }
    if (typeof OPENING_BOOK !== 'undefined' && OPENING_BOOK.pairs) for (const [vi, en] of OPENING_BOOK.pairs()) if (!EN[vi]) EN[vi] = en;
  }

  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const esc = s => s.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
  // {0} = phần biến phải dịch được (nếu không, bỏ qua mẫu này), {=0} = tên riêng, giữ nguyên
  const compiled = TPL.map(([vi, en]) => {
    vi = vi.normalize('NFC');
    const parts = vi.split(/\{(=?)(\d)\}/);
    let src = '^', literal = 0;
    const order = [], free = [];
    for (let i = 0; i < parts.length; i += 3) {
      src += esc(parts[i]);
      literal += parts[i].length;
      if (i + 2 < parts.length) { src += '(.+?)'; free.push(parts[i + 1] === '='); order.push(Number(parts[i + 2])); }
    }
    return { re: new RegExp(src + '$'), order, free, en, literal };
  }).sort((a, b) => b.literal - a.literal); // mẫu cụ thể (nhiều chữ cố định) được thử trước
  for (const k of Object.keys(EN)) { const n = k.normalize('NFC'); if (n !== k) EN[n] = EN[k]; }

  function lookup(core) {
    if (Object.prototype.hasOwnProperty.call(EN, core)) return EN[core];
    for (const c of compiled) {
      const m = c.re.exec(core);
      if (!m) continue;
      const vals = [];
      let ok = true;
      c.order.forEach((idx, k) => {
        const v = c.free[k] ? m[k + 1] : translateCore(m[k + 1]);
        if (!c.free[k] && VI.test(v)) ok = false; // phần biến chưa dịch được: không dịch nửa vời
        vals[idx] = v;
      });
      if (!ok) continue;
      return c.en.replace(/\{(\d)\}/g, (_, i) => vals[i] != null ? vals[i] : '');
    }
    return null;
  }

  function translateCore(core) {
    if (!/[^\x00-\x7F]/.test(core)) return Object.prototype.hasOwnProperty.call(EN, core) ? EN[core] : core; // chữ không dấu: chỉ tra nguyên câu
    const hit = lookup(core);
    if (hit != null) return hit;
    // Câu ghép bằng " · ": dịch từng đoạn
    if (core.includes(' · ')) {
      const parts = core.split(' · ');
      const out = parts.map(p => { const h = lookup(p.trim()); return h != null ? h : p; });
      if (out.some((x, i) => x !== parts[i])) return out.join(' · ');
    }
    // Tên kèm sao rank: "Vàng ★★☆"
    const star = /^(.*?)(\s+[★☆][★☆\d×]*)$/.exec(core);
    if (star) { const h = lookup(star[1]); if (h != null) return h + star[2]; }
    // Dấu "…" cuối câu

    if (core.endsWith('…')) { const h = lookup(core.slice(0, -1)); if (h != null) return h + '…'; }
    return core;
  }

  // Dịch một chuỗi (giữ khoảng trắng đầu/cuối). Dùng cho confirm/alert và chỗ cần dịch trong JS.
  function t(s) {
    if (lang === 'vi' || typeof s !== 'string' || !s) return s;
    loadContent();
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s.normalize('NFC'));
    const core = translateCore(m[2]);
    return core === m[2] ? s : m[1] + core + m[3];
  }

  // ----- Dịch DOM -----
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const orig = new WeakMap();     // text node → chữ gốc
  const wrote = new WeakMap();    // text node → chữ mình vừa ghi (để bỏ qua mutation của chính mình)
  const origAttr = new WeakMap(); // element → { attr: gốc }
  const wroteAttr = new WeakMap();

  function doText(node) {
    const cur = node.data;
    if (wrote.get(node) === cur) return;
    if (!/[^\x00-\x7F]/.test(cur) && !Object.prototype.hasOwnProperty.call(EN, cur.trim())) { orig.delete(node); return; }
    const p = node.parentNode;
    if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TEXTAREA')) return;
    orig.set(node, cur);
    const out = t(cur);
    if (out !== cur) { wrote.set(node, out); node.data = out; }
  }

  function doAttrs(el) {
    if (!el.getAttribute) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const w = wroteAttr.get(el) || {};
      if (w[a] === v) continue;
      const o = origAttr.get(el) || {};
      o[a] = v;
      origAttr.set(el, o);
      const out = t(v);
      if (out !== v) { w[a] = out; wroteAttr.set(el, w); el.setAttribute(a, out); }
    }
  }

  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }

  function restore(root) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) {
        const o = orig.get(n);
        if (o != null && n.data === wrote.get(n)) { wrote.set(n, o); n.data = o; }
      } else {
        const o = origAttr.get(n), w = wroteAttr.get(n);
        if (o && w) for (const a in w) if (n.getAttribute(a) === w[a]) { n.setAttribute(a, o[a]); w[a] = o[a]; }
      }
    }
  }

  let observer = null;
  function observe() {
    if (observer || !document.body) return;
    observer = new MutationObserver(list => {
      if (lang === 'vi') return;
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function apply() {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
    if (!document.body) return;
    observe();
    if (lang === 'vi') restore(document.body);
    else walk(document.body);
    listeners.forEach(f => { try { f(lang); } catch {} });
  }

  const listeners = [];
  function setLang(l) {
    if (l !== 'vi' && l !== 'en') return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch {}
    apply();
  }

  // Hộp thoại gốc của trình duyệt cũng được dịch
  const nativeConfirm = window.confirm.bind(window), nativeAlert = window.alert.bind(window), nativePrompt = window.prompt.bind(window);
  window.confirm = m => nativeConfirm(t(String(m)));
  window.alert = m => nativeAlert(t(String(m)));
  window.prompt = (m, d) => nativePrompt(t(String(m)), d);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();

  return { t, setLang, lang: () => lang, LANGS, onChange: f => listeners.push(f), apply };
})();
