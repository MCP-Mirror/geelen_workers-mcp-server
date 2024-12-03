import * as fs from 'node:fs'
import tsBlankSpace from 'ts-blank-space'
import jsdoc from 'jsdoc-api'

const source = tsBlankSpace(fs.readFileSync('src/index.ts', 'utf8'))

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
  params?: Array<{ type: { names: string[] }; description: string; name: string }>
  returns?: Array<{ type: { names: string[] }; description: string }>
}>
// console.log(...data)

type Param = { type: string; name: string; description: string }
type Returns = { type: string; description: string } | null
type EntrypointDoc = {
  description: string
  methods: Array<{
    name: string
    description: string
    params: Param[]
    returns: Returns
  }>
}

const exported_classes: Record<string, EntrypointDoc> = {}
for (const point of data) {
  console.dir(point, { depth: null })
  const { kind, name, description, classdesc, memberof, meta: { code } = {} } = point

  if (kind === 'class' && code?.type === 'ClassDeclaration' && code.name.startsWith('exports.')) {
    const name = code.name.slice('exports.'.length)
    // console.log({ name })

    exported_classes[name] = {
      description: classdesc!,
      methods: [],
    }
  }

  if (kind === 'function' && code?.type === 'MethodDefinition' && memberof) {
    const ex = exported_classes[memberof]
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
        .map(({ description, type, name }) => {
          if (type.names.length !== 1) {
            console.log(`WARN: unexpected params value for ${JSON.stringify(point)}`)
            return null
          }

          return { description, name, type: type.names[0] }
        })
        .filter((p) => p !== null)

      ex.methods.push({
        name,
        description,
        params,
        returns,
      })
    } else {
      throw new Error(`Missing memberof ${memberof}. Got ${JSON.stringify(point)}, had ${JSON.stringify(Object.keys(exported_classes))}`)
    }
  }
}

console.dir(exported_classes, { depth: null })
