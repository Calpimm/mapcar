'use client'

import type { AdminOverview, SimSettings } from '@mapcar/contracts'
import { Pause, Play, RotateCcw, Route } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  type ActionResult,
  adjustAgent,
  clearRoutes,
  resetAgent,
  updateSettings,
} from '@/lib/actions'
import { clock, money, num } from '@/lib/format'
import { useLiveSnapshot } from '@/lib/use-live'

const PRESETS: {
  label: string
  hint: string
  value: Pick<SimSettings, 'driveRate' | 'activityRate'>
}[] = [
  {
    label: 'İzleme',
    hint: 'Yolculuklar uzun, etkinlikler hızlı',
    value: { driveRate: 0.35, activityRate: 8 },
  },
  { label: 'Hızlı', hint: 'Bir gün yaklaşık 1 dakika', value: { driveRate: 2, activityRate: 30 } },
  { label: 'Ağır çekim', hint: 'Gerçeğe yakın', value: { driveRate: 0.1, activityRate: 1 } },
]

function useAction() {
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<ActionResult>, success: string) =>
    start(async () => {
      const r = await fn()
      if (r.ok) toast.success(success)
      else toast.error(r.error)
    })
  return { pending, run }
}

export function Dashboard({
  overview,
  places,
  apiUrl,
}: {
  overview: AdminOverview
  places: { id: string; name: string; city: string }[]
  apiUrl: string
}) {
  const { snap, online } = useLiveSnapshot(apiUrl, overview.live)
  const [settings, setSettings] = useState(overview.settings)
  const { pending, run } = useAction()

  const save = (next: Partial<SimSettings>, msg: string) => {
    setSettings((s) => ({ ...s, ...next }))
    run(() => updateSettings(next), msg)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardDescription>
              {snap ? `${snap.day + 1}. gün, ${clock(snap.clock)}` : 'Bağlanıyor'}
            </CardDescription>
            <CardTitle className="mt-1 font-display text-2xl">
              {snap?.activity.label ?? '—'}
            </CardTitle>
            {snap?.activity.placeName && (
              <p className="mt-1 text-sm text-muted-foreground">{snap.activity.placeName}</p>
            )}
          </div>
          <Badge variant={!online ? 'destructive' : settings.paused ? 'secondary' : 'default'}>
            {!online ? 'Bağlantı yok' : settings.paused ? 'Duraklatıldı' : 'Çalışıyor'}
          </Badge>
        </CardHeader>
        <CardContent>
          {snap && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
              <Stat label="Cüzdan" value={money(snap.agent.money)} />
              <Stat
                label="Seviye"
                value={`${snap.agent.level} (${Math.floor(snap.agent.xp)} xp)`}
              />
              <Stat label="İş" value={snap.agent.job?.title ?? 'Yok'} />
              <Stat
                label="Araba"
                value={snap.car ? `${snap.car.model.brand} ${snap.car.model.model}` : 'Yok'}
              />
              <Stat label="Tokluk" value={`%${Math.round(snap.agent.needs.hunger)}`} />
              <Stat label="Enerji" value={`%${Math.round(snap.agent.needs.energy)}`} />
              <Stat label="Keyif" value={`%${Math.round(snap.agent.needs.fun)}`} />
              <Stat label="Sosyallik" value={`%${Math.round(snap.agent.needs.social)}`} />
            </dl>
          )}
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t pt-5 text-sm sm:grid-cols-7">
            <Stat label="Yer" value={num(overview.counts.places)} />
            <Stat label="Araba" value={num(overview.counts.cars)} />
            <Stat label="İş" value={num(overview.counts.jobs)} />
            <Stat label="Olay" value={num(overview.counts.events)} />
            <Stat label="Yorum" value={num(overview.counts.reviews)} />
            <Stat label="İşlem" value={num(overview.counts.transactions)} />
            <Stat label="Rota" value={num(overview.counts.routes)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zamanın akışı</CardTitle>
          <CardDescription>
            1 gerçek saniyede kaç simülasyon dakikası geçeceğini ayarlayın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            variant={settings.paused ? 'default' : 'outline'}
            onClick={() =>
              save(
                { paused: !settings.paused },
                settings.paused ? 'Simülasyon devam ediyor' : 'Simülasyon duraklatıldı',
              )
            }
            disabled={pending}
            className="w-full"
          >
            {settings.paused ? <Play /> : <Pause />}
            {settings.paused ? 'Devam ettir' : 'Duraklat'}
          </Button>
          <RateSlider
            label="Yoldayken"
            value={settings.driveRate}
            min={0.05}
            max={5}
            step={0.05}
            onCommit={(v) => save({ driveRate: v }, 'Sürüş hızı güncellendi')}
          />
          <RateSlider
            label="Etkinlik sırasında"
            value={settings.activityRate}
            min={0.5}
            max={60}
            step={0.5}
            onCommit={(v) => save({ activityRate: v }, 'Etkinlik hızı güncellendi')}
          />
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant="secondary"
                title={p.hint}
                onClick={() => save(p.value, `${p.label} moduna geçildi`)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AgentTools places={places} />

      <Card>
        <CardHeader>
          <CardTitle>Bakım</CardTitle>
          <CardDescription>Geri alınamayan işlemler.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Confirm
            trigger={
              <Button variant="outline" className="w-full justify-start">
                <Route /> Rota önbelleğini temizle
              </Button>
            }
            title="Rota önbelleği temizlensin mi?"
            description="Kayıtlı tüm yol rotaları silinir ve sırayla OSRM'den yeniden çekilir."
            action="Temizle"
            onConfirm={() => run(clearRoutes, 'Rota önbelleği temizlendi')}
          />
          <Confirm
            trigger={
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                <RotateCcw /> Deniz'i sıfırla
              </Button>
            }
            title="Deniz baştan başlasın mı?"
            description="Bütün olaylar, yorumlar, para hareketleri ve araba geçmişi silinir. Deniz ilk güne, eski Corolla'sıyla geri döner."
            action="Sıfırla"
            destructive
            onConfirm={() => run(resetAgent, 'Simülasyon sıfırlandı')}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium tabular">{value}</dd>
    </div>
  )
}

function RateSlider(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (v: number) => void
}) {
  const [v, setV] = useState(props.value)
  const [prev, setPrev] = useState(props.value)
  if (props.value !== prev) {
    setPrev(props.value)
    setV(props.value)
  }
  const id = `rate-${props.label}`
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <Label htmlFor={id}>{props.label}</Label>
        <span className="tabular text-muted-foreground">{v.toLocaleString('tr-TR')} dk / sn</span>
      </div>
      <Slider
        id={id}
        value={[v]}
        min={props.min}
        max={props.max}
        step={props.step}
        onValueChange={([x]) => setV(x ?? v)}
        onValueCommit={([x]) => x !== undefined && props.onCommit(x)}
      />
    </div>
  )
}

