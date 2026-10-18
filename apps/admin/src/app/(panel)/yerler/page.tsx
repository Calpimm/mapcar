import type { AdminPlace } from '@mapcar/contracts'
import type { Metadata } from 'next'
import { ApiDown, PageTitle } from '@/components/page-title'
import { adminApi } from '@/lib/api'
import { PlacesTable } from './places-table'

export const metadata: Metadata = { title: 'Yerler' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  let places: AdminPlace[]
  try {
    places = await adminApi<AdminPlace[]>('/places')
  } catch (err) {
    return (
      <>
        <PageTitle title="Yerler" />
        <ApiDown message={(err as Error).message} />
      </>
    )
  }
  return <PlacesTable places={places} />
}
