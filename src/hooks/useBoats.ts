import { useEffect, useState, useMemo } from 'react'
import { type User } from 'firebase/auth'
import { db, isFirebaseReady } from '../lib/firebase'
import { subscribePublishedBoats } from '../features/boats/boatsApi'
import { type BoatCard, type CruiseLengthFilter, type CruiseTypeFilter, type BoatSizeSort } from '../types'
import { initialBoatData } from '../data/seedBoats'

interface UseBoatsOptions {
  viewer: User | null
  searchText: string
  seatFilter: string
  cruiseLength: CruiseLengthFilter
  cruiseType: CruiseTypeFilter
  harborFilter: string
  boatSizeSort: BoatSizeSort
}

export function useBoats({
  viewer,
  searchText,
  seatFilter,
  cruiseLength,
  cruiseType,
  harborFilter,
  boatSizeSort,
}: UseBoatsOptions) {
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
        setBoats(nextBoats.length === 0 ? initialBoatData : nextBoats)
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
    let list = boats.filter((boat) => {
      const keyword = searchText.trim().toLowerCase()
      const bySearch =
        keyword.length === 0 ||
        boat.title.toLowerCase().includes(keyword) ||
        boat.location.toLowerCase().includes(keyword)
      const seats = Number(seatFilter || 0)
      const bySeats = seats === 0 || boat.seats >= seats
      const byCruiseLength =
        cruiseLength === 'all' || boat.durationCategory === cruiseLength
      const byCruiseType =
        cruiseType === 'all' || boat.cruiseType === cruiseType
      const byHarbor =
        !harborFilter.trim() || boat.location === harborFilter.trim()
      return bySearch && bySeats && byCruiseLength && byCruiseType && byHarbor
    })
    if (boatSizeSort === 'smallToLarge') {
      list = [...list].sort((a, b) => a.seats - b.seats)
    } else if (boatSizeSort === 'largeToSmall') {
      list = [...list].sort((a, b) => b.seats - a.seats)
    }
    return list
  }, [boats, searchText, seatFilter, cruiseLength, cruiseType, harborFilter, boatSizeSort])

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
