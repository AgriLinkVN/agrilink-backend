@echo off
cd /d d:\ProjectCode\AgriLink\agrilink-backend
git add src/app.module.ts src/main.ts src/database/dev-seed.service.ts
git commit -m "feat: add comprehensive dev seed service for screenshots

Seeds all modules: users (8 roles), profiles (farmer/cooperative/
enterprise/supplier/logistics), addresses, products (18), categories
(10), forum posts + comments + likes, reviews (9), ad packages (3) +
campaigns (4), cooperative members + bulk listings + harvest schedules,
violations (2 suspended products), audit logs (7), notifications (12).

All passwords: Test@1234. Gated by PRODUCT_DEV_SEED=true env var.

Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin feature/dev-seed-data
