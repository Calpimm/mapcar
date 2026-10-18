import type { AdminJob, AdminPlace } from '@mapcar/contracts'
import type { Metadata } from 'next'
import { ApiDown, PageTitle } from '@/components/page-title'
import { adminApi } from '@/lib/api'
import { JobsTable } from './jobs-table'

export const metadata: Metadata = { title: 'İşler' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const [jobs, places] = await Promise.all([
      adminApi<AdminJob[]>('/jobs'),
      adminApi<AdminPlace[]>('/places'),
    ])
    return <JobsTable jobs={jobs} places={places.map((p) => ({ id: p.id, name: p.name }))} />
  } catch (err) {
    return (
      <>
        <PageTitle title="İşler" />
        <ApiDown message={(err as Error).message} />
      </>
    )
  }
}
