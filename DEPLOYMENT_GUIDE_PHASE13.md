# 🚀 Phase 13: Production Deployment Guide

**Current Status:** Phase 13 optimizations are committed to git and ready to deploy.

**Target:** bettorplays247.com (hosted at srv2052.hstgr.io)

---

## 📋 Pre-Deployment Checklist

- [x] Frontend build successful (3.11s)
- [x] Backend PHP syntax validated
- [x] Database session optimizations ready
- [x] All changes committed to git
- [ ] Backup created before deployment
- [ ] .env.production credentials verified
- [ ] DNS/HTTP SSL certificate active

---

## 🎯 Deployment Steps

### Option A: cPanel File Manager (Easiest - 5 minutes)

**Step 1: Access cPanel**
```
URL: https://cpanel.hostgator.com (or your provider's cPanel)
Username: u487877829
Password: [Your cPanel password]
```

**Step 2: Navigate to File Manager**
```
cPanel → File Manager → public_html
```

**Step 3: Deploy Frontend**
```
1. Create folder: dist/ (if not exists)
2. Delete: dist/* (old files)
3. Upload from: /Users/mac/Desktop/betterdr/frontend/dist/*
4. Upload to: /home/u487877829/public_html/dist/
```

**Step 4: Deploy Backend**
```
1. Navigate to: /home/u487877829/public_html/api/
2. Create folders (if not exist):
   - src/
   - config/
3. Replace: php-backend/src/* → api/src/*
4. Replace: php-backend/config/* → api/config/
```

**Step 5: Update Configuration**
```
1. Edit: api/.env
2. Verify these credentials:
   MYSQL_HOST=srv2052.hstgr.io
   MYSQL_DB=u487877829_bettor_bets_24
   MYSQL_USER=u487877829_bettor_bets
   MYSQL_PASSWORD=Bettor.ok12
```

**Step 6: Verify Deployment**
```
✓ https://bettorplays247.com loads
✓ https://bettorplays247.com/dist/index.html exists
✓ API endpoint works: https://bettorplays247.com/api/health
```

---

### Option B: SFTP Upload (Alternative - 10 minutes)

**Step 1: Connect via SFTP**
```
Host: srv2052.hstgr.io
Username: u487877829
Password: [Your FTP password]
Port: 22 (SSH) or 21 (FTP)
```

**Step 2: Upload Frontend**
```
Local: /Users/mac/Desktop/betterdr/frontend/dist/
Remote: /home/u487877829/public_html/dist/
```

**Step 3: Upload Backend**
```
Local: /Users/mac/Desktop/betterdr/php-backend/src/
Remote: /home/u487877829/public_html/api/src/

Local: /Users/mac/Desktop/betterdr/php-backend/config/
Remote: /home/u487877829/public_html/api/config/
```

**Step 4: Update Permissions**
```
chmod 755 api/src/*.php
chmod 755 api/config/*.php
```

---

### Option C: Git Push (Most Efficient - If server has git)

```bash
# If your server has git access:
cd /home/u487877829/public_html
git pull origin main
npm run build  # Rebuild if needed
```

---

## ✅ Post-Deployment Verification

### Check Frontend
```bash
curl https://bettorplays247.com
# Should return: 200 OK, HTML with React app

curl -I https://bettorplays247.com/dist/assets/vendor-react-*.js
# Should return: 200 OK, with cache headers
```

### Check Backend
```bash
curl https://bettorplays247.com/api/health
# Should return: 200 OK, JSON response

curl -H "Content-Type: application/json" \
     https://bettorplays247.com/api/matches
# Should return: 200 OK (or 401 if auth required)
```

### Check Service Worker
```bash
curl https://bettorplays247.com/sw.js
# Should return: 200 OK, Service Worker code
```

### Monitor Deployment
```bash
# In cPanel → Metrics → Error Log
# Watch for:
✓ No PHP fatal errors
✓ No database connection errors
✓ Connection pool messages (optional debug)

# In cPanel → Metrics → Process Manager
✓ No stuck PHP processes
✓ MySQL connections healthy
```

---

## 📊 Expected Results After Deployment

### Immediate Changes
- Frontend loads from optimized dist/ bundles
- Service Worker active (offline support)
- Connection pool at 100 max (vs 50)
- Circuit breaker timeouts 50% faster

### Performance Metrics
```
Before Phase 13:
├─ Response time: 1294ms
├─ Error rate: 47.5%
├─ Bandwidth: 46.04 MB

After Phase 13 (now deployed):
├─ Response time: 400-600ms (60% faster)
├─ Error rate: 5-10% (85% fewer)
├─ Bandwidth: 15-25 MB (65% less)
```

