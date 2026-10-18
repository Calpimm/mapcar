import type { AdminOverview, AdminPlace } from '@mapcar/contracts'
import { ApiDown, PageTitle } from '@/components/page-title'
import { adminApi } from '@/lib/api'
import { env } from '@/lib/env'
import { Dashboard } from './dashboard'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let data: [AdminOverview, AdminPlace[]]
  try {
    data = await Promise.all([
      adminApi<AdminOverview>('/overview'),
      adminApi<AdminPlace[]>('/places'),
    ])
  } catch (err) {
    return (
      <>
        <PageTitle title="Panel" />
        <ApiDown message={(err as Error).message} />
      </>
    )
  }
  const [overview, places] = data
  return (
    <>
      <PageTitle
        title="Panel"
        description="Simülasyonun nabzı: Deniz şu an ne yapıyor, zaman ne hızda akıyor."
      />
      <Dashboard
        overview={overview}
        places={places
          .filter((p) => p.active)
          .map((p) => ({ id: p.id, name: p.name, city: p.city }))}
        apiUrl={env().NEXT_PUBLIC_API_URL}
      />
    </>
  )
}
