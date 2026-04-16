# ⚡ New Ping Monitor (뉴 핑 모니터)

> **실시간 네트워크 지연시간 모니터링을 위한 프리미엄 데스크탑 앱**

[![Release](https://img.shields.io/github/v/release/jyyun/new-ping-monitor?color=neon-blue&style=flat-square)](https://github.com/jyyun/new-ping-monitor/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=flat-square)](#)
[![Tech Stack](https://img.shields.io/badge/Next.js%2015-Tauri%20v2-orange?style=flat-square)](#)

New Ping Monitor는 네트워크 상태를 실시간으로 감시하고 시각화하는 고성능 데스크탑 애플리케이션입니다. 기존의 C++ 기반 핑 모니터를 현대적인 **Tauri v2**와 **Next.js** 기술로 재탄생시켰으며, 메인 화면에 통합된 세련된 타이틀 바와 네온 테마의 프리미엄 UI를 제공합니다.

---

## ✨ 핵심 기능

### 1. 통합 타이틀 바 & 프리미엄 UI
- **Integrated Design**: 상단 제목 표시줄이 메인 화면과 자연스럽게 통합된 프레임리스(Frameless) 디자인을 적용했습니다.
- **Neon Aesthetic**: 다크 모드 기반의 네온 글로우(Neon Glow) 효과와 글래스모피즘(Glassmorphism) 스타일로 시각적 완성도를 높였습니다.

### 2. 실시간 지연시간 대시보드
- **다이내믹 차트**: 각 타겟별 네트워크 지연시간(Latency)을 실시간 그래프로 시각화합니다.
- **상태 애니메이션**: 온라인/오프라인 상태 변화에 따라 부드러운 전환 애니메이션과 네온 컬러 효과를 제공합니다.

### 3. 사용자 정의 및 색상 최적화
- **색상 커스터마이징**: 사용자가 직접 온라인 및 오프라인 상태의 네온 색상을 변경할 수 있습니다.
- **타겟 관리**: 모니터링할 도메인이나 IP 주소를 간편하게 추가, 수정하고 관리할 수 있습니다.

### 4. 강력한 크로스 플랫폼 지원
- **멀티 OS**: Windows, macOS, Linux에서 모두 사용 가능합니다.
- **자동 빌드 & 배포**: GitHub Actions를 통해 최신 버전을 자동으로 빌드하고 릴리즈합니다.

---

## 🚀 시작하기

### 설치 방법

1.  본 저장소의 **[Releases](https://github.com/jyyun/new-ping-monitor/releases)** 페이지로 이동합니다.
2.  사용 중인 운영체제에 맞는 설치 파일을 다운로드합니다.
    -   **Windows**: `.exe` 또는 `.msi`
    -   **macOS**: `.dmg` (Apple Silicon & Intel)
    -   **Linux**: `.AppImage` 또는 `.deb`
3.  다운로드한 파일을 실행하여 설치를 완료합니다.

### 실행 방법
-   앱 실행 후 상단의 **Settings** 아이콘을 눌러 실시간 모니터링할 타겟 리스트를 구성하세요.

---

## 🛠 기술 스택

-   **Frontend**: Next.js 15 (App Router), React, Tailwind CSS 4, Lucide React
-   **Backend**: Tauri v2, Rust (Surge-Ping 기반 고성능 ICMP 엔진)
-   **State Management**: Zustand (Persistence 지원)
-   **UI Components**: Recharts (실시간 시각화), Framer Motion

---

## 🔒 보안 및 성능
이 앱은 Rust의 강력한 성능을 바탕으로 매우 낮은 CPU 점유율을 유지하며, 모든 설정 데이터는 사용자의 로컬 기기에만 안전하게 저장됩니다.

---

## ✍️ 작성 및 관리
이 프로젝트는 **Antigravity (AI Coding Assistant)**와 함께 제작되었으며, 최신 웹 기술과 네이티브 성능의 조화를 목표로 합니다.

---
© 2026 jyyun. All rights reserved.