### Monitoring Points
```
✓ Watch slow query log for queries <1.5s (Phase 13 timeout)
✓ Monitor error rate (should drop to <10%)
✓ Check cache hit rate grows over 2 hours
✓ Verify connection pool doesn't max out
```

---

## 🧪 Validation Test

**Before running load test (15 min warm-up):**

```bash
# 1. Test basic functionality
curl https://bettorplays247.com
curl https://bettorplays247.com/api/matches

# 2. Warm up query cache (run for 5 min)
for i in {1..100}; do
  curl -s https://bettorplays247.com/api/matches > /dev/null
  sleep 3
done

# 3. Monitor connection pool
# (Check via PHP: ConnectionPool::getInstance()->stats())

# 4. Load test ready
# Run loader.io: 10,000 concurrent clients
```

---

## 🆘 Troubleshooting

### Issue: 404 Not Found on dist/

**Solution:**
```
1. Check folder structure:
   public_html/dist/index.html ✓
   public_html/dist/assets/* ✓

2. Verify Vite configuration:
   vite.config.js has: outDir: '../dist'

3. Rebuild if needed:
   npm run build
```

### Issue: PHP Errors in API

**Solution:**
```
1. Check PHP syntax:
   php -l api/src/SqlRepository.php

2. Verify .env credentials:
   MYSQL_HOST, MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD

3. Check error log:
   cPanel → Metrics → Error Log
```

### Issue: Service Worker Not Caching

**Solution:**
```
1. Verify Service Worker loaded:
   DevTools → Application → Service Workers
   
2. Check cache storage:
   DevTools → Application → Cache Storage
   
3. Clear cache if needed:
   DevTools → Clear Site Data
```

### Issue: High Error Rate (>10%)

**Solution:**
```
1. Check connection pool stats:
   log: ConnectionPool::getInstance()->stats()
   
2. Monitor slow queries:
   tail /var/log/mysql/slow-query.log
   
3. Verify database connection:
   php-backend/test_db_connection.php
```

---

## 📝 Rollback Plan

If deployment causes issues:

```bash
# 1. Revert to previous version
git revert HEAD

# 2. Rebuild previous version
cd frontend && npm run build

# 3. Redeploy previous version to cPanel
# (Repeat deployment steps with old files)

# 4. Verify rollback
curl https://bettorplays247.com
```

---

## 🎯 Timeline

| Step | Time | Action |
|------|------|--------|
| Pre-deployment | 5 min | Backup, verify .env, check cPanel |
| Upload files | 10 min | cPanel File Manager or SFTP |
| Verification | 5 min | Test endpoints, check errors |
| Cache warm-up | 15 min | Let database cache populate |
| Load test | 1 min | Run loader.io test |
| **Total** | **36 min** | **Full deployment + test** |

---

## ✅ Deployment Complete Checklist

After deployment, verify:

- [ ] Frontend loads at https://bettorplays247.com
- [ ] Service Worker installed (DevTools → Application)
- [ ] API responds at /api/matches
- [ ] No PHP errors in cPanel error log
- [ ] Database connection active
- [ ] Connection pool set to 100
- [ ] Circuit breaker timeouts active
- [ ] Query cache warming up
- [ ] Load test ready to run

---

## 🚀 Next: Load Testing

Once deployment verified, run load test:

**Configuration:**
```
URL: https://bettorplays247.com/api/matches
Concurrent: 10,000 clients
Duration: 60 seconds
```

**Expected Results:**
```
✓ Response time: 400-600ms (target: <300ms)
✓ Error rate: 5-10% (target: <1%)
✓ Bandwidth: 15-25 MB (target: <10MB)
```

**If results good (<10% error):**
- ✅ Phase 13 successful
- ✅ Monitor for 24 hours
- ✅ Consider Phase 14 if scaling needed

**If results poor (>10% error):**
- ⏳ Check Phase 14 scaling options
- Possible causes:
  - Connection pool still exhausting
  - Slow queries blocking pool
  - Database CPU maxed out

---

## 📞 Support

**Deployment Issues?**
- cPanel: Check error logs
- PHP: Run `php -l` on files
- Database: Test connection with test script
- Hosting: Contact hstgr.io support

**Performance Issues?**
- Monitor: Slow query log
- Profile: Identify bottleneck queries
- Optimize: Add indexes, cache results
- Scale: Phase 14 options

---

**Deployment Ready! Proceed with cPanel upload or SFTP → Run load test → Analyze results** 🎉
