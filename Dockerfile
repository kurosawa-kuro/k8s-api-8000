# ---- Build stage （マルチステージで脆弱性と容量を最小化）----
FROM node:18-alpine AS builder

# セキュリティ: パッケージリストを更新
RUN apk update && apk upgrade

WORKDIR /app

# 依存関係を先にコピーしてキャッシュを活用
COPY package*.json ./

# セキュリティ: npm auditを実行して脆弱性をチェック
RUN npm ci --omit=dev && \
    npm audit --audit-level=moderate || true

# ソースコードをコピー
COPY . .

# セキュリティ: 不要なファイルを削除
RUN rm -rf tests/ docs/ .git/ .gitignore README.md

# ---- Development stage (Minikube用) ----
FROM node:18-alpine AS development

# セキュリティ: パッケージリストを更新
RUN apk update && apk upgrade

WORKDIR /app

# 開発用依存関係を含めてインストール
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# セキュリティ: 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# ファイルの所有者を変更
RUN chown -R nodejs:nodejs /app

# セキュリティ: 環境変数を設定
ENV NODE_ENV=development
ENV PORT=8000

# セキュリティ: 非rootユーザーに切り替え
USER nodejs

# 開発用ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 8000

# 開発用コマンド（ファイル監視付き）
CMD ["npm", "run", "dev"]

# ---- Runtime stage (本番用) ----
FROM node:18-alpine AS production

# セキュリティ: 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# ビルドステージからアプリケーションをコピー
COPY --from=builder --chown=nodejs:nodejs /app /app

# セキュリティ: 不要な権限を削除（root権限で実行）
RUN chmod -R 755 /app

# セキュリティ: 環境変数を設定
ENV NODE_ENV=production
ENV PORT=8000

# セキュリティ: 非rootユーザーに切り替え
USER nodejs

# セキュリティ: ヘルスチェックを追加
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 8000

# セキュリティ: エントリーポイントを指定
CMD ["node", "server.js"]

# ---- Minikube local build stage ----
FROM node:18-alpine AS minikube-local

# セキュリティ: パッケージリストを更新
RUN apk update && apk upgrade

WORKDIR /app

# 依存関係を先にコピーしてキャッシュを活用
COPY package*.json ./

# Minikube環境用の依存関係インストール
RUN npm ci --omit=dev && \
    npm audit --audit-level=moderate || true

# ソースコードをコピー
COPY . .

# セキュリティ: 不要なファイルを削除
RUN rm -rf tests/ docs/ .git/ .gitignore README.md

# セキュリティ: 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# ファイルの所有者を変更
RUN chown -R nodejs:nodejs /app

# セキュリティ: 環境変数を設定
ENV NODE_ENV=production
ENV PORT=8000

# セキュリティ: 非rootユーザーに切り替え
USER nodejs

# セキュリティ: ヘルスチェックを追加
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 8000

# セキュリティ: エントリーポイントを指定
CMD ["node", "server.js"] 