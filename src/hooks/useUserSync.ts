import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  profilePicture: string | null
  createdAt?: string
  preferences?: string | null
}

export function useUserSync() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load user after mount to avoid hydration mismatch
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update user in localStorage
  const updateUser = (updates: Partial<User>) => {
    const currentUser = user
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      return updatedUser
    }
    return null
  }

  useEffect(() => {
    // Listen for storage changes (works across tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const parsedUser = JSON.parse(e.newValue)
          setUser(parsedUser)
        } catch (error) {
          console.error('Error parsing user from storage event:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return { user, setUser, updateUser, isLoading }
}
