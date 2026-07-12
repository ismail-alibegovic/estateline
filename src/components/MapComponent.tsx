'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useState, useEffect } from 'react'

// Fix Leaflet marker icons not displaying in Webpack/Next.js builds
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const customIcon = new L.Icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface MapComponentProps {
  initialLat?: number
  initialLng?: number
  onChange: (lat: number, lng: number) => void
}

function MapEvents({ onChange, setPosition }: { onChange: (lat: number, lng: number) => void; setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setPosition([lat, lng])
      onChange(lat, lng)
    }
  })
  return null
}

export default function MapComponent({ initialLat = 43.8563, initialLng = 18.4131, onChange }: MapComponentProps) {
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng])

  useEffect(() => {
    // Inject Leaflet's standard CSS dynamically
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return (
    <div className="h-72 w-full rounded-lg overflow-hidden border border-border">
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={customIcon} />
        <MapEvents onChange={onChange} setPosition={setPosition} />
      </MapContainer>
    </div>
  )
}
