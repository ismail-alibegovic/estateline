'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import MapPicker from '@/components/MapPicker'

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'EUR',
    type: 'sale',
    status: 'draft',
    city: '',
    address: '',
    area_size: '',
  })
  
  const [location, setLocation] = useState({ lat: 43.8563, lng: 18.4131 })
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get organization ID
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single()
    if (!member) return

    try {
      // 1. Upload Images
      const uploadedImagePaths: string[] = []
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${member.organization_id}/${fileName}`

        // Upload to bucket 'property-images' (must exist in Supabase storage)
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file)

        if (!uploadError) {
          uploadedImagePaths.push(`property-images/${filePath}`)
        } else {
          console.error('Image upload failed:', uploadError)
        }
      }

      // 2. Insert Property Record
      const { error } = await supabase.from('properties').insert({
        organization_id: member.organization_id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        type: formData.type as any,
        status: formData.status as any,
        city: formData.city,
        area_size: formData.area_size ? parseFloat(formData.area_size) : null,
        location: {
          address: formData.address,
          latitude: location.lat,
          longitude: location.lng
        },
        images: uploadedImagePaths,
        custom_fields: {}
      })

      if (error) throw error

      router.push('/dashboard/properties')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error creating property')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Properties</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Add New Property</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <h2 className="text-lg font-display font-bold">Basic Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Property Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary min-h-[120px]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Price</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Currency</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="EUR">EUR (€)</option>
                <option value="BAM">BAM (KM)</option>
                <option value="RSD">RSD (din)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Area Size (m²)</label>
              <input
                type="number"
                value={formData.area_size}
                onChange={e => setFormData({ ...formData, area_size: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Location & Map */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <h2 className="text-lg font-display font-bold">Location & Coordinates</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">City</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Address</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Pin Location on Map</label>
              <MapPicker 
                initialLat={location.lat} 
                initialLng={location.lng} 
                onChange={(lat, lng) => setLocation({ lat, lng })} 
              />
              <p className="text-xs text-muted-foreground mt-2">Selected coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
            </div>
          </div>
        </div>

        {/* Media / Images */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <h2 className="text-lg font-display font-bold">Property Media</h2>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Upload Property Photos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {images.length > 0 && (
              <ul className="mt-4 space-y-1">
                {images.map((file, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                    📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Adding Property...' : 'Add Property'}
          </button>
        </div>
      </form>
    </div>
  )
}
