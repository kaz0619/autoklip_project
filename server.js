require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const db = require('./database.js');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { Configuration, OpenAIApi } = require('openai');

// 環境変数からAPIキーを取得
const apiKey = process.env.OPENAI_API_KEY;
// APIキーが設定されているか確認
if (!apiKey) {
  console.error("OPENAI_API_KEYが設定されていません。");
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: apiKey,
});
const openai = new OpenAIApi(configuration);

// セッション・ミドルウェア
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'change_this_secret_key_to_something_safe',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// ユーザー新規登録
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) {
    return res.send('メールアドレスとパスワードを入力してください。');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  db.run(`INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)`,
    [email, hashedPassword, createdAt],
    function(err) {
      if (err) {
        console.error(err);
        return res.send('このメールアドレスは既に登録されています。');
      }
      res.send('登録完了！確認コードをメールで送信しました。');
    }
  );
});

// トップ画面(仮)
app.get('/', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'public', 'top.html'));
  } else {
    res.send('ログインしてください。');
  }
});

// 認証コード確認(仮: 1234)
app.post('/verify', (req, res) => {
  const inputCode = req.body.code;
  if (inputCode === '1234') {
    // 本来はユーザーを特定してverified=1にする必要がある
    db.run(`UPDATE users SET verified=1 WHERE email='newtest@example.com'`, function(err) {
      if (err) {
        console.error(err);
        return res.send('データベース更新エラーが発生しました。');
      }
      res.send('認証成功！ログイン状態でトップ画面へ遷移してください。');
    });
  } else {
    res.send('確認コードが間違っています。もう一度お試しください。');
  }
});

// ログイン処理
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.send('エラーが発生しました。');
    }
    if (!user) {
      return res.send('ユーザーが見つかりません。');
    }

    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (result) {
        if (user.verified === 1) {
          req.session.userId = user.id;
          req.session.loggedIn = true;
          res.send('ログイン成功！トップ画面へ移動してください。');
        } else {
          res.send('このアカウントは未認証です。認証後ログインしてください。');
        }
      } else {
        res.send('パスワードが間違っています。');
      }
    });
  });
});

app.get('/check-login', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.send('ログイン中です。');
  } else {
    res.send('ログインしていません。');
  }
});

app.get('/top', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'public', 'top.html'));
  } else {
    res.send('ログインしていません。ログインしてからトップ画面へアクセスしてください。');
  }
});

app.post('/upload-video', upload.single('videoFile'), (req, res) => {
  if (!req.session || !req.session.loggedIn) {
    return res.send('ログインが必要です。');
  }
  if (!req.file) {
    return res.send('ファイルがアップロードされていません。');
  }
  res.send('ファイルアップロードが完了しました: ' + req.file.filename);
});

