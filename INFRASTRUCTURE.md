# 🏗️ SplitSimple Infrastructure & Deployment Guide

A comprehensive guide to deploying and managing SplitSimple's infrastructure across different environments.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
- [Production Deployment](#production-deployment)
- [Monitoring & Analytics](#monitoring--analytics)
- [Performance Optimization](#performance-optimization)
- [Security](#security)
- [Backup & Recovery](#backup--recovery)
- [Scaling Considerations](#scaling-considerations)
- [Troubleshooting](#troubleshooting)

## 🎯 Architecture Overview

### Core Components

```mermaid
graph TB
    A[User Browser] --> B[Vercel Edge Network]
    B --> C[Next.js Application]
    C --> D[Redis KV Store]
    C --> E[PostHog Analytics]
    C --> F[Vercel Analytics]
    
    subgraph "Client Storage"
        G[LocalStorage]
        H[Session Storage]
    end
    
    A --> G
    A --> H
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 15 + React 19 | Server-side rendered React app |
| **Styling** | Tailwind CSS v4 | Utility-first CSS framework |
| **UI Components** | shadcn/ui + Radix UI | Accessible component library |
| **State Management** | React Context + useReducer | Client-side state management |
| **Database** | Redis (Vercel KV) | Temporary bill storage & sharing |
| **Deployment** | Vercel | Serverless hosting platform |
| **Analytics** | PostHog + Vercel Analytics | User behavior & performance tracking |
| **Monitoring** | Vercel Monitoring | Application performance monitoring |

## 🔧 Environment Setup

### Required Environment Variables

Create a `.env.local` file for local development:

```bash
# Redis Configuration (Required for sharing features)
REDIS_URL="redis://localhost:6379"  # Local development
# REDIS_URL="redis://username:password@host:port"  # Production

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Local development
# NEXT_PUBLIC_APP_URL="https://yourdomain.com"  # Production

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY="your_posthog_project_key"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# Admin Panel (Optional)
ADMIN_PASSWORD_HASH="your_bcrypt_hashed_password"

# Vercel Analytics (Automatically set in Vercel)
# VERCEL_ANALYTICS_ID="your_vercel_analytics_id"
```

### Environment Validation

The application includes built-in environment validation in `lib/env-validation.ts`:

```typescript
// Critical validations:
- REDIS_URL: Required for sharing functionality
- NEXT_PUBLIC_POSTHOG_KEY: Optional, warns if missing
- NODE_ENV: Validates against standard values
```

## 🚀 Deployment Options

### 1. Vercel (Recommended)

**Best for**: Production deployments, automatic scaling, global CDN

#### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aarekaz/splitsimple)

#### Manual Setup

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Configure Environment Variables**
   ```bash
   # Set environment variables in Vercel dashboard or CLI
   vercel env add REDIS_URL
   vercel env add NEXT_PUBLIC_APP_URL
   vercel env add NEXT_PUBLIC_POSTHOG_KEY
   vercel env add ADMIN_PASSWORD_HASH
   ```

3. **Add Redis Database**
   - Go to Vercel Dashboard → Storage
   - Create new KV Database
   - Copy connection string to `REDIS_URL`

### 2. Docker Deployment

**Best for**: Self-hosted environments, custom infrastructure

#### Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm in builder stage
RUN npm install -g pnpm

# Build application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
      - NODE_ENV=production
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

### 3. Railway

**Best for**: Simple deployments, built-in Redis

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Add Redis service in Railway dashboard and connect environment variables.

### 4. Netlify

**Best for**: Static deployments (limited server-side features)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=out
```

> **Note**: Netlify requires static export. Some server-side features may be limited.

## 🏭 Production Deployment

### Pre-deployment Checklist

- [ ] **Environment Variables**: All required vars set in production
- [ ] **Redis Connection**: Database accessible and configured
- [ ] **Domain Configuration**: Custom domain and SSL configured
- [ ] **Analytics Setup**: PostHog and Vercel Analytics configured
- [ ] **Admin Panel**: Admin password hash set securely
- [ ] **Performance Testing**: Load testing completed
- [ ] **Security Review**: Security headers and policies reviewed

### Vercel Production Setup

1. **Project Configuration**
   ```json
   // vercel.json (optional)
   {
     "framework": "nextjs",
     "buildCommand": "pnpm build",
     "devCommand": "pnpm dev",
     "installCommand": "pnpm install",
     "regions": ["iad1", "sfo1"],
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 10
       }
     }
   }
   ```

2. **Domain Setup**
   ```bash
   # Add custom domain
   vercel domains add yourdomain.com
   
   # Configure DNS
   # Add CNAME record: www -> cname.vercel-dns.com
   # Add A record: @ -> 76.76.19.19
   ```

3. **Redis KV Setup**
   ```bash
   # Create KV database in Vercel dashboard
   # Connection string automatically added as KV_* environment variables
   # Update REDIS_URL to use KV connection string
   ```

### Performance Configuration

```javascript
// next.config.mjs - Production optimizations
const nextConfig = {
  // Image optimization
  images: {
    unoptimized: false, // Enable in production
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Compression
  compress: true,
  
  // PostHog proxy for better performance
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

## 📊 Monitoring & Analytics

### PostHog Analytics

**Purpose**: User behavior tracking, feature usage analytics

**Setup**:
1. Create PostHog account
2. Add project key to `NEXT_PUBLIC_POSTHOG_KEY`
3. Configure reverse proxy for better performance (already configured)

**Key Metrics Tracked**:
- Split method popularity
- Bill completion rates
- Feature usage patterns
- User flow analysis
- Error tracking

### Vercel Analytics

**Purpose**: Web vitals, performance monitoring

**Setup**:
- Automatically enabled in Vercel projects
- No configuration required
- View metrics in Vercel dashboard

### Application Monitoring

```typescript
// lib/monitoring.ts - Custom monitoring setup
export const trackError = (error: Error, context?: Record<string, any>) => {
  console.error('Application Error:', error, context);
  
  // Send to PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...context
    });
  }
};

export const trackPerformance = (metric: string, value: number) => {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('performance_metric', {
      metric,
      value,
      timestamp: Date.now()
    });
  }
};
```

## ⚡ Performance Optimization

### Caching Strategy

```typescript
// Redis caching configuration
export const CACHE_CONFIG = {
  // Bill data cache (~6 months)
  BILL_TTL: 30 * 24 * 60 * 60,
  
  // Admin session cache (24 hours)
  ADMIN_SESSION_TTL: 24 * 60 * 60,
  
  // Rate limiting cache (1 hour)
  RATE_LIMIT_TTL: 60 * 60,
};
```

### Edge Optimization

```typescript
// middleware.ts - Edge middleware for performance
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add cache headers for static assets
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return response;
  }
  
  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}
```

### Bundle Optimization

```json
// package.json - Production optimizations
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "build:production": "NODE_ENV=production next build && next export"
  }
}
```

## 🔐 Security

### Environment Security

```bash
# Production environment variables (secure)
REDIS_URL="rediss://username:password@host:port"  # Use SSL
ADMIN_PASSWORD_HASH="$2b$12$..."  # Bcrypt hashed password
NEXT_PUBLIC_APP_URL="https://yourdomain.com"  # HTTPS only
```

### Security Headers

```javascript
// next.config.mjs - Security configuration
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];
```

### Data Privacy

- **No personal data collection**: Anonymous user IDs only
- **Temporary storage**: auto-deletes after ~6 months
- **Input masking**: Sensitive data masked in session recordings
- **GDPR compliant**: No persistent user tracking

## 💾 Backup & Recovery

### Redis Backup Strategy

```bash
# Automated backup script
#!/bin/bash

