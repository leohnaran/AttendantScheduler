import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getAssignId } from './helpers';

export async function exportToExcel({
  personnel,
  assignments,
  areas,
  positions,
  shifts,
  language,
}) {
  const workbook = new ExcelJS.Workbook();
  const personnelMap = new Map(personnel.map((p) => [p.id, p]));
  const positionsMap = new Map(positions.map((p) => [p.id, p]));

  const lookup = {
    personnelMap,
    positionsMap,
    personAssignments: new Map(),
    personAuditorium: new Map()
  };

  // Pre-compute assignment indices for O(1) lookups
  Object.keys(assignments).forEach((k) => {
    const pId = getAssignId(assignments[k]);
    if (!pId) return;

    if (k.includes('_')) {
      const parts = k.split('_');
      const shiftId = parts.pop();
      const posId = parts.join('_');
      if (!lookup.personAssignments.has(pId)) {
        lookup.personAssignments.set(pId, new Map());
      }
      lookup.personAssignments.get(pId).set(shiftId, posId);
    } else {
      lookup.personAuditorium.set(pId, k);
    }
  });

  // --- SHEET 1: FULL SCHEDULE (Original Request) ---
  const scheduleSheet = workbook.addWorksheet('Full Schedule');
  setupScheduleSheet(scheduleSheet, areas, positions, shifts, assignments, personnelMap);

  // --- SHEET 2: ASSIGNMENTS BY POSITION (New Request) ---
  const posSheet = workbook.addWorksheet('Assignments by Position');
  setupByPositionSheet(posSheet, positions, shifts, assignments, personnelMap);

  // --- SHEET 3: ASSIGNMENTS BY VOLUNTEER (New Request) ---
  const volSheet = workbook.addWorksheet('Assignments by Volunteer');
  setupByVolunteerSheet(volSheet, personnel, positions, shifts, assignments, lookup);

  // --- SHEET 4: KEY MAN REPORTS ---
  const kmSheet = workbook.addWorksheet('Key Man Reports');
  setupKeyManReportsSheet(kmSheet, personnel, positions, shifts, assignments, areas, lookup);

  // Write and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Attendant_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function setupScheduleSheet(sheet, areas, positions, shifts, assignments, personnelMap) {
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
      const rowData = [pos.name];
      if (pos.type === 'auditorium') {
        const pid = getAssignId(assignments[pos.id]);
        rowData.push(personnelMap.get(pid)?.name || '-');
        for (let i = 1; i < shifts.length; i++) rowData.push('');
      } else {
        shifts.forEach((s) => {
          const pid = getAssignId(assignments[`${pos.id}_${s.id}`]);
          rowData.push(personnelMap.get(pid)?.name || '-');
        });
      }
      const row = sheet.addRow(rowData);
      if (pos.type === 'auditorium') {
        sheet.mergeCells(row.number, 2, row.number, shifts.length + 1);
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(2).font = { italic: true, bold: true };
      }
      row.eachCell(c => { c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
    });
  });
}

function setupByPositionSheet(sheet, positions, shifts, assignments, personnelMap) {
  const header = sheet.addRow(['Position', ...shifts.map(s => s.label.toUpperCase())]);
  header.font = { bold: true };
  sheet.getColumn(1).width = 35;
  shifts.forEach((_, i) => sheet.getColumn(i + 2).width = 25);

  // Flat list of positions excluding mirrors
  positions.filter(p => !p.isMirror).forEach(pos => {
    const rowData = [pos.name];
    shifts.forEach(s => {
      let name = '-';
      if (pos.type === 'auditorium') {
        name = personnelMap.get(getAssignId(assignments[pos.id]))?.name || '-';
      } else {
        name = personnelMap.get(getAssignId(assignments[`${pos.id}_${s.id}`]))?.name || '-';
      }
      rowData.push(name);
    });
    sheet.addRow(rowData);
  });
}

function setupByVolunteerSheet(sheet, personnel, positions, shifts, assignments, lookup) {
  const header = sheet.addRow(['Name', ...shifts.map(s => s.label.toUpperCase())]);
  header.font = { bold: true };
  sheet.getColumn(1).width = 30;
  shifts.forEach((_, i) => sheet.getColumn(i + 2).width = 40);

  [...personnel].sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
    const rowData = [p.name];
    
    // Find auditorium assignment
    const audPosId = lookup.personAuditorium.get(p.id);
    const audPos = audPosId ? lookup.positionsMap.get(audPosId) : null;

    shifts.forEach(s => {
      let cellLines = [];
      
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

function setupKeyManReportsSheet(sheet, personnel, positions, shifts, assignments, areas, lookup) {
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

    sheet.addRow(['DIRECT TEAM ASSIGNMENTS']).eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; });
    sheet.mergeCells(sheet.lastRow.number, 1, sheet.lastRow.number, 5);

    sheet.addRow(['Brother', ...shifts.map(s => s.label)]).font = { bold: true, size: 10 };
    
    personnel.filter(p => p.keyManId === km.id || p.id === km.id).sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
      const rowData = [m.name + (m.id === km.id ? ' (YOU)' : '')];
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
    const myOversight = [];
    positions.filter(p => p.type === 'auditorium' && getAssignId(assignments[p.id]) === km.id).forEach(p => myOversight.push({ pos: p, shiftId: 'all' }));
    positions.filter(p => p.type === 'rotational' && !p.isMirror).forEach(p => shifts.forEach(s => { if (getAssignId(assignments[`${p.id}_${s.id}`]) === km.id) myOversight.push({ pos: p, shiftId: s.id }); }));

    if (myOversight.length > 0) {
      sheet.addRow(['AREAS OF OVERSIGHT']).eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; });
      sheet.mergeCells(sheet.lastRow.number, 1, sheet.lastRow.number, 5);
      myOversight.forEach(ov => {
        const area = areas.find(a => a.id === ov.pos.areaId);
        const shiftLabel = ov.shiftId === 'all' ? 'Full Day' : shifts.find(s => s.id === ov.shiftId)?.label;
        sheet.addRow([`${area?.name} (${shiftLabel}) - Your Post: ${ov.pos.name}`]).font = { italic: true, bold: true };
        sheet.mergeCells(sheet.lastRow.number, 1, sheet.lastRow.number, 5);
        sheet.addRow(['Post', 'Brother', 'Oversight']).font = { bold: true };
        positions.filter(p => p.areaId === area?.id && (ov.shiftId === 'all' ? p.type === 'auditorium' : p.type === 'rotational')).forEach(p => {
          const aKey = ov.shiftId === 'all' ? p.id : `${p.id}_${ov.shiftId}`;
          const person = lookup.personnelMap.get(getAssignId(assignments[aKey]));
          const r = sheet.addRow([p.name, person ? person.name : 'VACANT', lookup.personnelMap.get(person?.keyManId)?.name || '-']);
          if (!person) r.getCell(2).font = { color: { argb: 'FFFF0000' } };
        });
        sheet.addRow([]);
      });
    }
    sheet.addRow([]); sheet.addRow([]);
  });
}
