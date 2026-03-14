export interface Shift {
  id: string
  label: string
  minutes?: number
}

export interface Area {
  id: string
  name: string
  capability?: string
  limitType?: string
  limitValue?: string
  style?: Record<string, string>
}

export interface Position {
  id: string
  name: string
  areaId: string
  type: 'rotational' | 'auditorium' | string
  keyMan?: boolean
  mirrorOf?: string
  isMirror?: boolean
  section?: string
  validShifts?: string[]
  timeNote?: string
  limitType?: string
  limitValue?: string
  teamKeyManId?: number
}

export interface Person {
  id: number
  name: string
  role?: string
  congregation?: string
  keyManId?: number | null
  caps?: string[]
  unavailable?: string[]
  tags?: string[]
  privileges?: string[]
}

export interface Assignment {
  id: number
  isAuto: boolean
}

export interface RuleOptions {
  avoidConsecutive: boolean
  anchorLimits: boolean
  auditPriority: boolean
  maxWorkPercent: number
  auditoriumRotationMode: boolean
  auditoriumCoverage: number
  unavailableSeverity: 'error' | 'warning'
  capabilitySeverity: 'error' | 'warning'
  doubleBookingSeverity: 'error' | 'warning'
}

export interface Tag {
  id: string
  name: string
  restrictedAreas?: string[]
  restrictedShifts?: string[]
}

export interface LogEntry {
  type: string
  msg: string
}
