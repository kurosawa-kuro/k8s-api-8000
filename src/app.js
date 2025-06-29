import express from 'express';
import promBundle from 'express-prom-bundle';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import { specs } from './swagger.js';

// テスト時はdotenvを読み込まない
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

// 開発環境のデフォルト設定
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const app  = express();

// CORS設定
const corsOptions = process.env.NODE_ENV === 'production' 
  ? {
      origin: [
        'https://api.example.com',
        'https://yourdomain.com'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      optionsSuccessStatus: 200
    }
  : {
      origin: true, // 開発環境では全てのオリジンを許可
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      optionsSuccessStatus: 200
    };

app.use(cors(corsOptions));

// OPTIONSリクエストの明示的処理
app.options('*', cors(corsOptions));

// Prometheus metrics ( /metrics )
app.use(promBundle({ includeMethod: true, promClient: { collectDefaultMetrics: {} } }));

// Env‑based config
const APP_GREETING = process.env.APP_GREETING ?? 'Hello from Express!';
const API_KEY      = process.env.API_KEY      ?? 'not‑set';

console.log("APP_GREETING",APP_GREETING);
console.log("API_KEY", API_KEY);

// HTTP request logger middleware
app.use(morgan('combined'));

// セキュリティ: x-powered-byヘッダーを無効化
app.disable('x-powered-by');

// JSON body parser
app.use(express.json());

// API Key認証ミドルウェア（開発環境用）
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return next();
  }
  
  // 本番環境での認証チェック
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Documentation',
  swaggerOptions: {
    url: '/api-docs/swagger.json',
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // APIキーを自動的に追加（テスト用）
      if (!req.headers['X-API-Key']) {
        req.headers['X-API-Key'] = 'test-api-key';
      }
      return req;
    }
  },
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js'
  ],
  customCssUrl: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css'
  ]
}));

// Swagger JSON endpoint
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Routes with Swagger documentation
/**
 * @swagger
 * /:
 *   get:
 *     summary: アプリケーションの挨拶メッセージを取得
 *     description: 設定された挨拶メッセージを返します
 *     tags: [General]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Hello from Express!"
 */
app.get('/',      (_req, res) => res.send(APP_GREETING));

/**
 * @swagger
 * /healthz:
 *   get:
 *     summary: ヘルスチェック
 *     description: アプリケーションの健全性を確認します
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: アプリケーションが正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
app.get('/healthz',(_req, res) => res.json({ status: 'ok' }));

/**
 * @swagger
 * /readyz:
 *   get:
 *     summary: レディネスチェック
 *     description: アプリケーションがリクエストを受け取る準備ができているかを確認します
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: アプリケーションが準備完了
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ready"
 */
app.get('/readyz', (_req, res) => res.json({ status: 'ready' }));

/**
 * @swagger
 * /config:
 *   get:
 *     summary: アプリケーション設定を取得
 *     description: 現在のアプリケーション設定を返します
 *     tags: [Configuration]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 設定情報
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 APP_GREETING:
 *                   type: string
 *                   description: 挨拶メッセージ
 *                   example: "Hello from Express!"
 *                 API_KEY:
 *                   type: string
 *                   description: APIキー（設定されている場合）
 *                   example: "not-set"
 *       401:
 *         description: 認証エラー
 */
app.get('/config', apiKeyAuth, (_req, res) => res.json({ APP_GREETING, API_KEY }));

// ユーザー管理エンドポイント
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: ユーザーID
 *           example: "user-123"
 *         email:
 *           type: string
 *           format: email
 *           description: ユーザーのメールアドレス
 *           example: "user@example.com"
 *         name:
 *           type: string
 *           description: ユーザー名
 *           example: "DefaultUser"
 *         role:
 *           type: string
 *           enum: [user, admin, read-only-admin]
 *           description: ユーザーロール
 *           example: "user"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 作成日時
 *           example: "2024-01-01T00:00:00Z"
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: ユーザーのメールアドレス
 *           example: "user@example.com"
 *         name:
 *           type: string
 *           description: ユーザー名
 *           example: "DefaultUser"
 *         password:
 *           type: string
 *           description: パスワード
 *           example: "password"
 *         role:
 *           type: string
 *           enum: [user, admin, read-only-admin]
 *           description: ユーザーロール
 *           example: "user"
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: ユーザー一覧を取得
 *     description: 登録されているユーザーの一覧を取得します
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: ページ番号
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 1ページあたりの件数
 *     responses:
 *       200:
 *         description: ユーザー一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: 認証エラー
 *       500:
 *         description: サーバーエラー
 *   post:
 *     summary: 新規ユーザーを作成
 *     description: 新しいユーザーを登録します
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: ユーザー作成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: バリデーションエラー
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid email format"
 *       401:
 *         description: 認証エラー
 *       409:
 *         description: ユーザーが既に存在
 *       500:
 *         description: サーバーエラー
 */
app.get('/api/users', apiKeyAuth, (req, res) => {
  // モックデータを返す
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const mockUsers = [
    {
      id: 'user-1',
      email: 'user@example.com',
      name: 'DefaultUser',
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'SystemAdmin',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];
  
  res.json({
    users: mockUsers,
    pagination: {
      page,
      limit,
      total: mockUsers.length,
      totalPages: Math.ceil(mockUsers.length / limit)
    }
  });
});

app.post('/api/users', apiKeyAuth, (req, res) => {
  const { email, name, password, role = 'user' } = req.body;
  
  // 簡単なバリデーション
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password are required' });
  }
  
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // モックレスポンス
  const newUser = {
    id: `user-${Date.now()}`,
    email,
    name,
    role,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(newUser);
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: ユーザー詳細を取得
 *     description: 指定されたIDのユーザー情報を取得します
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ユーザーID
 *     responses:
 *       200:
 *         description: ユーザー情報
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: ユーザーが見つかりません
 *       500:
 *         description: サーバーエラー
 *   put:
 *     summary: ユーザー情報を更新
 *     description: 指定されたIDのユーザー情報を更新します
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ユーザーID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: ユーザー名
 *               role:
 *                 type: string
 *                 enum: [user, admin, read-only-admin]
 *                 description: ユーザーロール
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: ユーザーが見つかりません
 *       500:
 *         description: サーバーエラー
 *   delete:
 *     summary: ユーザーを削除
 *     description: 指定されたIDのユーザーを削除します
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ユーザーID
 *     responses:
 *       204:
 *         description: 削除成功
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: ユーザーが見つかりません
 *       500:
 *         description: サーバーエラー
 */
app.get('/api/users/:userId', apiKeyAuth, (req, res) => {
  const { userId } = req.params;
  
  // モックデータ
  const mockUser = {
    id: userId,
    email: 'user@example.com',
    name: 'DefaultUser',
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z'
  };
  
  res.json(mockUser);
});

app.put('/api/users/:userId', apiKeyAuth, (req, res) => {
  const { userId } = req.params;
  const { name, role } = req.body;
  
  // モックレスポンス
  const updatedUser = {
    id: userId,
    email: 'user@example.com',
    name: name || 'DefaultUser',
    role: role || 'user',
    createdAt: '2024-01-01T00:00:00Z'
  };
  
  res.json(updatedUser);
});

app.delete('/api/users/:userId', apiKeyAuth, (req, res) => {
  res.status(204).send();
});

const port = process.env.PORT || 8000;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Listening on ${port}`));
}

// Export app for testing
export default app; 