'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useOdooConfig } from '@/hooks/use-odoo-config'

export default function RootPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { isConfigured } = useOdooConfig()

  useEffect(() => {
    const locale = pathname.split('/')[1] || 'en'

    if (isConfigured) {
      router.push(`/${locale}/chat`)
    } else {
      router.push(`/${locale}/settings`)
    }
  }, [isConfigured, pathname, router])

  return null // No muestra nada mientras redirige
}
