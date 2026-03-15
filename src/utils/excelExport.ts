import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getAssignId } from './helpers';
import { Person, Assignment, Area, Position, Shift } from '../types/models';

interface ExportToExcelProps {
  personnel: Person[];
  assignments: Record<string, Assignment | null>;
  areas: Area[];
  positions: Position[];
  shifts: Shift[];
  language: string;
}

interface ExportLookup {
  personnelMap: Map<number, Person>;
  positionsMap: Map<string, Position>;
  personAssignments: Map<number, Map<string, string>>;
  personAuditorium: Map<number, string>;
}


function setupScheduleSheet(
  sheet: any, 
  areas: Area[], 
  positions: Position[], 
  shifts: Shift[], 
  assignments: Record<string, Assignment | null>, 
  personnelMap: Map<number, Person>
) {
  const headerRow = ['Position', ...shifts.map((s) => s.label)];
  const header = sheet.addRow(headerRow);
  header.font = { bold: true, size: 12 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  sheet.getColumn(1).width = 30;
  shifts.forEach((_, i) => { sheet.getColumn(i + 2).width = 25; });

  areas.forEach((area) => {
    const areaRow = sheet.addRow([area.name.toUpperCase()]);
    sheet.mergeCells(areaRow.number, 1, areaRow.number, shifts.length + 1);
    const bgColor = area.style?.backgroundColor?.replace('#', '') || 'FF000000';
    const textColor = area.style?.color?.replace('#', '') || 'FFFFFFFF';
    areaRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor.toUpperCase() } };
    areaRow.getCell(1).font = { bold: true, color: { argb: 'FF' + textColor.toUpperCase() } };
    areaRow.getCell(1).alignment = { horizontal: 'center' };

    positions.filter((p) => p.areaId === area.id).forEach((pos) => {
      if (pos.isMirror) return;
      const rowData: string[] = [pos.name];
      if (pos.type === 'auditorium') {
        const pid = getAssignId(assignments[pos.id]);
        rowData.push(pid ? (personnelMap.get(pid)?.name || '-') : '-');
        for (let i = 1; i < shifts.length; i++) rowData.push('');
      } else {
        shifts.forEach((s) => {
          const pid = getAssignId(assignments[`${pos.id}_${s.id}`]);
          rowData.push(pid ? (personnelMap.get(pid)?.name || '-') : '-');
        });
      }
      const row = sheet.addRow(rowData);
      if (pos.type === 'auditorium') {
        sheet.mergeCells(row.number, 2, row.number, shifts.length + 1);
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(2).font = { italic: true, bold: true };
      }
      row.eachCell((c: any) => { c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
    });
  });
}

function setupByPositionSheet(
  sheet: any, 
  positions: Position[], 
  shifts: Shift[], 
  assignments: Record<string, Assignment | null>, 
  personnelMap: Map<number, Person>
) {
  const header = sheet.addRow(['Position', ...shifts.map(s => s.label.toUpperCase())]);
  header.font = { bold: true };
  sheet.getColumn(1).width = 35;
  shifts.forEach((_, i) => sheet.getColumn(i + 2).width = 25);

  // Flat list of positions excluding mirrors
  positions.filter(p => !p.isMirror).forEach(pos => {
    const rowData: string[] = [pos.name];
    shifts.forEach(s => {
      let name = '-';
      if (pos.type === 'auditorium') {
        const pId = getAssignId(assignments[pos.id]);
        name = pId ? (personnelMap.get(pId)?.name || '-') : '-';
      } else {
        const pId = getAssignId(assignments[`${pos.id}_${s.id}`]);
        name = pId ? (personnelMap.get(pId)?.name || '-') : '-';
      }
      rowData.push(name);
    });
    sheet.addRow(rowData);
  });
}

function setupByVolunteerSheet(
  sheet: any, 
  personnel: Person[], 
  lookup: ExportLookup
) {
  const shifts = Array.from(lookup.positionsMap.values()).reduce((acc, p) => {
      // Small hack to get shifts from lookups if not passed
      return acc;
  }, [] as Shift[]); // Actually let's just use the lookup or fix the signature
  
  // Refined signature to avoid gettingacc
  console.log(shifts);
}

// Rewriting to be simpler and avoid the shift param issues
function setupByVolunteerSheetFixed(
  sheet: any, 
  personnel: Person[], 
  lookup: ExportLookup,
  shifts: Shift[]
) {
  const header = sheet.addRow(['Name', ...shifts.map(s => s.label.toUpperCase())]);
  header.font = { bold: true };
  sheet.getColumn(1).width = 30;
  shifts.forEach((_, i) => sheet.getColumn(i + 2).width = 40);

  [...personnel].sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
    const rowData: string[] = [p.name];
    
    // Find auditorium assignment
    const audPosId = lookup.personAuditorium.get(p.id);
    const audPos = audPosId ? lookup.positionsMap.get(audPosId) : null;

    shifts.forEach(s => {
      let cellLines: string[] = [];
      
      // If primary exists, it goes on every shift
      if (audPos) {
        cellLines.push(cellLines.length === 0 && lookup.personAssignments.has(p.id)
          ? `Primary: ${audPos.name}` 
          : audPos.name);
      }

      // Find rotational assignments for this shift
      const pAssigns = lookup.personAssignments.get(p.id);
      const posId = pAssigns?.get(s.id);
      const rotAssignments = posId ? [lookup.positionsMap.get(posId)?.name || 'Unknown'] : [];

      if (rotAssignments.length > 0) {
        if (audPos) {
          // If we already have primary, prefix these as Additional
          rotAssignments.forEach(name => cellLines.push(`Additional: ${name} (${s.label})`));
        } else {
          // Just list them with shift labels as per example
          rotAssignments.forEach(name => cellLines.push(`${name} (${s.label})`));
        }
      }

      rowData.push(cellLines.join('\n'));
    });

    const row = sheet.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.alignment = { wrapText: true, vertical: 'top' };
  });
}

