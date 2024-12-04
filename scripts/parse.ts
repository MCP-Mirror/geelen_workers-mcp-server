import * as fs from 'node:fs'
import tsBlankSpace from 'ts-blank-space'
import jsdoc from 'jsdoc-api'

const source = tsBlankSpace(fs.readFileSync(process.argv[2], 'utf8'))

const data = (await jsdoc.explain({ source: source, cache: true })) as Array<{
  comment: string
  meta: {
    range: [number, number]
    filename: string
    lineno: number
    columno: number
    path: string
    code: {
      id: string
      name: string
      type: 'FunctionExpression' | 'ClassDeclaration' | 'MethodDefinition'
      paramnames: string[]
    }
  }
  undocumented: boolean
  classdesc?: string
  description: string
  name: string
  longname: string
  kind: 'function' | 'member' | 'class'
  memberof?: string
  scope: 'global' | 'static' | 'instance'
  async?: boolean
  params?: Array<{ type: { names: string[] }; description: string; name: string; optional?: boolean }>
  returns?: Array<{ type: { names: string[] }; description: string }>
  examples?: string[]
}>
// console.log(...data)

type Param = { type: string; name: string; description: string; optional?: boolean }
type Returns = { type: string; description: string } | null
type EntrypointDoc = {
  description: string | null
  exported_as: string | null
  methods: Array<{
    name: string
    description: string
    params: Param[]
    returns: Returns
    examples?: string[]
  }>
}

const exported_classes: Record<string, EntrypointDoc> = {}
for (const point of data) {
  if (point.kind === 'class' && point.meta?.code?.type === 'ClassDeclaration') {
    let exported_as = null
    let name = point.meta.code.name
    if (name.startsWith('exports.')) {
      name = name.slice('exports.'.length)
      exported_as = name
    }
    // console.dir(point, { depth: null })
    exported_classes[name] ??= {
      exported_as,
      description: point.classdesc! || null,
      methods: [],
    }
  }
}

for (const point of data) {
  if (point.kind === 'function' && point.meta?.code?.type === 'MethodDefinition' && point.memberof) {
    const ex = exported_classes[point.memberof]
    if (ex) {
      let returns: Returns = null
      if (point.returns) {
        const [ret, ...rest] = point.returns
        if (!ret || rest.length > 0 || ret.type.names.length !== 1) {
          console.log(`WARN: unexpected returns value for ${JSON.stringify(point)}`)
        }
        returns = { description: ret.description, type: ret.type.names[0] }
      }

      const params: Param[] = (point.params || [])
        .map(({ description, type, name, optional }) => {
          if (type.names.length !== 1) {
            console.log(`WARN: unexpected params value for ${JSON.stringify(point)}`)
            return null
          }

          return { description, name, type: type.names[0], optional }
        })
        .filter((p) => p !== null)

      // console.dir(point, { depth: null })
      ex.methods.push({
        name: point.name,
        description: point.description,
        params,
        returns,
        ...(point.examples ? { examples: point.examples } : {}),
      })
    } else {
      throw new Error(
        `Missing memberof ${point.memberof}. Got ${JSON.stringify(point)}, had ${JSON.stringify(Object.keys(exported_classes))}`,
      )
    }
  }
}

for (const point of data) {
  if (point.kind === 'member' && point.scope === 'global' && point.meta?.code?.name?.startsWith('exports.')) {
    let name = point.name
    const renamed = source.substring(...point.meta.range).match(/(\w+) as \w+/)
    if (renamed) {
      name = renamed[1]
    }
    if (exported_classes[name]) {
      exported_classes[name].exported_as = point.name
    } else {
      console.log(`WARN: couldn't find which class to export for ${JSON.stringify(point)}`)
    }
  }
}

console.log(JSON.stringify(exported_classes, null, 2))
