'use client'

import type { AdminCarModel, CarModelInput } from '@mapcar/contracts'
import { Pencil, Plus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/confirm-delete'
import { Field } from '@/components/field'
import { PageTitle } from '@/components/page-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteCar, saveCar } from '@/lib/actions'
import { money } from '@/lib/format'

const EMPTY: CarModelInput = {
  slug: '',
  brand: '',
  model: '',
  year: 2020,
  price: 100_000,
  fuelPer100Km: 6,
  tankLiters: 50,
  comfort: 0.6,
  cruiseKmh: 72,
  color: '#3a5a8c',
  active: true,
}

export function CarsTable({ cars }: { cars: AdminCarModel[] }) {
  const [editing, setEditing] = useState<{ id: string | null; data: CarModelInput } | null>(null)
  return (
    <>
      <PageTitle
        title="Arabalar"
        description="Galerideki modeller. Deniz bir sonraki hedefini konfor ve fiyata bakarak bu listeden seçer."
        actions={
          <Button onClick={() => setEditing({ id: null, data: EMPTY })}>
            <Plus /> Yeni model
          </Button>
        }
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Fiyat</TableHead>
              <TableHead className="text-right">Tüketim</TableHead>
              <TableHead className="text-right">Konfor</TableHead>
              <TableHead className="text-right">Seyir</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cars.map((c) => (
              <TableRow key={c.id} className={c.active ? undefined : 'opacity-50'}>
                <TableCell className="font-medium">
                  <span
                    className="mr-2 inline-block size-3 rounded-full align-middle ring-1 ring-black/10"
                    style={{ background: c.color }}
                  />
                  {c.year} {c.brand} {c.model}
                  {!c.active && (
                    <Badge variant="outline" className="ml-2">
                      Pasif
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular">{money(c.price)}</TableCell>
                <TableCell className="text-right tabular">{c.fuelPer100Km} L</TableCell>
                <TableCell className="text-right tabular">{Math.round(c.comfort * 100)}</TableCell>
                <TableCell className="text-right tabular">{c.cruiseKmh} km/s</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${c.brand} ${c.model} düzenle`}
                    onClick={() => {
                      const { id, ...data } = c
                      setEditing({ id, data })
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDelete name={`${c.brand} ${c.model}`} onDelete={() => deleteCar(c.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing && (
        <CarDialog key={editing.id ?? 'new'} initial={editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

function CarDialog({
  initial,
  onClose,
}: {
  initial: { id: string | null; data: CarModelInput }
  onClose: () => void
}) {
  const [data, setData] = useState(initial.data)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const set = <K extends keyof CarModelInput>(k: K, v: CarModelInput[K]) =>
    setData((d) => ({ ...d, [k]: v }))
  const num = (v: string) => (v === '' ? Number.NaN : Number(v))
  const isNew = !initial.id

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await saveCar(initial.id, data)
      if (r.ok) {
        toast.success(isNew ? 'Model eklendi' : 'Model kaydedildi')
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
            <DialogTitle>{isNew ? 'Yeni model' : `${data.brand} ${data.model}`}</DialogTitle>
            <DialogDescription>Fiyat TL, tüketim 100 km&apos;de litre.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="brand" label="Marka" error={errors.brand}>
              <Input
                id="brand"
                value={data.brand}
                onChange={(e) => set('brand', e.target.value)}
                required
              />
            </Field>
            <Field id="model" label="Model" error={errors.model}>
              <Input
                id="model"
                value={data.model}
                onChange={(e) => set('model', e.target.value)}
                required
              />
            </Field>
            <Field id="year" label="Yıl" error={errors.year}>
              <Input
                id="year"
                type="number"
                value={data.year}
                onChange={(e) => set('year', num(e.target.value))}
              />
            </Field>
            <Field id="slug" label="Slug" error={errors.slug} className="sm:col-span-2">
              <Input
                id="slug"
                value={data.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="ornek-model-2020"
                required
              />
            </Field>
            <Field id="color" label="Renk" error={errors.color}>
              <Input
                id="color"
                type="color"
                value={data.color}
                onChange={(e) => set('color', e.target.value)}
                className="h-9 p-1"
              />
            </Field>
            <Field id="price" label="Fiyat" error={errors.price}>
              <Input
                id="price"
                type="number"
                value={data.price}
                onChange={(e) => set('price', num(e.target.value))}
              />
            </Field>
            <Field id="fuel" label="Tüketim" error={errors.fuelPer100Km}>
              <Input
                id="fuel"
                type="number"
                step="0.1"
                value={data.fuelPer100Km}
                onChange={(e) => set('fuelPer100Km', num(e.target.value))}
              />
            </Field>
            <Field id="tank" label="Depo (L)" error={errors.tankLiters}>
              <Input
                id="tank"
                type="number"
                value={data.tankLiters}
                onChange={(e) => set('tankLiters', num(e.target.value))}
              />
            </Field>
            <Field id="cruise" label="Seyir (km/s)" error={errors.cruiseKmh}>
              <Input
                id="cruise"
                type="number"
                value={data.cruiseKmh}
                onChange={(e) => set('cruiseKmh', num(e.target.value))}
              />
            </Field>
            <Field
              id="comfort"
              label={`Konfor: ${Math.round(data.comfort * 100)}`}
              error={errors.comfort}
              className="sm:col-span-2"
            >
              <Slider
                id="comfort"
                className="mt-3"
                value={[data.comfort]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => set('comfort', v ?? 0)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Switch id="active" checked={data.active} onCheckedChange={(v) => set('active', v)} />
            <Label htmlFor="active">Galeride satışta</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Kaydediliyor' : isNew ? 'Modeli ekle' : 'Değişiklikleri kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
