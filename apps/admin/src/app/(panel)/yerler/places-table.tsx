'use client'

import {
  type AdminPlace,
  CATEGORY_LABEL,
  type PlaceCategory,
  type PlaceInput,
  placeCategory,
} from '@mapcar/contracts'
import { Pencil, Plus, Search } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo, useState, useTransition } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Textarea } from '@/components/ui/textarea'
import { deletePlace, savePlace } from '@/lib/actions'

const MapPicker = dynamic(() => import('@/components/map-picker').then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-md bg-muted" />,
})

const EMPTY: PlaceInput = {
  slug: '',
  name: '',
  category: 'RESTAURANT',
  description: '',
  city: 'Gazimağusa',
  lat: 35.125,
  lng: 33.94,
  priceLevel: 2,
  quality: 0.7,
  openHour: 9,
  closeHour: 23,
  active: true,
}

const slugify = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function PlacesTable({ places }: { places: AdminPlace[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | PlaceCategory>('all')
  const [editing, setEditing] = useState<{ id: string | null; data: PlaceInput } | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    return places.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (!q ||
          p.name.toLocaleLowerCase('tr').includes(q) ||
          p.city.toLocaleLowerCase('tr').includes(q)),
    )
  }, [places, query, category])

  return (
    <>
      <PageTitle
        title="Yerler"
        description="Haritadaki her nokta. Kalite puanı gizlidir: Deniz onu bilmez, deneyimleyerek keşfeder."
        actions={
          <Button onClick={() => setEditing({ id: null, data: EMPTY })}>
            <Plus /> Yeni yer
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim veya şehir ara"
            className="pl-8"
            aria-label="Ara"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="w-44" aria-label="Kategori">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm kategoriler</SelectItem>
            {placeCategory.options.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead className="text-right">Kalite</TableHead>
              <TableHead className="text-right">Saatler</TableHead>
              <TableHead className="text-right">Yorum</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} className={p.active ? undefined : 'opacity-50'}>
                <TableCell className="font-medium">
                  {p.name}
                  {!p.active && (
                    <Badge variant="outline" className="ml-2">
                      Pasif
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{CATEGORY_LABEL[p.category]}</TableCell>
                <TableCell>{p.city}</TableCell>
                <TableCell className="text-right tabular">{Math.round(p.quality * 100)}</TableCell>
                <TableCell className="text-right tabular">
                  {p.openHour === p.closeHour ? '7/24' : `${p.openHour}–${p.closeHour}`}
                </TableCell>
                <TableCell className="text-right tabular">{p.reviewCount}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${p.name} düzenle`}
                    onClick={() => {
                      const { id, reviewCount, ...data } = p
                      setEditing({ id, data })
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDelete name={p.name} onDelete={() => deletePlace(p.id)} />
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Eşleşen yer yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {editing && (
        <PlaceDialog key={editing.id ?? 'new'} initial={editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

function PlaceDialog({
  initial,
  onClose,
}: {
  initial: { id: string | null; data: PlaceInput }
  onClose: () => void
}) {
  const [data, setData] = useState(initial.data)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const set = <K extends keyof PlaceInput>(k: K, v: PlaceInput[K]) =>
    setData((d) => ({ ...d, [k]: v }))
  const isNew = !initial.id

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await savePlace(initial.id, data)
      if (r.ok) {
        toast.success(isNew ? 'Yer eklendi' : 'Yer kaydedildi')
        onClose()
      } else {
        setErrors(r.fields ?? {})
        toast.error(r.error)
      }
    })
  }

  const num = (v: string) => (v === '' ? Number.NaN : Number(v))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Yeni yer' : data.name}</DialogTitle>
            <DialogDescription>
              Haritaya tıklayarak ya da işaretçiyi sürükleyerek konumu seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Ad" error={errors.name}>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => {
                  set('name', e.target.value)
                  if (isNew) set('slug', slugify(e.target.value))
                }}
                required
              />
            </Field>
            <Field
              id="slug"
              label="Slug"
              error={errors.slug}
              hint="Adreste görünür: /mekanlar/slug"
            >
              <Input
                id="slug"
                value={data.slug}
                onChange={(e) => set('slug', e.target.value)}
                required
              />
            </Field>
            <Field id="category" label="Kategori" error={errors.category}>
              <Select
                value={data.category}
                onValueChange={(v) => set('category', v as PlaceCategory)}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {placeCategory.options.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="city" label="Şehir" error={errors.city}>
              <Input
                id="city"
                value={data.city}
                onChange={(e) => set('city', e.target.value)}
                required
              />
            </Field>
          </div>
          <Field id="description" label="Açıklama" error={errors.description}>
            <Textarea
              id="description"
              rows={2}
              value={data.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <MapPicker
            lat={data.lat}
            lng={data.lng}
            onChange={(lat, lng) => setData((d) => ({ ...d, lat, lng }))}
          />
          <div className="grid gap-4 sm:grid-cols-4">
            <Field id="lat" label="Enlem" error={errors.lat}>
              <Input
                id="lat"
                type="number"
                step="0.00001"
                value={data.lat}
                onChange={(e) => set('lat', num(e.target.value))}
              />
            </Field>
            <Field id="lng" label="Boylam" error={errors.lng}>
              <Input
                id="lng"
                type="number"
                step="0.00001"
                value={data.lng}
                onChange={(e) => set('lng', num(e.target.value))}
              />
            </Field>
            <Field id="open" label="Açılış" error={errors.openHour}>
              <Input
                id="open"
                type="number"
                min={0}
                max={24}
                value={data.openHour}
                onChange={(e) => set('openHour', num(e.target.value))}
              />
            </Field>
            <Field id="close" label="Kapanış" error={errors.closeHour} hint="Aynıysa 7/24">
              <Input
                id="close"
                type="number"
                min={0}
                max={24}
                value={data.closeHour}
                onChange={(e) => set('closeHour', num(e.target.value))}
              />
            </Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              id="quality"
              label={`Gizli kalite: ${Math.round(data.quality * 100)}`}
              error={errors.quality}
            >
              <Slider
                id="quality"
                value={[data.quality]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => set('quality', v ?? 0)}
              />
            </Field>
            <Field
              id="price"
              label={`Fiyat seviyesi: ${'₺'.repeat(data.priceLevel)}`}
              error={errors.priceLevel}
            >
              <Slider
                id="price"
                value={[data.priceLevel]}
                min={1}
                max={4}
                step={1}
                onValueChange={([v]) => set('priceLevel', v ?? 1)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Switch id="active" checked={data.active} onCheckedChange={(v) => set('active', v)} />
            <Label htmlFor="active">Aktif (Deniz bu yere gidebilir)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Kaydediliyor' : isNew ? 'Yeri ekle' : 'Değişiklikleri kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
