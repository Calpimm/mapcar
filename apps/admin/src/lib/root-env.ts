import path from 'node:path'
import { loadEnvConfig } from '@next/env'

// Monorepo kökündeki .env dosyasını yükle (yoksa sessizce geçer; prod'da ortam değişkenleri doğrudan gelir)
loadEnvConfig(path.resolve(process.cwd(), '../..'), process.env.NODE_ENV !== 'production')
