import { useMemo, useState } from 'react'
import { categories } from '../data/constants'
import { type BoatCategory } from '../types'

export interface SuggestionOption {
  id: string
  label: string
}

interface MarketplaceControlsProps {
  category: BoatCategory
  setCategory: (category: BoatCategory) => void
  searchText: string
  setSearchText: (value: string) => void
  seatFilter: string
  setSeatFilter: (value: string) => void
  suggestions: SuggestionOption[]
  suggestionsLoading?: boolean
  wherePlaceholder?: string
  showWhen?: boolean
  searchSectionClassName?: string
  onSelectSuggestion?: (item: SuggestionOption) => void
}

export default function MarketplaceControls({
  category,
  setCategory,
  searchText,
  setSearchText,
  seatFilter,
  setSeatFilter,
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

      <section className="categoryTabs">
        {categories.map((item) => (
          <button
            key={item.key}
            className={category === item.key ? 'tab active' : 'tab'}
            onClick={() => setCategory(item.key)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </section>
    </>
  )
}