// Updating the main call to use the fixed one
export async function exportToExcel({
  personnel,
  assignments,
  areas,
  positions,
  shifts,
}: Omit<ExportToExcelProps, 'language'>) {
  const workbook = new ExcelJS.Workbook();
  const personnelMap = new Map<number, Person>(personnel.map((p) => [p.id, p]));
  const positionsMap = new Map<string, Position>(positions.map((p) => [p.id, p]));

  const lookup: ExportLookup = {
    personnelMap,
    positionsMap,
    personAssignments: new Map(),
    personAuditorium: new Map()
  };

  Object.keys(assignments).forEach((k) => {
    const pId = getAssignId(assignments[k]);
    if (!pId) return;

    if (k.includes('_')) {
      const parts = k.split('_');
      const shiftId = parts.pop()!;
      const posId = parts.join('_');
      if (!lookup.personAssignments.has(pId)) {
        lookup.personAssignments.set(pId, new Map<string, string>());
      }
      lookup.personAssignments.get(pId)!.set(shiftId, posId);
    } else {
      lookup.personAuditorium.set(pId, k);
    }
  });

  setupScheduleSheet(workbook.addWorksheet('Full Schedule'), areas, positions, shifts, assignments, personnelMap);
  setupByPositionSheet(workbook.addWorksheet('Assignments by Position'), positions, shifts, assignments, personnelMap);
  setupByVolunteerSheetFixed(workbook.addWorksheet('Assignments by Volunteer'), personnel, lookup, shifts);
  setupKeyManReportsSheet(workbook.addWorksheet('Key Man Reports'), personnel, positions, shifts, assignments, areas, lookup);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Attendant_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function setupKeyManReportsSheet(
  sheet: any, 
  personnel: Person[], 
  positions: Position[], 
  shifts: Shift[], 
  assignments: Record<string, Assignment | null>, 
  areas: Area[], 
  lookup: ExportLookup
) {
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 30;
  sheet.getColumn(4).width = 30;
  sheet.getColumn(5).width = 30;

  const keyMen = personnel.filter(p => p.caps?.includes('keyman')).sort((a, b) => a.name.localeCompare(b.name));

  keyMen.forEach(km => {
    const title = sheet.addRow([`${km.name.toUpperCase()} - KEY MAN REPORT`]);
    sheet.mergeCells(title.number, 1, title.number, 5);
    title.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
    title.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    const directTitle = sheet.addRow(['DIRECT TEAM ASSIGNMENTS']);
    directTitle.eachCell((c: any) => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; });
    sheet.mergeCells(directTitle.number, 1, directTitle.number, 5);

    sheet.addRow(['Brother', ...shifts.map(s => s.label)]).font = { bold: true, size: 10 };
    
    personnel.filter(p => p.keyManId === km.id || p.id === km.id).sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
      const rowData: string[] = [m.name + (m.id === km.id ? ' (YOU)' : '')];
      shifts.forEach(s => {
        const pAssigns = lookup.personAssignments.get(m.id);
        const posId = pAssigns?.get(s.id);

        if (posId) {
          const pos = lookup.positionsMap.get(posId);
          rowData.push(pos ? pos.name : 'Assigned');
        } else {
          const audPosId = lookup.personAuditorium.get(m.id);
          const audPos = audPosId ? lookup.positionsMap.get(audPosId) : null;
          rowData.push(audPos ? audPos.name : '-');
        }
      });
      const r = sheet.addRow(rowData);
      if (m.id === km.id) r.getCell(1).font = { bold: true, color: { argb: 'FF2563EB' } };
    });

    sheet.addRow([]);
    const myOversight: { pos: Position; shiftId: string }[] = [];
    positions.filter(p => p.type === 'auditorium' && getAssignId(assignments[p.id]) === km.id).forEach(p => myOversight.push({ pos: p, shiftId: 'all' }));
    positions.filter(p => p.type === 'rotational' && !p.isMirror).forEach(p => shifts.forEach(s => { if (getAssignId(assignments[`${p.id}_${s.id}`]) === km.id) myOversight.push({ pos: p, shiftId: s.id }); }));

    if (myOversight.length > 0) {
      const oversightTitle = sheet.addRow(['AREAS OF OVERSIGHT']);
      oversightTitle.eachCell((c: any) => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; });
      sheet.mergeCells(oversightTitle.number, 1, oversightTitle.number, 5);
      
      myOversight.forEach(ov => {
        const area = areas.find(a => a.id === ov.pos.areaId);
        const shiftLabel = ov.shiftId === 'all' ? 'Full Day' : shifts.find(s => s.id === ov.shiftId)?.label;
        const oversightRow = sheet.addRow([`${area?.name} (${shiftLabel}) - Your Post: ${ov.pos.name}`]);
        oversightRow.font = { italic: true, bold: true };
        sheet.mergeCells(oversightRow.number, 1, oversightRow.number, 5);
        
        sheet.addRow(['Post', 'Brother', 'Oversight']).font = { bold: true };
        positions.filter(p => p.areaId === area?.id && (ov.shiftId === 'all' ? p.type === 'auditorium' : p.type === 'rotational')).forEach(p => {
          const aKey = ov.shiftId === 'all' ? p.id : `${p.id}_${ov.shiftId}`;
          const pId = getAssignId(assignments[aKey]);
          const person = pId ? lookup.personnelMap.get(pId) : undefined;
          const keyManName = person?.keyManId ? (lookup.personnelMap.get(person.keyManId)?.name || '-') : '-';
          
          const r = sheet.addRow([p.name, person ? person.name : 'VACANT', keyManName]);
          if (!person) r.getCell(2).font = { color: { argb: 'FFFF0000' } };
        });
        sheet.addRow([]);
      });
    }
    sheet.addRow([]); sheet.addRow([]);
  });
}

