const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const raw = fs.readFileSync(path.join(root, 'templates', 'clinic-website.html'), 'utf-8')

// Escape backslashes, backticks, and ${ for safe embedding in a template literal
const escaped = raw
  .split('\\').join('\\\\')
  .split('`').join('\\`')
  .split('${').join('\\${')

const ts =
  '// AUTO-GENERATED — do not edit manually\n' +
  '// Source: templates/clinic-website.html\n' +
  '// Run: node scripts/gen-template.js to regenerate\n' +
  'export const clinicTemplate: string = `' + escaped + '`;\n'

fs.writeFileSync(path.join(root, 'lib', 'clinic-template.ts'), ts, 'utf-8')
console.log('Done. Output size:', ts.length, 'chars,', ts.split('\n').length, 'lines')
