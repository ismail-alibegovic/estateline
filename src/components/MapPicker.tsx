'use client'

import dynamic from 'next/dynamic'

const Map = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-lg bg-muted flex items-center justify-center border border-border">
      <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" />
    </div>
  )
})

interface MapPickerProps {
  initialLat?: number
  initialLng?: number
  onChange: (lat: number, lng: number) => void
}

export default function MapPicker(props: MapPickerProps) {
  return <Map {...props} />
}
