import type { AdminCarModel } from '@mapcar/contracts'
import type { Metadata } from 'next'
import { ApiDown, PageTitle } from '@/components/page-title'
import { adminApi } from '@/lib/api'
import { CarsTable } from './cars-table'

export const metadata: Metadata = { title: 'Arabalar' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    return <CarsTable cars={await adminApi<AdminCarModel[]>('/cars')} />
  } catch (err) {
    return (
      <>
        <PageTitle title="Arabalar" />
        <ApiDown message={(err as Error).message} />
      </>
    )
  }
}
