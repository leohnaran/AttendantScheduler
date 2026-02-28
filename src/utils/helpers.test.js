import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCSV } from './helpers.js'

test('parseCSV tests', async (t) => {
  await t.test('parses simple comma separated values', () => {
    const input = 'a,b,c\n1,2,3'
    const expected = [['a', 'b', 'c'], ['1', '2', '3']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles fields with spaces', () => {
    const input = 'first name,last name\njohn,doe'
    const expected = [['first name', 'last name'], ['john', 'doe']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles different line endings (CRLF and CR)', () => {
    const input = 'a,b\r\n1,2\rc,d'
    const expected = [['a', 'b'], ['1', '2'], ['c', 'd']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles quotes enclosing fields', () => {
    const input = 'a,"b,c",d\n1,"2,3",4'
    const expected = [['a', 'b,c', 'd'], ['1', '2,3', '4']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles quotes containing newlines', () => {
    const input = 'a,"b\nc",d\n1,2,3'
    const expected = [['a', 'b\nc', 'd'], ['1', '2', '3']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles escaped quotes within quotes', () => {
    const input = 'a,"b ""c"" d",e\n1,2,3'
    const expected = [['a', 'b "c" d', 'e'], ['1', '2', '3']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles empty input', () => {
    const input = ''
    const expected = []
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles single value', () => {
    const input = 'a'
    const expected = [['a']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles trailing newline', () => {
    const input = 'a,b,c\n'
    const expected = [['a', 'b', 'c']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles empty lines between rows', () => {
    const input = 'a,b,c\n\n1,2,3'
    const expected = [['a', 'b', 'c'], [''], ['1', '2', '3']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles quotes at the end of input', () => {
    const input = 'a,b,"c"'
    const expected = [['a', 'b', 'c']]
    assert.deepEqual(parseCSV(input), expected)
  })

  await t.test('handles complex realistic input', () => {
    const input = 'Name,Role,"Congregation, City",Tags\nJohn Doe,Elder,"New York, NY",Tag1\nJane Smith,MS,"Los Angeles, CA","Tag1,Tag2"'
    const expected = [
      ['Name', 'Role', 'Congregation, City', 'Tags'],
      ['John Doe', 'Elder', 'New York, NY', 'Tag1'],
      ['Jane Smith', 'MS', 'Los Angeles, CA', 'Tag1,Tag2']
    ]
    assert.deepEqual(parseCSV(input), expected)
  })
})
