/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react'

interface LocationContextType {
  activeSiteId: string | null
  setActiveSiteId: (id: string | null) => void
  activeDepartmentId: string | null
  setActiveDepartmentId: (id: string | null) => void
}

const LocationContext = createContext<LocationContextType>({
  activeSiteId: null,
  setActiveSiteId: () => {},
  activeDepartmentId: null,
  setActiveDepartmentId: () => {},
})

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null)
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null)

  return (
    <LocationContext.Provider
      value={{ activeSiteId, setActiveSiteId, activeDepartmentId, setActiveDepartmentId }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export const useLocationScope = () => useContext(LocationContext)