function Confirm(props: {
  trigger: React.ReactNode
  title: string
  description: string
  action: string
  destructive?: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{props.trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={props.onConfirm}
            className={
              props.destructive ? 'bg-destructive text-white hover:bg-destructive/90' : undefined
            }
          >
            {props.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function AgentTools({ places }: { places: { id: string; name: string; city: string }[] }) {
  const { pending, run } = useAction()
  const [amount, setAmount] = useState('5000')
  const [reason, setReason] = useState('')
  const [place, setPlace] = useState<string>('')

  const give = (sign: 1 | -1) => {
    const value = Math.round(Number(amount)) * sign
    if (!Number.isFinite(value) || value === 0) return toast.error('Geçerli bir tutar girin')
    run(
      () => adjustAgent({ money: value, reason: reason || undefined }),
      sign > 0 ? 'Para eklendi' : 'Para çekildi',
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deniz'e müdahale</CardTitle>
        <CardDescription>
          Hikayeye biraz baharat katın. Her müdahale günlüğe yansır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="amount">Para</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32"
            />
            <Input
              placeholder="Neden? (ör. piyango)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => give(1)} disabled={pending}>
              Ekle
            </Button>
            <Button size="sm" variant="outline" onClick={() => give(-1)} disabled={pending}>
              Çek
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>İhtiyaçlar</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                run(
                  () => adjustAgent({ needs: { hunger: 100, energy: 100, fun: 100, social: 100 } }),
                  'Deniz bomba gibi',
                )
              }
            >
              Hepsini doldur
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => run(() => adjustAgent({ needs: { hunger: 10 } }), 'Deniz acıktı')}
            >
              Acıktır
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                run(() => adjustAgent({ needs: { fun: 5, social: 5 } }), 'Deniz sıkıldı')
              }
            >
              Canını sık
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Işınla</Label>
          <div className="flex gap-2">
            <Select value={place} onValueChange={setPlace}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Bir yer seçin" />
              </SelectTrigger>
              <SelectContent>
                {places.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}, {p.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!place || pending}
              onClick={() => run(() => adjustAgent({ teleportPlaceId: place }), 'Deniz ışınlandı')}
            >
              Işınla
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