# Create backup directory
mkdir -p /backups/redis/$(date +%Y-%m-%d)

# Export Redis data
redis-cli --rdb /backups/redis/$(date +%Y-%m-%d)/dump.rdb

# Compress backup
gzip /backups/redis/$(date +%Y-%m-%d)/dump.rdb

# Clean old backups (keep 30 days)
find /backups/redis/ -type f -mtime +30 -delete
```

### Application Backup

```bash
# Code backup (Git)
git push origin main --tags

# Environment backup
cp .env.production .env.backup.$(date +%Y-%m-%d)

# Configuration backup
tar -czf config.backup.$(date +%Y-%m-%d).tar.gz \
  next.config.mjs \
  package.json \
  vercel.json \
  tailwind.config.ts
```

## 📈 Scaling Considerations

### Current Limits

| Component | Current Limit | Scaling Solution |
|-----------|---------------|------------------|
| **Vercel Functions** | 10s timeout | Optimize or use Edge Runtime |
| **Redis Memory** | Plan dependent | Upgrade Redis plan or implement data archival |
| **Concurrent Users** | ~1000/min | Implement rate limiting and caching |

### Horizontal Scaling

```typescript
// lib/scaling.ts - Scaling utilities
export const SCALING_CONFIG = {
  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  
  // Connection pooling
  REDIS_POOL: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
  },
};
```

### Performance Monitoring

```typescript
// Monitor key metrics
export const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 500, // ms
  REDIS_CONNECTION_TIME: 100, // ms
  PAGE_LOAD_TIME: 2000, // ms
  ERROR_RATE: 0.01, // 1%
};
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Redis Connection Issues

