import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const modalPath = path.resolve(
  root,
  'src/components/modals/VulnerableRegistrationModal.tsx',
)

if (!fs.existsSync(modalPath)) {
  throw new Error(
    `Registration modal not found: ${modalPath}`,
  )
}

let source = fs.readFileSync(
  modalPath,
  'utf8',
)

const importLine =
  "import { SAN_POLICARPO_BARANGAYS } from '@/lib/san-policarpo-geography'"

if (!source.includes(importLine)) {
  const anchor =
    "import { cn } from '@/lib/utils'"

  if (!source.includes(anchor)) {
    throw new Error(
      'Could not find the modal import anchor.',
    )
  }

  source = source.replace(
    anchor,
    `${anchor}\n${importLine}`,
  )
}

const barangayConstant =
  /const BARANGAYS = \[[\s\S]*?\n\]/

if (!barangayConstant.test(source)) {
  if (
    !source.includes(
      'const BARANGAYS = SAN_POLICARPO_BARANGAYS',
    )
  ) {
    throw new Error(
      'Could not locate the BARANGAYS constant.',
    )
  }
} else {
  source = source.replace(
    barangayConstant,
    'const BARANGAYS = SAN_POLICARPO_BARANGAYS',
  )
}

source = source.replace(
  /<InputBlock label="Municipality \/ City">\s*<Input\s*value=\{form\.municipality\}\s*onChange=\{\(e\) => updateField\('municipality', e\.target\.value\)\}\s*placeholder="Municipality \/ City"\s*\/>\s*<\/InputBlock>/,
  `<InputBlock label="Municipality / City">
            <Input
              value="San Policarpo"
              readOnly
              aria-readonly="true"
              className="bg-slate-50 text-slate-700"
            />
          </InputBlock>`,
)

source = source.replace(
  /<InputBlock label="Province">\s*<Input\s*value=\{form\.province\}\s*onChange=\{\(e\) => updateField\('province', e\.target\.value\)\}\s*placeholder="Province"\s*\/>\s*<\/InputBlock>/,
  `<InputBlock label="Province">
            <Input
              value="Eastern Samar"
              readOnly
              aria-readonly="true"
              className="bg-slate-50 text-slate-700"
            />
          </InputBlock>`,
)

source = source.replace(
  'Click the map or drag the marker to auto-fill the address. You can still edit the address fields manually.',
  'Click the map or drag the marker to verify the location. Only points identified as San Policarpo will update the form. House, street/sitio, and barangay may still be corrected manually.',
)

fs.writeFileSync(
  modalPath,
  source,
  'utf8',
)

console.log(
  'Updated the vulnerable registration modal with the official barangay list and locked municipality/province fields.',
)
