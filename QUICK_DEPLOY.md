# 快速部署参考卡片

> 5 分钟快速部署 Lann MCP Server

## 🚀 最简部署（Docker）

```bash
# 1. 克隆项目
git clone https://github.com/lystrosaurus/lann-mcp-server.git
cd lann-mcp-server

# 2. 启动服务
docker-compose up -d

# 3. 验证
curl http://localhost:3000/health
```

---

## 📋 传统部署快速步骤

### 本地准备
```bash
npm install
npm run build
tar -czf app.tar.gz dist/ org_store.json prod_service.json package*.json
```

### 服务器设置
```bash
# 1. 安装环境
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2

# 2. 上传并解压
scp app.tar.gz user@server:/tmp/
ssh user@server
sudo mkdir -p /var/www/lann-mcp-server
sudo tar -xzf /tmp/app.tar.gz -C /var/www/lann-mcp-server
cd /var/www/lann-mcp-server

# 3. 安装依赖
npm ci --production

# 4. 创建 .env
cat > .env << EOF
TRANSPORT=http
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
CORS_ORIGINS=https://your-domain.com
EOF

# 5. 启动服务（3种方式任选）

# 方式 A: 使用 PM2 配置文件（推荐）
pm2 start ecosystem.config.js

# 方式 B: 直接指定参数（更可靠）
pm2 start dist/index.js --name lann-mcp-server -- TRANSPORT=http HTTP_HOST=127.0.0.1 HTTP_PORT=3000 CORS_ORIGINS=https://open.lannlife.com

# 方式 C: 简单启动
pm2 start dist/index.js --name lann-mcp-server -- TRANSPORT=http
```

### Nginx 配置
```bash
sudo nano /etc/nginx/sites-available/lann-mcp-server
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /mcp {
        proxy_pass http://127.0.0.1:3000/mcp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_read_timeout 86400s;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lann-mcp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL 证书
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔍 验证部署

```bash
# 健康检查
curl https://your-domain.com/health

# MCP Inspector 测试
npx @modelcontextprotocol/inspector
# Web UI: Transport Type = HTTP, URL = https://your-domain.com/mcp
```

---

## 🛠️ 常用命令

### PM2 管理
```bash
pm2 status              # 查看状态
pm2 logs                # 查看日志
pm2 restart all         # 重启
pm2 stop all            # 停止
```

### Docker 管理
```bash
docker-compose up -d    # 启动
docker-compose down     # 停止
docker-compose logs -f  # 日志
docker-compose restart  # 重启
```

### Nginx 管理
```bash
sudo nginx -t           # 测试配置
sudo systemctl reload nginx  # 重载
sudo systemctl restart nginx # 重启
```

---

## ⚠️ 常见问题速查

| 问题 | 解决方案 |
|------|---------||
| 端口被占用 | `sudo lsof -i :3000` 查找并杀死进程 |
| 502 Bad Gateway | 检查后端服务是否运行：`pm2 status` |
| CORS 错误 | 使用命令行参数启动：`pm2 start dist/index.js --name lann-mcp-server -- TRANSPORT=http CORS_ORIGINS=https://open.lannlife.com` |
| SSL 过期 | `sudo certbot renew` |
| 内存不足 | 增加 Swap 或调整 `max_memory_restart` |
| 环境变量不生效 | 使用命令行参数而非 .env 文件，或通过 `pm2 env` 验证 |

---

## 📞 获取帮助

- 📖 [完整部署文档](./DEPLOYMENT.md)
- 🐛 [GitHub Issues](https://github.com/lystrosaurus/lann-mcp-server/issues)
- 💬 [GitHub Discussions](https://github.com/lystrosaurus/lann-mcp-server/discussions)

---

**提示**: 生产环境建议使用 Docker 部署，更简单、更易维护！
