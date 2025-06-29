# Docker image settings
IMAGE_NAME = api-nodejs-k8s
IMAGE_TAG = latest
FULL_IMAGE_NAME = $(IMAGE_NAME):$(IMAGE_TAG)

# Container settings
CONTAINER_NAME = api-nodejs-k8s-container
PORT = 8000

.PHONY: help build run test clean docker-build docker-run docker-test docker-clean

help: ## このヘルプメッセージを表示
	@echo "利用可能なコマンド:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## アプリケーションをビルド
	npm install

run: ## 開発サーバーを起動
	npm run dev

test: ## テストを実行
	npm test

clean: ## クリーンアップ
	rm -rf node_modules package-lock.json

docker-build: ## Dockerイメージをビルド（本番用）
	sudo docker build -t $(FULL_IMAGE_NAME) .

docker-build-dev: ## 開発用Dockerイメージをビルド
	sudo docker build --target development -t $(IMAGE_NAME):dev .

docker-build-prod: ## 本番用Dockerイメージをビルド
	sudo docker build --target production -t $(FULL_IMAGE_NAME) .

docker-build-minikube: ## Minikube用Dockerイメージをビルド（ローカルビルド対応）
	sudo docker build --target minikube-local -t $(FULL_IMAGE_NAME) .

docker-run: ## Dockerコンテナを起動
	sudo docker run -d --name $(CONTAINER_NAME) -p $(PORT):$(PORT) $(FULL_IMAGE_NAME)

docker-test: ## Dockerコンテナでテストを実行
	sudo docker run --rm $(FULL_IMAGE_NAME) npm test

docker-clean: ## Dockerコンテナとイメージを削除
	sudo docker stop $(CONTAINER_NAME) 2>/dev/null || true
	sudo docker rm $(CONTAINER_NAME) 2>/dev/null || true
	sudo docker rmi $(FULL_IMAGE_NAME) 2>/dev/null || true

docker-logs: ## Dockerコンテナのログを表示
	sudo docker logs $(CONTAINER_NAME)

docker-exec: ## Dockerコンテナにシェルで接続
	sudo docker exec -it $(CONTAINER_NAME) /bin/sh

docker-health: ## Dockerコンテナのヘルスチェック
	curl -f http://localhost:$(PORT)/healthz || echo "Health check failed"

docker-metrics: ## Dockerコンテナのメトリクスを取得
	curl http://localhost:$(PORT)/metrics

docker-config: ## Dockerコンテナの設定を確認
	curl http://localhost:$(PORT)/config

# セキュリティ関連のコマンド
docker-scan: ## Dockerイメージのセキュリティスキャン
	sudo docker scan $(FULL_IMAGE_NAME)

docker-vulnerabilities: ## 依存関係の脆弱性チェック
	sudo docker run --rm $(FULL_IMAGE_NAME) npm audit

# Minikube環境用コマンド
minikube-build: ## Minikube環境でDockerイメージをビルド
	eval $$(minikube docker-env) && \
	docker build --target minikube-local -t $(FULL_IMAGE_NAME) .

minikube-build-dev: ## Minikube環境で開発用イメージをビルド
	eval $$(minikube docker-env) && \
	docker build --target development -t $(IMAGE_NAME):dev .

minikube-load: ## ローカルイメージをMinikubeに読み込み
	minikube image load $(FULL_IMAGE_NAME)

minikube-deploy: ## Minikube環境にデプロイ
	@echo "Minikube環境にデプロイ中..."
	@echo "1. イメージをビルド中..."
	$(MAKE) minikube-build
	@echo "2. マニフェストを適用中..."
	kubectl apply -f ../manifest/10-all-in-one.yaml
	kubectl apply -f ../manifest/11-minikube-setup.yaml
	@echo "3. デプロイ完了を待機中..."
	kubectl wait --for=condition=available --timeout=300s deployment/express-deploy -n express-app
	@echo "✅ デプロイ完了！"
	@echo "アクセス方法: kubectl port-forward svc/express-svc 8080:80 -n express-app"

minikube-clean: ## Minikube環境のリソースをクリーンアップ
	kubectl delete namespace express-app --ignore-not-found=true
	eval $$(minikube docker-env) && \
	docker rmi $(FULL_IMAGE_NAME) 2>/dev/null || true

# 本番環境用コマンド
docker-build-prod: ## 本番用Dockerイメージをビルド
	sudo docker build --no-cache -t $(FULL_IMAGE_NAME) .

docker-run-prod: ## 本番環境でDockerコンテナを起動
	sudo docker run -d --name $(CONTAINER_NAME) \
		-p $(PORT):$(PORT) \
		-e NODE_ENV=production \
		-e PORT=$(PORT) \
		$(FULL_IMAGE_NAME)

# 開発環境用コマンド
docker-run-dev: ## 開発環境でDockerコンテナを起動
	sudo docker run -d --name $(CONTAINER_NAME)-dev \
		-p $(PORT):$(PORT) \
		-v $(PWD):/app \
		-e NODE_ENV=development \
		$(IMAGE_NAME):dev

# 一括実行コマンド
all: docker-build docker-run ## Dockerイメージをビルドして起動

all-clean: docker-clean clean ## すべてのリソースをクリーンアップ

test-all: test docker-test ## すべてのテストを実行

# Minikube一括実行
minikube-all: minikube-build minikube-deploy ## Minikube環境でビルドとデプロイを実行

minikube-reset: minikube-clean minikube-all ## Minikube環境をリセットして再デプロイ 