```bash
# Check Redis connectivity
redis-cli -u $REDIS_URL ping

# Test with curl
curl -X GET "https://yourapp.com/api/health"
```

**Solutions**:
- Verify `REDIS_URL` environment variable
- Check Redis service status
- Validate connection string format
- Check firewall/network rules

#### 2. Build Failures

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript errors
pnpm typecheck
```

#### 3. Performance Issues

```bash
# Analyze bundle size
pnpm build:analyze

# Check Redis memory usage
redis-cli -u $REDIS_URL info memory

# Monitor API response times
curl -w "@curl-format.txt" -s -o /dev/null https://yourapp.com/api/bills
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Test Redis connection
    await executeRedisOperation(async (redis) => {
      await redis.ping();
    });
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'connected',
        app: 'running'
      }
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
```

### Debugging Tools

```bash
# Application logs
vercel logs --follow

# Redis monitoring
redis-cli -u $REDIS_URL monitor

# Performance profiling
lighthouse https://yourapp.com --output=json
```

## 🎯 Best Practices

### Development Workflow

1. **Local Development**
   ```bash
   # Use local Redis for development
   docker run -p 6379:6379 redis:7-alpine
   
   # Run with hot reload
   pnpm dev
   ```

2. **Testing**
   ```bash
   # Run all tests
   pnpm test
   
   # Run with coverage
   pnpm test:coverage
   
   # Integration tests
   pnpm test:integration
   ```

3. **Deployment**
   ```bash
   # Build and test locally
   pnpm build
   pnpm start
   
   # Deploy to staging
   vercel --target staging
   
   # Deploy to production
   vercel --prod
   ```

### Monitoring Checklist

- [ ] **Uptime monitoring**: Set up external monitoring
- [ ] **Error tracking**: Monitor error rates and types
- [ ] **Performance**: Track Core Web Vitals
- [ ] **Usage analytics**: Monitor feature adoption
- [ ] **Resource usage**: Track Redis memory and API calls

---

## 📞 Support

For deployment issues or questions:

1. **Check logs**: `vercel logs` or application console
2. **Review environment**: Validate all required variables
3. **Test locally**: Reproduce issues in development
4. **GitHub Issues**: Report bugs or feature requests
5. **Documentation**: Review Next.js and Vercel docs

---

**Last Updated**: January 2025
**Version**: 1.0.0
