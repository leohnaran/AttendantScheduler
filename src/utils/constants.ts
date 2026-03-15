import { Shift, Area, Position, Person } from '../types/models'

// ---------------- DATA CONSTANTS (DEFAULTS) ----------------

export const DEFAULT_SHIFTS: Shift[] = [
  {
    id: "morning",
    label: "Morning (7:30-10:00)",
    minutes: 150
  },
  {
    id: "second",
    label: "Second (10:00-12:30)",
    minutes: 150
  },
  {
    id: "late",
    label: "Late (12:30-3:00)",
    minutes: 150
  },
  {
    id: "concluding",
    label: "Concluding (3:00-5:30)",
    minutes: 150
  }
]

export const TOTAL_PROGRAM_MINUTES = 600

export const DEFAULT_AREAS: Area[] = [
  {
    id: "auditorium",
    name: "Auditorium",
    capability: "auditorium",
    style: {
      backgroundColor: "#000000",
      color: "#ffffff"
    },
    limitType: "",
    limitValue: ""
  },
  {
    id: "upper_level",
    name: "Upper Level",
    capability: "upper_level",
    style: {
      backgroundColor: "#000000",
      color: "#ffffff"
    }
  },
  {
    id: "stairs",
    name: "Stairs",
    capability: "stairs",
    style: {
      backgroundColor: "#e2e5e4",
      color: "#000000"
    }
  },
  {
    id: "backstage",
    name: "Backstage / South Auditorium",
    capability: "backstage",
    style: {
      backgroundColor: "#8999f7",
      color: "#000000"
    }
  },
  {
    id: "dining",
    name: "Dining Room",
    capability: "dining",
    style: {
      backgroundColor: "#9cfa8a",
      color: "#000000"
    }
  },
  {
    id: "lobby",
    name: "Lobby",
    capability: "lobby",
    style: {
      backgroundColor: "#e2e5e4",
      color: "#000000"
    }
  },
  {
    id: "exterior",
    name: "Exterior",
    capability: "exterior",
    style: {
      backgroundColor: "#fefe92",
      color: "#000000"
    }
  },
  {
    id: "area_1772310040895",
    name: "Baptism",
    capability: "baptism",
    style: {
      backgroundColor: "#ffffff",
      color: "#000000"
    },
    limitType: "",
    limitValue: ""
  }
]

