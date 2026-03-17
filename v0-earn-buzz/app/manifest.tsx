import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlashGain 9ja',
    short_name: 'FlashGain',
    description: 'Your ultimate financial companion',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ea580c',
    icons: [
      {
        src: '/icons/icon-180x180.png?v=20260317',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192x192.png?v=20260317',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png?v=20260317',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}