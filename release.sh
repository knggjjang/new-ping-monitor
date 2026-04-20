#!/bin/bash

# package.json에서 버전 추출
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "🚀 New Ping Monitor $TAG 자동 릴리즈를 시작합니다..."

# 1. 모든 변경사항 커밋
git add .
git commit -m "release: $TAG"

# 2. 기존 원격/로컬 태그가 있다면 삭제 (중복 방지)
echo "🧹 기존 태그 정리 중..."
git tag -d $TAG 2>/dev/null
git push origin :refs/tags/$TAG 2>/dev/null

# 3. 새로운 태그 생성 및 푸시
echo "📌 태그 생성 및 푸시 중 ($TAG)..."
git tag $TAG
git push origin main
git push origin $TAG

echo "✨ 모든 작업이 완료되었습니다! GitHub Actions에서 빌드 상황을 확인하세요."
