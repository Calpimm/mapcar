# Katkı rehberi

## Geliştirme

```bash
pnpm install
cp .env.example .env
pnpm db:setup
pnpm dev
```

Göndermeden önce:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Neler eklenebilir?

- **Yeni mekan:** `packages/db/prisma/data.ts` içine ekleyin, `pnpm db:seed` çalıştırın. Ya da yönetim panelinden ekleyin. Gerçek işletme adı kullanmayın; tarihi ve doğal yerler gerçek olabilir.
- **Yeni araba ya da iş:** Aynı dosyada `carModels` ve `jobs`.
- **Yeni davranış:** `packages/sim/src/engine.ts` içinde `decide()` bir aday ekler, `startAt()` etkinliği başlatır, `finish()` sonuçlandırır. Her davranış için `packages/sim/test` altına bir test ekleyin.
- **Yeni metinler:** `packages/sim/src/text.ts`.

## Commit mesajları

[Conventional Commits](https://www.conventionalcommits.org/tr/v1.0.0/) kullanıyoruz: `feat(sim): ...`, `fix(web): ...`, `docs: ...`. Kapsamlar: `sim`, `db`, `api`, `web`, `admin`, `contracts`.

## Veritabanı değişiklikleri

`packages/db/prisma/schema.prisma` dosyasını düzenleyip `pnpm db:migrate` çalıştırın. Oluşan migration dosyasını commit'e ekleyin.
