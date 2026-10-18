'use client'

import type { AdminJob, JobInput } from '@mapcar/contracts'
import { Pencil, Plus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/confirm-delete'
import { Field } from '@/components/field'
import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteJob, saveJob } from '@/lib/actions'
import { money } from '@/lib/format'

const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const ORDER = [1, 2, 3, 4, 5, 6, 0]

export function JobsTable({
  jobs,
  places,
}: {
  jobs: AdminJob[]
  places: { id: string; name: string }[]
}) {
  const [editing, setEditing] = useState<{ id: string | null; data: JobInput } | null>(null)
  const empty: JobInput = {
    slug: '',
    title: '',
    placeId: places[0]?.id ?? '',
    hourlyWage: 500,
    shiftStart: 9,
    shiftEnd: 17,
    workDays: [1, 2, 3, 4, 5],
    minLevel: 0,
    active: true,
  }
  return (
    <>
      <PageTitle
        title="İşler"
        description="Kariyer basamakları. Deniz seviye atladığında, gerekli seviyesi tutan en iyi ücretli işe geçer."
        actions={
          <Button onClick={() => setEditing({ id: null, data: empty })}>
            <Plus /> Yeni iş
          </Button>
        }
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pozisyon</TableHead>
              <TableHead>Yer</TableHead>
              <TableHead className="text-right">Saatlik</TableHead>
              <TableHead className="text-right">Vardiya</TableHead>
              <TableHead>Günler</TableHead>
              <TableHead className="text-right">Min. seviye</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id} className={j.active ? undefined : 'opacity-50'}>
                <TableCell className="font-medium">{j.title}</TableCell>
                <TableCell>{j.placeName}</TableCell>
                <TableCell className="text-right tabular">{money(j.hourlyWage)}</TableCell>
                <TableCell className="text-right tabular">
                  {j.shiftStart}:00–{j.shiftEnd}:00
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ORDER.filter((d) => j.workDays.includes(d))
                    .map((d) => DAYS[d])
                    .join(', ')}
                </TableCell>
                <TableCell className="text-right tabular">{j.minLevel}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${j.title} düzenle`}
                    onClick={() => {
                      const { id, placeName, ...data } = j
                      setEditing({ id, data })
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDelete name={j.title} onDelete={() => deleteJob(j.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing && (
        <JobDialog
          key={editing.id ?? 'new'}
          initial={editing}
          places={places}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function JobDialog({
  initial,
  places,
  onClose,
}: {
  initial: { id: string | null; data: JobInput }
  places: { id: string; name: string }[]
  onClose: () => void
}) {
  const [data, setData] = useState(initial.data)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const set = <K extends keyof JobInput>(k: K, v: JobInput[K]) => setData((d) => ({ ...d, [k]: v }))
  const num = (v: string) => (v === '' ? Number.NaN : Number(v))
  const isNew = !initial.id

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await saveJob(initial.id, data)
      if (r.ok) {
        toast.success(isNew ? 'İş eklendi' : 'İş kaydedildi')
        onClose()
      } else {
        setErrors(r.fields ?? {})
        toast.error(r.error)
      }
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Yeni iş' : data.title}</DialogTitle>
            <DialogDescription>Ücret saatlik TL, vardiya saatleri 0–24.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="title" label="Pozisyon" error={errors.title}>
              <Input
                id="title"
                value={data.title}
                onChange={(e) => set('title', e.target.value)}
                required
              />
            </Field>
            <Field id="slug" label="Slug" error={errors.slug}>
              <Input
                id="slug"
                value={data.slug}
                onChange={(e) => set('slug', e.target.value)}
                required
              />
            </Field>
            <Field id="place" label="İş yeri" error={errors.placeId} className="sm:col-span-2">
              <Select value={data.placeId} onValueChange={(v) => set('placeId', v)}>
                <SelectTrigger id="place" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {places.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="wage" label="Saatlik ücret" error={errors.hourlyWage}>
              <Input
                id="wage"
                type="number"
                value={data.hourlyWage}
                onChange={(e) => set('hourlyWage', num(e.target.value))}
              />
            </Field>
            <Field id="level" label="Minimum seviye" error={errors.minLevel}>
              <Input
                id="level"
                type="number"
                min={0}
                value={data.minLevel}
                onChange={(e) => set('minLevel', num(e.target.value))}
              />
            </Field>
            <Field id="start" label="Vardiya başı" error={errors.shiftStart}>
              <Input
                id="start"
                type="number"
                min={0}
                max={23}
                value={data.shiftStart}
                onChange={(e) => set('shiftStart', num(e.target.value))}
              />
            </Field>
            <Field id="end" label="Vardiya sonu" error={errors.shiftEnd}>
              <Input
                id="end"
                type="number"
                min={1}
                max={24}
                value={data.shiftEnd}
                onChange={(e) => set('shiftEnd', num(e.target.value))}
              />
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Çalışma günleri</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {ORDER.map((d) => (
                <div key={d} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    id={`day-${d}`}
                    checked={data.workDays.includes(d)}
                    onCheckedChange={(c) =>
                      set(
                        'workDays',
                        c ? [...data.workDays, d].sort() : data.workDays.filter((x) => x !== d),
                      )
                    }
                  />
                  <Label htmlFor={`day-${d}`}>{DAYS[d]}</Label>
                </div>
              ))}
            </div>
            {errors.workDays && (
              <p className="mt-1 text-xs text-destructive">En az bir gün seçin</p>
            )}
          </fieldset>
          <div className="flex items-center gap-3 text-sm">
            <Switch id="active" checked={data.active} onCheckedChange={(v) => set('active', v)} />
            <Label htmlFor="active">Aktif</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Kaydediliyor' : isNew ? 'İşi ekle' : 'Değişiklikleri kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
