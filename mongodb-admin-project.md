# MongoDB 관리자 화면 프로젝트 설계서

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [Docker 구성](#3-docker-구성)
4. [Frontend 설계](#4-frontend-설계)
5. [Backend 설계](#5-backend-설계)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [API 명세](#7-api-명세)
8. [디렉토리 구조](#8-디렉토리-구조)
9. [개발 환경 설정](#9-개발-환경-설정)
10. [배포 가이드](#10-배포-가이드)

---

## 1. 프로젝트 개요

### 목적
MongoDB 데이터 수집 서버 3대를 중앙에서 모니터링하고 관리하는 웹 기반 관리자 화면을 제공한다. Logpresso와 유사한 형태의 관리자 UI로, 사용자가 쿼리를 실행하고 결과를 다양한 차트로 시각화하며 시스템 현황을 실시간으로 파악할 수 있다.

### 기술 스택 요약

| 영역 | 기술 |
|---|---|
| Frontend | React, Next.js, TypeScript |
| Backend | Spring Boot 3.x, Java 17 |
| 관리자용 DB | MongoDB (1대) |
| 데이터 수집 DB | MongoDB (3대) |
| 모니터링 | Prometheus + Grafana |
| 인프라 | Docker, Docker Compose |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network                           │
│                                                                 │
│  ┌──────────────┐        ┌──────────────────────────────────┐  │
│  │   Frontend   │──API──▶│          Backend                 │  │
│  │  (Next.js)   │        │       (Spring Boot)              │  │
│  │  Port: 3000  │        │         Port: 8080               │  │
│  └──────────────┘        └──────┬───────────────────────────┘  │
│                                 │                               │
│         ┌───────────────────────┼──────────────────┐           │
│         │                       │                  │           │
│         ▼                       ▼                  ▼           │
│  ┌─────────────┐  ┌──────────────────────────────────────┐    │
│  │  Admin DB   │  │         Data Collection DBs          │    │
│  │  (MongoDB)  │  │                                      │    │
│  │  Port: 27017│  │  mongo-data-1  mongo-data-2  mongo-3 │    │
│  └─────────────┘  │  Port:27018    Port:27019  Port:27020│    │
│                   └──────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │  Prometheus  │  │   Grafana    │                           │
│  │  Port: 9090  │  │  Port: 3001  │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Docker 구성

### 3.1 docker-compose.yml

```yaml
version: '3.8'

networks:
  mongo-admin-net:
    driver: bridge

volumes:
  mongo-admin-data:
  mongo-data1:
  mongo-data2:
  mongo-data3:
  prometheus-data:
  grafana-data:

services:

  # ──────────────────────────────────────
  # Frontend
  # ──────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: frontend
    ports:
      - "9112:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    depends_on:
      - backend
    networks:
      - mongo-admin-net
    restart: unless-stopped

  # ──────────────────────────────────────
  # Backend
  # ──────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend
    ports:
      - "9113:8080"
    environment:
      - SPRING_DATA_MONGODB_URI=mongodb://mongo-admin:27017/admindb
      - JWT_SECRET=your-jwt-secret-key
    depends_on:
      - mongo-admin
    networks:
      - mongo-admin-net
    restart: unless-stopped

  # ──────────────────────────────────────
  # Admin MongoDB (관리자 화면용)
  # ──────────────────────────────────────
  mongo-admin:
    image: mongo:7.0
    container_name: mongo-admin
    ports:
      - "27017:27017"
    volumes:
      - mongo-admin-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin1234
      - MONGO_INITDB_DATABASE=admindb
    networks:
      - mongo-admin-net
    restart: unless-stopped

  # ──────────────────────────────────────
  # Data Collection MongoDB 1
  # ──────────────────────────────────────
  mongo-data-1:
    image: mongo:7.0
    container_name: mongo-data-1
    ports:
      - "27018:27017"
    volumes:
      - mongo-data1:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin1234
    networks:
      - mongo-admin-net
    restart: unless-stopped

  # ──────────────────────────────────────
  # Data Collection MongoDB 2
  # ──────────────────────────────────────
  mongo-data-2:
    image: mongo:7.0
    container_name: mongo-data-2
    ports:
      - "27019:27017"
    volumes:
      - mongo-data2:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin1234
    networks:
      - mongo-admin-net
    restart: unless-stopped

  # ──────────────────────────────────────
  # Data Collection MongoDB 3
  # ──────────────────────────────────────
  mongo-data-3:
    image: mongo:7.0
    container_name: mongo-data-3
    ports:
      - "27020:27017"
    volumes:
      - mongo-data3:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin1234
    networks:
      - mongo-admin-net
    restart: unless-stopped

  # ──────────────────────────────────────
  # Prometheus
  # ──────────────────────────────────────
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9115:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - mongo-admin-net
    restart: unless-stopped

  # ──────────────────────────────────────
  # Grafana
  # ──────────────────────────────────────
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "9114:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin1234
    depends_on:
      - prometheus
    networks:
      - mongo-admin-net
    restart: unless-stopped
```

### 3.2 Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 3.3 Backend Dockerfile

```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN chmod +x gradlew
RUN ./gradlew bootJar -x test

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 3.4 Prometheus 설정 (monitoring/prometheus.yml)

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8080']
    metrics_path: '/actuator/prometheus'

  - job_name: 'mongodb-exporter-1'
    static_configs:
      - targets: ['mongo-data-1:9216']

  - job_name: 'mongodb-exporter-2'
    static_configs:
      - targets: ['mongo-data-2:9216']

  - job_name: 'mongodb-exporter-3'
    static_configs:
      - targets: ['mongo-data-3:9216']
```

---

## 4. Frontend 설계

### 4.1 화면 구성 (페이지 목록)

```
/                        → 리다이렉트 (로그인 여부에 따라 분기)
/auth/login              → 로그인
/auth/register           → 회원가입
/dashboard               → 대시보드 (차트 탭 관리)
/query                   → 쿼리 실행기 (탭 관리)
/admin/users             → 관리자 > 회원관리
/admin/databases         → 관리자 > DB 연결 관리
```

### 4.2 화면별 상세 설계

#### 4.2.1 로그인 / 회원가입

- 반응형 카드 레이아웃
- JWT 기반 인증 (accessToken + refreshToken)
- 로그인 상태 유지 (localStorage)
- 로그인 후 `/dashboard` 리다이렉트
- 비밀번호 유효성 검사, 이메일 형식 검사

#### 4.2.2 대시보드

```
[탭 목록] [+탭 추가]
─────────────────────────────────────────────
탭1  탭2  탭3  ...
─────────────────────────────────────────────
┌────────────────────┐  ┌────────────────────┐
│   차트 1           │  │   차트 2           │
│  (500px × 500px)   │  │  (500px × 500px)   │
│  [수정] [삭제]     │  │  [수정] [삭제]     │
└────────────────────┘  └────────────────────┘
         [+ 차트 추가]
```

**탭 관리**
- 탭 추가 / 탭명 수정 / 탭 삭제
- 탭 순서 드래그앤드롭

**차트 등록 모달**
- DB 연결 선택 (등록된 MongoDB 목록)
- DB / Collection 선택
- MongoDB 쿼리 입력 (예: `{"status": "active"}`)
- 차트 종류 선택: Bar, Line, Pie, Doughnut, Area, Scatter, Table
- 차트 제목 입력
- 기본 크기: 500px × 500px (사용자 조절 가능)

**차트 라이브러리**: Chart.js 또는 Recharts

**차트 데이터 저장**: 관리자용 MongoDB의 `dashboards` 컬렉션에 저장

#### 4.2.3 쿼리 실행기

```
[탭 목록] [+탭 추가]
─────────────────────────────────────────────
┌─────────────────────────────────────────────┐
│  DB 선택: [드롭다운]  Collection: [드롭다운] │
│  ┌───────────────────────────────────────┐  │
│  │  쿼리 입력 영역 (Monaco Editor)       │  │
│  │  { "field": "value" }                 │  │
│  └───────────────────────────────────────┘  │
│  [조회]  [CSV 내보내기]  [JSON / 테이블 토글] │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  결과 영역                                  │
│  (테이블 또는 JSON 뷰어)                    │
└─────────────────────────────────────────────┘
```

- 탭별 독립 쿼리 상태 유지
- Monaco Editor로 쿼리 입력 (문법 하이라이팅)
- 결과 표시: 테이블 뷰 / JSON 뷰 토글
- CSV 내보내기: 현재 조회 결과를 CSV 파일로 다운로드
- 페이지네이션 지원

#### 4.2.4 회원관리 (관리자 전용)

| 컬럼 | 설명 |
|---|---|
| ID | 사용자 고유 번호 |
| 이메일 | 로그인 이메일 |
| 이름 | 사용자명 |
| 역할 | ADMIN / USER |
| 가입일 | 가입 날짜 |
| 상태 | 활성 / 비활성 |
| 관리 | 수정 / 삭제 버튼 |

- 검색 필터 (이메일, 이름, 역할, 상태)
- 페이지네이션

#### 4.2.5 DB 연결 관리 (관리자 전용)

| 컬럼 | 설명 |
|---|---|
| 이름 | 연결 별칭 |
| 호스트 | MongoDB 호스트 |
| 포트 | 포트 번호 |
| DB명 | 데이터베이스 이름 |
| 인증 | 인증 여부 |
| 상태 | 연결됨 / 연결 실패 |
| 관리 | 수정 / 삭제 / 연결 테스트 |

- MongoDB 연결 추가 모달:
  - 연결 별칭, 호스트, 포트, DB명, 사용자명, 비밀번호
  - 연결 테스트 버튼
- 저장된 연결 정보는 관리자용 MongoDB에 저장

### 4.3 공통 컴포넌트

```
components/
├── layout/
│   ├── Sidebar.tsx          # 사이드바 내비게이션
│   ├── Header.tsx           # 상단 헤더 (사용자 정보, 로그아웃)
│   └── Layout.tsx           # 전체 레이아웃 래퍼
├── common/
│   ├── Modal.tsx            # 공통 모달
│   ├── Table.tsx            # 공통 테이블
│   ├── Pagination.tsx       # 페이지네이션
│   ├── Button.tsx           # 공통 버튼
│   └── Toast.tsx            # 알림 토스트
├── dashboard/
│   ├── TabManager.tsx       # 탭 관리
│   ├── ChartCard.tsx        # 차트 카드
│   └── ChartModal.tsx       # 차트 등록/수정 모달
└── query/
    ├── QueryEditor.tsx      # 쿼리 에디터
    └── ResultViewer.tsx     # 결과 뷰어
```

### 4.4 상태 관리

- **전역 상태**: Zustand 또는 React Context API
  - 인증 상태 (사용자 정보, 토큰)
  - DB 연결 목록
- **서버 상태**: React Query (TanStack Query)
  - API 캐싱, 자동 리패치

### 4.5 주요 의존성

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "axios": "1.x",
    "react-query": "5.x",
    "recharts": "2.x",
    "monaco-editor": "0.x",
    "zustand": "4.x",
    "react-beautiful-dnd": "13.x",
    "papaparse": "5.x",
    "tailwindcss": "3.x"
  }
}
```

---

## 5. Backend 설계

### 5.1 모듈 구성

```
com.mongoadmin
├── config/
│   ├── SecurityConfig.java       # Spring Security + JWT
│   ├── MongoAdminConfig.java     # 관리자 MongoDB 설정
│   ├── DynamicMongoConfig.java   # 동적 MongoDB 연결 관리
│   └── CorsConfig.java           # CORS 설정
├── domain/
│   ├── auth/                     # 인증 도메인
│   ├── user/                     # 회원 도메인
│   ├── dashboard/                # 대시보드 도메인
│   ├── query/                    # 쿼리 실행 도메인
│   └── database/                 # DB 연결 관리 도메인
├── common/
│   ├── response/ApiResponse.java # 공통 응답 형식
│   ├── exception/                # 예외 처리
│   └── util/JwtUtil.java         # JWT 유틸
└── MongoAdminApplication.java
```

### 5.2 동적 MongoDB 연결 관리

관리자 화면에서 등록한 DB 연결 정보를 기반으로 런타임에 동적으로 MongoDB 클라이언트를 생성하고 관리한다.

```java
@Component
public class DynamicMongoClientManager {
    
    private final Map<String, MongoClient> clientPool = new ConcurrentHashMap<>();
    
    public MongoClient getOrCreate(DatabaseConnection conn) {
        return clientPool.computeIfAbsent(conn.getId(), id -> {
            String uri = buildUri(conn);
            return MongoClients.create(uri);
        });
    }
    
    public void remove(String connectionId) {
        MongoClient client = clientPool.remove(connectionId);
        if (client != null) client.close();
    }
    
    private String buildUri(DatabaseConnection conn) {
        if (conn.getUsername() != null && !conn.getUsername().isEmpty()) {
            return String.format("mongodb://%s:%s@%s:%d/%s",
                conn.getUsername(), conn.getPassword(),
                conn.getHost(), conn.getPort(), conn.getDatabase());
        }
        return String.format("mongodb://%s:%d/%s",
            conn.getHost(), conn.getPort(), conn.getDatabase());
    }
}
```

### 5.3 보안 구성

- Spring Security 6.x
- JWT (accessToken: 1시간, refreshToken: 7일)
- BCrypt 비밀번호 해싱
- ROLE_ADMIN, ROLE_USER 권한 분리
- DB 비밀번호: AES-256 암호화 후 MongoDB에 저장

### 5.4 주요 의존성 (build.gradle)

```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-mongodb'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'io.micrometer:micrometer-registry-prometheus'
    implementation 'io.jsonwebtoken:jjwt-api:0.12.3'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.3'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.3'
    implementation 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

---

## 6. 데이터베이스 설계

### 6.1 관리자 MongoDB 컬렉션

#### users (회원)

```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "password": "bcrypt_hashed",
  "name": "홍길동",
  "role": "ADMIN | USER",
  "status": "ACTIVE | INACTIVE",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

#### database_connections (DB 연결 정보)

```json
{
  "_id": "ObjectId",
  "name": "데이터 수집 서버 1",
  "host": "mongo-data-1",
  "port": 27017,
  "database": "logdata",
  "username": "admin",
  "password": "AES256_encrypted",
  "status": "CONNECTED | DISCONNECTED",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

#### dashboards (대시보드 탭 및 차트)

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "tabs": [
    {
      "tabId": "uuid",
      "title": "서버 현황",
      "order": 0,
      "charts": [
        {
          "chartId": "uuid",
          "title": "일별 수집량",
          "connectionId": "ObjectId",
          "database": "logdata",
          "collection": "logs",
          "query": "{\"status\": \"active\"}",
          "chartType": "BAR | LINE | PIE | DOUGHNUT | AREA | SCATTER | TABLE",
          "width": 500,
          "height": 500,
          "order": 0
        }
      ]
    }
  ],
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

#### query_tabs (쿼리 탭)

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "tabs": [
    {
      "tabId": "uuid",
      "title": "쿼리 1",
      "order": 0,
      "connectionId": "ObjectId",
      "database": "logdata",
      "collection": "logs",
      "query": "{\"field\": \"value\"}",
      "resultFormat": "TABLE | JSON"
    }
  ],
  "updatedAt": "ISODate"
}
```

---

## 7. API 명세

### 7.1 인증 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| POST | /api/auth/register | 회원가입 | 공개 |
| POST | /api/auth/login | 로그인 | 공개 |
| POST | /api/auth/refresh | 토큰 갱신 | 공개 |
| POST | /api/auth/logout | 로그아웃 | 인증 |

**로그인 응답 예시**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "USER"
    }
  }
}
```

### 7.2 회원 관리 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | /api/admin/users | 회원 목록 조회 | ADMIN |
| GET | /api/admin/users/{id} | 회원 상세 조회 | ADMIN |
| PUT | /api/admin/users/{id} | 회원 수정 | ADMIN |
| DELETE | /api/admin/users/{id} | 회원 삭제 | ADMIN |
| PATCH | /api/admin/users/{id}/status | 상태 변경 | ADMIN |

### 7.3 DB 연결 관리 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | /api/admin/databases | 연결 목록 조회 | ADMIN |
| POST | /api/admin/databases | 연결 추가 | ADMIN |
| PUT | /api/admin/databases/{id} | 연결 수정 | ADMIN |
| DELETE | /api/admin/databases/{id} | 연결 삭제 | ADMIN |
| POST | /api/admin/databases/{id}/test | 연결 테스트 | ADMIN |
| GET | /api/databases | 연결 목록 (사용자용) | 인증 |

### 7.4 대시보드 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | /api/dashboard | 대시보드 조회 (탭+차트) | 인증 |
| POST | /api/dashboard/tabs | 탭 추가 | 인증 |
| PUT | /api/dashboard/tabs/{tabId} | 탭 수정 | 인증 |
| DELETE | /api/dashboard/tabs/{tabId} | 탭 삭제 | 인증 |
| POST | /api/dashboard/tabs/{tabId}/charts | 차트 추가 | 인증 |
| PUT | /api/dashboard/tabs/{tabId}/charts/{chartId} | 차트 수정 | 인증 |
| DELETE | /api/dashboard/tabs/{tabId}/charts/{chartId} | 차트 삭제 | 인증 |
| POST | /api/dashboard/charts/{chartId}/data | 차트 데이터 조회 | 인증 |

### 7.5 쿼리 실행 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| POST | /api/query/execute | 쿼리 실행 | 인증 |
| GET | /api/query/databases/{connId}/collections | Collection 목록 | 인증 |
| GET | /api/query/tabs | 쿼리 탭 조회 | 인증 |
| POST | /api/query/tabs | 탭 추가 | 인증 |
| PUT | /api/query/tabs/{tabId} | 탭 수정 | 인증 |
| DELETE | /api/query/tabs/{tabId} | 탭 삭제 | 인증 |

**쿼리 실행 요청 예시**
```json
{
  "connectionId": "ObjectId",
  "database": "logdata",
  "collection": "logs",
  "filter": {"status": "active"},
  "projection": {},
  "sort": {"createdAt": -1},
  "limit": 100,
  "skip": 0
}
```

**쿼리 실행 응답 예시**
```json
{
  "success": true,
  "data": {
    "total": 1024,
    "count": 100,
    "results": [ {...}, {...} ]
  }
}
```

---

## 8. 디렉토리 구조

### 8.1 전체 프로젝트 구조

```
mongo-admin/
├── docker-compose.yml
├── monitoring/
│   └── prometheus.yml
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── app/                    # Next.js App Router
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   ├── (main)/
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── query/page.tsx
│       │   │   └── admin/
│       │   │       ├── users/page.tsx
│       │   │       └── databases/page.tsx
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       ├── hooks/
│       ├── store/                  # Zustand 스토어
│       ├── services/               # API 호출 함수
│       └── types/                  # TypeScript 타입 정의
└── backend/
    ├── Dockerfile
    ├── build.gradle
    ├── settings.gradle
    └── src/main/
        ├── java/com/mongoadmin/
        │   ├── config/
        │   ├── domain/
        │   │   ├── auth/
        │   │   │   ├── controller/AuthController.java
        │   │   │   ├── service/AuthService.java
        │   │   │   └── dto/
        │   │   ├── user/
        │   │   ├── dashboard/
        │   │   ├── query/
        │   │   └── database/
        │   └── common/
        └── resources/
            └── application.yml
```

### 8.2 Backend application.yml

```yaml
spring:
  data:
    mongodb:
      uri: ${SPRING_DATA_MONGODB_URI:mongodb://localhost:27017/admindb}

server:
  port: 8080

jwt:
  secret: ${JWT_SECRET:default-secret-key}
  access-expiration: 3600000      # 1시간
  refresh-expiration: 604800000   # 7일

management:
  endpoints:
    web:
      exposure:
        include: health, prometheus
  metrics:
    export:
      prometheus:
        enabled: true

logging:
  level:
    com.mongoadmin: DEBUG
```

---

## 9. 개발 환경 설정

### 9.1 필수 설치

- Docker Desktop 4.x 이상
- Node.js 20.x (로컬 프론트엔드 개발 시)
- JDK 17 (로컬 백엔드 개발 시)

### 9.2 로컬 실행 (개발 모드)

```bash
# 1. 저장소 클론
git clone https://github.com/your-org/mongo-admin.git
cd mongo-admin

# 2. DB 및 인프라만 Docker로 실행
docker-compose up -d mongo-admin mongo-data-1 mongo-data-2 mongo-data-3 prometheus grafana

# 3. Backend 로컬 실행
cd backend
./gradlew bootRun

# 4. Frontend 로컬 실행
cd frontend
npm install
npm run dev
```

### 9.3 전체 Docker 실행

```bash
# 전체 서비스 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f backend
docker-compose logs -f frontend

# 서비스 중지
docker-compose down

# 볼륨 포함 완전 초기화
docker-compose down -v
```

---

## 10. 배포 가이드

### 10.1 접속 정보

| 서비스 | URL | 기본 계정 |
|---|---|---|
| Frontend | http://localhost:9112 | 회원가입 필요 |
| Backend API | http://localhost:9113 | - |
| Grafana | http://localhost:9114 | admin / admin1234 |
| Prometheus | http://localhost:9115 | - |

### 10.2 초기 설정 순서

1. `docker-compose up -d` 로 전체 서비스 실행
2. Frontend에서 첫 번째 계정 회원가입 → 자동으로 ADMIN 권한 부여
3. 관리자 > DB 관리 메뉴에서 3대의 데이터 수집 MongoDB 연결 정보 등록
4. 대시보드에서 탭 및 차트 등록 시작

### 10.3 보안 설정 (운영 환경)

- `.env` 파일로 민감 정보 분리
- JWT Secret을 강력한 랜덤 값으로 교체
- MongoDB 인증 비밀번호 변경
- CORS 허용 도메인을 실제 도메인으로 제한
- HTTPS 설정 (Nginx 리버스 프록시 권장)

```env
# .env 예시
MONGO_ADMIN_PASSWORD=강력한_비밀번호
JWT_SECRET=64자_이상의_랜덤_문자열
GRAFANA_ADMIN_PASSWORD=강력한_비밀번호
```

---

## 11. 데이터 흐름 요약

```
[사용자 브라우저]
       │
       │  HTTP Request (JWT 포함)
       ▼
[Frontend: Next.js]
       │
       │  REST API 호출
       ▼
[Backend: Spring Boot]
       │
       ├──▶ [Admin MongoDB]   : 사용자, 차트 설정, DB 연결 정보 저장/조회
       │
       └──▶ [Data MongoDB 1/2/3] : 사용자 쿼리 실행, 차트 데이터 조회
```

---

*문서 버전: 1.0.0 | 최종 수정: 2026-06-29*
