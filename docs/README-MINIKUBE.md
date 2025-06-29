# Minikube環境でのローカルビルド・デプロイガイド

このガイドでは、Minikube環境でのローカルビルドとデプロイの手順を説明します。

## 🚀 クイックスタート

### 1. 完全自動デプロイ（推奨）
```bash
# ビルドからデプロイまで自動実行
./deploy-minikube-complete.sh

# クリーンインストール
./deploy-minikube-complete.sh --clean
```

### 2. 手動ステップ実行
```bash
# 1. ローカルビルド
./build-minikube.sh

# 2. マニフェスト適用
cd ../manifest
./deploy-minikube.sh
```

## 📋 前提条件

### 必要なツール
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Docker](https://docs.docker.com/get-docker/)
- [Make](https://www.gnu.org/software/make/)

### Minikubeの起動
```bash
# 基本的な起動
minikube start

# 高スペック設定で起動（推奨）
minikube start --cpus 4 --memory 8192 --disk-size 20g
```

## 🔧 ビルド方法

### 1. 自動ビルドスクリプト（推奨）
```bash
# 基本的なビルド
./build-minikube.sh

# クリーンビルド（既存イメージを削除）
./build-minikube.sh --clean

# セキュリティスキャン付きビルド
./build-minikube.sh --scan

# クリーンビルド + セキュリティスキャン
./build-minikube.sh --clean --scan
```

### 2. Makefileを使用
```bash
# Minikube環境でのビルド
make minikube-build

# 開発用イメージのビルド
make minikube-build-dev

# イメージをMinikubeに読み込み
make minikube-load
```

### 3. 手動ビルド
```bash
# MinikubeのDocker環境を設定
eval $(minikube docker-env)

# イメージをビルド
docker build --target minikube-local -t api-nodejs-k8s:latest .
```

## 🚀 デプロイ方法

### 1. 完全自動デプロイ
```bash
# ビルドからデプロイまで一括実行
./deploy-minikube-complete.sh

# クリーンインストール
./deploy-minikube-complete.sh --clean
```

### 2. 手動デプロイ
```bash
# 1. Ingressアドオンの有効化
minikube addons enable ingress

# 2. マニフェストの適用
kubectl apply -f ../manifest/10-all-in-one.yaml
kubectl apply -f ../manifest/11-minikube-setup.yaml

# 3. デプロイ完了待機
kubectl wait --for=condition=available --timeout=300s deployment/express-deploy -n express-app
```

### 3. Makefileを使用したデプロイ
```bash
# ビルドとデプロイを一括実行
make minikube-all

# リセットして再デプロイ
make minikube-reset
```

## 📱 アクセス方法

### 1. Port-forward（推奨）
```bash
# メインサービス
kubectl port-forward svc/express-svc 8080:80 -n express-app

# NodePortサービス
kubectl port-forward svc/express-svc-nodeport 8080:80 -n express-app
```

### 2. Minikube IP
```bash
# ブラウザで自動開く
minikube service express-svc-nodeport -n express-app
```

### 3. 直接アクセス
```bash
# MinikubeのIPアドレスを取得
minikube ip

# ブラウザで http://<minikube-ip>:30080 にアクセス
```

## 🔍 動作確認

### ヘルスチェック
```bash
# ヘルスチェック
curl http://localhost:8080/healthz

# レディネスチェック
curl http://localhost:8080/readyz

# メトリクス
curl http://localhost:8080/metrics

# 設定確認
curl http://localhost:8080/config
```

### 状態確認
```bash
# Podの状態
kubectl get pods -n express-app

# Serviceの状態
kubectl get svc -n express-app

# Ingressの状態
kubectl get ingress -n express-app

# HPAの状態
kubectl get hpa -n express-app
```

## 🛠️ トラブルシューティング

### よくある問題

#### 1. イメージが見つからない
```bash
# MinikubeのDocker環境を確認
eval $(minikube docker-env)
docker images | grep api-nodejs-k8s

# イメージを再ビルド
./build-minikube.sh --clean
```

#### 2. Podが起動しない
```bash
# Podの詳細確認
kubectl describe pod <pod-name> -n express-app

# ログ確認
kubectl logs <pod-name> -n express-app

# イベント確認
kubectl get events -n express-app --sort-by='.lastTimestamp'
```

#### 3. Ingressが動作しない
```bash
# Ingressアドオンの確認
minikube addons list | grep ingress

# Ingressアドオンの有効化
minikube addons enable ingress

# Ingress Controllerの確認
kubectl get pods -n ingress-nginx
```

#### 4. セキュリティポリシー違反
```bash
# 一時的にセキュリティ設定を緩和
kubectl patch deployment express-deploy -n express-app \
  -p '{"spec":{"template":{"spec":{"securityContext":{"runAsNonRoot":false}}}}}'
```

## 🔧 開発・デバッグ

### ログ確認
```bash
# リアルタイムログ
kubectl logs -f deployment/express-deploy -n express-app

# 特定のPodのログ
kubectl logs <pod-name> -n express-app
```

### コンテナ内でのデバッグ
```bash
# コンテナにシェルで接続
kubectl exec -it <pod-name> -n express-app -- /bin/sh

# プロセス確認
kubectl exec <pod-name> -n express-app -- ps aux
```

### リソース使用量確認
```bash
# Podのリソース使用量
kubectl top pods -n express-app

# ノードのリソース使用量
kubectl top nodes
```

## 🧪 負荷テスト

### 負荷注入
```bash
# heyツールを使用した負荷テスト
hey -z 2m -c 50 http://localhost:8080/

# HPAの動作確認
kubectl get hpa -n express-app -w
```

### メトリクス確認
```bash
# Prometheusメトリクス
curl http://localhost:8080/metrics

# カスタムメトリクス
curl http://localhost:8080/metrics | grep express
```

## 🧹 クリーンアップ

### リソースの削除
```bash
# 名前空間ごと削除
kubectl delete namespace express-app

# イメージの削除
eval $(minikube docker-env)
docker rmi api-nodejs-k8s:latest
```

### 完全クリーンアップ
```bash
# Makefileを使用
make minikube-clean

# 手動で削除
kubectl delete namespace express-app --ignore-not-found=true
eval $(minikube docker-env) && docker rmi api-nodejs-k8s:latest
```

## 📊 パフォーマンス最適化

### ビルド時間の短縮
```bash
# BuildKitを使用した並列ビルド
DOCKER_BUILDKIT=1 docker build --target minikube-local -t api-nodejs-k8s:latest .

# キャッシュを活用したビルド
docker build --target minikube-local --build-arg BUILDKIT_INLINE_CACHE=1 -t api-nodejs-k8s:latest .
```

### リソース使用量の最適化
```bash
# イメージサイズの確認
docker images api-nodejs-k8s:latest

# 不要なレイヤーの削除
docker system prune -a
```

## 🔒 セキュリティ

### セキュリティスキャン
```bash
# Trivyを使用したスキャン
trivy image api-nodejs-k8s:latest

# 高リスクのみ表示
trivy image api-nodejs-k8s:latest --severity HIGH,CRITICAL
```

### セキュリティ設定の確認
```bash
# Podのセキュリティ設定確認
kubectl get pod <pod-name> -n express-app -o yaml | grep -A 10 securityContext

# 非root実行の確認
kubectl exec <pod-name> -n express-app -- whoami
```

## 📚 参考資料

- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/multistage-build/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)

---

このガイドを使用して、Minikube環境での効率的な開発・デプロイを進めてください！ 