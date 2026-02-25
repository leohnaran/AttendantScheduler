// ---------------- DATA CONSTANTS (DEFAULTS) ----------------

export const DEFAULT_SHIFTS = [
  { id: 'morning', label: 'Morning (7:30-10:00)', minutes: 150 },
  { id: 'second', label: 'Second (10:00-12:30)', minutes: 150 },
  { id: 'late', label: 'Late (12:30-3:00)', minutes: 150 },
  { id: 'concluding', label: 'Concluding (3:00-5:30)', minutes: 150 },
]

export const TOTAL_PROGRAM_MINUTES = 600

export const DEFAULT_AREAS = [
  {
    id: 'auditorium',
    name: 'Auditorium',
    capability: 'auditorium',
    style: { backgroundColor: '#000000', color: '#ffffff' },
  },
  {
    id: 'upper_level',
    name: 'Upper Level',
    capability: 'upper_level',
    style: { backgroundColor: '#000000', color: '#ffffff' },
  },
  {
    id: 'stairs',
    name: 'Stairs',
    capability: 'stairs',
    style: { backgroundColor: '#e2e5e4', color: '#000000' },
  },
  {
    id: 'backstage',
    name: 'Backstage / South Auditorium',
    capability: 'backstage',
    style: { backgroundColor: '#8999f7', color: '#000000' },
  },
  {
    id: 'dining',
    name: 'Dining Room',
    capability: 'dining',
    style: { backgroundColor: '#9cfa8a', color: '#000000' },
  },
  {
    id: 'lobby',
    name: 'Lobby',
    capability: 'lobby',
    style: { backgroundColor: '#e2e5e4', color: '#000000' },
  },
  {
    id: 'exterior',
    name: 'Exterior',
    capability: 'exterior',
    style: { backgroundColor: '#fefe92', color: '#000000' },
  },
]

export const DEFAULT_POSITIONS = [
  // AUDITORIUM (Black)
  {
    id: 'pos12',
    name: 'Pos 12 (Sect A - Key Man)',
    areaId: 'auditorium',
    type: 'auditorium',
    keyMan: true,
    section: 'A',
  },
  {
    id: 'pos09',
    name: 'Pos 09 (Sect A)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'A',
  },
  {
    id: 'pos13',
    name: 'Pos 13 (Sect B - Key Man)',
    areaId: 'auditorium',
    type: 'auditorium',
    keyMan: true,
    section: 'B',
  },
  {
    id: 'pos10',
    name: 'Pos 10 (Sect B)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'B',
  },
  {
    id: 'pos14',
    name: 'Pos 14 (Sect C)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'C',
  },
  {
    id: 'pos11',
    name: 'Pos 11 (Sect C - Bapt Walk)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'C',
  },
  {
    id: 'pos18',
    name: 'Pos 18 (Sect D)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'D',
  },
  {
    id: 'pos15',
    name: 'Pos 15 (Sect D)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'D',
  },
  {
    id: 'pos16',
    name: 'Pos 16 (Sect E - Key Man)',
    areaId: 'auditorium',
    type: 'auditorium',
    keyMan: true,
    section: 'E',
  },
  {
    id: 'pos19',
    name: 'Pos 19 (Sect E)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'E',
  },
  {
    id: 'pos20',
    name: 'Pos 20 (Sect F)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'F',
  },
  {
    id: 'pos17',
    name: 'Pos 17 (Sect F)',
    areaId: 'auditorium',
    type: 'auditorium',
    section: 'F',
  },

  // UPPER LEVEL (Black)
  { id: 'pos27', name: 'Pos 27', areaId: 'upper_level', type: 'auditorium' },
  {
    id: 'pos28',
    name: 'Pos 28 (Key Man Count)',
    areaId: 'upper_level',
    type: 'auditorium',
    keyMan: true,
  },
  { id: 'pos29', name: 'Pos 29', areaId: 'upper_level', type: 'auditorium' },
  { id: 'pos30', name: 'Pos 30', areaId: 'upper_level', type: 'auditorium' },
  { id: 'pos31', name: 'Pos 31', areaId: 'upper_level', type: 'auditorium' },
  { id: 'pos32', name: 'Pos 32', areaId: 'upper_level', type: 'auditorium' },

  // STAIRS (Lobby Color)
  { id: 'pos25', name: 'Pos 25 (Stairs)', areaId: 'stairs', type: 'rotational' },
  { id: 'pos26', name: 'Pos 26 (Stairs)', areaId: 'stairs', type: 'rotational' },

  // BACKSTAGE / SOUTH AUDITORIUM (Periwinkle)
  {
    id: 'door_backstage',
    name: 'Pos 04 (Back Stage)',
    areaId: 'backstage',
    type: 'rotational',
  },
  {
    id: 'pos_05',
    name: 'Pos 05 (Chair Lift Hall)',
    areaId: 'backstage',
    type: 'rotational',
  },
  {
    id: 'pos_06',
    name: 'Pos 06 (South Aud)',
    areaId: 'backstage',
    type: 'rotational',
  },
  {
    id: 'pos_07',
    name: 'Pos 07 (Chair Lift Stairs)',
    areaId: 'backstage',
    type: 'rotational',
  },
  {
    id: 'pos_08',
    name: 'Pos 08 (South Aud)',
    areaId: 'backstage',
    type: 'rotational',
  },

  // DINING ROOM (Green)
  {
    id: 'dining_01_a',
    name: 'Pos 01 (South Dining) A',
    areaId: 'dining',
    type: 'rotational',
  },
  {
    id: 'dining_01_b',
    name: 'Pos 01 (South Dining) B',
    areaId: 'dining',
    type: 'rotational',
  },
  {
    id: 'dining_03_a',
    name: 'Pos 03 (North Dining) A',
    areaId: 'dining',
    type: 'rotational',
  },
  {
    id: 'dining_03_b',
    name: 'Pos 03 (North Dining) B',
    areaId: 'dining',
    type: 'rotational',
  },
  {
    id: 'dining_02',
    name: 'Pos 02 (7am-8am Only)',
    areaId: 'dining',
    type: 'rotational',
    validShifts: ['morning'],
  },

  // LOBBY (Grey)
  {
    id: 'lobby_km',
    name: 'Lobby Key Man',
    areaId: 'lobby',
    type: 'rotational',
    keyMan: true,
  },
  {
    id: 'lobby_1',
    name: 'Lobby Attendant 1',
    areaId: 'lobby',
    type: 'rotational',
  },
  {
    id: 'lobby_2',
    name: 'Lobby Attendant 2',
    areaId: 'lobby',
    type: 'rotational',
  },
  {
    id: 'lobby_3',
    name: 'Lobby Attendant 3',
    areaId: 'lobby',
    type: 'rotational',
  },
  {
    id: 'door_north',
    name: 'North Exit Door',
    areaId: 'lobby',
    type: 'rotational',
  },

  // MIRRORS
  {
    id: 'lobby_ext_1',
    name: 'Lobby Security (Ext Walk 1)',
    areaId: 'lobby',
    type: 'rotational',
    isMirror: true,
  },
  {
    id: 'lobby_ext_2',
    name: 'Lobby Security (Ext Walk 2)',
    areaId: 'lobby',
    type: 'rotational',
    isMirror: true,
  },

  // EXTERIOR (Yellow)
  {
    id: 'ext_walk_1',
    name: 'Exterior Walk 1',
    areaId: 'exterior',
    type: 'rotational',
  },
  {
    id: 'ext_walk_2',
    name: 'Exterior Walk 2',
    areaId: 'exterior',
    type: 'rotational',
  },
]

export const INITIAL_ROSTER = []
