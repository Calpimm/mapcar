import type { FeedEvent } from '@mapcar/contracts'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ApiDown, PageTitle } from '@/components/page-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminApi } from '@/lib/api'
import { simDateTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Olay kaydı' }
export const dynamic = 'force-dynamic'

const TYPES = [
  'activity_start',
  'depart',
  'review',
  'work_done',
  'promotion',
  'car_bought',
  'incident',
  'thought',
  'goal_done',
]

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; cursor?: string }>
}) {
  const { type, cursor } = await searchParams
  const qs = new URLSearchParams({ limit: '100' })
  if (type) qs.set('type', type)
  if (cursor) qs.set('cursor', cursor)
  let data: { items: FeedEvent[]; nextCursor: string | null }
  try {
    data = await adminApi(`/events?${qs}`)
  } catch (err) {
    return (
      <>
        <PageTitle title="Olay kaydı" />
        <ApiDown message={(err as Error).message} />
      </>
    )
  }
  const href = (t?: string, c?: string) => {
    const p = new URLSearchParams()
    if (t) p.set('type', t)
    if (c) p.set('cursor', c)
    const s = p.toString()
    return s ? `/olaylar?${s}` : '/olaylar'
  }
  return (
    <>
      <PageTitle
        title="Olay kaydı"
        description="Motorun ürettiği ham olaylar, en yeniden eskiye."
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Button size="sm" variant={!type ? 'default' : 'outline'} asChild>
          <Link href={href()}>Hepsi</Link>
        </Button>
        {TYPES.map((t) => (
          <Button key={t} size="sm" variant={type === t ? 'default' : 'outline'} asChild>
            <Link href={href(t)}>{t}</Link>
          </Button>
        ))}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Sim. zamanı</TableHead>
              <TableHead className="w-36">Tür</TableHead>
              <TableHead>Mesaj</TableHead>
              <TableHead>Yer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                  {simDateTime(e.simTime)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{e.type}</Badge>
                </TableCell>
                <TableCell className="whitespace-normal">{e.message}</TableCell>
                <TableCell className="text-muted-foreground">{e.placeName ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.nextCursor && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" asChild>
            <Link href={href(type, data.nextCursor)}>Daha eski</Link>
          </Button>
        </div>
      )}
    </>
  )
}
