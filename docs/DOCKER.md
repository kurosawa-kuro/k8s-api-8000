# Docker セットアップガイド

## 概要

このプロジェクトは、CKS（Certified Kubernetes Security）対応のDockerイメージを提供しています。セキュリティを最優先に設計されたマルチステージビルドを使用しています。

## セキュリティ対策

### 1. 非rootユーザー実行
- `nodejs`ユーザー（UID: 1001）でアプリケーションを実行
- root権限を完全に排除
- Pod側の`runAsNonRoot: true`と組み合わせて多層防御

### 2. マルチステージビルド
- ビルドステージとランタイムステージを分離
- 不要なファイルとツールを削除
- イメージサイズを約80MiBに圧縮

### 3. 脆弱性対策
- `npm audit`による依存関係の脆弱性チェック
- Alpine Linuxの最新パッケージを使用
- 不要なパッケージとキャッシュを削除

### 4. ファイル権限の最小化
- アプリケーションファイルの権限を755に設定
- 必要最小限の権限のみ付与

## 使用方法

### 基本的なビルドと実行

```bash
# Dockerイメージをビルド
make docker-build

# コンテナを起動
make docker-run

# ヘルスチェック
make docker-health
```

### 開発環境

```bash
# 開発用イメージをビルド
make docker-build-dev

# 開発環境でコンテナを起動（ボリュームマウント付き）
make docker-run-dev
```

### 本番環境

```bash
# 本番用イメージをビルド（キャッシュ無効）
make docker-build-prod

# 本番環境でコンテナを起動
make docker-run-prod
```

## セキュリティスキャン

```bash
# Dockerイメージのセキュリティスキャン
make docker-scan

# 依存関係の脆弱性チェック
make docker-vulnerabilities
```

## Kubernetes デプロイメント

### Pod Security Standards 対応

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-nodejs-k8s
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
  containers:
  - name: api
    image: api-nodejs-k8s:latest
    ports:
    - containerPort: 8000
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

### Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api-nodejs-k8s
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

## 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `NODE_ENV` | `production` | 実行環境 |
| `PORT` | `8000` | サーバーポート |

## ヘルスチェック

Dockerイメージには組み込みのヘルスチェックが含まれています：

- **間隔**: 30秒
- **タイムアウト**: 3秒
- **開始待機時間**: 5秒
- **リトライ回数**: 3回
- **エンドポイント**: `/healthz`

## トラブルシューティング

### コンテナが起動しない場合

1. ログを確認：
```bash
make docker-logs
```

2. コンテナに接続して調査：
```bash
make docker-exec
```

3. ヘルスチェックを実行：
```bash
make docker-health
```

### セキュリティスキャンで脆弱性が検出された場合

1. 依存関係を更新：
```bash
npm update
```

2. セキュリティスキャンを再実行：
```bash
make docker-scan
```

3. 必要に応じてDockerfileを更新

## ベストプラクティス

### 1. イメージの定期的な更新
- ベースイメージの更新
- 依存関係の脆弱性チェック
- セキュリティパッチの適用

### 2. 最小権限の原則
- 必要最小限の権限のみ付与
- 不要な機能を無効化
- セキュリティコンテキストの適切な設定

### 3. 監視とログ
- アプリケーションログの監視
- メトリクスの収集
- 異常検知の実装

### 4. バックアップと復旧
- 設定ファイルのバックアップ
- データの永続化
- 災害復旧計画の策定

## 参考資料

- [Docker Security Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [CKS Exam Curriculum](https://www.cncf.io/certification/cks/) 