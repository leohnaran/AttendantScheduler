import { t } from '../i18n/translations'

export const getAssignId = (val) => {
  if (!val) return null
  if (typeof val === 'object') return parseInt(val.id)
  return parseInt(val)
}

export const isAutoAssigned = (val) => {
  if (val && typeof val === 'object') return val.isAuto === true
  return false
}

export const getKeyManName = (personnel, id) => {
  const km = personnel.find((p) => p.id === id)
  return km ? km.name : ''
}

export const getLastName = (fullName) => {
  if (!fullName) return ''
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1].toLowerCase()
}

export const getHeatColor = (count) => {
  if (count === 0) return 'bg-green-500'
  if (count === 1) return 'bg-yellow-500'
  if (count === 2) return 'bg-orange-500'
  return 'bg-red-500'
}

export const getHeatBg = (count) => {
  if (count === 0)
    return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (count === 1)
    return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  if (count === 2)
    return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

export const parseCSV = (text) => {
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
export const getCandidatesForPosition = (pos, personnel, areas, tags) => {
  const area = areas.find((a) => a.id === pos.areaId)
  if (!area) return []
  const requiredCap = area.capability

  // Determine effective restriction
  // Position restriction takes precedence, then Area restriction
  let limitType = pos.limitType
  let limitValue = pos.limitValue

  // Legacy backward compatibility for Position
  if (!limitType && pos.teamKeyManId) {
    limitType = 'keyman'
    limitValue = pos.teamKeyManId
  }

  // Fallback to Area restriction if none on Position
  if (!limitType && area.limitType) {
    limitType = area.limitType
    limitValue = area.limitValue
  }

  return personnel.filter((p) => {
    if (!p.caps || !p.caps.includes(requiredCap)) return false
    if (pos.keyMan && (!p.caps || !p.caps.includes('keyman'))) return false

    // Check Area Restrictions from Tags
    if (tags && p.tags) {
      for (let tid of p.tags) {
        const tag = tags.find((t) => t.id === tid)
        if (
          tag &&
          tag.restrictedAreas &&
          tag.restrictedAreas.includes(pos.areaId)
        )
          return false
      }
    }

    // Check Assignment Constraints
    if (limitType && limitValue) {
      if (limitType === 'keyman') {
        if (p.keyManId !== parseInt(limitValue)) return false
      } else if (limitType === 'congregation') {
        if (p.congregation !== limitValue) return false
      } else if (limitType === 'tag') {
        if (!p.tags || !p.tags.includes(limitValue)) return false
      } else if (limitType === 'role') {
        if (p.role !== limitValue) return false
      }
    }

    return true
  })
}
