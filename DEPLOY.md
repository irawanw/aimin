# Aimin Assist - Deployment Guide

## Folder Structure
```
/data/www/
├── aiminv1/          # Old PHP dashboard (untouched)
├── aimin/            # New Next.js SaaS app
│   ├── src/
│   │   ├── app/          # App router pages & API routes
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/          # Auth, contexts, utilities
│   │   ├── i18n/         # Translation JSON files (id, en)
│   │   └── types/        # TypeScript types
│   ├── .env.local        # Environment variables
│   ├── ecosystem.config.js  # PM2 config
│   ├── nginx.conf        # Nginx config template
│   ├── next.config.js    # Next.js config (basePath: /aimin)
│   └── package.json
└── phpmyadmin/
```

## 1. Install Dependencies
```bash
cd /data/www/aimin
npm install
```

## 2. Configure Environment
Edit `.env.local`:
```
JWT_SECRET=<generate-a-64-char-random-string>
VLLM_API_URL=http://localhost:8000/v1/chat/completions
NEXT_PUBLIC_BASE_URL=https://aiminassist.com
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Build for Production
```bash
npm run build
```

## 4. PM2 Setup
```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start the app
pm2 start ecosystem.config.js

# Save PM2 process list & enable startup
pm2 save
pm2 startup
```

## 5. Nginx Setup
```bash
# Copy the config
sudo cp nginx.conf /etc/nginx/sites-available/aiminassist.com
sudo ln -sf /etc/nginx/sites-available/aiminassist.com /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL with Certbot
```bash
sudo certbot --nginx -d aiminassist.com -d www.aiminassist.com
```

## 7. PHP + Node Coexistence
The nginx config handles both:
- `/aimin/*` → proxied to Node.js (port 3001)
- `/_next/*` → proxied to Node.js (static assets)
- Everything else → PHP (aiminv1)

Both systems run independently. No conflicts.

## 8. Connecting to vLLM Backend
The chat API route (`/aimin/api/chat`) proxies to vLLM.
Update `VLLM_API_URL` in `.env.local` to point to your vLLM instance.

Expected vLLM API format (OpenAI-compatible):
```
POST http://your-vllm-host:8000/v1/chat/completions
{
  "model": "your-model",
  "messages": [...],
  "max_tokens": 512
}
```

If vLLM is unavailable, the API returns a demo fallback response.

## 9. Payment Gateway Integration (Future)
To add payment (Midtrans, Xendit, etc.):
1. Create `/src/app/api/payment/route.ts`
2. Add webhook endpoint for payment callbacks
3. Update user plan in DB on successful payment
4. Add payment gateway SDK: `npm install midtrans-client` or `npm install xendit-node`

## Demo Accounts
- **Admin**: admin@aiminassist.com / admin123
- **User**: user@aiminassist.com / user123

## Auth Architecture
JWT-based authentication was chosen over sessions because:
- Stateless: no server-side session storage needed
- Works with horizontal scaling (multiple Node instances)
- HttpOnly cookies prevent XSS token theft
- 7-day expiry with automatic refresh

## Production Checklist
- [ ] Change JWT_SECRET to a strong random value
- [ ] Connect to a real database (PostgreSQL/MySQL recommended)
- [ ] Set up proper CORS if needed
- [ ] Enable rate limiting on API routes
- [ ] Set up monitoring (PM2 Plus, Grafana, etc.)
- [ ] Configure log rotation
- [ ] Set up automated backups
