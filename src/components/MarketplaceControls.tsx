import { useMemo, useState, type ReactNode } from 'react'
import {
  cruiseLengthOptions,
  cruiseTypeOptions,
  harborFilterOptions,
  boatSizeSortOptions,
} from '../data/constants'
import { type CruiseLengthFilter, type CruiseTypeFilter, type BoatSizeSort } from '../types'

export interface SuggestionOption {
  id: string
  label: string
}

interface MarketplaceControlsProps {
  searchText: string
  setSearchText: (value: string) => void
  seatFilter: string
  setSeatFilter: (value: string) => void
  weather?: ReactNode
  cruiseLength: CruiseLengthFilter
  setCruiseLength: (v: CruiseLengthFilter) => void
  cruiseType: CruiseTypeFilter
  setCruiseType: (v: CruiseTypeFilter) => void
  harborFilter: string
  setHarborFilter: (value: string) => void
  boatSizeSort: BoatSizeSort
  setBoatSizeSort: (v: BoatSizeSort) => void
  suggestions: SuggestionOption[]
  suggestionsLoading?: boolean
  wherePlaceholder?: string
  showWhen?: boolean
  searchSectionClassName?: string
  onSelectSuggestion?: (item: SuggestionOption) => void
}

export default function MarketplaceControls({
  searchText,
  setSearchText,
  seatFilter,
  setSeatFilter,
  cruiseLength,
  setCruiseLength,
  cruiseType,
  setCruiseType,
  harborFilter,
  setHarborFilter,
  boatSizeSort,
  setBoatSizeSort,
  suggestions,
  suggestionsLoading = false,
  wherePlaceholder = 'Search harbors & marinas',
  showWhen = true,
  searchSectionClassName = '',
  onSelectSuggestion,
}: MarketplaceControlsProps) {
  const [whereFocused, setWhereFocused] = useState(false)

  const visibleSuggestions = useMemo(() => {
    if (!whereFocused) {
      return []
    }
    return suggestions
  }, [whereFocused, suggestions])

  return (
    <>
      <section className={`searchSection ${searchSectionClassName}`.trim()}>
        <div className="searchItem">
          <label>Where</label>
          <input
            placeholder={wherePlaceholder}
            value={searchText}
            onFocus={() => setWhereFocused(true)}
            onBlur={() => setTimeout(() => setWhereFocused(false), 150)}
            onChange={(e) => {
              setSearchText(e.target.value)
              setWhereFocused(true)
            }}
          />
          {(visibleSuggestions.length > 0 || (suggestionsLoading && whereFocused)) && (
            <div className="suggestionsList">
              {suggestionsLoading && <div className="suggestionItem muted">Searching...</div>}
              {visibleSuggestions.map((item) => (
                <button
                  key={item.id}
                  className="suggestionItem"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSearchText(item.label)
                    onSelectSuggestion?.(item)
                    setWhereFocused(false)
                  }}
                >
                  <div className="suggestionTitle">{item.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {showWhen && (
          <div className="searchItem">
            <label>When</label>
            <input placeholder="Any week" />
          </div>
        )}
        <div className="searchItem">
          <label>Sailors</label>
          <input
            placeholder="Add sailors"
            value={seatFilter}
            onChange={(e) => setSeatFilter(e.target.value)}
          />
        </div>
        <button type="button" className="searchBtn searchBtn--icon" aria-label="Search">
          <span className="searchBtnText">Search</span>
          <span className="searchBtnIcon" aria-hidden>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
        </button>
      </section>

      <section className="filterRow">
        <div className="filterItem">
          <span className="filterIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>
          <select
            className="filterSelect"
            value={cruiseLength}
            onChange={(e) => setCruiseLength(e.target.value as CruiseLengthFilter)}
            aria-label="Length of cruise"
          >
            {cruiseLengthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filterItem">
          <span className="filterIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </span>
          <select
            className="filterSelect"
            value={cruiseType}
            onChange={(e) => setCruiseType(e.target.value as CruiseTypeFilter)}
            aria-label="Type of cruise"
          >
            {cruiseTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filterItem">
          <span className="filterIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <select
            className="filterSelect"
            value={harborFilter}
            onChange={(e) => setHarborFilter(e.target.value)}
            aria-label="Harbors / Marinas"
          >
            {harborFilterOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filterItem">
          <span className="filterIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
              <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-9-4 4 6 6-8 5-4-4" />
            </svg>
          </span>
          <select
            className="filterSelect"
            value={boatSizeSort}
            onChange={(e) => setBoatSizeSort(e.target.value as BoatSizeSort)}
            aria-label="Size or type of boat"
          >
            {boatSizeSortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>
    </>
  )
}

