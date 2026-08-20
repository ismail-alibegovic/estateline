import { redirect } from 'next/navigation'

export default function SettingsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  redirect(`/${locale}/dashboard/settings/profile`)
}
