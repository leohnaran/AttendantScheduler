// @ts-ignore
import { t } from '../i18n/translations.js'
import { Person, Position, Area, Tag, Shift } from '../types/models'

export const getAssignId = (val: any): number | null => {
  if (!val) return null
  if (typeof val === 'object') return parseInt(val.id)
  return parseInt(val)
}

export const isAutoAssigned = (val: any): boolean => {
  if (val && typeof val === 'object') return val.isAuto === true
  return false
}

export const getKeyManName = (personnel: Person[], id: number): string => {
  const km = personnel.find((p) => p.id === id)
  return km ? km.name : ''
}

export const getLastName = (fullName: string): string => {
  if (!fullName) return ''
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1].toLowerCase()
}

export const getHeatColor = (count: number): string => {
  if (count === 0) return 'bg-green-500'
  if (count === 1) return 'bg-yellow-500'
  if (count === 2) return 'bg-orange-500'
  return 'bg-red-500'
}

export const getHeatBg = (count: number): string => {
  if (count === 0)
    return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (count === 1)
    return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  if (count === 2)
    return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

export const getRandomInt = (max: number): number => {
  if (typeof window !== 'undefined' && window.crypto) {
    const randomBuffer = new Uint32Array(1)
    window.crypto.getRandomValues(randomBuffer)
    return randomBuffer[0] % max
  } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBuffer = new Uint32Array(1)
    crypto.getRandomValues(randomBuffer)
    return randomBuffer[0] % max
  } else {
    // Fallback if crypto is completely unavailable
    return Math.floor(Math.random() * max)
  }
}

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1)
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export const parseCSV = (text: string): string[][] => {
  const arr = []
  let quote = false
  let row = []
  let col = ''
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"') {
      if (quote && next === '"') {
        col += '"'
        i++
      } else {
        quote = !quote
      }
    } else if (char === ',' && !quote) {
      row.push(col)
      col = ''
    } else if (char === '\n' && !quote) {
      row.push(col)
      arr.push(row)
      row = []
      col = ''
    } else {
      col += char
    }
  }
  if (col || row.length > 0) {
    row.push(col)
    arr.push(row)
  }
  return arr
}

// --- CENTRALIZED CANDIDATE FINDER (Now relies on props) ---
export const parseAssignmentKey = (key: string, shifts: Shift[]): { posId: string, shiftId: string } => {
  if (!key || typeof key !== 'string') {
    return { posId: key, shiftId: 'all' }
  }
  let posId = key
  let shiftId = 'all'
  if (key.includes('_')) {
    const parts = key.split('_')
    const lastPart = parts[parts.length - 1]
    if (Array.isArray(shifts) && shifts.some((s) => s?.id === lastPart)) {
      shiftId = lastPart
      posId = parts.slice(0, parts.length - 1).join('_')
    }
  }
  return { posId, shiftId }
}

export const ROLE_HIERARCHY: Record<string, number> = {
  'Elder': 3,
  'MS': 2,
  'Exemplary': 1,
  '': 0
}

export const checkQualification = (
  p: Person, 
  pos: Position, 
  shiftId: string, 
  areas: Area[] | Map<string, Area>, 
  tags: Tag[], 
  personnel: Person[]
): { qualified: boolean, reason: string | null } => {
  let qualified = true
  let reason = null
  const area = areas instanceof Map ? areas.get(pos.areaId) : areas.find((a) => a.id === pos.areaId)
  if (!area) return { qualified: false, reason: 'Area not found' }
  const requiredCap = area.capability

  // Determine effective restriction
  // Position restriction takes precedence, then Area restriction
  let limitType = pos.limitType
  let limitValue = pos.limitValue

  // Legacy backward compatibility for Position
  if (!limitType && pos.teamKeyManId) {
    limitType = 'keyman'
    limitValue = pos.teamKeyManId.toString()
  }

  // Fallback to Area restriction if none on Position
  if (!limitType && area.limitType) {
    limitType = area.limitType
    limitValue = area.limitValue
  }

  // Check Assignment Constraints
  if (limitType && limitValue) {
    if (limitType === 'keyman') {
      if (p.keyManId !== parseInt(limitValue)) {
        qualified = false
        const km = personnel.find((x) => x.id === parseInt(limitValue))
        reason = `Restricted to Team: ${km ? km.name : limitValue}`
      }
    } else if (limitType === 'congregation') {
      if (p.congregation !== limitValue) {
        qualified = false
        reason = `Restricted to Congregation: ${limitValue}`
      }
    } else if (limitType === 'tag') {
      if (!p.tags || !p.tags.includes(limitValue)) {
        qualified = false
        const tObj = tags.find((x) => x.id === limitValue)
        reason = `Restricted to Tag: ${tObj ? tObj.name : limitValue}`
      }
    } else if (limitType === 'role') {
      const pLevel = ROLE_HIERARCHY[p.role || ''] || 0
      const limitLevel = ROLE_HIERARCHY[limitValue] || 0
      if (pLevel < limitLevel) {
        qualified = false
        reason = `Restricted to Role: ${limitValue} (Min)`
      }
    }
  }

  // Check Area Restrictions from Tags
  if (qualified && tags && p.tags) {
    for (let tid of p.tags) {
      const tag = tags.find((t) => t.id === tid)
      if (tag) {
        if (tag.restrictedAreas && tag.restrictedAreas.includes(pos.areaId)) {
          qualified = false
          reason = `Restricted by your Tag: ${tag.name} (Area)`
          break
        }
        if (tag.restrictedShifts) {
          if (tag.restrictedShifts.includes(shiftId)) {
            qualified = false
            reason = `Restricted by your Tag: ${tag.name} (Shift)`
            break
          }
          if (shiftId === 'all' && tag.restrictedShifts.includes('all_day')) {
            qualified = false
            reason = `Restricted by your Tag: ${tag.name} (All Day)`
            break
          }
        }
      }
    }
  }

  // Check Capability
  if (qualified) {
    if (requiredCap && (!p.caps || !p.caps.includes(requiredCap))) {
      qualified = false
      reason = `Missing Capability: ${area.name}`
    } else if (pos.keyMan && (!p.caps || !p.caps.includes('keyman'))) {
      qualified = false
      reason = `Not a Key Man`
    }
  }

  return { qualified, reason }
}

export const getCandidatesForPosition = (
  pos: Position, 
  personnel: Person[], 
  areas: Area[] | Map<string, Area>, 
  tags: Tag[]
): Person[] => {
  // Determine shiftId from pos if possible, otherwise 'all'
  // But wait, getCandidatesForPosition doesn't know the shiftId usually
  // unless it's passed.
  // In ScheduleView, it's called with (pos, personnel, areas, tags)
  // Let's assume 'all' for general qualification if shiftId is not provided.
  
  // Performance Optimization: Create map for O(1) lookups during array processing
  const areasMap = areas instanceof Map ? areas : new Map(areas.map((a) => [a.id, a]))

  return personnel.filter((p) => {
    const { qualified } = checkQualification(p, pos, 'all', areasMap, tags, personnel)
    return qualified
  })
}
