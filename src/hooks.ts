import type { ComponentType, ComponentReturnType } from './jsx-runtime/jsx'

/** @internal */
type Prev =
  | null
  | {
      readonly type: 'prm'
      readonly clean: () => void
      readonly text: string | null
    }
  | {
      readonly type: 'ary'
      readonly clean: () => void
      items: readonly (readonly [NodeContext, Comment])[]
      readonly mark: [start: Comment, after: Comment]
    }
  | {
      readonly type: 'elm'
      readonly clean: () => void
      readonly tag: string
      readonly key: any
      readonly element: HTMLElement
      attrs: { [k: string]: any }
      children: readonly NodeContext[]
    }
  | {
      readonly type: 'cmp'
      readonly clean: () => void
      readonly comp: ComponentType<any>
      readonly key: string | undefined
      props: any
      propHash: readonly (readonly [string, any])[]
      readonly ctx: NodeContext
      readonly nodeInnerCtx: NodeInnerContext
    }

/** @internal */
export interface NodeContext {
  pin: () => void
  update: () => boolean
  prev: Prev
  current?: any
  parent: Element
  after: Comment
  provided: Provided
}

/** @internal */
export interface NodeInnerContext {
  pin: () => void
  effects: Set<() => void>
  onCleanup: Set<() => void>
  refs: { ref?: any }[]
  provided: Provided
}
export interface Provided {
  parent: Provided | null
  map?: Map<Context<any>, any>
}
export interface Context<T> {
  readonly value: T
  Provider: (props: { value: T; children: any }) => ComponentReturnType
}
const idxKey = ':yt-react:context-ref-idx'
const ctxKey = ':yt-react:inner-context'
const manager = globalThis as any as {
  ':yt-react:context-ref-idx': 0
  ':yt-react:inner-context': NodeInnerContext | null
}
const def = (key: string, value: any) => {
  undefined === (manager as any)[key] &&
    Object.defineProperty(manager, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: false,
    })
}
def(idxKey, 0)
def(ctxKey, null)

const useInnerContext = () => {
  if (manager[ctxKey]) return manager[ctxKey]
  throw new Error('no context')
}

const useInnerContextRef = () =>
  (useInnerContext().refs[manager[idxKey]++] ||= {})

export const usePin = () => useInnerContext().pin

/** @internal */
export const startAndSetInnerContext = (ctx: NodeInnerContext) => {
  manager[idxKey] = 0
  manager[ctxKey] = ctx
}

/** @internal */
export const endAndResetInnerContext = () => {
  manager[ctxKey] = null
}

type Ref<V> = { current: V }
export const useRef = <V>(init: V): Ref<V> => {
  const ctx = useInnerContextRef()
  return (ctx.ref ||= { current: init })
}

const compareDeps = (deps: any[] | undefined, prev: any[] | undefined) => {
  if (!deps || !prev) return false
  if (deps.length !== prev.length) return false
  return deps.every((d, i) => d === prev[i])
}

export const useEffect = (f: () => (() => void) | void, deps?: any[]): void => {
  const context = useInnerContext()
  const ctx = useInnerContextRef()
  context.effects.add(() => {
    if (!compareDeps(deps, ctx.ref?.[0])) {
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
  ]).slice(0, 2)
}

export const useMemo = <V>(f: () => V, deps: any[]): V => {
  const ctx = useInnerContextRef()
  if (!compareDeps(deps, ctx.ref?.[0])) ctx.ref = [deps, f()]
  return ctx.ref[1]
}

export const useCallback = <V extends (...args: any[]) => any>(
  f: V,
  deps: any[],
): V => {
  const ctx = useInnerContextRef()
  if (!compareDeps(deps, ctx.ref?.[0])) ctx.ref = [deps, f]
  return ctx.ref[1]
}

export const useReducer: <S, A, I = unknown>(
  reducer: (s: S, a: A) => S,
  ...args: [initialState: S] | [initialState: I, init: (i: I) => S]
) => [S, (a: A) => void] = ((reducer: any, initialState: any, init: any) => {
  const ctx = useInnerContext()
  const ctx2 = useInnerContextRef()
  const ref = (ctx2.ref ||= [
    init ? init(initialState as any) : initialState,
    (a: any) => {
      const prev = ctx2.ref[0]
      ctx2.ref[0] = ctx2.ref[2](prev, a)
      if (prev !== ctx2.ref[0]) ctx.pin()
    },
    reducer,
  ])
  ctx2.ref[2] = reducer
  return ref.slice(0, 2)
}) as any

export const createContext = <T>(init: T): Context<T> => {
  const Provider = (props: { value: T; children: any }) => {
    const map = (useInnerContext().provided.map ||= new Map())
    map.set(ctx, props.value)
    return props.children
  }
  const ctx: Context<T> = { Provider, value: init }
  return ctx
}

export const useContext = <T>(ctx: Context<T>): T => {
  const { provided } = useInnerContext()
  for (let tmp: Provided | null = provided; tmp; tmp = tmp.parent)
    if (tmp.map?.has(ctx)) return tmp.map.get(ctx)!
  return ctx.value
}
