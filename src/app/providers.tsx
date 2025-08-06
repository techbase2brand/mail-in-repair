'use client'

import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { SupabaseProvider } from '@/components/supabase-provider'

const theme = createTheme({
  palette: {
    primary: {
      main: '#0ea5e9',
    },
    secondary: {
      main: '#8b5cf6',
    },
    success: {
      main: '#10b981',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#ef4444',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '0.375rem',
        },
      },
    },
  },
})

// Using only SupabaseProvider for authentication

export function Providers({ children }: { children: React.ReactNode }) {
  // Use useEffect to ensure client-side only execution
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering on client
  if (!isMounted) {
    return null
  }

  return (
    <SupabaseProvider>
      <ThemeProvider theme={theme}>
        <Toaster position="top-right" />
        {children}
      </ThemeProvider>
    </SupabaseProvider>
  )
}