# Lann MCP Server 生产环境部署指南

> 本文档提供从零开始部署 Lann MCP Server 到生产服务器的完整步骤。

**🌐 生产环境**: 我们已提供稳定的生产服务 `https://open.lannlife.com/mcp`，您可以直接连接使用，无需自行部署。

**💡 提示**: 
- 如需快速参考，请查看 [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - 5分钟快速部署指南
- 如需了解如何连接生产环境，请参考 [README.md](./README.md) 和 [HTTP_USAGE.md](./HTTP_USAGE.md)

## 📋 目录

- [部署方式选择](#部署方式选择)
- [方式一：传统部署（推荐新手）](#方式一传统部署推荐新手)
  - [第 1 步：本地准备](#第-1-步本地准备)
  - [第 2 步：服务器环境准备](#第-2-步服务器环境准备)
  - [第 3 步：上传文件到服务器](#第-3-步上传文件到服务器)
  - [第 4 步：服务器上安装和配置](#第-4-步服务器上安装和配置)
  - [第 5 步：启动服务](#第-5-步启动服务)
  - [第 6 步：配置 Nginx 反向代理](#第-6-步配置-nginx-反向代理)
  - [第 7 步：配置 SSL 证书](#第-7-步配置-ssl-证书)
  - [第 8 步：验证部署](#第-8-步验证部署)
- [方式二：Docker 部署（推荐）](#方式二docker-部署推荐)
- [常见问题](#常见问题)

## 🎯 部署方式选择

### 是否真的需要自托管？

在开始部署之前，请考虑：

**✅ 直接使用生产环境（推荐）**
- URL: `https://open.lannlife.com/mcp`
- 优势：无需维护、高可用、自动 SSL、专业监控
- 适用：大多数应用场景，特别是 AI Agent 集成

**⚠️ 自托管部署**
- 优势：完全控制、数据隐私、自定义配置
- 劣势：需要运维投入、自行负责可用性
- 适用：有特殊安全要求、需要内网部署、定制化需求

---

### 部署方式对比

### 方式一：传统部署（适合新手）
**优点**：步骤清晰，易于理解，方便调试  
**缺点**：需要手动管理进程和环境  
**适用场景**：学习、测试、小规模部署

### 方式二：Docker 部署（推荐）
**优点**：环境隔离，一键部署，易于维护  
**缺点**：需要了解 Docker 基础  
**适用场景**：生产环境、多实例部署

---

## 方式一：传统部署（推荐新手）

本方式分为 8 个详细步骤，从零开始完成部署。

### 第 1 步：本地准备

在您的开发机器上执行以下操作：

#### 1.1 克隆或下载项目

```bash
# 如果已有项目，跳过此步
git clone https://github.com/lystrosaurus/lann-mcp-server.git
cd lann-mcp-server
```

#### 1.2 安装依赖

```bash
npm install
```

#### 1.3 构建项目

```bash
npm run build
```

构建成功后，会生成 `dist/` 目录。

#### 1.4 验证构建结果

```bash
# 检查 dist 目录是否存在且包含文件
ls -la dist/

# 应该看到以下文件：
# index.js
# server.js
# config/
# transport/
# tools/
# ...
```

#### 1.5 准备上传文件

需要上传的文件清单：
```
lann-mcp-server/
├── dist/              # 构建产物（必需）
├── org_store.json     # 门店数据（必需）
├── prod_service.json  # 服务数据（必需）
├── package.json       # 包配置（必需）
└── node_modules/      # 依赖（可选，建议服务器上安装）
```

**推荐做法**：只上传源代码和配置文件，在服务器上安装依赖。

创建压缩包：
```bash
# 排除 node_modules 和测试文件
tar -czf lann-mcp-server.tar.gz \
  dist/ \
  org_store.json \
  prod_service.json \
  package.json \
  package-lock.json
```

---

### 第 2 步：服务器环境准备

登录到您的服务器（以 Ubuntu 为例）：

```bash
ssh user@your-server-ip
```

#### 2.1 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

#### 2.2 安装 Node.js

```bash
# 安装 Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version   # 应显示 v18.x.x
npm --version    # 应显示 9.x.x 或更高
```

#### 2.3 安装 PM2（进程管理器）

```bash
sudo npm install -g pm2

# 验证安装
pm2 --version
```

#### 2.4 安装 Nginx（反向代理）

```bash
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证 Nginx 运行状态
sudo systemctl status nginx
```

**注意**: 如果您计划将服务暴露在公网上，强烈建议配置 SSL 证书（见第 7 步）。对于内部网络使用，可以跳过 SSL 配置。

#### 2.5 创建应用目录

```bash
# 创建应用目录
sudo mkdir -p /var/www/lann-mcp-server

# 设置权限（替换 your_username 为您的用户名）
sudo chown -R your_username:your_username /var/www/lann-mcp-server
```

---

### 第 3 步：上传文件到服务器

在**本地机器**上执行：

#### 方法 A：使用 SCP（推荐）

```bash
# 从本地上传压缩包到服务器
scp lann-mcp-server.tar.gz user@your-server-ip:/tmp/

# 登录服务器
ssh user@your-server-ip

# 解压到应用目录
cd /var/www/lann-mcp-server
tar -xzf /tmp/lann-mcp-server.tar.gz
```

#### 方法 B：使用 Git

```bash
# 在服务器上克隆仓库
cd /var/www
git clone https://github.com/lystrosaurus/lann-mcp-server.git
cd lann-mcp-server

# 切换到指定版本
git checkout v2.0.1

# 安装依赖并构建
npm ci --production
npm run build
```

#### 方法 C：使用 SFTP 工具

使用 FileZilla、WinSCP 等图形化工具上传文件。

---

### 第 4 步：服务器上安装和配置

在**服务器**上执行：

#### 4.1 安装依赖

```bash
cd /var/www/lann-mcp-server

# 安装生产依赖
npm ci --production

# 或使用
npm install --production
```

#### 4.2 配置环境变量（可选）

**方式 A：使用 .env 文件（推荐）**

```bash
# 创建 .env 文件
nano .env
```

添加以下内容：

```env
# 传输模式
TRANSPORT=http

# HTTP 服务器配置
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
MCP_BASE_PATH=/mcp

# CORS 配置（重要：生产环境必须指定具体域名）
CORS_ORIGINS=https://your-domain.com
# 如果允许多个域名，用逗号分隔：
# CORS_ORIGINS=https://domain1.com,https://domain2.com

# 速率限制（保护服务免受滥用）
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

保存并退出（Ctrl+O, Enter, Ctrl+X）。

**方式 B：直接在启动命令中指定参数（更可靠）**

如果 .env 文件不生效，可以直接在启动命令中传递参数：

```bash
# 使用 cross-env（推荐，跨平台兼容）
npx cross-env TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000 CORS_ORIGINS=https://open.lannlife.com node dist/index.js

# 或使用 Node.js 内置方式
TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000 CORS_ORIGINS=https://open.lannlife.com node dist/index.js
```

---

#### 4.3 测试运行

```bash
# 方法 1: 使用 .env 文件（需要安装 dotenv）
npm install dotenv
node -r dotenv/config dist/index.js

# 方法 2: 直接指定参数（推荐）
npx cross-env TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000 node dist/index.js

# 应该看到输出：
# Lann MCP Server (HTTP mode) 已启动
# 监听地址: http://127.0.0.1:3000/mcp
```

按 `Ctrl+C` 停止测试。

---

### 第 5 步：启动服务

使用 PM2 管理进程：

#### 5.1 创建 PM2 配置文件

**方式 A：使用 ecosystem.config.js（推荐）**

```bash
nano ecosystem.config.js
```

添加以下内容：

```javascript
module.exports = {
  apps: [{
    name: 'lann-mcp-server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      TRANSPORT: 'http',
      HTTP_HOST: '127.0.0.1',
      HTTP_PORT: '3000',
      // ⚠️ 重要：替换为您的实际域名
      CORS_ORIGINS: 'https://your-domain.com',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX_REQUESTS: '100',
      RATE_LIMIT_WINDOW_MS: '60000'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

**方式 B：直接在命令行中指定（更简单）**

如果不使用配置文件，可以直接在启动命令中传递环境变量：

```bash
# 方法 1: 使用 -- 传递环境变量
pm2 start dist/index.js --name lann-mcp-server -- TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000

# 方法 2: 使用 cross-env
pm2 start "cross-env TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000 node dist/index.js" --name lann-mcp-server
```

#### 5.2 创建日志目录

```bash
mkdir -p logs
```

#### 5.3 启动服务

```bash
# 启动应用
pm2 start ecosystem.config.js

# 查看运行状态
pm2 status

# 查看日志
pm2 logs lann-mcp-server

# 设置开机自启
pm2 startup
pm2 save
```

#### 5.4 PM2 常用命令

```bash
# 重启服务
pm2 restart lann-mcp-server

# 停止服务
pm2 stop lann-mcp-server

# 删除服务
pm2 delete lann-mcp-server

# 查看实时监控
pm2 monit
```

---

### 第 6 步：配置 Nginx 反向代理

#### 6.1 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/lann-mcp-server
```

添加以下内容（替换 `your-domain.com` 为您的实际域名）：

**重要提示**: 
- 将 `your-domain.com` 替换为您的真实域名
- 如果使用生产环境 `open.lannlife.com`，Nginx 配置已在服务器上设置好
- 以下配置适用于您自己的域名部署

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # MCP SSE 端点
    location /mcp {
        proxy_pass http://127.0.0.1:3000/mcp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 长连接支持
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        
        # 缓冲设置
        proxy_buffering off;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_set_header Host $host;
    }

    # 禁止访问其他路径
    location / {
        return 404;
    }
}
```

#### 6.2 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/lann-mcp-server /etc/nginx/sites-enabled/

# 测试配置语法
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

#### 6.3 测试 HTTP 访问

```bash
# 在浏览器或使用 curl 测试
curl http://your-domain.com/health

# 应该返回：
# {"status":"ok","timestamp":"...","version":"2.0.0"}
```

---

### 第 7 步：配置 SSL 证书

#### 7.1 安装 Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 7.2 获取 SSL 证书

```bash
sudo certbot --nginx -d your-domain.com
```

按照提示操作：
1. 输入邮箱地址
2. 同意服务条款
3. 选择是否重定向 HTTP 到 HTTPS（建议选择 2）

#### 7.3 自动续期测试

```bash
# 测试续期
certbot renew --dry-run

# Certbot 会自动添加定时任务
# 查看定时任务
crontab -l
```

#### 7.4 验证 HTTPS

```bash
# 测试 HTTPS 访问
curl https://your-domain.com/health

# 在浏览器中访问
# https://your-domain.com/health
```

---

### 第 8 步：验证部署

#### 8.1 检查服务状态

```bash
# 检查 PM2 进程
pm2 status

# 检查 Nginx 状态
sudo systemctl status nginx

# 检查端口监听
sudo netstat -tlnp | grep 3000
```

#### 8.2 功能测试

```bash
# 1. 健康检查
curl https://your-domain.com/health

# 2. 使用 MCP Inspector 测试
# 在本地运行
npx @modelcontextprotocol/inspector

# 在 Web UI 中选择：
# - Transport Type: HTTP
# - Server URL: https://your-domain.com/mcp
# - 点击 Connect
```

#### 8.3 日志监控

```bash
# 查看应用日志
pm2 logs lann-mcp-server

# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

#### 8.4 防火墙配置

```bash
# 如果使用 UFW 防火墙
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable

# 检查防火墙状态
sudo ufw status
```

---

## 方式二：Docker 部署（推荐）

Docker 部署更加简单，适合生产环境。

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 第 1 步：准备 Docker 文件

在**本地机器**上创建以下文件：

#### 1.1 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci --production

# 复制源代码
COPY . .

# 构建 TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动服务
CMD ["node", "dist/index.js"]
```

#### 1.2 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  lann-mcp-server:
    build: .
    container_name: lann-mcp-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # 直接在这里配置环境变量（更可靠）
      - TRANSPORT=http
      - HTTP_HOST=0.0.0.0
      - HTTP_PORT=3000
      - MCP_BASE_PATH=/mcp
      # ⚠️ 重要：替换为您的实际域名
      - CORS_ORIGINS=https://your-domain.com
      - RATE_LIMIT_ENABLED=true
      - RATE_LIMIT_MAX_REQUESTS=100
      - RATE_LIMIT_WINDOW_MS=60000
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

**提示**: Docker Compose 中的 `environment` 配置会直接传递给容器，无需额外的 .env 文件。

#### 1.3 创建 .dockerignore

```dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
*.md
test-*.js
dist
```

---

### 第 2 步：上传文件到服务器

```bash
# 上传整个项目目录到服务器
scp -r lann-mcp-server/ user@your-server-ip:/var/www/

# 或使用 Git
ssh user@your-server-ip
cd /var/www
git clone https://github.com/lystrosaurus/lann-mcp-server.git
cd lann-mcp-server
```

---

### 第 3 步：服务器上构建和启动

在**服务器**上执行：

```bash
# 进入项目目录
cd /var/www/lann-mcp-server

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看运行状态
docker-compose ps
```

---

### 第 4 步：配置 Nginx 反向代理

参考「方式一」的第 6 步和第 7 步配置 Nginx 和 SSL。

Nginx 配置中的 `proxy_pass` 保持不变：
```nginx
proxy_pass http://127.0.0.1:3000/mcp;
```

---

### 第 5 步：管理 Docker 容器

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新服务
git pull
docker-compose build
docker-compose up -d

# 清理未使用的镜像
docker image prune -a
```

## 🔒 安全建议

部署生产环境时，请务必遵循以下安全最佳实践：

### 1. 强制启用 HTTPS

- **所有 HTTP 请求重定向到 HTTPS**
- 使用 Let's Encrypt 获取免费 SSL 证书
- 定期更新证书（Certbot 会自动处理）

### 2. 配置 CORS 白名单

- **不要使用 `CORS_ORIGINS=*`**
- 仅允许信任的域名访问
- 多个域名用逗号分隔：`https://domain1.com,https://domain2.com`

### 3. 启用速率限制

- 防止 API 滥用和 DDoS 攻击
- 默认配置：100 请求/分钟/IP
- 根据实际需求调整 `RATE_LIMIT_MAX_REQUESTS`

### 4. 定期更新依赖

```bash
# 检查安全漏洞
npm audit

# 更新依赖
npm update

# 重新构建和部署
npm run build
pm2 restart lann-mcp-server
```

### 5. 监控日志和错误

- 配置日志轮转，避免磁盘空间耗尽
- 设置错误告警，及时发现问题
- 定期检查异常访问模式

### 6. 防火墙配置

```bash
# 仅开放必要端口
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow ssh      # SSH
sudo ufw enable
```

### 7. 最小权限原则

- 使用非 root 用户运行服务
- 限制文件访问权限
- 定期审查和更新访问控制

## 🏥 健康检查

### 健康检查端点

- **URL**: `https://your-domain.com/health`
- **方法**: GET
- **预期响应**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-04-08T12:00:00.000Z",
    "version": "2.0.0"
  }
  ```

### 自动化监控

建议使用以下工具进行持续监控：

**Uptime Monitoring:**
- UptimeRobot (免费): https://uptimerobot.com/
- Pingdom (付费): https://www.pingdom.com/
- StatusCake (免费层): https://www.statuscake.com/

**配置示例 (UptimeRobot):**
1. 创建新的 Monitor
2. 类型选择 "HTTP(s)"
3. URL 填入 `https://your-domain.com/health`
4. 设置检查间隔（建议 5 分钟）
5. 配置告警通知（邮件、SMS 等）

**期望行为:**
- ✅ 正常: HTTP 200 + `{"status":"ok"}`
- ❌ 异常: 任何非 200 状态码或响应超时

## 故障排查

### 问题 1: SSE 连接断开

**症状**: 客户端频繁断开连接

**解决方案**:
- 检查 Nginx 的 `proxy_read_timeout` 和 `proxy_send_timeout` 设置
- 确保防火墙允许长连接
- 检查服务器资源使用情况

### 问题 2: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:
- 确认 `CORS_ORIGINS` 环境变量配置正确
- 检查 Nginx 是否正确传递 CORS 头
- 避免在生产环境使用 `CORS_ORIGINS=*`

### 问题 3: 速率限制触发

**症状**: 收到 429 Too Many Requests 响应

**解决方案**:
- 调整 `RATE_LIMIT_MAX_REQUESTS` 和 `RATE_LIMIT_WINDOW_MS`
- 检查是否有异常流量或攻击
- 考虑为可信 IP 添加白名单

## 📊 性能优化

### 1. 启用 Gzip 压缩 (Nginx)

```nginx
http {
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types application/json text/plain text/css application/javascript;
    gzip_comp_level 6;
}
```

### 2. 调整 Node.js 内存限制

```bash
# 根据服务器内存调整（建议设置为物理内存的 50-70%）
NODE_OPTIONS="--max-old-space-size=512" pm2 start ecosystem.config.js
```

### 3. 使用集群模式 (多核 CPU)

```bash
# 利用所有 CPU 核心
pm2 start dist/index.js -i max -- TRANSPORT=http

# 或指定实例数
pm2 start dist/index.js -i 4 -- TRANSPORT=http
```

**注意**: 集群模式下，每个实例有独立的会话存储，客户端可能需要粘性会话 (sticky sessions)。

### 4. Nginx 优化

```nginx
# 增加 worker 进程数
worker_processes auto;

# 调整连接数
events {
    worker_connections 4096;
}

# 启用缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=mcp_cache:10m max_size=100m inactive=60m;
```

### 5. 数据库优化（未来扩展）

如果将来引入数据库存储：
- 使用连接池
- 添加索引
- 实现查询缓存
- 定期清理过期数据

## 📈 监控与告警

建议配置以下监控项以确保服务稳定运行：

### 关键监控指标

1. **服务可用性 (Uptime)**
   - 定期检查 `/health` 端点
   - 目标: 99.9% 以上可用性

2. **响应时间**
   - P50, P95, P99 延迟
   - 目标: P95 < 500ms

3. **错误率**
   - HTTP 5xx 错误比例
   - 目标: < 0.1%

4. **资源使用**
   - CPU 使用率
   - 内存使用率
   - 磁盘空间

5. **速率限制触发次数**
   - 检测异常流量或攻击
   - 突然增加可能表示问题

6. **活跃会话数**
   - 并发用户数量
   - 帮助容量规划

### 推荐监控工具

**开源方案:**
- Prometheus + Grafana: 完整的监控栈
- Node Exporter: 系统指标收集
- PM2 Plus: Node.js 应用监控

**云服务:**
- Datadog: 全栈监控平台
- New Relic: APM 和基础设施监控
- AWS CloudWatch: AWS 原生监控
- Azure Monitor: Azure 原生监控

**简单方案:**
- UptimeRobot: 简单的 uptime 监控（免费）
- Healthchecks.io: 定时任务监控
- Sentry: 错误追踪

### 告警配置建议

**关键告警 (立即响应):**
- 服务不可用超过 1 分钟
- 错误率 > 5%
- 磁盘空间 < 10%
- 内存使用 > 90%

**警告告警 (工作时间处理):**
- 响应时间 P95 > 1s
- 速率限制触发频率异常
- CPU 使用率 > 80% 持续 5 分钟

## 方式二：Docker 部署（推荐）

Docker 部署更加简单，适合生产环境。

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 第 1 步：准备 Docker 文件

在**本地机器**上创建以下文件：

#### 1.1 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci --production

# 复制源代码
COPY . .

# 构建 TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动服务
CMD ["node", "dist/index.js"]
```

#### 1.2 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  lann-mcp-server:
    build: .
    container_name: lann-mcp-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # 直接在这里配置环境变量（更可靠）
      - TRANSPORT=http
      - HTTP_HOST=0.0.0.0
      - HTTP_PORT=3000
      - MCP_BASE_PATH=/mcp
      - CORS_ORIGINS=https://open.lannlife.com
      - RATE_LIMIT_ENABLED=true
      - RATE_LIMIT_MAX_REQUESTS=100
      - RATE_LIMIT_WINDOW_MS=60000
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

**提示**: Docker Compose 中的 `environment` 配置会直接传递给容器，无需额外的 .env 文件。

#### 1.3 创建 .dockerignore

```dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
*.md
test-*.js
dist
```

---

### 第 2 步：上传文件到服务器

```bash
# 上传整个项目目录到服务器
scp -r lann-mcp-server/ user@your-server-ip:/var/www/

# 或使用 Git
ssh user@your-server-ip
cd /var/www
git clone https://github.com/lystrosaurus/lann-mcp-server.git
cd lann-mcp-server
```

---

### 第 3 步：服务器上构建和启动

在**服务器**上执行：

```bash
# 进入项目目录
cd /var/www/lann-mcp-server

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看运行状态
docker-compose ps
```

---

### 第 4 步：配置 Nginx 反向代理

参考「方式一」的第 6 步和第 7 步配置 Nginx 和 SSL。

Nginx 配置中的 `proxy_pass` 保持不变：
```nginx
proxy_pass http://127.0.0.1:3000/mcp;
```

---

### 第 5 步：管理 Docker 容器

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新服务
git pull
docker-compose build
docker-compose up -d

# 清理未使用的镜像
docker image prune -a
```

---

## 常见问题

### 问题 1: 端口被占用

**症状**: 启动时提示 `EADDRINUSE`

**解决方案**:
```bash
# 查找占用端口的进程
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>

# 或修改配置文件中的端口
HTTP_PORT=3001
```

### 问题 2: PM2 进程自动退出

**症状**: `pm2 status` 显示进程状态为 `errored`

**解决方案**:
```bash
# 查看详细错误日志
pm2 logs lann-mcp-server --lines 100

# 常见原因：
# 1. 依赖未安装 -> 运行 npm install
# 2. 端口被占用 -> 检查端口
# 3. 环境变量缺失 -> 检查 .env 文件
# 4. 权限问题 -> 检查文件权限
```

### 问题 3: Nginx 502 Bad Gateway

**症状**: 访问域名返回 502 错误

**解决方案**:
```bash
# 1. 检查后端服务是否运行
pm2 status
# 或
docker-compose ps

# 2. 检查 Nginx 配置
sudo nginx -t

# 3. 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 4. 测试后端直接访问
curl http://127.0.0.1:3000/health
```

### 问题 4: SSL 证书续期失败

**症状**: 证书过期，HTTPS 无法访问

**解决方案**:
```bash
# 手动续期
sudo certbot renew

# 检查定时任务
crontab -l

# 重新配置
sudo certbot --nginx -d your-domain.com
```

### 问题 5: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:

**方法 1: 检查并修正配置**
```bash
# 如果使用 .env 文件
nano .env
# 确保设置为实际域名，不要使用 *
CORS_ORIGINS=https://open.lannlife.com

# 重启服务
pm2 restart lann-mcp-server
```

**方法 2: 直接在启动命令中指定（更可靠）**
```bash
# 停止当前服务
pm2 stop lann-mcp-server

# 使用命令行参数重新启动
pm2 start dist/index.js --name lann-mcp-server -- TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000 CORS_ORIGINS=https://open.lannlife.com

# 验证
pm2 env lann-mcp-server
```

### 问题 6: 内存不足

**症状**: 服务频繁重启，OOM Killer 杀死进程

**解决方案**:
```bash
# 1. 增加 PM2 内存限制
# 编辑 ecosystem.config.js
max_memory_restart: '1G'

# 2. 增加系统 Swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. 优化 Node.js 内存使用
NODE_OPTIONS="--max-old-space-size=512" pm2 start ecosystem.config.js
```

### 问题 7: Docker 构建失败

**症状**: `docker-compose build` 报错

**解决方案**:
```bash
# 1. 清理 Docker 缓存
docker system prune -a

# 2. 检查 Dockerfile 语法
# 3. 检查网络连接（需要下载依赖）
# 4. 查看详细错误信息
docker-compose build --no-cache
```

### 问题 8: 环境变量不生效

**症状**: 服务启动后配置未按预期生效

**诊断步骤**:

```bash
# 1. 检查当前环境变量
pm2 env lann-mcp-server

# 2. 查看进程实际使用的环境变量
pm2 show lann-mcp-server

# 3. 检查 .env 文件是否存在且格式正确
cat .env

# 4. 测试环境变量是否被读取
node -e "console.log('TRANSPORT:', process.env.TRANSPORT)"
```

**解决方案**:

**方案 A: 使用 PM2 配置文件（推荐）**
```bash
# 编辑 ecosystem.config.js，确保 env 部分包含所有变量
nano ecosystem.config.js

# 重启服务
pm2 restart lann-mcp-server

# 验证
pm2 env lann-mcp-server | grep TRANSPORT
```

**方案 B: 直接在启动命令中指定（最可靠）**
```bash
# 停止服务
pm2 stop lann-mcp-server
pm2 delete lann-mcp-server

# 使用命令行参数启动
pm2 start dist/index.js --name lann-mcp-server -- \
  TRANSPORT=http \
  HTTP_HOST=127.0.0.1 \
  HTTP_PORT=3000 \
  CORS_ORIGINS=https://open.lannlife.com \
  RATE_LIMIT_ENABLED=true

# 验证
pm2 env lann-mcp-server
```

**方案 C: 使用 cross-env 包**
```bash
# 安装 cross-env
npm install cross-env

# 修改 ecosystem.config.js
module.exports = {
  apps: [{
    name: 'lann-mcp-server',
    script: 'cross-env',
    args: 'TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000 CORS_ORIGINS=https://your-domain.com node dist/index.js',
    // ... 其他配置
  }]
};

# 重启
pm2 restart lann-mcp-server
```

**方案 D: 在代码中加载 .env 文件**
```bash
# 安装 dotenv
npm install dotenv

# 在 src/index.ts 顶部添加
import dotenv from 'dotenv';
dotenv.config();

# 重新构建
npm run build

# 启动
pm2 restart lann-mcp-server
```

**常见原因**:
1. ✅ .env 文件格式错误（不能有引号、空格）
2. ✅ PM2 未正确加载环境变量
3. ✅ 环境变量在错误的时机设置
4. ✅ shell 环境问题（bash vs sh）

**最佳实践**:
- 🎯 生产环境推荐使用 **PM2 配置文件** 或 **命令行参数**
- 🎯 避免依赖 .env 文件的自动加载
- 🎯 始终通过 `pm2 env` 验证环境变量

---

## 🔗 相关资源

- [NPM Package](https://www.npmjs.com/package/lann-mcp-server)
- [GitHub Repository](https://github.com/lystrosaurus/lann-mcp-server)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [HTTP Usage Guide](./HTTP_USAGE.md)
- [Contributing Guide](./CONTRIBUTING.md)
