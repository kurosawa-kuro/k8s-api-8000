#!/bin/bash

# Docker Hub デプロイスクリプト
# 使用方法: ./deploy-dockerhub.sh [DOCKER_USERNAME] [IMAGE_TAG]

set -e

# 色付きのログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# デフォルト値の設定
DEFAULT_DOCKER_USERNAME="your-dockerhub-username"
DEFAULT_IMAGE_TAG="latest"

# 引数の処理
DOCKER_USERNAME=${1:-$DEFAULT_DOCKER_USERNAME}
IMAGE_TAG=${2:-$DEFAULT_IMAGE_TAG}

# イメージ名の設定
IMAGE_NAME="api-nodejs-k8s"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"

log_info "Docker Hub デプロイを開始します..."
log_info "Docker Username: $DOCKER_USERNAME"
log_info "Image Tag: $IMAGE_TAG"
log_info "Full Image Name: $FULL_IMAGE_NAME"

# 1. Docker Hubへのログイン確認
log_info "Docker Hubへのログイン状態を確認中..."
if ! docker info > /dev/null 2>&1; then
    log_error "Dockerが起動していません。Dockerを起動してください。"
    exit 1
fi

# Docker Hubログイン状態の確認
if ! docker system info | grep -q "Username"; then
    log_warning "Docker Hubにログインしていません。ログインしてください。"
    echo "以下のコマンドでログインしてください："
    echo "docker login"
    echo ""
    read -p "ログイン後にEnterキーを押してください..."
fi

# 2. 既存のイメージをクリーンアップ
log_info "既存のイメージをクリーンアップ中..."
docker rmi $FULL_IMAGE_NAME 2>/dev/null || true
docker rmi $IMAGE_NAME 2>/dev/null || true

# 3. Dockerイメージのビルド
log_info "Dockerイメージをビルド中..."
log_info "イメージ名: $FULL_IMAGE_NAME"

# 権限問題を回避するためDOCKER_BUILDKIT=0を使用
export DOCKER_BUILDKIT=0

# 本番用イメージをビルド
docker build \
    --target production \
    --tag $FULL_IMAGE_NAME \
    --file Dockerfile \
    .

if [ $? -eq 0 ]; then
    log_success "Dockerイメージのビルドが完了しました"
else
    log_error "Dockerイメージのビルドに失敗しました"
    exit 1
fi

# 4. イメージのテスト
log_info "ビルドしたイメージをテスト中..."
docker run --rm -d --name test-container -p 8000:8000 $FULL_IMAGE_NAME

# ヘルスチェックの待機
sleep 10

# ヘルスチェックの実行
if curl -f http://localhost:8000/healthz > /dev/null 2>&1; then
    log_success "イメージのテストが成功しました"
else
    log_error "イメージのテストに失敗しました"
    docker stop test-container 2>/dev/null || true
    exit 1
fi

# テストコンテナを停止
docker stop test-container 2>/dev/null || true

# 5. Docker Hubへのプッシュ
log_info "Docker Hubにプッシュ中..."
docker push $FULL_IMAGE_NAME

if [ $? -eq 0 ]; then
    log_success "Docker Hubへのプッシュが完了しました"
    echo ""
    log_info "デプロイ情報:"
    echo "  Image: $FULL_IMAGE_NAME"
    echo "  Pull Command: docker pull $FULL_IMAGE_NAME"
    echo "  Run Command: docker run -p 8000:8000 $FULL_IMAGE_NAME"
    echo ""
    log_info "Docker Hub URL: https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME"
else
    log_error "Docker Hubへのプッシュに失敗しました"
    exit 1
fi

# 6. 追加のタグ（latest）の作成
if [ "$IMAGE_TAG" != "latest" ]; then
    log_info "latestタグも作成中..."
    docker tag $FULL_IMAGE_NAME "${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
    docker push "${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
    
    if [ $? -eq 0 ]; then
        log_success "latestタグのプッシュが完了しました"
    else
        log_warning "latestタグのプッシュに失敗しました"
    fi
fi

log_success "Docker Hubデプロイが完了しました！" 