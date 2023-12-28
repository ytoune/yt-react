import type { VNode } from './jsx-runtime/jsx'

type Prev =
  | null
  | { type: 'lit'; clean: () => void; hash: string }
  | {
      type: 'html'
      clean: () => void
      tag: string
      element: HTMLElement
      attrs: { [k: string]: any }
      children: Context[]
    }
  | {
      type: 'node'
      clean: () => void
      is: VNode<any>
      propHash: string
      mark: [start: Comment, after: Comment]
      ctx: Context
      nodeInnerCtx: NodeInnerContext
    }

export interface Context {
  pin: () => void
  prev: Prev
  current?: any
  parent: Element
  after: Comment
}
export interface NodeInnerContext {
  pin: () => void
  effects: Set<() => void>
  onCleanup: Set<() => void>
  refs: { ref?: any }[]
}
const idxKey = ':yt-react:contextRefIdx'
const ctxKey = ':yt-react:innerContext'
const manager = (globalThis || window) as any as {
  ':yt-react:contextRefIdx': 0
  ':yt-react:innerContext': NodeInnerContext | null
}
undefined === manager[idxKey] &&
  Object.defineProperty(manager, idxKey, {
    value: 0,
    writable: true,
    configurable: true,
    enumerable: false,
  })
undefined === manager[ctxKey] &&
  Object.defineProperty(manager, ctxKey, {
    value: null,
    writable: true,
    configurable: true,
    enumerable: false,
  })

const useInnerContext = () => {
  if (manager[ctxKey]) return manager[ctxKey]
  throw new Error('no context')
}

const useInnerContextRef = () =>
  (useInnerContext().refs[manager[idxKey]++] ||= {})

export const usePin = () => useInnerContext().pin

export const startAndSetInnerContext = (ctx: NodeInnerContext) => {
  manager[idxKey] = 0
  manager[ctxKey] = ctx
}
export const endAndResetInnerContext = () => {
  manager[ctxKey] = null
}

type Ref<V> = { current: V }
export const useRef = <V>(init: V): Ref<V> => {
  const ctx = useInnerContextRef()
  return (ctx.ref ||= { current: init })
}

export const useEffect = (f: () => (() => void) | void, deps?: any[]): void => {
  const context = useInnerContext()
  const ctx = useInnerContextRef()
  context.effects.add(() => {
    if (
      !ctx.ref ||
      !deps ||
      ctx.ref[0].length !== deps.length ||
      deps.some((d, i) => d !== ctx.ref[0][i])
    ) {
      if (ctx.ref) {
        context.onCleanup.delete(ctx.ref[1])
        ctx.ref[1]()
      }
      const u = f() || (() => {})
      context.onCleanup.add(u)
      ctx.ref = [deps, u]
    }
  })
}

export const useState = <V>(init: V): [V, (v: V | ((p: V) => V)) => void] => {
  const ctx = useInnerContext()
  const ctx2 = useInnerContextRef()
  return (ctx2.ref ||= [
    init,
    (v: V | ((p: V) => V)) => {
      const prev = ctx2.ref[0]
      ctx2.ref[0] = 'function' === typeof v ? (v as any)(prev) : v
      if (prev !== ctx2.ref[0]) ctx.pin()
    },
  ])
}
