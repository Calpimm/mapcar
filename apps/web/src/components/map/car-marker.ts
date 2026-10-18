import { Marker } from 'maplibre-gl'

/** Kuzeye bakan, üstten görünüm araba. Gövde rengi o anki arabanın rengidir. */
function carSvg(color: string) {
  return `
<svg viewBox="0 0 40 72" width="22" height="40" aria-hidden="true">
  <defs>
    <linearGradient id="glass" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#2b3a4d"/><stop offset="1" stop-color="#121a24"/>
    </linearGradient>
  </defs>
  <rect x="3" y="2" width="34" height="68" rx="13" fill="rgba(0,0,0,.28)" transform="translate(1.5 2.5)"/>
  <rect class="car-body" x="3" y="2" width="34" height="68" rx="13" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
  <path d="M9 22 Q20 14 31 22 L29 31 Q20 28 11 31 Z" fill="url(#glass)"/>
  <path d="M11 50 Q20 53 29 50 L30 58 Q20 62 10 58 Z" fill="url(#glass)" opacity=".9"/>
  <rect x="11" y="32" width="18" height="17" rx="4" fill="rgba(255,255,255,.12)"/>
  <rect x="6" y="4" width="8" height="4" rx="2" fill="#fff6d6"/>
  <rect x="26" y="4" width="8" height="4" rx="2" fill="#fff6d6"/>
  <rect x="6" y="64" width="8" height="3" rx="1.5" fill="#d9342b"/>
  <rect x="26" y="64" width="8" height="3" rx="1.5" fill="#d9342b"/>
</svg>`
}

export class CarMarker {
  readonly marker: Marker
  private el: HTMLDivElement
  private color = ''

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'car-marker'
    this.el.setAttribute('role', 'img')
    this.el.setAttribute('aria-label', "Deniz'in arabası")
    this.el.innerHTML = `
      <div class="car-beam"></div>
      <div class="car-halo"></div>
      <div class="car-svg"></div>`
    this.marker = new Marker({
      element: this.el,
      rotationAlignment: 'map',
      pitchAlignment: 'map',
    })
  }

  setColor(color: string) {
    if (color === this.color) return
    this.color = color
    const holder = this.el.querySelector('.car-svg')
    if (holder) holder.innerHTML = carSvg(color)
  }

  setNight(night: boolean) {
    this.el.classList.toggle('is-night', night)
  }

  setMoving(moving: boolean) {
    this.el.classList.toggle('is-moving', moving)
  }

  setPose(lngLat: [number, number], heading: number) {
    this.marker.setLngLat(lngLat)
    this.marker.setRotation(heading)
  }
}