// Whisperテストエンドポイント
app.get('/whisper-test', async (req, res) => {
    if (!req.session || !req.session.loggedIn) {
      return res.send('ログインが必要です。');
    }
  
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: "これは音声文字起こしのテストです。"}]
      });
      res.send('Whisperテスト成功！出力例: ' + response.data.choices[0].message.content);
    } catch (error) {
      console.error('エラー詳細:', error.response ? error.response.data : error.message);
      res.send('Whisperテストでエラーが発生しました。詳細はサーバーログを確認してください。');
    }
  });

  app.post('/process-video', async (req, res) => {
    if (!req.session || !req.session.loggedIn) {
      return res.send('ログインが必要です。');
    }
  
    // ここでは仮にuploadsフォルダ内で最後にアップロードされたファイル名があるとします
    // 後でファイル名をDBで管理するなど機能拡張予定
    const fs = require('fs');
    const files = fs.readdirSync('uploads');
    if (files.length === 0) {
      return res.send('アップロードされた動画がありません。');
    }
    const latestFile = files[files.length - 1];
    const filePath = `uploads/${latestFile}`;
  
    try {
      // Whisper API呼び出し部分（実際にはWhisper API専用のメソッドで音声ファイルを送信する必要があります）
      // ここでは架空の処理で実装予定箇所としてコメントを残します。
      // 実際にはOpenAIのAudio APIエンドポイントを使用して音声を送信し、文字起こし結果を取得します。
      //
      // 例（仮）：
      // const transcription = await openai.createTranscription({
      //   file: fs.createReadStream(filePath),
      //   model: "whisper-1"
      // });
      //
      // 今はテストのため、文字起こし結果を仮のテキストで返します。
      const transcription = "これはテスト用の文字起こし結果です。";
  
      res.send('文字起こし完了！結果: ' + transcription);
    } catch (error) {
      console.error(error);
      res.send('文字起こしでエラーが発生しました。');
    }
  });

  app.post('/refine-text', async (req, res) => {
    if (!req.session || !req.session.loggedIn) {
      return res.send('ログインが必要です。');
    }
  
    // 実際には直前の文字起こし結果（transcription）をDBや変数で管理する必要がありますが、ここでは仮の固定テキストを使用します
    const transcription = "これはテスト用の文字起こし結果です。 えー、あのー、えっと、ちょっとノイズがあります。";
  
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `以下のテキストから「えー」「あのー」「えっと」などの不要語を削除し、ノイズが多い部分は推測補正を行い、確定でない部分は「（不明）」と記述してください。また、要約はせず原文に沿った形で校正してください。
  
  テキスト:
  ${transcription}`
        }]
      });
      const refined = response.data.choices[0].message.content;
      res.send('文章校正完了！結果: ' + refined);
    } catch (error) {
      console.error(error);
      res.send('文章校正でエラーが発生しました。');
    }
  });
  
  app.post('/extract-buzz', async (req, res) => {
    if (!req.session || !req.session.loggedIn) {
      return res.send('ログインが必要です。');
    }
  
    // 仮の校正後テキストを使用（将来は校正結果を変数やDBで管理）
    const refinedText = "これはテスト用の文字起こし結果です。ちょっとノイズがあります。";
  
    const prompt = `以下のテキストから、「長く時間をかけて読んでしまう」ようなバズシーンを抽出してください。
  バズシーンごとに以下を数値化してください。
  興味性、共感性、独自性、説得力、優しさ、ユーモア度、魅力度、意外性、話題性、感情（喜怒哀楽）を0～10点で評価
  バズスコア（0～100点）も算出
  バズシーンは開始・終了時間は仮で「00:00:10～00:00:20」などの任意の値をつけてください（実際には動画長さから計算予定）。
  JSON形式で以下フォーマットで返してください。
  
  [
    {
      "start": "00:00:XX",
      "end": "00:00:YY",
      "text": "バズシーンの抜粋文章",
      "buzz_score": 数値,
      "stats": {
        "興味性": 数値,
        "共感性": 数値,
        "独自性": 数値,
        "説得力": 数値,
        "優しさ": 数値,
        "ユーモア度": 数値,
        "魅力度": 数値,
        "意外性": 数値,
        "話題性": 数値,
        "感情": 数値
      }
    }
  ]
  
  テキスト:
  ${refinedText}`;
  
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt}]
      });
      res.send('バズシーン抽出完了！結果JSON: ' + response.data.choices[0].message.content);
    } catch (error) {
      console.error(error);
      res.send('バズシーン抽出でエラーが発生しました。');
    }
  });
  

  app.get('/result', (req, res) => {
    if (!req.session || !req.session.loggedIn) {
      return res.send('ログインが必要です。');
    }
    // 後で抽出結果をDBから取得する予定だが、今は仮のJSONを送る
    const mockResult = [
      {
        "start": "00:00:00",
        "end": "00:00:15",
        "text": "これはテスト用の文字起こし結果です。",
        "buzz_score": 60,
        "stats": {
          "興味性": 6,
          "共感性": 7,
          "独自性": 4,
          "説得力": 6,
          "優しさ": 5,
          "ユーモア度": 3,
          "魅力度": 5,
          "意外性": 3,
          "話題性": 5,
          "感情": 4
        }
      }
    ];
    res.json(mockResult);
  });
  

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
