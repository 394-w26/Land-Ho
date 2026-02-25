import { useEffect, useState, useMemo } from 'react'
import { type User } from 'firebase/auth'
import { db, isFirebaseReady } from '../lib/firebase'
import { subscribePublishedBoats } from '../features/boats/boatsApi'
import { type BoatCard, type BoatCategory } from '../types'
import { initialBoatData } from '../data/seedBoats'

interface UseBoatsOptions {
  viewer: User | null
  category: BoatCategory
  searchText: string
  seatFilter: string
}

export function useBoats({ viewer, category, searchText, seatFilter }: UseBoatsOptions) {
  const [boats, setBoats] = useState<BoatCard[]>([])
  const [boatsLoading, setBoatsLoading] = useState(true)
  const [boatsError, setBoatsError] = useState('')

  useEffect(() => {
    if (!db || !isFirebaseReady) {
      setBoats(initialBoatData)
      setBoatsLoading(false)
      return
    }
    const unsubscribe = subscribePublishedBoats(
      (nextBoats) => {
        setBoats(nextBoats)
        setBoatsLoading(false)
        setBoatsError('')
      },
      (message) => {
        setBoatsLoading(false)
        setBoatsError(message)
      },
    )
    return () => unsubscribe()
  }, [])

  const filteredBoats = useMemo(() => {
    return boats.filter((boat) => {
      const byCategory = category === 'all' || boat.category === category
      const bySearch =
        searchText.trim().length === 0 ||
        boat.title.includes(searchText) ||
        boat.location.includes(searchText)
      const seats = Number(seatFilter || 0)
      const bySeats = seats === 0 || boat.seats >= seats
      return byCategory && bySearch && bySeats
    })
  }, [boats, category, searchText, seatFilter])

  const hostBoats = useMemo(() => {
    if (!viewer) {
      return []
    }
    return boats.filter((item) => item.ownerUid === viewer.uid)
  }, [boats, viewer])

  return {
    boats,
    boatsLoading,
    boatsError,
    filteredBoats,
    hostBoats,
  }
}
