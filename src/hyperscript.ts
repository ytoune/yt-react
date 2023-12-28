import { jsxs } from './jsx-runtime/jsx'

export const h = (ty: any, ...args: any[]) => {
  // @ts-expect-error: ignore
  const { type, id, class: className } = parseClass(ty)
  // @ts-expect-error: ignore
  const { key, ...props } =
    'object' === typeof args[0] && args[0] ? args.shift() : {}
  const children = 2 <= args.length ? args : args[0]
  if (id) props.id = id
  if (className) props.className = className
  if (null != children) props.children = children
  return jsxs(type, props, key)
}

const split = (string: string, re: RegExp) => {
  let tmp = string
  const ret: string[] = []
  for (let m: RegExpMatchArray | null; (m = tmp.match(re)); ) {
    tmp = tmp.replace(re, '')
    ret.push(m[1]!)
  }
  if (tmp) ret.push(tmp)
  return ret
}

const parseClass = (string: any) => {
  if ('string' !== typeof string) return { type: string }
  const m = split(string, /^([.#]?[^.#]+)/)
  const type = m[0] ?? ''
  let id: string | undefined
  const classes: string[] = []
  for (const c of m.slice(1)) {
    if (!c) continue
    if ('#' === c[0]) id = c.substring(1)
    else if ('.' === c[0]) classes.push(c.substring(1))
  }
  const ret: { type: string; id?: string; class?: string } = { type }
  if (id) ret.id = id
  if (classes.length) ret.class = classes.join(' ')
  return ret
}