export const DEFAULT_POSITIONS: Position[] = [
  {
    id: "pos12",
    name: "Pos 12 (Sect A - Key Man Count)",
    areaId: "auditorium",
    type: "auditorium",
    keyMan: true,
    section: "A"
  },
  {
    id: "pos09",
    name: "Pos 09 (Sect A)",
    areaId: "auditorium",
    type: "auditorium",
    section: "A"
  },
  {
    id: "pos13",
    name: "Pos 13 (Sect B - Key Man)",
    areaId: "auditorium",
    type: "auditorium",
    keyMan: true,
    section: "B",
    timeNote: "Baptism Walk",
    limitType: "role",
    limitValue: "MS"
  },
  {
    id: "pos10",
    name: "Pos 10 (Sect B)",
    areaId: "auditorium",
    type: "auditorium",
    section: "B",
    timeNote: "Baptism Walk",
    limitType: "role",
    limitValue: "Elder"
  },
  {
    id: "pos14",
    name: "Pos 14 (Sect C)",
    areaId: "auditorium",
    type: "auditorium",
    section: "C",
    limitType: "",
    limitValue: "",
    timeNote: ""
  },
  {
    id: "pos11",
    name: "Pos 11 (Sect C)",
    areaId: "auditorium",
    type: "auditorium",
    section: "C",
    limitType: "",
    limitValue: "",
    timeNote: ""
  },
  {
    id: "pos18",
    name: "Pos 18 (Sect D)",
    areaId: "auditorium",
    type: "auditorium",
    section: "D"
  },
  {
    id: "pos15",
    name: "Pos 15 (Sect D)",
    areaId: "auditorium",
    type: "auditorium",
    section: "D"
  },
  {
    id: "pos16",
    name: "Pos 16 (Sect E - Key Man)",
    areaId: "auditorium",
    type: "auditorium",
    keyMan: true,
    section: "E"
  },
  {
    id: "pos19",
    name: "Pos 19 (Sect E)",
    areaId: "auditorium",
    type: "auditorium",
    section: "E"
  },
  {
    id: "pos20",
    name: "Pos 20 (Sect F)",
    areaId: "auditorium",
    type: "auditorium",
    section: "F"
  },
  {
    id: "pos17",
    name: "Pos 17 (Sect F)",
    areaId: "auditorium",
    type: "auditorium",
    section: "F"
  },
  {
    id: "pos27",
    name: "Pos 27",
    areaId: "upper_level",
    type: "auditorium"
  },
  {
    id: "pos28",
    name: "Pos 28 (Key Man Count)",
    areaId: "upper_level",
    type: "auditorium",
    keyMan: true
  },
  {
    id: "pos29",
    name: "Pos 29",
    areaId: "upper_level",
    type: "auditorium"
  },
  {
    id: "pos30",
    name: "Pos 30",
    areaId: "upper_level",
    type: "auditorium"
  },
  {
    id: "pos31",
    name: "Pos 31",
    areaId: "upper_level",
    type: "auditorium"
  },
  {
    id: "pos32",
    name: "Pos 32",
    areaId: "upper_level",
    type: "auditorium"
  },
  {
    id: "pos25",
    name: "Pos 25 (Stairs)",
    areaId: "stairs",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "pos26",
    name: "Pos 26 (Stairs)",
    areaId: "stairs",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "door_backstage",
    name: "Pos 04 (Back Stage)",
    areaId: "backstage",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "pos_05",
    name: "Pos 05 (Chair Lift Hall)",
    areaId: "backstage",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "pos_06",
    name: "Pos 06 (South Aud)",
    areaId: "backstage",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "pos_07",
    name: "Pos 07 (Chair Lift Stairs)",
    areaId: "backstage",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "pos_08",
    name: "Pos 08 (South Aud)",
    areaId: "backstage",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "dining_01_a",
    name: "Pos 01 (South Dining) A",
    areaId: "dining",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "dining_01_b",
    name: "Pos 01 (South Dining) B",
    areaId: "dining",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "dining_03_a",
    name: "Pos 03 (North Dining) A",
    areaId: "dining",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "dining_03_b",
    name: "Pos 03 (North Dining) B",
    areaId: "dining",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "dining_02",
    name: "Pos 02 (7am-8am Only)",
    areaId: "dining",
    type: "rotational",
    validShifts: [
      "morning"
    ]
  },
  {
    id: "lobby_km",
    name: "Lobby Key Man",
    areaId: "lobby",
    type: "rotational",
    keyMan: true,
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "lobby_1",
    name: "Lobby Attendant 1",
    areaId: "lobby",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "lobby_2",
    name: "Lobby Attendant 2",
    areaId: "lobby",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "lobby_3",
    name: "Lobby Attendant 3",
    areaId: "lobby",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "door_north",
    name: "North Exit Door",
    areaId: "lobby",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "lobby_ext_1",
    name: "Lobby Security (Ext Walk 1)",
    areaId: "lobby",
    type: "rotational",
    isMirror: true,
    mirrorOf: "ext_walk_1",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "lobby_ext_2",
    name: "Lobby Security (Ext Walk 2)",
    areaId: "lobby",
    type: "rotational",
    isMirror: true,
    mirrorOf: "ext_walk_2",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "ext_walk_1",
    name: "Exterior Walk 1",
    areaId: "exterior",
    type: "rotational",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ],
    timeNote: "10:15 AM. 11:30 AM, 2:15 PM, 4:15 PM"
  },
  {
    id: "ext_walk_2",
    name: "Exterior Walk 2",
    areaId: "exterior",
    type: "rotational",
    timeNote: "10:15 AM. 11:30 AM, 2:15 PM, 4:15 PM",
    validShifts: [
      "morning",
      "second",
      "late",
      "concluding"
    ]
  },
  {
    id: "pos_1772310684525",
    name: "Baptism (Stage - Entrance)",
    areaId: "auditorium",
    type: "rotational",
    limitType: "role",
    limitValue: "Elder",
    section: "",
    timeNote: "During Baptism",
    validShifts: [
      "second",
      "morning"
    ]
  },
  {
    id: "pos_1772310774496",
    name: "Baptism (Stage - Exit)",
    areaId: "auditorium",
    type: "rotational",
    limitType: "role",
    limitValue: "MS",
    section: "",
    timeNote: "During Baptism",
    validShifts: [
      "second"
    ]
  },
  {
    id: "pos_1772311120133",
    name: "Baptism (In Front of Stage Floor -Center)",
    areaId: "auditorium",
    type: "rotational",
    limitType: "role",
    limitValue: "Elder",
    section: "",
    timeNote: "During Baptism",
    validShifts: [
      "second"
    ]
  },
  {
    id: "pos_1772311209274",
    name: "Baptism (In Front of Stage Floor - Left)",
    areaId: "auditorium",
    type: "rotational",
    limitType: "",
    limitValue: "",
    section: "",
    timeNote: "During Baptism",
    validShifts: [
      "second"
    ]
  },
  {
    id: "pos_1772311298475",
    name: "Baptism (In Front of Stage Floor - Right)",
    areaId: "auditorium",
    type: "rotational",
    limitType: "",
    limitValue: "",
    section: "",
    timeNote: "During Baptism",
    validShifts: [
      "second"
    ]
  }
]

export const INITIAL_ROSTER: Person[] = []
